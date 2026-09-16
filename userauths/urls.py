from django.urls import path
from .views import *

app_name = "userauths"
urlpatterns = [
    path("sign-up",RegisterView,name="sign-up"),
    path("sign-in/", LoginView, name="sign-in"),
    path("sign-out/", logoutView, name="sign-out"),
    #------ api rest framwork -----
    path("login/", MyLoginView.as_view(), name='api_login'),
    path('register/', MyRegisterView.as_view(), name='register'),
    path('logout/', MyLogoutView.as_view(), name='logout'),
]