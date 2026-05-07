import OpenAI from "openai";
import { Attachment, traced } from "braintrust";
import { normalizeImageInput } from "@/lib/chat/image";
import {
  DesignAgentOutput,
  DesignModel,
  ImageRef,
  TraceInfo,
} from "@/lib/types";
import { getGatewayClient } from "@/lib/server/braintrust-client";

const ANALYZE_PROMPT =
  "You are a design analyst. Describe this design image in detail: layout structure, color palette (specific hex or color names), typography hierarchy, visual hierarchy, and the apparent purpose/audience of this design.";

const ALT_TEXT_PROMPT =
  "You are an accessibility expert. Based on this design image and the analysis provided, write alt text that would help a screen reader user fully understand what this design communicates. Be specific about visual content, text present in the image, and the design's purpose.";

const COPY_SUGGEST_PROMPT =
  "You are a senior copywriter. Review the text/copy present in this design image and suggest concrete improvements to the headline and body copy. Be specific about what to change and why, referencing the design's visual context.";

interface StepResult {
  text: string;
  trace: TraceInfo;
}

function asImageAttachment(image: {
  base64: string;
  filename: string;
  mimeType: string;
}) {
  const bytes = Uint8Array.from(Buffer.from(image.base64, "base64"));
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
  return new Attachment({
    data: arrayBuffer,
    filename: image.filename,
    contentType: image.mimeType,
  });
}

function cleanAssistantText(value: string | null | undefined): string {
  if (!value) {
    return "No response produced.";
  }
  const text = value.trim();
  return text.length > 0 ? text : "No response produced.";
}

function toUserMessage(
  prompt: string,
  imageDataUrl: string,
  context?: string,
): OpenAI.Chat.Completions.ChatCompletionUserMessageParam {
  const text = context
    ? `${prompt}\n\nSupporting context:\n${context}`
    : prompt;
  return {
    role: "user",
    content: [
      { type: "text", text },
      { type: "image_url", image_url: { url: imageDataUrl } },
    ],
  };
}

async function runDesignStep(args: {
  spanName: string;
  model: DesignModel;
  imageDataUrl: string;
  prompt: string;
  context?: string;
  client: OpenAI;
}): Promise<StepResult> {
  return traced(async (span) => {
    span.log({
      input: {
        model: args.model,
        promptPreview: args.prompt.slice(0, 180),
        hasContext: Boolean(args.context),
      },
    });

    const completion = await args.client.chat.completions.create({
      model: args.model,
      temperature: 0.2,
      messages: [toUserMessage(args.prompt, args.imageDataUrl, args.context)],
    });

    const text = cleanAssistantText(completion.choices[0]?.message?.content);
    const trace: TraceInfo = {
      traceId: span.rootSpanId,
      spanId: span.spanId,
      url: span.link(),
      parent: await span.export(),
    };

    span.log({
      output: {
        textPreview: text.slice(0, 220),
      },
    });

    return { text, trace };
  }, {
    name: args.spanName,
    type: "llm",
  });
}

function rootTraceForSpan(rootSpan: {
  rootSpanId: string;
  spanId: string;
  link(): string;
}, parent?: string): TraceInfo {
  return {
    traceId: rootSpan.rootSpanId,
    spanId: rootSpan.spanId,
    url: rootSpan.link(),
    parent,
  };
}

export async function runDesignAgentPipeline(
  imageRef: ImageRef,
  model: DesignModel,
  spanParent?: TraceInfo,
): Promise<DesignAgentOutput> {
  const client = getGatewayClient();
  const normalized = normalizeImageInput(imageRef);
  if (!normalized) {
    throw new Error("A valid image is required for design analysis");
  }

  return traced(async (rootSpan) => {
    const imageAttachment = asImageAttachment(normalized);
    rootSpan.log({
      input: {
        model,
        imageFilename: normalized.filename,
        imageBytes: normalized.byteLength,
        image: imageAttachment,
      },
    });

    const analysis = await runDesignStep({
      spanName: "design-analyze",
      model,
      imageDataUrl: normalized.dataUrl,
      prompt: ANALYZE_PROMPT,
      client,
    });

    const altText = await runDesignStep({
      spanName: "design-alt-text",
      model,
      imageDataUrl: normalized.dataUrl,
      prompt: ALT_TEXT_PROMPT,
      context: `Design analysis:\n${analysis.text}`,
      client,
    });

    const copy = await runDesignStep({
      spanName: "design-copy",
      model,
      imageDataUrl: normalized.dataUrl,
      prompt: COPY_SUGGEST_PROMPT,
      context: [
        "Design analysis:",
        analysis.text,
        "",
        "Alt text draft:",
        altText.text,
      ].join("\n"),
      client,
    });

    const rootParent = spanParent?.parent ?? (await rootSpan.export());
    const rootTrace = rootTraceForSpan(rootSpan, rootParent);

    const output: DesignAgentOutput = {
      analysis: analysis.text,
      altText: altText.text,
      copySuggestions: copy.text,
      traces: {
        root: rootTrace,
        analysis: analysis.trace,
        altText: altText.trace,
        copy: copy.trace,
      },
      model,
      imageFilename: normalized.filename,
    };

    rootSpan.log({
      output: {
        model,
        imageFilename: normalized.filename,
        analysisPreview: output.analysis.slice(0, 180),
        altTextPreview: output.altText.slice(0, 180),
        copyPreview: output.copySuggestions.slice(0, 180),
      },
    });

    return output;
  }, {
    name: "design-agent-pipeline",
    type: "task",
    parent: spanParent?.parent,
  });
}
