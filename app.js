/**
 * SkyFetch Weather Dashboard v3.0 – Part 3: Prototypal Inheritance
 * -----------------------------------------------------------------
 * Part 3 Enhancements:
 *  • All code reorganised into a single WeatherApp constructor
 *  • Every method lives on WeatherApp.prototype (prototypal inheritance)
 *  • Multiple API endpoints fetched efficiently with Promise.all
 *  • 5-day forecast displayed using responsive forecast cards
 *
 * Retained from Part 2:
 *  • Async/await for all API calls with try-catch error handling
 *  • Loading indicator, user-friendly errors, input validation
 *  • Geolocation, recent searches, auto-refresh, unit toggle
 *  • Dynamic weather themes, animated particles & weather FX
 */

// ─── Module-level constants (shared, not per-instance) ─────────
var API_KEY         = "e84ba02ec046c6812a758150f72f5937";
var BASE_URL        = "https://api.openweathermap.org/data/2.5";
var ICON_URL        = "https://openweathermap.org/img/wn";
var MAX_RECENT      = 5;
var AUTO_REFRESH_MS = 10 * 60 * 1000; // 10 minutes
var GEO_TIMEOUT_MS  = 10000;          // 10 seconds

// ═══════════════════════════════════════════════════════════════
//   WeatherApp CONSTRUCTOR
// ═══════════════════════════════════════════════════════════════

/**
 * WeatherApp — single constructor that owns all DOM refs and state.
 * All behaviour is delegated to WeatherApp.prototype methods.
 */
function WeatherApp() {
    // ── DOM References ────────────────────────────────────────
    this.searchForm       = document.getElementById("searchForm");
    this.cityInput        = document.getElementById("cityInput");
    this.errorBanner      = document.getElementById("errorBanner");
    this.errorMessage     = document.getElementById("errorMessage");
    this.closeError       = document.getElementById("closeError");
    this.loader           = document.getElementById("loader");
    this.weatherCard      = document.getElementById("weatherCard");
    this.welcomeState     = document.getElementById("welcomeState");
    this.cityChips        = document.querySelectorAll(".city-chip");
    this.celsiusBtn       = document.getElementById("celsiusBtn");
    this.fahrenheitBtn    = document.getElementById("fahrenheitBtn");
    this.geoBtn           = document.getElementById("geoBtn");
    this.recentSearchesEl = document.getElementById("recentSearches");
    this.recentChipsEl    = document.getElementById("recentChips");
    this.clearRecentBtn   = document.getElementById("clearRecent");
    this.aqiSection       = document.getElementById("aqiSection");
    this.hourlySection    = document.getElementById("hourlySection");
    this.forecastSection  = document.getElementById("forecastSection");

    // ── Instance State ────────────────────────────────────────
    this.currentTempCelsius      = null;
    this.currentFeelsLikeCelsius = null;
    this.currentTempMinCelsius   = null;
    this.currentTempMaxCelsius   = null;
    this.currentUnit             = "C";
    this.currentCity             = "";
    this.forecastDataCache       = null;
    this.refreshTimer            = null;

    // ── Bootstrap ─────────────────────────────────────────────
    this._init();
}

// ═══════════════════════════════════════════════════════════════
//   INITIALISE
// ═══════════════════════════════════════════════════════════════

WeatherApp.prototype._init = function () {
    this.generateParticles();
    this.renderRecentSearches();
    this.showWelcome();
    this._bindEvents();
    this.loadLastCity();
};

