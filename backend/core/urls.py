from django.contrib import admin
from django.urls import path, include
from backend.analyzer.views import serve_frontend

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('backend.analyzer.urls')),
    path('', serve_frontend, name='home'),
]
