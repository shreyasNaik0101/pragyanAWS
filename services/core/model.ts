import type { Row } from "./storage";
import type { CreateInput } from "@pragyan/schema";
export interface Project extends Row {
  kind: "PROJECT";
  title: string;
  workflow: "concept" | "material";
  language: string;
  revision: number;
  revisionKey?: string;
  updatedAt: string;
  createdAt: string;
  deleted?: boolean;
  preparing?: string;
  exporting?: string;
}
export interface Job extends Row {
  kind: "JOB";
  projectId: string;
  type: "prepare" | "narrate" | "export";
  stage:
    | "queued"
    | "preparing"
    | "narrating"
    | "submitting"
    | "rendering"
    | "complete"
    | "failed"
    | "needs_review"
    | "cancelled";
  queue: "prepare" | "narrate" | "render" | "completion";
  revision: number;
  snapshotKey: string;
  createdAt: string;
  updatedAt: string;
  leaseUntil?: number;
  attempts: number;
  error?: string;
  renderId?: string;
  bucketName?: string;
  outputKey?: string;
  captionKey?: string;
  progress?: number;
  quotaDay: string;
  released?: boolean;
  rendererVersion: string;
  requestKey?: string;
  renderFunction?: string;
  renderSite?: string;
}
export const now = () => new Date().toISOString();
export const ownerPrefix = (owner: string) =>
  `users/${encodeURIComponent(owner).replace(/%/g, "_")}`;
export const projectPrefix = (owner: string, id: string) =>
  `${ownerPrefix(owner)}/projects/${id}`;
export type Preparation = { input: CreateInput; sources?: unknown[] };
