"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/features/i18n/use-translation";
import { CIRCUMFERENCE_SITES, type Limb } from "@/features/measurements/circumference";

const MARKERS = ["❶", "❷", "❸", "❹", "❺"];

/** Height (y) of each site's marker line, in the order of CIRCUMFERENCE_SITES; distal first. */
const MARKER_Y: Record<Limb, readonly number[]> = {
  arm: [176, 146, 104, 62, 30],
  leg: [186, 156, 112, 62, 24],
};

/** A simple tapered outline of the limb with a numbered line at each measuring site. */
function LimbFigure({ limb, label }: { limb: Limb; label: string }) {
  const outline =
    limb === "arm"
      ? "M44 14 L76 14 L82 60 L72 104 L68 140 L74 168 L78 192 L42 192 L46 168 L52 140 L48 104 L38 60 Z"
      : "M40 12 L80 12 L78 62 L74 112 L70 160 L72 184 L96 192 L96 200 L38 200 L46 160 L46 112 L44 62 Z";
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 120 210"
      className="mx-auto h-48 w-auto text-foreground"
      fill="none"
      stroke="currentColor"
      strokeLinejoin="round"
    >
      <path d={outline} strokeWidth={2} className="text-muted-foreground" />
      {MARKER_Y[limb].map((y, index) => (
        <g key={y}>
          <line x1={26} x2={94} y1={y} y2={y} strokeWidth={2} strokeDasharray="5 3" />
          <text x={100} y={y + 5} fill="currentColor" stroke="none" fontSize={14}>
            {MARKERS[index]}
          </text>
        </g>
      ))}
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
        <p className="text-xs text-muted-foreground">{t("circumference_help_garment_note")}</p>
      </DialogContent>
    </Dialog>
  );
}
