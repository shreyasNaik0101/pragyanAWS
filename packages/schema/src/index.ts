import { z } from "zod";
import { SegmentSchema } from "./legacy";
export * from "./legacy";
export const FPS = 24,
  WIDTH = 1280,
  HEIGHT = 720,
  RENDERER_VERSION = "pragyan-1-remotion-4.0.533";
export const LIMITS = {
  scenes: 8,
  seconds: 90,
  input: 16000,
  uploadBytes: 5 * 1024 * 1024,
  exportsPerDay: 3,
  preparationsPerDay: 8,
  activeExports: 1,
};
export const Language = z.enum([
  "english",
  "hindi",
  "kannada",
  "tamil",
  "telugu",
  "marathi",
  "bengali",
  "gujarati",
  "punjabi",
]);
export const Theme = z.enum(["paper", "ocean", "forest"]);
export const Source = z.object({
  id: z.string().max(80),
  text: z.string().min(1).max(2400),
  page: z.number().int().positive().optional(),
});
export const AudioSchema = z.object({
  status: z.enum(["missing", "ready", "failed", "stale"]),
  key: z.string().optional(),
  fingerprint: z.string().optional(),
  seconds: z.number().positive().max(30).optional(),
  error: z.string().max(250).optional(),
  provider: z.string().optional(),
});
export const SceneSchema = z
  .object({
    id: z.string().regex(/^[\w-]{1,80}$/),
    title: z.string().min(1).max(90),
    narration: z.string().min(1).max(900),
    visual: SegmentSchema,
    sourceIds: z.array(z.string()).max(8).default([]),
    basis: z.enum(["source", "explanation"]).default("explanation"),
    audio: AudioSchema.default({ status: "missing" }),
  })
  .superRefine((s, c) => {
    if (JSON.stringify(s.visual).length > 12000)
      c.addIssue({ code: "custom", message: "Visual is too large" });
    if (s.visual.audio_url)
      c.addIssue({
        code: "custom",
        message: "External audio URLs are not accepted",
      });
    if (s.visual.duration < 2 || s.visual.duration > 30)
      c.addIssue({
        code: "custom",
        message: "Scene duration must be 2–30 seconds",
      });
    if (s.visual.kind === "diagram") {
      if (s.visual.nodes.length > 8 || s.visual.edges.length > 12)
        c.addIssue({
          code: "custom",
          message: "Diagram exceeds node/edge limits",
        });
      for (const e of s.visual.edges)
        if (
          !Number.isInteger(e.from) ||
          !Number.isInteger(e.to) ||
          e.from < 0 ||
          e.to < 0 ||
          e.from >= s.visual.nodes.length ||
          e.to >= s.visual.nodes.length
        )
          c.addIssue({ code: "custom", message: "Invalid diagram edge" });
    }
    if (
      s.visual.kind === "code" &&
      (s.visual.code.length > 2400 || s.visual.code.split("\n").length > 24)
    )
      c.addIssue({
        code: "custom",
        message: "Code is limited to 24 lines / 2400 characters",
      });
    if (s.visual.kind === "math" && s.visual.steps.length > 6)
      c.addIssue({ code: "custom", message: "Maximum six math steps" });
    if (s.visual.kind === "stage" && s.visual.actors.length > 10)
      c.addIssue({ code: "custom", message: "Maximum ten illustrated actors" });
  });
