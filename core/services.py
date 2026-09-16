"""
Services partenaires payables depuis le compte PoolPay.

Service "agharina" (immobilier) :
  1. Le client cherche un bien (liste ou reference) -> le backend relaie l'API
     publique Agharina et ne renvoie que ce qui sert au paiement.
  2. Il choisit le nombre de periodes (mois de loyer) ; une vente est toujours
     payee en une fois.
  3. Il confirme avec son mot de passe : le backend REINTERROGE l'API pour
     recalculer le prix (le montant envoye par le client n'est jamais utilise),
     debite le client du total et credite :
       - le compte Agharina   -> le montant du bien
       - le compte banque     -> la taxe de service (2 %)
"""

import json
import ssl
import urllib.error
import urllib.parse
import urllib.request
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.conf import settings
from django.db import transaction as db_transaction
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from account.models import Account
from core.models import Notification, ServicePayment, Transaction

from .serializers import ServicePaymentSerializer

CENTS = Decimal("0.01")


def _ssl_context():
    """
    Contexte TLS avec verification active.

    Sous Windows, Python n'a pas toujours de magasin de CA utilisable
    (`ssl.get_default_verify_paths()` pointe vers un fichier inexistant) et les
    appels HTTPS echouent alors avec "certificate verify failed". On s'appuie
    sur le bundle de `certifi` quand il est installe, sans jamais desactiver la
    verification du certificat.
    """
    try:
        import certifi

        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


SSL_CONTEXT = _ssl_context()


# --------------------------------------------------------------------------- #
# Acces a l'API Agharina
# --------------------------------------------------------------------------- #
class AgharinaUnavailable(Exception):
    """L'API partenaire ne repond pas ou renvoie une erreur."""


class BienIntrouvable(Exception):
    """La reference demandee n'existe pas chez le partenaire."""


def _fetch(path, params=None):
    base = settings.AGHARINA_API_URL.rstrip("/")
    url = f"{base}/{path}" if path else f"{base}/"
    if params:
        url = f"{url}?{urllib.parse.urlencode(params)}"

    request = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(
            request, timeout=settings.AGHARINA_API_TIMEOUT, context=SSL_CONTEXT
        ) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            raise BienIntrouvable() from exc
        raise AgharinaUnavailable(f"Agharina a repondu {exc.code}") from exc
    except Exception as exc:  # timeout, DNS, JSON invalide...
        raise AgharinaUnavailable(str(exc)) from exc


def fetch_bien(reference):
    """Detail d'un bien par sa reference (ex. AGH-APP-110D15E0)."""
    return _fetch(f"{urllib.parse.quote(str(reference))}/")


def trim_bien(bien):
    """
    Ne garde que ce dont le client a besoin pour decider et payer.
    Les descriptions completes et les champs internes du partenaire sont ecartes.
    """
    return {
        "reference": bien.get("reference"),
        "titre": bien.get("titre"),
        "titre_ar": bien.get("titre_ar"),
        "type_bien": bien.get("type_bien"),
        "type_transaction": bien.get("type_transaction"),
        "prix": bien.get("prix"),
        "unite_prix": bien.get("unite_prix"),
        "meuble": bien.get("meuble"),
        "nb_chambres": bien.get("nb_chambres"),
        "nb_salles_bain": bien.get("nb_salles_bain"),
        "nb_etages": bien.get("nb_etages"),
        "adresse_complete": bien.get("adresse_complete"),
        "adresse_complete_ar": bien.get("adresse_complete_ar"),
        "latitude": bien.get("latitude"),
        "longitude": bien.get("longitude"),
        "actif": bien.get("actif"),
        "vendu": bien.get("vendu"),
        "equipements": [
            {"id": e.get("id"), "nom": e.get("nom"), "nom_ar": e.get("nom_ar"), "icone": e.get("icone")}
            for e in (bien.get("equipements") or [])
        ],
        "medias": [
            {"id": m.get("id"), "type_media": m.get("type_media"), "fichier": m.get("fichier")}
            for m in (bien.get("medias") or [])
            if m.get("type_media") == "image"
        ],
        "gestionnaires": [
            {"username": g.get("username"), "telephone": g.get("telephone")}
            for g in (bien.get("gestionnaires") or [])
        ],
    }


def tax_rate():
    return Decimal(str(settings.SERVICE_TAX_RATE))


