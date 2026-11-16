"""
WSGI entry point for production Gunicorn deployment of the Png101 Background Remover AI service.

Example on Linux VPS:
    REMBG_API_KEY="your-secret-key" \
    REMBG_MODELS_DIR="/opt/png101-bg-ai/models" \
    REMBG_PRELOAD_MODELS="isnet-general-use" \
    .venv/bin/gunicorn -w 1 --threads 4 --timeout 180 -b 127.0.0.1:8001 wsgi:app
"""

from remove_bg import create_app

app = create_app()
