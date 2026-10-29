import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { LanguageProvider } from "@/features/i18n/language-provider";
import { ThemeProvider } from "./theme-provider";
import { ThemeSwitcher } from "./components/theme-switcher";

describe("ThemeProvider", () => {
  afterEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  test("adopts the saved theme after mount and lets the user switch back to warm", async () => {
    window.localStorage.setItem("exerlog-theme", "dark");
    document.documentElement.dataset.theme = "dark";

    render(
      <LanguageProvider><ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider></LanguageProvider>,
    );

    const dark = await screen.findByRole("radio", { name: /ダーク|Dark/ });
    await waitFor(() => expect(dark).toBeChecked());
    expect(document.documentElement.dataset.theme).toBe("dark");

    fireEvent.click(screen.getByRole("radio", { name: /ウォーム|Warm/ }));

    await waitFor(() => expect(screen.getByRole("radio", { name: /ウォーム|Warm/ })).toBeChecked());
    expect(document.documentElement.dataset.theme).toBe("warm");
    expect(window.localStorage.getItem("exerlog-theme")).toBe("warm");
  });
});
