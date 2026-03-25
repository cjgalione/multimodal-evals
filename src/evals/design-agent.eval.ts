import { Eval } from "braintrust";
import { DESIGN_EVAL_PROJECT, DESIGN_MODELS } from "@/lib/config";
import { createDesignRubricScorer } from "@/lib/evals/design-scorers";
import { DesignEvalInput } from "@/lib/evals/design-types";
import { runDesignAgentPipeline } from "@/lib/server/design-agent";
import { createDesignEvalDataset } from "@/evals/design-dataset";

const dataset = createDesignEvalDataset();
const score = createDesignRubricScorer();
const runStamp = Date.now();

for (const model of DESIGN_MODELS) {
  await Eval(DESIGN_EVAL_PROJECT, {
    experimentName: `design-agent-${model}-${runStamp}`,
    data: dataset,
    task: async (input: DesignEvalInput) =>
      runDesignAgentPipeline(input.imageRef, model),
    scores: [score],
    metadata: {
      model,
      suite: "design-agent",
      case_count: dataset.length,
    },
  });
}
