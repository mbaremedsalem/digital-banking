from django.contrib import admin
from core.models import Transaction, CreditCard, Notification, WithdrawalRequest, ServicePayment

class TransactionAdmin(admin.ModelAdmin):
    list_editable = ['amount', 'status', 'transaction_type']
    list_display = ['user', 'amount', 'status', 'transaction_type', 'reciever', 'sender']


class CreditCardAdmin(admin.ModelAdmin):
    list_editable = ['amount', 'card_type']
    list_display = ['user', 'amount', 'card_type']
    

class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'notification_type', 'amount' ,'date']

class WithdrawalRequestAdmin(admin.ModelAdmin):
    list_display = ['code', 'user', 'amount', 'status', 'processed_by', 'date']
    list_filter = ['status', 'date']
    search_fields = ['code', 'user__username', 'user__email']
    readonly_fields = ['code', 'processed_at', 'transaction']


admin.site.register(Transaction, TransactionAdmin)
admin.site.register(CreditCard, CreditCardAdmin)
admin.site.register(Notification, NotificationAdmin)
admin.site.register(WithdrawalRequest, WithdrawalRequestAdmin)


class ServicePaymentAdmin(admin.ModelAdmin):
    list_display = ['payment_id', 'user', 'service', 'reference', 'amount', 'tax_amount', 'total', 'status', 'date']
    list_filter = ['service', 'status', 'type_transaction', 'date']
    search_fields = ['payment_id', 'reference', 'user__username', 'user__email']
    readonly_fields = ['payment_id', 'snapshot', 'transaction', 'tax_transaction']


admin.site.register(ServicePayment, ServicePaymentAdmin)