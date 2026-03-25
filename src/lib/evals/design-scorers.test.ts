import {
  extractStepOutput,
  parseDesignRubricScore,
  toRubricEntries,
} from "@/lib/evals/design-scorers";
import { DesignAgentOutput } from "@/lib/types";

const MOCK_OUTPUT: DesignAgentOutput = {
  analysis: "analysis output",
  altText: "alt output",
  copySuggestions: "copy output",
  model: "gpt-4o-mini",
  imageFilename: "demo.png",
  traces: {
    root: { traceId: "t", spanId: "s", url: "https://example.com/root" },
    analysis: { traceId: "t", spanId: "s1", url: "https://example.com/1" },
    altText: { traceId: "t", spanId: "s2", url: "https://example.com/2" },
    copy: { traceId: "t", spanId: "s3", url: "https://example.com/3" },
  },
};

describe("design scorers", () => {
  test("parses and clamps judge scores", () => {
    const score = parseDesignRubricScore(
      JSON.stringify({
        visual_specificity: 1.4,
        design_sensibility: -0.2,
        accessibility_value: 0.8,
        no_hallucination: "bad",
      }),
    );

    expect(score.visual_specificity).toBe(1);
    expect(score.design_sensibility).toBe(0);
    expect(score.accessibility_value).toBe(0.8);
    expect(score.no_hallucination).toBe(0.5);
  });

  test("keeps rubric metric keys stable", () => {
    const entries = toRubricEntries({
      visual_specificity: 0.1,
      design_sensibility: 0.2,
      accessibility_value: 0.3,
      no_hallucination: 0.4,
    });

    expect(entries.map((entry) => entry.name)).toEqual([
      "visual_specificity",
      "design_sensibility",
      "accessibility_value",
      "no_hallucination",
    ]);
  });

  test("routes output text based on step", () => {
    expect(extractStepOutput(MOCK_OUTPUT, "analysis")).toBe("analysis output");
    expect(extractStepOutput(MOCK_OUTPUT, "altText")).toBe("alt output");
    expect(extractStepOutput(MOCK_OUTPUT, "copy")).toBe("copy output");
  });
});
