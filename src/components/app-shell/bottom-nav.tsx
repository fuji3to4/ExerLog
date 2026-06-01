"use client";

import Link from "next/link";
import { cva } from "class-variance-authority";
import { useTranslation } from "@/features/i18n/use-translation";

type BottomNavProps = {
  currentPath: string;
};

const navLinkVariants = cva(
  "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full px-2 py-2 text-[11px] font-medium transition-colors",
  {
    variants: {
      active: {
        true: "bg-primary text-primary-foreground shadow-sm",
        false: "text-muted-foreground hover:bg-muted hover:text-foreground",
      },
    },
  }
);

export function BottomNav({ currentPath }: BottomNavProps) {
  const { messages } = useTranslation();

  const destinations = [
    { href: "/", icon: "◯", label: messages.nav_today },
    { href: "/library", icon: "□", label: messages.nav_library },
    { href: "/history", icon: "△", label: messages.nav_history },
    { href: "/self-care", icon: "♡", label: messages.nav_self_care },
    { href: "/settings", icon: "⚙", label: messages.nav_settings },
  ];

  return (
    <nav
      aria-label={messages.nav_aria_label}
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/70 bg-background/95 backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-screen-sm gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
        {destinations.map((destination) => {
          const isActive = currentPath === destination.href;

          return (
            <Link
              key={destination.href}
              aria-current={isActive ? "page" : undefined}
              className={navLinkVariants({ active: isActive })}
              href={destination.href}
            >
              <span aria-hidden="true" className="text-base leading-none">
                {destination.icon}
              </span>
              <span className="truncate">{destination.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
