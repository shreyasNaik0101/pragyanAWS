# Pragyan Studio

An editable, multilingual visual-explanation studio. This implementation lives alongside the original application. It reuses the seven Remotion scene families and illustrations while moving the new preparation/export workflow into Express and independent TypeScript workers. **No Manim is used by this workflow.**

The user approved a limited AWS pilot; see [cloud pilot status](docs/CLOUD-PILOT.md) and [local verification](docs/COMPLETION.md) for exact evidence and outstanding checks.

## Run locally

Use Node.js **22.12 or newer**, npm, and Windows with an installed English system speech voice. Linux/macOS can use `espeak` on PATH. Chromium is downloaded by Remotion on the first render; allow a few minutes and internet access for that one-time download. Subsequent renders do not require hosted fonts: Noto fonts are bundled locally under their OFL licenses.

```powershell
cd C:\Users\shrey\Documents\Codex\2026-10-06\i-x20\work\GyanIntentAWS\_Pragyan_
npm ci
npm run dev
```

Open **http://localhost:3000**. Enter as Maya or Arjun. These are explicitly labeled local identities with separate private workspaces; they are not production accounts. API: `127.0.0.1:4000`. The API and worker are independent processes. State and private artifacts live under `.local/`, which is ignored by Git.

No `.env` is required locally. For customization, copy [.env.studio.example](.env.studio.example) to `.env`. Frontend variables belong in `apps/studio/.env.local`; use [its example](apps/studio/.env.example). Never copy credentials into `NEXT_PUBLIC_*` variables. Local launch commands reject `RUNTIME=aws`.

The local generation adapter supports the network and binary-search sample scripts, plus an extractive explanation of supplied text/PDF passages. It intentionally rejects arbitrary topics and non-English narration rather than pretending an AI provider was called. **Local exports are real narrated MP4 files**, rendered by Remotion on this computer. A local export is not proof that AWS rendering works.

## Use the studio

1. Choose **Explain a concept** or **Explain my material**. Try the supplied examples. Text PDFs: up to 5 MB, 30 pages, 16,000 extracted characters. Scans, encrypted PDFs and unreadable files produce explicit errors; OCR is not implemented.
2. Preparation persists a job, generates validated scenes, then narrates them. Closing the client does not cancel processing. The editor polls durable job state.
3. Select a scene, edit narration/title/visuals, rearrange scenes, and use the embedded Remotion Player. No MP4 is rendered by editing or previewing.
4. Save a new revision. Narration edits and language changes mark audio stale, mute it in previews and block export. Regenerate all stale audio or retry a particular scene. Changing a language selects a voice; it does **not** translate manually edited text.
5. Review the source passages and added-explanation labels. Approve the saved revision, then explicitly export. See real renderer progress, view the result, and download MP4/WebVTT. Links expire after 15 minutes; reopening an export refreshes them.

Limits: 8 scenes, 90 seconds, 3 exports per user per UTC day, 8 preparation/narration requests per day, one active preparation per user and one active export globally. Failures still count toward daily limits; retries are new requests. See the usage counter in the project library.

## Commands

| Command                                         | Purpose                                                                                  |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `npm run dev`                                   | Studio, local Express server and independent local worker                                |
| `npm run dev:api` / `dev:worker` / `dev:studio` | Run services independently                                                               |
| `npm run typecheck`                             | Shared code, API, workers, infrastructure, scripts and studio                            |
| `npm test`                                      | Workflow, security, reliability and CDK assertions                                       |
| `npm run build`                                 | Optimized Next.js production build                                                       |
| `npm run verify:local`                          | Real HTTP sign-in → preparation → narrated MP4 → retrieval; consumes a local export slot |
| `npx tsx scripts/render-review.ts`              | Render representative scene PNGs for visual review                                       |
| `npm run bundle:workers`                        | Package Lambda code locally                                                              |
| `npm run synth -- --quiet`                      | Generate CloudFormation locally; provisions nothing                                      |
| `npx tsx scripts/cleanup-local.ts`              | Delete temporary work/upload files older than one day                                    |

Stop `npm run dev` with Ctrl+C. Dev and production builds use separate `.next-dev` / `.next` directories to avoid Windows trace-file locks. Reopen the application after restarting; `.local` retains jobs and revisions. Local render caches are process-local, but job state is not.

## Repository map

- `apps/studio`: new Next.js editor and library.
- `packages/schema`: shared bounded Zod schemas, timings, cues and sample scripts.
- `packages/video`: trusted composition shared by the Player, local renderer and Lambda.
- `remotion-service/src/remotion/scenes`: reused and improved scene engine. React and all Remotion packages are aligned in the root workspace.
- `services/api`: Express routes and Lambda adapter.
- `services/core`: ownership, revisions, quotas, adapters and provider interfaces.
- `services/workers`: preparation, narration, submission, completion and reconciliation.
- `infra`: CDK. `.github/workflows/aws-platform.yml`: manual-only OIDC pipeline.

Original `frontend`, `backend` (FastAPI), WhatsApp integrations and old service entry points are preserved. The new studio does not route video processing through FastAPI; unrelated legacy features remain on their original path. Root `npm ci` is authoritative for the new studio and Remotion workspace. The original nested lockfile is historical; don't install a second React tree under `remotion-service`.

Read [architecture](docs/ARCHITECTURE.md), [AWS preflight](docs/AWS-PREFLIGHT.md), [deployment and teardown](docs/DEPLOYMENT.md), [costs](docs/COSTS.md), [recovery](docs/RECOVERY.md), and the [demo script](docs/DEMO.md).