export const RevisionSchema = z
  .object({
    title: z.string().min(1).max(100),
    language: Language,
    theme: Theme.default("paper"),
    audience: z.enum(["beginner", "intermediate", "advanced"]),
    voice: z.string().max(80).default("default"),
    scenes: z.array(SceneSchema).min(1).max(LIMITS.scenes),
    sources: z.array(Source).max(40).default([]),
    rendererVersion: z.literal(RENDERER_VERSION).default(RENDERER_VERSION),
  })
  .superRefine((r, c) => {
    const ids = new Set(r.sources.map((s) => s.id));
    if (new Set(r.scenes.map((s) => s.id)).size !== r.scenes.length)
      c.addIssue({ code: "custom", message: "Scene IDs must be unique" });
    if (new Set(r.sources.map((s) => s.id)).size !== r.sources.length)
      c.addIssue({ code: "custom", message: "Source IDs must be unique" });
    for (const s of r.scenes) {
      if (s.sourceIds.some((id) => !ids.has(id)))
        c.addIssue({ code: "custom", message: "Unknown source reference" });
      if (s.basis === "source" && !s.sourceIds.length)
        c.addIssue({
          code: "custom",
          message: "Source-supported scenes need a passage",
        });
    }
    if (timeline(r as Revision).totalFrames > LIMITS.seconds * FPS)
      c.addIssue({ code: "custom", message: "Explanation exceeds 90 seconds" });
  });
export const CreateSchema = z
  .object({
    title: z.string().trim().min(3).max(100),
    workflow: z.enum(["concept", "material"]),
    language: Language.default("english"),
    audience: z
      .enum(["beginner", "intermediate", "advanced"])
      .default("beginner"),
    context: z.string().max(LIMITS.input).default(""),
    sourceText: z.string().max(LIMITS.input).default(""),
    sourceKey: z.string().max(300).optional(),
  })
  .superRefine((x, c) => {
    if (
      x.workflow === "material" &&
      !x.sourceKey &&
      x.sourceText.trim().length < 40
    )
      c.addIssue({
        code: "custom",
        message: "Paste at least 40 characters or upload a text PDF",
      });
  });
export type Revision = z.infer<typeof RevisionSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type CreateInput = z.infer<typeof CreateSchema>;
export type Passage = z.infer<typeof Source>;
export function sceneFrames(s: Scene) {
  return Math.max(
    48,
    Math.ceil(
      ((s.audio.status === "ready" && s.audio.seconds
        ? s.audio.seconds + 0.3
        : s.visual.duration) || 6) * FPS,
    ),
  );
}
export function timeline(r: Pick<Revision, "scenes">) {
  let cursor = 0;
  const scenes = r.scenes.map((s) => {
    const start = cursor,
      frames = sceneFrames(s);
    cursor += frames;
    return { id: s.id, start, frames };
  });
  return { scenes, totalFrames: cursor };
}
export const themes = {
  paper: {
    primary: "#6658d9",
    secondary: "#dd925e",
    background: "#faf8f3",
    text: "#252936",
  },
  ocean: {
    primary: "#287fce",
    secondary: "#55b6ac",
    background: "#f0f7fb",
    text: "#163446",
  },
  forest: {
    primary: "#2c8269",
    secondary: "#d8a557",
    background: "#f4f8ee",
    text: "#203c32",
  },
};
export function sceneCues(scene: Scene) {
  const words = scene.narration.trim().split(/\s+/);
  const groups: string[] = [];
  let current = "";
  for (const word of words) {
    if (
      current &&
      (current.length + word.length > 90 || current.split(" ").length >= 14)
    ) {
      groups.push(current);
      current = "";
    }
    current += (current ? " " : "") + word;
  }
  if (current) groups.push(current);
  const frames = sceneFrames(scene),
    weight = groups.reduce((n, g) => n + g.length, 0);
  let consumed = 0;
  return groups.map((text, i) => {
    const start = Math.floor((consumed / weight) * frames);
    consumed += text.length;
    return {
      text,
      start,
      end:
        i === groups.length - 1
          ? frames
          : Math.floor((consumed / weight) * frames),
    };
  });
}
export function captions(r: Revision) {
  const t = timeline(r);
  const stamp = (f: number) =>
    new Date(Math.round((f / FPS) * 1000)).toISOString().slice(11, 23);
  let count = 0;
  return (
    "WEBVTT\n\n" +
    r.scenes
      .flatMap((s, i) =>
        sceneCues(s).map(
          (c) =>
            `${++count}\n${stamp(t.scenes[i].start + c.start)} --> ${stamp(t.scenes[i].start + c.end)}\n${c.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/-->/g, "→")}\n`,
        ),
      )
      .join("\n")
  );
}
