"use client";

import { useContext } from "react";
import { cva } from "class-variance-authority";

import { ThemeContext } from "@/features/settings/theme-provider";
import type { Theme } from "@/features/settings/theme";
import { THEME_ORDER } from "@/features/settings/theme";
import { useTranslation } from "@/features/i18n/use-translation";

const themeOptionVariants = cva(
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

export function ThemeSwitcher() {
  const context = useContext(ThemeContext);
  const { t } = useTranslation();

  if (!context) {
    throw new Error("ThemeSwitcher must be used within a ThemeProvider");
  }

  const { theme, setTheme } = context;

  const labels: Record<Theme, string> = {
    warm: t("theme_warm"),
    cool: t("theme_cool"),
    dark: t("theme_dark"),
  };

  const options = THEME_ORDER.map((value) => ({ value, label: labels[value] }));

  return (
    <fieldset className="inline-flex items-center gap-1 rounded-full bg-muted p-1">
      <legend className="sr-only">{t("settings_theme_section_heading")}</legend>
      {options.map((option) => {
        const isActive = theme === option.value;

        return (
          <label key={option.value}>
            <input
              checked={isActive}
              className="peer sr-only"
              name="theme"
              onChange={() => setTheme(option.value)}
              type="radio"
              value={option.value}
            />
            <span className={themeOptionVariants({ active: isActive })}>{option.label}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