WeatherApp.prototype._bindEvents = function () {
    var self = this;

    // Search form submit
    this.searchForm.addEventListener("submit", function (event) {
        event.preventDefault();
        self.handleSearch(self.cityInput.value);
    });

    // Quick-city chips
    this.cityChips.forEach(function (chip) {
        chip.addEventListener("click", function () {
            var city = chip.dataset.city;
            self.cityInput.value = city;
            self.handleSearch(city);
        });
    });

    // °C / °F toggle
    this.celsiusBtn.addEventListener("click", function () {
        if (self.currentTempCelsius !== null && self.currentUnit !== "C") {
            self.currentUnit = "C";
            self.updateTemperatureDisplay();
        }
    });
    this.fahrenheitBtn.addEventListener("click", function () {
        if (self.currentTempCelsius !== null && self.currentUnit !== "F") {
            self.currentUnit = "F";
            self.updateTemperatureDisplay();
        }
    });

    // Close error banner
    this.closeError.addEventListener("click", function () {
        self.hideError();
    });

    // Dismiss error on new keypress
    this.cityInput.addEventListener("input", function () {
        self.hideError();
    });

    // Geolocation button
    this.geoBtn.addEventListener("click", function () {
        if (!navigator.geolocation) {
            self.showError("Geolocation is not supported by your browser.");
            return;
        }
        self.geoBtn.classList.add("geo-loading");
        navigator.geolocation.getCurrentPosition(
            function (pos) {
                self.geoBtn.classList.remove("geo-loading");
                self.handleGeoSearch(pos.coords.latitude, pos.coords.longitude);
            },
            function (err) {
                self.geoBtn.classList.remove("geo-loading");
                self.showError("Location access denied. Please search manually.");
                console.error("[SkyFetch] Geolocation error:", err);
            },
            { timeout: GEO_TIMEOUT_MS }
        );
    });

    // Clear recent searches
    this.clearRecentBtn.addEventListener("click", function () {
        self.clearRecentSearches();
    });
};

// ═══════════════════════════════════════════════════════════════
//   HELPERS
// ═══════════════════════════════════════════════════════════════

WeatherApp.prototype.formatTime = function (unixSeconds, timezoneOffsetSeconds) {
    var localMs = (unixSeconds + timezoneOffsetSeconds) * 1000;
    var date    = new Date(localMs);
    var hours   = String(date.getUTCHours()).padStart(2, "0");
    var minutes = String(date.getUTCMinutes()).padStart(2, "0");
    return hours + ":" + minutes;
};

WeatherApp.prototype.buildDateTimeString = function (timezoneOffsetSeconds) {
    var nowUtcMs = Date.now();
    var localMs  = nowUtcMs + timezoneOffsetSeconds * 1000;
    var d        = new Date(localMs);
    var weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var months   = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var day      = weekdays[d.getUTCDay()];
    var date     = d.getUTCDate();
    var month    = months[d.getUTCMonth()];
    var year     = d.getUTCFullYear();
    var hh       = String(d.getUTCHours()).padStart(2, "0");
    var mm       = String(d.getUTCMinutes()).padStart(2, "0");
    return day + ", " + date + " " + month + " " + year + "<br>" + hh + ":" + mm + " (local time)";
};

WeatherApp.prototype.getThemeClass = function (conditionMain) {
    var map = {
        Clear:       "weather-clear",
        Clouds:      "weather-clouds",
        Rain:        "weather-rain",
        Drizzle:     "weather-drizzle",
        Thunderstorm: "weather-thunder",
        Snow:        "weather-snow",
        Mist:        "weather-mist",
        Smoke:       "weather-mist",
        Haze:        "weather-mist",
        Fog:         "weather-mist",
        Dust:        "weather-mist",
        Sand:        "weather-mist",
        Ash:         "weather-mist",
        Squall:      "weather-clouds",
        Tornado:     "weather-thunder",
    };
    return map[conditionMain] || "weather-default";
};

WeatherApp.prototype.degToCompass = function (deg) {
    var dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
    return dirs[Math.round(deg / 22.5) % 16];
};

WeatherApp.prototype.calcDewPoint = function (tempC, humidity) {
    var a     = 17.27;
    var b     = 237.7;
    var alpha = (a * tempC) / (b + tempC) + Math.log(humidity / 100);
    return (b * alpha) / (a - alpha);
};

WeatherApp.prototype.cToF = function (c) {
    return (c * 9) / 5 + 32;
};

WeatherApp.prototype.fmtTemp = function (celsius) {
    if (this.currentUnit === "F") return Math.round(this.cToF(celsius)) + "°F";
    return Math.round(celsius) + "°C";
};

// ═══════════════════════════════════════════════════════════════
//   UI STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

WeatherApp.prototype.showLoader = function () {
    this.hideAll();
    this.loader.classList.remove("hidden");
};

WeatherApp.prototype.showWeatherCard = function () {
    this.loader.classList.add("hidden");
    this.weatherCard.classList.remove("hidden");
    this.welcomeState.classList.add("hidden");
};

WeatherApp.prototype.showWelcome = function () {
    this.hideAll();
    this.welcomeState.classList.remove("hidden");
};

