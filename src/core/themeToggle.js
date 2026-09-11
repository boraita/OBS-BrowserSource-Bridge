/**
 * Light/dark theme toggle for the control panel only — the browser-source
 * overlay is untouched and keeps pulling its look entirely from Settings.
 * Persists the choice in localStorage; defaults to dark (the pre-existing
 * look) so nothing changes for anyone who never touches the toggle.
 */
const THEME_KEY = 'panelTheme';
const ICONS = { dark: '🌙', light: '☀️' };

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const button = document.getElementById('theme-toggle');
  if (button) {
    button.textContent = ICONS[theme];
  }
}

function initThemeToggle() {
  const savedTheme = localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  applyTheme(savedTheme);

  const button = document.getElementById('theme-toggle');
  if (!button) return;

  button.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThemeToggle);
} else {
  initThemeToggle();
}
