"use client";

import { useId } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import type { Language } from "@/features/i18n/language";
import { cva } from "class-variance-authority";

const languageOptionVariants = cva(
  "block cursor-pointer rounded-full px-3 py-2 text-xs font-semibold transition-colors",
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
  // The sidebar and the mobile header each render a switcher; separate names keep their radios apart.
  const groupName = `language-${useId()}`;
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
          <label key={option.value} className="rounded-full has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background">
            <input
              checked={isActive}
              className="peer sr-only"
              name={groupName}
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
