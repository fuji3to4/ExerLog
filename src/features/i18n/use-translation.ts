import { useContext } from "react";

import { LanguageContext } from "./language-provider";
import { formatDate, formatIntensity, formatBodyArea, formatPurpose } from "./formatting";

export function useTranslation() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }

  const { language, messages, setLanguage } = context;

  return {
    language,
    messages,
    setLanguage,
    formatDate: (date: Date | string) => formatDate(date, language),
    formatIntensity: (intensity: string) => formatIntensity(intensity, language),
    formatBodyArea: (bodyArea: string) => formatBodyArea(bodyArea, language),
    formatPurpose: (purpose: string) => formatPurpose(purpose, language),
  };
}
