import { handleDesignAgentRequest } from "@/lib/server/design-agent-handler";
import { DesignAgentOutput } from "@/lib/types";

const MOCK_OUTPUT: DesignAgentOutput = {
  analysis: "analysis text",
  altText: "alt text",
  copySuggestions: "copy text",
  model: "gpt-4o-mini",
  imageFilename: "hero-title-slide.png",
  traces: {
    root: { traceId: "t-root", spanId: "s-root", url: "https://trace/root" },
    analysis: { traceId: "t-a", spanId: "s-a", url: "https://trace/a" },
    altText: { traceId: "t-b", spanId: "s-b", url: "https://trace/b" },
    copy: { traceId: "t-c", spanId: "s-c", url: "https://trace/c" },
  },
};

describe("handleDesignAgentRequest", () => {
  test("accepts preset filename input and scores all three steps", async () => {
    let scoreCalls = 0;
    const response = await handleDesignAgentRequest(
      {
        model: "gpt-4o-mini",
        imageFilename: "hero-title-slide.png",
      },
      {
        loadImageByFilenameFn: async () => ({
          mimeType: "image/png",
          base64: "AAAA",
          filename: "hero-title-slide.png",
        }),
        runPipelineFn: async () => MOCK_OUTPUT,
        scoreStepFn: async () => {
          scoreCalls += 1;
          return {
            visual_specificity: 0.9,
            design_sensibility: 0.8,
            accessibility_value: 0.7,
            no_hallucination: 1,
          };
        },
        flushFn: async () => undefined,
      },
    );

    expect(response.imageFilename).toBe("hero-title-slide.png");
    expect(response.outputs.analysis).toBe("analysis text");
    expect(response.scores.analysis.visual_specificity).toBe(0.9);
    expect(response.scores.copy.no_hallucination).toBe(1);
    expect(scoreCalls).toBe(3);
  });

  test("accepts uploaded base64 input", async () => {
    const response = await handleDesignAgentRequest(
      {
        model: "gpt-4o",
        imageBase64: "AAAA",
        mimeType: "image/png",
        filename: "upload.png",
      },
      {
        runPipelineFn: async (_imageRef, model) => ({
          ...MOCK_OUTPUT,
          model,
          imageFilename: "upload.png",
        }),
        scoreStepFn: async () => ({
          visual_specificity: 0.5,
          design_sensibility: 0.5,
          accessibility_value: 0.5,
          no_hallucination: 0.5,
        }),
        flushFn: async () => undefined,
      },
    );

    expect(response.model).toBe("gpt-4o");
    expect(response.imageFilename).toBe("upload.png");
  });

  test("rejects unsupported model", async () => {
    await expect(
      handleDesignAgentRequest({
        model: "gpt-3.5-turbo",
        imageFilename: "hero-title-slide.png",
      }),
    ).rejects.toThrow("Unsupported model");
  });

  test("rejects missing image source", async () => {
    await expect(
      handleDesignAgentRequest({
        model: "gpt-4o",
      }),
    ).rejects.toThrow("Provide exactly one image source");
  });

  test("rejects dual image source", async () => {
    await expect(
      handleDesignAgentRequest({
        model: "gpt-4o",
        imageFilename: "hero-title-slide.png",
        imageBase64: "AAAA",
      }),
    ).rejects.toThrow("Provide exactly one image source");
  });

  test("rejects path traversal in image filename", async () => {
    await expect(
      handleDesignAgentRequest({
        model: "gpt-4o",
        imageFilename: "../secret.png",
      }),
    ).rejects.toThrow("must not include path separators");
  });
});
