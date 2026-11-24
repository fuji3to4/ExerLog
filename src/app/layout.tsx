import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import "./globals.css";
import { CelebrationProvider } from "@/features/feedback/celebration";
import { LanguageProvider } from "@/features/i18n/language-provider";
import { DbInitProvider } from "@/features/storage/db-init-provider";
import { SyncProvider } from "@/features/sync/SyncProvider";
import { ThemeProvider } from "@/features/settings/theme-provider";

type RootLayoutProps = {
  children: ReactNode;
};

const base = process.env.GITHUB_ACTIONS === "true" ? "/ExerLog" : "/ExerLog";
// Ranade (Indian Type Foundry, ITF Free Font License), self-hosted so the PWA keeps it offline.
// Japanese falls through to the system's Japanese sans (see --font-display in tokens.css).
const ranade = localFont({
  src: [
    { path: "./fonts/ranade-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ranade-500.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-ranade",
  display: "swap",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
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
  themeColor: "#f9f4ee",
};

const THEME_COLORS: Record<string, string> = {
  warm: "#f9f4ee",
  cool: "#f2f5f8",
  dark: "#1a1614",
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja" className={`${ranade.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="antialiased">
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
                  meta.setAttribute("content", ${JSON.stringify(THEME_COLORS)}[theme] || "#f9f4ee");
                }
              })();
            `,
          }}
        />
        <ThemeProvider>
          <LanguageProvider>
            <DbInitProvider>
              <SyncProvider>
                <CelebrationProvider>{children}</CelebrationProvider>
              </SyncProvider>
            </DbInitProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
