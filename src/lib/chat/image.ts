import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
} from "@/lib/config";
import { ImageRef } from "@/lib/types";

export interface NormalizedImage {
  dataUrl: string;
  mimeType: string;
  filename: string;
  byteLength: number;
}

function estimateBase64Bytes(base64: string): number {
  const sanitized = base64.replace(/\s+/g, "");
  const padding = (sanitized.match(/=+$/)?.[0].length ?? 0);
  return Math.floor((sanitized.length * 3) / 4) - padding;
}

function isBase64(input: string): boolean {
  return /^[a-zA-Z0-9+/=\s]+$/.test(input);
}

export function normalizeImageInput(image?: ImageRef): NormalizedImage | undefined {
  if (!image) {
    return undefined;
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.has(image.mimeType)) {
    throw new Error(`Unsupported image type: ${image.mimeType}`);
  }

  if (!image.base64 || !isBase64(image.base64)) {
    throw new Error("Image payload is not valid base64");
  }

  const byteLength = estimateBase64Bytes(image.base64);
  if (byteLength <= 0) {
    throw new Error("Image payload is empty");
  }
  if (byteLength > MAX_IMAGE_BYTES) {
    throw new Error(`Image exceeds ${MAX_IMAGE_BYTES} bytes`);
  }

  const filename =
    image.filename ??
    `upload.${image.mimeType.replace("image/", "").replace("jpeg", "jpg")}`;
  const dataUrl = `data:${image.mimeType};base64,${image.base64.replace(/\s+/g, "")}`;

  return {
    dataUrl,
    mimeType: image.mimeType,
    filename,
    byteLength,
  };
}

