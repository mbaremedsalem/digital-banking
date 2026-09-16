from django.contrib import admin
from django.urls import path
from django.template.response import TemplateResponse
from django.utils.html import format_html
from django.db.models import Sum, Count, Q
from datetime import datetime, timedelta

# Importez tous vos modèles
from userauths.models import User
from core.models import Transaction, CreditCard, Notification
from account.models import Account, KYC

class PoolPayAdmin(admin.AdminSite):
    site_header = "PoolPay Administration"
    site_title = "PoolPay"
    index_title = "Bienvenue dans l'administration PoolPay"
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('admin_stats/', self.admin_view(self.stats_view), name='admin_stats'),
        ]
        return custom_urls + urls

    def stats_view(self, request):
        # Statistiques des transactions
        total_transactions = Transaction.objects.count()
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        recent_transactions = Transaction.objects.filter(
            created_at__gte=week_ago
        ).count()
        
        monthly_transactions = Transaction.objects.filter(
            created_at__gte=month_ago
        ).count()
        
        total_amount = Transaction.objects.aggregate(
            total=Sum('amount')
        )['total'] or 0
        
        monthly_amount = Transaction.objects.filter(
            created_at__gte=month_ago
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        successful_transactions = Transaction.objects.filter(
            status='completed'
        ).count()
        
        success_rate = (successful_transactions / total_transactions * 100) if total_transactions > 0 else 0
        
        # Statistiques des utilisateurs
        total_users = User.objects.count()
        new_users_week = User.objects.filter(
            date_joined__gte=week_ago
        ).count()
        
        # Statistiques des comptes
        total_accounts = Account.objects.count()
        verified_accounts = Account.objects.filter(kyc_confirmed=True).count()
        
        # Cartes de crédit
        total_cards = CreditCard.objects.count()
        
        # Notifications
        total_notifications = Notification.objects.count()
        
        context = {
            **self.each_context(request),
            'title': 'Tableau de bord - Statistiques',
            'total_transactions': total_transactions,
            'recent_transactions': recent_transactions,
            'monthly_transactions': monthly_transactions,
            'total_amount': total_amount,
            'monthly_amount': monthly_amount,
            'success_rate': round(success_rate, 2),
            'total_users': total_users,
            'new_users_week': new_users_week,
            'total_accounts': total_accounts,
            'verified_accounts': verified_accounts,
            'total_cards': total_cards,
            'total_notifications': total_notifications,
        }
        
        return TemplateResponse(request, 'admin/stats.html', context)

# Créez une instance de l'admin personnalisé
admin_site = PoolPayAdmin(name='poolpay_admin')

# Importez et enregistrez tous vos modèles
from userauths.admin import UserAdminModel
from core.admin import TransactionAdmin, CreditCardAdmin, NotificationAdmin
from account.admin import AccountAdminModel, KYCAdmin

# Enregistrez les modèles avec l'admin personnalisé
admin_site.register(User, UserAdminModel)
admin_site.register(Transaction, TransactionAdmin)
admin_site.register(CreditCard, CreditCardAdmin)
admin_site.register(Notification, NotificationAdmin)
admin_site.register(Account, AccountAdminModel)
admin_site.register(KYC, KYCAdmin)