/**
 * MÉTÉO CI - Search Component
 */

const SearchComponent = {
    input: null,
    suggestionsContainer: null,

    init() {
        this.input = document.getElementById("search-input");
        if (!this.input) return;
        this.createSuggestionsContainer();
        this.bindEvents();
    },

    createSuggestionsContainer() {
        if (document.getElementById("search-suggestions")) return;
        this.suggestionsContainer = document.createElement("div");
        this.suggestionsContainer.id = "search-suggestions";
        this.suggestionsContainer.className = "absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50 hidden";
        this.input.parentNode.style.position = "relative";
        this.input.parentNode.appendChild(this.suggestionsContainer);
    },

    bindEvents() {
        this.input.addEventListener("input", (e) => this.handleInput(e));
        this.input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                this.performSearch();
            } else if (e.key === "Escape") {
                this.hideSuggestions();
            }
        });

        // Close suggestions on click outside
        document.addEventListener("click", (e) => {
            if (!this.input.contains(e.target) && !this.suggestionsContainer.contains(e.target)) {
                this.hideSuggestions();
            }
        });

        const icon = this.input.parentNode.querySelector(".fa-magnifying-glass");
        if (icon) icon.addEventListener("click", () => this.performSearch());
    },

    handleInput(e) {
        const value = e.target.value.trim().toLowerCase();
        if (value.length < 2) {
            this.hideSuggestions();
            // If empty, show all cards again
            if (value.length === 0) WeatherService.showAllCities();
            return;
        }

        const matches = CITIES.filter(c => c.name.toLowerCase().includes(value));
        this.renderSuggestions(matches);
    },

    renderSuggestions(cities) {
        if (!this.suggestionsContainer) return;

        if (cities.length === 0) {
            // Option to search for new city
            const searchTerm = this.input.value;
            this.suggestionsContainer.innerHTML = `
            <div class="p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm" id="search-new-city">
               <i class="fa-solid fa-plus-circle text-green-500 mr-2"></i> Chercher "${searchTerm}"...
            </div>`;

            document.getElementById("search-new-city").addEventListener("click", () => {
                this.performSearch();
            });
        } else {
            this.suggestionsContainer.innerHTML = cities.map(c =>
                `<div class="p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm border-b border-gray-100 dark:border-gray-700 last:border-0" data-id="${c.id}" data-name="${c.name}">
          <i class="fa-solid fa-location-dot text-blue-500 mr-2"></i>
          <span class="dark:text-gray-200">${c.name}</span>
          ${c.region ? `<span class="text-xs text-gray-500 ml-2">(${c.region})</span>` : ''}
        </div>`
            ).join("");

            this.suggestionsContainer.querySelectorAll("[data-id]").forEach(item => {
                item.addEventListener("click", () => this.selectCity(item.dataset.id, item.dataset.name));
            });
        }
        this.showSuggestions();
    },

    selectCity(cityId, cityName) {
        this.input.value = cityName;
        this.hideSuggestions();
        WeatherService.searchCity(cityName);
    },

    async performSearch() {
        const value = this.input.value.trim();
        this.hideSuggestions();

        if (!value) {
            WeatherService.showAllCities();
            return;
        }

        await WeatherService.searchCity(value);
    },

    showSuggestions() { this.suggestionsContainer?.classList.remove("hidden"); },
    hideSuggestions() { this.suggestionsContainer?.classList.add("hidden"); },
    clearSearch() {
        if (this.input) this.input.value = "";
        WeatherService.showAllCities();
    }
};
