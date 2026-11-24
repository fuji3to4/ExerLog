"use client";

import Link from "next/link";
import { cva } from "class-variance-authority";
import { useTranslation } from "@/features/i18n/use-translation";
import { Home, BookOpen, LineChart, Settings } from "lucide-react";

type BottomNavProps = {
  currentPath: string;
};

const navLinkVariants = cva(
  "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-2 py-1.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px",
  {
    variants: {
      active: {
        true: "bg-primary text-primary-foreground",
        false: "text-muted-foreground hover:bg-muted hover:text-foreground",
      },
    },
  }
);

export function BottomNav({ currentPath }: BottomNavProps) {
  const { messages } = useTranslation();

  const destinations = [
    { href: "/", icon: Home, label: messages.nav_today },
    { href: "/library", icon: BookOpen, label: messages.nav_library },
    { href: "/history", icon: LineChart, label: messages.nav_history },
    { href: "/settings", icon: Settings, label: messages.nav_settings },
  ];

  return (
    <nav
      aria-label={messages.nav_aria_label}
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
    >
      <div className="mx-auto flex w-full max-w-md gap-1 rounded-full bg-card p-1.5 shadow-[var(--shadow-lift)]">
        {destinations.map((destination) => {
          const isActive = currentPath === destination.href;

          return (
            <Link
              key={destination.href}
              aria-current={isActive ? "page" : undefined}
              className={navLinkVariants({ active: isActive })}
              href={destination.href}
            >
              <span aria-hidden="true" className="leading-none">
                <destination.icon className="size-5" />
              </span>
              <span className="truncate">{destination.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
