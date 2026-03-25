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
BRAINTRUST_DESIGN_PROJECT=Design Agent - Visual Content Eval
# Optional
# OPENAI_MODEL=gpt-4o-mini
```

For Claude routing through Braintrust gateway, configure an Anthropic provider key in your Braintrust org settings.

## Install and run

```bash
npm install
npm run images:generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Design Taste Demo

Generate the design-style eval images (requires Python and Pillow):

```bash
python3 -m pip install pillow
npm run images:generate:design
```

Then open the `Design Taste Eval` tab in the app.

## Run tests

```bash
npm test
```

## Run evals

```bash
npm run eval
npm run eval:design
```

Machine-readable summaries:

```bash
npm run eval:jsonl
npm run eval:design:jsonl
```

## Inspect traces

After eval/chat requests:

```bash
bt view logs --project "Multimodal Image QA Demo"
bt view trace --object-ref project_logs:<project-id> --trace-id <root-span-id>
bt view span --object-ref project_logs:<project-id> --id <span-row-id>
```

The API response includes `trace.traceId`, `trace.spanId`, and a trace URL that can be opened directly in Braintrust.
