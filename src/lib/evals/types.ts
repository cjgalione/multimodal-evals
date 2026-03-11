import { ChatTurn, ImageRef } from "@/lib/types";

export interface DemoEvalExpected {
  required_facts?: string[];
  disallowed_claims?: string[];
}

export interface DemoEvalMetadata {
  case_id: string;
  category: "factual" | "follow_up" | "adversarial";
  difficulty: "easy" | "medium" | "hard";
  intentionally_weak?: boolean;
}

export interface DemoEvalInput {
  messages: ChatTurn[];
  image?: ImageRef;
}

export interface DemoEvalCase {
  input: DemoEvalInput;
  expected: DemoEvalExpected;
  metadata: DemoEvalMetadata;
}

