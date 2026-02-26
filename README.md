# 🌤️ SkyFetch Weather Dashboard — Part 2: User Interaction

A real-time, interactive weather dashboard built as part of **FEWD91**. This Part 2 build enhances the Part 1 foundation with robust user input handling, async/await patterns, comprehensive error handling, and a loading indicator.

## 🚀 Features

### Part 2 Enhancements (User Interaction)
- 🔍 **City search input** with search button and **Enter key** support
- ⏳ **Loading indicator** — visible during the **entire** data-fetching process
- ⚠️ **Comprehensive error handling** using `try-catch`:
  - **Empty / invalid input** — user-friendly message when search field is empty or contains invalid characters
  - **Invalid city name (404)** — clear message when the city is not found
  - **Network / API failures** — handles offline state and server errors gracefully
- 🔄 **Async/Await** — all API logic refactored to use `async/await` (no `.then()` chains or callbacks)
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
| Vanilla JavaScript | **Async/Await**, try-catch error handling, Geolocation API, localStorage, DOM manipulation |
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
├── app.js       # Async/await API calls, try-catch error handling, rendering
└── README.md    # This file
```

## 🌐 API Endpoints Used

| Endpoint | Description |
|---|---|
| `GET /weather?q={city}&appid={key}&units=metric` | Current weather by city name |
| `GET /weather?lat={lat}&lon={lon}&appid={key}&units=metric` | Current weather by coordinates |
| `GET /forecast?lat={lat}&lon={lon}&appid={key}&units=metric` | 5-day / 3-hour forecast |
| `GET /air_pollution?lat={lat}&lon={lon}&appid={key}` | Air quality index & pollutants |

## 🎓 Assignment: FEWD91 — Part 2

### Concepts Demonstrated
- ✅ **Async/Await** — all asynchronous operations use `async/await`
- ✅ **Try-Catch Error Handling** — every async function is wrapped in `try-catch`
- ✅ **User Input Validation** — empty input, invalid characters, invalid cities
- ✅ **Loading State** — spinner visible during entire fetch process
- ✅ **User-Friendly Error Messages** — no raw error codes shown to users
- ✅ **DOM Manipulation** — dynamic rendering of weather data
- ✅ **Event Handling** — form submit, button clicks, Enter key support

### Testing Performed
1. ✅ Valid city search (e.g., "London") → weather data displayed
2. ✅ Enter key search → same as button click
3. ✅ Invalid city (e.g., "xyzabc") → "City not found" error message
4. ✅ Empty input → "Please enter a city name" error message
5. ✅ Loading spinner visible during fetch → hidden after data loads
6. ✅ Network failure → "Network error" message displayed
7. ✅ Quick-search chips → data loads correctly
8. ✅ Geolocation → location detected and weather shown
9. ✅ Recent searches → stored and clickable
10. ✅ Temperature unit toggle → all values update