WeatherApp.prototype.hideAll = function () {
    this.weatherCard.classList.add("hidden");
    this.welcomeState.classList.add("hidden");
    this.loader.classList.add("hidden");
    this.aqiSection.classList.add("hidden");
    this.hourlySection.classList.add("hidden");
    this.forecastSection.classList.add("hidden");
    this.hideError();
};

WeatherApp.prototype.showError = function (msg) {
    this.errorMessage.textContent = msg;
    this.errorBanner.classList.remove("hidden");
};

WeatherApp.prototype.hideError = function () {
    this.errorBanner.classList.add("hidden");
};

// ═══════════════════════════════════════════════════════════════
//   RECENT SEARCHES (localStorage)
// ═══════════════════════════════════════════════════════════════

WeatherApp.prototype.getRecentSearches = function () {
    try {
        return JSON.parse(localStorage.getItem("skyfetch_recent")) || [];
    } catch (e) {
        return [];
    }
};

WeatherApp.prototype.addRecentSearch = function (city) {
    var recent = this.getRecentSearches();
    recent = recent.filter(function (c) {
        return c.toLowerCase() !== city.toLowerCase();
    });
    recent.unshift(city);
    if (recent.length > MAX_RECENT) recent = recent.slice(0, MAX_RECENT);
    localStorage.setItem("skyfetch_recent", JSON.stringify(recent));
    this.renderRecentSearches();
};

WeatherApp.prototype.renderRecentSearches = function () {
    var self   = this;
    var recent = this.getRecentSearches();
    if (recent.length === 0) {
        this.recentSearchesEl.classList.add("hidden");
        return;
    }
    this.recentSearchesEl.classList.remove("hidden");
    this.recentChipsEl.innerHTML = recent
        .map(function (c) {
            return '<button class="recent-chip" data-city="' + c + '">' +
                   '<i class="fa-solid fa-clock-rotate-left"></i> ' + c + "</button>";
        })
        .join("");

    this.recentChipsEl.querySelectorAll(".recent-chip").forEach(function (chip) {
        chip.addEventListener("click", function () {
            self.cityInput.value = chip.dataset.city;
            self.handleSearch(chip.dataset.city);
        });
    });
};

WeatherApp.prototype.clearRecentSearches = function () {
    localStorage.removeItem("skyfetch_recent");
    this.renderRecentSearches();
};

WeatherApp.prototype.loadLastCity = function () {
    var recent = this.getRecentSearches();
    if (recent.length > 0) {
        this.handleSearch(recent[0]);
    }
};

// ═══════════════════════════════════════════════════════════════
//   API CALLS  (async/await + try-catch)
// ═══════════════════════════════════════════════════════════════

WeatherApp.prototype.fetchWeather = async function (city) {
    try {
        var url      = BASE_URL + "/weather?q=" + encodeURIComponent(city) + "&appid=" + API_KEY + "&units=metric";
        var response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) throw new Error('City "' + city + '" not found. Please check the spelling and try again.');
            if (response.status === 401) throw new Error("Invalid API key. Please update API_KEY in app.js.");
            throw new Error("Server error (" + response.status + "). Please try again later.");
        }
        return await response.json();
    } catch (error) {
        if (error instanceof TypeError) throw new Error("Network error. Please check your internet connection and try again.");
        throw error;
    }
};

WeatherApp.prototype.fetchWeatherByCoords = async function (lat, lon) {
    try {
        var url      = BASE_URL + "/weather?lat=" + lat + "&lon=" + lon + "&appid=" + API_KEY + "&units=metric";
        var response = await fetch(url);
        if (!response.ok) throw new Error("Server error (" + response.status + "). Unable to fetch weather for your location.");
        return await response.json();
    } catch (error) {
        if (error instanceof TypeError) throw new Error("Network error. Please check your internet connection and try again.");
        throw error;
    }
};

WeatherApp.prototype.fetchForecast = async function (lat, lon) {
    try {
        var url      = BASE_URL + "/forecast?lat=" + lat + "&lon=" + lon + "&appid=" + API_KEY + "&units=metric";
        var response = await fetch(url);
        if (!response.ok) throw new Error("Could not load forecast data. Please try again.");
        return await response.json();
    } catch (error) {
        if (error instanceof TypeError) throw new Error("Network error while loading forecast. Please check your connection.");
        throw error;
    }
};

