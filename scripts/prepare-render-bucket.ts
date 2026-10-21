/** Approved pilot renderer bucket. Public read is restricted to trusted site files. */
import { execFileSync } from "node:child_process";
import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketOwnershipControlsCommand,
  PutBucketEncryptionCommand,
  PutPublicAccessBlockCommand,
  PutBucketPolicyCommand,
  PutBucketLifecycleConfigurationCommand,
  GetBucketPolicyCommand,
} from "@aws-sdk/client-s3";
import fs from "node:fs/promises";
const account = "090208085314",
  region = "us-east-1";
if (process.env.PRAGYAN_DEPLOY_APPROVED !== `${account}:${region}`)
  throw new Error(
    "Review and approve the pilot before creating the render bucket",
  );
const caller = JSON.parse(
  execFileSync("aws", ["sts", "get-caller-identity", "--output", "json"], {
    encoding: "utf8",
    windowsHide: true,
  }),
);
if (caller.Account !== account) throw new Error("Wrong AWS account");
const bucket = `remotionlambda-useast1-pragyan-pilot-${account}`;
const s3 = new S3Client({ region });
let exists = false;
try {
  await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  exists = true;
} catch (error: any) {
  if (error?.$metadata?.httpStatusCode !== 404) throw error;
}
if (exists) {
  const current = await s3.send(new GetBucketPolicyCommand({ Bucket: bucket }));
  const parsed = JSON.parse(current.Policy || "{}");
  if (
    !parsed.Statement?.some(
      (s: any) =>
        s.Sid === "TrustedSiteReadOnly" &&
        s.Resource === `arn:aws:s3:::${bucket}/sites/*`,
    )
  )
    throw new Error(
      "Existing bucket policy does not match the pilot; review it manually",
    );
} else {
  await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  await s3.send(
    new PutBucketOwnershipControlsCommand({
      Bucket: bucket,
      OwnershipControls: {
        Rules: [{ ObjectOwnership: "BucketOwnerEnforced" }],
      },
    }),
  );
  await s3.send(
    new PutBucketEncryptionCommand({
      Bucket: bucket,
      ServerSideEncryptionConfiguration: {
        Rules: [
          { ApplyServerSideEncryptionByDefault: { SSEAlgorithm: "AES256" } },
        ],
      },
    }),
  );
  await s3.send(
    new PutPublicAccessBlockCommand({
      Bucket: bucket,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: false,
        RestrictPublicBuckets: false,
      },
    }),
  );
  await s3.send(
    new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "TrustedSiteReadOnly",
            Effect: "Allow",
            Principal: "*",
            Action: "s3:GetObject",
            Resource: `arn:aws:s3:::${bucket}/sites/*`,
          },
          {
            Sid: "RequireTLS",
            Effect: "Deny",
            Principal: "*",
            Action: "s3:*",
            Resource: [`arn:aws:s3:::${bucket}`, `arn:aws:s3:::${bucket}/*`],
            Condition: { Bool: { "aws:SecureTransport": "false" } },
          },
        ],
      }),
    }),
  );
  await s3.send(
    new PutBucketLifecycleConfigurationCommand({
      Bucket: bucket,
      LifecycleConfiguration: {
        Rules: [
          {
            ID: "ExpireTemporaryRenders",
            Status: "Enabled",
            Filter: { Prefix: "renders/" },
            Expiration: { Days: 1 },
          },
        ],
      },
    }),
  );
}
await fs.mkdir("artifacts", { recursive: true });
await fs.writeFile(
  "artifacts/aws-render-bucket.json",
  JSON.stringify({ account, region, bucket }, null, 2),
);
console.log(
  JSON.stringify({
    bucket,
    created: !exists,
    publicPrefix: "sites/",
    privatePrefix: "renders/",
  }),
);
