import { describe, expect, test } from "vitest";

describe("createDesignEvalDataset", () => {
  test("loads 10 design cases with filename-only inputs", async () => {
    const { createDesignEvalDataset } = await import("@/evals/design-dataset");
    const dataset = createDesignEvalDataset();

    expect(dataset).toHaveLength(10);
    for (const row of dataset) {
      expect(row.input.imageFilename.endsWith(".png")).toBe(true);
    }
  });

  test("covers all pipeline steps for scoring routes", async () => {
    const { createDesignEvalDataset } = await import("@/evals/design-dataset");
    const dataset = createDesignEvalDataset();
    const stepNames = new Set(dataset.map((row) => row.input.stepName));

    expect(stepNames).toEqual(new Set(["analysis", "altText", "copy"]));
  });
});
