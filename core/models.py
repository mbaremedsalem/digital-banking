from django.db import models
from userauths.models import User 
from account.models import Account
from shortuuid.django_fields import ShortUUIDField


TRANSACTION_TYPE = (
    ("transfer", "Transfer"),
    ("recieved", "Recieved"),
    ("withdraw", "withdraw"),
    ("refund", "Refund"),
    ("request", "Payment Request"),
    ("payment", "Service Payment"),
    ("fee", "Service Fee"),
    ("none", "None")
)

TRANSACTION_STATUS = (
    ("failed", "failed"),
    ("completed", "completed"),
    ("pending", "pending"),
    ("processing", "processing"),
    ("request_sent", "request_sent"),
    ("request_settled", "request settled"),
    ("request_processing", "request processing"),

)


CARD_TYPE = (
    ("master", "master"),
    ("visa", "visa"),
    ("verve", "verve"),

)


NOTIFICATION_TYPE = (
    ("None", "None"),
    ("Transfer", "Transfer"),
    ("Credit Alert", "Credit Alert"),
    ("Debit Alert", "Debit Alert"),
    ("Sent Payment Request", "Sent Payment Request"),
    ("Recieved Payment Request", "Recieved Payment Request"),
    ("Funded Credit Card", "Funded Credit Card"),
    ("Withdrew Credit Card Funds", "Withdrew Credit Card Funds"),
    ("Deleted Credit Card", "Deleted Credit Card"),
    ("Added Credit Card", "Added Credit Card"),
    ("Withdrawal Requested", "Withdrawal Requested"),
    ("Withdrawal Completed", "Withdrawal Completed"),
    ("Withdrawal Cancelled", "Withdrawal Cancelled"),
    ("Cash Received", "Cash Received"),
    ("Service Payment", "Service Payment"),
    ("Service Fee", "Service Fee"),
    ("Payment Received", "Payment Received"),

)

class Transaction(models.Model):
    transaction_id = ShortUUIDField(unique=True, length=15, max_length=20, prefix="TRN")
   
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="user")
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    description = models.CharField(max_length=1000, null=True, blank=True)
   
    reciever = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="reciever")
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="sender")
   
    reciever_account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, related_name="reciever_account")
    sender_account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, related_name="sender_account")

    status = models.CharField(choices=TRANSACTION_STATUS, max_length=100, default="pending")
    transaction_type = models.CharField(choices=TRANSACTION_TYPE, max_length=100, default="none")

    date = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now_add=False, null=True, blank=True)

    def __str__(self):
        try:
            return f"{self.user}"
        except:
            return f"Transaction"


class CreditCard(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    card_id = ShortUUIDField(unique=True, length=5, max_length=20, prefix="CARD", alphabet="1234567890")

    name = models.CharField(max_length=100)
    number = models.IntegerField()
    month = models.IntegerField()
    year = models.IntegerField()
    cvv = models.IntegerField()

    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    card_type = models.CharField(choices=CARD_TYPE, max_length=20, default="master")
    card_status = models.BooleanField(default=True)

    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user}"


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    notification_type = models.CharField(max_length=100, choices=NOTIFICATION_TYPE, default="none")
    amount = models.IntegerField(default=0)
    is_read = models.BooleanField(default=False)
    date = models.DateTimeField(auto_now_add=True)
    nid = ShortUUIDField(length=10, max_length=25, alphabet="abcdefghijklmnopqrstuvxyz")
    
    class Meta:
        ordering = ["-date"]
        verbose_name_plural = "Notification"

    def __str__(self):
        return f"{self.user} - {self.notification_type}"

WITHDRAWAL_STATUS = (
    ("pending", "En attente"),
    ("completed", "Retire"),
    ("cancelled", "Annule"),
)


class WithdrawalRequest(models.Model):
    """
    Demande de retrait d'argent physique au guichet.

    Le client cree la demande et recoit un code unique. L'agent (staff) saisit
    ce code au guichet, le client confirme avec son mot de passe, et les fonds
    passent alors du compte client vers le compte de l'agent (caisse banque).
    """

    code = ShortUUIDField(unique=True, length=8, max_length=20, prefix="WDR", alphabet="1234567890")

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="withdrawals")
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="withdrawals")
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    description = models.CharField(max_length=1000, null=True, blank=True)

    status = models.CharField(choices=WITHDRAWAL_STATUS, max_length=20, default="pending")

    # Agent qui a remis l'argent et compte credite (la caisse de la banque).
    processed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="processed_withdrawals"
    )
    processed_at = models.DateTimeField(null=True, blank=True)
    transaction = models.ForeignKey(
        Transaction, on_delete=models.SET_NULL, null=True, blank=True, related_name="withdrawal"
    )

    date = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]
        verbose_name = "Withdrawal Request"
        verbose_name_plural = "Withdrawal Requests"

    def __str__(self):
        return f"{self.code} - {self.user} - {self.amount}"


SERVICE_CHOICES = (
    ("agharina", "Paiement Agharina"),
)

SERVICE_PAYMENT_STATUS = (
    ("pending", "En attente"),
    ("completed", "Paye"),
    ("failed", "Echoue"),
)


class ServicePayment(models.Model):
    """
    Paiement d'un service partenaire depuis le compte PoolPay du client.

    Aujourd'hui un seul service : "agharina" (immobilier). Le champ `service`
    permettra d'en brancher d'autres sans nouveau modele.

    Le montant du bien va au compte du service, la taxe va au compte banque
    PoolPay : deux transactions distinctes, toutes deux visibles par le client.
    """

    payment_id = ShortUUIDField(unique=True, length=10, max_length=20, prefix="PAY")
    service = models.CharField(choices=SERVICE_CHOICES, max_length=40, default="agharina")

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="service_payments")
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="service_payments")

    # Identification du bien / produit paye
    reference = models.CharField(max_length=120)
    label = models.CharField(max_length=255, blank=True)
    type_bien = models.CharField(max_length=60, blank=True)
    type_transaction = models.CharField(max_length=60, blank=True)
    unite_prix = models.CharField(max_length=40, blank=True)

    # Snapshot du bien au moment du paiement (prix, adresse, photo...)
    snapshot = models.JSONField(null=True, blank=True)

    unit_price = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    quantity = models.PositiveIntegerField(default=1)
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.0200)
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    total = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)

    status = models.CharField(choices=SERVICE_PAYMENT_STATUS, max_length=20, default="pending")

    transaction = models.ForeignKey(
        Transaction, on_delete=models.SET_NULL, null=True, blank=True, related_name="service_payment"
    )
    tax_transaction = models.ForeignKey(
        Transaction, on_delete=models.SET_NULL, null=True, blank=True, related_name="service_payment_tax"
    )

    date = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]
        verbose_name = "Service Payment"
        verbose_name_plural = "Service Payments"

    def __str__(self):
        return f"{self.payment_id} - {self.user} - {self.reference} - {self.total}"
