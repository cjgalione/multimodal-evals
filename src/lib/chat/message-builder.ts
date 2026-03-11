import OpenAI from "openai";
import { ChatTurn } from "@/lib/types";

function toImageParts(
  images: Array<{ mimeType: string; base64: string }>,
): OpenAI.Chat.Completions.ChatCompletionContentPartImage[] {
  return images.map((image) => ({
    type: "image_url",
    image_url: {
      url: `data:${image.mimeType};base64,${image.base64}`,
    },
  }));
}

function toOpenAIMessage(
  message: ChatTurn,
): OpenAI.Chat.Completions.ChatCompletionMessageParam {
  if (message.role === "system") {
    return { role: "system", content: message.content };
  }
  if (message.role === "assistant") {
    return { role: "assistant", content: message.content };
  }
  const messageImages = message.images?.length
    ? message.images
    : message.image
      ? [message.image]
      : [];
  if (messageImages.length > 0) {
    return {
      role: "user",
      content: [
        { type: "text", text: message.content },
        ...toImageParts(messageImages),
      ],
    };
  }
  return { role: "user", content: message.content };
}

export function buildOpenAIMessages(
  turns: ChatTurn[],
  imageDataUrls: string[] = [],
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const hasSystem = turns.some((turn) => turn.role === "system");
  const baseMessages = hasSystem
    ? turns.map(toOpenAIMessage)
    : [
        {
          role: "system",
          content:
            "You are a visual assistant. Ground your response in the provided image and conversation.",
        } as OpenAI.Chat.Completions.ChatCompletionMessageParam,
        ...turns.map(toOpenAIMessage),
      ];

  if (imageDataUrls.length === 0) {
    return baseMessages;
  }

  const userIndices = baseMessages
    .map((message, index) => (message.role === "user" ? index : -1))
    .filter((index) => index >= 0);
  const targetIndex = userIndices[userIndices.length - 1];

  const imageParts: OpenAI.Chat.Completions.ChatCompletionContentPartImage[] = imageDataUrls.map((url) => ({
    type: "image_url",
    image_url: { url },
  }));

  if (targetIndex === undefined) {
    return [
      ...baseMessages,
      {
        role: "user",
        content: [
          { type: "text", text: "Please analyze this image." },
          ...imageParts,
        ],
      },
    ];
  }

  return baseMessages.map((message, index) => {
    if (index !== targetIndex || message.role !== "user") {
      return message;
    }

    if (Array.isArray(message.content)) {
      if (message.content.some((part) => part.type === "image_url")) {
        return message;
      }
      return {
        ...message,
        content: [...message.content, ...imageParts],
      };
    }

    return {
      ...message,
      content: [
        { type: "text", text: message.content ?? "Please analyze this image." },
        ...imageParts,
      ],
    };
  });
}
