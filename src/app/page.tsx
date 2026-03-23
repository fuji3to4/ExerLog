import { AppShell } from "@/components/app-shell/app-shell";

export default function HomePage() {
  return (
    <AppShell currentPath="/">
      <section className="card page-header">
        <h1>Today</h1>
        <p>Capture today&apos;s workout details with a fast, static-first app shell.</p>
      </section>
      <section className="card">
        <h2>Quick start</h2>
        <p>Use the main tabs below to browse the exercise library or review past sessions.</p>
        <div className="button-row">
          <button type="button">Start log</button>
          <button className="button-secondary" type="button">
            Plan session
          </button>
        </div>
      </section>
    </AppShell>
  );
}
