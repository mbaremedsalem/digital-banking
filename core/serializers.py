from rest_framework import serializers
from .models import *

class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        # pin_number et red_code sont des secrets : la recherche de compte
        # renvoyait le code PIN de n'importe quel titulaire. Ils restent
        # verifies cote serveur mais ne sortent plus de l'API.
        exclude = ('pin_number', 'red_code')

class TransactionSerializer(serializers.ModelSerializer):
    pin_number = serializers.CharField(write_only=True)

    # Champs de lecture seule ajoutes pour le frontend : sans eux l'API ne
    # renvoie que des identifiants bruts, impossible d'afficher la contrepartie
    # ou de construire les URLs de reglement (qui attendent un account_number).
    sender_username = serializers.SerializerMethodField()
    reciever_username = serializers.SerializerMethodField()
    sender_account_number = serializers.SerializerMethodField()
    reciever_account_number = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = ('__all__') # Include other fields as necessary

    def get_sender_username(self, obj):
        return obj.sender.username if obj.sender else None

    def get_reciever_username(self, obj):
        return obj.reciever.username if obj.reciever else None

    def get_sender_account_number(self, obj):
        return obj.sender_account.account_number if obj.sender_account else None

    def get_reciever_account_number(self, obj):
        return obj.reciever_account.account_number if obj.reciever_account else None

class CreditCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreditCard
        fields = ('__all__') 

class FundCreditCardSerializer(serializers.Serializer):
    funding_amount = serializers.DecimalField(max_digits=10, decimal_places=2)        

class WithdrawFundSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)    

class WithdrawalRequestSerializer(serializers.ModelSerializer):
    """Demande de retrait : on expose le client et l'agent en clair pour le guichet."""

    username = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    account_number = serializers.SerializerMethodField()
    account_balance = serializers.SerializerMethodField()
    processed_by_username = serializers.SerializerMethodField()
    transaction_id = serializers.SerializerMethodField()

    class Meta:
        model = WithdrawalRequest
        fields = (
            "id", "code", "amount", "description", "status", "date",
            "processed_at", "user", "account",
            "username", "email", "full_name", "account_number", "account_balance",
            "processed_by", "processed_by_username", "transaction_id",
        )
        read_only_fields = fields

    def get_username(self, obj):
        return obj.user.username if obj.user else None

    def get_email(self, obj):
        return obj.user.email if obj.user else None

    def get_full_name(self, obj):
        kyc = getattr(obj.user, "kyc", None) if obj.user else None
        return kyc.full_name if kyc else None

    def get_account_number(self, obj):
        return obj.account.account_number if obj.account else None

    def get_account_balance(self, obj):
        return str(obj.account.account_balance) if obj.account else None

    def get_processed_by_username(self, obj):
        return obj.processed_by.username if obj.processed_by else None

    def get_transaction_id(self, obj):
        return obj.transaction.transaction_id if obj.transaction else None


class ServicePaymentSerializer(serializers.ModelSerializer):
    """Paiement d'un service : le client doit voir le detail montant / taxe / total."""

    transaction_id = serializers.SerializerMethodField()
    tax_transaction_id = serializers.SerializerMethodField()
    tax_percent = serializers.SerializerMethodField()

    class Meta:
        model = ServicePayment
        fields = (
            "payment_id", "service", "reference", "label",
            "type_bien", "type_transaction", "unite_prix",
            "unit_price", "quantity", "amount",
            "tax_rate", "tax_percent", "tax_amount", "total",
            "status", "date", "snapshot",
            "transaction_id", "tax_transaction_id",
        )
        read_only_fields = fields

    def get_transaction_id(self, obj):
        return obj.transaction.transaction_id if obj.transaction else None

    def get_tax_transaction_id(self, obj):
        return obj.tax_transaction.transaction_id if obj.tax_transaction else None

    def get_tax_percent(self, obj):
        return str((obj.tax_rate * 100).normalize())
