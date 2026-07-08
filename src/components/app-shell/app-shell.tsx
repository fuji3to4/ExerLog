"use client";

import { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { BottomNav } from "./bottom-nav";
import { LanguageSwitcher } from "./language-switcher";
import { SyncIndicator } from "@/features/shell/components/sync-indicator";

type AppShellProps = {
  children: ReactNode;
  currentPath: string;
};

export function AppShell({ children, currentPath }: AppShellProps) {
  return (
    <SidebarProvider>
      {/* PC: Sidebar */}
      <div className="hidden lg:block">
        <AppSidebar currentPath={currentPath} />
      </div>

      <SidebarInset>
        <div className="min-h-dvh bg-background text-foreground">
          {/* Mobile: Header */}
          <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur lg:hidden">
            <div className="mx-auto flex w-full max-w-screen-sm items-center justify-between px-4 py-3">
              <h1 className="text-lg font-semibold tracking-tight">ExerLog</h1>
              <div className="flex items-center gap-1">
                <LanguageSwitcher />
                <SyncIndicator />
              </div>
            </div>
          </header>

          {/* Mobile: Bottom Nav */}
          <div className="lg:hidden">
            <BottomNav currentPath={currentPath} />
          </div>

          {/* Main Content */}
          <main className="mx-auto w-full max-w-screen-sm gap-4 px-4 pb-28 pt-4 lg:max-w-screen-xl lg:px-8 lg:pb-8">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
