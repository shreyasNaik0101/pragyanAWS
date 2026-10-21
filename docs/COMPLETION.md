# Local implementation report — 2026-10-07

This is the local verification snapshot written before the approved AWS pilot. The current cloud deployment status and remaining checks are recorded in [CLOUD-PILOT.md](CLOUD-PILOT.md). The statements below about no AWS provisioning describe that earlier local stage.

Pragyan now has an implemented Express/TypeScript workflow, editable Next.js studio, shared Remotion composition, durable local adapters, and AWS adapters/infrastructure. Three sample projects have completed real local narrated exports. **This is not a verified AWS deployment, and interactive browser acceptance remains pending.**

All changes are in the isolated local checkout `GyanIntentAWS/_Pragyan_`, based on `3b513b9`. No commits, pushes, GitHub configuration changes, AWS resource provisioning or paid provider calls were performed. The original GyanIntentAWS source and sibling Pragyan checkout remain unchanged. Evolving Pragyan preserved its seven scene families, illustrations and provider experience; the original AWS project served as a reference. No Manim was added to the new workflow.

## Implemented

- Landing, explicit local/Cognito authentication paths, private project library, concept/material creation, text and text-PDF extraction, audience/language selection.
- Scene outline and timeline, embedded Remotion Player, scene narration/title/visual editing, JSON editing for all supported scene types, add/delete/reorder, theme/language controls, exact supporting passages and source/added-explanation labels.
- Immutable saved revisions, conflict detection, unsaved-change protection, stale-audio muting and export blocking, per-scene narration retries. Preview does not request MP4 rendering.
- Explicit approval of a saved revision before export; actual worker stages/frame progress; saved export history, signed playback/download and WebVTT captions.
- Separate Express API and preparation/narration/render/completion workers. Local state persists on disk with locking and conditional writes; cloud adapters use DynamoDB, S3 and SQS. No long-running render inside Express.
- Ownership on project/job/artifact operations; duplicate-message handling, transactional usage/concurrency reservations, durable outbox, bounded reconciliation, callback signature validation, immutable renderer inputs and conservative unknown-submission recovery.
- Project deletion protects active reservations, revokes new access, and persists cleanup work for retry after storage failure. Temporary files have cleanup/lifecycle policies.
- CDK, manual OIDC deployment workflow, private storage/media, Cognito/API Gateway, CloudWatch operational alarms and logs, budget-alert proposal and application export disable switch. These are implemented and synthesized locally, not deployed.

## Verification evidence

| Check                                                                    | Result                                                                                                    |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| TypeScript across shared packages, API, workers, scripts, CDK and studio | Pass                                                                                                      |
| Next.js optimized production build                                       | Pass                                                                                                      |
| Automated suite                                                          | 16 tests pass                                                                                             |
| Lambda packaging and CDK synthesis                                       | Pass locally; no resources provisioned                                                                    |
| Production dependency audit                                              | 0 vulnerabilities at the last audit                                                                       |
| Real local narrated exports                                              | Network, binary search and supplied equipment-handover material                                           |
| Media inspection                                                         | `ffprobe`: all H.264/AAC, 1280×720, 24 fps; WebVTT retrieved                                              |
| Scene visual review                                                      | Rendered network, code, math and material PNGs inspected; layout corrections applied                      |
| Service restart                                                          | API and worker restarted; persisted exports and fresh signed links checked by `scripts/verify-restart.ts` |
| Interactive browser                                                      | Not verified: browser policy denied localhost access; no alternate-browser workaround attempted           |
| Cloud acceptance                                                         | Not run; local-only boundary respected                                                                    |

Tests exercise bounded schema/timing/captions, document extraction and invented-source rejection, cross-user access, save/reload/conflicts, stale audio/cache invalidation, immutable exports, duplicate SQS-style deliveries, partial narration and targeted retries, daily/global quotas, invalid/replayed callbacks, stalled-job recovery, queue-send outages, and deletion with a stale job index or failed artifact removal. Worker tests use explicit provider/render doubles. They do not prove real SQS, DynamoDB, Cognito or Lambda behavior.

