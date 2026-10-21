# Cost controls and estimate — 2026-10-07

Three approved cloud exports were run on 2026-10-07. Exports are disabled again. On 2026-10-13, Cost Explorer reported **$0.268725 gross AWS usage** from October 7 through October 12, offset by **$0.268725 in credits**, leaving **$0.00000010 net** in the current estimate. The Free Tier account-plan API showed **$123.48 credits remaining**, down from $123.76 at the October 7 preflight. October 13 usage had not appeared yet. These figures cover the whole AWS account, not only Pragyan; no stack-level cost allocation tags were configured. Billing data is estimated and may change as it settles. Check Billing → Credits for expiry and eligibility details.

## What is measured

The AWS pilot completed these three 1280×720, 24 fps H.264/AAC exports with VTT captions. These are API export-request to downloaded-artifact observations; the network result includes time spent discovering and fixing a reconciliation parser bug.

| Example | Video duration | API-to-download | MP4 bytes | Remotion renderer GB-seconds |
| --- | ---: | ---: | ---: | ---: |
| Network request | 26.837 s | 493 s | 1,474,343 | 295.442 |
| Binary search | 41.417 s | 84 s | 3,000,620 | 429.890 |
| Source-grounded equipment handover | 25.750 s | 61 s | 1,880,348 | 275.450 |

Total observed renderer consumption was 1,000.782 GB-seconds. At the published standard x86 Lambda duration rate of about $0.0000166667/GB-second, that component alone is approximately $0.0167 **before** free tier, request charges, ephemeral storage, AWS credits, taxes, and the other services. It is neither the total bill nor cost per video. Account gross usage by service for October 7–12 included Secrets Manager $0.1398, Polly $0.0774, Cost Explorer $0.0200, RDS $0.0156, S3 $0.0098, Bedrock $0.0037, and DynamoDB $0.0020; the remainder was under one cent. Cost Explorer and RDS charges are account-wide. Pragyan does not deploy RDS, so that line is from other account usage. These are gross usage amounts before credits, not out-of-pocket charges. Sarvam was not invoked; do not assume its charges are covered by AWS credits.

`artifacts/local-verification.json` records a real local network explanation: 31.253 s, 1280×720 at 24 fps, H.264 + AAC, 1,730,082 bytes, with VTT. First end-to-end run: 379,731 ms, including the initial 113 MB Chromium download and compilation. The machine was also building/testing. This is a cold local observation, **not** an AWS performance estimate or a cost-per-video claim. Local speech used the OS voice; no API usage was incurred. Later review/render measurements are recorded separately when present.

The subsequent local batch used the same running worker and measured preparation through downloaded artifacts:

| Example                            | Duration | Elapsed   | MP4 bytes |
| ---------------------------------- | -------- | --------- | --------- |
| Binary search                      | 31.125 s | 135.241 s | 1,768,271 |
| Source-grounded equipment handover | 27.136 s | 74.746 s  | 1,528,137 |

Both are H.264/AAC, 1280×720, 24 fps, verified with `ffprobe`. Records are in `artifacts/local-batch.json`. These are local demo observations, not a controlled benchmark or cloud pricing evidence.

## Planning envelope, not a quote

Proposed `us-east-1` pilot: 3 videos at 30–60 seconds, each 3–5 scenes; up to 16k input characters and 3,500 output tokens per preparation; roughly 600–1,500 narration characters; 720p/24 fps; renderer 2 GB, two chunks, one export at a time; seven-day logs; no provisioned capacity or idle compute. Credit/free-tier benefits are excluded from this conservative planning envelope.

