import { DesignRubricScore, DesignStepKey, ImageRef } from "@/lib/types";

export interface DesignEvalInput {
  imageFilename: string;
  imageRef: ImageRef;
  stepName: DesignStepKey;
}

export interface DesignEvalExpected {
  should_mention?: string[];
  should_not_mention?: string[];
}

export interface DesignEvalMetadata {
  case_id: string;
  image_type: string;
  design_elements: string[];
  difficulty: "easy" | "medium" | "hard";
}

export interface DesignEvalCase {
  input: DesignEvalInput;
  expected: DesignEvalExpected;
  metadata: DesignEvalMetadata;
}

export interface ScoreDesignStepInput {
  imageRef: ImageRef;
  stepName: DesignStepKey;
  stepOutput: string;
  expected?: DesignEvalExpected;
}

export type DesignRubricMetricName = keyof DesignRubricScore;
