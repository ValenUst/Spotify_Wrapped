import pandas as pd
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import render
from .services.wrapped import procesar_wrapped

from rest_framework.decorators import api_view, parser_classes, authentication_classes, permission_classes

from django.views.decorators.csrf import ensure_csrf_cookie

@ensure_csrf_cookie
def serve_frontend(request):
    """Serves the main frontend index.html."""
    return render(request, 'index.html')

@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
@parser_classes([MultiPartParser])
def upload_wrapped(request):
    files = request.FILES.getlist('file') # Obtiene todos los archivos subidos
    if not files:
        return Response({"error": "No files provided"}, status=400)
    
    data_frames = []
    for file in files:
        try:
            import json
            # Leer el archivo con json de forma segura
            content = file.read().decode('utf-8')
            data_json = json.loads(content)
            df_temp = pd.DataFrame(data_json)
            data_frames.append(df_temp)
        except Exception as e:
            print(f"Error al leer el archivo {file.name}:", e)
            continue # Ignorar archivos corruptos

    if not data_frames:
        return Response({"error": "No valid JSON files"}, status=400)

    try:
        # Unimos todos los JSONs en un solo DataFrame gigante
        full_df = pd.concat(data_frames, ignore_index=True)
        
        # Procesamos la super-base de datos
        stats = procesar_wrapped(full_df)
        
        return Response(stats, status=status.HTTP_200_OK)
    except Exception as e:
        print("ERROR IN UPLOAD:", e)
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)