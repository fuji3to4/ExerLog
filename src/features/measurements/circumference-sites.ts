export type Limb = "arm" | "leg";
export type Side = "left" | "right";
export type CircumferenceSite =
  | "palm" | "wrist" | "belowElbow" | "aboveElbow" | "axilla"
  | "instep" | "ankle" | "belowKnee" | "aboveKnee" | "groin";
export type CircumferencePlace = { limb: Limb; site: CircumferenceSite; side: Side };

export const LIMBS: readonly Limb[] = ["arm", "leg"];
export const SIDES: readonly Side[] = ["left", "right"];

/** Measuring sites per limb, in display order. */
export const CIRCUMFERENCE_SITES: Record<Limb, readonly CircumferenceSite[]> = {
  arm: ["palm", "wrist", "belowElbow", "aboveElbow", "axilla"],
  leg: ["instep", "ankle", "belowKnee", "aboveKnee", "groin"],
};

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** e.g. ("arm", "belowElbow", "right") -> "armBelowElbowRight". */
export function circumferenceItemId(limb: Limb, site: CircumferenceSite, side: Side): string {
  return `${limb}${capitalize(site)}${capitalize(side)}`;
}
