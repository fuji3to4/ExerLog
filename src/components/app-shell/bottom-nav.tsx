"use client";

import Link from "next/link";
import { useTranslation } from "@/features/i18n/use-translation";

type BottomNavProps = {
  currentPath: string;
};

export function BottomNav({ currentPath }: BottomNavProps) {
  const { messages } = useTranslation();

  const destinations = [
    { href: "/", label: messages.nav_today },
    { href: "/library", label: messages.nav_library },
    { href: "/history", label: messages.nav_history },
    { href: "/settings", label: messages.nav_settings },
  ];

  return (
    <nav aria-label={messages.nav_aria_label} className="bottom-nav">
      {destinations.map((destination) => {
        const isActive = currentPath === destination.href;

        return (
          <Link
            key={destination.href}
            aria-current={isActive ? "page" : undefined}
            className="bottom-nav__link"
            href={destination.href}
          >
            {destination.label}
          </Link>
        );
      })}
    </nav>
  );
}
