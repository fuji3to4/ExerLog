"use client";

import { useTranslation } from "@/features/i18n/use-translation";
import { formatDelta } from "@/features/measurements/circumference";
import { circumferenceItemId } from "@/features/measurements/circumference-sites";
import { CIRCUMFERENCE_ITEMS } from "@/features/measurements/measurement-items";
import { SummaryCardFrame, SummaryEmpty, usePeriodSummary } from "../components/summary-card";
import type { Period } from "../period";
import { circumferenceData } from "./data";
import { summarizeCircumference, type SiteSummary } from "./summary";

async function load(period: Period) {
  return { summary: summarizeCircumference(await circumferenceData.listInPeriod(period)) };
}

function SiteLines({ site }: { site: SiteSummary }) {
  const { t } = useTranslation();
  const decimals = CIRCUMFERENCE_ITEMS.find((item) => item.id === circumferenceItemId(site.limb, site.site, "left"))!.decimals;
  const fixed = (value: number) => value.toFixed(decimals);
  const sides = [
    ["left", site.left],
    ["right", site.right],
  ] as const;

  return (
    <div>
      <p className="font-medium">
        {t(`circumference_limb_${site.limb}`)} {t(`circumference_site_${site.site}`)}
      </p>
      {sides.map(([side, stats]) =>
        stats ? (
          <p key={side}>
            {t(`circumference_side_${side}`)}{" "}
            {t("period_first_last", {
              first: fixed(stats.first),
              last: fixed(stats.last),
              diff: formatDelta(stats.diff, decimals),
            })}
          </p>
        ) : null,
      )}
      {site.sideDiffFirst !== null && site.sideDiffLast !== null ? (
        <p className="text-muted-foreground">
          {t("period_side_diff", {
            first: formatDelta(site.sideDiffFirst, decimals),
            last: formatDelta(site.sideDiffLast, decimals),
          })}
        </p>
      ) : null}
    </div>
  );
}

export function CircumferenceSummaryCard({ period }: { period: Period }) {
  const { t } = useTranslation();
  const loaded = usePeriodSummary(period, load);
  const summary = loaded?.summary;

  return (
    <SummaryCardFrame title={t("module_circumference_label")}>
      {loaded === undefined ? null : !summary ? (
        <SummaryEmpty />
      ) : (
        <>
          <p>{t("period_count", { count: summary.count })}</p>
          {summary.sites.map((site) => (
            <SiteLines key={`${site.limb}-${site.site}`} site={site} />
          ))}
        </>
      )}
    </SummaryCardFrame>
  );
}
