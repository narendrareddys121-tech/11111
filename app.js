/**
 * SkyFetch Weather Dashboard v2.0 – Part 2: User Interaction
 * -----------------------------------------------------------
 * Part 2 Enhancements:
 *  • All API logic uses async/await (no .then() chains or callbacks)
 *  • Comprehensive try-catch error handling for:
 *      – Invalid city names (404)
 *      – Empty / invalid input
 *      – Network / API request failures
 *  • Loading indicator visible during entire data-fetching process
 *  • User-friendly error messages for every failure scenario
 *
 * Existing Features (from Part 1):
 *  • Current weather, 5-day forecast, hourly forecast
 *  • Air Quality Index (AQI) with pollutant breakdown
 *  • Geolocation – detect user's location
 *  • Recent searches with localStorage
 *  • Auto-refresh every 10 minutes
 *  • Wind direction compass, dew point, cloudiness
 *  • Temperature unit toggle (°C / °F)
 *  • Dynamic weather-specific particle effects
 *  • Animated background themes
 */

// ─── Configuration ────────────────────────────────────────────
const API_KEY = "e84ba02ec046c6812a758150f72f5937";
const BASE_URL = "https://api.openweathermap.org/data/2.5";
const ICON_URL = "https://openweathermap.org/img/wn";
const MAX_RECENT = 5;
const AUTO_REFRESH_MS = 10 * 60 * 1000; // 10 minutes
const GEO_TIMEOUT_MS = 10000; // 10 seconds

// ─── DOM References ───────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const searchForm = $("searchForm");
const cityInput = $("cityInput");
const errorBanner = $("errorBanner");
const errorMessage = $("errorMessage");
const closeError = $("closeError");
const loader = $("loader");
const weatherCard = $("weatherCard");
const welcomeState = $("welcomeState");
const cityChips = document.querySelectorAll(".city-chip");
const celsiusBtn = $("celsiusBtn");
const fahrenheitBtn = $("fahrenheitBtn");
const geoBtn = $("geoBtn");
const recentSearchesEl = $("recentSearches");
const recentChipsEl = $("recentChips");
const clearRecentBtn = $("clearRecent");
const aqiSection = $("aqiSection");
const hourlySection = $("hourlySection");
const forecastSection = $("forecastSection");

// ─── App State ────────────────────────────────────────────────
let currentTempCelsius = null;
let currentFeelsLikeCelsius = null;
let currentTempMinCelsius = null;
let currentTempMaxCelsius = null;
let currentUnit = "C";
let currentCity = "";
let forecastDataCache = null;
let refreshTimer = null;

// ═══════════════════════════════════════════════════════════════
//   HELPERS
// ═══════════════════════════════════════════════════════════════

function formatTime(unixSeconds, timezoneOffsetSeconds) {
    const localMs = (unixSeconds + timezoneOffsetSeconds) * 1000;
    const date = new Date(localMs);
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}

function buildDateTimeString(timezoneOffsetSeconds) {
    const nowUtcMs = Date.now();
    const localMs = nowUtcMs + timezoneOffsetSeconds * 1000;
    const d = new Date(localMs);
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = weekdays[d.getUTCDay()];
    const date = d.getUTCDate();
    const month = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    return `${day}, ${date} ${month} ${year}<br>${hh}:${mm} (local time)`;
}

function getThemeClass(conditionMain) {
    const map = {
        Clear: "weather-clear",
        Clouds: "weather-clouds",
        Rain: "weather-rain",
        Drizzle: "weather-drizzle",
        Thunderstorm: "weather-thunder",
        Snow: "weather-snow",
        Mist: "weather-mist",
        Smoke: "weather-mist",
        Haze: "weather-mist",
        Fog: "weather-mist",
        Dust: "weather-mist",
        Sand: "weather-mist",
        Ash: "weather-mist",
        Squall: "weather-clouds",
        Tornado: "weather-thunder",
    };
    return map[conditionMain] || "weather-default";
}

// Wind direction in compass form
function degToCompass(deg) {
    const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    return dirs[Math.round(deg / 22.5) % 16];
}

// Dew point approximation (Magnus formula)
function calcDewPoint(tempC, humidity) {
    const a = 17.27;
    const b = 237.7;
    const alpha = (a * tempC) / (b + tempC) + Math.log(humidity / 100);
    return (b * alpha) / (a - alpha);
}

