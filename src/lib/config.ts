export const DEMO_PROJECT_NAME =
  process.env.BRAINTRUST_PROJECT_NAME ?? "Multimodal Image QA Demo";

export const OPENAI_MODEL =
  process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

export const DESIGN_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "claude-sonnet-4-5-20251022",
] as const;

export const DESIGN_EVAL_PROJECT =
  process.env.BRAINTRUST_DESIGN_PROJECT ?? "Design Agent - Visual Content Eval";

export const BRAINTRUST_GATEWAY_URL = "https://gateway.braintrust.dev/v1/proxy";
