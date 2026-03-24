"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import Image from "next/image";
import { ChatRequestBody, ChatResponseBody, ChatTurn, TraceInfo } from "@/lib/types";

interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imagePreviews?: string[];
}

interface UploadedImage {
  mimeType: string;
  base64: string;
  filename: string;
  previewDataUrl: string;
  byteLength: number;
}

const WELCOME_MESSAGE: UiMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Upload an image and ask a question. I will keep image context for follow-up turns and return Braintrust trace metadata with each answer.",
};

function id(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function toUploadedImage(file: File): Promise<UploadedImage> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read selected image"));
    reader.readAsDataURL(file);
  });
  const [, base64 = ""] = dataUrl.split(",", 2);
  return {
    mimeType: file.type || "image/png",
    base64,
    filename: file.name,
    previewDataUrl: dataUrl,
    byteLength: file.size,
  };
}

function buildSessionId(): string {
  return `web-${Date.now()}`;
}

export function ChatDemo() {
  const [messages, setMessages] = useState<UiMessage[]>([WELCOME_MESSAGE]);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [sessionId, setSessionId] = useState(buildSessionId);
  const [traceParent, setTraceParent] = useState<string | undefined>();
  const [draft, setDraft] = useState("");
  const [pendingImages, setPendingImages] = useState<UploadedImage[]>([]);
  const [activeImages, setActiveImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [trace, setTrace] = useState<TraceInfo | undefined>();
  const [error, setError] = useState<string | undefined>();

  const canSend = useMemo(
    () => !loading && (draft.trim().length > 0 || pendingImages.length > 0 || activeImages.length > 0),
    [draft, loading, pendingImages, activeImages],
  );

  async function onImagePicked(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    try {
      const images = await Promise.all(files.map((file) => toUploadedImage(file)));
      setPendingImages((prev) => [...prev, ...images]);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load image");
    } finally {
      event.target.value = "";
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSend) {
      return;
    }

    const userText = draft.trim() || "Please analyze this image.";
    const hasPendingImages = pendingImages.length > 0;
    const imagesForTurn = hasPendingImages ? pendingImages : activeImages;
    const userMessage: UiMessage = {
      id: id(),
      role: "user",
      content: userText,
      imagePreviews: hasPendingImages
        ? pendingImages.map((image) => image.previewDataUrl)
        : undefined,
    };

    const turnIndex = turns.filter((turn) => turn.role === "user").length + 1;
    const nextTurns: ChatTurn[] = [
      ...turns,
      {
        role: "user",
        content: userText,
      },
    ];
    setMessages((prev) => [...prev, userMessage]);
    setTurns(nextTurns);
    setLoading(true);
    setError(undefined);
    setDraft("");
    if (hasPendingImages) {
      setActiveImages(pendingImages);
      setPendingImages([]);
    }

    const body: ChatRequestBody = {
      messages: nextTurns,
      images: imagesForTurn.length > 0
        ? imagesForTurn.map((image) => ({
            mimeType: image.mimeType,
            base64: image.base64,
            filename: image.filename,
          }))
        : undefined,
      image: imagesForTurn[0]
        ? {
            mimeType: imagesForTurn[0].mimeType,
            base64: imagesForTurn[0].base64,
            filename: imagesForTurn[0].filename,
          }
        : undefined,
      sessionId,
      traceParent,
      turnIndex,
    };

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as ChatResponseBody & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Chat API request failed");
      }

      const assistantMessage: UiMessage = {
        id: id(),
        role: "assistant",
        content: payload.answer,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setTurns((prev) => [...prev, { role: "assistant", content: payload.answer }]);
      setTrace(payload.trace);
      if (payload.trace?.parent) {
        setTraceParent(payload.trace.parent);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown request error");
      setMessages((prev) => [
        ...prev,
        {
          id: id(),
          role: "assistant",
          content: "I hit an error while answering. Check your API keys and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function resetConversation() {
    setMessages([WELCOME_MESSAGE]);
    setTurns([]);
    setTrace(undefined);
    setTraceParent(undefined);
    setDraft("");
    setPendingImages([]);
    setActiveImages([]);
    setError(undefined);
    setSessionId(buildSessionId());
  }

  return (
    <main className="demo-shell">
      <section className="hero">
        <h1>Multimodal Chat + Braintrust Tracing</h1>
        <p>
          This demo accepts image + text requests, keeps conversational context, and
          emits trace metadata so you can jump straight into Braintrust logs.
        </p>
        <div className="trace-strip">
          <strong>Trace:</strong>
          {trace?.url ? (
            <a href={trace.url} target="_blank" rel="noreferrer">
              open trace
            </a>
          ) : (
            "No trace link yet"
          )}
          {trace?.traceId ? ` · trace_id=${trace.traceId}` : ""}
          {trace?.spanId ? ` · span_id=${trace.spanId}` : ""}
        </div>
      </section>

      <section className="chat-card">
        <div className="chat-feed">
          {messages.map((message) => (
            <div key={message.id} className={`chat-item ${message.role}`}>
              {message.role === "user" && message.imagePreviews?.length ? (
                <div className="message-image-stack">
                  {message.imagePreviews.map((preview, index) => (
                    <Image
                      key={`${message.id}-image-${index}`}
                      src={preview}
                      alt="Uploaded by user"
                      width={220}
                      height={220}
                      unoptimized
                      className="message-image"
                    />
                  ))}
                </div>
              ) : null}
              <article className={`message ${message.role}`}>
                {message.content}
              </article>
            </div>
          ))}
        </div>

        <form className="composer" onSubmit={onSubmit}>
          <div className="composer-row">
            <label className="btn" htmlFor="image-upload">
              Attach image
            </label>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={onImagePicked}
              style={{ display: "none" }}
            />
            {pendingImages.length > 0 ? (
              <span className="badge">
                Pending: {pendingImages.length} image{pendingImages.length === 1 ? "" : "s"}
              </span>
            ) : null}
            {activeImages.length > 0 ? (
              <span className="badge">
                Active context: {activeImages.length} image{activeImages.length === 1 ? "" : "s"}
              </span>
            ) : null}
            {activeImages.length > 0 ? (
              <button
                type="button"
                className="btn"
                onClick={() => setActiveImages([])}
              >
                Clear context image
              </button>
            ) : null}
            {pendingImages.length > 0 ? (
              <button
                type="button"
                className="btn"
                onClick={() => setPendingImages([])}
              >
                Clear pending
              </button>
            ) : null}
            <button type="button" className="btn" onClick={resetConversation}>
              New conversation
            </button>
          </div>

          {(pendingImages.length > 0 || activeImages.length > 0) ? (
            <div className="context-image-panel">
              <div className="context-image-label">
                {pendingImages.length > 0
                  ? "Pending image context for next turn"
                  : "Current context image"}
              </div>
              <div className="context-image-grid">
                {(pendingImages.length > 0 ? pendingImages : activeImages).map((image, index) => (
                  <Image
                    key={`${image.filename}-${index}`}
                    src={image.previewDataUrl}
                    alt={image.filename}
                    width={220}
                    height={220}
                    unoptimized
                    className="context-image-preview"
                  />
                ))}
              </div>
            </div>
          ) : null}

          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask a visual question (e.g., 'What color is the left half of the image?')"
          />
          <div className="composer-row">
            <button className="btn primary" disabled={!canSend} type="submit">
              {loading ? "Thinking..." : "Send"}
            </button>
            <p className="hint">
              Image context stays active for follow-up turns unless cleared.
            </p>
          </div>
          {error ? <p className="error">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}
