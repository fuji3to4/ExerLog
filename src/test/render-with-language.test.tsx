import { screen } from "@testing-library/react";

import { useTranslation } from "@/features/i18n/use-translation";

import { renderWithLanguage } from "./render-with-language";

function Probe() {
  const { language } = useTranslation();
  return <span>{language}</span>;
}

test("seeds the initial language through document state and storage", () => {
  renderWithLanguage(<Probe />, { initialLanguage: "en" });

  expect(screen.getByText("en")).toBeInTheDocument();
  expect(document.documentElement.dataset.language).toBe("en");
});
