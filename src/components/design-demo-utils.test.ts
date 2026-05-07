import { nextActiveStep, scoreTone } from "@/components/design-demo-utils";

describe("design demo utilities", () => {
  test("uses score thresholds for badge coloring", () => {
    expect(scoreTone(0.91)).toBe("good");
    expect(scoreTone(0.8)).toBe("good");
    expect(scoreTone(0.79)).toBe("warn");
    expect(scoreTone(0.5)).toBe("warn");
    expect(scoreTone(0.49)).toBe("bad");
  });

  test("switches tabs only when requested key is valid", () => {
    expect(nextActiveStep("analysis", "altText")).toBe("altText");
    expect(nextActiveStep("altText", "copy")).toBe("copy");
    expect(nextActiveStep("copy", "invalid-step")).toBe("copy");
  });
});
