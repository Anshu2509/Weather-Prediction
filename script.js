// ✅ Replace with your OpenWeatherMap API key
const apiKey = "6f60123e2aa9c1c87f359130a05de03f";

// Elements
const cityInput = document.getElementById("cityInput");
const searchButton = document.getElementById("searchButton");
const locationButton = document.getElementById("locationButton");
const themeToggle = document.getElementById("themeToggle");

const loading = document.getElementById("loading");
const errorMessage = document.getElementById("errorMessage");
const errorText = document.getElementById("errorText");

const weatherResult = document.getElementById("weatherResult");
const forecastSection = document.getElementById("forecastSection");
const hourlySection = document.getElementById("hourlySection");
const graphSection = document.getElementById("graphSection");

const forecastGrid = document.getElementById("forecastGrid");
const hourlyScroll = document.getElementById("hourlyScroll");

const locationName = document.getElementById("locationName");
const weatherIcon = document.getElementById("weatherIcon");
const currentTemp = document.getElementById("currentTemp");
const weatherDescription = document.getElementById("weatherDescription");
const minMaxTemp = document.getElementById("minMaxTemp");
const humidity = document.getElementById("humidity");
const windSpeed = document.getElementById("windSpeed");
const feelsLike = document.getElementById("feelsLike");

const aqi = document.getElementById("aqi");
const aqiText = document.getElementById("aqiText");
const sunTimes = document.getElementById("sunTimes");

// Alerts Modal
const alertModal = document.getElementById("alertModal");
const alertText = document.getElementById("alertText");
const closeAlert = document.getElementById("closeAlert");

let tempChartInstance = null;

// Events
searchButton.addEventListener("click", fetchWeatherByCity);
cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") fetchWeatherByCity();
});
locationButton.addEventListener("click", fetchWeatherByLocation);
themeToggle.addEventListener("click", toggleTheme);
closeAlert.addEventListener("click", () => alertModal.classList.add("hidden"));

// ✅ Auto Detect City on Load
window.addEventListener("load", () => {
  fetchWeatherByLocation();
});

// Theme Toggle
function toggleTheme() {
  const html = document.documentElement;
  if (html.classList.contains("dark")) {
    html.classList.remove("dark");
    html.classList.add("light");
    themeToggle.textContent = "☀️";
  } else {
    html.classList.remove("light");
    html.classList.add("dark");
    themeToggle.textContent = "🌙";
  }
}

// UI Helpers
function showLoading() {
  loading.classList.remove("hidden");
  errorMessage.classList.add("hidden");
  weatherResult.classList.add("hidden");
  forecastSection.classList.add("hidden");
  hourlySection.classList.add("hidden");
  graphSection.classList.add("hidden");
}

function hideLoading() {
  loading.classList.add("hidden");
}

function showError(msg) {
  errorText.textContent = msg;
  errorMessage.classList.remove("hidden");
  weatherResult.classList.add("hidden");
  forecastSection.classList.add("hidden");
  hourlySection.classList.add("hidden");
  graphSection.classList.add("hidden");
}

function showAllSections() {
  errorMessage.classList.add("hidden");
  weatherResult.classList.remove("hidden");
  forecastSection.classList.remove("hidden");
  hourlySection.classList.remove("hidden");
  graphSection.classList.remove("hidden");
}

// Fetch Weather by City
async function fetchWeatherByCity() {
  const city = cityInput.value.trim();
  if (!city) return showError("❌ Please enter a city name.");

  showLoading();

  try {
    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (!geoData || geoData.length === 0) throw new Error(`City not found: "${city}"`);

    const { lat, lon, name, state, country } = geoData[0];
    const displayName = [name, state, country].filter(Boolean).join(", ");

    await fetchEverything(lat, lon, displayName);
  } catch (err) {
    showError("⚠ " + err.message);
  } finally {
    hideLoading();
  }
}

// Fetch Weather by Location
function fetchWeatherByLocation() {
  if (!navigator.geolocation) return showError("❌ Geolocation not supported!");

  showLoading();

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        await fetchEverything(lat, lon, "Your Location 📍");
      } catch (err) {
        showError("⚠ Failed to fetch location weather.");
      } finally {
        hideLoading();
      }
    },
    () => {
      hideLoading();
      showError("❌ Location permission denied.");
    }
  );
}

