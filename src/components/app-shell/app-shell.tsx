"use client";

import type { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";
import { LanguageSwitcher } from "./language-switcher";

type AppShellProps = {
  children: ReactNode;
  currentPath: string;
};

export function AppShell({ children, currentPath }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <h1 className="app-shell__brand">ExerLog</h1>
        <LanguageSwitcher />
      </header>
      <main className="page-content">{children}</main>
      <BottomNav currentPath={currentPath} />
    </div>
  );
}
