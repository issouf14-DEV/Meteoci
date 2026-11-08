// Applique le thème avant le premier rendu (évite le flash de thème clair).
(() => {
  try {
    const stored = window.localStorage.getItem("meteoTheme");
    const dark =
      stored === "dark" ||
      (stored !== "light" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.classList.add("dark");
  } catch {
    /* stockage indisponible */
  }
})();
