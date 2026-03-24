"use client";

import { createContext, useCallback, useEffect, useState, type ReactNode } from "react";

import type { Language } from "./language";
import { DEFAULT_LANGUAGE, isLanguage, LANGUAGE_STORAGE_KEY, readStoredLanguage } from "./language";
import { getMessages, type Messages } from "./messages";

type LanguageContextValue = {
  language: Language;
  messages: Messages;
  setLanguage: (language: Language) => void;
};

export const LanguageContext = createContext<LanguageContextValue | null>(null);

type LanguageProviderProps = {
  children: ReactNode;
};

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() =>
    typeof document !== "undefined" &&
    (document.documentElement.dataset.language === "ja" || document.documentElement.dataset.language === "en")
      ? (document.documentElement.dataset.language as Language)
      : readStoredLanguage(),
  );

  const messages = getMessages(language);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dataset.language = language;
  }, [language]);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, messages, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}
