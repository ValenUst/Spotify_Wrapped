import os
import sys
from django.core.wsgi import get_wsgi_application

# Esto permite que Vercel encuentre la carpeta 'backend'
path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
if path not in sys.path:
    sys.path.insert(0, path)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.core.settings')

application = get_wsgi_application()
app = application  # Muy importante para Vercel