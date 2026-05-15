import pandas as pd

def calculate_stats(df):
    """Calcula las métricas core para un DataFrame dado (global, anual o mensual)."""
    if df.empty:
        return {
            'top_artists': {},
            'habits': {'monthly': {}, 'hourly': {}},
            'total_hours': 0,
            'total_songs': 0,
            'top_song': 'N/A'
        }
        
    # Top 10 artistas por tiempo escuchado
    top_artists = df.groupby('artistName')['msPlayed'].sum().sort_values(ascending=False).head(10).to_dict()
    
    # Identificar la canción más escuchada (Top Song)
    top_song = 'N/A'
    if 'trackName' in df.columns:
        # Agrupamos por artista y canción para evitar colisiones de nombres iguales en distintos artistas
        top_track_series = df.groupby(['artistName', 'trackName'])['msPlayed'].sum()
        if not top_track_series.empty:
            idx_max = top_track_series.idxmax()
            top_song = f"{idx_max[1]} - {idx_max[0]}"
    
    return {
        'top_artists': {k: round(v / 3600000, 2) for k, v in top_artists.items()},
        'habits': {
            'monthly': df.groupby('month').size().to_dict(),
            'hourly': df.groupby('hour').size().to_dict(),
        },
        'total_hours': round(df['msPlayed'].sum() / 3600000, 2),
        'total_songs': len(df),
        'top_song': top_song
    }

def procesar_wrapped(df):
    """Punto de entrada principal para el análisis del JSON de Spotify."""
    
    # 1. Normalización de columnas (Soporta formato Standard y Extended)
    rename_map = {
        'ts': 'endTime',
        'master_metadata_album_artist_name': 'artistName',
        'master_metadata_track_name': 'trackName',
        'ms_played': 'msPlayed'
    }
    # Solo renombramos las columnas que efectivamente existan en el archivo subido
    df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})

    # 2. Validación y Limpieza crítica
    if 'endTime' not in df.columns or ('artistName' not in df.columns and 'broadcaster_name' not in df.columns):
        raise ValueError("El JSON no tiene la estructura de Spotify esperada.")

    if 'artistName' not in df.columns and 'broadcaster_name' in df.columns:
        df = df.rename(columns={'broadcaster_name': 'artistName'})

    # Eliminamos filas sin datos esenciales para el cálculo
    df = df.dropna(subset=['artistName', 'msPlayed'])
    
    # 3. Feature Engineering (Creación de columnas temporales)
    df['endTime'] = pd.to_datetime(df['endTime'])
    df['year'] = df['endTime'].dt.year
    df['month'] = df['endTime'].dt.month
    df['hour'] = df['endTime'].dt.hour
    
    # 4. Construcción de la respuesta jerárquica
    years = sorted(df['year'].unique().tolist())
    
    result = {
        'years_available': [str(int(y)) for y in years],
        'global': calculate_stats(df),
        'by_year': {}
    }
    
    # Optimización: Agrupamos por año una sola vez
    for y, df_year in df.groupby('year'):
        year_str = str(int(y))
        
        # Calculamos stats anuales
        year_data = {
            'global': calculate_stats(df_year),
            'by_month': {}
        }
        
        # Optimización: Agrupamos por mes dentro de ese año
        for m, df_month in df_year.groupby('month'):
            month_str = str(int(m))
            year_data['by_month'][month_str] = calculate_stats(df_month)
            
        result['by_year'][year_str] = year_data
        
    return result