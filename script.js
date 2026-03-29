// ===== CONFIGURATION =====
// 🔑 REPLACE WITH YOUR OPENWEATHERMAP API KEY (free)
const API_KEY = 'a0f8b83e4cfaeb293e95d065df0f11d0'; // Get from https://openweathermap.org/api
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// ===== DOM ELEMENTS =====
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const errorDiv = document.getElementById('errorMsg');
const cityDisplay = document.getElementById('cityDisplay');
const tempDisplay = document.getElementById('tempDisplay');
const conditionDisplay = document.getElementById('conditionDisplay');
const iconDisplay = document.getElementById('iconDisplay');
const humidityDisplay = document.getElementById('humidityDisplay');
const windDisplay = document.getElementById('windDisplay');
const forecastContainer = document.getElementById('forecastContainer');
const celsiusBtn = document.getElementById('celsiusBtn');
const fahrenheitBtn = document.getElementById('fahrenheitBtn');
const rainOverlay = document.getElementById('rainOverlay');
const body = document.getElementById('dashboardBody');

// ===== STATE =====
let currentWeatherData = null;
let currentForecastList = null;
let currentUnit = 'C'; // 'C' or 'F'

// ===== HELPER FUNCTIONS =====
const toCelsius = (k) => (k - 273.15).toFixed(1);
const toFahrenheit = (k) => ((k - 273.15) * 9/5 + 32).toFixed(1);

const formatTemp = (kelvin, unit) => {
    return unit === 'C' ? toCelsius(kelvin) + '°C' : toFahrenheit(kelvin) + '°F';
};

// Map OpenWeather icon codes to Font Awesome classes
const getIconClass = (iconCode) => {
    const map = {
        '01d': 'fa-sun', '01n': 'fa-moon',
        '02d': 'fa-cloud-sun', '02n': 'fa-cloud-moon',
        '03d': 'fa-cloud', '03n': 'fa-cloud',
        '04d': 'fa-cloud', '04n': 'fa-cloud',
        '09d': 'fa-cloud-rain', '09n': 'fa-cloud-rain',
        '10d': 'fa-cloud-sun-rain', '10n': 'fa-cloud-moon-rain',
        '11d': 'fa-cloud-bolt', '11n': 'fa-cloud-bolt',
        '13d': 'fa-snowflake', '13n': 'fa-snowflake',
        '50d': 'fa-smog', '50n': 'fa-smog'
    };
    return map[iconCode] || 'fa-cloud-sun';
};

// Set background based on weather condition and icon (day/night)
const setBackground = (weatherId, iconCode) => {
    // Remove previous classes
    body.className = '';
    if (iconCode && iconCode.endsWith('n')) {
        body.classList.add('night');
        return;
    }
    if (weatherId >= 200 && weatherId < 600) { // Rain, thunder, drizzle
        body.classList.add('rainy');
    } else if (weatherId >= 600 && weatherId < 700) { // Snow
        body.classList.add('cloudy');
    } else if (weatherId === 800) { // Clear
        body.classList.add('sunny');
    } else if (weatherId > 800) { // Clouds
        body.classList.add('cloudy');
    } else {
        body.classList.add('cloudy'); // fallback
    }
};

// Rain animation control
const toggleRain = (enable) => {
    if (enable) {
        rainOverlay.style.display = 'block';
        // Create drops (if not already there)
        if (rainOverlay.children.length === 0) {
            for (let i = 0; i < 60; i++) {
                const drop = document.createElement('div');
                drop.classList.add('rain-drop');
                drop.style.left = Math.random() * 100 + '%';
                drop.style.animationDuration = 0.7 + Math.random() * 0.8 + 's';
                drop.style.animationDelay = Math.random() * 2 + 's';
                drop.style.height = (30 + Math.random() * 40) + 'px';
                drop.style.opacity = 0.3 + Math.random() * 0.5;
                rainOverlay.appendChild(drop);
            }
        }
    } else {
        rainOverlay.style.display = 'none';
    }
};

// Show/hide error
const showError = (msg) => {
    errorDiv.style.display = 'block';
    errorDiv.textContent = msg;
};
const hideError = () => {
    errorDiv.style.display = 'none';
};

