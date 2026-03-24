export type Language = "ja" | "en";

export const DEFAULT_LANGUAGE: Language = "ja";
export const LANGUAGE_STORAGE_KEY = "exerlog-language";

export function isLanguage(value: string | null | undefined): value is Language {
  return value === "ja" || value === "en";
}

export function readStoredLanguage(): Language {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }
  const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isLanguage(value) ? value : DEFAULT_LANGUAGE;
}

export function resolveInitialLanguage(): Language {
  if (typeof document !== "undefined") {
    const datasetLang = document.documentElement.dataset.language;
    if (isLanguage(datasetLang)) {
      return datasetLang;
    }
  }
  return readStoredLanguage();
}
