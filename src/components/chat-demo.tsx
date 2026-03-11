"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import Image from "next/image";
import { ChatRequestBody, ChatResponseBody, ChatTurn, TraceInfo } from "@/lib/types";

interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imagePreview?: string;
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
  const [draft, setDraft] = useState("");
  const [pendingImage, setPendingImage] = useState<UploadedImage | undefined>();
  const [activeImage, setActiveImage] = useState<UploadedImage | undefined>();
  const [loading, setLoading] = useState(false);
  const [trace, setTrace] = useState<TraceInfo | undefined>();
  const [error, setError] = useState<string | undefined>();

  const canSend = useMemo(
    () => !loading && (draft.trim().length > 0 || Boolean(pendingImage || activeImage)),
    [draft, loading, pendingImage, activeImage],
  );

  async function onImagePicked(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const image = await toUploadedImage(file);
      setPendingImage(image);
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
    const imageForRequest = pendingImage ?? activeImage;
    const userMessage: UiMessage = {
      id: id(),
      role: "user",
      content: userText,
      imagePreview: pendingImage?.previewDataUrl,
    };

    const nextTurns: ChatTurn[] = [...turns, { role: "user", content: userText }];
    setMessages((prev) => [...prev, userMessage]);
    setTurns(nextTurns);
    setLoading(true);
    setError(undefined);
    setDraft("");
    if (pendingImage) {
      setActiveImage(pendingImage);
      setPendingImage(undefined);
    }

    const body: ChatRequestBody = {
      messages: nextTurns,
      image: imageForRequest
        ? {
            mimeType: imageForRequest.mimeType,
            base64: imageForRequest.base64,
            filename: imageForRequest.filename,
          }
        : undefined,
      sessionId: buildSessionId(),
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
            <article key={message.id} className={`message ${message.role}`}>
              {message.content}
              {message.imagePreview ? (
                <Image
                  src={message.imagePreview}
                  alt="Uploaded by user"
                  width={280}
                  height={280}
                  unoptimized
                  className="preview-image"
                />
              ) : null}
            </article>
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
              onChange={onImagePicked}
              style={{ display: "none" }}
            />
            {pendingImage ? (
              <span className="badge">
                Pending: {pendingImage.filename} ({Math.round(pendingImage.byteLength / 1024)} KB)
              </span>
            ) : null}
            {activeImage ? (
              <span className="badge">
                Active context: {activeImage.filename}
              </span>
            ) : null}
            {activeImage ? (
              <button
                type="button"
                className="btn"
                onClick={() => setActiveImage(undefined)}
              >
                Clear context image
              </button>
            ) : null}
          </div>

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