WeatherApp.prototype.fetchAirQuality = async function (lat, lon) {
    try {
        var url      = BASE_URL + "/air_pollution?lat=" + lat + "&lon=" + lon + "&appid=" + API_KEY;
        var response = await fetch(url);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.warn("[SkyFetch] Air quality data unavailable:", error.message);
        return null;
    }
};

// ═══════════════════════════════════════════════════════════════
//   RENDER: CURRENT WEATHER
// ═══════════════════════════════════════════════════════════════

WeatherApp.prototype.renderWeather = function (data) {
    this.currentTempCelsius      = data.main.temp;
    this.currentFeelsLikeCelsius = data.main.feels_like;
    this.currentTempMinCelsius   = data.main.temp_min;
    this.currentTempMaxCelsius   = data.main.temp_max;

    document.getElementById("cityName").textContent    = data.name;
    document.getElementById("countryName").textContent =
        data.sys.country + " · " + data.coord.lat.toFixed(2) + "°, " + data.coord.lon.toFixed(2) + "°";
    document.getElementById("datetime").innerHTML      = this.buildDateTimeString(data.timezone);

    this.updateTemperatureDisplay();

    var iconCode = data.weather[0].icon;
    document.getElementById("weatherIcon").src = ICON_URL + "/" + iconCode + "@4x.png";
    document.getElementById("weatherIcon").alt = data.weather[0].description;

    document.getElementById("condition").textContent   = data.weather[0].description;
    document.getElementById("humidity").textContent    = data.main.humidity + "%";
    document.getElementById("windSpeed").textContent   = (data.wind.speed * 3.6).toFixed(1) + " km/h";
    document.getElementById("windDir").textContent     =
        data.wind.deg !== undefined ? this.degToCompass(data.wind.deg) + " (" + data.wind.deg + "°)" : "";
    document.getElementById("pressure").textContent    = data.main.pressure + " hPa";
    document.getElementById("visibility").textContent  =
        data.visibility ? (data.visibility / 1000).toFixed(1) + " km" : "N/A";
    document.getElementById("cloudiness").textContent  = data.clouds.all + "%";

    var dewPt = this.calcDewPoint(data.main.temp, data.main.humidity);
    document.getElementById("dewPoint").textContent   = Math.round(dewPt) + "°C";
    document.getElementById("sunrise").textContent    = this.formatTime(data.sys.sunrise, data.timezone);
    document.getElementById("sunset").textContent     = this.formatTime(data.sys.sunset, data.timezone);

    var now = new Date();
    document.getElementById("lastUpdated").textContent =
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    this.applyWeatherTheme(data.weather[0].main);
    this.generateWeatherFx(data.weather[0].main);
    this.showWeatherCard();
};

// ═══════════════════════════════════════════════════════════════
//   RENDER: HOURLY FORECAST
// ═══════════════════════════════════════════════════════════════

WeatherApp.prototype.renderHourlyForecast = function (forecastData) {
    var self      = this;
    var items     = forecastData.list.slice(0, 8);
    var tz        = forecastData.city.timezone;
    var container = document.getElementById("hourlyScroll");

    container.innerHTML = items
        .map(function (item) {
            var time = self.formatTime(item.dt, tz);
            var icon = item.weather[0].icon;
            var pop  = Math.round((item.pop || 0) * 100);
            return '<div class="hourly-card">' +
                '<span class="hourly-time">' + time + "</span>" +
                '<img class="hourly-icon" src="' + ICON_URL + "/" + icon + '@2x.png" alt="' + item.weather[0].description + '" />' +
                '<span class="hourly-temp">' + self.fmtTemp(item.main.temp) + "</span>" +
                (pop > 0 ? '<span class="hourly-pop"><i class="fa-solid fa-droplet"></i> ' + pop + "%</span>" : "") +
                "</div>";
        })
        .join("");

    this.hourlySection.classList.remove("hidden");
};

// ═══════════════════════════════════════════════════════════════
//   RENDER: 5-DAY FORECAST
// ═══════════════════════════════════════════════════════════════

