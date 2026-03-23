import Link from "next/link";

const destinations = [
  { href: "/", label: "Today" },
  { href: "/library", label: "Library" },
  { href: "/history", label: "History" },
];

type BottomNavProps = {
  currentPath: string;
};

export function BottomNav({ currentPath }: BottomNavProps) {
  return (
    <nav aria-label="Primary" className="bottom-nav">
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
