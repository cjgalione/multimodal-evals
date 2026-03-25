import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { ImageRef } from "@/lib/types";

const DESIGN_IMAGE_DIR = join(process.cwd(), "public", "eval-images", "design");
const imageCache = new Map<string, ImageRef>();

export function validateDesignImageFilename(filename: string): string {
  const trimmed = filename.trim();
  if (!trimmed) {
    throw new Error("imageFilename must be a non-empty string");
  }
  if (basename(trimmed) !== trimmed) {
    throw new Error("imageFilename must not include path separators");
  }
  if (!/^[A-Za-z0-9._-]+$/.test(trimmed) || !trimmed.endsWith(".png")) {
    throw new Error("imageFilename must be a .png filename");
  }
  return trimmed;
}

export async function loadDesignImageByFilename(filename: string): Promise<ImageRef> {
  const safeName = validateDesignImageFilename(filename);
  const cached = imageCache.get(safeName);
  if (cached) {
    return cached;
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(join(DESIGN_IMAGE_DIR, safeName));
  } catch {
    throw new Error(`Unknown design image: ${safeName}`);
  }

  const imageRef = {
    mimeType: "image/png",
    filename: safeName,
    base64: buffer.toString("base64"),
  };
  imageCache.set(safeName, imageRef);
  return imageRef;
}
