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
