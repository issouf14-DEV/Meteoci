(function () {
  try {
    var stored = window.localStorage.getItem("meteoTheme");
    var dark =
      stored === "dark" ||
      (stored !== "light" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {
    /* stockage indisponible */
  }
})();
