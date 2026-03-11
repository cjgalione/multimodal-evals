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

function countTurnImages(input: MultimodalAnswerInput): number {
  const fromMessages = input.messages.reduce((sum, message) => {
    if (message.role !== "user") {
      return sum;
    }
    if (message.images?.length) {
      return sum + message.images.length;
    }
    return sum + (message.image ? 1 : 0);
  }, 0);
  const fromRequest = input.images?.length ?? (input.image ? 1 : 0);
  return fromMessages + fromRequest;
}

export async function multimodalAnswer(
  input: MultimodalAnswerInput,
): Promise<MultimodalAnswerOutput> {
  // Ensure Braintrust logger/client are initialized before any traced() call.
  // Otherwise traced() can create no-op spans with empty root/span identifiers.
  const client = getOpenAIClient();
  const turnName = input.turnIndex
    ? `conversation-turn-${input.turnIndex}`
    : "conversation-turn";

  return traced(async (rootSpan) => {
    rootSpan.log({
      input: {
        sessionId: input.sessionId,
        turnIndex: input.turnIndex,
        hasTraceParent: Boolean(input.traceParent),
        messageCount: input.messages.length,
        messageImageCount: countTurnImages(input),
        imageProvided: countTurnImages(input) > 0,
      },
    });

    const normalizedInput = await traced(async (span) => {
      const normalizedMessages = input.messages.map((message) => ({
        role: message.role,
        content: message.content,
      }));

      let currentImages = (input.images ?? [])
        .map((image) => normalizeImageInput(image))
        .filter((image): image is NonNullable<typeof image> => Boolean(image));
      let imageSource: "request-images" | "request-image" | "latest-user-message" | "none" = "none";

      if (currentImages.length > 0) {
        imageSource = "request-images";
      } else {
        const singleImage = normalizeImageInput(input.image);
        if (singleImage) {
          currentImages = [singleImage];
          imageSource = "request-image";
        }
      }

      if (currentImages.length === 0) {
        for (let i = input.messages.length - 1; i >= 0; i -= 1) {
          const message = input.messages[i];
          if (message.role !== "user") {
            continue;
          }

          const messageImages = message.images?.length
            ? message.images
            : message.image
              ? [message.image]
              : [];
          if (messageImages.length > 0) {
            currentImages = messageImages
              .map((image) => normalizeImageInput(image))
              .filter((image): image is NonNullable<typeof image> => Boolean(image));
            imageSource = currentImages.length > 0 ? "latest-user-message" : "none";
            break;
          }
        }
      }
      const imageBytes = currentImages.reduce((sum, image) => sum + image.byteLength, 0);

      span.log({
        output: {
          currentImageSource: imageSource,
          currentImageCount: currentImages.length,
          hasCurrentImage: currentImages.length > 0,
          currentImageBytes: imageBytes,
        },
      });
      return {
        messages: normalizedMessages,
        currentImages,
        imageSource,
        imageBytes,
      };
    }, { name: "normalize-image", type: "tool" });

    const openAiMessages = await traced(async (span) => {
      const built = buildOpenAIMessages(
        normalizedInput.messages,
        normalizedInput.currentImages.map((image) => image.dataUrl),
      );
      span.log({
        output: {
          openAiMessageCount: built.length,
          imageAttachedToMessage: normalizedInput.currentImages.length > 0,
          currentImageCount: normalizedInput.currentImages.length,
          currentImageSource: normalizedInput.imageSource,
        },
      });
      return built;
    }, { name: "assemble-messages", type: "tool" });

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

    const conversationParent = input.traceParent ?? (await rootSpan.export());
    const trace = {
      traceId: rootSpan.rootSpanId,
      spanId: rootSpan.spanId,
      url: rootSpan.link(),
      parent: conversationParent,
    };

    const diagnostics = {
      model: OPENAI_MODEL,
      messageCount: input.messages.length,
      imageBytes: normalizedInput.imageBytes,
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
  }, {
    name: turnName,
    type: "task",
    parent: input.traceParent,
  });
}
