import { describe, expect, test, vi } from "vitest";

const fakeBuffer = Buffer.from([1, 2, 3, 4, 5]);

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(() => fakeBuffer),
}));

describe("createDesignEvalDataset", () => {
  test("loads 10 design cases with embedded image refs", async () => {
    const { createDesignEvalDataset } = await import("@/evals/design-dataset");
    const dataset = createDesignEvalDataset();

    expect(dataset).toHaveLength(10);
    for (const row of dataset) {
      expect(row.input.imageRef.mimeType).toBe("image/png");
      expect(row.input.imageRef.base64).toBe(fakeBuffer.toString("base64"));
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
