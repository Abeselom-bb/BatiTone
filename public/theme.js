// theme.js  – global dark/light toggle
(() => {
  const KEY = "theme";
  const DEFAULT = "dark";

  const saved = localStorage.getItem(KEY) || DEFAULT;
  document.documentElement.setAttribute("data-theme", saved);

  window.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("themeToggle");
    if (!btn) return;

    const setLabel = (theme) => {
      btn.textContent = theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
    };

    setLabel(saved);

    btn.addEventListener("click", () => {
      const current =
        document.documentElement.getAttribute("data-theme") || DEFAULT;
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem(KEY, next);
      setLabel(next);
    });
  });
})();
