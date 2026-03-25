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

export type DesignModel = "gpt-4o" | "gpt-4o-mini" | "claude-sonnet-4-5-20251022";

export interface DesignAgentOutput {
  analysis: string;
  altText: string;
  copySuggestions: string;
  traces: [TraceInfo, TraceInfo, TraceInfo];
  model: string;
  imageFilename: string;
}

export interface DesignRubricScore {
  visual_specificity: number;
  design_sensibility: number;
  accessibility_value: number;
  no_hallucination: number;
}

export interface DesignAgentResponse {
  output: DesignAgentOutput;
  scores: {
    analysis: DesignRubricScore;
    altText: DesignRubricScore;
    copy: DesignRubricScore;
  };
  traceUrl?: string;
}
