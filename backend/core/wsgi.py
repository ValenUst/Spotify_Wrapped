import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.core.settings')
application = get_wsgi_application()

# Vercel looks for 'app' by default
app = application
