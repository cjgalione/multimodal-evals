import { traced } from "braintrust";
import { OPENAI_MODEL } from "@/lib/config";
import { buildOpenAIMessages } from "@/lib/chat/message-builder";
import { normalizeImageInput } from "@/lib/chat/image";
import {
  MultimodalAnswerInput,
  MultimodalAnswerOutput,
} from "@/lib/types";
import { getOpenAIClient } from "@/lib/server/braintrust-client";

function cleanAssistantText(value: string | null | undefined): string {
  if (!value) {
    return "I could not produce an answer.";
  }
  return value.trim();
}

export async function multimodalAnswer(
  input: MultimodalAnswerInput,
): Promise<MultimodalAnswerOutput> {
  return traced(async (rootSpan) => {
    rootSpan.log({
      input: {
        sessionId: input.sessionId,
        messageCount: input.messages.length,
        imageProvided: Boolean(input.image),
      },
    });

    const normalizedImage = await traced(async (span) => {
      const image = normalizeImageInput(input.image);
      span.log({
        output: image
          ? {
              mimeType: image.mimeType,
              filename: image.filename,
              imageBytes: image.byteLength,
            }
          : { image: "none" },
      });
      return image;
    }, { name: "normalize-image", type: "tool" });

    const openAiMessages = await traced(async (span) => {
      const built = buildOpenAIMessages(
        input.messages,
        normalizedImage?.dataUrl,
      );
      span.log({
        output: {
          openAiMessageCount: built.length,
          imageAttachedToMessage: Boolean(normalizedImage),
        },
      });
      return built;
    }, { name: "assemble-messages", type: "tool" });

    const client = getOpenAIClient();
    const completion = await traced(async () => {
      return client.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: 0.2,
        messages: openAiMessages,
      });
    }, { name: "call-openai", type: "llm" });

    const answer = await traced(async (span) => {
      const text = cleanAssistantText(
        completion.choices[0]?.message?.content,
      );
      span.log({ output: { answerPreview: text.slice(0, 180) } });
      return text;
    }, { name: "post-process-answer", type: "tool" });

    const trace = {
      traceId: rootSpan.rootSpanId,
      spanId: rootSpan.spanId,
      url: rootSpan.link(),
    };

    const diagnostics = {
      model: OPENAI_MODEL,
      messageCount: input.messages.length,
      imageBytes: normalizedImage?.byteLength,
    };

    rootSpan.log({
      output: {
        answer,
        trace,
      },
      metadata: diagnostics,
    });

    return {
      answer,
      trace,
      diagnostics,
    };
  }, { name: "multimodal-answer", type: "task" });
}

