import {
  ChatRequestBody,
  ChatResponseBody,
  ChatTurn,
} from "@/lib/types";
import { multimodalAnswer } from "@/lib/server/multimodal-answer";

interface ChatHandlerDeps {
  answerFn: typeof multimodalAnswer;
}

function isChatTurn(input: unknown): input is ChatTurn {
  if (!input || typeof input !== "object") {
    return false;
  }
  const maybe = input as ChatTurn;
  return (
    (maybe.role === "system" ||
      maybe.role === "user" ||
      maybe.role === "assistant") &&
    typeof maybe.content === "string" &&
    maybe.content.trim().length > 0
  );
}

function validateChatBody(input: unknown): ChatRequestBody {
  if (!input || typeof input !== "object") {
    throw new Error("Request body must be an object");
  }

  const maybe = input as Partial<ChatRequestBody>;
  if (!Array.isArray(maybe.messages) || maybe.messages.length === 0) {
    throw new Error("messages must be a non-empty array");
  }

  if (!maybe.messages.every(isChatTurn)) {
    throw new Error("messages contains invalid entries");
  }

  return {
    messages: maybe.messages,
    image: maybe.image,
    sessionId: maybe.sessionId,
  };
}

export async function handleChatRequest(
  input: unknown,
  deps: ChatHandlerDeps = { answerFn: multimodalAnswer },
): Promise<ChatResponseBody> {
  const request = validateChatBody(input);
  return deps.answerFn(request);
}

