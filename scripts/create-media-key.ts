/** Local-only media signing key creation. The private PEM is ignored by Git. */
import { generateKeyPairSync } from "node:crypto";
import fs from "node:fs/promises";
const privatePath = ".local/aws-media-private.pem";
const publicPath = "artifacts/aws-media-public.pem";
const exists = await Promise.all(
  [privatePath, publicPath].map((name) =>
    fs
      .stat(name)
      .then(() => true)
      .catch(() => false),
  ),
);
if (exists.some(Boolean))
  throw new Error("Media key material already exists; refuse to overwrite it");
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
await fs.mkdir(".local", { recursive: true });
await fs.mkdir("artifacts", { recursive: true });
await fs.writeFile(privatePath, privateKey, { flag: "wx", mode: 0o600 });
await fs.writeFile(publicPath, publicKey, { flag: "wx" });
console.log(
  `Generated local key pair. Public: ${publicPath}; private: ${privatePath} (never upload to source control).`,
);
