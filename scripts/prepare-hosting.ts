/** Creates a manual static Amplify app only after the account/region pilot is approved. */
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
const account = "090208085314";
const region = "us-east-1";
if (process.env.PRAGYAN_DEPLOY_APPROVED !== `${account}:${region}`)
  throw new Error(
    "Review docs/DEPLOYMENT.md and approve the first paid deployment before running this script.",
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
const apps = aws("amplify", "list-apps").apps as Array<{
  name: string;
  appId: string;
  defaultDomain: string;
  platform: string;
}>;
let app = apps.find((item) => item.name === "PragyanStudioPilot");
if (app && app.platform !== "WEB")
  throw new Error("Existing app is not a manual static Amplify app");
if (!app)
  app = aws(
    "amplify",
    "create-app",
    "--name",
    "PragyanStudioPilot",
    "--platform",
    "WEB",
    "--description",
    "Local-source Pragyan pilot; no Git repository connection",
  ).app;
const branches = aws("amplify", "list-branches", "--app-id", app!.appId)
  .branches as Array<{ branchName: string }>;
if (!branches.some((branch) => branch.branchName === "pilot"))
  aws(
    "amplify",
    "create-branch",
    "--app-id",
    app!.appId,
    "--branch-name",
    "pilot",
    "--stage",
    "DEVELOPMENT",
    "--no-enable-auto-build",
  );
const result = {
  account,
  region,
  appId: app!.appId,
  branch: "pilot",
  origin: `https://pilot.${app!.defaultDomain}`,
};
await fs.mkdir("artifacts", { recursive: true });
await fs.writeFile(
  "artifacts/aws-hosting.json",
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result, null, 2));
