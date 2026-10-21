# Troubleshooting and recovery

## Local

| Symptom                            | Diagnosis and recovery                                                                                                                                                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Studio loads but requests fail     | API must run on `127.0.0.1:4000`; use `npm run dev` or the three individual commands. Check `/api/health`.                                                                                                                                                    |
| Job stays queued                   | Independent worker is stopped. Restart `npm run dev:worker`; it reads `.local/state.json`. Browser reopening alone does not run a worker.                                                                                                                     |
| Unsupported topic/language         | Local fixture mode deliberately supports English network/binary samples and extractive material. Select a sample, or configure cloud providers only after approval. No paid fallback happens silently.                                                        |
| Narration failed                   | Inspect the scene error. Windows needs an installed English system speech voice; other OSes need `espeak`. Shorten scenes exceeding 30 seconds. Save, then retry the affected scene.                                                                          |
| Test a partial failure             | Stop the local worker, set `LOCAL_FAIL_NARRATION=1`, restart and prepare a project. Clear the flag and restart; retry a scene. Automated tests inject a failure into just one scene without touching real provider settings.                                  |
| First render is slow               | Remotion downloads Chromium once, then bundles fonts/scenes. Progress is unknown during download/bundling, so the UI displays a stage rather than invented percentages.                                                                                       |
| Export fails before an ID is saved | The state is conservatively `needs_review`. For a local-only process that is definitely stopped, inspect its output files/logs, then use the operator recovery script. A local render restart has no paid API cost, but uncertainty is surfaced consistently. |
| MP4/audio link expires             | Reopen the export or reload the project. Authorized endpoints issue new short-lived URLs. Never make artifact folders public to fix this.                                                                                                                     |
| Save conflict                      | Another tab saved a newer revision. Preserve your text elsewhere, reload, then reapply it. Polling does not silently overwrite unsaved edits or advance their base revision.                                                                                  |
| Windows `.next/trace` lock         | Dev and build now use separate directories. Stop any old dev server from an earlier checkout, then rebuild. Don't delete an unrelated process's files.                                                                                                        |
| Browser connector unavailable      | The connector initially failed to load its policy. On the final attempt it explicitly denied permission to access localhost. Browser automation was stopped; interactive acceptance remains pending. Open the local studio yourself to review it.             |

Local state is intentionally durable. Do not delete `.local` to resolve an ordinary failed job. `npx tsx scripts/cleanup-local.ts` only removes work/upload files older than one day. The studio's project deletion action removes project artifacts and hides its metadata, refuses active jobs, and requires a UI confirmation. Deletion is protected by the consistent project reservation as well as job checks. If storage deletion fails, access stays revoked and a durable CLEANUP record is retried by reconciliation; repeating DELETE is safe. Previously issued CloudFront links may serve cached data until their short expiry. Unclaimed original uploads are removed by the one-day cleanup/lifecycle; saved source passages remain with the revision until project deletion.

## Cloud pilot

The stack is deployed and three approved exports completed; exports are disabled again. For the first network export, the vendor render succeeded but the completion poller could not parse Remotion's path-style S3 URL. The parser was fixed and deployed, then reconciliation completed the existing job without another render submission. A separate live test showed overlong narration fail visibly and a targeted retry restore the scene's audio. See [CLOUD-PILOT.md](CLOUD-PILOT.md).

- Search CloudWatch by job ID, then inspect durable stage, attempts, leaseUntil, renderId and bucketName. No private document content should be logged.
- SQS delivery is at least once. Re-delivering a completed or already claimed job must be a no-op. Do not manually reset stage/version without understanding the conditional transition and reserved quota.
- DLQ messages are retained 14 days and alarm when nonempty. Correct the underlying permissions/provider/input issue, then redrive a small batch. Failed durable jobs need an explicit retry; re-delivering a message alone does not bypass a terminal state.
- Preparation/narration lease expiration requeues at most three attempts, preserving per-scene audio checkpoints. Invalid PDFs/schema output are terminal user-visible errors. Partial narration produces an editable revision and blocks export until fixed.
- Completion callbacks are untrusted until HMAC, account, bucket, renderer version and job identity validate. The callback only asks the completion worker to poll; it never declares a video complete from arbitrary URLs. Duplicate callbacks are harmless; malformed/tampered ones are rejected.
- Missing callbacks are handled by the two-minute reconciliation schedule. Known renders are polled until complete/fatal/one-hour bound. Unknown submissions hold their active slot and need review; this favors cost control over automatic duplicate renders.

To recover an uncertain submission, first inspect the configured Remotion bucket's render metadata and CloudWatch for the job/time window. If a matching render exists, attach its exact ID:

```powershell
# This operation changes a persisted cloud job. Verify the exact render first.
$env:PRAGYAN_OPERATOR_APPROVED='1'
npx tsx scripts/recover-job.ts --job JOB_UUID --render VERIFIED_RENDER_ID --bucket CONFIGURED_RENDER_BUCKET
```

If and only if the operator verifies there is no running/successful render to recover, `--abandon` marks the job failed and releases the slot. This action is audited. An incorrect abandonment followed by a new export can duplicate rendering cost. There is no claim of perfect exactly-once external submission.

For an emergency, disable new exports and SQS mappings first. Preserve DynamoDB/S3 for diagnosis. See the complete [teardown procedure](DEPLOYMENT.md#teardown) before deleting resources.
