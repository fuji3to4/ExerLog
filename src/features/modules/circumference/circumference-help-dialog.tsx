"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/features/i18n/use-translation";
import { CIRCUMFERENCE_SITES, type CircumferenceSite, type Limb } from "@/features/measurements/circumference";
import { LIMB_OUTLINES } from "./limb-outlines";

const MARKERS = ["❶", "❷", "❸", "❹", "❺"];

type Line = readonly [x1: number, y1: number, x2: number, y2: number];

/** Figure geometry, in the coordinates of docs/memo/fig/{arm,leg}.svg. */
const FIGURES: Record<Limb, { viewBox: string; reference: Line; sites: Partial<Record<CircumferenceSite, Line>> }> = {
  arm: {
    viewBox: "179 28 112 482",
    // The elbow.
    reference: [189.5, 222.1, 276.7, 226.7],
    sites: {
      palm: [213.1, 436.9, 259.8, 430.9],
      wrist: [216.8, 377.6, 248.3, 377.6],
      belowElbow: [204.4, 262.1, 259.7, 264.2],
      aboveElbow: [207.7, 145.6, 259.8, 145.6],
      axilla: [202, 112, 265.5, 112],
    },
  },
  leg: {
    viewBox: "168 10 142 518",
    // The kneecap.
    reference: [173.2, 242.5, 284, 242.5],
    sites: {
      instep: [205.2, 473.4, 251.6, 486.5],
      ankle: [214, 413.7, 243.9, 413.7],
      belowKnee: [198.8, 296.1, 259.9, 296.1],
      aboveKnee: [187.9, 140.6, 272.7, 140.6],
      groin: [180.2, 53.7, 282, 53.7],
    },
  },
};

/** The limb outline with a numbered line at each measuring site and a dashed line at the elbow or knee. */
function LimbFigure({ limb, label }: { limb: Limb; label: string }) {
  const { viewBox, reference, sites } = FIGURES[limb];
  const [rx1, ry1, rx2, ry2] = reference;
  return (
    <svg role="img" aria-label={label} viewBox={viewBox} className="mx-auto h-80 w-auto text-foreground">
      <path d={LIMB_OUTLINES[limb]} fill="currentColor" fillRule="evenodd" />
      <line x1={rx1} y1={ry1} x2={rx2} y2={ry2} stroke="currentColor" strokeWidth={1} strokeDasharray="4 4" />
      {CIRCUMFERENCE_SITES[limb].map((site, index) => {
        const line = sites[site];
        if (!line) return null;
        const [x1, y1, x2, y2] = line;
        return (
          <g key={site} className="text-primary">
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={4} strokeLinecap="round" />
            <text x={x2 + 4} y={y2 + 7} fill="currentColor" fontSize={20}>
              {MARKERS[index]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export type CircumferenceHelpDialogProps = {
  open: boolean;
  onOpenChange(open: boolean): void;
  limb: Limb;
};

/** Where to measure each circumference site of the chosen limb. */
export function CircumferenceHelpDialog({ open, onOpenChange, limb }: CircumferenceHelpDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t(`circumference_help_title_${limb}`)}</DialogTitle>
          <DialogDescription>{t("circumference_help_common")}</DialogDescription>
        </DialogHeader>
        <LimbFigure limb={limb} label={t(`circumference_help_figure_${limb}`)} />
        <ol className="space-y-2 text-sm">
          {CIRCUMFERENCE_SITES[limb].map((site, index) => (
            <li key={site} className="flex gap-2">
              <span aria-hidden="true">{MARKERS[index]}</span>
              <span>
                <span className="mr-2 font-medium">{t(`circumference_site_${site}`)}</span>
                <span>{t(`circumference_help_${site}`)}</span>
              </span>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