WeatherApp.prototype.renderForecast = function (forecastData) {
    var self     = this;
    this.forecastDataCache = forecastData;

    var dailyMap = {};
    var tz       = forecastData.city.timezone;

    // Group 3-hourly entries by local calendar day
    forecastData.list.forEach(function (item) {
        var localMs = (item.dt + tz) * 1000;
        var d       = new Date(localMs);
        var key     = d.getUTCFullYear() + "-" + d.getUTCMonth() + "-" + d.getUTCDate();
        if (!dailyMap[key]) {
            dailyMap[key] = { temps: [], icons: [], conditions: [], pops: [], date: d };
        }
        dailyMap[key].temps.push(item.main.temp);
        dailyMap[key].icons.push(item.weather[0].icon);
        dailyMap[key].conditions.push(item.weather[0].main);
        dailyMap[key].pops.push(item.pop || 0);
    });

    var days     = Object.values(dailyMap).slice(0, 5);
    var weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var months   = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Compute global min/max for proportional temperature bar widths
    var allDayStats = days.map(function (day) {
        return { minT: Math.min.apply(null, day.temps), maxT: Math.max.apply(null, day.temps) };
    });
    var globalMin   = Math.min.apply(null, allDayStats.map(function (s) { return s.minT; }));
    var globalMax   = Math.max.apply(null, allDayStats.map(function (s) { return s.maxT; }));
    var globalRange = globalMax - globalMin || 1;

    var container   = document.getElementById("forecastGrid");
    container.innerHTML = days
        .map(function (day, i) {
            var minT    = Math.min.apply(null, day.temps);
            var maxT    = Math.max.apply(null, day.temps);
            var avgPop  = Math.round((day.pops.reduce(function (a, b) { return a + b; }, 0) / day.pops.length) * 100);
            var midIcon = day.icons[Math.floor(day.icons.length / 2)];
            var dayName = i === 0 ? "Today" : weekdays[day.date.getUTCDay()];
            var dateStr = day.date.getUTCDate() + " " + months[day.date.getUTCMonth()];
            var barWidth = Math.max(20, Math.round(((maxT - minT) / globalRange) * 100));

            return '<div class="forecast-card" style="animation-delay: ' + (i * 0.08) + 's">' +
                '<div class="forecast-day">' +
                    '<span class="forecast-dayname">' + dayName + "</span>" +
                    '<span class="forecast-date">' + dateStr + "</span>" +
                "</div>" +
                '<img class="forecast-icon" src="' + ICON_URL + "/" + midIcon + '@2x.png" alt="" />' +
                '<div class="forecast-temps">' +
                    '<span class="forecast-high">' + self.fmtTemp(maxT) + "</span>" +
                    '<div class="temp-bar"><div class="temp-bar-fill" style="width: ' + barWidth + '%"></div></div>' +
                    '<span class="forecast-low">' + self.fmtTemp(minT) + "</span>" +
                "</div>" +
                (avgPop > 10
                    ? '<span class="forecast-pop"><i class="fa-solid fa-droplet"></i> ' + avgPop + "%</span>"
                    : '<span class="forecast-pop"></span>') +
                "</div>";
        })
        .join("");

    this.forecastSection.classList.remove("hidden");
};

// ═══════════════════════════════════════════════════════════════
//   RENDER: AIR QUALITY INDEX
// ═══════════════════════════════════════════════════════════════

WeatherApp.prototype.renderAirQuality = function (aqData) {
    if (!aqData || !aqData.list || aqData.list.length === 0) {
        this.aqiSection.classList.add("hidden");
        return;
    }

    var aqi        = aqData.list[0].main.aqi;
    var components = aqData.list[0].components;

    var aqiInfo = [
        { level: 1, label: "Good",      color: "#4ade80", emoji: "😊" },
        { level: 2, label: "Fair",      color: "#facc15", emoji: "🙂" },
        { level: 3, label: "Moderate",  color: "#fb923c", emoji: "😐" },
        { level: 4, label: "Poor",      color: "#f87171", emoji: "😷" },
        { level: 5, label: "Very Poor", color: "#dc2626", emoji: "🤢" },
    ];

    var info  = aqiInfo[aqi - 1] || aqiInfo[0];
    var badge = document.getElementById("aqiBadge");
    badge.style.background   = "linear-gradient(135deg, " + info.color + "22, " + info.color + "44)";
    badge.style.borderColor  = info.color + "88";
    document.getElementById("aqiNumber").textContent = info.emoji + " " + aqi + "/5";
    document.getElementById("aqiLabel").textContent  = info.label;
    document.getElementById("aqiLabel").style.color  = info.color;

    var pollutants = [
        { key: "pm2_5", label: "PM2.5", unit: "μg/m³" },
        { key: "pm10",  label: "PM10",  unit: "μg/m³" },
        { key: "o3",    label: "O₃",    unit: "μg/m³" },
        { key: "no2",   label: "NO₂",   unit: "μg/m³" },
        { key: "so2",   label: "SO₂",   unit: "μg/m³" },
        { key: "co",    label: "CO",    unit: "μg/m³" },
    ];

    document.getElementById("aqiPollutants").innerHTML = pollutants
        .map(function (p) {
            var val = components[p.key] !== undefined ? components[p.key].toFixed(1) : "—";
            return '<div class="pollutant">' +
                '<span class="pollutant-label">' + p.label + "</span>" +
                '<span class="pollutant-value">' + val + " " + p.unit + "</span>" +
                "</div>";
        })
        .join("");

    this.aqiSection.classList.remove("hidden");
};

