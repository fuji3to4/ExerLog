import type { ChangeEvent } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import type { SelfCareItem } from "@/lib/types";

import type { SelfCareEntryState } from "../use-self-care-data";

type SelfCareLogCardProps = {
  items: SelfCareItem[];
  entries: Record<string, SelfCareEntryState>;
  onEntryChange: (selfCareId: string, patch: Partial<SelfCareEntryState>) => void;
};

export function SelfCareLogCard({ items, entries, onEntryChange }: SelfCareLogCardProps) {
  const { t } = useTranslation();

  return (
    <section className="self-care-screen__section">
      <div className="card self-care-screen__section-heading">
        <h2>{t("self_care_logs_heading")}</h2>
      </div>

      <div className="self-care-screen__log-list">
        {items.map((item) => {
          const entry = entries[item.id] ?? {
            isDone: false,
            count: "",
            minutes: "",
            note: "",
          };

          return (
            <article key={item.id} className="card self-care-log-card">
              <h3>{item.title}</h3>
              <p>{item.description}</p>

              <label className="self-care-screen__checkbox">
                <input
                  type="checkbox"
                  checked={entry.isDone}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    onEntryChange(item.id, { isDone: event.target.checked })
                  }
                />
                <span>{t("result_did")}</span>
              </label>

              <div className="self-care-log-card__metrics">
                <label className="self-care-screen__field">
                  <span>#</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={entry.count}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      onEntryChange(item.id, { count: event.target.value })
                    }
                  />
                </label>

                <label className="self-care-screen__field">
                  <span>{t("settings_form_duration_label")}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={entry.minutes}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      onEntryChange(item.id, { minutes: event.target.value })
                    }
                  />
                </label>
              </div>

              <label className="self-care-screen__field">
                <span>{t("condition_note_label")}</span>
                <textarea
                  rows={3}
                  value={entry.note}
                  placeholder={t("condition_note_placeholder")}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    onEntryChange(item.id, { note: event.target.value })
                  }
                />
              </label>
            </article>
          );
        })}
      </div>
    </section>
  );
}
