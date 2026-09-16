from django.conf import settings
from django.urls import path
from .views import *
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

app_name = "userauths"

# Pages HTML de connexion/inscription : servies uniquement si l'ancien site
# est actif (voir SERVE_LEGACY_SITE dans les reglages).
site_patterns = [
    path("sign-up", RegisterView, name="sign-up"),
    path("sign-in/", LoginView, name="sign-in"),
    path("sign-out/", logoutView, name="sign-out"),
]

urlpatterns = [
    # ------ API REST ------
    path("login/", MyLoginView.as_view(), name='api_login'),
    path('register/', MyRegisterView.as_view(), name='register'),
    path('logout/', MyLogoutView.as_view(), name='logout'),
    path('me/', MeApi.as_view(), name='me'),
    path('change-password/', ChangePasswordApi.as_view(), name='change-password'),
    # Rafraichissement du token JWT (l'access token expire au bout de 5 min)
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
]

if settings.SERVE_LEGACY_SITE:
    urlpatterns += site_patterns
