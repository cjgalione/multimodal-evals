import { DesignStepKey } from "@/lib/types";

export const DESIGN_STEP_ORDER: readonly DesignStepKey[] = [
  "analysis",
  "altText",
  "copy",
];

export const DESIGN_STEP_LABELS: Record<DesignStepKey, string> = {
  analysis: "Analyze",
  altText: "Alt Text",
  copy: "Copy Suggestions",
};

export function scoreTone(score: number): "good" | "warn" | "bad" {
  if (score >= 0.8) {
    return "good";
  }
  if (score >= 0.5) {
    return "warn";
  }
  return "bad";
}

export function nextActiveStep(
  current: DesignStepKey,
  requested: string,
): DesignStepKey {
  if (DESIGN_STEP_ORDER.includes(requested as DesignStepKey)) {
    return requested as DesignStepKey;
  }
  return current;
}
