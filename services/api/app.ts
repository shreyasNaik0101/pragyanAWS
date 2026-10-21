import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { SignJWT, jwtVerify, createRemoteJWKSet } from "jose";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { LIMITS } from "@pragyan/schema";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Service, AppError, hash } from "../core/service";
import { LocalBlobs, Conflict, localSecret } from "../core/storage";
import { ownerPrefix } from "../core/model";
import { acceptCallback } from "../core/callback";
import { secret } from "../core/providers";
const asyncRoute =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);
export function createApp(
  service: Service,
  aws = process.env.RUNTIME === "aws",
) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  const origin = process.env.APP_ORIGIN || "http://localhost:3000";
  const origins = new Set([
    origin,
    ...(!aws ? ["http://127.0.0.1:3000", "http://localhost:4000"] : []),
  ]);
  app.use(
    cors({
      origin: (o, cb) => cb(null, !o || origins.has(o)),
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "160kb" }));
  app.get("/api/health", (_req, res) =>
    res.json({
      ok: true,
      mode: aws ? "aws" : "local",
      generation: aws ? "bedrock" : "fixtures",
      render: aws ? "lambda" : "local-remotion",
    }),
  );
  if (!aws) {
    app.post(
      "/api/auth/local",
      asyncRoute(async (req, res) => {
        if (req.headers.origin && !origins.has(req.headers.origin))
          throw new AppError(403, "Origin not allowed");
        const name = z.enum(["maya", "arjun"]).parse(req.body.persona);
        const token = await new SignJWT({
          name: name === "maya" ? "Maya" : "Arjun",
          mode: "local",
        })
          .setProtectedHeader({ alg: "HS256" })
          .setSubject(`local-${name}`)
          .setIssuedAt()
          .setExpirationTime("12h")
          .sign(new TextEncoder().encode(await localSecret()));
        res
          .cookie("pragyan_session", token, {
            httpOnly: true,
            sameSite: "strict",
            maxAge: 43200000,
            path: "/",
          })
          .json({ ok: true });
      }),
    );
    app.get(
      "/api/media",
      asyncRoute(async (req, res) => {
        const key = z.string().parse(req.query.key);
        const blob = service.blobs;
        if (
          !(blob instanceof LocalBlobs) ||
          !(await blob.verify(
            key,
            Number(req.query.exp),
            String(req.query.sig || ""),
          ))
        )
          throw new AppError(403, "This media link is invalid or expired");
        const b = await blob.get(key);
        const type = key.endsWith(".mp4")
          ? "video/mp4"
          : key.endsWith(".vtt")
            ? "text/vtt"
            : b.subarray(0, 4).toString() === "RIFF"
              ? "audio/wav"
              : "audio/mpeg";
        res.set({
          "Content-Type": type,
          "Cache-Control": "private, max-age=60",
          "Accept-Ranges": "bytes",
        });
        const range = req.headers.range;
        if (range) {
          const m = /^bytes=(\d+)-(\d*)$/.exec(range);
          if (!m) throw new AppError(416, "Invalid byte range");
          const start = Number(m[1]),
            end = Math.min(m[2] ? Number(m[2]) : b.length - 1, b.length - 1);
          if (start > end || start >= b.length)
            throw new AppError(416, "Invalid byte range");
          res
            .status(206)
            .set("Content-Range", `bytes ${start}-${end}/${b.length}`)
            .send(b.subarray(start, end + 1));
        } else res.send(b);
      }),
    );
  }
  app.post(
    "/api/render-callback",
    asyncRoute(async (req, res) => {
      if (!aws) throw new AppError(404, "Cloud callback is disabled locally");
      if (req.header("x-remotion-mode") !== "production")
        throw new AppError(400, "Production callback required");
      await acceptCallback(
        service,
        req.body,
        req.header("x-remotion-signature") || "",
        await secret(process.env.WEBHOOK_SECRET_ARN!),
      );
      res.json({ accepted: true });
    }),
  );
  const issuer = aws
    ? `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_POOL_ID}`
    : "";
  const jwks = aws
    ? createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`))
    : null;
  app.use(
    "/api",
    asyncRoute(async (req, res, next) => {
      let token = aws
        ? req.header("authorization")?.replace(/^Bearer /, "")
        : req.cookies.pragyan_session;
      if (!token) throw new AppError(401, "Please sign in");
      try {
        const { payload } = await jwtVerify(
          token,
          aws ? jwks! : new TextEncoder().encode(await localSecret()),
          aws ? { issuer, algorithms: ["RS256"] } : { algorithms: ["HS256"] },
        );
        if (
          !payload.sub ||
          (aws &&
            (payload.token_use !== "access" ||
              payload.client_id !== process.env.COGNITO_CLIENT_ID))
        )
          throw new Error("Invalid token");
        res.locals.owner = payload.sub;
        res.locals.name = payload.name || "Creator";
      } catch {
        throw new AppError(401, "Your session expired. Sign in again.");
      }
      if (
        !aws &&
        !["GET", "HEAD"].includes(req.method) &&
        req.headers.origin &&
        !origins.has(req.headers.origin)
      )
        throw new AppError(403, "Origin not allowed");
      res.locals.authenticated = true;
      next();
    }),
  );
  // Async authentication above intentionally calls next only after the promise completes.
  app.get(
    "/api/me",
    asyncRoute(async (_req, res) =>
      res.json({
        id: res.locals.owner,
        name: res.locals.name,
        ...(await service.usage(res.locals.owner)),
      }),
    ),
  );
  app.post("/api/auth/logout", (_req, res) =>
    res.clearCookie("pragyan_session", { path: "/" }).json({ ok: true }),
  );
  app.get(
    "/api/projects",
    asyncRoute(async (_req, res) => {
      const projects = (await service.store.list(res.locals.owner, "PROJECT"))
        .filter((p) => !p.deleted)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      res.json({ projects });
    }),
  );
  const idem = (req: Request) =>
    z.string().min(8).max(100).parse(req.header("idempotency-key"));
  app.post(
    "/api/projects",
    asyncRoute(async (req, res) =>
      res
        .status(202)
        .json(await service.create(res.locals.owner, req.body, idem(req))),
    ),
  );
  app.get(
    "/api/projects/:id",
    asyncRoute(async (req, res) => {
      const data = await service.revision(res.locals.owner, req.params.id);
      const audioUrls: Record<string, string> = {};
      if (data.revision)
        for (const s of data.revision.scenes)
          if (s.audio.status === "ready" && s.audio.key)
            audioUrls[s.id] = await service.blobs.url(s.audio.key);
      const jobs = (await service.store.list(res.locals.owner, "JOB"))
        .filter((j) => j.projectId === req.params.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      res.json({ ...data, audioUrls, jobs });
    }),
  );
  app.put(
    "/api/projects/:id",
    asyncRoute(async (req, res) =>
      res.json(
        await service.save(
          res.locals.owner,
          req.params.id,
          z.number().int().nonnegative().parse(req.body.expectedRevision),
          req.body.revision,
        ),
      ),
    ),
  );
  app.delete(
    "/api/projects/:id",
    asyncRoute(async (req, res) => {
      await service.remove(res.locals.owner, req.params.id);
      res.json({ deleted: true });
    }),
  );
  app.post(
    "/api/projects/:id/narration",
    asyncRoute(async (req, res) =>
      res
        .status(202)
        .json(
          await service.narrate(
            res.locals.owner,
            req.params.id,
            z.number().int().parse(req.body.revision),
            z.string().optional().parse(req.body.sceneId),
          ),
        ),
    ),
  );
  app.post(
    "/api/projects/:id/exports",
    asyncRoute(async (req, res) => {
      if (req.body.approved !== true)
        throw new AppError(
          400,
          "Review and approve this revision before exporting",
        );
      res
        .status(202)
        .json(
          await service.export(
            res.locals.owner,
            req.params.id,
            z.number().int().parse(req.body.revision),
            idem(req),
          ),
        );
    }),
  );
  app.post(
    "/api/jobs/:id/retry",
    asyncRoute(async (req, res) => {
      const j = await service.job(res.locals.owner, req.params.id);
      if (j.type === "export")
        throw new AppError(
          400,
          "Review and approve the current revision in the export dialog",
        );
      res
        .status(202)
        .json(await service.retry(res.locals.owner, req.params.id));
    }),
  );
  app.get(
    "/api/jobs/:id",
    asyncRoute(async (req, res) =>
      res.json(await service.job(res.locals.owner, req.params.id)),
    ),
  );
  app.get(
    "/api/jobs/:id/artifacts",
    asyncRoute(async (req, res) => {
      const j = await service.job(res.locals.owner, req.params.id);
      if (j.stage !== "complete" || j.type !== "export" || !j.outputKey)
        throw new AppError(409, "Export is not ready");
      res.json({
        video: await service.blobs.url(j.outputKey),
        captions: j.captionKey ? await service.blobs.url(j.captionKey) : null,
      });
    }),
  );
  app.post(
    "/api/uploads",
    asyncRoute(async (req, res) => {
      const { size, type } = z
        .object({
          size: z.number().int().positive().max(LIMITS.uploadBytes),
          type: z.literal("application/pdf"),
        })
        .parse(req.body);
      const key = `uploads/${ownerPrefix(res.locals.owner)}/${randomUUID()}.pdf`;
      await service.store.transaction([
        {
          value: {
            id: `upload:${hash(key)}`,
            owner: res.locals.owner,
            kind: "UPLOAD",
            v: 1,
            key,
            size,
            ready: false,
            expiresAt: Math.floor(Date.now() / 1000) + 86400,
          },
          expected: null,
        },
      ]);
      const url = aws
        ? await getSignedUrl(
            new S3Client({}),
            new PutObjectCommand({
              Bucket: process.env.MEDIA_BUCKET,
              Key: key,
              ContentType: type,
              ContentLength: size,
            }),
            { expiresIn: 300 },
          )
        : `/api/uploads/content?key=${encodeURIComponent(key)}`;
      res.json({ key, url });
    }),
  );
  app.put(
    "/api/uploads/content",
    express.raw({ type: "application/pdf", limit: LIMITS.uploadBytes }),
    asyncRoute(async (req, res) => {
      if (aws) throw new AppError(404, "Use the authorized S3 upload");
      const key = z.string().parse(req.query.key),
        record = await service.store.get(`upload:${hash(key)}`);
      if (
        !record ||
        record.owner !== res.locals.owner ||
        record.ready ||
        record.expiresAt < Date.now() / 1000
      )
        throw new AppError(404, "Upload not found");
      if (
        !Buffer.isBuffer(req.body) ||
        req.body.length !== record.size ||
        req.body.subarray(0, 5).toString() !== "%PDF-"
      )
        throw new AppError(400, "Invalid PDF upload");
      await service.blobs.put(key, req.body, "application/pdf");
      res.json({ uploaded: true });
    }),
  );
  app.post(
    "/api/uploads/complete",
    asyncRoute(async (req, res) => {
      const key = z.string().parse(req.body.key),
        r = await service.store.get(`upload:${hash(key)}`);
      if (!r || r.owner !== res.locals.owner || r.expiresAt < Date.now() / 1000)
        throw new AppError(404, "Upload not found");
      if (aws) {
        const head = await new S3Client({}).send(
          new HeadObjectCommand({ Bucket: process.env.MEDIA_BUCKET, Key: key }),
        );
        if (
          head.ContentLength !== r.size ||
          (head.ContentLength || 0) > LIMITS.uploadBytes ||
          head.ContentType !== "application/pdf"
        )
          throw new AppError(
            400,
            "Uploaded PDF does not match the declared size and type",
          );
      } else await service.blobs.get(key);
      if (!r.ready)
        await service.store.transaction([
          { value: { ...r, ready: true, v: r.v + 1 }, expected: r.v },
        ]);
      res.json({ key, ready: true });
    }),
  );
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status =
      err instanceof AppError
        ? err.status
        : err instanceof Conflict
          ? 409
          : err instanceof z.ZodError
            ? 400
            : err.type === "entity.too.large"
              ? 413
              : 500;
    res
      .status(status)
      .json({
        error:
          status === 500
            ? "Unexpected server error. Try again or inspect local logs."
            : err instanceof z.ZodError
              ? err.issues.map((i) => i.message).join("; ")
              : err.message,
      });
    if (status === 500)
      console.error(JSON.stringify({ event: "api_error", name: err.name }));
  });
  return app;
}