// Convert Celsius to Fahrenheit
function cToF(c) {
    return (c * 9) / 5 + 32;
}

// Format temperature based on current unit
function fmtTemp(celsius) {
    if (currentUnit === "F") return `${Math.round(cToF(celsius))}°F`;
    return `${Math.round(celsius)}°C`;
}

// ═══════════════════════════════════════════════════════════════
//   UI STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

function showLoader() {
    hideAll();
    loader.classList.remove("hidden");
}

function showWeatherCard() {
    loader.classList.add("hidden");
    weatherCard.classList.remove("hidden");
    welcomeState.classList.add("hidden");
}

function showWelcome() {
    hideAll();
    welcomeState.classList.remove("hidden");
}

function hideAll() {
    weatherCard.classList.add("hidden");
    welcomeState.classList.add("hidden");
    loader.classList.add("hidden");
    aqiSection.classList.add("hidden");
    hourlySection.classList.add("hidden");
    forecastSection.classList.add("hidden");
    hideError();
}

function showError(msg) {
    errorMessage.textContent = msg;
    errorBanner.classList.remove("hidden");
}

function hideError() {
    errorBanner.classList.add("hidden");
}

// ═══════════════════════════════════════════════════════════════
//   RECENT SEARCHES (localStorage)
// ═══════════════════════════════════════════════════════════════

function getRecentSearches() {
    try {
        return JSON.parse(localStorage.getItem("skyfetch_recent")) || [];
    } catch {
        return [];
    }
}

function addRecentSearch(city) {
    let recent = getRecentSearches();
    // Remove if already exists (case-insensitive)
    recent = recent.filter((c) => c.toLowerCase() !== city.toLowerCase());
    recent.unshift(city);
    if (recent.length > MAX_RECENT) recent = recent.slice(0, MAX_RECENT);
    localStorage.setItem("skyfetch_recent", JSON.stringify(recent));
    renderRecentSearches();
}

function renderRecentSearches() {
    const recent = getRecentSearches();
    if (recent.length === 0) {
        recentSearchesEl.classList.add("hidden");
        return;
    }
    recentSearchesEl.classList.remove("hidden");
    recentChipsEl.innerHTML = recent
        .map((c) => `<button class="recent-chip" data-city="${c}"><i class="fa-solid fa-clock-rotate-left"></i> ${c}</button>`)
        .join("");

    // Attach click handlers
    recentChipsEl.querySelectorAll(".recent-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
            cityInput.value = chip.dataset.city;
            handleSearch(chip.dataset.city);
        });
    });
}

function clearRecentSearches() {
    localStorage.removeItem("skyfetch_recent");
    renderRecentSearches();
}

// ═══════════════════════════════════════════════════════════════
//   API CALLS
// ═══════════════════════════════════════════════════════════════

// ── Async/Await API call: Fetch current weather by city name ──
async function fetchWeather(city) {
    try {
        const url = `${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
        const response = await fetch(url);

        // Handle HTTP error responses
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`City "${city}" not found. Please check the spelling and try again.`);
            }
            if (response.status === 401) {
                throw new Error("Invalid API key. Please update API_KEY in app.js.");
            }
            throw new Error(`Server error (${response.status}). Please try again later.`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        // Re-throw API errors, wrap network errors with friendly message
        if (error instanceof TypeError) {
            throw new Error("Network error. Please check your internet connection and try again.");
        }
        throw error;
    }
}

// ── Async/Await API call: Fetch current weather by coordinates ──
async function fetchWeatherByCoords(lat, lon) {
    try {
        const url = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Server error (${response.status}). Unable to fetch weather for your location.`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error("Network error. Please check your internet connection and try again.");
        }
        throw error;
    }
}

// ── Async/Await API call: Fetch 5-day / 3-hour forecast ──
async function fetchForecast(lat, lon) {
    try {
        const url = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Could not load forecast data. Please try again.");
        }

        const data = await response.json();
        return data;
    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error("Network error while loading forecast. Please check your connection.");
        }
        throw error;
    }
}

