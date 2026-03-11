export type ChatRole = "system" | "user" | "assistant";

export interface ChatTurn {
  role: ChatRole;
  content: string;
  image?: ImageRef;
  images?: ImageRef[];
}

export interface ImageRef {
  mimeType: string;
  base64: string;
  filename?: string;
}

export interface ChatRequestBody {
  messages: ChatTurn[];
  image?: ImageRef;
  images?: ImageRef[];
  sessionId?: string;
  traceParent?: string;
  turnIndex?: number;
}

export interface TraceInfo {
  traceId?: string;
  spanId?: string;
  url?: string;
  parent?: string;
}

export interface ChatResponseBody {
  answer: string;
  trace?: TraceInfo;
  diagnostics?: {
    model: string;
    messageCount: number;
    imageBytes?: number;
  };
}

export interface MultimodalAnswerInput {
  messages: ChatTurn[];
  image?: ImageRef;
  images?: ImageRef[];
  sessionId?: string;
  traceParent?: string;
  turnIndex?: number;
}

export interface MultimodalAnswerOutput {
  answer: string;
  trace?: TraceInfo;
  diagnostics?: {
    model: string;
    messageCount: number;
    imageBytes?: number;
  };
}
