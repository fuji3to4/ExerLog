import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";

import { LanguageProvider } from "@/features/i18n/language-provider";
import { LANGUAGE_STORAGE_KEY, type Language } from "@/features/i18n/language";

type RenderWithLanguageOptions = RenderOptions & {
  initialLanguage?: Language;
};

export function renderWithLanguage(
  ui: ReactElement,
  { initialLanguage, ...options }: RenderWithLanguageOptions = {},
) {
  if (initialLanguage) {
    document.documentElement.dataset.language = initialLanguage;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, initialLanguage);
  } else {
    delete document.documentElement.dataset.language;
    window.localStorage.removeItem(LANGUAGE_STORAGE_KEY);
  }

  return render(<LanguageProvider>{ui}</LanguageProvider>, options);
}
