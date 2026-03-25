import { DESIGN_MODELS } from "@/lib/config";
import { scoreDesignStepWithJudge } from "@/lib/evals/design-scorers";
import { runDesignAgentPipeline } from "@/lib/server/design-agent";
import {
  loadDesignImageByFilename,
  validateDesignImageFilename,
} from "@/lib/server/design-image-loader";
import {
  DesignAgentRequestBody,
  DesignAgentResponseBody,
  DesignModel,
  ImageRef,
} from "@/lib/types";

interface DesignAgentHandlerDeps {
  runPipelineFn?: typeof runDesignAgentPipeline;
  scoreStepFn?: typeof scoreDesignStepWithJudge;
  loadImageByFilenameFn?: (filename: string) => Promise<ImageRef>;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isDesignModel(value: string): value is DesignModel {
  return DESIGN_MODELS.includes(value as DesignModel);
}

function validateBody(input: unknown): DesignAgentRequestBody {
  if (!input || typeof input !== "object") {
    throw new Error("Request body must be an object");
  }

  const maybe = input as Partial<DesignAgentRequestBody>;
  if (!isNonEmptyString(maybe.model)) {
    throw new Error("model is required");
  }
  if (!isDesignModel(maybe.model.trim())) {
    throw new Error(`Unsupported model: ${maybe.model}`);
  }

  const hasFilename = isNonEmptyString(maybe.imageFilename);
  const hasBase64 = isNonEmptyString(maybe.imageBase64);
  if (hasFilename === hasBase64) {
    throw new Error("Provide exactly one image source: imageFilename or imageBase64");
  }

  if (hasFilename) {
    validateDesignImageFilename(maybe.imageFilename!);
  }

  if (hasBase64 && maybe.imageBase64!.trim().length === 0) {
    throw new Error("imageBase64 must be a non-empty base64 string");
  }

  if (maybe.mimeType !== undefined && !isNonEmptyString(maybe.mimeType)) {
    throw new Error("mimeType must be a non-empty string when provided");
  }

  if (maybe.filename !== undefined && !isNonEmptyString(maybe.filename)) {
    throw new Error("filename must be a non-empty string when provided");
  }

  return {
    model: maybe.model.trim() as DesignModel,
    imageFilename: maybe.imageFilename?.trim(),
    imageBase64: maybe.imageBase64?.trim(),
    mimeType: maybe.mimeType?.trim(),
    filename: maybe.filename?.trim(),
  };
}

export async function handleDesignAgentRequest(
  input: unknown,
  deps: DesignAgentHandlerDeps = {},
): Promise<DesignAgentResponseBody> {
  const request = validateBody(input);
  const runPipeline = deps.runPipelineFn ?? runDesignAgentPipeline;
  const scoreStep = deps.scoreStepFn ?? scoreDesignStepWithJudge;
  const loadImage = deps.loadImageByFilenameFn ?? loadDesignImageByFilename;

  const imageRef = request.imageFilename
    ? await loadImage(request.imageFilename)
    : {
        mimeType: request.mimeType ?? "image/png",
        base64: request.imageBase64!,
        filename: request.filename ?? "uploaded-design.png",
      };

  const output = await runPipeline(imageRef, request.model);
  const [analysisScore, altTextScore, copyScore] = await Promise.all([
    scoreStep({
      imageRef,
      stepName: "analysis",
      stepOutput: output.analysis,
    }),
    scoreStep({
      imageRef,
      stepName: "altText",
      stepOutput: output.altText,
    }),
    scoreStep({
      imageRef,
      stepName: "copy",
      stepOutput: output.copySuggestions,
    }),
  ]);

  return {
    model: output.model,
    imageFilename: output.imageFilename,
    outputs: {
      analysis: output.analysis,
      altText: output.altText,
      copySuggestions: output.copySuggestions,
    },
    scores: {
      analysis: analysisScore,
      altText: altTextScore,
      copy: copyScore,
    },
    traces: output.traces,
  };
}
