document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const dropZone = document.getElementById('drop-zone');
    const uploadSection = document.getElementById('upload-section');
    const loadingSection = document.getElementById('loading');
    const resultsSection = document.getElementById('results-section');
    const resetBtn = document.getElementById('reset-btn');

    // Drag and drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        let dt = e.dataTransfer;
        let files = dt.files;
        handleFiles(files);
    });

    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        if (files.length === 0) return;
        
        const validFiles = Array.from(files).filter(f => f.type === "application/json" || f.name.endsWith('.json'));
        if (validFiles.length === 0) {
            alert('Please upload valid JSON files.');
            return;
        }

        uploadFiles(validFiles);
    }

    async function uploadFiles(files) {
        const formData = new FormData();
        files.forEach(f => formData.append('file', f));

        // UI transitions
        dropZone.classList.add('hidden');
        loadingSection.classList.remove('hidden');

        try {
            const response = await fetch('/api/upload/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': window.csrftoken
                },
                body: formData
            });

            if (!response.ok) {
                let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
                try {
                    const text = await response.text();
                    try {
                        const errData = JSON.parse(text);
                        if (errData.error) errorMsg = errData.error;
                    } catch (e) {
                        // Si no es JSON (ej. Vercel HTML error), mostramos los primeros caracteres
                        errorMsg += `\nDetalle: ${text.substring(0, 100)}`;
                    }
                } catch(e) {}
                throw new Error(errorMsg);
            }

            const data = await response.json();
            window.wrappedData = data;
            
            initFilters(data);
            displayResults(data.global);
            
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Error en el análisis: ' + error.message);
            
            // Reset UI
            loadingSection.classList.add('hidden');
            dropZone.classList.remove('hidden');
        }
    }

    function initFilters(data) {
        const yearFilter = document.getElementById('yearFilter');
        const monthFilter = document.getElementById('monthFilter');
        
        // Reset dropdowns
        yearFilter.innerHTML = '<option value="all">All Time</option>';
        monthFilter.innerHTML = '<option value="all">All Year</option>';
        monthFilter.disabled = true;

        if (data.years_available && data.years_available.length > 0) {
            data.years_available.forEach(y => {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                yearFilter.appendChild(opt);
            });
        }

        yearFilter.addEventListener('change', (e) => {
            const y = e.target.value;
            if (y === 'all') {
                monthFilter.innerHTML = '<option value="all">All Year</option>';
                monthFilter.disabled = true;
                displayResults(window.wrappedData.global);
            } else {
                monthFilter.disabled = false;
                monthFilter.innerHTML = '<option value="all">All Year</option>';
                const yearData = window.wrappedData.by_year[y];
                if (yearData && yearData.by_month) {
                    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    Object.keys(yearData.by_month).sort((a,b)=>parseInt(a)-parseInt(b)).forEach(m => {
                        const opt = document.createElement('option');
                        opt.value = m;
                        opt.textContent = months[parseInt(m)-1];
                        monthFilter.appendChild(opt);
                    });
                }
                displayResults(yearData.global);
            }
        });

        monthFilter.addEventListener('change', (e) => {
            const y = yearFilter.value;
            const m = e.target.value;
            if (y === 'all') return; // Should not happen
            
            const yearData = window.wrappedData.by_year[y];
            if (m === 'all') {
                displayResults(yearData.global);
            } else {
                displayResults(yearData.by_month[m]);
            }
        });
    }

    function displayResults(data) {
        // Hide loading, show results
        uploadSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');

        // Populate summary stats
        animateValue('total-hours', 0, data.total_hours, 1000);
        animateValue('total-songs', 0, data.total_songs, 1000);

        // Process Habits (Find Top Month and Top Hour)
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        let topMonth = "-";
        if (data.habits && data.habits.monthly) {
            const bestMonthEntry = Object.entries(data.habits.monthly).sort((a, b) => b[1] - a[1])[0];
            if (bestMonthEntry) topMonth = months[parseInt(bestMonthEntry[0]) - 1];
        }

        let topHourStr = "-";
        if (data.habits && data.habits.hourly) {
            const bestHourEntry = Object.entries(data.habits.hourly).sort((a, b) => b[1] - a[1])[0];
            if (bestHourEntry) {
                let hour = parseInt(bestHourEntry[0]);
                let ampm = hour >= 12 ? 'PM' : 'AM';
                let displayHour = hour % 12 || 12;
                topHourStr = `${displayHour} ${ampm}`;
            }
        }
        
        document.getElementById('top-month').innerText = topMonth;
        document.getElementById('top-hour').innerText = topHourStr;

        // Populate top artists
        const list = document.getElementById('top-artists-list');
        list.innerHTML = '';
        
        // Convert object to array, sort and slice top 10
        const artists = Object.entries(data.top_artists)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        artists.forEach(([name, hours], index) => {
            const li = document.createElement('li');
            li.className = 'artist-item';
            // Add a slight delay for staggered animation
            li.style.animationDelay = `${index * 0.1}s`;
            li.style.animation = 'fadeInUp 0.5s ease both';
            
            li.innerHTML = `
                <span class="artist-rank">#${index + 1}</span>
                <span class="artist-name">${name}</span>
                <span class="artist-hours">${hours} hrs</span>
            `;
            list.appendChild(li);
        });

        // Render charts
        renderCharts(data);
    }

    // Utility for counting up numbers
    function animateValue(id, start, end, duration) {
        const obj = document.getElementById(id);
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            // Easing function for smooth stop
            const easeOutProgress = 1 - Math.pow(1 - progress, 3);
            
            // Format number based on original type
            let current = start + easeOutProgress * (end - start);
            if (Number.isInteger(end)) {
                obj.innerHTML = Math.floor(current).toLocaleString();
            } else {
                obj.innerHTML = current.toFixed(1).toLocaleString();
            }
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // Reset button
    resetBtn.addEventListener('click', () => {
        resultsSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        dropZone.classList.remove('hidden');
        loadingSection.classList.add('hidden');
        fileInput.value = '';
    });

    // Render Charts Function
    function renderCharts(stats) {
        // Destroy existing charts if they exist to prevent hover glitches
        if (window.monthlyChartInstance) window.monthlyChartInstance.destroy();
        if (window.hourlyChartInstance) window.hourlyChartInstance.destroy();

        // Gráfico de uso mensual
        const ctxMonth = document.getElementById('monthlyChart').getContext('2d');
        
        // Formatear etiquetas de meses si stats.habits.monthly está disponible
        const monthLabels = Object.keys(stats.habits.monthly).map(m => {
            const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
            return months[parseInt(m) - 1] || m;
        });

        window.monthlyChartInstance = new Chart(ctxMonth, {
            type: 'line',
            data: {
                labels: monthLabels, // Meses 1-12
                datasets: [{
                    label: 'Canciones por mes',
                    data: Object.values(stats.habits.monthly),
                    borderColor: '#1DB954', // Verde Spotify
                    backgroundColor: 'rgba(29, 185, 84, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#fff' } }
                },
                scales: {
                    x: { ticks: { color: '#a7a7a7' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#a7a7a7' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });

        // Gráfico de uso horario (Radar o Barras)
        const ctxHour = document.getElementById('hourlyChart').getContext('2d');
        window.hourlyChartInstance = new Chart(ctxHour, {
            type: 'bar',
            data: {
                labels: Object.keys(stats.habits.hourly).map(h => `${h}h`), // Horas 0-23
                datasets: [{
                    label: 'Actividad por hora',
                    data: Object.values(stats.habits.hourly),
                    backgroundColor: 'rgba(142, 45, 226, 0.7)',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#fff' } }
                },
                scales: {
                    x: { ticks: { color: '#a7a7a7' }, grid: { display: false } },
                    y: { ticks: { color: '#a7a7a7' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }
});
