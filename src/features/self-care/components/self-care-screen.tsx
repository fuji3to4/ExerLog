"use client";

import { useTranslation } from "@/features/i18n/use-translation";

export function SelfCareScreen() {
  const { t } = useTranslation();

  return (
    <>
      <section className="card page-header">
        <h1>{t("self_care_heading")}</h1>
        <p>{t("self_care_subheading")}</p>
      </section>

      <section className="card">
        <h2>{t("self_care_wellness_heading")}</h2>
        <form>
          <fieldset>
            <legend>{t("self_care_wellness_heading")}</legend>
            <label>
              <input type="radio" name="self-care-focus" value="physical" />
              {t("self_care_physical_label")}
            </label>
            <label>
              <input type="radio" name="self-care-focus" value="mental" />
              {t("self_care_mental_label")}
            </label>
          </fieldset>
          <button type="submit">{t("self_care_save_button")}</button>
        </form>
      </section>

      <section className="card">
        <h2>{t("self_care_metrics_heading")}</h2>
        <dl>
          <div>
            <dt>{t("self_care_metric_height")}</dt>
            <dd>170 cm</dd>
          </div>
          <div>
            <dt>{t("self_care_metric_weight")}</dt>
            <dd>65 kg</dd>
          </div>
          <div>
            <dt>{t("self_care_metric_body_fat")}</dt>
            <dd>18%</dd>
          </div>
        </dl>
      </section>

      <section className="card">
        <h2>{t("self_care_logs_heading")}</h2>
        <table>
          <thead>
            <tr>
              <th>{t("self_care_done_label")}</th>
              <th>{t("self_care_count_label")}</th>
              <th>{t("self_care_minutes_label")}</th>
              <th>{t("self_care_note_label")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>
      </section>
    </>
  );
}