| Cost driver        | Calculation / uncertainty                                                                                                                                                                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bedrock            | `inputTokens × modelInputRate + outputTokens × modelOutputRate`. Model/rate must be confirmed in the chosen region. For sensitivity only, **assume** $1/M input and $5/M output: 6k input + 3.5k output = $0.0235 per attempt. These are planning assumptions, not a quoted Nova rate. |
| Polly neural       | At the published $16/M characters, 1,500 characters is approximately $0.024 per successful narration, before taxes and free-tier/credit effects. Changed text regenerates only affected audio.                                                                                         |
| Render compute     | Example assumption: total 120–600 billed GB-seconds across the coordinator/chunks × approximately $0.000016667/GB-second ≈ $0.002–$0.010, plus requests, disk, logs and S3. Actual Chromium startup, scene complexity, retries and stitching can change this substantially.            |
| Storage/delivery   | Artifacts are small, but retention and repeat downloads accumulate. 100 × 10 MB exports ≈ 1 GB; use current S3/CloudFront regional prices. Temporary uploads/work files expire after one day. User outputs are retained until deletion.                                                |
| Hosting/operations | Amplify build minutes and delivery/SSR, CloudWatch alarms/dashboard/log ingestion, DynamoDB PITR/storage, Secrets Manager and SNS can dominate a tiny pilot. Reserve several dollars/month for this floor; inspect actual billing.                                                     |
| Third-party        | Sarvam fees and any required Remotion license are separate. They are not assumed covered by AWS credits. Individuals currently qualify for Remotion's free license; recheck eligibility if the legal entity or team changes.                                                           |

The original **$0.05–$0.30 per short successful export** and **$5–$15 for the first small experiment including hosting/monitoring overhead** remain planning allowances, not measured total AWS charges. Failures, account settings, pricing changes, abuse, additional users, and retaining infrastructure can exceed them. Do not extrapolate from the renderer component alone.

## Enforced application limits

- 90 seconds / 8 scenes / 720p / 24 fps. Input 16,000 characters; PDF 5 MB / 30 pages. Narration bounded to 900 characters and under 30 seconds per scene.
- Bedrock output cap 3,500 tokens, SDK retries bounded; invalid scene JSON is not executed.
- 3 export reservations and 8 preparation/narration reservations per user per UTC day. One active preparation per user, one active export globally. Atomic DynamoDB reservations prevent concurrent bypass. Failure consumes the daily reservation.
- Remotion two-chunk setting and one renderer submission attempt when the outcome is ambiguous. Application Lambdas have short fixed timeouts; SQS mappings permit at most two workers per queue. This account's Lambda concurrency quota is 10, so no functions reserve capacity. A busy regional account can throttle this pilot.
- Narration content cache; preview never submits a render. Every export is explicit and requires approval of a saved revision.
- `EXPORTS_ENABLED=false` prevents new exports. To stop already queued work, also disable its SQS mapping; to stop all generation spend, disable preparation/narration mappings and deny Bedrock/Polly access. A kill switch is not a guarantee that in-flight work stops instantly.
- Queue retention one day; DLQs 14 days; upload/work lifecycle one day; logs seven days. Media/revisions and DynamoDB metadata persist until explicit cleanup/deletion. Retained infrastructure can continue to cost money.
- A $15 monthly account-cost budget is deployed with actual-cost email notices at 50%, 80%, and 100%. **Budget alerts do not automatically stop spending and may lag.** The alert measures account spending, not just this project. SNS operational email alarms have a separate confirmation link that must be clicked.

## Measure before expanding

The network, algorithm, and source-grounded procedure examples have been run. Their MP4s, captions, job records, and CloudWatch invocation metrics are available locally/in AWS. Recheck Cost Explorer after October 13–14 data settles. Exports remain disabled. The $15 monthly account budget is installed; its alert is not a hard cap.

Sources reviewed: [Bedrock pricing](https://aws.amazon.com/bedrock/pricing/), [Polly pricing](https://aws.amazon.com/polly/pricing/), [Lambda pricing](https://aws.amazon.com/lambda/pricing/), [S3 pricing](https://aws.amazon.com/s3/pricing/), [Remotion costs](https://www.remotion.dev/docs/lambda), [Remotion license](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md). Prices and regional availability must be checked again at deployment time.
