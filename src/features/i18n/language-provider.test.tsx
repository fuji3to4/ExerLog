import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "./language-provider";
import { useTranslation } from "./use-translation";

function Probe() {
  const { language } = useTranslation();
  return <span>{language}</span>;
}

test("defaults to Japanese when no persisted value exists", () => {
  window.localStorage.removeItem("exerlog-language");
  render(
    <LanguageProvider>
      <Probe />
    </LanguageProvider>,
  );
  expect(screen.getByText("ja")).toBeInTheDocument();
});

test("uses persisted English and updates document lang", () => {
  window.localStorage.setItem("exerlog-language", "en");
  render(
    <LanguageProvider>
      <Probe />
    </LanguageProvider>,
  );
  expect(screen.getByText("en")).toBeInTheDocument();
  expect(document.documentElement.lang).toBe("en");
});