// ── Async/Await API call: Fetch air quality data ──
async function fetchAirQuality(lat, lon) {
    try {
        const url = `${BASE_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
        const response = await fetch(url);

        if (!response.ok) return null; // Non-critical, fail silently

        const data = await response.json();
        return data;
    } catch (error) {
        // Air quality is non-critical — silently return null on failure
        console.warn("[SkyFetch] Air quality data unavailable:", error.message);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
//   RENDER: CURRENT WEATHER
// ═══════════════════════════════════════════════════════════════

function renderWeather(data) {
    currentTempCelsius = data.main.temp;
    currentFeelsLikeCelsius = data.main.feels_like;
    currentTempMinCelsius = data.main.temp_min;
    currentTempMaxCelsius = data.main.temp_max;

    // City + country
    $("cityName").textContent = data.name;
    $("countryName").textContent = `${data.sys.country} · ${data.coord.lat.toFixed(2)}°, ${data.coord.lon.toFixed(2)}°`;

    // Date/time
    $("datetime").innerHTML = buildDateTimeString(data.timezone);

    // Temperature
    updateTemperatureDisplay();

    // Icon
    const iconCode = data.weather[0].icon;
    $("weatherIcon").src = `${ICON_URL}/${iconCode}@4x.png`;
    $("weatherIcon").alt = data.weather[0].description;

    // Condition
    $("condition").textContent = data.weather[0].description;

    // Stats
    $("humidity").textContent = `${data.main.humidity}%`;
    $("windSpeed").textContent = `${(data.wind.speed * 3.6).toFixed(1)} km/h`;
    $("windDir").textContent = data.wind.deg !== undefined ? `${degToCompass(data.wind.deg)} (${data.wind.deg}°)` : "";
    $("pressure").textContent = `${data.main.pressure} hPa`;
    $("visibility").textContent = data.visibility ? `${(data.visibility / 1000).toFixed(1)} km` : "N/A";
    $("cloudiness").textContent = `${data.clouds.all}%`;

    // Dew point
    const dewPt = calcDewPoint(data.main.temp, data.main.humidity);
    $("dewPoint").textContent = `${Math.round(dewPt)}°C`;

    // Sunrise / Sunset
    $("sunrise").textContent = formatTime(data.sys.sunrise, data.timezone);
    $("sunset").textContent = formatTime(data.sys.sunset, data.timezone);

    // Last updated
    const now = new Date();
    $("lastUpdated").textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Theme
    applyWeatherTheme(data.weather[0].main);
    generateWeatherFx(data.weather[0].main);

    showWeatherCard();
}

// ═══════════════════════════════════════════════════════════════
//   RENDER: HOURLY FORECAST
// ═══════════════════════════════════════════════════════════════

function renderHourlyForecast(forecastData) {
    const items = forecastData.list.slice(0, 8); // next 24 hours (8 × 3h)
    const tz = forecastData.city.timezone;
    const container = $("hourlyScroll");

    container.innerHTML = items
        .map((item) => {
            const time = formatTime(item.dt, tz);
            const icon = item.weather[0].icon;
            const temp = Math.round(item.main.temp);
            const pop = Math.round((item.pop || 0) * 100);
            return `
        <div class="hourly-card">
          <span class="hourly-time">${time}</span>
          <img class="hourly-icon" src="${ICON_URL}/${icon}@2x.png" alt="${item.weather[0].description}" />
          <span class="hourly-temp">${fmtTemp(item.main.temp)}</span>
          ${pop > 0 ? `<span class="hourly-pop"><i class="fa-solid fa-droplet"></i> ${pop}%</span>` : ""}
        </div>`;
        })
        .join("");

    hourlySection.classList.remove("hidden");
}

// ═══════════════════════════════════════════════════════════════
//   RENDER: 5-DAY FORECAST
// ═══════════════════════════════════════════════════════════════

function renderForecast(forecastData) {
    forecastDataCache = forecastData;
    const dailyMap = {};
    const tz = forecastData.city.timezone;

    // Group by day
    forecastData.list.forEach((item) => {
        const localMs = (item.dt + tz) * 1000;
        const d = new Date(localMs);
        const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
        if (!dailyMap[key]) {
            dailyMap[key] = { temps: [], icons: [], conditions: [], pops: [], date: d };
        }
        dailyMap[key].temps.push(item.main.temp);
        dailyMap[key].icons.push(item.weather[0].icon);
        dailyMap[key].conditions.push(item.weather[0].main);
        dailyMap[key].pops.push(item.pop || 0);
    });

    const days = Object.values(dailyMap).slice(0, 5);
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Compute global min/max across all days for proportional bar widths
    const allDayStats = Object.values(dailyMap).slice(0, 5).map((day) => ({
        minT: Math.min(...day.temps),
        maxT: Math.max(...day.temps),
    }));
    const globalMin = Math.min(...allDayStats.map((d) => d.minT));
    const globalMax = Math.max(...allDayStats.map((d) => d.maxT));
    const globalRange = globalMax - globalMin || 1;

    const container = $("forecastGrid");
    container.innerHTML = days
        .map((day, i) => {
            const minT = Math.min(...day.temps);
            const maxT = Math.max(...day.temps);
            const avgPop = Math.round((day.pops.reduce((a, b) => a + b, 0) / day.pops.length) * 100);
            // Pick the most common icon around midday
            const midIcon = day.icons[Math.floor(day.icons.length / 2)];
            const dayName = i === 0 ? "Today" : weekdays[day.date.getUTCDay()];
            const dateStr = `${day.date.getUTCDate()} ${months[day.date.getUTCMonth()]}`;
            const barWidth = Math.max(20, Math.round(((maxT - minT) / globalRange) * 100));

            return `
        <div class="forecast-card" style="animation-delay: ${i * 0.08}s">
          <div class="forecast-day">
            <span class="forecast-dayname">${dayName}</span>
            <span class="forecast-date">${dateStr}</span>
          </div>
          <img class="forecast-icon" src="${ICON_URL}/${midIcon}@2x.png" alt="" />
          <div class="forecast-temps">
            <span class="forecast-high">${fmtTemp(maxT)}</span>
            <div class="temp-bar">
              <div class="temp-bar-fill" style="width: ${barWidth}%"></div>
            </div>
            <span class="forecast-low">${fmtTemp(minT)}</span>
          </div>
          ${avgPop > 10 ? `<span class="forecast-pop"><i class="fa-solid fa-droplet"></i> ${avgPop}%</span>` : `<span class="forecast-pop"></span>`}
        </div>`;
        })
        .join("");

    forecastSection.classList.remove("hidden");
}

// ═══════════════════════════════════════════════════════════════
//   RENDER: AIR QUALITY INDEX
// ═══════════════════════════════════════════════════════════════

function renderAirQuality(aqData) {
    if (!aqData || !aqData.list || aqData.list.length === 0) {
        aqiSection.classList.add("hidden");
        return;
    }

    const aqi = aqData.list[0].main.aqi;
    const components = aqData.list[0].components;

    const aqiInfo = [
        { level: 1, label: "Good", color: "#4ade80", emoji: "😊" },
        { level: 2, label: "Fair", color: "#facc15", emoji: "🙂" },
        { level: 3, label: "Moderate", color: "#fb923c", emoji: "😐" },
        { level: 4, label: "Poor", color: "#f87171", emoji: "😷" },
        { level: 5, label: "Very Poor", color: "#dc2626", emoji: "🤢" },
    ];

    const info = aqiInfo[aqi - 1] || aqiInfo[0];

    const badge = $("aqiBadge");
    badge.style.background = `linear-gradient(135deg, ${info.color}22, ${info.color}44)`;
    badge.style.borderColor = `${info.color}88`;
    $("aqiNumber").textContent = `${info.emoji} ${aqi}/5`;
    $("aqiLabel").textContent = info.label;
    $("aqiLabel").style.color = info.color;

    // Pollutants
    const pollutants = [
        { key: "pm2_5", label: "PM2.5", unit: "μg/m³" },
        { key: "pm10", label: "PM10", unit: "μg/m³" },
        { key: "o3", label: "O₃", unit: "μg/m³" },
        { key: "no2", label: "NO₂", unit: "μg/m³" },
        { key: "so2", label: "SO₂", unit: "μg/m³" },
        { key: "co", label: "CO", unit: "μg/m³" },
    ];

    $("aqiPollutants").innerHTML = pollutants
        .map(
            (p) => `
      <div class="pollutant">
        <span class="pollutant-label">${p.label}</span>
        <span class="pollutant-value">${components[p.key] !== undefined ? components[p.key].toFixed(1) : "—"} ${p.unit}</span>
      </div>`
        )
        .join("");

    aqiSection.classList.remove("hidden");
}

// ═══════════════════════════════════════════════════════════════
//   TEMPERATURE UNIT TOGGLE
// ═══════════════════════════════════════════════════════════════

function updateTemperatureDisplay() {
    if (currentTempCelsius === null) return;
    $("temperature").textContent = fmtTemp(currentTempCelsius);
    $("feelsLike").textContent = fmtTemp(currentFeelsLikeCelsius);
    $("tempMin").textContent = fmtTemp(currentTempMinCelsius);
    $("tempMax").textContent = fmtTemp(currentTempMaxCelsius);

    // Update dew point
    const dewPt = calcDewPoint(currentTempCelsius, parseFloat($("humidity").textContent));
    $("dewPoint").textContent = fmtTemp(dewPt);

    if (currentUnit === "C") {
        celsiusBtn.classList.add("active");
        fahrenheitBtn.classList.remove("active");
    } else {
        fahrenheitBtn.classList.add("active");
        celsiusBtn.classList.remove("active");
    }

    // Re-render forecast and hourly with new unit
    if (forecastDataCache) {
        renderForecast(forecastDataCache);
        renderHourlyForecast(forecastDataCache);
    }
}

// ═══════════════════════════════════════════════════════════════
//   DYNAMIC THEME + WEATHER FX
// ═══════════════════════════════════════════════════════════════

function applyWeatherTheme(conditionMain) {
    const themeClasses = [
        "weather-clear", "weather-clouds", "weather-rain", "weather-drizzle",
        "weather-thunder", "weather-snow", "weather-mist", "weather-default",
    ];
    document.body.classList.remove(...themeClasses);
    document.body.classList.add(getThemeClass(conditionMain));
}

function generateWeatherFx(conditionMain) {
    const container = $("weatherFx");
    container.innerHTML = "";

    const condition = conditionMain.toLowerCase();

    if (condition === "rain" || condition === "drizzle" || condition === "thunderstorm") {
        // Rain drops
        const count = condition === "drizzle" ? 30 : 60;
        for (let i = 0; i < count; i++) {
            const drop = document.createElement("div");
            drop.classList.add("rain-drop");
            drop.style.left = `${Math.random() * 100}%`;
            drop.style.animationDuration = `${Math.random() * 0.4 + 0.5}s`;
            drop.style.animationDelay = `${Math.random() * 2}s`;
            drop.style.opacity = Math.random() * 0.3 + 0.2;
            container.appendChild(drop);
        }
    } else if (condition === "snow") {
        for (let i = 0; i < 40; i++) {
            const flake = document.createElement("div");
            flake.classList.add("snowflake");
            flake.innerHTML = "❄";
            flake.style.left = `${Math.random() * 100}%`;
            flake.style.fontSize = `${Math.random() * 14 + 6}px`;
            flake.style.animationDuration = `${Math.random() * 5 + 5}s`;
            flake.style.animationDelay = `${Math.random() * 5}s`;
            flake.style.opacity = Math.random() * 0.5 + 0.2;
            container.appendChild(flake);
        }
    } else if (condition === "clear") {
        const rays = document.createElement("div");
        rays.classList.add("sun-rays");
        container.appendChild(rays);
    }
}

// ═══════════════════════════════════════════════════════════════
//   MAIN CONTROLLER (async/await + try-catch error handling)
// ═══════════════════════════════════════════════════════════════

/**
 * handleSearch — Main search handler
 * Uses async/await for all API calls.
 * Wrapped in try-catch to handle:
 *   1. Empty / invalid input
 *   2. Invalid city name (404)
 *   3. Network / API request failures
 */
async function handleSearch(city) {
    const trimmed = city.trim();

    // ── Error Handling: Empty / invalid input ──
    if (!trimmed) {
        showError("Please enter a city name.");
        return;
    }

    // Validate input contains only letters, spaces, hyphens, and periods
    if (!/^[a-zA-Z\s\-\.,']+$/.test(trimmed)) {
        showError("Invalid input. Please enter a valid city name using letters only.");
        return;
    }

    hideError();
    showLoader(); // Show loading indicator before fetching
    currentCity = trimmed;

    // ── try-catch: wraps all async API calls ──
    try {
        // Step 1: Await current weather data
        const weatherData = await fetchWeather(trimmed);
        renderWeather(weatherData);
        addRecentSearch(weatherData.name);

        // Step 2: Await forecast + AQI in parallel using async/await with Promise.all
        const { lat, lon } = weatherData.coord;
        const [forecastData, aqData] = await Promise.all([
            fetchForecast(lat, lon),
            fetchAirQuality(lat, lon),
        ]);

        renderHourlyForecast(forecastData);
        renderForecast(forecastData);
        renderAirQuality(aqData);

        // Step 3: Setup auto-refresh for the searched city
        setupAutoRefresh(trimmed);
    } catch (error) {
        // ── Error Handling: catch block for invalid city / network failure ──
        loader.classList.add("hidden");
        welcomeState.classList.remove("hidden");
        showError(error.message || "An unexpected error occurred. Please try again.");
        console.error("[SkyFetch] Fetch error:", error);
    }
}

/**
 * handleGeoSearch — Geolocation-based search
 * Uses async/await for all API calls.
 * Wrapped in try-catch for error handling.
 */
async function handleGeoSearch(lat, lon) {
    hideError();
    showLoader(); // Show loading indicator

    // ── try-catch: wraps all async API calls ──
    try {
        // Step 1: Await weather data for coordinates
        const weatherData = await fetchWeatherByCoords(lat, lon);
        currentCity = weatherData.name;
        cityInput.value = weatherData.name;
        renderWeather(weatherData);
        addRecentSearch(weatherData.name);

        // Step 2: Await forecast + AQI in parallel
        const [forecastData, aqData] = await Promise.all([
            fetchForecast(lat, lon),
            fetchAirQuality(lat, lon),
        ]);

        renderHourlyForecast(forecastData);
        renderForecast(forecastData);
        renderAirQuality(aqData);

        // Step 3: Setup auto-refresh
        setupAutoRefresh(weatherData.name);
    } catch (error) {
        // ── Error Handling: catch block ──
        loader.classList.add("hidden");
        welcomeState.classList.remove("hidden");
        showError(error.message || "Unable to fetch weather for your location. Please try again.");
        console.error("[SkyFetch] Geo fetch error:", error);
    }
}

// ═══════════════════════════════════════════════════════════════
//   AUTO-REFRESH
// ═══════════════════════════════════════════════════════════════

function setupAutoRefresh(city) {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
        console.log("[SkyFetch] Auto-refreshing weather for", city);
        handleSearch(city);
    }, AUTO_REFRESH_MS);
}

// ═══════════════════════════════════════════════════════════════
//   PARTICLE BACKGROUND
// ═══════════════════════════════════════════════════════════════

function generateParticles() {
    const container = $("bgParticles");
    const count = 20;
    container.innerHTML = "";

    for (let i = 0; i < count; i++) {
        const particle = document.createElement("div");
        particle.classList.add("particle");
        const size = Math.random() * 60 + 20;
        const left = Math.random() * 100;
        const duration = Math.random() * 20 + 15;
        const delay = Math.random() * 15;

        particle.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${left}%;
      bottom: -${size}px;
      animation-duration: ${duration}s;
      animation-delay: -${delay}s;
      opacity: ${Math.random() * 0.06 + 0.02};
    `;
        container.appendChild(particle);
    }
}

