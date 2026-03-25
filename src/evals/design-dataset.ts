import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageRef } from "@/lib/types";
import { DesignEvalInput, DesignEvalExpected } from "@/lib/evals/design-scorers";

const DESIGN_IMAGE_DIR = join(process.cwd(), "public", "eval-images", "design");

const imageCache = new Map<string, string>();

function loadImageBase64(fileName: string): string {
  if (imageCache.has(fileName)) return imageCache.get(fileName)!;
  const buffer = readFileSync(join(DESIGN_IMAGE_DIR, fileName));
  const base64 = buffer.toString("base64");
  imageCache.set(fileName, base64);
  return base64;
}

function designImage(fileName: string): ImageRef {
  return {
    mimeType: "image/png",
    filename: fileName,
    base64: loadImageBase64(fileName),
  };
}

export interface DesignEvalCase {
  input: DesignEvalInput;
  expected: DesignEvalExpected;
  metadata: {
    case_id: string;
    image_type: string;
    design_elements: string[];
    difficulty: "easy" | "medium" | "hard";
  };
}

export function createDesignEvalDataset(): DesignEvalCase[] {
  return [
    // ── Hero Title Slide ────────────────────────────────────────────────────
    {
      input: {
        image: designImage("hero-title-slide.png"),
        model: "gpt-4o",
        imageFilename: "hero-title-slide.png",
      },
      expected: {
        should_mention: ["gradient", "headline", "teal", "white"],
        should_not_mention: ["red square", "green bar", "bar chart"],
      },
      metadata: {
        case_id: "hero-1",
        image_type: "hero-title-slide",
        design_elements: ["navy-purple gradient", "bold white headline", "teal accent line", "subtitle"],
        difficulty: "medium",
      },
    },
    {
      input: {
        image: designImage("hero-title-slide.png"),
        model: "gpt-4o-mini",
        imageFilename: "hero-title-slide.png",
      },
      expected: {
        should_mention: ["gradient", "headline", "teal", "white"],
        should_not_mention: ["red square", "orange", "infographic"],
      },
      metadata: {
        case_id: "hero-2",
        image_type: "hero-title-slide",
        design_elements: ["navy-purple gradient", "bold white headline", "teal accent line", "subtitle"],
        difficulty: "medium",
      },
    },

    // ── Marketing Infographic ───────────────────────────────────────────────
    {
      input: {
        image: designImage("marketing-infographic.png"),
        model: "gpt-4o",
        imageFilename: "marketing-infographic.png",
      },
      expected: {
        should_mention: ["teal", "orange", "percent", "infographic"],
        should_not_mention: ["gradient background", "dark background", "hero"],
      },
      metadata: {
        case_id: "infographic-1",
        image_type: "marketing-infographic",
        design_elements: ["teal header", "orange stat blocks", "white background", "3 KPIs"],
        difficulty: "medium",
      },
    },
    {
      input: {
        image: designImage("marketing-infographic.png"),
        model: "gpt-4o-mini",
        imageFilename: "marketing-infographic.png",
      },
      expected: {
        should_mention: ["teal", "47", "3x", "89"],
        should_not_mention: ["gradient background", "dark background", "presentation"],
      },
      metadata: {
        case_id: "infographic-2",
        image_type: "marketing-infographic",
        design_elements: ["teal header", "orange stat blocks", "white background", "3 KPIs"],
        difficulty: "hard",
      },
    },

    // ── Social Product Card ─────────────────────────────────────────────────
    {
      input: {
        image: designImage("social-product-card.png"),
        model: "gpt-4o",
        imageFilename: "social-product-card.png",
      },
      expected: {
        should_mention: ["coral", "button", "earbuds", "product"],
        should_not_mention: ["bar chart", "bullet points", "gradient background"],
      },
      metadata: {
        case_id: "social-1",
        image_type: "social-product-card",
        design_elements: ["coral background", "product image placeholder", "CTA button", "NEW LAUNCH badge"],
        difficulty: "medium",
      },
    },
    {
      input: {
        image: designImage("social-product-card.png"),
        model: "gpt-4o-mini",
        imageFilename: "social-product-card.png",
      },
      expected: {
        should_mention: ["coral", "button", "product"],
        should_not_mention: ["infographic", "bar chart", "split"],
      },
      metadata: {
        case_id: "social-2",
        image_type: "social-product-card",
        design_elements: ["coral background", "product image placeholder", "CTA button", "NEW LAUNCH badge"],
        difficulty: "medium",
      },
    },

    // ── Split Layout Slide ──────────────────────────────────────────────────
    {
      input: {
        image: designImage("split-layout-slide.png"),
        model: "gpt-4o",
        imageFilename: "split-layout-slide.png",
      },
      expected: {
        should_mention: ["two", "left", "right", "bullet"],
        should_not_mention: ["infographic", "product", "coral"],
      },
      metadata: {
        case_id: "split-1",
        image_type: "split-layout-slide",
        design_elements: ["two-column layout", "dark left panel", "blue right panel", "bullet points"],
        difficulty: "medium",
      },
    },
    {
      input: {
        image: designImage("split-layout-slide.png"),
        model: "gpt-4o-mini",
        imageFilename: "split-layout-slide.png",
      },
      expected: {
        should_mention: ["split", "dark", "text"],
        should_not_mention: ["coral background", "bar chart", "stats"],
      },
      metadata: {
        case_id: "split-2",
        image_type: "split-layout-slide",
        design_elements: ["two-column layout", "dark left panel", "blue right panel", "bullet points"],
        difficulty: "hard",
      },
    },

    // ── Metrics Dashboard ───────────────────────────────────────────────────
    {
      input: {
        image: designImage("metrics-dashboard.png"),
        model: "gpt-4o",
        imageFilename: "metrics-dashboard.png",
      },
      expected: {
        should_mention: ["chart", "bar", "dark", "metric"],
        should_not_mention: ["white background", "coral", "infographic"],
      },
      metadata: {
        case_id: "metrics-1",
        image_type: "metrics-dashboard",
        design_elements: ["dark charcoal background", "bar chart", "KPI boxes", "indigo/purple accents"],
        difficulty: "hard",
      },
    },
    {
      input: {
        image: designImage("metrics-dashboard.png"),
        model: "gpt-4o-mini",
        imageFilename: "metrics-dashboard.png",
      },
      expected: {
        should_mention: ["chart", "dark", "revenue"],
        should_not_mention: ["white background", "product", "earbuds"],
      },
      metadata: {
        case_id: "metrics-2",
        image_type: "metrics-dashboard",
        design_elements: ["dark charcoal background", "bar chart", "KPI boxes", "indigo/purple accents"],
        difficulty: "hard",
      },
    },
  ];
}
