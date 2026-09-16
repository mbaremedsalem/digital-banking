from django.urls import path
from .views import *
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

app_name = "userauths"
urlpatterns = [
    path("sign-up",RegisterView,name="sign-up"),
    path("sign-in/", LoginView, name="sign-in"),
    path("sign-out/", logoutView, name="sign-out"),
    #------ api rest framwork -----
    path("login/", MyLoginView.as_view(), name='api_login'),
    path('register/', MyRegisterView.as_view(), name='register'),
    path('logout/', MyLogoutView.as_view(), name='logout'),
    path('me/', MeApi.as_view(), name='me'),
    path('change-password/', ChangePasswordApi.as_view(), name='change-password'),
    # Rafraichissement du token JWT (l'access token expire au bout de 5 min)
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
]