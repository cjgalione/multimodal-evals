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

  test("passes through traceParent and turnIndex", async () => {
    let seenTraceParent: string | undefined;
    let seenTurnIndex: number | undefined;

    await handleChatRequest(
      {
        messages: [{ role: "user", content: "hello" }],
        traceParent: "project_logs:demo-span",
        turnIndex: 2,
      },
      {
        answerFn: async (input) => {
          seenTraceParent = input.traceParent;
          seenTurnIndex = input.turnIndex;
          return { answer: "ok" };
        },
      },
    );

    expect(seenTraceParent).toBe("project_logs:demo-span");
    expect(seenTurnIndex).toBe(2);
  });

  test("falls back to stored session trace parent", async () => {
    let seenTraceParent: string | undefined;
    let storedSessionId: string | undefined;
    let storedParent: string | undefined;

    await handleChatRequest(
      {
        messages: [{ role: "user", content: "hello" }],
        sessionId: "session-1",
      },
      {
        answerFn: async (input) => {
          seenTraceParent = input.traceParent;
          return {
            answer: "ok",
            trace: { parent: "stored-parent" },
          };
        },
        getSessionTraceParentFn: () => "stored-parent",
        setSessionTraceParentFn: (sessionId, traceParent) => {
          storedSessionId = sessionId;
          storedParent = traceParent;
        },
      },
    );

    expect(seenTraceParent).toBe("stored-parent");
    expect(storedSessionId).toBe("session-1");
    expect(storedParent).toBe("stored-parent");
  });

  test("reuses stored trace parent for later calls in same session", async () => {
    const sessionId = `session-${Date.now()}-${Math.random()}`;
    const seenTraceParents: Array<string | undefined> = [];

    await handleChatRequest(
      {
        messages: [{ role: "user", content: "turn one" }],
        sessionId,
      },
      {
        answerFn: async (input) => {
          seenTraceParents.push(input.traceParent);
          return {
            answer: "ok",
            trace: { parent: "session-parent-1" },
          };
        },
      },
    );

    await handleChatRequest(
      {
        messages: [{ role: "user", content: "turn two" }],
        sessionId,
      },
      {
        answerFn: async (input) => {
          seenTraceParents.push(input.traceParent);
          return { answer: "ok" };
        },
      },
    );

    expect(seenTraceParents).toEqual([undefined, "session-parent-1"]);
  });

  test("keeps session trace parent when an intermediate turn errors", async () => {
    const sessionId = `session-${Date.now()}-${Math.random()}`;

    await handleChatRequest(
      {
        messages: [{ role: "user", content: "turn one" }],
        sessionId,
      },
      {
        answerFn: async () => ({
          answer: "ok",
          trace: { parent: "session-parent-2" },
        }),
      },
    );

    await expect(
      handleChatRequest(
        {
          messages: [{ role: "user", content: "turn two" }],
          sessionId,
        },
        {
          answerFn: async () => {
            throw new Error("simulated model failure");
          },
        },
      ),
    ).rejects.toThrow("simulated model failure");

    let seenTraceParent: string | undefined;
    await handleChatRequest(
      {
        messages: [{ role: "user", content: "turn three" }],
        sessionId,
      },
      {
        answerFn: async (input) => {
          seenTraceParent = input.traceParent;
          return { answer: "ok" };
        },
      },
    );

    expect(seenTraceParent).toBe("session-parent-2");
  });

  test("rejects invalid turnIndex", async () => {
    await expect(
      handleChatRequest(
        {
          messages: [{ role: "user", content: "hello" }],
          turnIndex: 0,
        },
        {
          answerFn: async () => ({ answer: "x" }),
        },
      ),
    ).rejects.toThrow("turnIndex must be a positive integer");
  });

  test("rejects invalid sessionId", async () => {
    await expect(
      handleChatRequest(
        {
          messages: [{ role: "user", content: "hello" }],
          sessionId: "   ",
        },
        {
          answerFn: async () => ({ answer: "x" }),
        },
      ),
    ).rejects.toThrow("sessionId must be a non-empty string");
  });

  test("rejects invalid image payload in messages", async () => {
    await expect(
      handleChatRequest(
        {
          messages: [
            {
              role: "user",
              content: "hello",
              image: { mimeType: "image/png", base64: "" },
            },
          ],
        },
        {
          answerFn: async () => ({ answer: "x" }),
        },
      ),
    ).rejects.toThrow("messages contains invalid entries");
  });

  test("passes through top-level images array", async () => {
    let seenImageCount = 0;

    await handleChatRequest(
      {
        messages: [{ role: "user", content: "compare" }],
        images: [
          { mimeType: "image/png", base64: "AAAA" },
          { mimeType: "image/png", base64: "BBBB" },
        ],
      },
      {
        answerFn: async (input) => {
          seenImageCount = input.images?.length ?? 0;
          return { answer: "ok" };
        },
      },
    );

    expect(seenImageCount).toBe(2);
  });

  test("rejects invalid top-level images payload", async () => {
    await expect(
      handleChatRequest(
        {
          messages: [{ role: "user", content: "hello" }],
          images: [],
        },
        {
          answerFn: async () => ({ answer: "x" }),
        },
      ),
    ).rejects.toThrow("images must be a non-empty array of image payloads");
  });
});
