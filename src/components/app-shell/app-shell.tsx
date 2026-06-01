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
    <div className="app-shell min-h-dvh bg-background text-foreground">
      <header className="app-shell__header sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-screen-sm items-center justify-between px-4 py-3">
          <h1 className="app-shell__brand text-lg font-semibold tracking-tight">ExerLog</h1>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="page-content mx-auto w-full max-w-screen-sm px-4 pb-28 pt-4">{children}</main>
      <BottomNav currentPath={currentPath} />
    </div>
  );
}
