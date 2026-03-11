const SESSION_TTL_MS = 6 * 60 * 60 * 1000;

interface ConversationState {
  traceParent: string;
  updatedAt: number;
}

const sessionState = new Map<string, ConversationState>();

function pruneExpired(): void {
  const now = Date.now();
  for (const [sessionId, value] of sessionState.entries()) {
    if (now - value.updatedAt > SESSION_TTL_MS) {
      sessionState.delete(sessionId);
    }
  }
}

export function getSessionTraceParent(sessionId: string): string | undefined {
  pruneExpired();
  const value = sessionState.get(sessionId);
  if (!value) {
    return undefined;
  }
  value.updatedAt = Date.now();
  return value.traceParent;
}

export function setSessionTraceParent(
  sessionId: string,
  traceParent: string,
): void {
  if (!sessionId.trim() || !traceParent.trim()) {
    return;
  }
  sessionState.set(sessionId, {
    traceParent: traceParent.trim(),
    updatedAt: Date.now(),
  });
}
