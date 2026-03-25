import { EvalScorerArgs } from "braintrust";
import { DESIGN_JUDGE_MODEL } from "@/lib/config";
import {
  DesignEvalExpected,
  DesignEvalInput,
  ScoreDesignStepInput,
} from "@/lib/evals/design-types";
import {
  DesignAgentOutput,
  DesignRubricScore,
  DesignStepKey,
} from "@/lib/types";
import { normalizeImageInput } from "@/lib/chat/image";
import { getGatewayClient } from "@/lib/server/braintrust-client";
import { loadDesignImageByFilename } from "@/lib/server/design-image-loader";

const RUBRIC_KEYS: Array<keyof DesignRubricScore> = [
  "visual_specificity",
  "design_sensibility",
  "accessibility_value",
  "no_hallucination",
];

function clampScore(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0.5;
  }
  return Math.max(0, Math.min(1, value));
}

export function extractStepOutput(
  output: DesignAgentOutput,
  stepName: DesignStepKey,
): string {
  if (stepName === "analysis") {
    return output.analysis;
  }
  if (stepName === "altText") {
    return output.altText;
  }
  return output.copySuggestions;
}

export function parseDesignRubricScore(raw: string): DesignRubricScore {
  const cleaned = raw.trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  const payload = jsonMatch ? jsonMatch[0] : cleaned;
  let parsed: Partial<Record<keyof DesignRubricScore, unknown>> = {};
  try {
    parsed = JSON.parse(payload) as Partial<Record<keyof DesignRubricScore, unknown>>;
  } catch {
    // Fall through to defaults.
  }

  return {
    visual_specificity: clampScore(parsed.visual_specificity),
    design_sensibility: clampScore(parsed.design_sensibility),
    accessibility_value: clampScore(parsed.accessibility_value),
    no_hallucination: clampScore(parsed.no_hallucination),
  };
}

function judgePrompt(stepName: DesignStepKey, expected?: DesignEvalExpected): string {
  const mention = (expected?.should_mention ?? []).join(", ") || "none";
  const disallow = (expected?.should_not_mention ?? []).join(", ") || "none";

  return [
    "You are grading the quality of a design-agent response.",
    `Step under review: ${stepName}.`,
    "Return JSON only with numeric values from 0.0 to 1.0 for these exact keys:",
    '{"visual_specificity": number, "design_sensibility": number, "accessibility_value": number, "no_hallucination": number}',
    "Rubric guidance:",
    "- visual_specificity: Reward specific design details (layout, color names/hex, hierarchy, typography, concrete elements).",
    "- design_sensibility: Reward understanding of audience, goal, and communication intent.",
    "- accessibility_value: Reward clarity and usefulness for screen-reader users.",
    "- no_hallucination: 1.0 means it avoids inventing text, numbers, or visual elements not in the image.",
    `Should mention hints: ${mention}`,
    `Should avoid hints: ${disallow}`,
  ].join("\n");
}

export async function scoreDesignStepWithJudge(
  input: ScoreDesignStepInput,
): Promise<DesignRubricScore> {
  const client = getGatewayClient();
  const normalized = normalizeImageInput(input.imageRef);
  if (!normalized) {
    throw new Error("Unable to normalize image for design scoring");
  }

  const completion = await client.chat.completions.create({
    model: DESIGN_JUDGE_MODEL,
    temperature: 0,
    messages: [
      {
        role: "system",
        content: judgePrompt(input.stepName, input.expected),
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `Response for ${input.stepName}:`,
              input.stepOutput,
            ].join("\n\n"),
          },
          {
            type: "image_url",
            image_url: { url: normalized.dataUrl },
          },
        ],
      },
    ],
  });

  const judgeText = completion.choices[0]?.message?.content ?? "{}";
  return parseDesignRubricScore(judgeText);
}

export function toRubricEntries(score: DesignRubricScore) {
  return RUBRIC_KEYS.map((key) => ({
    name: key,
    score: score[key],
  }));
}

export function createDesignRubricScorer() {
  return async function designRubricScorer(
    args: EvalScorerArgs<DesignEvalInput, DesignAgentOutput, DesignEvalExpected>,
  ) {
    const stepOutput = extractStepOutput(args.output, args.input.stepName);
    const imageRef = await loadDesignImageByFilename(args.input.imageFilename);
    const score = await scoreDesignStepWithJudge({
      imageRef,
      stepName: args.input.stepName,
      stepOutput,
      expected: args.expected,
    });
    return toRubricEntries(score);
  };
}
