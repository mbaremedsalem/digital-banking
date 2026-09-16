"""
Retrait d'argent physique au guichet.

Parcours :
  1. Le client cree une demande de retrait -> il recoit un code unique (WDR...).
  2. Au guichet, l'agent (utilisateur staff) saisit ce code.
  3. Le client confirme avec SON mot de passe.
  4. Les fonds sont debites du compte client et credites sur le compte de
     l'agent (la caisse de la banque), et une Transaction "withdraw" est creee.
"""

from decimal import Decimal, InvalidOperation

from django.db import transaction as db_transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from account.models import Account
from core.models import Notification, Transaction, WithdrawalRequest

from .serializers import WithdrawalRequestSerializer


class WithdrawalListCreateApi(APIView):
    """GET : mes demandes de retrait. POST : creer une demande."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = WithdrawalRequest.objects.filter(user=request.user)

        status_filter = request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        serializer = WithdrawalRequestSerializer(queryset, many=True)
        return Response({"withdrawals": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request):
        account = get_object_or_404(Account, user=request.user)

        raw_amount = request.data.get("amount")
        description = request.data.get("description")

        if raw_amount in (None, ""):
            return Response({"detail": "Le montant est requis."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(str(raw_amount))
        except (InvalidOperation, TypeError):
            return Response({"detail": "Montant invalide."}, status=status.HTTP_400_BAD_REQUEST)

        if amount <= 0:
            return Response({"detail": "Le montant doit etre superieur a zero."}, status=status.HTTP_400_BAD_REQUEST)

        if amount > account.account_balance:
            return Response(
                {"detail": "Solde insuffisant pour ce retrait."}, status=status.HTTP_400_BAD_REQUEST
            )

        # Les demandes en attente sont cumulees : on evite de reserver deux fois
        # le meme argent avec plusieurs codes.
        pending_total = sum(
            (w.amount for w in WithdrawalRequest.objects.filter(user=request.user, status="pending")),
            Decimal("0.00"),
        )
        if pending_total + amount > account.account_balance:
            return Response(
                {
                    "detail": (
                        f"Vous avez deja {pending_total} en demandes de retrait en attente. "
                        "Annulez-en une ou reduisez le montant."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        withdrawal = WithdrawalRequest.objects.create(
            user=request.user,
            account=account,
            amount=amount,
            description=description,
        )

        Notification.objects.create(
            user=request.user,
            notification_type="Withdrawal Requested",
            amount=amount,
        )

        return Response(
            {
                "detail": "Demande de retrait creee. Presentez ce code au guichet.",
                "withdrawal": WithdrawalRequestSerializer(withdrawal).data,
            },
            status=status.HTTP_201_CREATED,
        )


class WithdrawalDetailApi(APIView):
    """Consultation d'une demande par son code (proprietaire ou agent)."""

    permission_classes = [IsAuthenticated]

    def get(self, request, code):
        withdrawal = get_object_or_404(WithdrawalRequest, code=code)

        if withdrawal.user != request.user and not request.user.is_staff:
            return Response(
                {"detail": "Vous n'avez pas acces a cette demande de retrait."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(WithdrawalRequestSerializer(withdrawal).data, status=status.HTTP_200_OK)


class WithdrawalCancelApi(APIView):
    """Le client annule une demande encore en attente."""

    permission_classes = [IsAuthenticated]

    def post(self, request, code):
        withdrawal = get_object_or_404(WithdrawalRequest, code=code)

        if withdrawal.user != request.user:
            return Response(
                {"detail": "Vous ne pouvez annuler que vos propres demandes."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if withdrawal.status != "pending":
            return Response(
                {"detail": "Cette demande n'est plus en attente."}, status=status.HTTP_400_BAD_REQUEST
            )

        withdrawal.status = "cancelled"
        withdrawal.save()

        Notification.objects.create(
            user=request.user,
            notification_type="Withdrawal Cancelled",
            amount=withdrawal.amount,
        )

        return Response(
            {"detail": "Demande de retrait annulee.", "withdrawal": WithdrawalRequestSerializer(withdrawal).data},
            status=status.HTTP_200_OK,
        )


class PendingWithdrawalsApi(APIView):
    """Guichet : toutes les demandes en attente, tous clients confondus."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        queryset = WithdrawalRequest.objects.select_related("user", "account").all()

        status_filter = request.query_params.get("status", "pending")
        if status_filter != "all":
            queryset = queryset.filter(status=status_filter)

        serializer = WithdrawalRequestSerializer(queryset[:100], many=True)
        return Response({"withdrawals": serializer.data}, status=status.HTTP_200_OK)


class WithdrawalValidateApi(APIView):
    """
    Guichet : l'agent remet l'argent et valide le retrait.

    Le client saisit son mot de passe pour confirmer. Les fonds passent du
    compte client au compte de l'agent (caisse de la banque).
    """

    permission_classes = [IsAdminUser]

    def post(self, request, code):
        withdrawal = get_object_or_404(WithdrawalRequest, code=code)
        password = request.data.get("password")

        if not password:
            return Response(
                {"detail": "Le mot de passe du client est requis."}, status=status.HTTP_400_BAD_REQUEST
            )

        if withdrawal.status != "pending":
            return Response(
                {"detail": f"Cette demande est deja au statut '{withdrawal.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not withdrawal.user.check_password(password):
            return Response({"detail": "Mot de passe incorrect."}, status=status.HTTP_400_BAD_REQUEST)

        agent_account = getattr(request.user, "account", None)
        if agent_account is None:
            return Response(
                {"detail": "L'agent n'a pas de compte caisse associe."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if agent_account.pk == withdrawal.account.pk:
            return Response(
                {"detail": "L'agent ne peut pas valider son propre retrait."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        client_account = withdrawal.account
        client_account.refresh_from_db()

        if client_account.account_balance < withdrawal.amount:
            return Response(
                {"detail": "Solde client insuffisant, le retrait ne peut pas etre effectue."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Tout ou rien : debit client, credit caisse, transaction et statut.
        with db_transaction.atomic():
            client_account.account_balance -= withdrawal.amount
            client_account.save()

            agent_account.account_balance += withdrawal.amount
            agent_account.save()

            movement = Transaction.objects.create(
                user=withdrawal.user,
                amount=withdrawal.amount,
                description=withdrawal.description or f"Retrait especes au guichet ({withdrawal.code})",
                sender=withdrawal.user,
                reciever=request.user,
                sender_account=client_account,
                reciever_account=agent_account,
                status="completed",
                transaction_type="withdraw",
            )

            withdrawal.status = "completed"
            withdrawal.processed_by = request.user
            withdrawal.processed_at = timezone.now()
            withdrawal.transaction = movement
            withdrawal.save()

            Notification.objects.create(
                user=withdrawal.user,
                notification_type="Withdrawal Completed",
                amount=withdrawal.amount,
            )
            Notification.objects.create(
                user=request.user,
                notification_type="Cash Received",
                amount=withdrawal.amount,
            )

        return Response(
            {
                "detail": "Retrait valide. Remettez l'argent au client.",
                "withdrawal": WithdrawalRequestSerializer(withdrawal).data,
                "agent_balance": str(agent_account.account_balance),
                "client_balance": str(client_account.account_balance),
            },
            status=status.HTTP_200_OK,
        )
