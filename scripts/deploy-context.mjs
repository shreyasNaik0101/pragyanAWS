import fs from "node:fs";
const context = JSON.parse(process.env.DEPLOY_CONTEXT || "{}");
for (const key of [
  "appOrigin",
  "mediaPublicKeyFile",
  "alarmEmail",
  "remotionFunction",
  "remotionBucket",
  "remotionSite",
])
  if (!context[key])
    throw new Error(`Missing reviewed deployment setting: ${key}`);
if (
  context.appOrigin.includes("example") ||
  context.mediaPublicKeyFile === "infra/synth-public-key.pem"
)
  throw new Error("Replace synthesis-only configuration before deployment");
if (context.exportsEnabled !== "false")
  throw new Error(
    "Initial deployment must keep exports disabled until smoke checks complete",
  );
fs.writeFileSync("cdk.context.json", JSON.stringify(context, null, 2));
