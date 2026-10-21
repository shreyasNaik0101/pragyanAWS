# AWS pilot record — 2026-10-07

The user approved a three-export pilot in AWS account `090208085314`, `us-east-1`. All source changes remain in this isolated local checkout. There was no GitHub commit, push, or repository connection. The three approved exports completed, and `exportsEnabled=false` was deployed again. Preparation and narration remain available under application quotas. An invited Cognito user, monthly budget notifications, and confirmed operational SNS email subscription are configured.

## Live resources

| Component | Identifier |
| --- | --- |
| Static studio | https://pilot.d2j6nnossg436y.amplifyapp.com/ (manual Amplify app `d2j6nnossg436y`, branch `pilot`) |
| Express API | https://x76kf7xy61.execute-api.us-east-1.amazonaws.com |
| CDK stack | `PragyanDemo` |
| Cognito pool/client | `us-east-1_txEMGh6df` / `ijo37v6cvbu0f175em90knb52` |
| Private media | S3 `pragyandemo-mediaa721a567-nme0ebrg74h5`; CloudFront `d1hne4rlm3cku3.cloudfront.net` |
| Remotion renderer | Lambda `remotion-render-4-0-533-mem2048mb-disk2048mb-240sec`; bucket `remotionlambda-useast1-pragyan-pilot-090208085314` |
| State | DynamoDB `PragyanDemo-State1C20CC9A-XOUBT57NG1PT` |

The renderer bucket allows public reads only under `sites/*`, which holds the trusted versioned Remotion bundle. Outputs under `renders/*` are private. The pre-existing account bucket `remotionlambda-useast1-gyanpragyan` had a public whole-bucket read policy and was left untouched and unused. The dedicated pilot bucket has BucketOwnerEnforced ownership, SSE-S3, TLS-only access, and one-day render cleanup.

## Verified live behavior

- CloudFormation deployments completed. `GET /api/health` returned 200, an unauthenticated project request returned 401, and the studio's CORS preflight returned 204. The manually deployed static studio returned 200.
- A temporary Cognito user signed in using SRP and accessed protected API routes. Temporary `.invalid` users were deleted after tests; no real user was invited.
- CloudFront returned 403 without a signature and 200 with a short-lived signed URL. Narration, final MP4, and VTT were fetched through authorized artifact URLs. The media probe object was deleted.
- Bedrock Nova Lite produced validated scenes and Polly synthesized narration for English concept, algorithm, and source-grounded material projects. A separate Hindi preparation used Polly Kajal with `hi-IN`; audio delivery worked, but pronunciation was not reviewed by a speaker.
- Three real Remotion Lambda exports completed: network (26.837 s, 1,474,343 bytes), binary search (41.417 s, 3,000,620 bytes), and source-grounded equipment handover (25.75 s, 1,880,348 bytes). All were checked with `ffprobe` as 1280×720, 24 fps, H.264/AAC and downloaded with WebVTT captions. See ignored `artifacts/*-cloud-export.json` and MP4/VTT files.
- The binary-search test showed same-key export idempotency, a second concurrent export rejected with 429, and cross-user project/artifact reads rejected with 404. The handover revision referenced three extracted source passages. The export used its saved snapshot.
- The first render completed at the vendor but reconciliation initially failed to parse its path-style S3 output URL. The parser was fixed, deployed, and the persisted job reconciled to completion without a second render. Its API-to-download observation was 493 s including that recovery. The next exports took 84 s and 61 s respectively. These are three pilot observations, not a latency guarantee.
- A Hindi tool response failed schema validation once; bounded retry returned a valid revision. A later English preparation failed after both full-outline attempts. The generator now falls back to three smaller scene calls; that fallback is pending its next live verification.
- A controlled cloud narration test changed one saved scene to an overlong script. Its narration job failed visibly and marked that scene's audio failed. After shortening the narration, a targeted retry completed and all scene audio returned to ready. See ignored `artifacts/cloud-recovery.json`. The temporary project/user were deleted.
- The provided email was invited through Cognito and is in `FORCE_CHANGE_PASSWORD`; Cognito sent its temporary sign-in details. The $15 monthly AWS Budget `Pragyan-experiment` is active with actual-cost notices at 50%, 80%, and 100%. The budget has the email subscriber configured. The separate SNS subscription for operational alarms is confirmed.

CloudWatch records job IDs, stages, token usage, and Lambda durations without document bodies. The first renderer emitted signed media URLs at INFO; the later `warn` renderer setting suppressed those download lines. Those original URLs had a 15-minute expiry. Seven-day log retention is configured. A sampled handover frame revealed diagram cards at the edge; generated diagram coordinates are now clamped inside the composition for new revisions. The already exported snapshot is intentionally unchanged.

Browser interaction was not verified: the browser tool denied access to this app earlier, and no alternate browser route was used. Closing and reopening the browser during a running job has not been observed directly; persistence across Lambda invocations/redeployment and API polling was observed. Completion callback rejection, duplicate queue delivery, stalled-job handling, and other fault cases have automated local tests. The controlled cloud narration failure/retry above was verified.

## Controls and remaining acceptance

The account's Lambda concurrency quota is 10. SQS event sources cap worker concurrency at two, the app admits one active export globally and three exports per user per UTC day, and renders use at most two chunks. `exportsEnabled=false` is now deployed. Do not enable additional exports without a newly reviewed scope. The budget alert does not impose a hard spending limit. SNS operational alarm delivery is confirmed.

The account-plan API reported $123.76 credits before the pilot. Credit eligibility and expiry remain unknown. Cost Explorer reported zero same-day charges during the pilot, which is billing lag, **not** evidence of zero cost. See [COSTS.md](COSTS.md) for measured renderer consumption and planning limits. Sarvam was not invoked.

## Teardown

Follow [DEPLOYMENT.md](DEPLOYMENT.md) in the reviewed order. Keep exports disabled, inspect active jobs and needed downloads, delete the manual Amplify app and dedicated renderer function/site/bucket, then destroy `PragyanDemo`. The DynamoDB table, media bucket, and Cognito pool have retain policies; inspect them and remove them explicitly if a complete teardown is intended. Do not run broad account cleanup against the pre-existing Remotion bucket.
