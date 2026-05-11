<h1 align="center">🎵 My Spotify Wrapped Analyzer</h1>

<div align="center">
  <p><strong>Descubre tus verdaderos hábitos musicales</strong></p>
  <p>
    <img src="https://img.shields.io/badge/Python-3.10+-blue.svg" alt="Python Version">
    <img src="https://img.shields.io/badge/Django-4.2+-092E20.svg?logo=django" alt="Django">
    <img src="https://img.shields.io/badge/Pandas-2.0+-150458.svg?logo=pandas" alt="Pandas">
    <img src="https://img.shields.io/badge/Chart.js-4.0+-FF6384.svg?logo=chartdotjs" alt="ChartJS">
  </p>
</div>

<br>

Una aplicación web interactiva que te permite analizar y visualizar tu **historial completo de reproducciones de Spotify**. Sube tus archivos JSON exportados de Spotify y obtén al instante un resumen detallado con gráficos hermosos estilo *Glassmorphism*, tus artistas más escuchados y un análisis exhaustivo de tus hábitos mensuales y horarios.

## ✨ Características Principales

* **Soporte Multi-Archivo**: Arrastra y suelta múltiples archivos `StreamingHistory.json` al mismo tiempo. El sistema los unirá automáticamente.
* **Formatos Compatibles**: Analiza tanto el historial corto anual como el "Extended Streaming History" de Spotify sin necesidad de modificar los archivos.
* **Filtros Temporales Inteligentes**: Cambia entre la vista global ("All Time") o filtra por un Año y Mes específico. La interfaz y los gráficos se actualizan de forma instantánea.
* **Gráficos Dinámicos**: Visualiza tu ritmo de escucha mensual en un gráfico de líneas, y tu actividad por horas en un gráfico de barras impulsados por **Chart.js**.
* **Diseño "Dark Mode"**: Una interfaz moderna y fluida inspirada en el diseño oficial de Spotify.

## 🛠️ Tecnologías Utilizadas

* **Backend:** [Django](https://www.djangoproject.com/) + [Django REST Framework](https://www.django-rest-framework.org/)
* **Procesamiento de Datos:** [Pandas](https://pandas.pydata.org/) (DataFrames)
* **Frontend:** Vanilla JavaScript, HTML5, CSS3 Custom Properties (CSS Variables)
* **Gráficos:** [Chart.js](https://www.chartjs.org/)

## 📂 Estructura del Proyecto

```text
spotify_wrapped_project/
├── backend/                # Lógica del Servidor y API (Django)
│   ├── core/               # Configuraciones principales de Django (settings, urls)
│   ├── analyzer/           # App central de procesamiento
│   │   ├── services/       # 🧠 Lógica pesada de PANDAS (wrapped.py)
│   │   └── views.py        # 🔌 Endpoints de la API REST
├── frontend/               # Interfaz de Usuario
│   ├── index.html          # Vista única (Single Page Application)
│   ├── assets/
│   │   ├── js/app.js       # Lógica de carga, filtros y gráficos
│   │   └── css/style.css   # Estilos Glassmorphism
└── requirements.txt        # Dependencias de Python
```

## 🚀 Instalación y Uso Local

Sigue estos pasos para correr el analizador en tu propia computadora.

1. **Clona el repositorio** y entra a la carpeta del proyecto.
2. **Crea y activa un entorno virtual**:
   ```bash
   python -m venv venv
   # En Windows:
   .\venv\Scripts\activate
   # En macOS/Linux:
   source venv/bin/activate
   ```
3. **Instala las dependencias**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Ejecuta las migraciones de Django**:
   ```bash
   python manage.py migrate
   ```
5. **Inicia el servidor de desarrollo**:
   ```bash
   python manage.py runserver
   ```
6. **Abre tu navegador** y dirígete a: `http://127.0.0.1:8000/`. ¡Arrastra tus JSONs y disfruta!

---

<div align="center">
  <p>Built with Django & Pandas | Made by <a href="https://www.linkedin.com/in/valentin-novarino/" target="_blank"><strong>Valentin Novarino</strong></a></p>
</div>
