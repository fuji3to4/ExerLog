import type { Metadata, Viewport } from "next";
import { Sofia_Sans } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { LanguageProvider } from "@/features/i18n/language-provider";
import { DbInitProvider } from "@/features/storage/db-init-provider";
import { SyncProvider } from "@/features/sync/SyncProvider";
import { ThemeProvider } from "@/features/settings/theme-provider";

type RootLayoutProps = {
  children: ReactNode;
};

const base = process.env.GITHUB_ACTIONS === "true" ? "/ExerLog" : "";
const sofiaSans = Sofia_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "Exercise Log",
  title: {
    default: "Exercise Log",
    template: "%s | Exercise Log",
  },
  description: "A local-first exercise logging app with guided recommendations, a library, and history review.",
  manifest: `${base}/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Exercise Log",
  },
  icons: {
    icon: [
      { url: `${base}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
      { url: `${base}/icons/icon-512.png`, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: `${base}/icons/icon-192.png`, sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f3f0ee",
};

const THEME_COLORS: Record<string, string> = {
  warm: "#f3f0ee",
  cool: "#eef3f7",
  dark: "#161b22",
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={`${sofiaSans.variable} antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var langValue = localStorage.getItem("exerlog-language");
                var language = langValue === "en" ? "en" : "ja";
                document.documentElement.lang = language;
                document.documentElement.dataset.language = language;

                var themeValue = localStorage.getItem("exerlog-theme");
                var theme = themeValue === "cool" || themeValue === "dark" ? themeValue : "warm";
                document.documentElement.dataset.theme = theme;
                var meta = document.querySelector('meta[name="theme-color"]');
                if (meta) {
                  meta.setAttribute("content", ${JSON.stringify(THEME_COLORS)}[theme] || "#f3f0ee");
                }
              })();
            `,
          }}
        />
        <ThemeProvider>
          <LanguageProvider>
            <DbInitProvider>
              <SyncProvider>{children}</SyncProvider>
            </DbInitProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
