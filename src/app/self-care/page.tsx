"use client";

import { AppShell } from "@/components/app-shell/app-shell";
import { useTranslation } from "@/features/i18n/use-translation";

export default function SelfCarePage() {
  const { messages } = useTranslation();

  return (
    <AppShell currentPath="/self-care">
      <section aria-labelledby="self-care-heading">
        <h2 id="self-care-heading">{messages.self_care_heading}</h2>
        <p>{messages.self_care_description}</p>
      </section>
    </AppShell>
  );
}
