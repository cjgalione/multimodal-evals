import OpenAI from "openai";
import { ChatTurn, ImageRef } from "@/lib/types";
import { DemoEvalMetadata } from "@/lib/evals/types";

export interface GeneratedEvalSpec {
  required_facts: string[];
  disallowed_claims: string[];
  category: DemoEvalMetadata["category"];
  difficulty: DemoEvalMetadata["difficulty"];
}

const SYSTEM_PROMPT = `You are an evaluation engineer creating test specifications for a multimodal AI system.
Given a conversation and the AI's answer, generate a JSON test specification.

Return ONLY valid JSON with this exact shape:
{
  "required_facts": ["fact1", "fact2"],
  "disallowed_claims": ["bad1", "bad2"],
  "category": "factual",
  "difficulty": "medium"
}

Rules:
- required_facts: 2-4 short lowercase strings that a correct answer MUST contain (case-insensitive substring match). Derive them from what the model correctly said.
- disallowed_claims: 1-3 short lowercase strings a correct answer must NOT contain (common hallucinations or wrong answers for this image/question).
- category: "factual" for direct image questions, "follow_up" for multi-turn dependent questions, "adversarial" for trick or jailbreak-style questions.
- difficulty: "easy" for simple color/shape questions, "medium" for comparisons or relative positions, "hard" for nuanced or multi-step reasoning.`;

const VALID_CATEGORIES = ["factual", "follow_up", "adversarial"] as const;
const VALID_DIFFICULTIES = ["easy", "medium", "hard"] as const;

function sanitizeSpec(raw: Partial<GeneratedEvalSpec>): GeneratedEvalSpec {
  return {
    required_facts: Array.isArray(raw.required_facts)
      ? raw.required_facts.filter((f) => typeof f === "string").map((f) => f.toLowerCase())
      : [],
    disallowed_claims: Array.isArray(raw.disallowed_claims)
      ? raw.disallowed_claims.filter((c) => typeof c === "string").map((c) => c.toLowerCase())
      : [],
    category: VALID_CATEGORIES.includes(raw.category as DemoEvalMetadata["category"])
      ? (raw.category as DemoEvalMetadata["category"])
      : "factual",
    difficulty: VALID_DIFFICULTIES.includes(raw.difficulty as DemoEvalMetadata["difficulty"])
      ? (raw.difficulty as DemoEvalMetadata["difficulty"])
      : "medium",
  };
}

export async function generateEvalSpec(
  client: OpenAI,
  model: string,
  turns: ChatTurn[],
  answer: string,
  image?: ImageRef,
): Promise<GeneratedEvalSpec> {
  const conversationText = turns
    .map((t) => `${t.role.toUpperCase()}: ${t.content}`)
    .join("\n");

  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

  if (image) {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
    });
  }

  userContent.push({
    type: "text",
    text: `Conversation:\n${conversationText}\n\nModel answer:\n${answer}\n\nGenerate a test spec for this exchange.`,
  });

  const completion = await client.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
  });

  const text = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(text) as Partial<GeneratedEvalSpec>;
  return sanitizeSpec(parsed);
}
