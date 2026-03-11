# Braintrust Multimodal Demo

Next.js + TypeScript demo that showcases:

- Conversational image + text chat UI.
- Braintrust tracing with image attachments via `wrapOpenAI`.
- Reproducible multimodal evals (`bt eval`).

## Environment

Create `.env.local`:

```bash
OPENAI_API_KEY=...
BRAINTRUST_API_KEY=...
BRAINTRUST_PROJECT_NAME=Multimodal Image QA Demo
# Optional
# OPENAI_MODEL=gpt-4o-mini
```

## Install and run

```bash
npm install
npm run images:generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Run tests

```bash
npm test
```

## Run evals

```bash
npm run eval
```

Machine-readable summaries:

```bash
npm run eval:jsonl
```

## Inspect traces

After eval/chat requests:

```bash
bt view logs --project "Multimodal Image QA Demo"
bt view trace --object-ref project_logs:<project-id> --trace-id <root-span-id>
bt view span --object-ref project_logs:<project-id> --id <span-row-id>
```

The API response includes `trace.traceId`, `trace.spanId`, and a trace URL that can be opened directly in Braintrust.
