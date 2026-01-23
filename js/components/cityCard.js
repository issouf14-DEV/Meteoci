/**
 * ==========================================================================
 * MÉTÉO CI - City Card Component
 * ==========================================================================
 * Handles creation and management of city weather cards
 */

const CityCardComponent = {
    /**
     * Generate HTML template for a city card
     */
    getTemplate(cityId, cityName) {
        return `
      <div id="${cityId}" class="city-card animate-fade-in-up">
        <h2 class="city-card__name">${cityName}</h2>
        <input type="date" id="date-${cityId}" 
          class="city-card__input" 
          aria-label="Sélectionner la date pour ${cityName}">
        <input type="time" id="time-${cityId}" 
          class="city-card__input" 
          aria-label="Sélectionner l'heure pour ${cityName}">
        <div class="city-card__icon-wrapper border-yellow-300">
          <i id="icon-${cityId}" class="city-card__icon fa-solid fa-spinner animate-spin text-yellow-400"></i>
        </div>
        <p id="temp-max-${cityId}" class="city-card__temp-max animate-pulse">--°</p>
        <p id="temp-min-${cityId}" class="city-card__temp-min">--°</p>
        <p id="condition-${cityId}" class="city-card__condition">Chargement...</p>
      </div>
    `;
    },

    /**
     * Create all city cards from the CITIES configuration
     */
    createAllCards() {
        const container = document.getElementById("cities-container");
        if (!container) return;

        // Clear existing cards
        container.innerHTML = "";

        // Create cards for all cities
        CITIES.forEach((city, index) => {
            const cardHTML = this.getTemplate(city.id, city.name);
            container.insertAdjacentHTML("beforeend", cardHTML);

            // Add stagger animation delay
            const card = document.getElementById(city.id);
            if (card) {
                card.style.animationDelay = `${index * 0.05}s`;
            }
        });

        // Initialize date/time inputs and bind events
        this.initializeAllCards();
    },

    /**
     * Initialize all cards with current date/time and event listeners
     */
    initializeAllCards() {
        const today = new Date().toISOString().split("T")[0];
        const currentTime = new Date().toTimeString().substring(0, 5);

        CITIES.forEach((city, index) => {
            const dateInput = document.getElementById(`date-${city.id}`);
            const timeInput = document.getElementById(`time-${city.id}`);

            if (dateInput) dateInput.value = today;
            if (timeInput) timeInput.value = currentTime;

            // Load weather with staggered delay
            setTimeout(() => {
                WeatherService.loadWeatherData(city.id, city.name);
            }, index * CONFIG.REQUEST_DELAY);

            // Bind change events
            this.bindCardEvents(city.id, city.name);
        });
    },

    /**
     * Bind event listeners to a card
     */
    bindCardEvents(cityId, cityName) {
        const dateInput = document.getElementById(`date-${cityId}`);
        const timeInput = document.getElementById(`time-${cityId}`);

        const handleChange = () => {
            WeatherService.loadWeatherData(cityId, cityName);
        };

        if (dateInput) {
            dateInput.addEventListener("change", handleChange);
        }

        if (timeInput) {
            timeInput.addEventListener("change", handleChange);
        }
    },

    /**
     * Create a dynamic card for a searched city
     */
    async createDynamicCard(cityName) {
        const container = document.getElementById("cities-container");
        if (!container) return;

        const newId = `city-${Date.now()}`;
        const cardHTML = this.getTemplate(newId, cityName);

        // Add the new city to the CITIES array
        CITIES.push({ id: newId, name: cityName, region: "Autre" });

        // Insert at the beginning
        container.insertAdjacentHTML("afterbegin", cardHTML);

        // Initialize the new card
        const today = new Date().toISOString().split("T")[0];
        const currentTime = new Date().toTimeString().substring(0, 5);

        const dateInput = document.getElementById(`date-${newId}`);
        const timeInput = document.getElementById(`time-${newId}`);

        if (dateInput) dateInput.value = today;
        if (timeInput) timeInput.value = currentTime;

        // Bind events
        this.bindCardEvents(newId, cityName);

        // Load weather
        const weatherData = await WeatherService.loadWeatherData(newId, cityName);

        if (!weatherData) {
            // If failed to load (e.g. city not found), remove the card
            container.removeChild(document.getElementById(newId));
            // Remove from CITIES array
            CITIES.pop();
            throw new Error("Météo introuvable");
        }

        // Scroll to the new card
        const card = document.getElementById(newId);
        if (card) {
            card.scrollIntoView({ behavior: "smooth", block: "center" });
            card.classList.add("animate-glow");
            setTimeout(() => card.classList.remove("animate-glow"), 2000);
        }

        // Show success notification
        NotificationService.success(`Ville "${cityName}" ajoutée !`);

        return newId;
    },

    /**
     * Remove a city card
     */
    removeCard(cityId) {
        const card = document.getElementById(cityId);
        if (!card) return;

        card.classList.add("animate-fade-out");
        card.style.animation = "fadeIn 0.3s ease-in reverse forwards";

        setTimeout(() => {
            card.remove();
            // Remove from CITIES array
            const index = CITIES.findIndex(c => c.id === cityId);
            if (index > -1) {
                CITIES.splice(index, 1);
            }
        }, 300);
    },

    /**
     * Refresh all cards
     */
    refreshAllCards() {
        CITIES.forEach((city, index) => {
            setTimeout(() => {
                WeatherService.loadWeatherData(city.id, city.name);
            }, index * CONFIG.REQUEST_DELAY);
        });

        NotificationService.info("Mise à jour des données météo...");
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CityCardComponent;
}
