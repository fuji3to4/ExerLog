import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { LanguageProvider } from "@/features/i18n/language-provider";
import { DbInitProvider } from "@/features/storage/db-init-provider";

type RootLayoutProps = {
  children: ReactNode;
};

const base = process.env.GITHUB_ACTIONS === "true" ? "/ExerLog" : "";

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
  themeColor: "#14213d",
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var value = localStorage.getItem("exerlog-language");
                var language = value === "en" ? "en" : "ja";
                document.documentElement.lang = language;
                document.documentElement.dataset.language = language;
              })();
            `,
          }}
        />
        <LanguageProvider>
          <DbInitProvider>{children}</DbInitProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
