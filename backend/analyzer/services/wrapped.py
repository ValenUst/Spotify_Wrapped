import pandas as pd

def calculate_stats(df):
    if df.empty:
        return {
            'top_artists': {},
            'habits': {'monthly': {}, 'hourly': {}},
            'total_hours': 0,
            'total_songs': 0,
            'top_song': 'N/A'
        }
        
    top_artists = df.groupby('artistName')['msPlayed'].sum().sort_values(ascending=False).head(10).to_dict()
    
    top_song = 'N/A'
    if 'trackName' in df.columns:
        df_tracks = df.dropna(subset=['trackName'])
        if not df_tracks.empty:
            top_track_series = df_tracks.groupby(['artistName', 'trackName'])['msPlayed'].sum()
            if not top_track_series.empty:
                top_track_tuple = top_track_series.idxmax()
                top_song = f"{top_track_tuple[1]} - {top_track_tuple[0]}"
    
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
    # 1. Normalización inteligente (mapea lo que encuentre)
    rename_dict = {}
    if 'ts' in df.columns: rename_dict['ts'] = 'endTime'
    if 'master_metadata_album_artist_name' in df.columns: rename_dict['master_metadata_album_artist_name'] = 'artistName'
    if 'master_metadata_track_name' in df.columns: rename_dict['master_metadata_track_name'] = 'trackName'
    if 'ms_played' in df.columns: rename_dict['ms_played'] = 'msPlayed'
    
    if 'msPlayed' not in df.columns and 'ms_played' in df.columns:
        rename_dict['ms_played'] = 'msPlayed'

    if rename_dict:
        df = df.rename(columns=rename_dict)

    # 2. Validación de seguridad
    if 'endTime' not in df.columns or 'artistName' not in df.columns:
        if 'broadcaster_name' in df.columns:
             df = df.rename(columns={'broadcaster_name': 'artistName'})
        else:
             raise ValueError("El JSON no tiene la estructura de Spotify esperada (faltan columnas de fecha o artista).")

    # 3. Limpieza de datos
    df = df.dropna(subset=['artistName', 'msPlayed'])
    df['endTime'] = pd.to_datetime(df['endTime'])
    df['year'] = df['endTime'].dt.year
    df['month'] = df['endTime'].dt.month
    df['hour'] = df['endTime'].dt.hour
    
    years = sorted(df['year'].dropna().unique().tolist())
    
    # 4. Agrupación Jerárquica
    result = {
        'years_available': years,
        'global': calculate_stats(df),
        'by_year': {}
    }
    
    for y in years:
        df_year = df[df['year'] == y]
        year_data = {
            'global': calculate_stats(df_year),
            'by_month': {}
        }
        
        months = sorted(df_year['month'].dropna().unique().tolist())
        for m in months:
            df_month = df_year[df_year['month'] == m]
            year_data['by_month'][str(int(m))] = calculate_stats(df_month)
            
        result['by_year'][str(int(y))] = year_data
        
    return result