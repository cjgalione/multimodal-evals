import {
  ChatRequestBody,
  ChatResponseBody,
  ChatTurn,
  ImageRef,
} from "@/lib/types";
import { multimodalAnswer } from "@/lib/server/multimodal-answer";
import {
  getSessionTraceParent,
  setSessionTraceParent,
} from "@/lib/server/conversation-state";

interface ChatHandlerDeps {
  answerFn: typeof multimodalAnswer;
  getSessionTraceParentFn?: typeof getSessionTraceParent;
  setSessionTraceParentFn?: typeof setSessionTraceParent;
}

function isImageRefList(input: unknown): input is ImageRef[] {
  return Array.isArray(input) && input.length > 0 && input.every(isImageRef);
}

function isImageRef(input: unknown): input is ImageRef {
  if (!input || typeof input !== "object") {
    return false;
  }
  const maybe = input as ImageRef;
  return (
    typeof maybe.mimeType === "string" &&
    maybe.mimeType.trim().length > 0 &&
    typeof maybe.base64 === "string" &&
    maybe.base64.trim().length > 0 &&
    (maybe.filename === undefined || typeof maybe.filename === "string")
  );
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
    maybe.content.trim().length > 0 &&
    (maybe.image === undefined || isImageRef(maybe.image)) &&
    (maybe.images === undefined || isImageRefList(maybe.images))
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

  if (maybe.image !== undefined && !isImageRef(maybe.image)) {
    throw new Error("image must include mimeType/base64 strings");
  }

  if (maybe.images !== undefined && !isImageRefList(maybe.images)) {
    throw new Error("images must be a non-empty array of image payloads");
  }

  if (
    maybe.sessionId !== undefined &&
    (typeof maybe.sessionId !== "string" || maybe.sessionId.trim().length === 0)
  ) {
    throw new Error("sessionId must be a non-empty string");
  }

  if (
    maybe.traceParent !== undefined &&
    (typeof maybe.traceParent !== "string" || maybe.traceParent.trim().length === 0)
  ) {
    throw new Error("traceParent must be a non-empty string");
  }

  if (
    maybe.turnIndex !== undefined &&
    (!Number.isInteger(maybe.turnIndex) || maybe.turnIndex < 1)
  ) {
    throw new Error("turnIndex must be a positive integer");
  }

  return {
    messages: maybe.messages,
    image: maybe.image,
    images: maybe.images,
    sessionId: maybe.sessionId?.trim(),
    traceParent: maybe.traceParent?.trim(),
    turnIndex: maybe.turnIndex,
  };
}

export async function handleChatRequest(
  input: unknown,
  deps: ChatHandlerDeps = {
    answerFn: multimodalAnswer,
    getSessionTraceParentFn: getSessionTraceParent,
    setSessionTraceParentFn: setSessionTraceParent,
  },
): Promise<ChatResponseBody> {
  const request = validateChatBody(input);
  const getParent = deps.getSessionTraceParentFn ?? getSessionTraceParent;
  const setParent = deps.setSessionTraceParentFn ?? setSessionTraceParent;

  const effectiveTraceParent =
    request.traceParent ??
    (request.sessionId ? getParent(request.sessionId) : undefined);

  if (request.sessionId && effectiveTraceParent) {
    setParent(request.sessionId, effectiveTraceParent);
  }

  const response = await deps.answerFn({
    ...request,
    traceParent: effectiveTraceParent,
  });

  if (request.sessionId && response.trace?.parent) {
    setParent(request.sessionId, response.trace.parent);
  }

  return response;
}