def quote_for(bien, quantity):
    """
    Calcule le devis a partir du bien tel que renvoye par le partenaire.
    Une vente est toujours payee en une seule fois.
    """
    try:
        unit_price = Decimal(str(bien.get("prix") or "0"))
    except (InvalidOperation, TypeError):
        raise AgharinaUnavailable("Prix illisible cote Agharina")

    if bien.get("type_transaction") != "location":
        quantity = 1

    amount = (unit_price * quantity).quantize(CENTS, rounding=ROUND_HALF_UP)
    rate = tax_rate()
    tax_amount = (amount * rate).quantize(CENTS, rounding=ROUND_HALF_UP)

    return {
        "unit_price": unit_price,
        "quantity": quantity,
        "amount": amount,
        "tax_rate": rate,
        "tax_amount": tax_amount,
        "total": amount + tax_amount,
    }


def _service_account(setting_name, label):
    number = getattr(settings, setting_name, "")
    account = Account.objects.filter(account_number=number).first() if number else None
    if account is None:
        raise AgharinaUnavailable(
            f"Le compte {label} n'est pas configure ({setting_name}). Renseignez-le dans settings.py."
        )
    return account


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #
class AgharinaBienListApi(APIView):
    """Catalogue des biens (relais de l'API partenaire, avec recherche et filtres)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        params = {}
        for key in ("search", "page", "type_transaction", "type_bien", "ville"):
            value = request.query_params.get(key)
            if value:
                params[key] = value

        try:
            data = _fetch("", params)
        except AgharinaUnavailable as exc:
            return Response(
                {"detail": f"Service Agharina indisponible : {exc}"}, status=status.HTTP_502_BAD_GATEWAY
            )

        results = data.get("results", data if isinstance(data, list) else [])
        return Response(
            {
                "count": data.get("count", len(results)),
                "next": data.get("next"),
                "previous": data.get("previous"),
                "results": [
                    {
                        "reference": b.get("reference"),
                        "titre": b.get("titre"),
                        "type_bien": b.get("type_bien"),
                        "type_transaction": b.get("type_transaction"),
                        "prix": b.get("prix"),
                        "unite_prix": b.get("unite_prix"),
                        "nb_chambres": b.get("nb_chambres"),
                        "nb_salles_bain": b.get("nb_salles_bain"),
                        "photo_principale": b.get("photo_principale"),
                        "ville": (b.get("ville") or {}).get("nom") if isinstance(b.get("ville"), dict) else None,
                        "quartier": (b.get("quartier") or {}).get("nom") if isinstance(b.get("quartier"), dict) else None,
                    }
                    for b in results
                ],
            },
            status=status.HTTP_200_OK,
        )


class AgharinaBienDetailApi(APIView):
    """Detail d'un bien + devis (montant, taxe 2 %, total) pour le nombre de periodes demande."""

    permission_classes = [IsAuthenticated]

    def get(self, request, reference):
        try:
            quantity = max(1, int(request.query_params.get("quantity", 1)))
        except (TypeError, ValueError):
            quantity = 1

        try:
            bien = fetch_bien(reference)
        except BienIntrouvable:
            return Response(
                {"detail": f"Aucun bien ne correspond a la reference {reference}."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except AgharinaUnavailable as exc:
            return Response(
                {"detail": f"Service Agharina indisponible : {exc}"}, status=status.HTTP_502_BAD_GATEWAY
            )

        quote = quote_for(bien, quantity)
        account = getattr(request.user, "account", None)
        balance = account.account_balance if account else Decimal("0.00")

        return Response(
            {
                "bien": trim_bien(bien),
                "quote": {
                    "unit_price": str(quote["unit_price"]),
                    "quantity": quote["quantity"],
                    "amount": str(quote["amount"]),
                    "tax_rate": str(quote["tax_rate"]),
                    "tax_percent": str((quote["tax_rate"] * 100).normalize()),
                    "tax_amount": str(quote["tax_amount"]),
                    "total": str(quote["total"]),
                },
                "account_balance": str(balance),
                "sufficient_funds": balance >= quote["total"],
            },
            status=status.HTTP_200_OK,
        )


class AgharinaPayApi(APIView):
    """
    Paiement du bien : mot de passe du client, montant recalcule cote serveur,
    debit client puis credit du compte Agharina et du compte banque (taxe).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, reference):
        password = request.data.get("password")
        if not password:
            return Response({"detail": "Le mot de passe est requis."}, status=status.HTTP_400_BAD_REQUEST)

        if not request.user.check_password(password):
            return Response({"detail": "Mot de passe incorrect."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            quantity = max(1, int(request.data.get("quantity", 1)))
        except (TypeError, ValueError):
            quantity = 1

        # Le prix est TOUJOURS relu chez le partenaire : ce que le client envoie
        # n'est jamais utilise pour calculer le montant.
        try:
            bien = fetch_bien(reference)
        except BienIntrouvable:
            return Response(
                {"detail": f"Aucun bien ne correspond a la reference {reference}."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except AgharinaUnavailable as exc:
            return Response(
                {"detail": f"Service Agharina indisponible : {exc}"}, status=status.HTTP_502_BAD_GATEWAY
            )

        if not bien.get("actif", True):
            return Response({"detail": "Ce bien n'est plus disponible."}, status=status.HTTP_400_BAD_REQUEST)

        if bien.get("type_transaction") == "vente" and bien.get("vendu"):
            return Response({"detail": "Ce bien est deja vendu."}, status=status.HTTP_400_BAD_REQUEST)

        quote = quote_for(bien, quantity)
        if quote["amount"] <= 0:
            return Response(
                {"detail": "Le prix de ce bien n'est pas exploitable pour un paiement."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        client_account = get_object_or_404(Account, user=request.user)
        client_account.refresh_from_db()

        try:
            agharina_account = _service_account("AGHARINA_ACCOUNT_NUMBER", "Agharina")
            bank_account = _service_account("POOLPAY_BANK_ACCOUNT_NUMBER", "banque PoolPay")
        except AgharinaUnavailable as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if client_account.pk in (agharina_account.pk, bank_account.pk):
            return Response(
                {"detail": "Un compte de service ne peut pas payer ce service."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if client_account.account_balance < quote["total"]:
            return Response(
                {
                    "detail": (
                        f"Solde insuffisant : {quote['total']} requis "
                        f"(dont {quote['tax_amount']} de taxe), {client_account.account_balance} disponibles."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        label = bien.get("titre") or reference

        with db_transaction.atomic():
            client_account.account_balance -= quote["total"]
            client_account.save()

            agharina_account.account_balance += quote["amount"]
            agharina_account.save()

            bank_account.account_balance += quote["tax_amount"]
            bank_account.save()

            main_tx = Transaction.objects.create(
                user=request.user,
                amount=quote["amount"],
                description=f"Paiement Agharina {reference} - {label}",
                sender=request.user,
                reciever=agharina_account.user,
                sender_account=client_account,
                reciever_account=agharina_account,
                status="completed",
                transaction_type="payment",
            )

            tax_tx = Transaction.objects.create(
                user=request.user,
                amount=quote["tax_amount"],
                description=f"Taxe de service {quote['tax_rate'] * 100:.0f}% - paiement {reference}",
                sender=request.user,
                reciever=bank_account.user,
                sender_account=client_account,
                reciever_account=bank_account,
                status="completed",
                transaction_type="fee",
            )

            payment = ServicePayment.objects.create(
                service="agharina",
                user=request.user,
                account=client_account,
                reference=reference,
                label=label,
                type_bien=bien.get("type_bien") or "",
                type_transaction=bien.get("type_transaction") or "",
                unite_prix=bien.get("unite_prix") or "",
                snapshot=trim_bien(bien),
                unit_price=quote["unit_price"],
                quantity=quote["quantity"],
                amount=quote["amount"],
                tax_rate=quote["tax_rate"],
                tax_amount=quote["tax_amount"],
                total=quote["total"],
                status="completed",
                transaction=main_tx,
                tax_transaction=tax_tx,
            )

            Notification.objects.create(
                user=request.user, notification_type="Service Payment", amount=quote["amount"]
            )
            Notification.objects.create(
                user=request.user, notification_type="Service Fee", amount=quote["tax_amount"]
            )
            Notification.objects.create(
                user=agharina_account.user, notification_type="Payment Received", amount=quote["amount"]
            )

        return Response(
            {
                "detail": "Paiement effectue avec succes.",
                "payment": ServicePaymentSerializer(payment).data,
                "account_balance": str(client_account.account_balance),
            },
            status=status.HTTP_201_CREATED,
        )


class ServicePaymentListApi(APIView):
    """Historique des paiements de services du client (taxe comprise)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = ServicePayment.objects.filter(user=request.user)

        service = request.query_params.get("service")
        if service:
            queryset = queryset.filter(service=service)

        payments = queryset[:100]
        totals = {
            "count": queryset.count(),
            "amount": str(sum((p.amount for p in queryset), Decimal("0.00"))),
            "tax": str(sum((p.tax_amount for p in queryset), Decimal("0.00"))),
            "total": str(sum((p.total for p in queryset), Decimal("0.00"))),
        }

        return Response(
            {"payments": ServicePaymentSerializer(payments, many=True).data, "totals": totals},
            status=status.HTTP_200_OK,
        )


class ServicePaymentDetailApi(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, payment_id):
        payment = get_object_or_404(ServicePayment, payment_id=payment_id)
        if payment.user != request.user and not request.user.is_staff:
            return Response({"detail": "Acces refuse."}, status=status.HTTP_403_FORBIDDEN)
        return Response(ServicePaymentSerializer(payment).data, status=status.HTTP_200_OK)
