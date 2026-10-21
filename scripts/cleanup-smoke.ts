/** Clean one verified temporary pilot project if a smoke-test network request failed. */
import { execFileSync } from "node:child_process";
import { Service } from "../services/core/service";
import { DynamoStore, S3Blobs } from "../services/core/storage";

const account = "090208085314";
const region = "us-east-1";
if (process.env.PRAGYAN_DEPLOY_APPROVED !== `${account}:${region}`)
  throw new Error("Pilot account and region guard is required");
const identity = JSON.parse(execFileSync("aws", [
  "sts", "get-caller-identity", "--region", region, "--output", "json",
], { encoding: "utf8", windowsHide: true }));
if (identity.Account !== account) throw new Error("Wrong AWS account");
const id = process.argv[2];
const owner = process.argv[3];
if (!id || !owner || !/^[a-f0-9-]{36}$/.test(id) || !/^[a-f0-9-]{36}$/.test(owner))
  throw new Error("Pass exact project ID and owner UUID");
process.env.TABLE_NAME = "PragyanDemo-State1C20CC9A-XOUBT57NG1PT";
process.env.MEDIA_BUCKET = "pragyandemo-mediaa721a567-nme0ebrg74h5";
const service = new Service(new DynamoStore(), new S3Blobs(), {
  send: async () => { throw new Error("Cleanup must not enqueue work"); },
});
const project = await service.project(owner, id);
if (!project.title || !project.title.includes("How an internet request reaches a server"))
  throw new Error("Project did not match the temporary smoke-test title");
await service.remove(owner, id);
console.log(`Removed temporary smoke project ${id}`);