// ═══════════════════════════════════════════════════════════════
//   TEMPERATURE UNIT TOGGLE
// ═══════════════════════════════════════════════════════════════

WeatherApp.prototype.updateTemperatureDisplay = function () {
    if (this.currentTempCelsius === null) return;
    document.getElementById("temperature").textContent = this.fmtTemp(this.currentTempCelsius);
    document.getElementById("feelsLike").textContent   = this.fmtTemp(this.currentFeelsLikeCelsius);
    document.getElementById("tempMin").textContent     = this.fmtTemp(this.currentTempMinCelsius);
    document.getElementById("tempMax").textContent     = this.fmtTemp(this.currentTempMaxCelsius);

    var dewPt = this.calcDewPoint(
        this.currentTempCelsius,
        parseFloat(document.getElementById("humidity").textContent)
    );
    document.getElementById("dewPoint").textContent = this.fmtTemp(dewPt);

    if (this.currentUnit === "C") {
        this.celsiusBtn.classList.add("active");
        this.fahrenheitBtn.classList.remove("active");
    } else {
        this.fahrenheitBtn.classList.add("active");
        this.celsiusBtn.classList.remove("active");
    }

    if (this.forecastDataCache) {
        this.renderForecast(this.forecastDataCache);
        this.renderHourlyForecast(this.forecastDataCache);
    }
};

// ═══════════════════════════════════════════════════════════════
//   DYNAMIC THEME + WEATHER FX
// ═══════════════════════════════════════════════════════════════

WeatherApp.prototype.applyWeatherTheme = function (conditionMain) {
    var themeClasses = [
        "weather-clear", "weather-clouds", "weather-rain", "weather-drizzle",
        "weather-thunder", "weather-snow", "weather-mist", "weather-default",
    ];
    document.body.classList.remove.apply(document.body.classList, themeClasses);
    document.body.classList.add(this.getThemeClass(conditionMain));
};

WeatherApp.prototype.generateWeatherFx = function (conditionMain) {
    var container = document.getElementById("weatherFx");
    container.innerHTML = "";
    var condition = conditionMain.toLowerCase();

    if (condition === "rain" || condition === "drizzle" || condition === "thunderstorm") {
        var count = condition === "drizzle" ? 30 : 60;
        for (var i = 0; i < count; i++) {
            var drop = document.createElement("div");
            drop.classList.add("rain-drop");
            drop.style.left              = Math.random() * 100 + "%";
            drop.style.animationDuration = (Math.random() * 0.4 + 0.5) + "s";
            drop.style.animationDelay    = (Math.random() * 2) + "s";
            drop.style.opacity           = Math.random() * 0.3 + 0.2;
            container.appendChild(drop);
        }
    } else if (condition === "snow") {
        for (var j = 0; j < 40; j++) {
            var flake = document.createElement("div");
            flake.classList.add("snowflake");
            flake.innerHTML              = "❄";
            flake.style.left             = Math.random() * 100 + "%";
            flake.style.fontSize         = (Math.random() * 14 + 6) + "px";
            flake.style.animationDuration = (Math.random() * 5 + 5) + "s";
            flake.style.animationDelay   = (Math.random() * 5) + "s";
            flake.style.opacity          = Math.random() * 0.5 + 0.2;
            container.appendChild(flake);
        }
    } else if (condition === "clear") {
        var rays = document.createElement("div");
        rays.classList.add("sun-rays");
        container.appendChild(rays);
    }
};

