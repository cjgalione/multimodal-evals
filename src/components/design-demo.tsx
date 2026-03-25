"use client";

import { ChangeEvent, useState } from "react";
import Image from "next/image";
import { DesignAgentResponse, DesignRubricScore } from "@/lib/types";

const BUILTIN_IMAGES = [
  { filename: "hero-title-slide.png", label: "Hero Slide" },
  { filename: "marketing-infographic.png", label: "Infographic" },
  { filename: "social-product-card.png", label: "Social Card" },
  { filename: "split-layout-slide.png", label: "Split Layout" },
  { filename: "metrics-dashboard.png", label: "Dashboard" },
] as const;

const MODELS = [
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4o-mini", label: "GPT-4o mini" },
  { id: "claude-sonnet-4-5-20251022", label: "Claude Sonnet 4.5" },
] as const;

type Tab = "analysis" | "altText" | "copy";

const TAB_LABELS: Record<Tab, string> = {
  analysis: "Analyze",
  altText: "Alt Text",
  copy: "Copy Suggestions",
};

function scoreColor(score: number): string {
  if (score >= 0.8) return "#059669";
  if (score >= 0.5) return "#d97706";
  return "#dc2626";
}

function ScorePill({ label, score }: { label: string; score: number }) {
  const color = scoreColor(score);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        padding: "0.2rem 0.6rem",
        borderRadius: "999px",
        border: `1px solid ${color}`,
        background: `${color}18`,
        color,
        fontSize: "0.78rem",
        fontFamily: "ui-monospace, Menlo, monospace",
        fontWeight: 600,
      }}
    >
      {label}: {score.toFixed(2)}
    </span>
  );
}

function ScoreStrip({ scores }: { scores: DesignRubricScore }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginTop: "0.75rem" }}>
      <ScorePill label="visual_specificity" score={scores.visual_specificity} />
      <ScorePill label="design_sensibility" score={scores.design_sensibility} />
      <ScorePill label="accessibility_value" score={scores.accessibility_value} />
      <ScorePill label="no_hallucination" score={scores.no_hallucination} />
    </div>
  );
}

interface UploadedImage {
  base64: string;
  mimeType: string;
  filename: string;
  previewDataUrl: string;
}

export function DesignDemo() {
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [model, setModel] = useState<string>("gpt-4o");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DesignAgentResponse | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("analysis");
  const [error, setError] = useState<string | undefined>();

  const selectedImage = uploadedImage
    ? uploadedImage.filename
    : selectedFilename;

  async function onImagePicked(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Could not read image"));
      reader.readAsDataURL(file);
    });
    const [, base64 = ""] = dataUrl.split(",", 2);
    setUploadedImage({
      base64,
      mimeType: file.type || "image/png",
      filename: file.name,
      previewDataUrl: dataUrl,
    });
    setSelectedFilename(null);
    setResult(null);
    e.target.value = "";
  }

  async function runAnalysis() {
    if (!selectedImage) return;
    setLoading(true);
    setError(undefined);
    setResult(null);

    const body = uploadedImage
      ? {
          imageBase64: uploadedImage.base64,
          imageMimeType: uploadedImage.mimeType,
          model,
        }
      : { imageFilename: selectedFilename, model };

    try {
      const resp = await fetch("/api/design-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await resp.json()) as DesignAgentResponse & { error?: string };
      if (!resp.ok) throw new Error(data.error ?? "Request failed");
      setResult(data);
      setActiveTab("analysis");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const tabContent: Record<Tab, string> = {
    analysis: result?.output.analysis ?? "",
    altText: result?.output.altText ?? "",
    copy: result?.output.copySuggestions ?? "",
  };

  const tabScores: Record<Tab, DesignRubricScore | undefined> = {
    analysis: result?.scores.analysis,
    altText: result?.scores.altText,
    copy: result?.scores.copy,
  };

  return (
    <main className="demo-shell">
      <section className="hero">
        <h1>Design Agent + Braintrust LLM-as-Judge</h1>
        <p>
          Pick a design image and a model. The agent runs a 3-step pipeline: visual analysis,
          accessibility alt text, and copy suggestions. Each step is scored by an LLM judge
          on 4 dimensions — demonstrating taste-based evaluation that deterministic scoring
          cannot capture.
        </p>
        <div className="trace-strip">
          <strong>Trace:</strong>
          {result?.traceUrl ? (
            <a href={result.traceUrl} target="_blank" rel="noreferrer">
              open trace
            </a>
          ) : (
            "No trace yet"
          )}
        </div>
      </section>

      <section className="chat-card" style={{ padding: "1.2rem" }}>
        {/* Image selector */}
        <div style={{ marginBottom: "1rem" }}>
          <p style={{ margin: "0 0 0.6rem", fontWeight: 600, fontSize: "0.9rem" }}>
            Select a design image
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
            {BUILTIN_IMAGES.map(({ filename, label }) => (
              <button
                key={filename}
                className={`btn${selectedFilename === filename && !uploadedImage ? " primary" : ""}`}
                onClick={() => {
                  setSelectedFilename(filename);
                  setUploadedImage(null);
                  setResult(null);
                }}
              >
                {label}
              </button>
            ))}
            <label className="btn" style={{ cursor: "pointer" }}>
              Upload image
              <input
                type="file"
                accept="image/*"
                onChange={onImagePicked}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {/* Image preview */}
          {selectedFilename && !uploadedImage && (
            <Image
              src={`/eval-images/design/${selectedFilename}`}
              alt={selectedFilename}
              width={360}
              height={220}
              unoptimized
              style={{
                borderRadius: "10px",
                border: "1px solid var(--border)",
                objectFit: "cover",
                width: "auto",
                maxWidth: "100%",
                maxHeight: "220px",
              }}
            />
          )}
          {uploadedImage && (
            <Image
              src={uploadedImage.previewDataUrl}
              alt={uploadedImage.filename}
              width={360}
              height={220}
              unoptimized
              style={{
                borderRadius: "10px",
                border: "1px solid var(--border)",
                objectFit: "cover",
                width: "auto",
                maxWidth: "100%",
                maxHeight: "220px",
              }}
            />
          )}
        </div>

        {/* Model selector */}
        <div style={{ marginBottom: "1rem" }}>
          <p style={{ margin: "0 0 0.6rem", fontWeight: 600, fontSize: "0.9rem" }}>
            Select model
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {MODELS.map(({ id, label }) => (
              <button
                key={id}
                className={`btn${model === id ? " primary" : ""}`}
                onClick={() => setModel(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Run button */}
        <button
          className="btn primary"
          disabled={!selectedImage || loading}
          onClick={runAnalysis}
          style={{ marginBottom: "1rem" }}
        >
          {loading ? "Running pipeline..." : "Run Analysis"}
        </button>

        {error && <p className="error">{error}</p>}

        {/* Results */}
        {result && (
          <div>
            {/* Tabs */}
            <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.75rem" }}>
              {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
                <button
                  key={tab}
                  className={`btn${activeTab === tab ? " primary" : ""}`}
                  onClick={() => setActiveTab(tab)}
                  style={{ fontSize: "0.85rem" }}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "1rem",
                whiteSpace: "pre-wrap",
                lineHeight: 1.55,
                fontSize: "0.93rem",
                minHeight: "120px",
              }}
            >
              {tabContent[activeTab]}
            </div>

            {/* Score strip for active tab */}
            {tabScores[activeTab] && (
              <ScoreStrip scores={tabScores[activeTab]!} />
            )}
          </div>
        )}
      </section>
    </main>
  );
}
