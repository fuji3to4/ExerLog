export type Language = "ja" | "en";

export const DEFAULT_LANGUAGE: Language = "ja";
export const LANGUAGE_STORAGE_KEY = "exerlog-language";

export function isLanguage(value: string | null): value is Language {
  return value === "ja" || value === "en";
}

export function readStoredLanguage(): Language {
  const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isLanguage(value) ? value : DEFAULT_LANGUAGE;
}
