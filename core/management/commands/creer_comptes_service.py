"""
Cree (ou retrouve) les comptes de service PoolPay et affiche leurs numeros.

Sur un nouvel environnement (par exemple la base PostgreSQL de Render), ces
comptes n'existent pas : le paiement Agharina echouerait avec
"Le compte Agharina n'est pas configure".

    python manage.py creer_comptes_service

Reportez ensuite les numeros affiches dans les variables d'environnement
AGHARINA_ACCOUNT_NUMBER et POOLPAY_BANK_ACCOUNT_NUMBER.
"""

from django.core.management.base import BaseCommand

from userauths.models import User

COMPTES = [
    ("agharina", "agharina@poolpay.local", "AGHARINA_ACCOUNT_NUMBER", "recoit le prix des biens"),
    ("poolpay_bank", "bank@poolpay.local", "POOLPAY_BANK_ACCOUNT_NUMBER", "recoit la taxe de service"),
]


class Command(BaseCommand):
    help = "Cree les comptes de service (Agharina, banque PoolPay) et affiche leurs numeros."

    def handle(self, *args, **options):
        self.stdout.write("")

        for username, email, env_var, role in COMPTES:
            user = User.objects.filter(email=email).first()

            if user is None:
                user = User.objects.create(username=username, email=email)
                # Compte technique : aucune connexion possible.
                user.set_unusable_password()
                user.save()
                etat = self.style.SUCCESS("cree")
            else:
                etat = self.style.WARNING("existe deja")

            # Le compte bancaire est cree par un signal post_save sur User.
            account = user.account
            account.refresh_from_db()

            self.stdout.write(f"{username} ({role}) : {etat}")
            self.stdout.write(f"  {env_var}={account.account_number}")
            self.stdout.write(f"  solde actuel : {account.account_balance}")
            self.stdout.write("")

        self.stdout.write(
            self.style.SUCCESS(
                "Renseignez ces deux variables d'environnement sur Render, puis redeployez."
            )
        )
