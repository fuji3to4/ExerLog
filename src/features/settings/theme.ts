export type Theme = "warm" | "cool" | "dark";

export const DEFAULT_THEME: Theme = "warm";
export const THEME_STORAGE_KEY = "exerlog-theme";

export const THEME_ORDER: Theme[] = ["warm", "cool", "dark"];

export function isTheme(value: string | null | undefined): value is Theme {
  return value === "warm" || value === "cool" || value === "dark";
}

export function readStoredTheme(): Theme {
  if (typeof window === "undefined") {
    return DEFAULT_THEME;
  }
  const value = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isTheme(value) ? value : DEFAULT_THEME;
}

export function resolveInitialTheme(): Theme {
  if (typeof document !== "undefined") {
    const datasetTheme = document.documentElement.dataset.theme;
    if (isTheme(datasetTheme)) {
      return datasetTheme;
    }
  }
  return readStoredTheme();
}
