import OpenAI from "openai";
import { ChatTurn } from "@/lib/types";

function toOpenAIMessage(
  message: ChatTurn,
): OpenAI.Chat.Completions.ChatCompletionMessageParam {
  if (message.role === "system") {
    return { role: "system", content: message.content };
  }
  if (message.role === "assistant") {
    return { role: "assistant", content: message.content };
  }
  return { role: "user", content: message.content };
}

export function buildOpenAIMessages(
  turns: ChatTurn[],
  imageDataUrl?: string,
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

  if (!imageDataUrl) {
    return baseMessages;
  }

  const userIndices = baseMessages
    .map((message, index) => (message.role === "user" ? index : -1))
    .filter((index) => index >= 0);
  const targetIndex = userIndices[userIndices.length - 1];

  const imagePart: OpenAI.Chat.Completions.ChatCompletionContentPartImage = {
    type: "image_url",
    image_url: { url: imageDataUrl },
  };

  if (targetIndex === undefined) {
    return [
      ...baseMessages,
      {
        role: "user",
        content: [
          { type: "text", text: "Please analyze this image." },
          imagePart,
        ],
      },
    ];
  }

  return baseMessages.map((message, index) => {
    if (index !== targetIndex || message.role !== "user") {
      return message;
    }

    if (Array.isArray(message.content)) {
      return {
        ...message,
        content: [...message.content, imagePart],
      };
    }

    return {
      ...message,
      content: [
        { type: "text", text: message.content ?? "Please analyze this image." },
        imagePart,
      ],
    };
  });
}

