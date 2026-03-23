import { AppShell } from "@/components/app-shell/app-shell";

export default function LibraryPage() {
  return (
    <AppShell currentPath="/library">
      <section className="card page-header">
        <h1>Library</h1>
        <p>Browse saved exercise templates once the catalog is wired in.</p>
      </section>
    </AppShell>
  );
}
