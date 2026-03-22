/**
 * ==========================================================================
 * MÉTÉO CI - Main Application Entry Point
 * ==========================================================================
 * Orchestrates all modules and initializes the application
 */

const App = {
    /**
     * Initialize the application
     */
    init() {
        console.log("🌤️ Météo CI - Initializing...");

        // Show loader
        this.showLoader();

        // Initialize all modules
        this.initModules();

        // Setup auto-refresh
        this.setupAutoRefresh();

        // Hide loader after initialization
        setTimeout(() => this.hideLoader(), 1000);

        console.log("✅ Météo CI - Ready!");
    },

    /**
     * Initialize all application modules
     */
    initModules() {
        // Theme must be initialized first for proper styling
        ThemeManager.init();

        // Initialize notification service
        NotificationService.init();

        // Initialize authentication
        AuthModal.init();

        // Initialize search component
        SearchComponent.init();

        // Initialize newsletter
        NewsletterComponent.init();

        // Create city cards and load weather data
        CityCardComponent.createAllCards();

        // Initialize animations
        AnimationService.init();

        // Add keyboard shortcuts
        this.bindKeyboardShortcuts();
    },

    /**
     * Setup auto-refresh for weather data
     */
    setupAutoRefresh() {
        setInterval(() => {
            console.log("🔄 Auto-refreshing weather data...");
            CityCardComponent.refreshAllCards();
        }, CONFIG.REFRESH_INTERVAL);
    },

    /**
     * Bind keyboard shortcuts
     */
    bindKeyboardShortcuts() {
        document.addEventListener("keydown", (e) => {
            // Ctrl/Cmd + K for search focus
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault();
                document.getElementById("search-input")?.focus();
            }

            // Ctrl/Cmd + D for dark mode toggle
            if ((e.ctrlKey || e.metaKey) && e.key === "d") {
                e.preventDefault();
                ThemeManager.toggle();
            }

            // Ctrl/Cmd + R for refresh (with Shift)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "R") {
                e.preventDefault();
                CityCardComponent.refreshAllCards();
            }
        });
    },

    /**
     * Show loading screen
     */
    showLoader() {
        let loader = document.getElementById("app-loader");
        if (!loader) {
            loader = document.createElement("div");
            loader.id = "app-loader";
            loader.className = "loader";
            loader.innerHTML = `
        <div class="loader__spinner"></div>
        <p class="loader__text">Chargement de Météo CI...</p>
      `;
            document.body.appendChild(loader);
        }
        loader.classList.remove("hidden");
    },

    /**
     * Hide loading screen
     */
    hideLoader() {
        const loader = document.getElementById("app-loader");
        if (loader) {
            loader.classList.add("hidden");
            setTimeout(() => loader.remove(), 500);
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    App.init();
});

// Also support jQuery ready if available
if (typeof $ !== "undefined") {
    $(document).ready(() => {
        // jQuery-specific initializations if needed
    });
}

// Global search function for onclick handlers
function searchWeather() {
    SearchComponent.performSearch();
}
