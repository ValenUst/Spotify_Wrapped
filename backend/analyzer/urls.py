from django.urls import path
from .views import upload_wrapped

urlpatterns = [
    path('upload/', upload_wrapped, name='upload_wrapped_api'),
]
