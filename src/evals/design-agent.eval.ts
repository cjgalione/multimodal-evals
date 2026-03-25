import { Eval } from "braintrust";
import { createDesignEvalDataset, DesignEvalCase } from "@/evals/design-dataset";
import { designRubricScorer } from "@/lib/evals/design-scorers";
import { runDesignAgentPipeline } from "@/lib/server/design-agent";
import { DESIGN_EVAL_PROJECT, DESIGN_MODELS } from "@/lib/config";

const dataset = createDesignEvalDataset();

for (const model of DESIGN_MODELS) {
  Eval(DESIGN_EVAL_PROJECT, {
    experimentName: `design-agent-${model}-${Date.now()}`,
    data: () =>
      dataset.map((c: DesignEvalCase) => ({
        input: { ...c.input, model },
        expected: c.expected,
        metadata: { ...c.metadata, model },
      })),
    task: async (input) => {
      return runDesignAgentPipeline(input.image, input.model);
    },
    scores: [designRubricScorer],
    metadata: {
      model,
      suite: "design-agent",
      case_count: dataset.length,
    },
  });
}