// ✅ Fetch ALL: Weather + Forecast + AQI + Alerts
async function fetchEverything(lat, lon, displayName) {
  // Current Weather
  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
  const weatherRes = await fetch(weatherUrl);
  const weatherData = await weatherRes.json();

  updateCurrentWeatherUI(weatherData, displayName);

  // Forecast (Hourly + 5 Day)
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
  const forecastRes = await fetch(forecastUrl);
  const forecastData = await forecastRes.json();

  update5DayForecast(forecastData);
  updateHourlyForecast(forecastData);
  updateGraph(forecastData);

  // AQI
  await fetchAQI(lat, lon);

  // Alerts (Best effort - only shows if API gives alerts)
  await fetchAlertsIfAvailable(lat, lon);

  showAllSections();
}

// ✅ Current Weather UI
function updateCurrentWeatherUI(data, displayName) {
  locationName.textContent = displayName;

  currentTemp.textContent = `${Math.round(data.main.temp)}°`;
  feelsLike.textContent = `${Math.round(data.main.feels_like)}°`;

  const weather = data.weather[0];
  weatherDescription.textContent = weather.description;

  weatherIcon.innerHTML = `
    <img src="https://openweathermap.org/img/wn/${weather.icon}@4x.png"
         alt="${weather.description}" class="w-full h-full">
  `;

  minMaxTemp.textContent = `${Math.round(data.main.temp_min)}° / ${Math.round(data.main.temp_max)}°`;
  humidity.textContent = `${data.main.humidity}%`;
  windSpeed.textContent = `${(data.wind.speed * 3.6).toFixed(1)} km/h`;

  // Sunrise / Sunset
  const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  sunTimes.textContent = `${sunrise} / ${sunset}`;
}

// ✅ AQI
async function fetchAQI(lat, lon) {
  try {
    const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    const aqiRes = await fetch(aqiUrl);
    const aqiData = await aqiRes.json();

    const value = aqiData.list[0].main.aqi;
    aqi.textContent = value;

    const map = {
      1: "Good ✅",
      2: "Fair 🙂",
      3: "Moderate 😐",
      4: "Poor 😷",
      5: "Very Poor 🚫"
    };

    aqiText.textContent = map[value] || "Unknown";
  } catch {
    aqi.textContent = "--";
    aqiText.textContent = "Not Available";
  }
}

// ✅ Alerts (OneCall - may need subscription in some cases)
async function fetchAlertsIfAvailable(lat, lon) {
  try {
    const oneCallUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const res = await fetch(oneCallUrl);
    const data = await res.json();

    if (data.alerts && data.alerts.length > 0) {
      alertText.textContent = `${data.alerts[0].event}: ${data.alerts[0].description}`;
      alertModal.classList.remove("hidden");
    }
  } catch {
    // If alerts not available, ignore
  }
}

// ✅ 5 Day Forecast
function update5DayForecast(forecastData) {
  forecastGrid.innerHTML = "";
  const daily = forecastData.list.filter((item) => item.dt_txt.includes("12:00:00"));

  daily.slice(0, 5).forEach((day) => {
    const date = new Date(day.dt_txt);
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });

    const icon = day.weather[0].icon;
    const temp = Math.round(day.main.temp);
    const desc = day.weather[0].main;

    const card = document.createElement("div");
    card.className = "forecast-card";

    card.innerHTML = `
      <p class="font-bold text-sm">${dayName}</p>
      <img class="w-14 h-14 mx-auto" src="https://openweathermap.org/img/wn/${icon}@2x.png"/>
      <p class="text-lg font-extrabold">${temp}°</p>
      <p class="text-xs text-gray-300">${desc}</p>
    `;

    forecastGrid.appendChild(card);
  });
}

// ✅ Hourly Forecast (24 Hours)
function updateHourlyForecast(forecastData) {
  hourlyScroll.innerHTML = "";
  const nextHours = forecastData.list.slice(0, 8);

  nextHours.forEach((hour) => {
    const time = new Date(hour.dt_txt).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    const icon = hour.weather[0].icon;
    const temp = Math.round(hour.main.temp);

    const card = document.createElement("div");
    card.className = "hour-card";

    card.innerHTML = `
      <p class="text-xs font-semibold">${time}</p>
      <img class="w-12 h-12 mx-auto" src="https://openweathermap.org/img/wn/${icon}@2x.png"/>
      <p class="text-lg font-bold">${temp}°</p>
    `;

    hourlyScroll.appendChild(card);
  });
}

// ✅ Graph
function updateGraph(forecastData) {
  const labels = forecastData.list.slice(0, 8).map((x) =>
    new Date(x.dt_txt).toLocaleTimeString("en-US", { hour: "numeric" })
  );

  const temps = forecastData.list.slice(0, 8).map((x) => x.main.temp);

  const ctx = document.getElementById("tempChart").getContext("2d");

  if (tempChartInstance) tempChartInstance.destroy();

  tempChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Temperature (°C)",
          data: temps,
          borderWidth: 2,
          tension: 0.4
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true }
      }
    }
  });
}
