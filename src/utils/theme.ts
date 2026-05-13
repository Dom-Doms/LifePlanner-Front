export type ThemePreference = 'light' | 'dark' | 'system';

const themeKey = 'lifeplanner.theme';
const themeOptions: ThemePreference[] = ['system', 'light', 'dark'];

const isThemePreference = (value: string | null): value is ThemePreference =>
  value !== null && themeOptions.includes(value as ThemePreference);

export const getStoredThemePreference = (): ThemePreference => {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(themeKey);
  return isThemePreference(stored) ? stored : 'system';
};

export const resolveTheme = (preference: ThemePreference) => {
  if (preference !== 'system') return preference;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const applyThemePreference = (preference: ThemePreference) => {
  const resolvedTheme = resolveTheme(preference);
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.themePreference = preference;
};

export const setThemePreference = (preference: ThemePreference) => {
  window.localStorage.setItem(themeKey, preference);
  applyThemePreference(preference);
};

export const initTheme = () => {
  const preference = getStoredThemePreference();
  applyThemePreference(preference);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStoredThemePreference() === 'system') applyThemePreference('system');
  });
};
