import { traced } from "braintrust";
import { ImageRef, TraceInfo, DesignAgentOutput } from "@/lib/types";
import { getGatewayClient } from "@/lib/server/braintrust-client";

const ANALYZE_PROMPT =
  "You are a design analyst. Describe this design image in detail: " +
  "layout structure, color palette (use specific color names or hex values where possible), " +
  "typography hierarchy (headline sizes, weights, and relationships), visual hierarchy, " +
  "and the apparent purpose and target audience of this design.";

const ALT_TEXT_PROMPT =
  "You are an accessibility expert. Based on this design image and the analysis provided below, " +
  "write alt text that would help a screen reader user fully understand what this design communicates. " +
  "Be specific about visual content, any text present in the image, layout, and the design's purpose. " +
  "Keep it under 150 words and lead with the most important information.\n\nPrior analysis:\n";

const COPY_SUGGEST_PROMPT =
  "You are a senior copywriter. Review the text and copy present in this design image. " +
  "Suggest concrete improvements to the headline and body copy. Be specific about what to change, " +
  "provide rewritten alternatives, and explain why each change improves the design's effectiveness. " +
  "Reference the design's visual context and apparent audience.\n\nPrior analysis:\n";

function imageToContentPart(image: ImageRef) {
  return {
    type: "image_url" as const,
    image_url: {
      url: `data:${image.mimeType};base64,${image.base64}`,
    },
  };
}

function extractTraceInfo(span: { rootSpanId?: string; spanId?: string; link?: () => string | undefined }): TraceInfo {
  return {
    traceId: span.rootSpanId,
    spanId: span.spanId,
    url: span.link?.(),
  };
}

export async function runDesignAgentPipeline(
  image: ImageRef,
  model: string,
  traceParent?: string,
): Promise<DesignAgentOutput> {
  const client = getGatewayClient();
  const imageFilename = image.filename ?? "unknown";

  return traced(
    async (rootSpan) => {
      rootSpan.log({ input: { model, imageFilename } });

      // Step 1: Analyze
      const { analysis, trace: analyzeTrace } = await traced(
        async (span) => {
          const completion = await client.chat.completions.create({
            model,
            temperature: 0.2,
            messages: [
              {
                role: "user",
                content: [
                  imageToContentPart(image),
                  { type: "text", text: ANALYZE_PROMPT },
                ],
              },
            ],
          });
          const text = completion.choices[0]?.message?.content?.trim() ?? "";
          span.log({ output: { preview: text.slice(0, 200) } });
          return { analysis: text, trace: extractTraceInfo(span) };
        },
        { name: "design-analyze", type: "llm", parent: await rootSpan.export() },
      );

      // Step 2: Alt text (receives image + analysis)
      const { altText, trace: altTrace } = await traced(
        async (span) => {
          const completion = await client.chat.completions.create({
            model,
            temperature: 0.2,
            messages: [
              {
                role: "user",
                content: [
                  imageToContentPart(image),
                  { type: "text", text: ALT_TEXT_PROMPT + analysis },
                ],
              },
            ],
          });
          const text = completion.choices[0]?.message?.content?.trim() ?? "";
          span.log({ output: { preview: text.slice(0, 200) } });
          return { altText: text, trace: extractTraceInfo(span) };
        },
        { name: "design-alt-text", type: "llm", parent: await rootSpan.export() },
      );

      // Step 3: Copy suggestions (receives image + analysis)
      const { copySuggestions, trace: copyTrace } = await traced(
        async (span) => {
          const completion = await client.chat.completions.create({
            model,
            temperature: 0.3,
            messages: [
              {
                role: "user",
                content: [
                  imageToContentPart(image),
                  { type: "text", text: COPY_SUGGEST_PROMPT + analysis },
                ],
              },
            ],
          });
          const text = completion.choices[0]?.message?.content?.trim() ?? "";
          span.log({ output: { preview: text.slice(0, 200) } });
          return { copySuggestions: text, trace: extractTraceInfo(span) };
        },
        { name: "design-copy", type: "llm", parent: await rootSpan.export() },
      );

      const output: DesignAgentOutput = {
        analysis,
        altText,
        copySuggestions,
        traces: [analyzeTrace, altTrace, copyTrace],
        model,
        imageFilename,
      };

      rootSpan.log({ output: { imageFilename, model } });
      return output;
    },
    {
      name: "design-agent-pipeline",
      type: "task",
      parent: traceParent,
    },
  );
}
