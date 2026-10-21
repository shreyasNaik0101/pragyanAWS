/** Transient, email-free Cognito smoke test; sends no invitation. */
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { handover } from "../packages/schema/src/fixtures";
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminDeleteUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
} from "amazon-cognito-identity-js";

const account = "090208085314";
const region = "us-east-1";
if (process.env.PRAGYAN_DEPLOY_APPROVED !== `${account}:${region}`)
  throw new Error("Pilot account and region guard is required");
const identity = JSON.parse(execFileSync("aws", [
  "sts", "get-caller-identity", "--region", region, "--output", "json",
], { encoding: "utf8", windowsHide: true }));
if (identity.Account !== account) throw new Error("Wrong AWS account");

const poolId = "us-east-1_txEMGh6df";
const clientId = "ijo37v6cvbu0f175em90knb52";
const api = "https://x76kf7xy61.execute-api.us-east-1.amazonaws.com/api";
const username = `pragyan-smoke-${randomUUID()}@example.invalid`;
const password = `P!9a${randomBytes(24).toString("base64url")}`;
const cognito = new CognitoIdentityProviderClient({ region });
async function fetchRetry(url: string, init: RequestInit) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await fetch(url, init); }
    catch (error) {
      if (attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  throw new Error("Network retry exhausted");
}
let created = false;
let token = "";
let projectId = "";
let secondUsername = "";
let secondToken = "";
let createdSecond = false;
try {
  await cognito.send(new AdminCreateUserCommand({
    UserPoolId: poolId,
    Username: username,
    MessageAction: "SUPPRESS",
    UserAttributes: [{ Name: "email", Value: username }],
  }));
  created = true;
  await cognito.send(new AdminSetUserPasswordCommand({
    UserPoolId: poolId,
    Username: username,
    Password: password,
    Permanent: true,
  }));
  const user = new CognitoUser({
    Username: username,
    Pool: new CognitoUserPool({ UserPoolId: poolId, ClientId: clientId }),
  });
  token = await new Promise<string>((resolve, reject) =>
    user.authenticateUser(new AuthenticationDetails({
      Username: username,
      Password: password,
    }), {
      onSuccess: (session) => resolve(session.getAccessToken().getJwtToken()),
      onFailure: reject,
    }),
  );
  const me = await fetch(`${api}/me`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!me.ok) throw new Error(`Authenticated /me returned ${me.status}`);
  const projects = await fetch(`${api}/projects`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!projects.ok) throw new Error(`/projects returned ${projects.status}`);
  console.log("Temporary Cognito SRP sign-in and protected API requests: 200");
  if (process.env.PRAGYAN_SMOKE_PREPARE === "1" || process.env.PRAGYAN_SMOKE_EXPORT === "1") {
    const material = process.env.PRAGYAN_SMOKE_MATERIAL === "1";
    const binary = process.env.PRAGYAN_SMOKE_BINARY === "1";
    const hindi = process.env.PRAGYAN_SMOKE_HINDI === "1";
    const label = hindi ? "network-hindi" : material ? "handover" : binary ? "binary" : "network";
    const call = async (path: string, method = "GET", body?: unknown, requestKey = randomUUID()) => {
      const response = await fetchRetry(api + path, {
        method,
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "idempotency-key": requestKey,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const result = await response.json() as any;
      if (!response.ok)
        throw new Error(`${path}: ${response.status} ${result.error || result.message}`);
      return result;
    };
    const started = Date.now();
    const job = await call("/projects", "POST", {
      title: hindi ? "इंटरनेट अनुरोध सर्वर तक कैसे पहुँचता है" : material ? "A safer equipment handover" : binary
        ? "Binary search, one decision at a time"
        : "How an internet request reaches a server",
      workflow: material ? "material" : "concept",
      language: hindi ? "hindi" : "english",
      audience: "beginner",
      context: material ? "Explain only the supplied procedure and cite the supporting passages."
        : binary ? "Show a sorted list, the midpoint decision and a short code walkthrough."
        : "Keep it under 45 seconds and use a simple network diagram.",
      sourceText: material ? handover : "",
    });
    projectId = job.projectId;
    if (process.env.PRAGYAN_SMOKE_SECURITY === "1") {
      secondUsername = `pragyan-smoke-${randomUUID()}@example.invalid`;
      const secondPassword = `P!9a${randomBytes(24).toString("base64url")}`;
      await cognito.send(new AdminCreateUserCommand({
        UserPoolId: poolId,
        Username: secondUsername,
        MessageAction: "SUPPRESS",
        UserAttributes: [{ Name: "email", Value: secondUsername }],
      }));
      createdSecond = true;
      await cognito.send(new AdminSetUserPasswordCommand({
        UserPoolId: poolId,
        Username: secondUsername,
        Password: secondPassword,
        Permanent: true,
      }));
      const other = new CognitoUser({
        Username: secondUsername,
        Pool: new CognitoUserPool({ UserPoolId: poolId, ClientId: clientId }),
      });
      secondToken = await new Promise<string>((resolve, reject) =>
        other.authenticateUser(new AuthenticationDetails({
          Username: secondUsername,
          Password: secondPassword,
        }), {
          onSuccess: (session) => resolve(session.getAccessToken().getJwtToken()),
          onFailure: reject,
        }),
      );
      const denied = await fetch(`${api}/projects/${projectId}`, {
        headers: { authorization: `Bearer ${secondToken}` },
      });
      if (denied.status !== 404)
        throw new Error(`Cross-user project read returned ${denied.status}`);
      console.log("Cross-user project read: 404");
    }
    let last = "";
    let finished = false;
    for (let i = 0; i < 120; i++) {
      const state = await call(`/jobs/${job.id}`);
      if (state.stage !== last) {
        console.log(`Cloud preparation stage: ${state.stage}`);
        last = state.stage;
      }
      if (state.stage === "complete") {
        finished = true;
        break;
      }
      if (["failed", "needs_review", "cancelled"].includes(state.stage))
        throw new Error(`Cloud preparation ${state.stage}: ${state.error || "see logs"}`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    if (!finished) throw new Error("Cloud preparation exceeded six minutes");
    const detail = await call(`/projects/${projectId}`);
    const audioUrl = Object.values(detail.audioUrls || {})[0] as string | undefined;
    if (!detail.revision?.scenes?.length || !audioUrl)
      throw new Error("Prepared project has no narrated scenes");
    if (material && (!detail.revision.sources?.length ||
      !detail.revision.scenes.some((s: any) => s.sourceIds?.length && s.basis === "source")))
      throw new Error("Material explanation has no source-supported scenes");
    const audio = await fetch(audioUrl);
    if (!audio.ok || (await audio.arrayBuffer()).byteLength < 100)
      throw new Error(`Signed narration media returned ${audio.status}`);
    const report = {
      checkedAt: new Date().toISOString(),
      projectId,
      jobId: job.id,
      revision: detail.project.revision,
      scenes: detail.revision.scenes.length,
      elapsedMs: Date.now() - started,
      audioDelivered: true,
    };
    await fs.writeFile(`artifacts/${label}-cloud-preparation.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
    if (process.env.PRAGYAN_SMOKE_RECOVERY === "1") {
      const sceneId = detail.revision.scenes[0].id;
      const tooLong = structuredClone(detail.revision);
      tooLong.scenes[0].narration = "This deliberately long sentence makes the narration exceed the supported scene duration. ".repeat(10);
      const changed = await call(`/projects/${projectId}`, "PUT", {
        expectedRevision: detail.project.revision,
        revision: tooLong,
      });
      if (changed.revision.scenes[0].audio.status === "ready")
        throw new Error("Changed narration retained stale audio");
      const failedJob = await call(`/projects/${projectId}/narration`, "POST", {
        revision: changed.project.revision,
        sceneId,
      });
      let failed = false;
      for (let i = 0; i < 70; i++) {
        const state = await call(`/jobs/${failedJob.id}`);
        if (state.stage === "failed") { failed = true; break; }
        if (state.stage === "complete") throw new Error("Overlong narration unexpectedly succeeded");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      if (!failed) throw new Error("Controlled narration failure did not become visible");
      const failedDetail = await call(`/projects/${projectId}`);
      if (failedDetail.revision.scenes[0].audio.status !== "failed")
        throw new Error("Failed scene was not marked for targeted retry");
      const repaired = structuredClone(failedDetail.revision);
      repaired.scenes[0].narration = "A browser sends a request through the network. The server replies with the requested information.";
      const saved = await call(`/projects/${projectId}`, "PUT", {
        expectedRevision: failedDetail.project.revision,
        revision: repaired,
      });
      const retryJob = await call(`/projects/${projectId}/narration`, "POST", {
        revision: saved.project.revision,
        sceneId,
      });
      let recovered = false;
      for (let i = 0; i < 70; i++) {
        const state = await call(`/jobs/${retryJob.id}`);
        if (state.stage === "complete") { recovered = true; break; }
        if (state.stage === "failed") throw new Error(`Targeted retry failed: ${state.error}`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      if (!recovered) throw new Error("Targeted narration retry did not complete");
      const after = await call(`/projects/${projectId}`);
      if (after.revision.scenes[0].audio.status !== "ready" ||
        after.revision.scenes.some((s: any) => s.audio.status !== "ready"))
        throw new Error("Recovered revision still has stale audio");
      const recoveryReport = {
        checkedAt: new Date().toISOString(),
        projectId,
        failedJobId: failedJob.id,
        retryJobId: retryJob.id,
        revision: after.project.revision,
        staleAudioBlocked: true,
        targetedRetryComplete: true,
      };
      await fs.writeFile("artifacts/cloud-recovery.json", JSON.stringify(recoveryReport, null, 2));
      console.log(JSON.stringify(recoveryReport));
    }
    if (process.env.PRAGYAN_SMOKE_EXPORT === "1") {
      const exportStarted = Date.now();
      const exportKey = randomUUID();
      const exported = await call(`/projects/${projectId}/exports`, "POST", {
        revision: detail.project.revision,
        approved: true,
      }, exportKey);
      if (process.env.PRAGYAN_SMOKE_SECURITY === "1") {
        const duplicate = await call(`/projects/${projectId}/exports`, "POST", {
          revision: detail.project.revision,
          approved: true,
        }, exportKey);
        if (duplicate.id !== exported.id)
          throw new Error("Idempotent export request produced another job");
        const limited = await fetch(`${api}/projects/${projectId}/exports`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
            "idempotency-key": randomUUID(),
          },
          body: JSON.stringify({ revision: detail.project.revision, approved: true }),
        });
        if (limited.status !== 429)
          throw new Error(`Concurrent export request returned ${limited.status}`);
        console.log("Duplicate export reused job; concurrent export: 429");
      }
      let exportStage = "";
      let completed = false;
      for (let i = 0; i < 240; i++) {
        const state = await call(`/jobs/${exported.id}`);
        if (state.stage !== exportStage) {
          console.log(`Cloud export stage: ${state.stage}`);
          exportStage = state.stage;
        }
        if (state.stage === "complete") {
          completed = true;
          break;
        }
        if (["failed", "needs_review", "cancelled"].includes(state.stage))
          throw new Error(`Cloud export ${state.stage}: ${state.error || "see logs"}`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      if (!completed) throw new Error("Cloud export exceeded twelve minutes");
      const artifacts = await call(`/jobs/${exported.id}/artifacts`);
      if (secondToken) {
        const denied = await fetch(`${api}/jobs/${exported.id}/artifacts`, {
          headers: { authorization: `Bearer ${secondToken}` },
        });
        if (denied.status !== 404)
          throw new Error(`Cross-user artifact read returned ${denied.status}`);
        console.log("Cross-user artifact read: 404");
      }
      const video = await fetch(artifacts.video);
      const captions = await fetch(artifacts.captions);
      if (!video.ok || !captions.ok)
        throw new Error(`Media delivery failed: ${video.status}, ${captions.status}`);
      const bytes = Buffer.from(await video.arrayBuffer());
      if (bytes.subarray(4, 8).toString() !== "ftyp")
        throw new Error("Cloud output is not an MP4");
      const vtt = await captions.text();
      if (!vtt.startsWith("WEBVTT")) throw new Error("Cloud captions are invalid");
      await fs.writeFile(`artifacts/${label}-cloud.mp4`, bytes);
      await fs.writeFile(`artifacts/${label}-cloud.vtt`, vtt);
      const exportReport = {
        checkedAt: new Date().toISOString(),
        projectId,
        jobId: exported.id,
        revision: detail.project.revision,
        elapsedMs: Date.now() - exportStarted,
        videoBytes: bytes.length,
        captionsBytes: Buffer.byteLength(vtt),
      };
      await fs.writeFile(`artifacts/${label}-cloud-export.json`, JSON.stringify(exportReport, null, 2));
      console.log(JSON.stringify(exportReport));
    }
    await call(`/projects/${projectId}`, "DELETE");
    projectId = "";
  }
} finally {
  if (projectId && token) {
    try {
      await fetchRetry(`${api}/projects/${projectId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });
    } catch { /* Keep the original error; operator cleanup can follow. */ }
  }
  if (createdSecond)
    await cognito.send(new AdminDeleteUserCommand({
      UserPoolId: poolId,
      Username: secondUsername,
    }));
  if (created)
    await cognito.send(new AdminDeleteUserCommand({
      UserPoolId: poolId,
      Username: username,
    }));
}
