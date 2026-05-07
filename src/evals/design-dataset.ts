import {
  DesignEvalCase,
  DesignEvalExpected,
  DesignEvalInput,
  DesignEvalMetadata,
} from "@/lib/evals/design-types";
import { DesignStepKey } from "@/lib/types";

function caseRow(
  case_id: string,
  imageFilename: string,
  stepName: DesignStepKey,
  expected: DesignEvalExpected,
  metadata: Omit<DesignEvalMetadata, "case_id">,
): DesignEvalCase {
  const input: DesignEvalInput = {
    imageFilename,
    stepName,
  };

  return {
    input,
    expected,
    metadata: {
      case_id,
      ...metadata,
    },
  };
}

export function createDesignEvalDataset(): DesignEvalCase[] {
  return [
    caseRow(
      "hero-1",
      "hero-title-slide.png",
      "analysis",
      {
        should_mention: ["gradient", "headline", "title slide"],
        should_not_mention: ["red square", "bar chart"],
      },
      {
        image_type: "hero-title-slide",
        design_elements: ["gradient background", "bold headline", "subtitle", "accent line"],
        difficulty: "medium",
      },
    ),
    caseRow(
      "hero-2",
      "hero-title-slide.png",
      "altText",
      {
        should_mention: ["Scale Your Marketing With AI", "subtitle", "logo"],
        should_not_mention: ["earbuds", "Q4 2024"],
      },
      {
        image_type: "hero-title-slide",
        design_elements: ["headline copy", "subtitle copy", "brand placeholder"],
        difficulty: "medium",
      },
    ),
    caseRow(
      "infographic-1",
      "marketing-infographic.png",
      "analysis",
      {
        should_mention: ["infographic", "3 reasons", "stat blocks"],
        should_not_mention: ["split layout", "wireless earbuds"],
      },
      {
        image_type: "marketing-infographic",
        design_elements: ["teal header", "orange stats", "icon circles"],
        difficulty: "easy",
      },
    ),
    caseRow(
      "infographic-2",
      "marketing-infographic.png",
      "copy",
      {
        should_mention: ["3 Reasons Brands Trust AI", "47%", "89%"],
        should_not_mention: ["Shop Now", "churn"],
      },
      {
        image_type: "marketing-infographic",
        design_elements: ["headline optimization", "stat phrasing"],
        difficulty: "medium",
      },
    ),
    caseRow(
      "social-1",
      "social-product-card.png",
      "analysis",
      {
        should_mention: ["square social card", "badge", "CTA button"],
        should_not_mention: ["line chart", "bullet list"],
      },
      {
        image_type: "social-product-card",
        design_elements: ["coral background", "launch badge", "cta"],
        difficulty: "easy",
      },
    ),
    caseRow(
      "social-2",
      "social-product-card.png",
      "copy",
      {
        should_mention: ["ProMax Wireless Earbuds", "Shop Now", "NEW LAUNCH"],
        should_not_mention: ["satisfaction", "Q4 2024"],
      },
      {
        image_type: "social-product-card",
        design_elements: ["product headline", "cta microcopy"],
        difficulty: "medium",
      },
    ),
    caseRow(
      "split-1",
      "split-layout-slide.png",
      "analysis",
      {
        should_mention: ["split layout", "left", "right", "bullet points"],
        should_not_mention: ["orange stat blocks", "monthly bars"],
      },
      {
        image_type: "split-layout-slide",
        design_elements: ["two-column layout", "divider", "content hierarchy"],
        difficulty: "medium",
      },
    ),
    caseRow(
      "split-2",
      "split-layout-slide.png",
      "altText",
      {
        should_mention: ["Why Choose Us", "left panel text", "right visual panel"],
        should_not_mention: ["wireless earbuds", "127K users"],
      },
      {
        image_type: "split-layout-slide",
        design_elements: ["headline", "support bullets", "visual placeholder"],
        difficulty: "medium",
      },
    ),
    caseRow(
      "metrics-1",
      "metrics-dashboard.png",
      "analysis",
      {
        should_mention: ["dashboard", "KPI boxes", "bar chart", "Q4 2024 Performance"],
        should_not_mention: ["launch badge", "Shop Now"],
      },
      {
        image_type: "metrics-dashboard",
        design_elements: ["dark theme", "kpi cards", "monthly chart"],
        difficulty: "hard",
      },
    ),
    caseRow(
      "metrics-2",
      "metrics-dashboard.png",
      "copy",
      {
        should_mention: ["Revenue: $2.4M", "Users: 127K", "Churn: 3.2%"],
        should_not_mention: ["subtitle", "title slide"],
      },
      {
        image_type: "metrics-dashboard",
        design_elements: ["data storytelling", "kpi language"],
        difficulty: "hard",
      },
    ),
  ];
}
