/** Uploads a reviewed, locally built static site to Amplify; never touches GitHub. */
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
const account = "090208085314";
const region = "us-east-1";
if (process.env.PRAGYAN_DEPLOY_APPROVED !== `${account}:${region}`)
  throw new Error(
    "Approve the reviewed deployment before publishing the studio.",
  );
const aws = (...args: string[]) =>
  JSON.parse(
    execFileSync(
      "aws",
      [...args, "--region", region, "--output", "json", "--no-cli-pager"],
      { encoding: "utf8", windowsHide: true },
    ),
  );
if (aws("sts", "get-caller-identity").Account !== account)
  throw new Error("Wrong AWS account");
const hosting = JSON.parse(
  await fs.readFile("artifacts/aws-hosting.json", "utf8"),
);
if (
  hosting.account !== account ||
  hosting.region !== region ||
  hosting.branch !== "pilot"
)
  throw new Error("Unexpected hosting target");
const app = aws("amplify", "get-app", "--app-id", hosting.appId).app;
if (
  app.name !== "PragyanStudioPilot" ||
  app.platform !== "WEB" ||
  hosting.origin !== `https://pilot.${app.defaultDomain}`
)
  throw new Error("Hosting target changed");
const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN;
const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
if (
  !apiOrigin?.startsWith("https://") ||
  !cognitoDomain?.startsWith("https://") ||
  !clientId
)
  throw new Error(
    "Set the exact reviewed NEXT_PUBLIC_API_ORIGIN, NEXT_PUBLIC_COGNITO_DOMAIN and NEXT_PUBLIC_COGNITO_CLIENT_ID",
  );
// With a custom distDir, Next 15 writes the static export into that directory.
const output = path.resolve("apps/studio/.next-static");
if (!(await fs.stat(path.join(output, "index.html")).catch(() => null)))
  throw new Error("Build the static studio first");
const chunks = await fs.readdir(path.join(output, "_next/static/chunks"), {
  recursive: true,
});
const js = (
  await Promise.all(
    chunks
      .filter((name) => name.endsWith(".js"))
      .map((name) =>
        fs.readFile(path.join(output, "_next/static/chunks", name), "utf8"),
      ),
  )
).join("");
if (![apiOrigin, cognitoDomain, clientId].every((value) => js.includes(value)))
  throw new Error(
    "Static bundle does not match the reviewed API/Cognito settings; rebuild first",
  );
const zip = path.join(os.tmpdir(), `pragyan-studio-${randomUUID()}.zip`);
const tar = process.platform === "win32"
  ? path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe")
  : "tar";
try {
  const entries = await fs.readdir(output);
  execFileSync(tar, ["-a", "-c", "-f", zip, "-C", output, ...entries], {
    windowsHide: true,
  });
  const files = execFileSync(tar, ["-tf", zip], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (!files.split(/\r?\n/).includes("index.html") || !files.includes("_next/"))
    throw new Error("Static archive is incomplete");
  const deployment = aws(
    "amplify",
    "create-deployment",
    "--app-id",
    hosting.appId,
    "--branch-name",
    "pilot",
  );
  const upload = await fetch(deployment.zipUploadUrl, {
    method: "PUT",
    headers: { "content-type": "application/zip" },
    body: await fs.readFile(zip),
  });
  if (!upload.ok) throw new Error(`Amplify upload failed (${upload.status})`);
  aws(
    "amplify",
    "start-deployment",
    "--app-id",
    hosting.appId,
    "--branch-name",
    "pilot",
    "--job-id",
    deployment.jobId,
  );
  console.log(
    JSON.stringify({
      appId: hosting.appId,
      branch: "pilot",
      jobId: deployment.jobId,
      origin: hosting.origin,
    }),
  );
} finally {
  await fs.rm(zip, { force: true });
}
