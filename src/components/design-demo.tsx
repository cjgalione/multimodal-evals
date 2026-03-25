"use client";

import Image from "next/image";
import { ChangeEvent, useMemo, useState } from "react";
import {
  DesignAgentRequestBody,
  DesignAgentResponseBody,
  DesignModel,
  DesignRubricScore,
  DesignStepKey,
} from "@/lib/types";
import {
  DESIGN_STEP_LABELS,
  DESIGN_STEP_ORDER,
  nextActiveStep,
  scoreTone,
} from "@/components/design-demo-utils";

interface UploadedImage {
  mimeType: string;
  base64: string;
  filename: string;
  previewDataUrl: string;
}

const DESIGN_MODELS: readonly DesignModel[] = [
  "gpt-4o",
  "gpt-4o-mini",
  "claude-sonnet-4-5-20251022",
];

const DESIGN_PRESETS = [
  {
    filename: "hero-title-slide.png",
    label: "Hero Title",
  },
  {
    filename: "marketing-infographic.png",
    label: "Infographic",
  },
  {
    filename: "social-product-card.png",
    label: "Social Card",
  },
  {
    filename: "split-layout-slide.png",
    label: "Split Slide",
  },
  {
    filename: "metrics-dashboard.png",
    label: "Metrics",
  },
];

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
    filename: file.name || "uploaded-design.png",
    previewDataUrl: dataUrl,
  };
}

function outputForStep(
  result: DesignAgentResponseBody,
  step: DesignStepKey,
): string {
  if (step === "analysis") {
    return result.outputs.analysis;
  }
  if (step === "altText") {
    return result.outputs.altText;
  }
  return result.outputs.copySuggestions;
}

function scoreForStep(
  result: DesignAgentResponseBody,
  step: DesignStepKey,
): DesignRubricScore {
  if (step === "analysis") {
    return result.scores.analysis;
  }
  if (step === "altText") {
    return result.scores.altText;
  }
  return result.scores.copy;
}

function traceForStep(result: DesignAgentResponseBody, step: DesignStepKey) {
  if (step === "analysis") {
    return result.traces.analysis;
  }
  if (step === "altText") {
    return result.traces.altText;
  }
  return result.traces.copy;
}

export function DesignDemo() {
  const [model, setModel] = useState<DesignModel>("gpt-4o-mini");
  const [selectedPreset, setSelectedPreset] = useState<string>(DESIGN_PRESETS[0].filename);
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | undefined>();
  const [activeStep, setActiveStep] = useState<DesignStepKey>("analysis");
  const [result, setResult] = useState<DesignAgentResponseBody | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const currentPreview = useMemo(() => {
    if (uploadedImage) {
      return uploadedImage.previewDataUrl;
    }
    return `/eval-images/design/${selectedPreset}`;
  }, [selectedPreset, uploadedImage]);

  async function onUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const uploaded = await toUploadedImage(file);
      setUploadedImage(uploaded);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load image");
    } finally {
      event.target.value = "";
    }
  }

  async function runAnalysis() {
    if (loading) {
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const body: DesignAgentRequestBody = uploadedImage
        ? {
            model,
            imageBase64: uploadedImage.base64,
            mimeType: uploadedImage.mimeType,
            filename: uploadedImage.filename,
          }
        : {
            model,
            imageFilename: selectedPreset,
          };

      const response = await fetch("/api/design-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as DesignAgentResponseBody & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Design API request failed");
      }
      setResult(payload);
      setActiveStep("analysis");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown request error");
    } finally {
      setLoading(false);
    }
  }

  const currentOutput = result ? outputForStep(result, activeStep) : "";
  const currentScore = result ? scoreForStep(result, activeStep) : undefined;
  const currentTrace = result ? traceForStep(result, activeStep) : undefined;

  return (
    <main className="demo-shell">
      <section className="hero">
        <h1>Design Taste Agent + Braintrust Scoring</h1>
        <p>
          Evaluate nuanced design understanding with a 3-step multimodal agent and
          a four-dimension LLM-as-judge rubric.
        </p>
      </section>

      <section className="design-card">
        <div className="design-controls">
          <div className="control-group">
            <strong>Model</strong>
            <select
              value={model}
              onChange={(event) => setModel(event.target.value as DesignModel)}
            >
              {DESIGN_MODELS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <strong>Preset Images</strong>
            <div className="preset-grid">
              {DESIGN_PRESETS.map((preset) => (
                <button
                  key={preset.filename}
                  type="button"
                  className={`preset-btn ${!uploadedImage && selectedPreset === preset.filename ? "active" : ""}`}
                  onClick={() => {
                    setUploadedImage(undefined);
                    setSelectedPreset(preset.filename);
                  }}
                >
                  <Image
                    src={`/eval-images/design/${preset.filename}`}
                    alt={preset.label}
                    width={110}
                    height={62}
                    className="preset-thumb"
                  />
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <strong>Custom Upload</strong>
            <div className="composer-row">
              <label className="btn" htmlFor="design-upload">
                Upload image
              </label>
              <input
                id="design-upload"
                type="file"
                accept="image/*"
                onChange={onUpload}
                style={{ display: "none" }}
              />
              {uploadedImage ? (
                <button
                  type="button"
                  className="btn"
                  onClick={() => setUploadedImage(undefined)}
                >
                  Use preset
                </button>
              ) : null}
            </div>
            <div className="hint">
              {uploadedImage
                ? `Using upload: ${uploadedImage.filename}`
                : `Using preset: ${selectedPreset}`}
            </div>
          </div>

          <button
            type="button"
            className="btn primary"
            onClick={runAnalysis}
            disabled={loading}
          >
            {loading ? "Running..." : "Run Analysis"}
          </button>
          {error ? <p className="error">{error}</p> : null}
        </div>

        <div className="design-results">
          <Image
            src={currentPreview}
            alt="Selected design input"
            width={640}
            height={360}
            unoptimized={Boolean(uploadedImage)}
            className="design-preview"
          />

          <div className="trace-strip">
            <strong>Trace:</strong>
            {result?.traces.root.url ? (
              <a href={result.traces.root.url} target="_blank" rel="noreferrer">
                root
              </a>
            ) : (
              "No trace link yet"
            )}
            {currentTrace?.url ? (
              <>
                {" · "}
                <a href={currentTrace.url} target="_blank" rel="noreferrer">
                  {DESIGN_STEP_LABELS[activeStep].toLowerCase()}
                </a>
              </>
            ) : null}
          </div>

          <div className="tab-row">
            {DESIGN_STEP_ORDER.map((step) => (
              <button
                key={step}
                type="button"
                className={`tab-btn ${activeStep === step ? "active" : ""}`}
                onClick={() => setActiveStep((current) => nextActiveStep(current, step))}
              >
                {DESIGN_STEP_LABELS[step]}
              </button>
            ))}
          </div>

          <article className="design-output">
            {result ? currentOutput : "Run analysis to view step-by-step output."}
          </article>

          {currentScore ? (
            <div className="score-strip">
              {Object.entries(currentScore).map(([key, value]) => (
                <span key={key} className={`score-pill ${scoreTone(value)}`}>
                  {key}: {value.toFixed(2)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
