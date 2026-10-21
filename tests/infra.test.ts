import { test } from "node:test";
import { App } from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import fs from "node:fs";
import { PragyanStack } from "../infra/stack";
test("infrastructure has private storage, JWT authorization, bounded workers, DLQs, no always-on compute", () => {
  const app = new App();
  const stack = new PragyanStack(app, "Test", {
    env: { account: "111111111111", region: "us-east-1" },
    appOrigin: "https://studio.example.com",
    mediaPublicKey: fs.readFileSync("infra/synth-public-key.pem", "utf8"),
    bundlesPath: "services",
    alarmEmail: "alerts@example.com",
  });
  const t = Template.fromStack(stack);
  t.resourceCountIs("AWS::EC2::Instance", 0);
  t.resourceCountIs("AWS::EC2::NatGateway", 0);
  t.resourceCountIs("AWS::RDS::DBInstance", 0);
  t.resourceCountIs("AWS::SQS::Queue", 8);
  t.resourceCountIs("AWS::Lambda::Function", 6);
  t.hasResourceProperties("AWS::S3::Bucket", {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    },
  });
  t.hasResourceProperties("AWS::DynamoDB::Table", {
    BillingMode: "PAY_PER_REQUEST",
  });
  t.hasResourceProperties("AWS::ApiGatewayV2::Route", {
    RouteKey: "ANY /api/{proxy+}",
    AuthorizationType: "JWT",
  });
  t.hasResourceProperties("AWS::CloudFront::Distribution", {
    DistributionConfig: {
      DefaultCacheBehavior: {
        TrustedKeyGroups: Match.anyValue(),
        ViewerProtocolPolicy: "https-only",
      },
    },
  });
  t.hasResourceProperties("AWS::Lambda::Function", {
    Timeout: 360,
    Environment: { Variables: { EXPORTS_ENABLED: "false" } },
  });
  t.hasResourceProperties("AWS::Logs::LogGroup", { RetentionInDays: 7 });
  t.resourceCountIs("AWS::Logs::MetricFilter", 6);
  t.hasResourceProperties("AWS::ApiGatewayV2::Stage", {
    AccessLogSettings: {
      DestinationArn: Match.anyValue(),
      Format: Match.stringLikeRegexp("requestId"),
    },
  });
  t.hasResourceProperties("AWS::Budgets::Budget", {
    Budget: { BudgetLimit: { Amount: 15, Unit: "USD" } },
  });
});
