import { normalizeImageInput } from "@/lib/chat/image";
import { MAX_IMAGE_BYTES } from "@/lib/config";

const SMALL_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

describe("normalizeImageInput", () => {
  test("normalizes valid image payloads", () => {
    const normalized = normalizeImageInput({
      mimeType: "image/png",
      base64: SMALL_PNG,
      filename: "tiny.png",
    });

    expect(normalized).toBeDefined();
    expect(normalized?.dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(normalized?.filename).toBe("tiny.png");
  });

  test("rejects unsupported mime types", () => {
    expect(() =>
      normalizeImageInput({
        mimeType: "image/svg+xml",
        base64: SMALL_PNG,
      }),
    ).toThrow("Unsupported image type");
  });

  test("rejects oversized images", () => {
    const huge = "A".repeat(Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 16);
    expect(() =>
      normalizeImageInput({
        mimeType: "image/png",
        base64: huge,
      }),
    ).toThrow("Image exceeds");
  });
});

