# AWS deployment and operations

The user approved the limited pilot described in [AWS-PREFLIGHT.md](AWS-PREFLIGHT.md). The static studio, backend stack, and renderer are deployed. Three real cloud exports completed, and exports were disabled again. See [CLOUD-PILOT.md](CLOUD-PILOT.md) for identifiers, checks, and remaining limits. No GitHub writes were made.

For this local-source pilot, publish a statically exported studio through manual Amplify Hosting. AWS does not support manual SSR uploads. Use `npx tsx scripts/prepare-hosting.ts` only after approval to create the `WEB` app and get the exact HTTPS origin, then use that origin as the CDK `appOrigin`. After backend outputs exist, build with `PRAGYAN_STATIC_EXPORT=1` and the actual `NEXT_PUBLIC_RUNTIME=aws`, API origin, Cognito domain and client ID; `npx tsx scripts/deploy-static.ts` uploads `apps/studio/.next-static`. Both scripts verify the account and require `PRAGYAN_DEPLOY_APPROVED=090208085314:us-east-1`. They do not touch GitHub. The optional CDK `createAmplify=true`/`WEB_COMPUTE` path is for a future Git-connected deployment, so leave it **false** for this pilot.

## Approved pilot scope

| Setting             | Proposed value                                                                                                                                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account             | `090208085314` (read-only STS check succeeded)                                                                                                                                                                                                              |
| Region              | `us-east-1`, already configured; supported by Remotion Lambda                                                                                                                                                                                               |
| First pilot         | 3 × 30–60-second videos, 720p/24 fps; inspect actual cost before more                                                                                                                                                                                       |
| Spending exposure   | Plan a $5–$15 initial experiment envelope, **not a hard ceiling**; $125 credits remain a maximum reserve, not a spending target                                                                                                                             |
| Per-user limits     | 3 exports and 8 preparation/narration requests per UTC day                                                                                                                                                                                                  |
| Concurrent exports  | 1 globally; 2 Remotion chunks; no reserved concurrency because the account quota is 10                                                                                                                                                                      |
| Other workers       | SQS mapping max concurrency 2 per queue, batch size 1; no reserved concurrency                                                                                                                                                                              |
| Kill switch         | `EXPORTS_ENABLED=false` on API, plus disable render queue mapping to halt queued submissions                                                                                                                                                                |
| Resources           | Cognito pool/client/domain; HTTP API; 6 application Lambdas; DynamoDB table + 2 GSIs; private S3; 4 queues + 4 DLQs; CloudFront OAC/key group; EventBridge schedule; logs/alarms/dashboard/SNS; 2 Secrets Manager secrets; manual static Amplify app/budget |
| Renderer resources  | Separate Remotion function, execution role, trusted bundle bucket; no source material in the public bundle                                                                                                                                                  |
| Explicit exclusions | No EC2, NAT Gateway, RDS, container service, OCR, billing changes or third-party purchases                                                                                                                                                                  |

The account-plan API reported $123.76 remaining credits before the pilot and a 10-concurrency Lambda quota on 2026-10-07. Nova Lite and Polly were invoked successfully; credit eligibility/expiry and actual settled charges remain unverified. Review Billing → Credits for the particular promotion. Never infer that Sarvam or a paid Remotion license is covered by AWS credits.

## Local preparation already supported

```powershell
npm ci
npm run typecheck
npm test
npm run build
npm run bundle:workers
npm run synth -- --quiet
npx tsx scripts/renderer-policy.ts
```

These create local artifacts only. Inspect `cdk.out/PragyanDemo.template.json` and `artifacts/remotion-role-policy.json`. The synthesis public key has no retained private counterpart and is **not a deployment key**. Production dependencies are pinned by `package-lock.json`; Next 15.5.27 retains documented Amplify compatibility, PostCSS is overridden to 8.5.29, and KaTeX is updated to 0.19.0. Recheck advisories before deployment.

## Reproduction and future deployment sequence

