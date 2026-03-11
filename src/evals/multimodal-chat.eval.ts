import { Eval } from "braintrust";
import { createMultimodalEvalDataset } from "@/evals/dataset";
import {
  deterministicHybridScorer,
  llmGroundingScorer,
} from "@/lib/evals/scorers";
import { multimodalAnswer } from "@/lib/server/multimodal-answer";
import { DEMO_PROJECT_NAME, OPENAI_MODEL } from "@/lib/config";
import { DemoEvalInput } from "@/lib/evals/types";

Eval(DEMO_PROJECT_NAME, {
  experimentName: "multimodal-image-qa-mvp",
  data: () => createMultimodalEvalDataset(),
  task: async (input: DemoEvalInput) => {
    const result = await multimodalAnswer({
      messages: input.messages,
      image: input.image,
      sessionId: `eval-${Date.now()}`,
    });
    return result.answer;
  },
  scores: [deterministicHybridScorer, llmGroundingScorer],
  metadata: {
    model: OPENAI_MODEL,
    suite: "image-qa",
    case_count: createMultimodalEvalDataset().length,
  },
});

