# AWS shutdown — 2026-11-01

The user requested shutdown of all AWS services used by this implementation. Account `090208085314`, region `us-east-1`, was verified before mutations. No GitHub commit or push was made.

The API and all workers were first throttled to zero, queue mappings disabled, and the reconciliation schedule disabled. The manual Amplify app and standalone Remotion Lambda were deleted. CloudFormation confirms `PragyanDemo` is `DELETE_COMPLETE`.

Removed: API Gateway, six application Lambdas, Remotion renderer, four SQS queues and four DLQs, Cognito pool/domain/client/users, DynamoDB table, private media bucket and contents, pilot Remotion bucket and contents, CloudFront distribution/signing configuration, two Secrets Manager secrets, log groups, alarms, dashboard, SNS topic/subscription, EventBridge rule, project budget, stack IAM roles, and standalone `PragyanRemotionPilot` role. Verification found no remaining project functions, queues, pools, media buckets, secrets, API, schedule, dashboards or alarms.

The shared CDK bootstrap existed before this project. Verified Pragyan templates and their referenced code ZIPs (23 object keys, including stored versions) were removed successfully. Only two older unrelated objects remain visible in that shared bucket; the shared bootstrap was preserved.

DynamoDB automatically retained a SYSTEM backup of the deleted table (30,141 bytes). AWS refused manual deletion and states it expires on **2026-12-06 at 06:16:03 UTC**. AWS documents this automatic backup as having [no additional cost](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BackupSummary.html).

The local source, environment examples, infrastructure code, and previously downloaded MP4/VTT samples remain. Local development can still run with local adapters. Cloud sign-in and hosted URLs no longer work. Redeployment requires an explicit new deployment.

Other older account resources were deliberately preserved: the URL-shortener Lambda/table, a separate CloudFront distribution, older S3 buckets, KMS resources and the shared CDK bootstrap. Therefore this shutdown does not claim that the entire AWS account has zero future cost. Charges from earlier usage can appear later. No paid Cost Explorer API was called during shutdown.
