/**
 * ==========================================================================
 * MÉTÉO CI - Theme Manager
 * ==========================================================================
 * Handles dark/light theme toggling and persistence
 */

const ThemeManager = {
    /**
     * Initialize theme based on saved preference or system preference
     */
    init() {
        const savedTheme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME);
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

        if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
            this.enableDarkMode(false);
        } else {
            this.enableLightMode(false);
        }

        this.bindEvents();
        this.updateIcon();
    },

    /**
     * Bind theme toggle events
     */
    bindEvents() {
        const toggleBtn = document.getElementById("lune");
        const themeToggle = document.getElementById("theme-toggle");

        // Handle both potential toggle buttons
        [toggleBtn, themeToggle].forEach(btn => {
            if (btn) {
                btn.addEventListener("click", (e) => {
                    e.preventDefault();
                    this.toggle();
                });
            }
        });

        // Listen for system theme changes
        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
            if (!localStorage.getItem(CONFIG.STORAGE_KEYS.THEME)) {
                if (e.matches) {
                    this.enableDarkMode();
                } else {
                    this.enableLightMode();
                }
            }
        });
    },

    /**
     * Toggle between dark and light mode
     */
    toggle() {
        if (document.documentElement.classList.contains("dark")) {
            this.enableLightMode();
        } else {
            this.enableDarkMode();
        }
    },

    /**
     * Enable dark mode
     */
    enableDarkMode(save = true) {
        document.documentElement.classList.add("dark");
        document.body.classList.add("dark");

        if (save) {
            localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, "dark");
        }

        this.updateIcon();
        this.updateMetaThemeColor("#0f172a");
    },

    /**
     * Enable light mode
     */
    enableLightMode(save = true) {
        document.documentElement.classList.remove("dark");
        document.body.classList.remove("dark");

        if (save) {
            localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, "light");
        }

        this.updateIcon();
        this.updateMetaThemeColor("#1e40af");
    },

    /**
     * Update the theme toggle icon
     */
    updateIcon() {
        const toggleBtn = document.getElementById("lune");
        if (!toggleBtn) return;

        const isDark = document.documentElement.classList.contains("dark");

        // Remove existing icon classes
        toggleBtn.classList.remove("fa-moon", "fa-sun");

        // Add appropriate icon
        if (isDark) {
            toggleBtn.classList.add("fa-sun");
            toggleBtn.classList.remove("text-slate-300");
            toggleBtn.classList.add("text-yellow-400");
        } else {
            toggleBtn.classList.add("fa-moon");
            toggleBtn.classList.remove("text-yellow-400");
            toggleBtn.classList.add("text-slate-300");
        }
    },

    /**
     * Update the meta theme-color for mobile browsers
     */
    updateMetaThemeColor(color) {
        let metaTheme = document.querySelector('meta[name="theme-color"]');

        if (!metaTheme) {
            metaTheme = document.createElement("meta");
            metaTheme.name = "theme-color";
            document.head.appendChild(metaTheme);
        }

        metaTheme.content = color;
    },

    /**
     * Check if currently in dark mode
     */
    isDarkMode() {
        return document.documentElement.classList.contains("dark");
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}
