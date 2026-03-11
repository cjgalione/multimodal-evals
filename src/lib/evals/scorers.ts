import { EvalScorerArgs } from "braintrust";
import { OPENAI_MODEL } from "@/lib/config";
import { DemoEvalExpected, DemoEvalInput } from "@/lib/evals/types";
import { getOpenAIClient } from "@/lib/server/braintrust-client";

function contains(haystack: string, needle: string): boolean {
  return haystack.includes(needle.toLowerCase());
}

function scoreFactCoverage(output: string, expected: DemoEvalExpected): number {
  const facts = expected.required_facts ?? [];
  if (facts.length === 0) {
    return 1;
  }
  const matched = facts.filter((fact) => contains(output, fact)).length;
  return matched / facts.length;
}

function scoreDisallowedClaims(output: string, expected: DemoEvalExpected): number {
  const claims = expected.disallowed_claims ?? [];
  if (claims.length === 0) {
    return 1;
  }
  const violated = claims.some((claim) => contains(output, claim));
  return violated ? 0 : 1;
}

export function deterministicHybridScorer(
  args: EvalScorerArgs<DemoEvalInput, string, DemoEvalExpected>,
) {
  const normalizedOutput = args.output.toLowerCase();
  return [
    {
      name: "fact_coverage",
      score: scoreFactCoverage(normalizedOutput, args.expected),
    },
    {
      name: "hallucination_guard",
      score: scoreDisallowedClaims(normalizedOutput, args.expected),
    },
  ];
}

function parseJudgeScore(response: string): number {
  const cleaned = response.trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  const payload = jsonMatch ? jsonMatch[0] : cleaned;
  try {
    const parsed = JSON.parse(payload) as { score?: number };
    if (typeof parsed.score === "number") {
      return Math.max(0, Math.min(1, parsed.score));
    }
  } catch {
    // Fall through to heuristic fallback.
  }
  if (cleaned.toLowerCase().includes("0")) {
    return 0;
  }
  return 0.5;
}

export async function llmGroundingScorer(
  args: EvalScorerArgs<DemoEvalInput, string, DemoEvalExpected>,
) {
  const client = getOpenAIClient();
  const rubricPrompt = [
    "You are grading an image-grounded answer.",
    "Score from 0 to 1.",
    "1 means the answer matches required facts and avoids disallowed claims.",
    "0 means the answer contradicts required facts or includes disallowed claims.",
    "Return JSON only: {\"score\": number}.",
    `Required facts: ${(args.expected.required_facts ?? []).join(", ") || "none"}`,
    `Disallowed claims: ${(args.expected.disallowed_claims ?? []).join(", ") || "none"}`,
    `User question: ${args.input.messages[args.input.messages.length - 1]?.content ?? ""}`,
    `Model answer: ${args.output}`,
  ].join("\n");

  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0,
    messages: [{ role: "user", content: rubricPrompt }],
  });

  const judgeText = completion.choices[0]?.message?.content ?? "{\"score\": 0.5}";
  return {
    name: "llm_grounding",
    score: parseJudgeScore(judgeText),
  };
}

