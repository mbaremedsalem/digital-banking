"""
URL configuration for project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings as django_settings
from django.contrib import admin
from django.urls import path,include
from core import views
from project.views import api_root 
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView, # new
    SpectacularRedocView,  # new
    SpectacularSwaggerView # new
)
urlpatterns = [
    path('admin/', admin.site.urls),
    path('user/',include('userauths.urls')),
]

# Sans l'ancien site, la racine affiche une page technique sobre.
if not django_settings.SERVE_LEGACY_SITE:
    urlpatterns += [path('', api_root, name='api-root')]

urlpatterns += [
    path('', include('core.urls')),
    path('account/', include('account.urls')),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),  # new
    path("api/schema/redoc/", SpectacularRedocView.as_view(
        url_name="schema"), name="redoc",),  # new
    path("api/schema/swagger-ui/", SpectacularSwaggerView.as_view(
        url_name="schema"), name="swagger-ui"),  # new    
]

if settings.DEBUG:
    urlpatterns +=static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
