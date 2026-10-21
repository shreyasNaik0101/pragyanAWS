import * as cdk from "aws-cdk-lib";
import fs from "node:fs";
import { PragyanStack } from "./stack";
const app = new cdk.App();
const context = (key: string) => app.node.tryGetContext(key);
new PragyanStack(app, "PragyanDemo", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || "090208085314",
    region: process.env.CDK_DEFAULT_REGION || "us-east-1",
  },
  appOrigin:
    context("appOrigin") || "https://replace-before-deployment.example",
  mediaPublicKey: fs.readFileSync(
    context("mediaPublicKeyFile") || "infra/synth-public-key.pem",
    "utf8",
  ),
  modelId: context("modelId"),
  sarvamSecretArn: context("sarvamSecretArn"),
  remotionFunction: context("remotionFunction"),
  remotionBucket: context("remotionBucket"),
  remotionSite: context("remotionSite"),
  alarmEmail: context("alarmEmail"),
  githubRepo: context("githubRepo"),
  githubOidcProviderArn: context("githubOidcProviderArn"),
  exportsEnabled: context("exportsEnabled") === "true",
  useCloudFront: context("useCloudFront") === "true",
  createAmplify: context("createAmplify") === "true",
});
