"use client";

import { useTranslation } from "@/features/i18n/use-translation";
import type { Language } from "@/features/i18n/language";
import { cva } from "class-variance-authority";

const languageOptionVariants = cva(
  "block cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
  {
    variants: {
      active: {
        true: "bg-background text-foreground shadow-sm",
        false: "text-muted-foreground hover:text-foreground",
      },
    },
  }
);

export function LanguageSwitcher() {
  const { language, messages, setLanguage } = useTranslation();
  const options: Array<{ value: Language; label: string }> = [
    { value: "ja", label: messages.language_ja },
    { value: "en", label: messages.language_en },
  ];

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
  };

  return (
    <fieldset className="inline-flex items-center gap-1 rounded-full bg-muted p-1">
      <legend className="sr-only">{messages.language_label}</legend>
      {options.map((option) => {
        const isActive = language === option.value;

        return (
          <label key={option.value}>
            <input
              checked={isActive}
              className="peer sr-only"
              name="language"
              onChange={() => handleLanguageChange(option.value)}
              type="radio"
              value={option.value}
            />
            <span className={languageOptionVariants({ active: isActive })}>{option.label}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
