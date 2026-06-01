"use client";

import { useTranslation } from "@/features/i18n/use-translation";
import type { Language } from "@/features/i18n/language";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const languageButtonVariants = cva(
  "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
  };

  return (
    <div className="language-switcher inline-flex items-center rounded-full bg-muted p-1">
      <button
        type="button"
        className={cn(
          "language-switcher__button",
          languageButtonVariants({ active: language === "ja" }),
          language === "ja" && "language-switcher__button--active"
        )}
        onClick={() => handleLanguageChange("ja")}
        aria-pressed={language === "ja"}
      >
        {messages.language_ja}
      </button>
      <button
        type="button"
        className={cn(
          "language-switcher__button",
          languageButtonVariants({ active: language === "en" }),
          language === "en" && "language-switcher__button--active"
        )}
        onClick={() => handleLanguageChange("en")}
        aria-pressed={language === "en"}
      >
        {messages.language_en}
      </button>
    </div>
  );
}
