import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  aws_dynamodb as dynamo,
  aws_s3 as s3,
  aws_sqs as sqs,
  aws_lambda as lambda,
  aws_lambda_event_sources as sources,
  aws_iam as iam,
  aws_logs as logs,
  aws_cognito as cognito,
  aws_apigatewayv2 as api,
  aws_apigatewayv2_integrations as integrations,
  aws_apigatewayv2_authorizers as authorizers,
  aws_events as events,
  aws_events_targets as targets,
  aws_cloudwatch as cw,
  aws_cloudwatch_actions as actions,
  aws_sns as sns,
  aws_sns_subscriptions as subscriptions,
  aws_secretsmanager as secrets,
  aws_cloudfront as cf,
  aws_cloudfront_origins as origins,
  aws_amplify as amplify,
  aws_budgets as budgets,
} from "aws-cdk-lib";
import path from "node:path";
import fs from "node:fs";
export interface PragyanProps extends cdk.StackProps {
  appOrigin: string;
  mediaPublicKey: string;
  remotionFunction?: string;
  remotionBucket?: string;
  remotionSite?: string;
  modelId?: string;
  sarvamSecretArn?: string;
  alarmEmail?: string;
  githubRepo?: string;
  githubOidcProviderArn?: string;
  exportsEnabled?: boolean;
  useCloudFront?: boolean;
  createAmplify?: boolean;
  bundlesPath?: string;
}
export class PragyanStack extends cdk.Stack {
  constructor(scope: Construct, id: string, p: PragyanProps) {
    super(scope, id, p);
    const table = new dynamo.Table(this, "State", {
      partitionKey: { name: "id", type: dynamo.AttributeType.STRING },
      billingMode: dynamo.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      timeToLiveAttribute: "expiresAt",
      encryption: dynamo.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    table.addGlobalSecondaryIndex({
      indexName: "byOwner",
      partitionKey: { name: "owner", type: dynamo.AttributeType.STRING },
    });
    table.addGlobalSecondaryIndex({
      indexName: "byKind",
      partitionKey: { name: "kind", type: dynamo.AttributeType.STRING },
    });
    const media = new s3.Bucket(this, "Media", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      cors: [
        {
          allowedOrigins: [p.appOrigin],
          allowedMethods: [
            s3.HttpMethods.PUT,
            s3.HttpMethods.GET,
            s3.HttpMethods.HEAD,
          ],
          allowedHeaders: ["*"],
          exposedHeaders: ["ETag"],
          maxAge: 300,
        },
      ],
      lifecycleRules: [
        {
          id: "unclaimed-uploads",
          prefix: "uploads/",
          expiration: cdk.Duration.days(1),
        },
        {
          id: "temporary",
          tagFilters: { purpose: "temporary" },
          expiration: cdk.Duration.days(1),
        },
        {
          id: "incomplete-multipart",
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
        },
      ],
    });
    const mediaSigner = new secrets.Secret(this, "MediaSigner", {
      description:
        "Replace with the PEM private key matching the CloudFront public key before enabling signed CloudFront media",
    });
    const publicKey = new cf.PublicKey(this, "MediaPublicKey", {
      encodedKey: p.mediaPublicKey,
    });
    const keyGroup = new cf.KeyGroup(this, "MediaKeyGroup", {
      items: [publicKey],
    });
    const distribution = new cf.Distribution(this, "MediaDelivery", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(media),
        viewerProtocolPolicy: cf.ViewerProtocolPolicy.HTTPS_ONLY,
        trustedKeyGroups: [keyGroup],
        allowedMethods: cf.AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: cf.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy:
          cf.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT,
      },
      priceClass: cf.PriceClass.PRICE_CLASS_100,
      comment: "Private Pragyan media; signed viewer URLs required",
    });
    const webhookSecret = new secrets.Secret(this, "WebhookSecret", {
      generateSecretString: { passwordLength: 64, excludePunctuation: true },
    });
    const userPool = new cognito.UserPool(this, "Users", {
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 12,
        requireDigits: true,
        requireLowercase: true,
        requireUppercase: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    const client = userPool.addClient("Studio", {
      generateSecret: false,
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [p.appOrigin + "/"],
        logoutUrls: [p.appOrigin + "/"],
      },
      preventUserExistenceErrors: true,
      accessTokenValidity: cdk.Duration.hours(1),
    });
    const domain = userPool.addDomain("HostedLogin", {
      cognitoDomain: { domainPrefix: `pragyan-${this.account}-${this.region}` },
    });
    const http = new api.HttpApi(this, "Api", {
      corsPreflight: {
        allowOrigins: [p.appOrigin],
        allowMethods: [
          api.CorsHttpMethod.GET,
          api.CorsHttpMethod.POST,
          api.CorsHttpMethod.PUT,
          api.CorsHttpMethod.DELETE,
        ],
        allowHeaders: ["authorization", "content-type", "idempotency-key"],
        maxAge: cdk.Duration.minutes(5),
      },
    });
    const stage = http.defaultStage!.node.defaultChild as api.CfnStage;
    stage.defaultRouteSettings = {
      throttlingBurstLimit: 10,
      throttlingRateLimit: 5,
    };
    const accessLogs = new logs.LogGroup(this, "ApiAccessLogs", {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    stage.accessLogSettings = {
      destinationArn: accessLogs.logGroupArn,
      // Deliberately omit URLs, query strings, headers, identity and request bodies.
      format: JSON.stringify({
        requestId: "$context.requestId",
        route: "$context.routeKey",
        status: "$context.status",
        latencyMs: "$context.responseLatency",
      }),
    };
    const queues: Record<string, sqs.Queue> = {};
    const dlqs: Record<string, sqs.Queue> = {};
    for (const name of ["prepare", "narrate", "render", "completion"]) {
      dlqs[name] = new sqs.Queue(this, `${name}DeadLetters`, {
        retentionPeriod: cdk.Duration.days(14),
        encryption: sqs.QueueEncryption.SQS_MANAGED,
      });
      queues[name] = new sqs.Queue(this, `${name}Queue`, {
        visibilityTimeout: cdk.Duration.minutes(36),
        retentionPeriod: cdk.Duration.days(1),
        encryption: sqs.QueueEncryption.SQS_MANAGED,
        deadLetterQueue: { queue: dlqs[name], maxReceiveCount: 3 },
      });
    }
    const environment: Record<string, string> = {
      RUNTIME: "aws",
      TABLE_NAME: table.tableName,
      MEDIA_BUCKET: media.bucketName,
      APP_ORIGIN: p.appOrigin,
      COGNITO_POOL_ID: userPool.userPoolId,
      COGNITO_CLIENT_ID: client.userPoolClientId,
      AWS_ACCOUNT_ID: this.account,
      BEDROCK_MODEL_ID: p.modelId || "amazon.nova-lite-v1:0",
      REMOTION_FUNCTION: p.remotionFunction || "",
      REMOTION_BUCKET: p.remotionBucket || "",
      REMOTION_SITE: p.remotionSite || "",
      WEBHOOK_SECRET_ARN: webhookSecret.secretArn,
      CALLBACK_URL: `${http.apiEndpoint}/api/render-callback`,
      EXPORTS_ENABLED: p.exportsEnabled ? "true" : "false",
      CLOUDFRONT_DOMAIN: distribution.distributionDomainName,
      CLOUDFRONT_KEY_PAIR_ID: publicKey.publicKeyId,
      MEDIA_SIGNER_SECRET_ARN: mediaSigner.secretArn,
      USE_CLOUDFRONT: p.useCloudFront ? "true" : "false",
    };
    if (p.sarvamSecretArn) environment.SARVAM_SECRET_ARN = p.sarvamSecretArn;
    for (const [name, q] of Object.entries(queues))
      environment[`QUEUE_${name.toUpperCase()}`] = q.queueUrl;
    const make = (
      name: string,
      handler: string,
      seconds: number,
      memory = 512,
    ) => {
      const fn = new lambda.Function(this, name, {
        runtime: lambda.Runtime.NODEJS_22_X,
        architecture: lambda.Architecture.X86_64,
        handler,
        code: lambda.Code.fromAsset(p.bundlesPath || "dist/lambda"),
        timeout: cdk.Duration.seconds(seconds),
        memorySize: memory,
        environment,
        logGroup: new logs.LogGroup(this, `${name}Logs`, {
          retention: logs.RetentionDays.ONE_WEEK,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      });
      table.grantReadWriteData(fn);
      media.grantReadWrite(fn);
      for (const q of Object.values(queues)) q.grantSendMessages(fn);
      return fn;
    };
    const apiFn = make("ExpressApi", "api.handler", 28);
    const prepare = make("Preparation", "workers.preparation", 180, 1024);
    const narrate = make("Narration", "workers.narration", 360, 1024);
    const submit = make("RenderSubmission", "workers.submission", 120, 1024);
    const complete = make("Completion", "workers.completion", 180, 1024);
    const reconcile = make(
      "Reconciliation",
      "workers.reconciliation",
      180,
      1024,
    );
    for (const [name, fn] of Object.entries({
      prepare,
      narrate,
      render: submit,
      completion: complete,
    })) {
      fn.addEventSource(
        new sources.SqsEventSource(queues[name], {
          batchSize: 1,
          reportBatchItemFailures: true,
          maxConcurrency: 2,
        }),
      );
    }
    const jwt = new authorizers.HttpJwtAuthorizer(
      "Cognito",
      userPool.userPoolProviderUrl,
      { jwtAudience: [client.userPoolClientId] },
    );
    const integration = new integrations.HttpLambdaIntegration(
      "Express",
      apiFn,
    );
    http.addRoutes({
      path: "/api/{proxy+}",
      methods: [api.HttpMethod.ANY],
      integration,
      authorizer: jwt,
    });
    // The authenticated ANY proxy otherwise captures browser preflight.
    http.addRoutes({
      path: "/api/{proxy+}",
      methods: [api.HttpMethod.OPTIONS],
      integration,
    });
    http.addRoutes({
      path: "/api/health",
      methods: [api.HttpMethod.GET],
      integration,
    });
    http.addRoutes({
      path: "/api/render-callback",
      methods: [api.HttpMethod.POST],
      integration,
    });
    webhookSecret.grantRead(apiFn);
    webhookSecret.grantRead(submit);
    mediaSigner.grantRead(apiFn);
    mediaSigner.grantRead(submit);
    mediaSigner.grantRead(reconcile);
    prepare.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel"],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/${p.modelId || "amazon.nova-lite-v1:0"}`,
        ],
      }),
    );
    if (p.sarvamSecretArn)
      secrets.Secret.fromSecretCompleteArn(
        this,
        "SarvamProvider",
        p.sarvamSecretArn,
      ).grantRead(narrate);
    narrate.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["polly:SynthesizeSpeech"],
        resources: ["*"],
        conditions: { StringEquals: { "aws:RequestedRegion": this.region } },
      }),
    );
    if (p.remotionFunction && p.remotionBucket) {
      const renderArn = `arn:aws:lambda:${this.region}:${this.account}:function:${p.remotionFunction}`;
      for (const fn of [submit, complete, reconcile]) {
        fn.addToRolePolicy(
          new iam.PolicyStatement({
            actions: ["lambda:InvokeFunction"],
            resources: [renderArn],
          }),
        );
        fn.addToRolePolicy(
          new iam.PolicyStatement({
            actions: ["s3:GetObject", "s3:PutObject"],
            resources: [`arn:aws:s3:::${p.remotionBucket}/renders/*`],
          }),
        );
        fn.addToRolePolicy(
          new iam.PolicyStatement({
            actions: ["s3:ListBucket", "s3:GetBucketLocation"],
            resources: [`arn:aws:s3:::${p.remotionBucket}`],
          }),
        );
      }
    }
    new events.Rule(this, "ReconcileSchedule", {
      schedule: events.Schedule.rate(cdk.Duration.minutes(2)),
      targets: [new targets.LambdaFunction(reconcile, { retryAttempts: 1 })],
    });
    const topic = new sns.Topic(this, "OperationalAlerts");
    if (p.alarmEmail)
      topic.addSubscription(new subscriptions.EmailSubscription(p.alarmEmail));
    for (const [name, q] of Object.entries(dlqs)) {
      const alarm = new cw.Alarm(this, `${name}DlqAlarm`, {
        metric: q.metricApproximateNumberOfMessagesVisible(),
        threshold: 1,
        evaluationPeriods: 1,
        treatMissingData: cw.TreatMissingData.NOT_BREACHING,
      });
      alarm.addAlarmAction(new actions.SnsAction(topic));
    }
    for (const fn of [apiFn, prepare, narrate, submit, complete, reconcile]) {
      new logs.MetricFilter(this, `${fn.node.id}JobFailures`, {
        logGroup: fn.logGroup,
        filterPattern: logs.FilterPattern.all(
          logs.FilterPattern.stringValue("$.event", "=", "job_finished"),
          logs.FilterPattern.stringValue("$.stage", "=", "failed"),
        ),
        metricNamespace: "Pragyan",
        metricName: `${this.stackName}FailedJobs`,
        metricValue: "1",
        defaultValue: 0,
      });
      new cw.Alarm(this, `${fn.node.id}Errors`, {
        metric: fn.metricErrors({ period: cdk.Duration.minutes(5) }),
        threshold: 2,
        evaluationPeriods: 1,
        treatMissingData: cw.TreatMissingData.NOT_BREACHING,
      }).addAlarmAction(new actions.SnsAction(topic));
    }
    new cw.Alarm(this, "FailedJobsAlarm", {
      metric: new cw.Metric({
        namespace: "Pragyan",
        metricName: `${this.stackName}FailedJobs`,
        statistic: "Sum",
        period: cdk.Duration.minutes(5),
      }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cw.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(new actions.SnsAction(topic));
    const dashboard = new cw.Dashboard(this, "Operations", {
      dashboardName: `Pragyan-${this.region}`,
    });
    dashboard.addWidgets(
      new cw.GraphWidget({
        title: "Worker errors and duration",
        left: [
          prepare.metricErrors(),
          narrate.metricErrors(),
          submit.metricErrors(),
        ],
        right: [prepare.metricDuration(), narrate.metricDuration()],
      }),
      new cw.GraphWidget({
        title: "Queue backlog",
        left: Object.values(queues).map((q) =>
          q.metricApproximateNumberOfMessagesVisible(),
        ),
      }),
    );
    if (p.alarmEmail)
      new budgets.CfnBudget(this, "ExperimentBudget", {
        budget: {
          budgetName: "Pragyan-experiment",
          budgetType: "COST",
          timeUnit: "MONTHLY",
          budgetLimit: { amount: 15, unit: "USD" },
        },
        notificationsWithSubscribers: [50, 80, 100].map((threshold) => ({
          notification: {
            comparisonOperator: "GREATER_THAN",
            notificationType: "ACTUAL",
            threshold,
            thresholdType: "PERCENTAGE",
          },
          subscribers: [{ address: p.alarmEmail!, subscriptionType: "EMAIL" }],
        })),
      });
    if (p.createAmplify) {
      const hosting = new amplify.CfnApp(this, "StudioHosting", {
        name: "PragyanStudio",
        platform: "WEB_COMPUTE",
        buildSpec: fs.readFileSync(path.resolve("amplify.yml"), "utf8"),
        environmentVariables: [
          { name: "NEXT_PUBLIC_RUNTIME", value: "aws" },
          { name: "NEXT_PUBLIC_API_ORIGIN", value: http.apiEndpoint },
          {
            name: "NEXT_PUBLIC_COGNITO_CLIENT_ID",
            value: client.userPoolClientId,
          },
          { name: "NEXT_PUBLIC_COGNITO_DOMAIN", value: domain.baseUrl() },
        ],
      });
      new cdk.CfnOutput(this, "AmplifyAppId", { value: hosting.attrAppId });
    }
    if (p.githubRepo && p.githubOidcProviderArn) {
      const provider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
        this,
        "GithubOidc",
        p.githubOidcProviderArn,
      );
      const role = new iam.Role(this, "GithubDeployRole", {
        assumedBy: new iam.WebIdentityPrincipal(
          provider.openIdConnectProviderArn,
          {
            StringEquals: {
              "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
              "token.actions.githubusercontent.com:sub": `repo:${p.githubRepo}:environment:aws-demo`,
            },
          },
        ),
        maxSessionDuration: cdk.Duration.hours(1),
      });
      role.addToPolicy(
        new iam.PolicyStatement({
          actions: ["sts:AssumeRole"],
          resources: [
            `arn:aws:iam::${this.account}:role/cdk-hnb659fds-deploy-role-${this.account}-${this.region}`,
            `arn:aws:iam::${this.account}:role/cdk-hnb659fds-file-publishing-role-${this.account}-${this.region}`,
            `arn:aws:iam::${this.account}:role/cdk-hnb659fds-lookup-role-${this.account}-${this.region}`,
          ],
        }),
      );
      new cdk.CfnOutput(this, "GithubDeployRoleArn", { value: role.roleArn });
    }
    for (const [key, value] of Object.entries({
      ApiUrl: http.apiEndpoint,
      UserPoolId: userPool.userPoolId,
      ClientId: client.userPoolClientId,
      CognitoDomain: domain.baseUrl(),
      MediaBucket: media.bucketName,
      StateTable: table.tableName,
      MediaDomain: distribution.distributionDomainName,
      MediaSignerSecret: mediaSigner.secretArn,
      RenderCallback: `${http.apiEndpoint}/api/render-callback`,
    }))
      new cdk.CfnOutput(this, key, { value });
  }
}