1. Verify the exact account/region using STS. Confirm remaining credits, covered services, Bedrock model availability/access, Polly voices, Lambda regional concurrency and budget-alert recipient. Start with Amazon Nova Lite (`amazon.nova-lite-v1:0`) only if the current regional catalog and trial output quality are acceptable. The CDK policy targets the configured foundation-model ARN; choosing a cross-region inference profile requires explicit additional destination permissions and a privacy review.
2. Review and create the renderer execution role using the generated policy, narrowing vendor resource wildcards to the experiment where practical. Remotion's default role policy includes account-level bucket discovery and its own resource prefixes; it must not be attached to frontend/API identities. Bootstrap CDK with a reviewed CloudFormation execution policy. Do not create long-lived IAM access keys for GitHub Actions.
3. The local RSA-2048 signing pair is already prepared under ignored `.local/` and `artifacts/`. Keep only the public PEM in reviewed deployment configuration. The private key will be installed into the CDK-created `MediaSigner` secret after deployment. No key material belongs in GitHub variables or logs.
4. Set `PRAGYAN_DEPLOY_APPROVED=090208085314:us-east-1` and `REMOTION_ROLE_ARN` for the reviewed renderer role, then run `npx tsx scripts/deploy-renderer.ts`. This is a **paid-resource mutation** and is deliberately guarded. It deploys the trusted scene bundle, a 2 GB / 240 s renderer, 2 GB disk and seven-day logs. It does not reserve Lambda concurrency because the account quota is 10. The script refuses to overwrite an existing renderer version. Application renders request two chunks and private output with one-day Remotion retention. Public access applies only to trusted static bundle files; inspect the vendor bucket policy and block public access to `renders/*`.
5. Feed `artifacts/renderer-deployment.json` and `artifacts/aws-hosting.json` values into reviewed CDK context: `appOrigin`, `mediaPublicKeyFile`, `remotionFunction`, `remotionBucket`, `remotionSite`, `modelId`, `alarmEmail`, `exportsEnabled=false`, `createAmplify=false`. Optional: `sarvamSecretArn` for the existing provider adapter. Do not enable that paid third-party provider without separate credit/cost understanding.
6. Review a fresh synthesis/diff, then deploy the stack. The application starts with exports disabled. Install the matching private media key in Secrets Manager, validate CloudFront signed access and denial of unsigned access, then enable `USE_CLOUDFRONT=true` on the Lambdas that create URLs (API, submission and reconciliation). Until then, authorized S3 presigned GETs remain private and operational. Confirm SNS email subscriptions manually.
7. Create invited Cognito users; self-signup is disabled for budget control. Hosted UI sign-in uses code + PKCE and no browser client secret. Ensure Cognito callback/logout URLs and API/S3 CORS match the actual HTTPS studio origin exactly.
8. Enable exports only for the approved pilot. Run the six acceptance checks below and record actual timings/token/character/GB-second costs. Turn exports off after the pilot until the result and remaining credits are reviewed.

## Amplify Hosting and GitHub Actions

AWS currently documents Next.js SSR support through major 15, but manual Amplify upload supports static sites only. The pilot uses Next's static export, with all API calls sent to the configured HTTPS API. Local production still uses `next start`. The existing `amplify.yml` describes a future Git-connected SSR deployment and is not used for this local-source pilot.

The optional CDK Amplify app does **not** contain a GitHub token and cannot connect itself to a repository. A future authorized operator must connect a reviewed feature branch through Amplify's GitHub App, set the build-time `NEXT_PUBLIC_*` variables from stack outputs, and update the actual app origin in CDK/Cognito. Do not connect or auto-deploy `main` merely to finish setup. No GitHub changes were made in this session.

`.github/workflows/aws-platform.yml` is manual-only. Its verify job runs tests/build/synthesis without AWS credentials. A future deployment job requires `inputs.deploy=true`, the protected `aws-demo` environment and OIDC. The role trust pins both repository and environment. Set `AWS_DEPLOY_ROLE_ARN` and reviewed `PRAGYAN_CDK_CONTEXT` in that environment. The CDK context verifier rejects missing values, the synthesis key, placeholder hostnames and initially enabled exports. Configure required reviewers on the GitHub environment. Initial OIDC provider/role bootstrapping must be done with the account owner's approved credentials; thereafter the workflow assumes scoped CDK deployment/file-publishing roles, not an admin user key.

The workflow deploys application infrastructure; renderer deployment/version promotion and Amplify repository connection remain explicit operational steps. This avoids silently publishing a mutable renderer or changing the user's GitHub repository.

## Cloud acceptance checklist

Do not label AWS deployment complete until all six have evidence:

- A real cloud preparation + narrated Lambda MP4 export, artifact playback and captions.
- Close the browser while rendering; reopen/sign in and retrieve the same durable job.
- Multiple submissions prove one active export and daily limits, including concurrent requests.
- Deliberately fail one narration (or inject an invalid prepared scene), show the visible failure, then recover without regenerating successful scenes.
- A second Cognito user cannot GET, save, delete, export or obtain artifacts for the first user's project; unsigned S3/CloudFront access is denied.
- Logs tie preparation, narration, submission and completion to a job ID with durations; record renderer cost metadata and AWS billed metrics for the pilot.

## Teardown

First set `EXPORTS_ENABLED=false`, disable render queue event mapping and the reconciliation schedule, and wait for/inspect active renders. Download any artifacts you want to keep. Remove the Amplify branch/app and the separate Remotion function/sites/bucket using the vendor's uninstall procedure after checking resource names. CDK destroy removes transient infrastructure but **retains the DynamoDB table, media bucket and Cognito pool** to prevent accidental loss.

For complete cost shutdown, an operator must explicitly approve and delete those retained resources, both renderer and media bucket contents, any retained versions/logs, Secrets Manager entries (including scheduled-deletion retention), and unused CDK bootstrap assets. Check CloudFormation, S3, Lambda, Amplify, CloudFront and Billing afterward. Do not assume stack deletion means every cost has stopped. Use exact resource outputs; never a broad account-wide deletion command.

Official references, reviewed 2026-10-07: [Amplify support](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html), [Remotion Lambda](https://www.remotion.dev/docs/lambda), [Lambda webhooks](https://www.remotion.dev/docs/lambda/webhooks), [Remotion uninstall](https://www.remotion.dev/docs/lambda/uninstall), [Remotion license](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