// ═══════════════════════════════════════════════════════════════
//   PARTICLE BACKGROUND
// ═══════════════════════════════════════════════════════════════

WeatherApp.prototype.generateParticles = function () {
    var container = document.getElementById("bgParticles");
    var count     = 20;
    container.innerHTML = "";

    for (var i = 0; i < count; i++) {
        var particle = document.createElement("div");
        particle.classList.add("particle");
        var size     = Math.random() * 60 + 20;
        var left     = Math.random() * 100;
        var duration = Math.random() * 20 + 15;
        var delay    = Math.random() * 15;
        particle.style.cssText =
            "width: " + size + "px;" +
            "height: " + size + "px;" +
            "left: " + left + "%;" +
            "bottom: -" + size + "px;" +
            "animation-duration: " + duration + "s;" +
            "animation-delay: -" + delay + "s;" +
            "opacity: " + (Math.random() * 0.06 + 0.02) + ";";
        container.appendChild(particle);
    }
};

// ═══════════════════════════════════════════════════════════════
//   MAIN CONTROLLERS  (async/await + try-catch)
// ═══════════════════════════════════════════════════════════════

/**
 * handleSearch — primary search handler.
 * Fetches current weather first, then forecast + AQI in parallel (Promise.all).
 */
WeatherApp.prototype.handleSearch = async function (city) {
    var trimmed = city.trim();

    if (!trimmed) {
        this.showError("Please enter a city name.");
        return;
    }
    if (!/^[a-zA-Z\s\-\.,']+$/.test(trimmed)) {
        this.showError("Invalid input. Please enter a valid city name using letters only.");
        return;
    }

    this.hideError();
    this.showLoader();
    this.currentCity = trimmed;

    try {
        // Step 1: current weather
        var weatherData = await this.fetchWeather(trimmed);
        this.renderWeather(weatherData);
        this.addRecentSearch(weatherData.name);

        // Step 2: forecast + AQI in parallel
        var lat = weatherData.coord.lat;
        var lon = weatherData.coord.lon;
        var results = await Promise.all([
            this.fetchForecast(lat, lon),
            this.fetchAirQuality(lat, lon),
        ]);
        var forecastData = results[0];
        var aqData       = results[1];

        this.renderHourlyForecast(forecastData);
        this.renderForecast(forecastData);
        this.renderAirQuality(aqData);

        // Step 3: auto-refresh
        this.setupAutoRefresh(trimmed);
    } catch (error) {
        this.loader.classList.add("hidden");
        this.welcomeState.classList.remove("hidden");
        this.showError(error.message || "An unexpected error occurred. Please try again.");
        console.error("[SkyFetch] Fetch error:", error);
    }
};

/**
 * handleGeoSearch — geolocation-based search.
 */
WeatherApp.prototype.handleGeoSearch = async function (lat, lon) {
    this.hideError();
    this.showLoader();

    try {
        // Step 1: current weather by coords
        var weatherData = await this.fetchWeatherByCoords(lat, lon);
        this.currentCity    = weatherData.name;
        this.cityInput.value = weatherData.name;
        this.renderWeather(weatherData);
        this.addRecentSearch(weatherData.name);

        // Step 2: forecast + AQI in parallel
        var results = await Promise.all([
            this.fetchForecast(lat, lon),
            this.fetchAirQuality(lat, lon),
        ]);
        var forecastData = results[0];
        var aqData       = results[1];

        this.renderHourlyForecast(forecastData);
        this.renderForecast(forecastData);
        this.renderAirQuality(aqData);

        this.setupAutoRefresh(weatherData.name);
    } catch (error) {
        this.loader.classList.add("hidden");
        this.welcomeState.classList.remove("hidden");
        this.showError(error.message || "Unable to fetch weather for your location. Please try again.");
        console.error("[SkyFetch] Geo fetch error:", error);
    }
};

// ═══════════════════════════════════════════════════════════════
//   AUTO-REFRESH
// ═══════════════════════════════════════════════════════════════

WeatherApp.prototype.setupAutoRefresh = function (city) {
    var self = this;
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = setInterval(function () {
        console.log("[SkyFetch] Auto-refreshing weather for", city);
        self.handleSearch(city);
    }, AUTO_REFRESH_MS);
};

// ═══════════════════════════════════════════════════════════════
//   BOOTSTRAP — create the single application instance
// ═══════════════════════════════════════════════════════════════

var app = new WeatherApp();