The HTTP export checks used the real local API, independent worker, system speech and Remotion renderer. Artifacts are ignored by Git and available under `artifacts/`:

| Example              | MP4 duration | Preparation-to-download elapsed                     | Bytes     |
| -------------------- | ------------ | --------------------------------------------------- | --------- |
| `network-local.mp4`  | 31.253 s     | 379.731 s, initial Chromium download/build included | 1,730,082 |
| `binary-local.mp4`   | 31.125 s     | 135.241 s                                           | 1,768,271 |
| `handover-local.mp4` | 27.136 s     | 74.746 s                                            | 1,528,137 |

Corresponding `.vtt` files, `local-verification.json`, `local-batch.json`, `restart-verification.json` and `review-*.png` record the local evidence. These are demonstration observations, not controlled performance benchmarks. The first network export predates the final diagram styling/caption improvements; it remains an immutable earlier export. No cloud cost-per-video measurement is claimed.

## Remaining limitations and work

1. **Browser acceptance:** manually review landing, sign-in, responsive layout, editing, Player controls, narration retry and completed-video playback. The browser connector initially failed, then explicitly denied localhost permission. Rendered composition frames and HTTP tests cover only part of the experience.
2. **Cloud acceptance:** all six checks in [DEPLOYMENT.md](DEPLOYMENT.md#cloud-acceptance-checklist) remain. Bedrock generation, Polly/Sarvam narration, Cognito sign-in, SQS retries, DynamoDB conditional behavior, CloudFront signing and Remotion Lambda rendering have not been exercised against deployed resources. There is no claim of production readiness or AWS end-to-end success.
3. **Local providers:** concept generation uses authored English network/binary-search fixtures. Material generation uses an extractive script. Arbitrary topics and non-English local narration produce an explicit unsupported message. These restrictions are intentional and visible; no paid fallback occurs. Cloud language/provider adapters exist but speech quality and availability need live verification.
4. **Authentication:** local identities are development personas. Cloud signup is invitation-only. Access tokens expire after one hour; persistent refresh sessions are not implemented. Sign-out clears the app session; complete hosted-UI session logout should be included in future Cognito browser validation.
5. **Documents and captions:** text PDFs only, no scanned-document OCR; source references establish provenance, not factual entailment. Caption timing is proportional to measured narration duration, not word-level alignment. Changing language does not translate manually edited text.
6. **Operations:** uncertain external render submissions need signed-callback recovery or an operator; automatic resubmission is deliberately disabled. Reconciliation is bounded to 100 active jobs per pass and queries the small-demo indexes; a large public deployment needs an active-job index/pagination strategy. Terminal metadata is retained, and previously issued signed URLs can remain usable until expiry, including CloudFront cached objects.
7. **Deployment and costs:** account credit coverage/expiry, model entitlement, regional concurrency and actual charges remain unverified. Hosting repository connection, OIDC bootstrapping, real signing keys, renderer role review and deployment need a future explicitly authorized scope. No cloud action is required to use the local studio.

The installed machine has Node 20.17.0, on which the checks completed. Use Node 22.12+ for reproducibility and the current dependency engine requirements; the KaTeX CLI dependency warns on Node 20. The application uses KaTeX's library path, not that CLI.

An additional read-only AWS preflight on 2026-10-07 confirmed CLI identity, $123.76 remaining account-plan credits, Nova Lite listing, Polly voice listing and a 10-concurrency Lambda quota. The infrastructure settings were adjusted for that quota. A static Amplify build from local source passed; the first paid deployment still awaits approval. See [AWS-PREFLIGHT.md](AWS-PREFLIGHT.md). This does not change the cloud acceptance status above.

Start with [STUDIO.md](../STUDIO.md), then [architecture](ARCHITECTURE.md), [costs](COSTS.md), [recovery](RECOVERY.md) and the [live-demo script](DEMO.md). Previously generated examples must be presented as cached local exports, separately from fresh generation.
