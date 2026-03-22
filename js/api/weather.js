/**
 * ==========================================================================
 * MÉTÉO CI - Weather API Service
 * ==========================================================================
 * Handles all weather data fetching and processing
 */

const WeatherService = {
    cache: new Map(),

    /**
     * Check if API key is valid
     */
    checkApiKey() {
        if (!CONFIG.API_KEY || CONFIG.API_KEY.length < 20) {
            NotificationService.show("Clé API OpenWeatherMap invalide ou manquante !", "error");
            return false;
        }
        return true;
    },

    /**
     * Get weather icon configuration based on condition
     */
    getWeatherConfig(condition) {
        const key = condition.toLowerCase();

        // Check for exact match first
        if (WEATHER_ICONS[key]) {
            return WEATHER_ICONS[key];
        }

        // Fallback based on keywords
        if (key.includes("rain")) return WEATHER_ICONS.rain;
        if (key.includes("cloud")) return WEATHER_ICONS.clouds;
        if (key.includes("clear")) return WEATHER_ICONS.clear;
        if (key.includes("snow")) return WEATHER_ICONS.snow;
        if (key.includes("storm") || key.includes("thunder")) return WEATHER_ICONS.thunderstorm;
        if (key.includes("mist") || key.includes("fog")) return WEATHER_ICONS.mist;

        // Default fallback
        return {
            icon: "fa-cloud-sun",
            color: "text-blue-400",
            border: "border-blue-300"
        };
    },

    /**
     * Get cached data if still valid
     */
    getCached(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
            return cached.data;
        }
        return null;
    },

    /**
     * Set cache data
     */
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    },

    /**
     * Fetch current weather for a city
     */
    async getCurrentWeather(cityName, cityId) {
        if (!this.checkApiKey()) {
            this.showError(cityId, "Clé API manquante");
            return null;
        }

        const cacheKey = `current_${cityId}`;
        const cached = this.getCached(cacheKey);
        if (cached) {
            this.updateDisplay(cityId, cached);
            return cached;
        }

        const url = `${CONFIG.BASE_URL}?q=${encodeURIComponent(cityName)},CI&appid=${CONFIG.API_KEY}&units=metric&lang=fr`;

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(response.status === 404 ? "Ville non trouvée" : "Erreur chargement");
            }

            const data = await response.json();
            this.setCache(cacheKey, data);
            this.updateDisplay(cityId, data);
            return data;

        } catch (error) {
            console.error(`Error fetching weather for ${cityName}:`, error);
            this.showError(cityId, "Erreur");
            return null;
        }
    },

    /**
     * Fetch weather forecast for a city
     */
    async getForecast(cityName, cityId, targetDate) {
        if (!this.checkApiKey()) {
            this.showError(cityId, "Clé API manquante");
            return null;
        }

        const cacheKey = `forecast_${cityId}_${targetDate.toISOString()}`;
        const cached = this.getCached(cacheKey);
        if (cached) {
            this.updateDisplay(cityId, cached);
            return cached;
        }

        const url = `${CONFIG.FORECAST_URL}?q=${encodeURIComponent(cityName)},CI&appid=${CONFIG.API_KEY}&units=metric&lang=fr`;

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error("Erreur prévision");
            }

            const data = await response.json();
            const forecastData = this.findForecastForDate(data, targetDate);

            if (forecastData) {
                this.setCache(cacheKey, forecastData);
                this.updateDisplay(cityId, forecastData);
                return forecastData;
            } else {
                this.showError(cityId, "Indisponible");
                return null;
            }

        } catch (error) {
            console.error(`Error fetching forecast for ${cityName}:`, error);
            this.showError(cityId, "Erreur");
            return null;
        }
    },

    /**
     * Find the closest forecast for a target date
     */
    findForecastForDate(forecastData, targetDate) {
        const targetTimestamp = targetDate.getTime();
        let closestForecast = null;
        let minDifference = Infinity;

        for (const forecast of forecastData.list) {
            const forecastTimestamp = forecast.dt * 1000;
            const diff = Math.abs(forecastTimestamp - targetTimestamp);

            if (diff < minDifference) {
                minDifference = diff;
                closestForecast = forecast;
            }
        }

        return closestForecast;
    },

    /**
     * Load weather data based on selected date/time
     */
    async loadWeatherData(cityId, cityName) {
        const dateInput = document.getElementById(`date-${cityId}`);
        const timeInput = document.getElementById(`time-${cityId}`);

        const date = dateInput?.value;
        const time = timeInput?.value;

        if (!date) {
            return this.getCurrentWeather(cityName, cityId);
        }

        const selectedDate = new Date(`${date}T${time || "00:00"}`);
        const now = new Date();

        if (selectedDate.toDateString() === now.toDateString()) {
            return this.getCurrentWeather(cityName, cityId);
        } else {
            return this.getForecast(cityName, cityId, selectedDate);
        }
    },

    /**
     * Get animation class based on weather condition
     */
    getWeatherAnimation(weatherMain) {
        const key = weatherMain.toLowerCase();
        if (key === "clear") return "weather-icon-sun";
        if (key === "rain" || key === "drizzle") return "weather-icon-rain";
        if (key === "clouds" || key === "mist" || key === "fog" || key === "haze") return "weather-icon-cloud";
        return "animate-float";
    },

    /**
     * Update the display for a city card
     */
    updateDisplay(cityId, weatherData) {
        if (!weatherData || !weatherData.main || !weatherData.weather) return;

        const tempMax = Math.round(weatherData.main.temp_max);
        const tempMin = Math.round(weatherData.main.temp_min);
        const condition = weatherData.weather[0].description;
        const weatherMain = weatherData.weather[0].main;

        const config = this.getWeatherConfig(weatherMain);
        const animClass = this.getWeatherAnimation(weatherMain);

        // Update elements
        const tempMaxEl = document.getElementById(`temp-max-${cityId}`);
        const tempMinEl = document.getElementById(`temp-min-${cityId}`);
        const conditionEl = document.getElementById(`condition-${cityId}`);
        const iconEl = document.getElementById(`icon-${cityId}`);
        const iconWrapper = iconEl?.closest('.city-card__icon-wrapper');

        if (tempMaxEl) {
            tempMaxEl.textContent = `${tempMax}°C`;
            tempMaxEl.classList.remove("animate-pulse");
        }

        if (tempMinEl) {
            tempMinEl.textContent = `${tempMin}°C`;
        }

        if (conditionEl) {
            conditionEl.textContent = condition.charAt(0).toUpperCase() + condition.slice(1);
        }

        if (iconEl) {
            // Icon + color from weather condition + matching animation
            iconEl.className = `city-card__icon fa-solid ${config.icon} ${config.color} ${animClass}`;
        }

        // Update icon wrapper border color to match weather condition
        if (iconWrapper) {
            const classes = iconWrapper.className.split(" ");
            const newClasses = classes.filter(c => !c.startsWith("border-"));
            newClasses.push(config.border);
            iconWrapper.className = newClasses.join(" ");
        }
    },

    /**
     * Show error state for a city card
     */
    showError(cityId, message) {
        const tempMaxEl = document.getElementById(`temp-max-${cityId}`);
        const tempMinEl = document.getElementById(`temp-min-${cityId}`);
        const conditionEl = document.getElementById(`condition-${cityId}`);
        const iconEl = document.getElementById(`icon-${cityId}`);

        if (tempMaxEl) tempMaxEl.textContent = "--°";
        if (tempMinEl) tempMinEl.textContent = "--°";
        if (conditionEl) conditionEl.textContent = message;

        if (iconEl) {
            iconEl.className = "city-card__icon fa-solid fa-exclamation-triangle text-red-500";
        }
    },

    /**
     * Search for a city and display its weather
     */
    async searchCity(searchTerm) {
        if (!searchTerm) return;

        const formattedTerm = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase();

        // 1. Check if the city is already in our LIST (CITIES array)
        const existingCityIndex = CITIES.findIndex(c =>
            c.name.toLowerCase() === searchTerm.toLowerCase().trim()
        );

        if (existingCityIndex !== -1) {
            // City found in our list
            const city = CITIES[existingCityIndex];

            // If we are filtering visibility (showing only one city)
            CITIES.forEach(c => {
                const card = document.getElementById(c.id);
                if (card) {
                    card.style.display = (c.id === city.id) ? "block" : "none";
                }
            });

            // If the card was previously removed or hidden, ensure it's visible
            const card = document.getElementById(city.id);
            if (card) {
                card.scrollIntoView({ behavior: "smooth", block: "center" });
                card.classList.add("animate-glow");
                setTimeout(() => card.classList.remove("animate-glow"), 2000);
            }

        } else {
            // 2. City NOT in our list -> Try to create a dynamic card
            // This will call the API, if valid, add to list, if not, show error
            try {
                await CityCardComponent.createDynamicCard(formattedTerm);
            } catch (e) {
                NotificationService.error(`Ville "${formattedTerm}" non trouvée.`);
            }
        }
    },

    /**
     * Show all cities (reset search filter)
     */
    showAllCities() {
        CITIES.forEach(c => {
            const card = document.getElementById(c.id);
            if (card) {
                card.style.display = "block";
            }
        });
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeatherService;
}
