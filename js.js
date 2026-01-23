const API_KEY = "29ee6752a880857e35070b42da96aea0";
const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";

const cities = [
  { id: "abidjan", name: "Abidjan" },
  { id: "bouake", name: "Bouaké" },
  { id: "korhogo", name: "Korhogo" },
  { id: "yakro", name: "Yamoussoukro" },
  { id: "man", name: "Man" },
  { id: "daloa", name: "Daloa" },
  { id: "sanpedro", name: "San-Pédro" },
  { id: "ferkessedougou", name: "Ferkessédougou" },
  { id: "gagnoa", name: "Gagnoa" },
  { id: "odienne", name: "Odienné" },
  { id: "bondoukou", name: "Bondoukou" },
  { id: "divo", name: "Divo" },
  { id: "soubre", name: "Soubré" },
  { id: "adzope", name: "Adzopé" },
  { id: "abengourou", name: "Abengourou" },
];

function checkApiKey() {
  if (!API_KEY || API_KEY.length < 20) {
    alert("⚠️ Clé API OpenWeatherMap invalide ou manquante !");
    return false;
  }
  return true;
}

function getWeatherIcon(condition) {
  const iconMap = {
    clear: "fa-sun",
    clouds: "fa-cloud",
    rain: "fa-cloud-rain",
    drizzle: "fa-cloud-showers-heavy",
    thunderstorm: "fa-bolt",
    snow: "fa-snowflake",
    mist: "fa-smog",
    fog: "fa-smog",
  };
  return iconMap[condition.toLowerCase()] || "fa-cloud-sun";
}

function getIconColor(condition) {
  const colorMap = {
    clear: "text-yellow-400",
    clouds: "text-gray-400",
    rain: "text-blue-400",
    drizzle: "text-blue-600",
    thunderstorm: "text-purple-400",
    snow: "text-blue-200",
    mist: "text-gray-500",
    fog: "text-gray-500",
  };
  return colorMap[condition.toLowerCase()] || "text-blue-400";
}

function getCurrentWeather(cityName, cityId) {
  if (!checkApiKey()) {
    showError(cityId, "Clé API manquante");
    return;
  }

  const url = `${BASE_URL}?q=${cityName},CI&appid=${API_KEY}&units=metric&lang=fr`;

  $.ajax({
    url,
    method: "GET",
    success: function (data) {
      updateWeatherDisplay(cityId, data);
    },
    error: function (xhr) {
      const status = xhr.status;
      let message = "Erreur de chargement";

      if (status === 401) message = "Clé API invalide";
      else if (status === 404) message = "Ville non trouvée";
      else if (status === 429) message = "Limite API atteinte";

      showError(cityId, message);
    },
  });
}

function getWeatherForecast(cityName, cityId, targetDate) {
  if (!checkApiKey()) {
    showError(cityId, "Clé API manquante");
    return;
  }

  const url = `${FORECAST_URL}?q=${cityName},CI&appid=${API_KEY}&units=metric&lang=fr`;

  $.ajax({
    url,
    method: "GET",
    success: function (data) {
      const forecastData = findForecastForDate(data, targetDate);
      if (forecastData) {
        updateWeatherDisplay(cityId, forecastData);
      } else {
        showError(cityId, "Prévision indisponible");
      }
    },
    error: function (xhr) {
      let message = "Erreur de prévision";
      if (xhr.status === 401) message = "Clé API invalide";
      else if (xhr.status === 404) message = "Ville non trouvée";

      showError(cityId, message);
    },
  });
}

function findForecastForDate(forecastData, targetDate) {
  const targetTimestamp = new Date(targetDate).getTime();
  let closestForecast = null;
  let minDifference = Infinity;

  forecastData.list.forEach((forecast) => {
    const forecastTimestamp = forecast.dt * 1000;
    const diff = Math.abs(forecastTimestamp - targetTimestamp);
    if (diff < minDifference) {
      minDifference = diff;
      closestForecast = forecast;
    }
  });

  return closestForecast;
}

function updateWeatherDisplay(cityId, weatherData) {
  const tempMax = Math.round(weatherData.main.temp_max);
  const tempMin = Math.round(weatherData.main.temp_min);
  const condition = weatherData.weather[0].description;
  const weatherMain = weatherData.weather[0].main;

  $(`#temp-max-${cityId}`).text(`${tempMax}°C`);
  $(`#temp-min-${cityId}`).text(`${tempMin}°C`);
  $(`#condition-${cityId}`).text(
    condition.charAt(0).toUpperCase() + condition.slice(1)
  );

  const iconClass = getWeatherIcon(weatherMain);
  const iconColor = getIconColor(weatherMain);

  $(`#icon-${cityId}`)
    .removeClass()
    .addClass(`fa-solid ${iconClass} ${iconColor} text-2xl`);
}

