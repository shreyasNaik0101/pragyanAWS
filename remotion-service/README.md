# Remotion Video Service

Replaces Manim with Remotion-based rendering for Gyan_Pragyan.

## Endpoints

- `GET /health` — liveness
- `POST /render` — body `{ concept, explanation?, language?, jobId? }` → `{ jobId, status }`
- `GET /status/:jobId` — `{ jobId, status, progress, video_url, error_message }`
- `GET /videos/:file.mp4` — rendered MP4

## Environment

- `PORT` (default `3005`)
- `PUBLIC_BASE_URL` (default `http://localhost:${PORT}`) — used in `video_url`
- `OPENAI_API_KEY` (optional) — if set, uses GPT to craft the script; otherwise a deterministic fallback script is used.
- `OPENAI_MODEL` (default `gpt-4o-mini`)

## Run

```bash
npm install
npm start
```

First request triggers a one-time Remotion bundle (takes ~30–60s). Subsequent renders are fast.

## Architecture

- `src/server.ts` — Express API, in-memory job queue
- `src/script.ts` — OpenAI-backed (or fallback) script generator
- `src/render.ts` — programmatic Remotion bundler + renderer
- `src/remotion/` — React compositions (Root, EducationalVideo)
