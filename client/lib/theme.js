// Theme preference: 'light' | 'dark' | 'system' (default).
// The inline script in app/layout.js applies it before first paint to avoid a flash.
export const THEME_KEY = 'designhub_theme';

export const getStoredTheme = () => {
  try {
    return localStorage.getItem(THEME_KEY) || 'system';
  } catch {
    return 'system';
  }
};

export const resolveTheme = (pref) =>
  pref === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    : pref;

export const applyTheme = (pref) => {
  document.documentElement.dataset.theme = resolveTheme(pref);
  try {
    if (pref === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch {
    /* storage unavailable – theme still applies for this session */
  }
};
