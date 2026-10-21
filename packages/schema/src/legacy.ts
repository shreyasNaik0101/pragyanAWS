import { z } from "zod";

// --- Scene variants -------------------------------------------------------
// Each segment specifies a `kind` which drives which Remotion scene renders
// it. We default `kind` to 'concept' so legacy payloads (without `kind`) keep
// working unchanged.

const AnimationTypeSchema = z
  .enum(["create", "transform", "move", "write", "fade"])
  .default("fade");

const CommonSegmentFields = {
  text: z.string().max(900),
  duration: z.number().min(2).max(30).default(6),
  animation_type: AnimationTypeSchema,
  // Optional pre-rendered voiceover audio URL (Phase 2 TTS).
  audio_url: z.string().url().optional(),
};

export const ConceptSegmentSchema = z.object({
  kind: z.literal("concept").default("concept"),
  ...CommonSegmentFields,
  visual_cue: z.string().max(300).default(""),
});

export const MathSegmentSchema = z.object({
  kind: z.literal("math"),
  ...CommonSegmentFields,
  // LaTeX strings, e.g. "a^2 + b^2 = c^2". Revealed one-at-a-time.
  steps: z.array(z.string().max(300)).min(1).max(6),
});

export const CodeSegmentSchema = z.object({
  kind: z.literal("code"),
  ...CommonSegmentFields,
  language: z.string().max(30).default("python"),
  code: z.string().max(2400),
  // Line numbers (1-indexed) to highlight.
  highlights: z.array(z.number().int().min(1).max(24)).max(24).default([]),
});

export const DiagramNodeSchema = z.object({
  label: z.string().max(80),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});

export const DiagramEdgeSchema = z.object({
  from: z.number().int().nonnegative(),
  to: z.number().int().nonnegative(),
  label: z.string().max(80).default(""),
});

export const DiagramSegmentSchema = z.object({
  kind: z.literal("diagram"),
  ...CommonSegmentFields,
  nodes: z.array(DiagramNodeSchema).min(1).max(8),
  edges: z.array(DiagramEdgeSchema).max(12).default([]),
});

// --- Stage scene -----------------------------------------------------------
// Free-form illustrated composition. The LLM acts as illustrator: it picks
// named "actors" from our actor library (sun, tree, leaf, water, cloud,
// cell, atom, gear, etc.) and positions them on a 100x100 stage, optionally
// drawing animated light / flow "beams" between them and timed labels.

export const ActorSchema = z.object({
  /** Unique id referenced by beams. */
  id: z.string().max(60),
  /** Name of the actor in the library. */
  actor: z.string().max(60),
  /** Position as percentage of stage, 0-100. */
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  /** 1 is default size. 2 makes the actor twice as large. */
  scale: z.number().min(0.2).max(3).default(1),
  /** Fraction of segment duration (0-1) at which this actor appears. */
  enter_at: z.number().min(0).max(1).default(0),
  /** Spotlight / highlight effect. */
  highlight: z.boolean().default(false),
});

export const BeamSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string().max(80).default(""),
  /** Fraction of duration when the beam starts drawing. */
  start: z.number().min(0).max(1).default(0),
  /** Visual style: light rays, water flow, generic arrow. */
  style: z.enum(["light", "flow", "arrow"]).default("arrow"),
});

export const StageLabelSchema = z.object({
  text: z.string().max(900),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  at: z.number().min(0).max(1).default(0),
});

export const StageSegmentSchema = z.object({
  kind: z.literal("stage"),
  ...CommonSegmentFields,
  /** Visual preset for the backdrop. */
  backdrop: z
    .enum(["sky_ground", "space", "indoor", "plain", "zoom_cell"])
    .default("sky_ground"),
  actors: z.array(ActorSchema).min(1).max(10),
  beams: z.array(BeamSchema).max(15).default([]),
  labels: z.array(StageLabelSchema).max(10).default([]),
});

// --- Whiteboard scene (Golpo-style hand-drawn animation) ------------------

export const WhiteboardPathSchema = z.object({
  d: z
    .string()
    .max(6000)
    .regex(/^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\s-]*$/),
  stroke: z
    .string()
    .regex(/^(#[0-9a-fA-F]{3,8}|none|transparent|currentColor)$/)
    .default("#2c3e50"),
  strokeWidth: z.number().min(0).max(15).default(3),
  fill: z
    .string()
    .regex(/^(#[0-9a-fA-F]{3,8}|none|transparent|currentColor)$/)
    .default("transparent"),
  delay: z.number().min(0).max(30).default(0),
});

export const WhiteboardAnnotationSchema = z.object({
  text: z.string().max(900),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  at: z.number().min(0).max(1).default(0),
  size: z.number().min(8).max(80).default(24),
});

export const WhiteboardSegmentSchema = z.object({
  kind: z.literal("whiteboard"),
  ...CommonSegmentFields,
  visual_cue: z.string().max(300).default(""),
  paths: z.array(WhiteboardPathSchema).max(12).default([]),
  annotations: z.array(WhiteboardAnnotationSchema).max(12).default([]),
});

/** Golpo-style photosynthesis story beats (dedicated Remotion scene). */
export const PhotosynthesisPhaseSchema = z.enum([
  "intro",
  "sun_to_leaf",
  "chlorophyll",
  "inputs",
  "equation",
  "outputs",
  "chloroplast",
]);

export const PhotosynthesisSegmentSchema = z.object({
  kind: z.literal("photosynthesis"),
  ...CommonSegmentFields,
  phase: PhotosynthesisPhaseSchema,
});

export const SegmentSchema = z.discriminatedUnion("kind", [
  ConceptSegmentSchema,
  MathSegmentSchema,
  CodeSegmentSchema,
  DiagramSegmentSchema,
  StageSegmentSchema,
  WhiteboardSegmentSchema,
  PhotosynthesisSegmentSchema,
]);

// Preprocessor: inject `kind: 'concept'` when missing so legacy payloads
// validate under the discriminated union.
export const SegmentInputSchema = z.preprocess((v) => {
  if (v && typeof v === "object" && !(v as any).kind) {
    return { ...(v as object), kind: "concept" };
  }
  return v;
}, SegmentSchema);

export const ScriptSchema = z.object({
  title: z.string(),
  subtitle: z.string().default("An Educational Overview"),
  segments: z.array(SegmentInputSchema).min(1),
  total_duration: z.number().default(30),
  language: z.string().default("english"),
  theme: z
    .object({
      primary: z.string().default("#6366f1"),
      secondary: z.string().default("#ec4899"),
      background: z.string().default("#0f172a"),
      text: z.string().default("#f8fafc"),
    })
    .default({
      primary: "#6366f1",
      secondary: "#ec4899",
      background: "#0f172a",
      text: "#f8fafc",
    }),
});

export type Script = z.infer<typeof ScriptSchema>;
export type Segment = z.infer<typeof SegmentSchema>;
export type ConceptSegment = z.infer<typeof ConceptSegmentSchema>;
export type MathSegment = z.infer<typeof MathSegmentSchema>;
export type CodeSegment = z.infer<typeof CodeSegmentSchema>;
export type DiagramSegment = z.infer<typeof DiagramSegmentSchema>;
export type StageSegment = z.infer<typeof StageSegmentSchema>;
export type WhiteboardSegment = z.infer<typeof WhiteboardSegmentSchema>;
export type PhotosynthesisSegment = z.infer<typeof PhotosynthesisSegmentSchema>;
export type Actor = z.infer<typeof ActorSchema>;
export type Beam = z.infer<typeof BeamSchema>;
export type StageLabel = z.infer<typeof StageLabelSchema>;
