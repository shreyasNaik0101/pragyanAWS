import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";
import lockfile from "proper-lockfile";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSignedUrl as cloudFrontUrl } from "@aws-sdk/cloudfront-signer";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
export type Row = {
  id: string;
  owner: string;
  kind: string;
  v: number;
  [key: string]: any;
};
export type Write = { value: Row; expected: number | null };
export class Conflict extends Error {
  constructor() {
    super("This item changed. Reload and try again.");
  }
}
export interface Store {
  get<T extends Row = Row>(id: string): Promise<T | undefined>;
  list(owner: string, kind?: string): Promise<Row[]>;
  jobs(): Promise<Row[]>;
  transaction(writes: Write[]): Promise<void>;
}
export interface Blobs {
  put(key: string, body: Buffer | string, type: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  url(key: string, seconds?: number): Promise<string>;
  removePrefix(prefix: string): Promise<void>;
}
export const dataDir = path.resolve(process.env.DATA_DIR || ".local");
export class LocalStore implements Store {
  constructor(private dir = dataDir) {}
  private async run<T>(
    fn: (state: Record<string, Row>) => Promise<T> | T,
    write = false,
  ): Promise<T> {
    await fs.mkdir(this.dir, { recursive: true });
    const file = path.join(this.dir, "state.json");
    await fs.writeFile(file, "{}", { flag: "wx" }).catch((e) => {
      if (e.code !== "EEXIST") throw e;
    });
    const unlock = await lockfile.lock(file, {
      retries: { retries: 30, minTimeout: 20, maxTimeout: 100 },
      stale: 10000,
    });
    try {
      const state = JSON.parse(await fs.readFile(file, "utf8"));
      const result = await fn(state);
      if (write) {
        const tmp = file + "." + randomUUID() + ".tmp";
        await fs.writeFile(tmp, JSON.stringify(state));
        await fs.rename(tmp, file);
      }
      return result;
    } finally {
      await unlock();
    }
  }
  get<T extends Row = Row>(id: string): Promise<T | undefined> {
    return this.run((s) => s[id] as T | undefined);
  }
  list(owner: string, kind?: string) {
    return this.run((s) =>
      Object.values(s).filter(
        (r) => r.owner === owner && (!kind || r.kind === kind),
      ),
    );
  }
  jobs() {
    return this.run((s) =>
      Object.values(s).filter(
        (r) =>
          r.kind === "JOB" &&
          !["complete", "failed", "cancelled"].includes(r.stage),
      ),
    );
  }
  transaction(writes: Write[]) {
    return this.run((s) => {
      for (const w of writes)
        if (
          w.expected === null
            ? s[w.value.id] !== undefined
            : s[w.value.id]?.v !== w.expected
        )
          throw new Conflict();
      for (const w of writes) s[w.value.id] = structuredClone(w.value);
    }, true);
  }
}
export class DynamoStore implements Store {
  private client = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
    marshallOptions: { removeUndefinedValues: true },
  });
  private table = process.env.TABLE_NAME!;
  async get<T extends Row = Row>(id: string) {
    return (
      await this.client.send(
        new GetCommand({
          TableName: this.table,
          Key: { id },
          ConsistentRead: true,
        }),
      )
    ).Item as T | undefined;
  }
  private async query(index: string, key: string, value: string) {
    let cursor: Record<string, any> | undefined;
    const rows: Row[] = [];
    do {
      const r = await this.client.send(
        new QueryCommand({
          TableName: this.table,
          IndexName: index,
          KeyConditionExpression: "#k = :v",
          ExpressionAttributeNames: { "#k": key },
          ExpressionAttributeValues: { ":v": value },
          ExclusiveStartKey: cursor,
          Limit: 100,
        }),
      );
      rows.push(...((r.Items || []) as Row[]));
      cursor = r.LastEvaluatedKey;
    } while (cursor);
    return rows;
  }
  async list(owner: string, kind?: string) {
    return (await this.query("byOwner", "owner", owner)).filter(
      (r) => !kind || r.kind === kind,
    );
  }
  async jobs() {
    return (await this.query("byKind", "kind", "JOB")).filter(
      (r) => !["complete", "failed", "cancelled"].includes(r.stage),
    );
  }
  async transaction(writes: Write[]) {
    try {
      await this.client.send(
        new TransactWriteCommand({
          TransactItems: writes.map((w) => ({
            Put: {
              TableName: this.table,
              Item: w.value,
              ConditionExpression:
                w.expected === null ? "attribute_not_exists(id)" : "#v = :v",
              ...(w.expected === null
                ? {}
                : {
                    ExpressionAttributeNames: { "#v": "v" },
                    ExpressionAttributeValues: { ":v": w.expected },
                  }),
            },
          })),
        }),
      );
    } catch (e: any) {
      if (e.name === "TransactionCanceledException") throw new Conflict();
      throw e;
    }
  }
}
export function safeKey(key: string) {
  if (
    !/^[a-zA-Z0-9_./-]+$/.test(key) ||
    key.includes("..") ||
    key.startsWith("/")
  )
    throw new Error("Invalid artifact key");
  return key;
}
export class LocalBlobs implements Blobs {
  constructor(private dir = dataDir) {}
  private file(key: string) {
    return path.join(this.dir, "artifacts", safeKey(key));
  }
  async put(key: string, body: Buffer | string) {
    const file = this.file(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    const tmp = file + "." + randomUUID() + ".tmp";
    await fs.writeFile(tmp, body);
    await fs.rename(tmp, file);
  }
  get(key: string) {
    return fs.readFile(this.file(key));
  }
  async url(key: string, seconds = 900) {
    const exp = Math.floor(Date.now() / 1000) + seconds;
    const sig = createHmac("sha256", await localSecret(this.dir))
      .update(`${key}:${exp}`)
      .digest("hex");
    return `${process.env.PUBLIC_API_ORIGIN || "http://127.0.0.1:4000"}/api/media?key=${encodeURIComponent(key)}&exp=${exp}&sig=${sig}`;
  }
  async verify(key: string, exp: number, sig: string) {
    if (
      !Number.isSafeInteger(exp) ||
      exp < Date.now() / 1000 ||
      exp > Date.now() / 1000 + 3700
    )
      return false;
    const expected = createHmac("sha256", await localSecret(this.dir))
      .update(`${safeKey(key)}:${exp}`)
      .digest("hex");
    return (
      sig.length === expected.length &&
      timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    );
  }
  async removePrefix(prefix: string) {
    const target = path.resolve(this.file(prefix));
    const root = path.resolve(this.dir, "artifacts");
    if (!target.startsWith(root + path.sep) || prefix.split("/").length < 2)
      throw new Error("Unsafe deletion");
    await fs.rm(target, { recursive: true, force: true });
  }
}
export async function localSecret(dir = dataDir) {
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, "session-secret");
  await fs
    .writeFile(file, randomUUID() + randomUUID(), { flag: "wx" })
    .catch((e) => {
      if (e.code !== "EEXIST") throw e;
    });
  return fs.readFile(file, "utf8");
}
export class S3Blobs implements Blobs {
  private client = new S3Client({});
  private bucket = process.env.MEDIA_BUCKET!;
  private signingKey?: Promise<string>;
  async put(key: string, body: Buffer | string, type: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: safeKey(key),
        Body: body,
        ContentType: type,
        ServerSideEncryption: "AES256",
        Tagging: key.includes("/work/") ? "purpose=temporary" : undefined,
      }),
    );
  }
  async get(key: string) {
    const r = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: safeKey(key) }),
    );
    return Buffer.from(await r.Body!.transformToByteArray());
  }
  async url(key: string, seconds = 900) {
    safeKey(key);
    if (process.env.USE_CLOUDFRONT === "true") {
      this.signingKey ||= new SecretsManagerClient({})
        .send(
          new GetSecretValueCommand({
            SecretId: process.env.MEDIA_SIGNER_SECRET_ARN!,
          }),
        )
        .then((r) => r.SecretString!);
      return cloudFrontUrl({
        url: `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`,
        keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID!,
        privateKey: await this.signingKey,
        dateLessThan: new Date(Date.now() + seconds * 1000).toISOString(),
      });
    }
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: seconds },
    );
  }
  async removePrefix(prefix: string) {
    safeKey(prefix);
    if (prefix.split("/").length < 2) throw new Error("Unsafe deletion");
    let token: string | undefined;
    do {
      const r = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: token,
        }),
      );
      if (r.Contents?.length) {
        const deleted = await this.client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: r.Contents.map((x) => ({ Key: x.Key! })) },
          }),
        );
        if (deleted.Errors?.length)
          throw new Error("Artifact deletion incomplete; cleanup will retry");
      }
      token = r.NextContinuationToken;
    } while (token);
  }
}
export const cloud = process.env.RUNTIME === "aws";
export const store: Store = cloud ? new DynamoStore() : new LocalStore();
export const blobs: Blobs = cloud ? new S3Blobs() : new LocalBlobs();
