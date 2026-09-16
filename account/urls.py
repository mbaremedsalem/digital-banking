from django.conf import settings
from django.urls import path
from .views import *

app_name = "account"

# Cette application ne contient que des pages HTML : elles suivent le meme
# drapeau que le reste de l'ancien site.
site_patterns = [
    path("dashboard/", dashboard, name="dashboard"),
    path("", account, name="account"),
    path("kyc-reg/", kyc_registration, name="kyc-reg"),
]

urlpatterns = site_patterns if settings.SERVE_LEGACY_SITE else []

