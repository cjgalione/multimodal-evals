import { NextResponse } from "next/server";
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ChatTurn, ImageRef } from "@/lib/types";
import { DemoEvalCase } from "@/lib/evals/types";
import { generateEvalSpec } from "@/lib/server/eval-case-generator";
import { getOpenAIClient } from "@/lib/server/braintrust-client";
import { OPENAI_MODEL } from "@/lib/config";

interface GenerateEvalCaseRequest {
  turns: ChatTurn[];
  answer: string;
  image?: ImageRef;
  images?: ImageRef[];
}

interface GenerateEvalCaseResponse {
  case: Omit<DemoEvalCase, "input"> & {
    input: { messages: ChatTurn[]; image?: ImageRef };
  };
  totalGenerated: number;
}

const GENERATED_CASES_PATH = join(
  process.cwd(),
  "src",
  "lib",
  "evals",
  "generated-cases.json",
);

function readGeneratedCases(): DemoEvalCase[] {
  try {
    const raw = readFileSync(GENERATED_CASES_PATH, "utf8");
    return JSON.parse(raw) as DemoEvalCase[];
  } catch {
    return [];
  }
}

function writeGeneratedCases(cases: DemoEvalCase[]): void {
  writeFileSync(GENERATED_CASES_PATH, JSON.stringify(cases, null, 2) + "\n", "utf8");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateEvalCaseRequest;

    if (!Array.isArray(body.turns) || body.turns.length === 0) {
      return NextResponse.json(
        { error: "turns must be a non-empty array" },
        { status: 400 },
      );
    }
    if (typeof body.answer !== "string" || body.answer.trim().length === 0) {
      return NextResponse.json(
        { error: "answer must be a non-empty string" },
        { status: 400 },
      );
    }

    const primaryImage = body.image ?? body.images?.[0];
    const client = getOpenAIClient();

    const spec = await generateEvalSpec(
      client,
      OPENAI_MODEL,
      body.turns,
      body.answer,
      primaryImage,
    );

    const existingCases = readGeneratedCases();
    const caseId = `generated-${Date.now()}`;

    const newCase: DemoEvalCase = {
      input: {
        messages: body.turns,
        image: primaryImage,
        images: body.images,
      },
      expected: {
        required_facts: spec.required_facts,
        disallowed_claims: spec.disallowed_claims,
      },
      metadata: {
        case_id: caseId,
        category: spec.category,
        difficulty: spec.difficulty,
      },
    };

    const updatedCases = [...existingCases, newCase];
    writeGeneratedCases(updatedCases);

    const response: GenerateEvalCaseResponse = {
      case: newCase,
      totalGenerated: updatedCases.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
