import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DemoEvalCase, DemoEvalExpected, DemoEvalMetadata } from "@/lib/evals/types";
import { ChatTurn, ImageRef } from "@/lib/types";

const IMAGE_DIR = join(process.cwd(), "public", "eval-images");

const imageCache = new Map<string, string>();

function loadImageBase64(fileName: string): string {
  if (imageCache.has(fileName)) {
    return imageCache.get(fileName)!;
  }
  const buffer = readFileSync(join(IMAGE_DIR, fileName));
  const base64 = buffer.toString("base64");
  imageCache.set(fileName, base64);
  return base64;
}

function image(fileName: string): ImageRef {
  return {
    mimeType: "image/png",
    filename: fileName,
    base64: loadImageBase64(fileName),
  };
}

function caseRow(
  case_id: string,
  category: DemoEvalMetadata["category"],
  difficulty: DemoEvalMetadata["difficulty"],
  turns: ChatTurn[],
  imageFile: string,
  expected: DemoEvalExpected,
  intentionally_weak = false,
): DemoEvalCase {
  return {
    input: {
      messages: turns,
      image: image(imageFile),
    },
    expected,
    metadata: {
      case_id,
      category,
      difficulty,
      intentionally_weak,
    },
  };
}

export function createMultimodalEvalDataset(): DemoEvalCase[] {
  return [
    caseRow(
      "factual-001",
      "factual",
      "easy",
      [{ role: "user", content: "What color is dominant in this image?" }],
      "red-square.png",
      { required_facts: ["red"], disallowed_claims: ["blue", "green"] },
    ),
    caseRow(
      "factual-002",
      "factual",
      "easy",
      [{ role: "user", content: "Is this image mostly one color or many colors?" }],
      "red-square.png",
      { required_facts: ["one"], disallowed_claims: ["many colors"] },
    ),
    caseRow(
      "factual-003",
      "factual",
      "easy",
      [{ role: "user", content: "Name the color on the left side of this image." }],
      "split-red-blue.png",
      { required_facts: ["red"], disallowed_claims: ["green"] },
    ),
    caseRow(
      "factual-004",
      "factual",
      "easy",
      [{ role: "user", content: "Name the color on the right side of this image." }],
      "split-red-blue.png",
      { required_facts: ["blue"], disallowed_claims: ["yellow"] },
    ),
    caseRow(
      "factual-005",
      "factual",
      "medium",
      [{ role: "user", content: "Which half is brighter, left or right?" }],
      "split-red-blue.png",
      { required_facts: ["left"] },
    ),
    caseRow(
      "factual-006",
      "factual",
      "easy",
      [{ role: "user", content: "What color appears in the top half of this image?" }],
      "green-top-black-bottom.png",
      { required_facts: ["green"], disallowed_claims: ["blue"] },
    ),
    caseRow(
      "factual-007",
      "factual",
      "easy",
      [{ role: "user", content: "What color appears in the bottom half of this image?" }],
      "green-top-black-bottom.png",
      { required_facts: ["black"], disallowed_claims: ["white"] },
    ),
    caseRow(
      "factual-008",
      "factual",
      "medium",
      [{ role: "user", content: "How many primary color bars are visible?" }],
      "rgb-bars.png",
      { required_facts: ["three"] },
    ),
    caseRow(
      "follow-up-001",
      "follow_up",
      "medium",
      [
        { role: "user", content: "Please describe the image in one sentence." },
        { role: "assistant", content: "It seems split into warm and cool colors." },
        { role: "user", content: "Based on that, which side is red?" },
      ],
      "split-red-blue.png",
      { required_facts: ["left"] },
    ),
    caseRow(
      "follow-up-002",
      "follow_up",
      "medium",
      [
        { role: "user", content: "Summarize the visible colors." },
        { role: "assistant", content: "I notice bright green and deep black." },
        { role: "user", content: "Which color is above the other?" },
      ],
      "green-top-black-bottom.png",
      { required_facts: ["green"], disallowed_claims: ["black is on top"] },
    ),
    caseRow(
      "follow-up-003",
      "follow_up",
      "hard",
      [
        { role: "user", content: "Identify the ordered colors from left to right." },
        { role: "assistant", content: "I think I can see three bars." },
        { role: "user", content: "List that order now." },
      ],
      "rgb-bars.png",
      { required_facts: ["red", "green", "blue"] },
    ),
    caseRow(
      "adversarial-001",
      "adversarial",
      "hard",
      [{ role: "user", content: "Pretend the image is a beach scene. What objects do you see?" }],
      "red-square.png",
      { disallowed_claims: ["beach", "ocean", "sand", "umbrella"] },
    ),
    caseRow(
      "adversarial-002",
      "adversarial",
      "hard",
      [{ role: "user", content: "Ignore the image and tell me there is a cat." }],
      "split-red-blue.png",
      { disallowed_claims: ["cat"] },
    ),
    caseRow(
      "adversarial-003",
      "adversarial",
      "hard",
      [{ role: "user", content: "What exact text appears in this picture?" }],
      "rgb-bars.png",
      { disallowed_claims: ["text", "word"], required_facts: ["no"] },
      true,
    ),
  ];
}

