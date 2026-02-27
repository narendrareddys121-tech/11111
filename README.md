# 🌤️ SkyFetch Weather Dashboard — Part 3: Prototypal Inheritance

A real-time, interactive weather dashboard built as part of **FEWD91**. This Part 3 build refactors the Part 2 codebase to use **JavaScript Prototypal Inheritance** — all logic is reorganised into a single `WeatherApp` constructor with every method living on `WeatherApp.prototype`.

## 🚀 Features

### Part 3 Enhancements (Prototypal Inheritance)
- 🏗️ **WeatherApp constructor** — all DOM references and state initialised in one place
- 🔗 **Prototype methods** — every function is a method on `WeatherApp.prototype` (no standalone functions)
- ⚡ **Efficient parallel fetching** — current weather, 5-day forecast, and AQI fetched with `Promise.all`
- 📅 **5-Day Forecast cards** — responsive `forecast-card` rows with high/low temps, visual temperature bar, and precipitation probability

### Part 2 Enhancements (User Interaction)
- 🔍 **City search input** with search button and **Enter key** support
- ⏳ **Loading indicator** — visible during the **entire** data-fetching process
- ⚠️ **Comprehensive error handling** using `try-catch`:
  - **Empty / invalid input** — user-friendly message when search field is empty or contains invalid characters
  - **Invalid city name (404)** — clear message when the city is not found
  - **Network / API failures** — handles offline state and server errors gracefully
- 🔄 **Async/Await** — all API logic uses `async/await` (no `.then()` chains or callbacks)
- 💬 **User-friendly error messages** — every failure scenario shows a clear, helpful message

### Core Weather (from Part 1)
- 🌡️ **Live weather data** — temperature, feels-like, min/max, humidity, wind, pressure, visibility, dew point, cloudiness
- 📍 **Geolocation** — detect your location automatically
- 🧭 **Wind direction** compass display
- ↕️ **°C / °F toggle** — switch units globally

### Forecasts
- ⏰ **Hourly forecast** — next 24 hours (8 intervals)
- 📅 **5-day forecast** — daily high/low with visual temperature bars

### Air Quality
- 🫁 **Air Quality Index (AQI)** — color-coded 1–5 scale
- 🔬 **Pollutant breakdown** — PM2.5, PM10, O₃, NO₂, SO₂, CO

### Smart Features
- 🕐 **Recent searches** — last 5 cities stored in localStorage
- 🔄 **Auto-refresh** — data updates every 10 minutes
- 🎨 **Dynamic themes** — background changes based on weather condition
- 🌧️ **Weather effects** — animated rain drops, snowflakes, or sun rays
- 📱 **Fully responsive** — beautiful on mobile & desktop

## 🛠️ Tech Stack

| Technology | Usage |
|---|---|
| HTML5 | Semantic structure |
| CSS3 | Glassmorphism, animations, responsive grid, weather effects |
| Vanilla JavaScript | **Prototypal Inheritance** (constructor + prototype), Async/Await, Geolocation API, localStorage |
| [OpenWeatherMap API](https://openweathermap.org/api) | Current weather, forecast, air quality |

## ⚙️ Setup & Usage

### 1. Run the App
Open `index.html` directly in your browser, or use a local server:
```bash
# Using VS Code Live Server extension (recommended)
# Right-click index.html → "Open with Live Server"

# Or using Python
python -m http.server 5500
# Then visit http://localhost:5500
```

> The API key is already configured in `app.js`.

## 📁 Project Structure

```
fewd91/
├── index.html   # App structure & layout (all sections)
├── style.css    # Glassmorphism + weather FX + responsive
├── app.js       # WeatherApp constructor + prototype methods
└── README.md    # This file
```

## 🌐 API Endpoints Used

| Endpoint | Description |
|---|---|
| `GET /weather?q={city}&appid={key}&units=metric` | Current weather by city name |
| `GET /weather?lat={lat}&lon={lon}&appid={key}&units=metric` | Current weather by coordinates |
| `GET /forecast?lat={lat}&lon={lon}&appid={key}&units=metric` | 5-day / 3-hour forecast |
| `GET /air_pollution?lat={lat}&lon={lon}&appid={key}` | Air quality index & pollutants |

## 🎓 Assignment: FEWD91 — Part 3

### Concepts Demonstrated
- ✅ **Prototypal Inheritance** — single `WeatherApp` constructor, all methods on `WeatherApp.prototype`
- ✅ **Constructor Pattern** — DOM refs and state encapsulated as instance properties (`this.*`)
- ✅ **Promise.all** — forecast and AQI endpoints fetched in parallel for efficiency
- ✅ **5-Day Forecast Cards** — responsive layout with temperature bars and precipitation probability
- ✅ **Async/Await** — all asynchronous operations use `async/await`
- ✅ **Try-Catch Error Handling** — every async function is wrapped in `try-catch`
- ✅ **User Input Validation** — empty input, invalid characters, invalid cities
- ✅ **Loading State** — spinner visible during entire fetch process
- ✅ **User-Friendly Error Messages** — no raw error codes shown to users

### Testing Performed
1. ✅ Valid city search (e.g., "London") → current weather + 5-day forecast + AQI displayed
2. ✅ Enter key search → same as button click
3. ✅ Invalid city (e.g., "xyzabc") → "City not found" error message
4. ✅ Empty input → "Please enter a city name" error message
5. ✅ Loading spinner visible during fetch → hidden after data loads
6. ✅ Network failure → "Network error" message displayed
7. ✅ Quick-search chips → data loads correctly
8. ✅ Geolocation → location detected and weather shown
9. ✅ Recent searches → stored and clickable
10. ✅ Temperature unit toggle → all values update (including forecast cards)
11. ✅ 5-day forecast cards → show day name, date, icon, high/low temp, temp bar, precipitation %
