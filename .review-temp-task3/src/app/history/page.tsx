import { AppShell } from "@/components/app-shell/app-shell";

export default function HistoryPage() {
  return (
    <AppShell currentPath="/history">
      <section className="card page-header">
        <h1>History</h1>
        <p>Review completed workout sessions after tracking features land.</p>
      </section>
    </AppShell>
  );
}
