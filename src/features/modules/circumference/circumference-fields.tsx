"use client";

import type { ReactNode } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import {
  CIRCUMFERENCE_SITES,
  findCircumferenceItem,
  LIMBS,
  SIDE_COLORS,
  SIDES,
  type Limb,
} from "@/features/measurements/circumference";
import type { MeasurementItem } from "@/features/measurements/measurement-items";
import { SegmentedTabs } from "@/features/timeline/components/segmented-tabs";

export type CircumferenceFieldsProps = {
  limb: Limb;
  onLimbChange(limb: Limb): void;
  /** Limbs holding an invalid value; their tab gets a ⚠. */
  invalidLimbs: ReadonlySet<Limb>;
  /** One field's <input>, labelled by the item's own label. */
  renderInput(item: MeasurementItem): ReactNode;
  onHelp(): void;
};

const LIMB_LABEL_KEYS = { arm: "circumference_limb_arm", leg: "circumference_limb_leg" } as const;
const SIDE_LABEL_KEYS = { left: "circumference_side_left", right: "circumference_side_right" } as const;

/** Arm|leg switch over a site-by-side grid: site label, then a left and a right input. */
export function CircumferenceFields({ limb, onLimbChange, invalidLimbs, renderInput, onHelp }: CircumferenceFieldsProps) {
  const { t } = useTranslation();

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{t("circumference_heading")}</h3>
        <button
          type="button"
          aria-label={t("circumference_help_open")}
          className="flex size-8 items-center justify-center rounded-full border border-input text-sm font-medium text-muted-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onHelp}
        >
          ?
        </button>
      </div>
      <SegmentedTabs
        options={LIMBS}
        value={limb}
        onChange={onLimbChange}
        label={t("circumference_limb_label")}
        renderTab={(option) => (
          <>
            {t(LIMB_LABEL_KEYS[option])}
            {invalidLimbs.has(option) ? (
              <span
                role="img"
                aria-label={t("circumference_limb_has_error", { limb: t(LIMB_LABEL_KEYS[option]) })}
                className="ml-1"
              >
                ⚠
              </span>
            ) : null}
          </>
        )}
      >
        <div className="grid grid-cols-[minmax(4.5rem,1fr)_minmax(0,7rem)_minmax(0,7rem)] items-center gap-x-2 gap-y-2">
          <span aria-hidden="true" />
          {SIDES.map((side) => (
            <span
              key={side}
              aria-hidden="true"
              className="text-center text-sm font-semibold"
              style={{ color: SIDE_COLORS[side] }}
            >
              {t(SIDE_LABEL_KEYS[side])}
            </span>
          ))}
          {CIRCUMFERENCE_SITES[limb].map((site) => (
            <CircumferenceRow key={site} label={t(`circumference_site_${site}`)}>
              {SIDES.map((side) => (
                <div key={side}>{renderInput(findCircumferenceItem(limb, site, side))}</div>
              ))}
            </CircumferenceRow>
          ))}
        </div>
      </SegmentedTabs>
    </section>
  );
}

function CircumferenceRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <span aria-hidden="true" className="text-sm font-medium">
        {label}
      </span>
      {children}
    </>
  );
}
