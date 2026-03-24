import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";

import { LanguageProvider } from "@/features/i18n/language-provider";
import type { Language } from "@/features/i18n/language";

type RenderWithLanguageOptions = RenderOptions & {
  language?: Language;
};

export function renderWithLanguage(
  ui: ReactElement,
  { language, ...options }: RenderWithLanguageOptions = {},
) {
  if (language) {
    window.localStorage.setItem("exerlog-language", language);
  }

  return render(<LanguageProvider>{ui}</LanguageProvider>, options);
}
