/** Offline policy generation only. No AWS calls. Review before creating a role. */
import { getRolePolicy } from "@remotion/lambda";
import fs from "node:fs/promises";
await fs.mkdir("artifacts", { recursive: true });
const policy = JSON.parse(getRolePolicy()) as {
  Statement: Array<{ Resource: string[] }>;
};
// The vendor policy has cross-account Lambda/log ARNs. Keep its required
// actions but bind those ARNs to this reviewed pilot account and region.
for (const statement of policy.Statement)
  statement.Resource = statement.Resource.map((arn) =>
    arn.replace(
      /arn:aws:(lambda|logs):\*:\*/g,
      "arn:aws:$1:us-east-1:090208085314",
    ),
  );
await fs.writeFile(
  "artifacts/remotion-role-policy.json",
  JSON.stringify(policy, null, 2),
);
await fs.writeFile(
  "artifacts/remotion-role-trust.json",
  JSON.stringify(
    {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { Service: "lambda.amazonaws.com" },
          Action: "sts:AssumeRole",
        },
      ],
    },
    null,
    2,
  ),
);
console.log(
  "Wrote reviewable Remotion execution policy and trust policy; no AWS resources were changed.",
);
