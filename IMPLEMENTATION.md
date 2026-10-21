# Pragyan implementation checklist

All source work remains local. The user approved the limited AWS pilot in account 090208085314, us-east-1. No commits or pushes are authorized.

## Assessment — 2026-10-06

- Both original checkouts were clean on main. Pragyan baseline: `3b513b9`.
- Working copy: `GyanIntentAWS/_Pragyan_`, cloned from the existing sibling checkout. Original apps remain available.
- No AGENTS.md found in either repository or applicable workspace ancestors inspected.
- Reuse seven existing Remotion scene families, illustrations, schema, and provider experience.
- Legacy frontend: Next 16 / React 19; renderer: React 18 / Remotion 4.0.200. New studio and shared renderer align on React 19 / Remotion 4.0.533; Next 15.5.27 matches documented Amplify support.
- GitHub authentication succeeds outside the sandbox proxy. AWS identity read-only: account 090208085314, IAM user shreyas01, configured us-east-1. Credit coverage has not been verified.

## Stages

- [x] Inspect repository state, instructions, dependencies, GitHub and AWS identity.
- [x] Shared bounded scene schema, deterministic timing, revisions and immutable exports.
- [x] Express API, durable local adapters and independent workers.
- [x] Next studio implementation: authentication, library, creation, editor, Player, export.
- [x] Grounded text/PDF, multilingual provider adapters, audio invalidation and targeted retry (live English/Hindi narration verified; other languages not invoked).
- [x] DynamoDB/S3/SQS/Bedrock/Polly/Remotion Lambda adapters and reconciliation (three real cloud exports completed).
- [x] CDK, OIDC deployment workflow, private media, monitoring and cost controls (pilot stack deployed; budget email pending).
- [x] Automated failure/security tests, production build and three real local narrated exports.
- [x] Rendered scene frame inspection; code/math/diagram layout corrections.
- [ ] Interactive browser QA — browser policy denied localhost access; no workaround attempted.
- [x] Setup, architecture, cost estimate, recovery, teardown, demo and honest completion report.
- [x] AWS cloud vertical slice: temporary Cognito login, Bedrock scenes, Polly audio, persisted jobs, three Remotion Lambda exports, signed MP4/VTT retrieval, and cross-user denial.
- [ ] Complete invited-user sign-in after the user follows Cognito's temporary-password email; confirm SNS alarm subscription; interactive browser QA; and cloud cost attribution after billing settles.

## AWS preflight — 2026-10-07

- [x] Read-only CLI identity and account-plan credit check: account 090208085314, `us-east-1`, $123.76 remaining credits at check time.
- [x] Read-only model, voice, Lambda quota, existing-resource and IAM simulation checks. Lambda regional concurrency is 10; removed incompatible reserved-concurrency settings.
- [x] Validated a local static studio export and ZIP for manual Amplify hosting without a GitHub commit or connection.
- [x] Prepared guarded manual-hosting/deployment scripts, local media signing key and scoped Remotion role policy.
- [x] Presented resource scope, cost assumptions and teardown in [AWS-PREFLIGHT.md](docs/AWS-PREFLIGHT.md).
- [x] User approved the reviewed account, region and pilot scope; manual Amplify, renderer and backend stack deployed without GitHub writes.
- [x] API health 200; unauthenticated project route 401; private CloudFront media probe unsigned 403 and signed 200; Amplify root 200.
- [x] Three approved cloud exports completed, with exports disabled again afterward. See [CLOUD-PILOT.md](docs/CLOUD-PILOT.md).
- [x] Cognito invitation and $15 monthly budget with 50/80/100% actual-cost notices configured; SNS operational subscription awaits email confirmation.

Preflight itself was read-only; the approved deployment followed it. Original Git HEAD is still `3b513b9`.

## Final local verification — 2026-10-07

17 tests pass, including ownership, stale narration, immutable revisions, duplicate queue messages/callbacks, outbox recovery, cross-user concurrency, deletion races, recoverable cleanup, and generated diagram bounds. Three real local and three real AWS H.264/AAC exports with captions are saved under ignored `artifacts/`. See [CLOUD-PILOT.md](docs/CLOUD-PILOT.md) for cloud results and remaining limitations. No new Git commits or remote writes.
