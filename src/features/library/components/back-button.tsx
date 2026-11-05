"use client";

import { useRouter } from "next/navigation";

import { useTranslation } from "@/features/i18n/use-translation";

/** Returns to wherever the detail page was opened from; the library when opened directly. */
export function BackButton() {
  const router = useRouter();
  const { t } = useTranslation();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/library");
    }
  }

  return (
    <button type="button" className="exercise-detail__back" onClick={handleBack}>
      {t("action_back")}
    </button>
  );
}
