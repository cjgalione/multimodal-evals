import { handleChatRequest } from "@/lib/server/chat-handler";

describe("handleChatRequest", () => {
  test("validates input and returns answer payload", async () => {
    const result = await handleChatRequest(
      {
        messages: [{ role: "user", content: "What color?" }],
      },
      {
        answerFn: async () => ({
          answer: "It is red.",
          trace: {
            traceId: "t-1",
            spanId: "s-1",
            url: "https://example.com",
          },
          diagnostics: { model: "gpt-4o-mini", messageCount: 1 },
        }),
      },
    );

    expect(result.answer).toBe("It is red.");
    expect(result.trace?.traceId).toBe("t-1");
  });

  test("rejects invalid message entries", async () => {
    await expect(
      handleChatRequest(
        {
          messages: [{ role: "user", content: "" }],
        },
        {
          answerFn: async () => ({ answer: "x" }),
        },
      ),
    ).rejects.toThrow("messages contains invalid entries");
  });
});

