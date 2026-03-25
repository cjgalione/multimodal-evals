import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runDesignAgentPipeline } from "@/lib/server/design-agent";
import { scoreDesignStep } from "@/lib/evals/design-scorers";
import { ImageRef, DesignAgentOutput, DesignRubricScore, DesignAgentResponse } from "@/lib/types";
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_BYTES } from "@/lib/config";

const DESIGN_IMAGE_DIR = join(process.cwd(), "public", "eval-images", "design");

const ALLOWED_FILENAMES = new Set([
  "hero-title-slide.png",
  "marketing-infographic.png",
  "social-product-card.png",
  "split-layout-slide.png",
  "metrics-dashboard.png",
]);

interface RequestBody {
  imageFilename?: string;
  imageBase64?: string;
  imageMimeType?: string;
  model: string;
}

function loadBuiltinImage(filename: string): ImageRef {
  if (!ALLOWED_FILENAMES.has(filename)) {
    throw new Error(`Unknown design image: ${filename}`);
  }
  const buffer = readFileSync(join(DESIGN_IMAGE_DIR, filename));
  return {
    mimeType: "image/png",
    filename,
    base64: buffer.toString("base64"),
  };
}

function validateUploadedImage(base64: string, mimeType: string): ImageRef {
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    throw new Error(`Unsupported image type: ${mimeType}`);
  }
  const byteLength = Math.ceil((base64.length * 3) / 4);
  if (byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Image exceeds 12 MB limit");
  }
  return { mimeType, base64 };
}

const ALLOWED_MODELS = new Set([
  "gpt-4o",
  "gpt-4o-mini",
  "claude-sonnet-4-5-20251022",
]);

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { imageFilename, imageBase64, imageMimeType, model } = body;

  if (!model || !ALLOWED_MODELS.has(model)) {
    return NextResponse.json(
      { error: `model must be one of: ${[...ALLOWED_MODELS].join(", ")}` },
      { status: 400 },
    );
  }

  let image: ImageRef;
  try {
    if (imageFilename) {
      image = loadBuiltinImage(imageFilename);
    } else if (imageBase64 && imageMimeType) {
      image = validateUploadedImage(imageBase64, imageMimeType);
    } else {
      return NextResponse.json(
        { error: "Provide imageFilename or imageBase64 + imageMimeType" },
        { status: 400 },
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Image load error" },
      { status: 400 },
    );
  }

  try {
    const output = await runDesignAgentPipeline(image, model);

    const [analysisScores, altTextScores, copyScores] = await Promise.all([
      scoreDesignStep(image, output.analysis, "analysis"),
      scoreDesignStep(image, output.altText, "altText"),
      scoreDesignStep(image, output.copySuggestions, "copy"),
    ]);

    const response: DesignAgentResponse = {
      output,
      scores: {
        analysis: analysisScores,
        altText: altTextScores,
        copy: copyScores,
      },
      traceUrl: output.traces[0]?.url,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[design-agent]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Pipeline error" },
      { status: 500 },
    );
  }
}
