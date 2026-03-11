import { buildOpenAIMessages } from "@/lib/chat/message-builder";

describe("buildOpenAIMessages", () => {
  test("injects default system message when none is provided", () => {
    const messages = buildOpenAIMessages([
      { role: "user", content: "hello" },
    ]);

    expect(messages[0]).toMatchObject({ role: "system" });
    expect(messages[1]).toMatchObject({ role: "user", content: "hello" });
  });

  test("attaches image to the latest user message", () => {
    const messages = buildOpenAIMessages(
      [
        { role: "user", content: "First question" },
        { role: "assistant", content: "First answer" },
        { role: "user", content: "Second question" },
      ],
      ["data:image/png;base64,AAAA"],
    );

    const latest = messages[messages.length - 1];
    expect(latest.role).toBe("user");
    expect(Array.isArray(latest.content)).toBe(true);
    const parts = latest.content as Array<{ type: string }>;
    expect(parts.some((part) => part.type === "image_url")).toBe(true);
  });

  test("preserves per-turn images in user messages", () => {
    const messages = buildOpenAIMessages([
      {
        role: "user",
        content: "First question",
        image: {
          mimeType: "image/png",
          base64: "AAAA",
          filename: "first.png",
        },
      },
      { role: "assistant", content: "First answer" },
      {
        role: "user",
        content: "Second question",
        image: {
          mimeType: "image/jpeg",
          base64: "BBBB",
          filename: "second.jpeg",
        },
      },
    ]);

    const userMessages = messages.filter((message) => message.role === "user");
    expect(userMessages).toHaveLength(2);
    for (const userMessage of userMessages) {
      expect(Array.isArray(userMessage.content)).toBe(true);
      const parts = userMessage.content as Array<{ type: string }>;
      expect(parts.some((part) => part.type === "image_url")).toBe(true);
    }
  });

  test("does not duplicate image part when user turn already has an image", () => {
    const messages = buildOpenAIMessages(
      [
        {
          role: "user",
          content: "Question",
          image: {
            mimeType: "image/png",
            base64: "AAAA",
          },
        },
      ],
      ["data:image/png;base64,CCCC"],
    );

    const latest = messages[messages.length - 1];
    expect(Array.isArray(latest.content)).toBe(true);
    const parts = latest.content as Array<{ type: string }>;
    const imageParts = parts.filter((part) => part.type === "image_url");
    expect(imageParts).toHaveLength(1);
  });

  test("supports multiple images for a single user turn", () => {
    const messages = buildOpenAIMessages(
      [{ role: "user", content: "Compare these images." }],
      ["data:image/png;base64,AAAA", "data:image/png;base64,BBBB"],
    );

    const latest = messages[messages.length - 1];
    expect(Array.isArray(latest.content)).toBe(true);
    const parts = latest.content as Array<{ type: string }>;
    const imageParts = parts.filter((part) => part.type === "image_url");
    expect(imageParts).toHaveLength(2);
  });
});
