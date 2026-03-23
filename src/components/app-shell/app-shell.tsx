import type { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";

type AppShellProps = {
  children: ReactNode;
  currentPath: string;
};

export function AppShell({ children, currentPath }: AppShellProps) {
  return (
    <div className="app-shell">
      <main className="page-content">{children}</main>
      <BottomNav currentPath={currentPath} />
    </div>
  );
}
