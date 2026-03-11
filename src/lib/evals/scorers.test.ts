import { deterministicHybridScorer } from "@/lib/evals/scorers";

describe("deterministicHybridScorer", () => {
  test("scores required facts and disallowed claims", () => {
    const scores = deterministicHybridScorer({
      input: {
        messages: [{ role: "user", content: "question" }],
      },
      output: "The left side is red and the right side is blue.",
      expected: {
        required_facts: ["red", "blue"],
        disallowed_claims: ["cat"],
      },
      metadata: {
        case_id: "x",
        category: "factual",
        difficulty: "easy",
      },
    });

    const fact = scores.find((entry) => entry.name === "fact_coverage");
    const hall = scores.find((entry) => entry.name === "hallucination_guard");
    expect(fact?.score).toBe(1);
    expect(hall?.score).toBe(1);
  });

  test("detects disallowed claims", () => {
    const scores = deterministicHybridScorer({
      input: {
        messages: [{ role: "user", content: "question" }],
      },
      output: "I can clearly see a cat.",
      expected: {
        disallowed_claims: ["cat"],
      },
      metadata: {
        case_id: "x",
        category: "adversarial",
        difficulty: "hard",
      },
    });

    const hall = scores.find((entry) => entry.name === "hallucination_guard");
    expect(hall?.score).toBe(0);
  });
});