// ===== FETCH DATA =====
async function fetchWeather(city) {
    if (!API_KEY || API_KEY === 'YOUR_API_KEY') {
        showError('⚠️ Please set a valid API key in script.js');
        return;
    }
    hideError();
    try {
        const weatherRes = await fetch(`${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}`);
        if (!weatherRes.ok) {
            if (weatherRes.status === 404) throw new Error('City not found');
            else throw new Error('Failed to fetch weather');
        }
        const weatherData = await weatherRes.json();

        const forecastRes = await fetch(`${BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}`);
        if (!forecastRes.ok) throw new Error('Forecast unavailable');
        const forecastData = await forecastRes.json();

        currentWeatherData = weatherData;
        currentForecastList = forecastData.list;

        updateCurrentUI();
        updateForecastUI();
    } catch (err) {
        showError(err.message);
        console.error(err);
    }
}

// ===== UPDATE UI =====
function updateCurrentUI() {
    if (!currentWeatherData) return;
    const data = currentWeatherData;
    const { name, sys, main, weather, wind } = data;
    cityDisplay.textContent = `${name}, ${sys.country}`;
    tempDisplay.textContent = formatTemp(main.temp, currentUnit);
    conditionDisplay.textContent = weather[0].description;
    humidityDisplay.textContent = main.humidity + '%';
    windDisplay.textContent = (wind.speed * 3.6).toFixed(1) + ' km/h';

    const iconClass = getIconClass(weather[0].icon);
    iconDisplay.innerHTML = `<i class="fas ${iconClass}"></i>`;

    // Set background and rain
    setBackground(weather[0].id, weather[0].icon);
    // Enable rain if weather id is rainy (2xx,3xx,5xx)
    const isRainy = weather[0].id >= 200 && weather[0].id < 600;
    toggleRain(isRainy);
}

function updateForecastUI() {
    if (!currentForecastList) return;
    const list = currentForecastList;
    // Group by date
    const daily = {};
    list.forEach(item => {
        const date = item.dt_txt.split(' ')[0];
        if (!daily[date]) daily[date] = [];
        daily[date].push(item);
    });

    const dates = Object.keys(daily).sort();
    const fiveDays = dates.slice(0, 5);

    let html = '';
    fiveDays.forEach(date => {
        const items = daily[date];
        // Find forecast closest to 12:00
        let selected = items[0];
        let minDiff = Infinity;
        items.forEach(item => {
            const hour = parseInt(item.dt_txt.split(' ')[1].split(':')[0]);
            const diff = Math.abs(hour - 12);
            if (diff < minDiff) {
                minDiff = diff;
                selected = item;
            }
        });
        const dayName = new Date(selected.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' });
        const iconClass = getIconClass(selected.weather[0].icon);
        const temp = formatTemp(selected.main.temp, currentUnit);
        html += `
            <div class="forecast-item">
                <div class="forecast-day">${dayName}</div>
                <div class="forecast-icon"><i class="fas ${iconClass}"></i></div>
                <div class="forecast-temp">${temp}</div>
            </div>
        `;
    });
    forecastContainer.innerHTML = html;
}

// ===== UNIT TOGGLE =====
celsiusBtn.addEventListener('click', () => {
    if (currentUnit === 'C') return;
    currentUnit = 'C';
    celsiusBtn.classList.add('active');
    fahrenheitBtn.classList.remove('active');
    if (currentWeatherData) updateCurrentUI();
    if (currentForecastList) updateForecastUI();
});

fahrenheitBtn.addEventListener('click', () => {
    if (currentUnit === 'F') return;
    currentUnit = 'F';
    fahrenheitBtn.classList.add('active');
    celsiusBtn.classList.remove('active');
    if (currentWeatherData) updateCurrentUI();
    if (currentForecastList) updateForecastUI();
});

// ===== SEARCH =====
searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) fetchWeather(city);
    else showError('Please enter a city');
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchBtn.click();
});

// ===== LOAD DEFAULT CITY =====
window.addEventListener('load', () => {
    if (API_KEY && API_KEY !== 'YOUR_API_KEY') {
        fetchWeather('London');
    } else {
        showError('⚠️ Please set your OpenWeatherMap API key in script.js');
    }
});