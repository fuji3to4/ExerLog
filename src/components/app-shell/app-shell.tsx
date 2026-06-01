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
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-screen-sm items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold tracking-tight">ExerLog</h1>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-screen-sm gap-4 px-4 pb-28 pt-4">{children}</main>
      <BottomNav currentPath={currentPath} />
    </div>
  );
}
