"use client";

import { createPortal } from "react-dom";

import { useTranslation } from "@/features/i18n/use-translation";

type SeedConfirmDialogProps = {
  onConfirm: () => void;
  onDecline: () => void;
};

export function SeedConfirmDialog({ onConfirm, onDecline }: SeedConfirmDialogProps) {
  const { t } = useTranslation();

  return createPortal(
    <>
      <div className="seed-confirm-overlay" aria-hidden="true" />
      <div
        className="seed-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="seed-confirm-title"
      >
        <h2 id="seed-confirm-title">{t("seed_confirm_title")}</h2>
        <p>{t("seed_confirm_message")}</p>
        <div className="seed-confirm-dialog__actions">
          <button
            type="button"
            className="settings-action-button settings-action-button--secondary"
            onClick={onDecline}
          >
            {t("seed_confirm_no")}
          </button>
          <button type="button" className="settings-action-button" onClick={onConfirm}>
            {t("seed_confirm_yes")}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
