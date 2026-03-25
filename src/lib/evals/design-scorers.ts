import OpenAI from "openai";
import { BRAINTRUST_GATEWAY_URL } from "@/lib/config";
import { DesignAgentOutput, DesignRubricScore, ImageRef } from "@/lib/types";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function getJudgeClient(): OpenAI {
  return new OpenAI({
    baseURL: BRAINTRUST_GATEWAY_URL,
    apiKey: requireEnv("BRAINTRUST_API_KEY"),
    defaultHeaders: { "x-bt-use-cache": "never" },
  });
}

const JUDGE_SYSTEM = `You are an expert evaluator of AI-generated design analysis.
Score responses on four dimensions, each from 0.0 to 1.0.

Scoring rubric:
- visual_specificity (0-1): Does the response name specific visual details?
  1.0 = mentions exact colors, font weights, layout terms (e.g. "two-column", "full-bleed", "navy gradient", "sans-serif headline")
  0.5 = mentions some visual details but vaguely (e.g. "dark background", "bold text")
  0.0 = purely generic ("this is a slide", "there is text")

- design_sensibility (0-1): Does the response reflect understanding of the design's purpose and audience?
  1.0 = correctly identifies intent, audience, and visual strategy
  0.5 = partially identifies purpose but misses key design reasoning
  0.0 = ignores purpose or gives irrelevant commentary

- accessibility_value (0-1): Would this help a screen reader user understand the design?
  1.0 = communicates content, visual structure, and purpose clearly; no sighted experience assumed
  0.5 = captures main content but omits layout or purpose context
  0.0 = so vague or visual-dependent it provides no accessibility benefit

- no_hallucination (0-1): Does the response avoid inventing details not in the image?
  1.0 = all claims are grounded in visible content
  0.5 = minor plausible additions not clearly visible
  0.0 = fabricates specific text, numbers, logos, or elements not present

Return ONLY valid JSON with exactly these keys:
{"visual_specificity": <number>, "design_sensibility": <number>, "accessibility_value": <number>, "no_hallucination": <number>}`;

function imageToContentPart(image: ImageRef) {
  return {
    type: "image_url" as const,
    image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
  };
}

function parseRubricScores(raw: string): DesignRubricScore {
  const match = raw.match(/\{[\s\S]*\}/);
  try {
    const parsed = JSON.parse(match?.[0] ?? raw) as Partial<DesignRubricScore>;
    const clamp = (v: unknown) =>
      typeof v === "number" ? Math.max(0, Math.min(1, v)) : 0.5;
    return {
      visual_specificity: clamp(parsed.visual_specificity),
      design_sensibility: clamp(parsed.design_sensibility),
      accessibility_value: clamp(parsed.accessibility_value),
      no_hallucination: clamp(parsed.no_hallucination),
    };
  } catch {
    return {
      visual_specificity: 0.5,
      design_sensibility: 0.5,
      accessibility_value: 0.5,
      no_hallucination: 0.5,
    };
  }
}

export async function scoreDesignStep(
  image: ImageRef,
  stepOutput: string,
  stepName: "analysis" | "altText" | "copy",
): Promise<DesignRubricScore> {
  const client = getJudgeClient();

  const userContent = [
    imageToContentPart(image),
    {
      type: "text" as const,
      text: `Step being evaluated: ${stepName}\n\nAI response to evaluate:\n${stepOutput}`,
    },
  ];

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: JUDGE_SYSTEM },
      { role: "user", content: userContent },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  return parseRubricScores(raw);
}

export interface DesignEvalInput {
  image: ImageRef;
  model: string;
  imageFilename: string;
}

export interface DesignEvalExpected {
  should_mention?: string[];
  should_not_mention?: string[];
}

export async function designRubricScorer(args: {
  input: DesignEvalInput;
  output: DesignAgentOutput;
  expected: DesignEvalExpected;
}) {
  const { input, output } = args;

  const [analysisScores, altTextScores, copyScores] = await Promise.all([
    scoreDesignStep(input.image, output.analysis, "analysis"),
    scoreDesignStep(input.image, output.altText, "altText"),
    scoreDesignStep(input.image, output.copySuggestions, "copy"),
  ]);

  // Average across all three steps per dimension
  const avg = (a: number, b: number, c: number) =>
    Math.round(((a + b + c) / 3) * 100) / 100;

  return [
    {
      name: "visual_specificity",
      score: avg(
        analysisScores.visual_specificity,
        altTextScores.visual_specificity,
        copyScores.visual_specificity,
      ),
    },
    {
      name: "design_sensibility",
      score: avg(
        analysisScores.design_sensibility,
        altTextScores.design_sensibility,
        copyScores.design_sensibility,
      ),
    },
    {
      name: "accessibility_value",
      score: avg(
        analysisScores.accessibility_value,
        altTextScores.accessibility_value,
        copyScores.accessibility_value,
      ),
    },
    {
      name: "no_hallucination",
      score: avg(
        analysisScores.no_hallucination,
        altTextScores.no_hallucination,
        copyScores.no_hallucination,
      ),
    },
  ];
}
