/**
 * ==========================================================================
 * MÉTÉO CI - Configuration
 * ==========================================================================
 * Centralized configuration and constants
 */

// WARNING: In production, move API key to environment variables or backend
const CONFIG = {
    // API Configuration
    // NOTE: In a real environment, use process.env.API_KEY or window.ENV.API_KEY
    // The .env file created is for development/build reference.
    API_KEY: "29ee6752a880857e35070b42da96aea0",
    BASE_URL: "https://api.openweathermap.org/data/2.5/weather",
    FORECAST_URL: "https://api.openweathermap.org/data/2.5/forecast",

    // App Settings
    REFRESH_INTERVAL: 600000, // 10 minutes in milliseconds
    REQUEST_DELAY: 300, // Delay between API requests to avoid rate limiting
    CACHE_DURATION: 300000, // 5 minutes cache duration

    // Storage Keys
    STORAGE_KEYS: {
        USER: "meteoUser",
        THEME: "meteoTheme",
        USER_PREFIX: "user_",
        FULLNAME_PREFIX: "fullname_"
    },

    // Animation Delays
    ANIMATION: {
        TYPING_SPEED: 100,
        DELETE_SPEED: 60,
        PAUSE_DURATION: 1000,
        WORD_DELAY: 300
    }
};

// Ivorian Cities Configuration
const CITIES = [
    { id: "abidjan", name: "Abidjan", region: "Sud" },
    { id: "bouake", name: "Bouaké", region: "Centre" },
    { id: "korhogo", name: "Korhogo", region: "Nord" },
    { id: "yakro", name: "Yamoussoukro", region: "Centre" },
    { id: "man", name: "Man", region: "Ouest" },
    { id: "daloa", name: "Daloa", region: "Centre-Ouest" },
    { id: "sanpedro", name: "San-Pédro", region: "Sud-Ouest" },
    { id: "ferkessedougou", name: "Ferkessédougou", region: "Nord" },
    { id: "gagnoa", name: "Gagnoa", region: "Centre-Ouest" },
    { id: "odienne", name: "Odienné", region: "Nord-Ouest" },
    { id: "bondoukou", name: "Bondoukou", region: "Est" },
    { id: "divo", name: "Divo", region: "Sud" },
    { id: "soubre", name: "Soubré", region: "Sud-Ouest" },
    { id: "adzope", name: "Adzopé", region: "Sud-Est" },
    { id: "abengourou", name: "Abengourou", region: "Est" }
];

// Weather Icon Mapping (Using standard Font Awesome Free icons)
const WEATHER_ICONS = {
    clear: { icon: "fa-sun", color: "text-yellow-400", border: "border-yellow-300" },
    clouds: { icon: "fa-cloud", color: "text-gray-400", border: "border-gray-400" },
    rain: { icon: "fa-cloud-rain", color: "text-blue-400", border: "border-blue-400" },
    drizzle: { icon: "fa-cloud-showers-heavy", color: "text-blue-500", border: "border-blue-400" },
    thunderstorm: { icon: "fa-bolt", color: "text-purple-500", border: "border-purple-400" },
    snow: { icon: "fa-snowflake", color: "text-cyan-200", border: "border-cyan-200" },
    mist: { icon: "fa-smog", color: "text-gray-400", border: "border-gray-300" },
    fog: { icon: "fa-smog", color: "text-gray-400", border: "border-gray-300" },
    haze: { icon: "fa-smog", color: "text-orange-300", border: "border-orange-200" },
    dust: { icon: "fa-wind", color: "text-yellow-600", border: "border-yellow-500" },
    smoke: { icon: "fa-smog", color: "text-gray-500", border: "border-gray-400" },
    sand: { icon: "fa-wind", color: "text-yellow-600", border: "border-yellow-500" },
    ash: { icon: "fa-smog", color: "text-gray-600", border: "border-gray-500" },
    squall: { icon: "fa-wind", color: "text-blue-300", border: "border-blue-300" },
    tornado: { icon: "fa-tornado", color: "text-red-500", border: "border-red-500" }
};

// Dynamic Welcome Messages
const WELCOME_MESSAGES = {
    getMessages: (username) => [
        `Bienvenue ${username} sur Météo CI`,
        `Consultez la météo de votre ville !`,
        `Prévisions en temps réel 🌤️`
    ],
    defaultMessages: [
        "Bienvenue sur Météo CI",
        "La météo de Côte d'Ivoire",
        "Connectez-vous pour personnaliser"
    ]
};

// Export for module usage (if using ES6 modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, CITIES, WEATHER_ICONS, WELCOME_MESSAGES };
}