function showError(cityId, message) {
  $(`#temp-max-${cityId}`).text("--°");
  $(`#temp-min-${cityId}`).text("--°");
  $(`#condition-${cityId}`).text(message);

  $(`#icon-${cityId}`)
    .removeClass()
    .addClass("fa-solid fa-exclamation-triangle text-red-500 text-2xl");
}

function loadWeatherData(cityId, cityName) {
  const date = $(`#date-${cityId}`).val();
  const time = $(`#time-${cityId}`).val();

  if (!date) {
    getCurrentWeather(cityName, cityId);
    return;
  }

  const selectedDate = new Date(`${date}T${time || "00:00"}`);
  const now = new Date();

  if (selectedDate.toDateString() === now.toDateString()) {
    getCurrentWeather(cityName, cityId);
  } else {
    getWeatherForecast(cityName, cityId, selectedDate);
  }
}

// Fonction pour fermer la modal d'authentification
function closeAuthModal() {
  const currentUser = getCurrentUser();
  if (currentUser && currentUser !== "utilisateur") {
    $("#auth-modal").hide();
    $("#login-form").show();
    $("#register-form").hide();
  }
}

// Fonction pour ouvrir la modal d'authentification
function openAuthModal() {
  $("#auth-modal").show();
}

$(document).ready(function () {
  if (!checkApiKey()) return;

  const today = new Date().toISOString().split("T")[0];
  const currentTime = new Date().toTimeString().substring(0, 5);

  cities.forEach((city, i) => {
    $(`#date-${city.id}`).val(today);
    $(`#time-${city.id}`).val(currentTime);

    setTimeout(() => {
      loadWeatherData(city.id, city.name);
    }, i * 300);

    $(`#date-${city.id}, #time-${city.id}`).on("change", () => {
      loadWeatherData(city.id, city.name);
    });
  });

  setInterval(() => {
    cities.forEach((city, i) => {
      setTimeout(() => {
        loadWeatherData(city.id, city.name);
      }, i * 300);
    });
  }, 600000);

  // Gestion de la fermeture de la modal
$("#close-auth-modal").on("click", function () {
  closeAuthModal();
});

  

  // Fermer la modal en cliquant sur le fond
  $("#auth-modal").on("click", function (e) {
    const currentUser = getCurrentUser();
    if (e.target === this && currentUser && currentUser !== "utilisateur") {
      closeAuthModal();
    }
  });


  // Fermer la modal avec la touche Echap
 $(document).on("keydown", function (e) {
   const currentUser = getCurrentUser();
   if (e.key === "Escape" && currentUser && currentUser !== "utilisateur") {
     closeAuthModal();
   }
 });

});

function searchWeather() {
  let rawInput = $("#search-input").val().trim().toLowerCase();
  if (!rawInput) return;

  const searchTermFormatted = rawInput
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const city = cities.find(
    (c) => c.name.toLowerCase() === searchTermFormatted.toLowerCase()
  );

  if (city) {
    cities.forEach((c) => {
      $(`#${c.id}`).toggle(
        c.name.toLowerCase() === searchTermFormatted.toLowerCase()
      );
    });
  } else {
    const newId = `city-${Date.now()}`;
    const newName = searchTermFormatted;
    cities.push({ id: newId, name: newName });

    const cardHTML = `
        <div id="${newId}" class="bg-white rounded-2xl shadow-lg p-4 text-center border border-gray-200 w-44 transition-transform duration-300 hover:scale-105 hover:shadow-2xl hover:-translate-y-2 hover:border-blue-400">
            <h2 class="text-lg font-semibold mb-2">${newName}</h2>
            <input type="date" id="date-${newId}" class="w-full mb-2 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
            <input type="time" id="time-${newId}" class="w-full mb-2 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
            <div class="w-16 h-16 mx-auto flex items-center justify-center border-4 border-cyan-400 rounded-full mb-2">
                <i id="icon-${newId}" class="fa-solid fa-spinner animate-spin text-cyan-400 text-2xl"></i>
            </div>
            <p id="temp-max-${newId}" class="text-red-500 font-bold">--°</p>
            <p id="temp-min-${newId}" class="text-blue-500 font-semibold">--°</p>
            <p id="condition-${newId}" class="text-gray-600 text-xs mt-1">--</p>
        </div>`;

    $("#cities-container").append(cardHTML);

    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toTimeString().substring(0, 5);
    $(`#date-${newId}`).val(today);
    $(`#time-${newId}`).val(now);

    loadWeatherData(newId, newName);

    $(`#date-${newId}, #time-${newId}`).on("change", () => {
      loadWeatherData(newId, newName);
    });
  }
}

$(document).ready(function () {
  // Détection de la touche "Entrée" sur le champ de recherche
  $("#search-input").on("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      searchWeather();
    }
  });
});

$("#toggle-dark").on("click", function () {
  $("html").toggleClass("dark");
});

