"use client";

import { useTranslation } from "@/features/i18n/use-translation";
import type { Language } from "@/features/i18n/language";

export function LanguageSwitcher() {
  const { language, messages, setLanguage } = useTranslation();

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
  };

  return (
    <div className="language-switcher">
      <button
        type="button"
        className={`language-switcher__button ${language === "ja" ? "language-switcher__button--active" : ""}`}
        onClick={() => handleLanguageChange("ja")}
        aria-pressed={language === "ja"}
      >
        {messages.language_ja}
      </button>
      <button
        type="button"
        className={`language-switcher__button ${language === "en" ? "language-switcher__button--active" : ""}`}
        onClick={() => handleLanguageChange("en")}
        aria-pressed={language === "en"}
      >
        {messages.language_en}
      </button>
    </div>
  );
}