// ═══════════════════════════════════════════════════════════════
//   EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════

// Search form submit
searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleSearch(cityInput.value);
});

// Quick city chips
cityChips.forEach((chip) => {
    chip.addEventListener("click", () => {
        const city = chip.dataset.city;
        cityInput.value = city;
        handleSearch(city);
    });
});

// Unit toggle
celsiusBtn.addEventListener("click", () => {
    if (currentTempCelsius !== null && currentUnit !== "C") {
        currentUnit = "C";
        updateTemperatureDisplay();
    }
});
fahrenheitBtn.addEventListener("click", () => {
    if (currentTempCelsius !== null && currentUnit !== "F") {
        currentUnit = "F";
        updateTemperatureDisplay();
    }
});

// Close error banner
closeError.addEventListener("click", hideError);

// Dismiss error on new keypress
cityInput.addEventListener("input", hideError);

// Geolocation
geoBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
        showError("Geolocation is not supported by your browser.");
        return;
    }
    geoBtn.classList.add("geo-loading");
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            geoBtn.classList.remove("geo-loading");
            handleGeoSearch(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
            geoBtn.classList.remove("geo-loading");
            showError("Location access denied. Please search manually.");
            console.error("[SkyFetch] Geolocation error:", err);
        },
        { timeout: GEO_TIMEOUT_MS }
    );
});

// Clear recent searches
clearRecentBtn.addEventListener("click", clearRecentSearches);

// ═══════════════════════════════════════════════════════════════
//   INITIALISE
// ═══════════════════════════════════════════════════════════════

generateParticles();
renderRecentSearches();
showWelcome();
