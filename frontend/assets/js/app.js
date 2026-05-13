document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const dropZone = document.getElementById('drop-zone');
    const uploadSection = document.getElementById('upload-section');
    const loadingSection = document.getElementById('loading');
    const resultsSection = document.getElementById('results-section');
    const resetBtn = document.getElementById('reset-btn');

    // Spotify OAuth Logic
    const SPOTIFY_CLIENT_ID = 'bef9f7a15cf84dda80c0d32409b8f115';
    // Remove trailing slash to match exact redirect URIs typically configured
    const SPOTIFY_REDIRECT_URI = window.location.origin + window.location.pathname.replace(/\/$/, ""); 
    const spotifyLoginBtn = document.getElementById('spotify-login-btn');
    const spotifyProfileBadge = document.getElementById('spotify-profile');
    const spotifyAvatar = document.getElementById('spotify-avatar');
    const spotifyName = document.getElementById('spotify-name');

    const generateRandomString = (length) => {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const values = crypto.getRandomValues(new Uint8Array(length));
        return values.reduce((acc, x) => acc + possible[x % possible.length], "");
    }

    const sha256 = async (plain) => {
        const encoder = new TextEncoder()
        const data = encoder.encode(plain)
        return window.crypto.subtle.digest('SHA-256', data)
    }

    const base64encode = (input) => {
        return btoa(String.fromCharCode(...new Uint8Array(input)))
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    }

    function fetchProfile(token) {
        fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': 'Bearer ' + token }
        })
        .then(response => {
            if (response.status === 401) {
                localStorage.removeItem('access_token');
                throw new Error("Token expired");
            }
            return response.json();
        })
        .then(data => {
            if (!data || data.error) return;
            
            spotifyLoginBtn.classList.add('hidden');
            spotifyProfileBadge.classList.remove('hidden');
            spotifyName.innerText = `Hi there, ${data.display_name.split(' ')[0]}`;
            if (data.images && data.images.length > 0) {
                spotifyAvatar.src = data.images[0].url;
            } else {
                spotifyAvatar.src = 'data:image/svg+xml;charset=UTF-8,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%231DB954"%3e%3cpath d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm0 3.6c2.64 0 4.8 2.16 4.8 4.8s-2.16 4.8-4.8 4.8-4.8-2.16-4.8-4.8 2.16-4.8 4.8-4.8zm0 16.8c-3.36 0-6.24-1.92-7.68-4.68 1.8-1.44 4.08-2.28 6.48-2.28s4.68.84 6.48 2.28c-1.44 2.76-4.32 4.68-7.68 4.68z"/%3e%3c/svg%3e';
            }
        })
        .catch(err => console.error("Error fetching Spotify profile:", err));
    }

    const urlParams = new URLSearchParams(window.location.search);
    let code = urlParams.get('code');

    if (code) {
        let codeVerifier = localStorage.getItem('code_verifier');
        const payload = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: SPOTIFY_CLIENT_ID,
                grant_type: 'authorization_code',
                code,
                redirect_uri: SPOTIFY_REDIRECT_URI,
                code_verifier: codeVerifier,
            }),
        }

        fetch("https://accounts.spotify.com/api/token", payload)
            .then(res => res.json())
            .then(data => {
                if(data.access_token) {
                    localStorage.setItem('access_token', data.access_token);
                    window.history.replaceState({}, document.title, window.location.pathname);
                    fetchProfile(data.access_token);
                }
            });
    } else {
        const token = localStorage.getItem('access_token');
        if (token) {
            fetchProfile(token);
        }
    }

    if (spotifyLoginBtn) {
        spotifyLoginBtn.addEventListener('click', async () => {
            const codeVerifier = generateRandomString(64);
            const hashed = await sha256(codeVerifier);
            const codeChallenge = base64encode(hashed);
            window.localStorage.setItem('code_verifier', codeVerifier);
            
            const scope = 'user-read-private user-read-email user-top-read';
            const authUrl = new URL("https://accounts.spotify.com/authorize");
            const params =  {
                response_type: 'code',
                client_id: SPOTIFY_CLIENT_ID,
                scope,
                code_challenge_method: 'S256',
                code_challenge: codeChallenge,
                redirect_uri: SPOTIFY_REDIRECT_URI,
            };
            authUrl.search = new URLSearchParams(params).toString();
            window.location.href = authUrl.toString();
        });
    }

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

    const stagingArea = document.getElementById('staging-area');
    const stagedFilesList = document.getElementById('staged-files-list');
    const startAnalysisBtn = document.getElementById('start-analysis-btn');

    let stagedFiles = [];

    function handleFiles(files) {
        if (files.length === 0) return;
        
        const validFiles = Array.from(files).filter(f => f.type === "application/json" || f.name.endsWith('.json'));
        if (validFiles.length === 0) {
            alert('Please upload valid JSON files.');
            return;
        }

        // Add to staging array
        stagedFiles = stagedFiles.concat(validFiles);
        
        // Reset file input so same file can be selected again if needed
        fileInput.value = '';
        
        renderStagedFiles();
    }

    function renderStagedFiles() {
        if (stagedFiles.length === 0) {
            stagingArea.classList.add('hidden');
            dropZone.classList.remove('hidden');
            return;
        }

        dropZone.classList.add('hidden');
        stagingArea.classList.remove('hidden');
        
        stagedFilesList.innerHTML = '';
        stagedFiles.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'staged-file-item';
            
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            
            li.innerHTML = `
                <span>📄 ${file.name} <small style="color:var(--text-secondary)">(${sizeMB} MB)</small></span>
                <button type="button" data-index="${index}" title="Remove file">&times;</button>
            `;
            stagedFilesList.appendChild(li);
        });

        document.querySelectorAll('.staged-file-item button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                stagedFiles.splice(idx, 1);
                renderStagedFiles();
            });
        });
    }

    startAnalysisBtn.addEventListener('click', () => {
        if (stagedFiles.length > 0) {
            uploadFiles(stagedFiles);
        }
    });

    async function uploadFiles(files) {
        const formData = new FormData();

        // UI transitions
        dropZone.classList.add('hidden');
        stagingArea.classList.add('hidden');
        loadingSection.classList.remove('hidden');

        try {
            for (let f of files) {
                // Comprimir archivo (gzip) para evitar límites de Vercel (4.5 MB)
                if (typeof CompressionStream !== 'undefined') {
                    const stream = f.stream();
                    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
                    const response = new Response(compressedStream);
                    const blob = await response.blob();
                    formData.append('file', blob, f.name + '.gz');
                } else {
                    formData.append('file', f);
                }
            }
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
            stagingArea.classList.remove('hidden');
        }
    }

    const liveApiBtn = document.getElementById('live-api-btn');
    if (liveApiBtn) {
        liveApiBtn.addEventListener('click', async () => {
            const token = localStorage.getItem('access_token');
            if (!token) {
                alert('Please connect your Spotify account first using the button at the top right.');
                return;
            }

            // UI transitions
            uploadSection.classList.add('hidden');
            loadingSection.classList.remove('hidden');

            try {
                // Fetch Top Artists
                const artistsRes = await fetch('https://api.spotify.com/v1/me/top/artists?time_range=long_term&limit=10', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (!artistsRes.ok) throw new Error("Failed to fetch top artists");
                const artistsData = await artistsRes.json();

                // Fetch Top Tracks
                const tracksRes = await fetch('https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=1', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (!tracksRes.ok) throw new Error("Failed to fetch top tracks");
                const tracksData = await tracksRes.json();

                // Format data for displayResults
                const topArtistsMap = {};
                artistsData.items.forEach(artist => {
                    // We don't have hours, so we just assign a fake score based on rank to keep the sorting 
                    // or just 0, but we want it to display correctly. We will modify displayResults to handle this.
                    topArtistsMap[artist.name] = artist.popularity || 0; // Using popularity as a proxy stat or just fake hours
                });

                let topSongName = 'N/A';
                if (tracksData.items && tracksData.items.length > 0) {
                    const t = tracksData.items[0];
                    topSongName = `${t.name} - ${t.artists[0].name}`;
                }

                const liveData = {
                    is_live_api: true,
                    top_artists: topArtistsMap,
                    top_song: topSongName,
                    total_hours: 0,
                    total_songs: 0,
                    habits: { monthly: {}, hourly: {} },
                    raw_artists: artistsData.items // passing raw data if we want images later
                };

                window.wrappedData = { global: liveData, years_available: [], by_year: {} };
                
                initFilters(window.wrappedData);
                displayResults(liveData);

            } catch (error) {
                console.error(error);
                alert("Error fetching Spotify data. Make sure you are logged in and have activity on your account.");
                loadingSection.classList.add('hidden');
                uploadSection.classList.remove('hidden');
            }
        });
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

        const isLive = data.is_live_api === true;

        const notAvailableHtml = '<span style="font-size: 1rem; font-weight: 500; opacity: 0.7; letter-spacing: 0;">Only available via JSON</span>';

        // Populate summary stats
        if (isLive) {
            document.getElementById('total-hours').innerHTML = notAvailableHtml;
            document.getElementById('total-songs').innerHTML = notAvailableHtml;
        } else {
            animateValue('total-hours', 0, data.total_hours, 1000);
            animateValue('total-songs', 0, data.total_songs, 1000);
        }

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
        
        if (isLive) {
            document.getElementById('top-month').innerHTML = notAvailableHtml;
            document.getElementById('top-hour').innerHTML = notAvailableHtml;
        } else {
            document.getElementById('top-month').innerText = topMonth;
            document.getElementById('top-hour').innerText = topHourStr;
        }
        
        const topSongElement = document.getElementById('top-song');
        if (topSongElement) {
            topSongElement.innerText = data.top_song || 'N/A';
            topSongElement.title = data.top_song || 'N/A'; // Add title for tooltip if it overflows
        }

        // Populate top artists
        const list = document.getElementById('top-artists-list');
        list.innerHTML = '';
        
        // Convert object to array, sort and slice top 10
        const artists = Object.entries(data.top_artists)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        artists.forEach(([name, val], index) => {
            const li = document.createElement('li');
            li.className = 'artist-item';
            // Add a slight delay for staggered animation
            li.style.animationDelay = `${index * 0.1}s`;
            li.style.animation = 'fadeInUp 0.5s ease both';
            
            const valDisplay = isLive ? `<span style="font-size:0.8rem; opacity:0.6">Top Artist</span>` : `${val} hrs`;

            li.innerHTML = `
                <span class="artist-rank">#${index + 1}</span>
                <span class="artist-name">${name}</span>
                <span class="artist-hours">${valDisplay}</span>
            `;
            list.appendChild(li);
        });

        // Hide/Show elements based on mode
        const filtersContainer = document.querySelector('.filters-container');
        const chartsContainer = document.querySelector('.charts-container');
        
        if (isLive) {
            if(filtersContainer) filtersContainer.classList.add('hidden');
            if(chartsContainer) chartsContainer.classList.add('hidden');
            // Change button text
            resetBtn.innerText = "Back to Start";
        } else {
            if(filtersContainer) filtersContainer.classList.remove('hidden');
            if(chartsContainer) chartsContainer.classList.remove('hidden');
            resetBtn.innerText = "Analyze Another File";
            // Render charts
            renderCharts(data);
        }
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
        stagingArea.classList.add('hidden');
        loadingSection.classList.add('hidden');
        fileInput.value = '';
        stagedFiles = [];
        stagedFilesList.innerHTML = '';
    });

    // Render Charts Function
    function renderCharts(stats) {
        // Destroy existing charts if they exist to prevent hover glitches
        if (window.monthlyChartInstance) window.monthlyChartInstance.destroy();
        if (window.hourlyChartInstance) window.hourlyChartInstance.destroy();

        // Gráfico de uso mensual
        const ctxMonth = document.getElementById('monthlyChart').getContext('2d');
        
        const monthLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        let monthlyDatasets = [];
        const yearFilterValue = document.getElementById('yearFilter').value;

        // Si estamos en "All Time" y hay más de un año, hacemos el comparador de meses
        if (yearFilterValue === 'all' && window.wrappedData && window.wrappedData.years_available.length > 1) {
            const colors = ['#1DB954', '#8E2DE2', '#F5A623', '#00D4FF', '#FF007A', '#E2FF00'];
            
            window.wrappedData.years_available.forEach((year, index) => {
                const yearData = window.wrappedData.by_year[year];
                // Check if yearData and global exist to prevent errors
                if (yearData && yearData.global && yearData.global.habits && yearData.global.habits.monthly) {
                    const yearStats = yearData.global.habits.monthly;
                    const dataPoints = Array.from({length: 12}, (_, i) => yearStats[i+1] || 0);

                    monthlyDatasets.push({
                        label: `Canciones ${year}`,
                        data: dataPoints,
                        borderColor: colors[index % colors.length],
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        pointBackgroundColor: colors[index % colors.length]
                    });
                }
            });
        } else {
            // Vista normal de un solo año o si solo hay un año disponible
            const dataPoints = Array.from({length: 12}, (_, i) => stats.habits.monthly[i+1] || 0);
            
            monthlyDatasets.push({
                label: 'Canciones por mes',
                data: dataPoints,
                borderColor: '#1DB954',
                backgroundColor: 'rgba(29, 185, 84, 0.2)',
                fill: true,
                tension: 0.4
            });
        }

        window.monthlyChartInstance = new Chart(ctxMonth, {
            type: 'line',
            data: {
                labels: monthLabels,
                datasets: monthlyDatasets
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
        const hourLabels = Array.from({length: 24}, (_, i) => `${i}h`);
        let hourlyDatasets = [];

        if (yearFilterValue === 'all' && window.wrappedData && window.wrappedData.years_available.length > 1) {
            const colors = ['#8E2DE2', '#1DB954', '#F5A623', '#00D4FF', '#FF007A', '#E2FF00'];
            
            window.wrappedData.years_available.forEach((year, index) => {
                const yearData = window.wrappedData.by_year[year];
                if (yearData && yearData.global && yearData.global.habits && yearData.global.habits.hourly) {
                    const yearStats = yearData.global.habits.hourly;
                    const dataPoints = Array.from({length: 24}, (_, i) => yearStats[i] || 0);

                    hourlyDatasets.push({
                        label: `Actividad ${year}`,
                        data: dataPoints,
                        backgroundColor: colors[index % colors.length] + 'B3', // 70% opacity
                        borderRadius: 4
                    });
                }
            });
        } else {
            const dataPoints = Array.from({length: 24}, (_, i) => stats.habits.hourly[i] || 0);
            
            hourlyDatasets.push({
                label: 'Actividad por hora',
                data: dataPoints,
                backgroundColor: 'rgba(142, 45, 226, 0.7)',
                borderRadius: 4
            });
        }

        window.hourlyChartInstance = new Chart(ctxHour, {
            type: 'bar',
            data: {
                labels: hourLabels,
                datasets: hourlyDatasets
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
