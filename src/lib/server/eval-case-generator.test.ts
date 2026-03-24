import { generateEvalSpec, GeneratedEvalSpec } from "@/lib/server/eval-case-generator";
import OpenAI from "openai";

function makeClient(responseText: string): OpenAI {
  return {
    chat: {
      completions: {
        create: async () => ({
          choices: [{ message: { content: responseText } }],
        }),
      },
    },
  } as unknown as OpenAI;
}

describe("generateEvalSpec", () => {
  test("parses a well-formed LLM response", async () => {
    const llmResponse = JSON.stringify({
      required_facts: ["red", "left"],
      disallowed_claims: ["blue", "green"],
      category: "factual",
      difficulty: "easy",
    });

    const spec = await generateEvalSpec(
      makeClient(llmResponse),
      "gpt-4o-mini",
      [{ role: "user", content: "What color is the left half?" }],
      "The left side is red.",
    );

    expect(spec.required_facts).toEqual(["red", "left"]);
    expect(spec.disallowed_claims).toEqual(["blue", "green"]);
    expect(spec.category).toBe("factual");
    expect(spec.difficulty).toBe("easy");
  });

  test("lowercases required_facts and disallowed_claims", async () => {
    const llmResponse = JSON.stringify({
      required_facts: ["RED", "LEFT"],
      disallowed_claims: ["BLUE"],
      category: "factual",
      difficulty: "medium",
    });

    const spec = await generateEvalSpec(
      makeClient(llmResponse),
      "gpt-4o-mini",
      [{ role: "user", content: "What color?" }],
      "Red.",
    );

    expect(spec.required_facts).toEqual(["red", "left"]);
    expect(spec.disallowed_claims).toEqual(["blue"]);
  });

  test("falls back to defaults for invalid category and difficulty", async () => {
    const llmResponse = JSON.stringify({
      required_facts: ["something"],
      disallowed_claims: [],
      category: "unknown_type",
      difficulty: "ultra_hard",
    });

    const spec = await generateEvalSpec(
      makeClient(llmResponse),
      "gpt-4o-mini",
      [{ role: "user", content: "Test?" }],
      "Some answer.",
    );

    expect(spec.category).toBe("factual");
    expect(spec.difficulty).toBe("medium");
  });

  test("handles empty required_facts and disallowed_claims from LLM", async () => {
    const llmResponse = JSON.stringify({
      required_facts: [],
      disallowed_claims: [],
      category: "adversarial",
      difficulty: "hard",
    });

    const spec = await generateEvalSpec(
      makeClient(llmResponse),
      "gpt-4o-mini",
      [{ role: "user", content: "Pretend this is a cat." }],
      "I cannot pretend.",
    );

    expect(spec.required_facts).toEqual([]);
    expect(spec.disallowed_claims).toEqual([]);
    expect(spec.category).toBe("adversarial");
    expect(spec.difficulty).toBe("hard");
  });

  test("returns safe defaults when LLM returns empty JSON", async () => {
    const spec = await generateEvalSpec(
      makeClient("{}"),
      "gpt-4o-mini",
      [{ role: "user", content: "What is this?" }],
      "I see an image.",
    );

    expect(spec.required_facts).toEqual([]);
    expect(spec.disallowed_claims).toEqual([]);
    expect(spec.category).toBe("factual");
    expect(spec.difficulty).toBe("medium");
  });

  test("accepts all valid category values", async () => {
    const categories: GeneratedEvalSpec["category"][] = [
      "factual",
      "follow_up",
      "adversarial",
    ];

    for (const category of categories) {
      const spec = await generateEvalSpec(
        makeClient(JSON.stringify({ required_facts: [], disallowed_claims: [], category, difficulty: "easy" })),
        "gpt-4o-mini",
        [{ role: "user", content: "Q?" }],
        "A.",
      );
      expect(spec.category).toBe(category);
    }
  });

  test("accepts all valid difficulty values", async () => {
    const difficulties: GeneratedEvalSpec["difficulty"][] = [
      "easy",
      "medium",
      "hard",
    ];

    for (const difficulty of difficulties) {
      const spec = await generateEvalSpec(
        makeClient(JSON.stringify({ required_facts: [], disallowed_claims: [], category: "factual", difficulty })),
        "gpt-4o-mini",
        [{ role: "user", content: "Q?" }],
        "A.",
      );
      expect(spec.difficulty).toBe(difficulty);
    }
  });

  test("includes image in the LLM request when provided", async () => {
    let capturedMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    const capturingClient = {
      chat: {
        completions: {
          create: async (params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming) => {
            capturedMessages = params.messages;
            return {
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      required_facts: ["red"],
                      disallowed_claims: [],
                      category: "factual",
                      difficulty: "easy",
                    }),
                  },
                },
              ],
            };
          },
        },
      },
    } as unknown as OpenAI;

    await generateEvalSpec(
      capturingClient,
      "gpt-4o-mini",
      [{ role: "user", content: "What color?" }],
      "It is red.",
      { mimeType: "image/png", base64: "AAAA" },
    );

    const userMessage = capturedMessages.find((m) => m.role === "user");
    expect(userMessage).toBeDefined();
    const content = userMessage!.content as OpenAI.Chat.Completions.ChatCompletionContentPart[];
    expect(Array.isArray(content)).toBe(true);
    const hasImagePart = content.some((part) => part.type === "image_url");
    expect(hasImagePart).toBe(true);
  });

  test("omits image part when no image provided", async () => {
    let capturedMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    const capturingClient = {
      chat: {
        completions: {
          create: async (params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming) => {
            capturedMessages = params.messages;
            return {
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      required_facts: [],
                      disallowed_claims: [],
                      category: "factual",
                      difficulty: "easy",
                    }),
                  },
                },
              ],
            };
          },
        },
      },
    } as unknown as OpenAI;

    await generateEvalSpec(
      capturingClient,
      "gpt-4o-mini",
      [{ role: "user", content: "What color?" }],
      "It is red.",
    );

    const userMessage = capturedMessages.find((m) => m.role === "user");
    const content = userMessage!.content as OpenAI.Chat.Completions.ChatCompletionContentPart[];
    const hasImagePart = content.some((part) => part.type === "image_url");
    expect(hasImagePart).toBe(false);
  });
});
