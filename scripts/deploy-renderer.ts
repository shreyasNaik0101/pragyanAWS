/** Creates paid AWS resources. DO NOT RUN until a deployment has been explicitly approved. */
import { deployFunction, deploySite } from "@remotion/lambda";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import { RENDERER_VERSION } from "@pragyan/schema";
const account = "090208085314",
  region = "us-east-1";
if (process.env.PRAGYAN_DEPLOY_APPROVED !== `${account}:${region}`)
  throw new Error(
    "Deployment is disabled. Review docs/DEPLOYMENT.md and obtain explicit approval first.",
  );
const aws = (...args: string[]) =>
  execFileSync("aws", [...args, "--region", region, "--output", "json"], {
    encoding: "utf8",
    windowsHide: true,
  });
const caller = JSON.parse(aws("sts", "get-caller-identity"));
if (caller.Account !== account) throw new Error("Wrong AWS account");
const role = process.env.REMOTION_ROLE_ARN;
if (!role)
  throw new Error(
    "Set the reviewed Remotion execution role ARN. No IAM user or access key is created by this script.",
  );
const bucketName = process.env.REMOTION_BUCKET;
if (
  !bucketName ||
  !/^remotionlambda-useast1-pragyan-pilot-\d{12}$/.test(bucketName)
)
  throw new Error(
    "Set REMOTION_BUCKET to the prepared private-output pilot bucket",
  );
const functionName =
  process.env.REMOTION_FUNCTION ||
  (
    await deployFunction({
      region,
      memorySizeInMb: 2048,
      timeoutInSeconds: 240,
      diskSizeInMb: 2048,
      createCloudWatchLogGroup: true,
      cloudWatchLogRetentionPeriodInDays: 7,
      customRoleArn: role,
    })
  ).functionName;
// This account currently has only 10 concurrent Lambda executions. Reserving
// capacity for every function would exceed the regional quota. The app's
// transactional one-export limit and two render chunks bound paid submissions.
const s3 = new S3Client({ region });
const existing = await s3.send(
  new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: `sites/${RENDERER_VERSION}/`,
    MaxKeys: 1,
  }),
);
if ((existing.KeyCount || 0) > 0)
  throw new Error(
    "This renderer version is already deployed. Never overwrite an immutable renderer site.",
  );
const { serveUrl } = await deploySite({
  region,
  bucketName,
  entryPoint: "packages/video/src/index.tsx",
  siteName: RENDERER_VERSION,
  privacy: "no-acl",
  throwIfSiteExists: true,
});
await fs.mkdir("artifacts", { recursive: true });
await fs.writeFile(
  "artifacts/renderer-deployment.json",
  JSON.stringify(
    {
      account,
      region,
      bucketName,
      functionName,
      serveUrl,
      rendererVersion: RENDERER_VERSION,
    },
    null,
    2,
  ),
);
console.log(
  "Renderer deployed. Use artifacts/renderer-deployment.json for reviewed CDK context. Keep application exports disabled until smoke checks pass.",
);
