import OpenAI from "openai";
import { initLogger, wrapOpenAI } from "braintrust";
import { DEMO_PROJECT_NAME } from "@/lib/config";

let loggerReady = false;
let wrappedOpenAI: OpenAI | null = null;
let wrappedGatewayOpenAI: OpenAI | null = null;

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

export function getGatewayClient(): OpenAI {
  ensureLogger();
  if (wrappedGatewayOpenAI) {
    return wrappedGatewayOpenAI;
  }

  const client = new OpenAI({
    baseURL: "https://gateway.braintrust.dev/v1/proxy",
    apiKey: requireEnv("BRAINTRUST_API_KEY"),
  });
  wrappedGatewayOpenAI = wrapOpenAI(client);
  return wrappedGatewayOpenAI;
}
