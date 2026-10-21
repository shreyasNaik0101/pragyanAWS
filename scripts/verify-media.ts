import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/cloudfront-signer";

if (process.env.PRAGYAN_DEPLOY_APPROVED !== "090208085314:us-east-1")
  throw new Error("Pilot account and region guard is required");

const bucket = "pragyandemo-mediaa721a567-nme0ebrg74h5";
const domain = "d1hne4rlm3cku3.cloudfront.net";
const keyPairId = "K177LE1IB75VY8";
const key = `probes/${randomUUID()}.txt`;
const s3 = new S3Client({ region: "us-east-1" });

await s3.send(new PutObjectCommand({
  Bucket: bucket,
  Key: key,
  Body: "private-media-probe",
  ContentType: "text/plain",
}));
try {
  const baseUrl = `https://${domain}/${key}`;
  const unsigned = await fetch(baseUrl);
  if (unsigned.status !== 403)
    throw new Error(`Unsigned media request returned ${unsigned.status}`);
  const signedUrl = getSignedUrl({
    url: baseUrl,
    keyPairId,
    privateKey: await fs.readFile(".local/aws-media-private.pem", "utf8"),
    dateLessThan: new Date(Date.now() + 5 * 60_000).toISOString(),
  });
  const signed = await fetch(signedUrl);
  if (signed.status !== 200 || (await signed.text()) !== "private-media-probe")
    throw new Error(`Signed media request returned ${signed.status}`);
  console.log("CloudFront: unsigned 403, signed 200");
} finally {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
