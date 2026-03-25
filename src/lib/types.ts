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

export type DesignModel =
  | "gpt-4o"
  | "gpt-4o-mini"
  | "claude-sonnet-4-5";

export type DesignStepKey = "analysis" | "altText" | "copy";

export interface DesignRubricScore {
  visual_specificity: number;
  design_sensibility: number;
  accessibility_value: number;
  no_hallucination: number;
}

export interface DesignAgentTraces {
  root: TraceInfo;
  analysis: TraceInfo;
  altText: TraceInfo;
  copy: TraceInfo;
}

export interface DesignAgentOutput {
  analysis: string;
  altText: string;
  copySuggestions: string;
  traces: DesignAgentTraces;
  model: DesignModel;
  imageFilename: string;
}

export interface DesignAgentRequestBody {
  model: DesignModel;
  imageFilename?: string;
  imageBase64?: string;
  mimeType?: string;
  filename?: string;
}

export interface DesignAgentResponseBody {
  model: DesignModel;
  imageFilename: string;
  outputs: {
    analysis: string;
    altText: string;
    copySuggestions: string;
  };
  scores: {
    analysis: DesignRubricScore;
    altText: DesignRubricScore;
    copy: DesignRubricScore;
  };
  traces: DesignAgentTraces;
}
