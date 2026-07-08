"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { Home, BookOpen, LineChart, Heart, Settings, LogIn, LogOut, Languages } from "lucide-react";
import { LanguageSwitcher } from "./language-switcher";
import { useSync } from "@/features/sync/SyncProvider";
import { useTranslation } from "@/features/i18n/use-translation";

const navItems = [
  { href: "/", icon: Home, label: "Today" },
  { href: "/library", icon: BookOpen, label: "Library" },
  { href: "/history", icon: LineChart, label: "History" },
  { href: "/self-care", icon: Heart, label: "Self-care" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

type AppSidebarProps = {
  currentPath: string;
};

export function AppSidebar({ currentPath }: AppSidebarProps) {
  const pathname = usePathname();
  const { status, userEmail, signIn, disconnect } = useSync();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleToggle = useCallback(() => {
    if (status.type === "disconnected") {
      void signIn();
    } else {
      setOpen((prev) => !prev);
    }
  }, [status.type, signIn]);

  const handleDisconnect = useCallback(() => {
    setOpen(false);
    void disconnect();
  }, [disconnect]);

  const isConnected = status.type !== "disconnected";

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-2 py-2">
          <h1 className="text-lg font-semibold tracking-tight">ExerLog</h1>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

                return (
                  <SidebarMenuButton
                    key={item.href}
                    asChild
                    isActive={isActive}
                  >
                    <Link href={item.href}>
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 py-2 border-t border-border space-y-3">
          {/* Language Selection */}
          <div className="flex items-center gap-2">
            <Languages className="size-4 text-muted-foreground" />
            <LanguageSwitcher />
          </div>

          {/* Login/Logout */}
          <div className="relative">
            <button
              type="button"
              onClick={handleToggle}
              disabled={status.type === "syncing"}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              {status.type === "syncing" ? (
                <span className="animate-spin">🔄</span>
              ) : isConnected ? (
                <LogOut className="size-4" />
              ) : (
                <LogIn className="size-4" />
              )}
              <span className="truncate">
                {status.type === "syncing"
                  ? t("sync_indicator_syncing")
                  : isConnected
                    ? t("sync_indicator_disconnect")
                    : t("sync_indicator_sign_in")}
              </span>
            </button>

            {open && isConnected && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                <div className="absolute bottom-full left-0 right-0 mb-2 z-50 rounded-lg border border-border bg-card p-2 shadow-lg">
                  {status.type === "error" && (
                    <p className="px-2 py-1 text-xs text-destructive">
                      {status.message}
                    </p>
                  )}
                  {userEmail && (
                    <p className="px-2 py-1 text-xs text-muted-foreground truncate">
                      {userEmail}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="w-full rounded-md px-2 py-1.5 text-xs font-semibold text-left text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    {t("sync_indicator_disconnect")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
