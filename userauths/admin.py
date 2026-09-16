from django.contrib import admin
from .models import User
from import_export.admin import ImportExportModelAdmin


class UserAdminModel(ImportExportModelAdmin):
    list_editable = ['email', 'is_staff', 'is_superuser'] 
    list_display = ['username', 'email' ,'is_staff', 'is_superuser'] 
    search_fields = ["email"]
    list_filter = ['email']


admin.site.register(User,UserAdminModel)