import OpenAI from "openai";
import { initLogger, wrapOpenAI } from "braintrust";
import { BRAINTRUST_GATEWAY_URL, DEMO_PROJECT_NAME } from "@/lib/config";

let loggerReady = false;
let wrappedOpenAI: OpenAI | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function ensureLogger(): void {
  if (loggerReady) {
    return;
  }
  initLogger({
    projectName: DEMO_PROJECT_NAME,
    apiKey: requireEnv("BRAINTRUST_API_KEY"),
  });
  loggerReady = true;
}

export function getOpenAIClient(): OpenAI {
  ensureLogger();
  if (wrappedOpenAI) {
    return wrappedOpenAI;
  }

  const client = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
  wrappedOpenAI = wrapOpenAI(client);
  return wrappedOpenAI;
}

/**
 * Returns an OpenAI-compatible client routed through the Braintrust gateway.
 * Supports multi-model routing: OpenAI models and Anthropic Claude models
 * are both accessible by passing the appropriate model ID.
 * Claude models require ANTHROPIC_API_KEY configured in the Braintrust org.
 */
export function getGatewayClient(): OpenAI {
  ensureLogger();
  return new OpenAI({
    baseURL: BRAINTRUST_GATEWAY_URL,
    apiKey: requireEnv("BRAINTRUST_API_KEY"),
    defaultHeaders: {
      "x-bt-use-cache": "never",
    },
  });
}