function typeWordsWithCursor(words, elementId) {
  const element = document.getElementById(elementId);
  let wordIndex = 0;
  let charIndex = 0;
  let isDeleting = false;

  function type() {
    const word = words[wordIndex];
    const displayText = word.substring(0, charIndex);
    element.innerHTML = `${displayText}<span class="blinking-cursor">|</span>`;

    if (!isDeleting && charIndex < word.length) {
      charIndex++;
      setTimeout(type, 100);
    } else if (isDeleting && charIndex > 0) {
      charIndex--;
      setTimeout(type, 60);
    } else {
      if (!isDeleting) {
        isDeleting = true;
        setTimeout(type, 1000);
      } else {
        isDeleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        setTimeout(type, 300);
      }
    }
  }
  type();
}
// Ouvrir modal
$("#user").on("click", function () {
  $("#auth-modal").removeClass("hidden");
  $("#login-form").show();
  $("#register-form").hide();
});

// Fermer modal
$("#close-auth-modal").on("click", function () {
  $("#auth-modal").addClass("hidden");
});
// Afficher formulaire inscription
$("#show-register").on("click", function (e) {
  e.preventDefault();
  $("#login-form").hide();
  $("#register-form").show();
});

// Afficher formulaire connexion
$("#show-login").on("click", function (e) {
  e.preventDefault();
  $("#register-form").hide();
  $("#login-form").show();
});

// Fonction pour obtenir le nom d'utilisateur actuel
function getCurrentUser() {
  return window.localStorage?.getItem("meteoUser") || "utilisateur";
}

function getCurrentUserFullname() {
  const username = getCurrentUser();
  return window.localStorage?.getItem(`fullname_${username}`) || username;
}

function getDynamicWords() {
  const username = getCurrentUser();
  return [
    `Bienvenue ${username} sur Météo ci`,
    `Consultez la météo de votre ville ! `  
  ];
}


function updateDynamicTitle() {
  const dynamicWords = getDynamicWords();
  typeWordsWithCursor(dynamicWords, "dynamic-title");
}

$(document).ready(function () {
  // Animation initiale
  updateDynamicTitle();

  const currentUser = getCurrentUser();
  //const currentFullname = getCurrentUserFullname();


  if (currentUser && currentUser !== "utilisateur") {
    const logoutBtn = $("<button>")
      .text("Déconnexion")
      .addClass("text-sm text-indigo-500 ml-4 hover:underline hover:text-indigo-600 transition-colors duration-200 cursor-pointer font-medium")
      .on("click", () => {
        window.localStorage.removeItem("meteoUser");
        location.reload();
      });
    $("#user").after(logoutBtn);
    $("#auth-modal").hide();
  }

  // Affichage des formulaires
  $("#show-register").on("click", function (e) {
    e.preventDefault();
    $("#login-form").hide();
    $("#register-form").show();
  });

  $("#show-login").on("click", function (e) {
    e.preventDefault();
    $("#register-form").hide();
    $("#login-form").show();
  });

  // Formulaire d'inscription
  $("#register-form").on("submit", function (e) {
    e.preventDefault();

    const fullname = $("#register-fullname").val().trim();
    const username = $("#register-username").val().trim();
    const password = $("#register-password").val().trim();
    const confirmPassword = $("#register-confirm-password").val().trim();

    if (!fullname || !username || !password || !confirmPassword) {
      alert("Tous les champs sont requis !");
      return;
    }

    if (password !== confirmPassword) {
      alert("Les mots de passe ne correspondent pas !");
      return;
    }

    if (password.length < 4) {
      alert("Le mot de passe doit contenir au moins 4 caractères !");
      return;
    }

    if (window.localStorage.getItem(`user_${username}`)) {
      alert("Ce nom d'utilisateur est déjà utilisé !");
      return;
    }

    // Sauvegarde
    window.localStorage.setItem(`user_${username}`, password);
    window.localStorage.setItem(`fullname_${username}`, fullname);

    alert("Compte créé avec succès ! Vous pouvez maintenant vous connecter.");
    $("#register-form")[0].reset();
    $("#register-form").hide();
    $("#login-form").show();
  });

  // Formulaire de connexion
  $("#login-form").on("submit", function (e) {
    e.preventDefault();

    const username = $("#login-username").val().trim();
    const password = $("#login-password").val().trim();

    if (!username || !password) {
      alert("Tous les champs sont requis !");
      return;
    }

    const storedPassword = window.localStorage.getItem(`user_${username}`);

    if (storedPassword === password) {
      window.localStorage.setItem("meteoUser", username);
      updateDynamicTitle();
      location.reload();
    } else {
      alert("Identifiants incorrects !");
    }
  });

  // Fermeture du modal
  $("#close-auth-modal").on("click", function () {
    $("#auth-modal").hide();
  });
});


