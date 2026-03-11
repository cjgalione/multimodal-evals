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
      "data:image/png;base64,AAAA",
    );

    const latest = messages[messages.length - 1];
    expect(latest.role).toBe("user");
    expect(Array.isArray(latest.content)).toBe(true);
    const parts = latest.content as Array<{ type: string }>;
    expect(parts.some((part) => part.type === "image_url")).toBe(true);
  });
});

