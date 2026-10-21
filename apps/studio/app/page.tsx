"use client";
import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Play,
  Layers,
  BookOpen,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Check,
  Globe2,
  Settings2,
  Download,
  FileText,
  Code2,
  Network,
  MoreHorizontal,
  Trash2,
  GripVertical,
  Volume2,
  RefreshCw,
  LogOut,
  AlertCircle,
  X,
  MoveUp,
  MoveDown,
  Cloud,
  CheckCircle2,
  Loader2,
  Palette,
  Film,
  ShieldCheck,
} from "lucide-react";
import type { PlayerRef } from "@remotion/player";
import {
  RevisionSchema,
  SegmentSchema,
  Language,
  timeline,
  FPS,
  type Revision,
  type Scene,
} from "@pragyan/schema";
import { samples, handover } from "../../../packages/schema/src/fixtures";
const Preview = dynamic(() => import("./preview"), {
  ssr: false,
  loading: () => (
    <div className="preview-loading">
      <Loader2 className="spin" /> Loading the canvas
    </div>
  ),
});
type Project = {
  id: string;
  title: string;
  language: string;
  revision: number;
  updatedAt: string;
  workflow: string;
  preparing?: string;
};
type Job = {
  id: string;
  type: string;
  stage: string;
  revision: number;
  error?: string;
  progress?: number;
  createdAt: string;
};
type Data = {
  project: Project;
  revision: Revision | null;
  audioUrls: Record<string, string>;
  jobs: Job[];
};
const isCloud = process.env.NEXT_PUBLIC_RUNTIME === "aws";
const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN || "";
async function api(path: string, options: RequestInit = {}) {
  const token =
    typeof window !== "undefined"
      ? sessionStorage.getItem("pragyan_access")
      : null;
  const res = await fetch(apiOrigin + "/api" + path, {
    ...options,
    credentials: isCloud ? "omit" : "include",
    headers: {
      ...(!(options.body instanceof Blob)
        ? { "content-type": "application/json" }
        : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
const post = (path: string, body: unknown, idem = false) =>
  api(path, {
    method: "POST",
    body: JSON.stringify(body),
    headers: idem ? { "idempotency-key": crypto.randomUUID() } : undefined,
  });
function Mark() {
  return (
    <span className="mark">
      <span />
      <span />
      <span />
    </span>
  );
}
function Artwork({ kind = 0 }: { kind?: number }) {
  return (
    <div className={`artwork art-${kind % 3}`}>
      <div className="art-grid" />
      {kind % 3 === 0 ? (
        <div className="mini-network">
          <span>Browser</span>
          <i />
          <span>DNS</span>
          <i />
          <span>Server</span>
          <b className="packet" />
        </div>
      ) : kind % 3 === 1 ? (
        <div className="mini-code">
          <small>find the middle</small>
          <code>
            <em>while</em> low ≤ high:
            <br />　 mid = (low + high) / <b>2</b>
            <br />　 <em>return</em> a clearer answer
          </code>
          <div className="number-row">
            {[2, 4, 8, 16, 32].map((n, i) => (
              <b className={i === 2 ? "selected" : ""} key={n}>
                {n}
              </b>
            ))}
          </div>
        </div>
      ) : (
        <div className="mini-steps">
          <span>
            <Check size={20} /> Inspect
          </span>
          <i />
          <span>
            <ShieldCheck size={20} /> Verify
          </span>
          <i />
          <span>
            <FileText size={20} /> Record
          </span>
        </div>
      )}
    </div>
  );
}
function Pill({
  children,
  tone = "",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`pill ${tone}`}>{children}</span>;
}
export default function Studio() {
  const [user, setUser] = useState<any>(null),
    [boot, setBoot] = useState(true),
    [projects, setProjects] = useState<Project[]>([]),
    [active, setActive] = useState<string | null>(null),
    [data, setData] = useState<Data | null>(null),
    [draft, setDraft] = useState<Revision | null>(null),
    [dirty, setDirty] = useState(false),
    [selected, setSelected] = useState(0),
    [modal, setModal] = useState<"login" | "create" | "export" | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [workflow, setWorkflow] = useState<"concept" | "material">("concept"),
    [title, setTitle] = useState(""),
    [sourceText, setSourceText] = useState(""),
    [context, setContext] = useState(""),
    [language, setLanguage] = useState("english"),
    [audience, setAudience] = useState("beginner"),
    [sourceKey, setSourceKey] = useState(""),
    [fileName, setFileName] = useState(""),
    [approved, setApproved] = useState(false),
    [artifacts, setArtifacts] = useState<{
      video: string;
      captions: string;
    } | null>(null),
    [panel, setPanel] = useState<"script" | "visual" | "sources">("script"),
    [visualJson, setVisualJson] = useState("");
  const player = useRef<PlayerRef>(null),
    dirtyRef = useRef(false),
    baseRevision = useRef(0);
  dirtyRef.current = dirty;
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const loadLibrary = async () => {
    const [me, list] = await Promise.all([api("/me"), api("/projects")]);
    setUser(me);
    setProjects(list.projects);
  };
  const loadProject = async (id: string, force = false) => {
    const result: Data = await api("/projects/" + id);
    setData(result);
    if (force || !dirtyRef.current) {
      setDraft(result.revision);
      baseRevision.current = result.project.revision;
      setSelected((i) =>
        Math.min(i, Math.max(0, (result.revision?.scenes.length || 1) - 1)),
      );
      setDirty(false);
    }
    return result;
  };
  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(location.search);
        if (params.has("code")) {
          const state = sessionStorage.getItem("oauth_state");
          if (params.get("state") !== state)
            throw new Error("Sign-in state mismatch. Please sign in again.");
          const redirect = location.origin + "/";
          const r = await fetch(
            `${process.env.NEXT_PUBLIC_COGNITO_DOMAIN}/oauth2/token`,
            {
              method: "POST",
              headers: { "content-type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                grant_type: "authorization_code",
                client_id: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
                code: params.get("code")!,
                redirect_uri: redirect,
                code_verifier: sessionStorage.getItem("oauth_verifier")!,
              }),
            },
          );
          if (!r.ok) throw new Error("Sign-in could not be completed");
          const tokens = await r.json();
          sessionStorage.setItem("pragyan_access", tokens.access_token);
          sessionStorage.removeItem("oauth_state");
          sessionStorage.removeItem("oauth_verifier");
          history.replaceState(null, "", "/");
        }
        await loadLibrary();
        const id = new URLSearchParams(location.search).get("project");
        if (id) {
          setActive(id);
          await loadProject(id, true);
        }
      } catch (e) {
        if (!String(e).includes("sign in")) setError((e as Error).message);
      } finally {
        setBoot(false);
      }
    })();
  }, []);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(
      () => loadProject(active).catch((e) => setError(e.message)),
      3500,
    );
    return () => clearInterval(timer);
  }, [active]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  useEffect(() => {
    if (draft?.scenes[selected])
      setVisualJson(JSON.stringify(draft.scenes[selected].visual, null, 2));
  }, [selected, draft?.scenes[selected]?.id]);
  const open = async (id: string) => {
    if (dirty && !confirm("Discard unsaved edits?")) return;
    setActive(id);
    setSelected(0);
    setArtifacts(null);
    setDirty(false);
    dirtyRef.current = false;
    history.replaceState(null, "", `/?project=${id}`);
    await loadProject(id, true);
  };
  const back = async () => {
    if (dirty && !confirm("Discard unsaved edits?")) return;
    setActive(null);
    setData(null);
    setDraft(null);
    setDirty(false);
    history.replaceState(null, "", "/");
    await loadLibrary();
  };
  const chooseSample = (i: number) => {
    setTitle(samples[i].title);
    setWorkflow(i === 2 ? "material" : "concept");
    setSourceText(i === 2 ? handover : "");
    setSourceKey("");
    setFileName("");
    setModal("create");
  };
  const login = async (persona = "maya") => {
    if (isCloud) {
      const random = crypto.getRandomValues(new Uint8Array(32));
      const verifier = btoa(String.fromCharCode(...random))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
      const challenge = btoa(
        String.fromCharCode(
          ...new Uint8Array(
            await crypto.subtle.digest(
              "SHA-256",
              new TextEncoder().encode(verifier),
            ),
          ),
        ),
      )
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
      const state = crypto.randomUUID();
      sessionStorage.setItem("oauth_state", state);
      sessionStorage.setItem("oauth_verifier", verifier);
      location.href = `${process.env.NEXT_PUBLIC_COGNITO_DOMAIN}/oauth2/authorize?${new URLSearchParams({ client_id: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!, response_type: "code", scope: "openid email profile", redirect_uri: location.origin + "/", state, code_challenge: challenge, code_challenge_method: "S256" })}`;
    } else {
      await post("/auth/local", { persona });
      await loadLibrary();
      setModal(null);
    }
  };
  const change = (fn: (r: Revision) => void) => {
    if (!draft) return;
    const next = structuredClone(draft);
    fn(next);
    setDraft(next);
    setDirty(true);
    setNotice("");
  };
  const editScene = (patch: Partial<Scene>) =>
    change((r) => {
      const s = r.scenes[selected];
      Object.assign(s, patch);
      if (patch.narration !== undefined) {
        s.audio = { status: "stale" };
        s.visual.text = patch.narration;
      }
    });
  const save = async () => {
    if (!active || !draft || !data) return;
    RevisionSchema.parse(draft);
    await api("/projects/" + active, {
      method: "PUT",
      body: JSON.stringify({
        expectedRevision: baseRevision.current,
        revision: draft,
      }),
    });
    setDirty(false);
    dirtyRef.current = false;
    await loadProject(active, true);
    setNotice("Revision saved");
  };
  const scene = draft?.scenes[selected];
  const timing = draft ? timeline(draft) : null;
  const activeJobs =
    data?.jobs.filter(
      (j) => !["complete", "failed", "cancelled"].includes(j.stage),
    ) || [];
  const exportJobs = data?.jobs.filter((j) => j.type === "export") || [];
  const processing = Boolean(data?.project.preparing);
  const addScene = () =>
    change((r) => {
      if (r.scenes.length >= 8) return;
      const n = r.scenes.length + 1;
      r.scenes.push({
        id: crypto.randomUUID(),
        title: `Scene ${n}`,
        narration: "Write your explanation here.",
        basis: "explanation",
        sourceIds: [],
        audio: { status: "missing" },
        visual: SegmentSchema.parse({
          kind: "concept",
          text: "Write your explanation here.",
          visual_cue: "A new idea",
          duration: 6,
        }),
      });
      setSelected(n - 1);
    });
  const select = (index: number) => {
    setSelected(index);
    player.current?.seekTo((timing?.scenes[index].start || 0) + 12);
  };
  const changeKind = (kind: string) => {
    const defaults: Record<string, object> = {
      concept: { visual_cue: "A clear idea" },
      code: {
        language: "python",
        code: 'print("Hello, world")',
        highlights: [1],
      },
      math: { steps: ["a^2 + b^2 = c^2"] },
      diagram: {
        nodes: [
          { label: "Input", x: 0, y: 20 },
          { label: "Output", x: 100, y: 20 },
        ],
        edges: [{ from: 0, to: 1, label: "process" }],
      },
      stage: {
        actors: [{ id: "sun", actor: "sun", x: 50, y: 40 }],
        backdrop: "sky_ground",
      },
      whiteboard: {
        visual_cue: "Sketch your idea",
        paths: [],
        annotations: [],
      },
      photosynthesis: { phase: "intro" },
    };
    const v = SegmentSchema.parse({
      kind,
      text: scene?.narration,
      duration: scene?.visual.duration || 6,
      ...defaults[kind],
    });
    editScene({ visual: v });
    setVisualJson(JSON.stringify(v, null, 2));
  };
  const upload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024)
      throw new Error("PDFs must be 5 MB or smaller");
    const u = await post("/uploads", {
      size: file.size,
      type: "application/pdf",
    });
    const token = sessionStorage.getItem("pragyan_access");
    const r = await fetch(
      u.url.startsWith("http") ? u.url : apiOrigin + u.url,
      {
        method: "PUT",
        body: file,
        credentials: isCloud ? "omit" : "include",
        headers: {
          "content-type": "application/pdf",
          ...(!isCloud && token ? { authorization: `Bearer ${token}` } : {}),
        },
      },
    );
    if (!r.ok) throw new Error("PDF upload failed");
    await post("/uploads/complete", { key: u.key });
    setSourceKey(u.key);
    setFileName(file.name);
  };
  if (boot)
    return (
      <div className="boot">
        <Mark />
        <span>Opening your studio…</span>
      </div>
    );
  return (
    <div className="app">
      <aside className="sidebar">
        <button className="brand" onClick={() => act(back)}>
          <Mark />
          pragyan<span>●</span>
        </button>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav>
          <button
            className={!active ? "nav-item current" : "nav-item"}
            onClick={() => act(back)}
          >
            <FolderOpen size={19} /> My projects <span>{projects.length}</span>
          </button>
          <button
            className="nav-item"
            onClick={() => {
              if (!user) setModal("login");
              else {
                setTitle("");
                setModal("create");
              }
            }}
          >
            <Plus size={19} /> Create explanation
          </button>
        </nav>
        <div className="sidebar-note">
          <span className="tiny-symbol">✧</span>
          <h4>
            Small ideas.
            <br />
            Bigger understanding.
          </h4>
          <p>Make something worth explaining.</p>
        </div>
        <div className="environment">
          <span className="status-dot" />
          {isCloud ? "AWS workspace" : "Local development"}
          <small>
            {isCloud
              ? "Private by default"
              : "Fixture generation · real rendering"}
          </small>
        </div>
        {user ? (
          <button
            className="profile"
            onClick={() =>
              act(async () => {
                await post("/auth/logout", {});
                sessionStorage.removeItem("pragyan_access");
                setUser(null);
                setActive(null);
                setDraft(null);
                setProjects([]);
                history.replaceState(null, "", "/");
              })
            }
          >
            <span className="avatar">{user.name?.[0] || "C"}</span>
            <span>
              {user.name}
              <small>{isCloud ? "Creator" : "Demo workspace"}</small>
            </span>
            <LogOut size={16} />
          </button>
        ) : (
          <button
            className="button primary sidebar-login"
            onClick={() => setModal("login")}
          >
            Open your studio <ArrowRight size={16} />
          </button>
        )}
      </aside>
      <main className={active ? "main editor-main" : "main"}>
        <header className="topbar">
          <span>
            {active ? (
              <>
                <button className="text-button" onClick={() => act(back)}>
                  My projects
                </button>
                <ChevronRight size={14} />
                <span className="truncate">
                  {data?.project.title || "Opening project"}
                </span>
              </>
            ) : (
              <>
                THE EXPLANATION STUDIO <span className="topbar-divider" />{" "}
                Ideas, made visible.
              </>
            )}
          </span>
          <div>
            <span className="private-label">
              <ShieldCheck size={14} /> Private workspace
            </span>
            {user && (
              <span className="avatar small">{user.name?.[0] || "C"}</span>
            )}
          </div>
        </header>
        {error && (
          <div role="alert" className="message error">
            <AlertCircle size={17} />
            <span>{error}</span>
            <button aria-label="Dismiss error" onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
        )}
        {notice && (
          <div role="status" className="message success">
            <CheckCircle2 size={17} />
            {notice}
            <button
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {!active ? (
          <div className="library">
            <section className="hero">
              <div>
                <div className="eyebrow">
                  <span /> FROM QUESTION TO CLARITY
                </div>
                <h1>
                  Make the complex
                  <br />
                  <em>click.</em>
                  <span className="hero-star">✳</span>
                </h1>
                <p>
                  Turn a concept or your own material into an animated
                  explanation. Shape every scene. Tell it in your language.
                </p>
                <div className="hero-actions">
                  <button
                    className="button primary"
                    onClick={() => {
                      if (!user) setModal("login");
                      else {
                        setTitle("");
                        setModal("create");
                      }
                    }}
                  >
                    Create an explanation <Plus size={17} />
                  </button>
                  <a href="#examples" className="text-link">
                    Explore examples <ArrowUpRight size={16} />
                  </a>
                </div>
                <div className="hero-meta">
                  <span>
                    <Layers size={14} /> Editable scenes
                  </span>
                  <span>
                    <Globe2 size={14} /> Multilingual narration
                  </span>
                  <span>
                    <Film size={14} /> 720p export
                  </span>
                </div>
              </div>
              <div className="hero-art">
                <div className="floating-label">
                  <span className="status-dot" /> A little clarity, in motion
                </div>
                <Artwork />
                <div className="hero-caption">
                  <span>
                    <Play size={14} fill="currentColor" /> The journey of a web
                    request
                  </span>
                  <span>SCENE 01 / 03</span>
                </div>
                <div className="floating-chip">
                  <CheckCircle2 size={16} /> Yours to edit
                </div>
              </div>
            </section>
            <section className="workflow-cards">
              <button
                onClick={() => {
                  setWorkflow("concept");
                  setTitle("");
                  setModal(user ? "create" : "login");
                }}
              >
                <span className="workflow-icon lavender">
                  <Layers size={23} />
                </span>
                <span>
                  <h3>Explain a concept</h3>
                  <p>A question, an idea, a moment of curiosity.</p>
                </span>
                <ArrowUpRight size={21} />
              </button>
              <button
                onClick={() => {
                  setWorkflow("material");
                  setTitle("");
                  setModal(user ? "create" : "login");
                }}
              >
                <span className="workflow-icon peach">
                  <FileText size={23} />
                </span>
                <span>
                  <h3>Explain my material</h3>
                  <p>Your knowledge, with sources kept in view.</p>
                </span>
                <ArrowUpRight size={21} />
              </button>
            </section>
            <section className="project-section">
              <div className="section-heading">
                <div>
                  <h2>
                    Your explanations <span>{projects.length}</span>
                  </h2>
                  <p>A space for ideas in progress.</p>
                </div>
                {user && (
                  <div className="quota">
                    <Film size={15} />
                    {user.exports} / {user.limits.exportsPerDay} daily exports
                  </div>
                )}
              </div>
              {projects.length ? (
                <div className="project-grid">
                  {projects.map((p, i) => (
                    <button
                      className="project-card"
                      key={p.id}
                      onClick={() => act(() => open(p.id))}
                    >
                      <div className="thumb">
                        <Artwork
                          kind={
                            /binary|search/i.test(p.title)
                              ? 1
                              : p.workflow === "material"
                                ? 2
                                : 0
                          }
                        />
                        <span className="thumb-badge">
                          {p.preparing
                            ? "Preparing"
                            : p.revision
                              ? "Editable draft"
                              : "Needs attention"}
                        </span>
                        <span className="open-project">
                          <ArrowUpRight size={20} />
                        </span>
                      </div>
                      <div className="card-body">
                        <h3>{p.title}</h3>
                        <div>
                          <span>
                            <Globe2 size={13} />
                            {p.language}
                          </span>
                          <span>
                            {p.revision
                              ? `Revision ${p.revision}`
                              : "New project"}
                          </span>
                        </div>
                        <small>
                          Updated{" "}
                          {new Date(p.updatedAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </small>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="empty-library">
                  <div className="empty-icon">
                    <FolderOpen size={28} />
                  </div>
                  <div>
                    <h3>Your first explanation starts here</h3>
                    <p>
                      Create a project or open an example below to make it your
                      own.
                    </p>
                  </div>
                  <ArrowDown />
                </div>
              )}
            </section>
            <section id="examples" className="examples">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">A FEW PLACES TO BEGIN</div>
                  <h2>Good questions. Clear stories.</h2>
                </div>
                <Pill>Editable sample scripts</Pill>
              </div>
              <div className="sample-grid">
                {samples.map((s, i) => (
                  <button
                    key={s.topic}
                    onClick={() => (user ? chooseSample(i) : setModal("login"))}
                  >
                    <span className={`sample-icon sample-${i}`}>
                      {i === 0 ? (
                        <Network size={23} />
                      ) : i === 1 ? (
                        <Code2 size={23} />
                      ) : (
                        <BookOpen size={23} />
                      )}
                    </span>
                    <small>{s.label}</small>
                    <h3>{s.title}</h3>
                    <span className="sample-bottom">
                      Use this example <ArrowRight size={17} />
                    </span>
                  </button>
                ))}
              </div>
              <p className="honesty">
                {isCloud
                  ? "Examples start a new project; preparation uses your configured providers."
                  : "Local examples use authored fixture scripts and system speech. Exports are rendered on this computer. Arbitrary topic generation requires the cloud adapter."}
              </p>
            </section>
            <footer>
              <Mark />
              <span>Understanding is a work in progress.</span>
              <span>PRAGYAN STUDIO / 01</span>
            </footer>
          </div>
        ) : (
          <div className="editor">
            <div className="editor-toolbar">
              <div>
                <button
                  className="icon-button"
                  aria-label="Back to projects"
                  onClick={() => act(back)}
                >
                  <ChevronLeft size={20} />
                </button>
                <div>
                  <h2>{draft?.title || data?.project.title}</h2>
                  <span>
                    {dirty
                      ? "Unsaved changes"
                      : `Revision ${data?.project.revision || 0} · Saved`}{" "}
                    <span className="dot-separator">·</span>{" "}
                    {draft?.language || data?.project.language}
                  </span>
                </div>
              </div>
              <div>
                <button
                  className="icon-button"
                  aria-label="Delete project"
                  disabled={busy || activeJobs.length > 0}
                  onClick={() => {
                    if (
                      confirm(
                        "Delete this project and its source, narration, and exported files? This cannot be undone.",
                      )
                    )
                      act(async () => {
                        await api(`/projects/${active}`, { method: "DELETE" });
                        setDirty(false);
                        dirtyRef.current = false;
                        await back();
                      });
                  }}
                >
                  <Trash2 size={15} />
                </button>
                <button
                  className="button secondary"
                  disabled={!dirty || busy || processing}
                  onClick={() => act(save)}
                >
                  {busy ? (
                    <Loader2 size={15} className="spin" />
                  ) : (
                    <Check size={15} />
                  )}{" "}
                  Save revision
                </button>
                <button
                  className="button primary"
                  disabled={!draft || dirty || processing || busy}
                  onClick={() => {
                    setApproved(false);
                    setArtifacts(null);
                    setModal("export");
                  }}
                >
                  Export video <ArrowUpRight size={16} />
                </button>
              </div>
            </div>
            {activeJobs.map((j) => (
              <div className="job-banner" key={j.id}>
                <Loader2 className="spin" size={17} />
                <strong>{stageLabel(j.stage)}</strong>
                <span>
                  {j.stage === "needs_review"
                    ? j.error
                    : "This job is saved. You can close this page and return later."}
                </span>
                {typeof j.progress === "number" && (
                  <progress max="1" value={j.progress} />
                )}
              </div>
            ))}
            {!draft ? (
              <div className="preparing">
                <div className="preparing-orbit">
                  <Mark />
                </div>
                <h2>
                  {activeJobs.length
                    ? "Giving your idea a little structure…"
                    : "Your project needs attention"}
                </h2>
                <p>
                  {data?.jobs[0]?.error ||
                    "Preparing scenes, checking structure, then generating narration."}
                </p>
                {!activeJobs.length && (
                  <button
                    className="button secondary"
                    onClick={() =>
                      act(async () => {
                        if (data?.jobs[0]) {
                          await post(`/jobs/${data.jobs[0].id}/retry`, {});
                          await loadProject(active!);
                        }
                      })
                    }
                  >
                    Retry preparation <RefreshCw size={16} />
                  </button>
                )}
              </div>
            ) : (
              <div className="editor-grid">
                <aside className="scene-list">
                  <div className="panel-heading">
                    STORYBOARD <span>{draft.scenes.length} scenes</span>
                  </div>
                  {draft.scenes.map((s, i) => (
                    <button
                      className={`scene-card ${selected === i ? "selected" : ""}`}
                      key={s.id}
                      onClick={() => select(i)}
                    >
                      <div className="scene-top">
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <span className={`audio-dot ${s.audio.status}`} />
                      </div>
                      <div className={`scene-mini ${s.visual.kind}`}>
                        <SceneIcon kind={s.visual.kind} />
                        <span>{s.visual.kind}</span>
                      </div>
                      <h4>{s.title}</h4>
                      <small>
                        {(timing!.scenes[i].frames / FPS).toFixed(1)}s{" "}
                        <span>·</span>{" "}
                        {s.audio.status === "ready"
                          ? "Narrated"
                          : s.audio.status === "stale"
                            ? "Audio outdated"
                            : "Needs narration"}
                      </small>
                    </button>
                  ))}
                  <button
                    className="add-scene"
                    disabled={draft.scenes.length >= 8 || processing}
                    onClick={addScene}
                  >
                    <Plus size={16} /> Add scene
                  </button>
                  <div className="outline-foot">
                    {(timing!.totalFrames / FPS).toFixed(1)} seconds total
                    <br />
                    Maximum 8 scenes · 90 seconds
                  </div>
                </aside>
                <section className="canvas-area">
                  <div className="canvas-heading">
                    <span>
                      <span className="status-dot" /> LIVE PREVIEW
                    </span>
                    <Pill>1280 × 720 · 24 fps</Pill>
                  </div>
                  <div className="player-shell">
                    <Preview
                      revision={draft}
                      audioUrls={data?.audioUrls || {}}
                      playerRef={player}
                    />
                  </div>
                  <div className="canvas-note">
                    <span>
                      <Settings2 size={14} /> Preview updates instantly. No
                      rendering charges.
                    </span>
                    <span>
                      {selected + 1} / {draft.scenes.length}
                    </span>
                  </div>
                  <div className="timeline">
                    <div className="timeline-ruler">
                      <span>00:00</span>
                      <span>SCENE TIMELINE</span>
                      <span>
                        00:
                        {Math.round(timing!.totalFrames / FPS)
                          .toString()
                          .padStart(2, "0")}
                      </span>
                    </div>
                    <div className="timeline-track">
                      {draft.scenes.map((s, i) => (
                        <button
                          key={s.id}
                          style={{ flex: timing!.scenes[i].frames }}
                          className={i === selected ? "active" : ""}
                          onClick={() => select(i)}
                        >
                          <SceneIcon kind={s.visual.kind} />
                          <span>{i + 1}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="revision-settings">
                    <label>
                      Language
                      <select
                        aria-label="Explanation language"
                        value={draft.language}
                        disabled={processing}
                        onChange={(e) =>
                          change((r) => {
                            r.language = Language.parse(e.target.value);
                            r.scenes.forEach(
                              (s) => (s.audio = { status: "stale" }),
                            );
                          })
                        }
                      >
                        {Language.options.map((l) => (
                          <option key={l}>{l}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Visual theme
                      <select
                        value={draft.theme}
                        disabled={processing}
                        onChange={(e) =>
                          change((r) => {
                            r.theme = e.target.value as Revision["theme"];
                          })
                        }
                      >
                        <option value="paper">Warm paper</option>
                        <option value="ocean">Ocean blue</option>
                        <option value="forest">Quiet forest</option>
                      </select>
                    </label>
                    <div>
                      <Palette size={18} />
                      <span>
                        Made to be
                        <br />
                        made your own.
                      </span>
                    </div>
                  </div>
                  {draft.scenes.some((s) => s.audio.status !== "ready") && (
                    <div className="audio-warning">
                      <Volume2 size={20} />
                      <div>
                        <strong>
                          Your words changed. The voice needs to catch up.
                        </strong>
                        <p>
                          Save your edits, then regenerate narration. Outdated
                          audio is muted in the preview and blocks export.
                        </p>
                      </div>
                      <button
                        disabled={dirty || processing || busy}
                        className="button secondary"
                        onClick={() =>
                          act(async () => {
                            await post(`/projects/${active}/narration`, {
                              revision: data!.project.revision,
                            });
                            await loadProject(active!);
                          })
                        }
                      >
                        Generate audio
                      </button>
                    </div>
                  )}
                  <div className="export-history">
                    <h3>
                      Export history <span>{exportJobs.length}</span>
                    </h3>
                    {!exportJobs.length ? (
                      <p>
                        When your story is ready, export a saved revision. Your
                        video and captions will appear here.
                      </p>
                    ) : (
                      exportJobs.map((j) => (
                        <div key={j.id}>
                          <Film size={17} />
                          <span>
                            <strong>Revision {j.revision}</strong>
                            <small>
                              {stageLabel(j.stage)}
                              {j.error ? ` · ${j.error}` : ""}
                            </small>
                          </span>
                          {j.stage === "complete" ? (
                            <button
                              className="text-button"
                              onClick={() =>
                                act(async () => {
                                  setArtifacts(
                                    await api(`/jobs/${j.id}/artifacts`),
                                  );
                                  setModal("export");
                                })
                              }
                            >
                              View export <ArrowUpRight size={15} />
                            </button>
                          ) : j.stage === "failed" ? (
                            <button
                              className="text-button"
                              onClick={() => {
                                setApproved(false);
                                setModal("export");
                              }}
                            >
                              Review & retry
                            </button>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </section>
                <aside className="inspector">
                  <div className="panel-heading">
                    SCENE {String(selected + 1).padStart(2, "0")}{" "}
                    <div>
                      <button
                        aria-label="Move scene up"
                        disabled={selected === 0 || processing}
                        onClick={() =>
                          change((r) => {
                            [r.scenes[selected - 1], r.scenes[selected]] = [
                              r.scenes[selected],
                              r.scenes[selected - 1],
                            ];
                            setSelected(selected - 1);
                          })
                        }
                      >
                        <MoveUp size={14} />
                      </button>
                      <button
                        aria-label="Move scene down"
                        disabled={
                          selected === draft.scenes.length - 1 || processing
                        }
                        onClick={() =>
                          change((r) => {
                            [r.scenes[selected + 1], r.scenes[selected]] = [
                              r.scenes[selected],
                              r.scenes[selected + 1],
                            ];
                            setSelected(selected + 1);
                          })
                        }
                      >
                        <MoveDown size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="tabs">
                    {(["script", "visual", "sources"] as const).map((t) => (
                      <button
                        className={panel === t ? "active" : ""}
                        onClick={() => setPanel(t)}
                        key={t}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  {scene && (
                    <div className="inspector-body">
                      <fieldset disabled={processing}>
                        {panel === "script" ? (
                          <>
                            <label>
                              Scene title
                              <input
                                maxLength={90}
                                value={scene.title}
                                onChange={(e) =>
                                  editScene({ title: e.target.value })
                                }
                              />
                            </label>
                            <label>
                              Narration{" "}
                              <span>{scene.narration.length} / 900</span>
                              <textarea
                                rows={9}
                                maxLength={900}
                                value={scene.narration}
                                onChange={(e) =>
                                  editScene({ narration: e.target.value })
                                }
                              />
                            </label>
                            <div className="voice-status">
                              <Volume2 size={17} />
                              <span>
                                {scene.audio.status === "ready"
                                  ? "Narration is up to date"
                                  : scene.audio.status === "stale"
                                    ? "Audio needs regeneration"
                                    : "Narration not ready"}
                              </span>
                            </div>
                            {scene.audio.error && (
                              <p className="inline-error">
                                {scene.audio.error}
                              </p>
                            )}
                            <button
                              className="button secondary full"
                              disabled={dirty || processing || busy}
                              onClick={() =>
                                act(async () => {
                                  await post(`/projects/${active}/narration`, {
                                    revision: data!.project.revision,
                                    sceneId: scene.id,
                                  });
                                  await loadProject(active!);
                                })
                              }
                            >
                              <RefreshCw size={14} /> Regenerate this scene
                            </button>
                            <p className="field-help">
                              Language changes update voice selection; they do
                              not translate edited text. Review your script in
                              the selected language.
                            </p>
                          </>
                        ) : panel === "visual" ? (
                          <>
                            <label>
                              Scene format
                              <select
                                value={scene.visual.kind}
                                onChange={(e) => changeKind(e.target.value)}
                              >
                                {[
                                  "concept",
                                  "diagram",
                                  "code",
                                  "math",
                                  "stage",
                                  "whiteboard",
                                  "photosynthesis",
                                ].map((k) => (
                                  <option key={k}>{k}</option>
                                ))}
                              </select>
                            </label>
                            {scene.visual.kind === "concept" && (
                              <label>
                                Visual cue
                                <input
                                  value={scene.visual.visual_cue}
                                  onChange={(e) =>
                                    editScene({
                                      visual: {
                                        ...scene.visual,
                                        visual_cue: e.target.value,
                                      } as any,
                                    })
                                  }
                                />
                              </label>
                            )}
                            {scene.visual.kind === "code" && (
                              <>
                                <label>
                                  Code language
                                  <input
                                    value={scene.visual.language}
                                    onChange={(e) =>
                                      editScene({
                                        visual: {
                                          ...scene.visual,
                                          language: e.target.value,
                                        } as any,
                                      })
                                    }
                                  />
                                </label>
                                <label>
                                  Code
                                  <textarea
                                    className="code-input"
                                    rows={12}
                                    value={scene.visual.code}
                                    onChange={(e) =>
                                      editScene({
                                        visual: {
                                          ...scene.visual,
                                          code: e.target.value,
                                        } as any,
                                      })
                                    }
                                  />
                                </label>
                              </>
                            )}
                            {scene.visual.kind === "math" && (
                              <label>
                                Equations · one per line
                                <textarea
                                  rows={7}
                                  value={scene.visual.steps.join("\n")}
                                  onChange={(e) =>
                                    editScene({
                                      visual: {
                                        ...scene.visual,
                                        steps: e.target.value.split("\n"),
                                      } as any,
                                    })
                                  }
                                />
                              </label>
                            )}
                            {scene.visual.kind === "diagram" && (
                              <label>
                                Node labels · one per line
                                <textarea
                                  rows={5}
                                  value={scene.visual.nodes
                                    .map((n) => n.label)
                                    .join("\n")}
                                  onChange={(e) => {
                                    const v = scene.visual;
                                    if (v.kind !== "diagram") return;
                                    const labels = e.target.value
                                      .split("\n")
                                      .slice(0, 8);
                                    editScene({
                                      visual: {
                                        ...v,
                                        nodes: labels.map((label, i) => ({
                                          label,
                                          x:
                                            (i * 100) /
                                            Math.max(1, labels.length - 1),
                                          y: 20,
                                        })),
                                        edges: v.edges.filter(
                                          (x) =>
                                            x.from < labels.length &&
                                            x.to < labels.length,
                                        ),
                                      },
                                    });
                                  }}
                                />
                              </label>
                            )}
                            <details>
                              <summary>Advanced visual parameters</summary>
                              <textarea
                                className="code-input"
                                rows={12}
                                value={visualJson}
                                onChange={(e) => setVisualJson(e.target.value)}
                              />
                              <button
                                className="button secondary full"
                                onClick={() => {
                                  try {
                                    const visual = SegmentSchema.parse(
                                      JSON.parse(visualJson),
                                    );
                                    const next = structuredClone(draft);
                                    next.scenes[selected].visual = visual;
                                    RevisionSchema.parse(next);
                                    editScene({ visual });
                                  } catch (e) {
                                    setError(
                                      "Invalid visual parameters. Check the scene schema and limits.",
                                    );
                                  }
                                }}
                              >
                                Apply visual JSON
                              </button>
                            </details>
                            <p className="field-help">
                              Only trusted scene formats are rendered. Code is
                              displayed, never executed.
                            </p>
                          </>
                        ) : (
                          <>
                            {scene.sourceIds.length ? (
                              <>
                                <Pill tone="green">
                                  Source-linked · review required
                                </Pill>
                                {scene.sourceIds.map((id) => {
                                  const p = draft.sources.find(
                                    (x) => x.id === id,
                                  );
                                  return p ? (
                                    <blockquote key={id}>
                                      <small>
                                        {p.page
                                          ? `PDF page ${p.page}`
                                          : "Pasted material"}{" "}
                                        · {id}
                                      </small>
                                      {p.text}
                                    </blockquote>
                                  ) : null;
                                })}
                                <p className="field-help">
                                  Passage links support review; they do not
                                  guarantee that every generated claim is
                                  correct.
                                </p>
                              </>
                            ) : (
                              <div className="source-empty">
                                <BookOpen size={27} />
                                <h4>Added explanation</h4>
                                <p>
                                  This scene is not linked to a source passage.
                                </p>
                              </div>
                            )}
                            {draft.sources.length > 0 && (
                              <label>
                                Supporting passages
                                <select
                                  value={scene.sourceIds[0] || ""}
                                  onChange={(e) =>
                                    editScene({
                                      sourceIds: e.target.value
                                        ? [e.target.value]
                                        : [],
                                      basis: e.target.value
                                        ? "source"
                                        : "explanation",
                                    })
                                  }
                                >
                                  <option value="">Added explanation</option>
                                  {draft.sources.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.id}: {p.text.slice(0, 45)}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            )}
                          </>
                        )}
                      </fieldset>
                      <div className="inspector-bottom">
                        <button
                          className="danger-link"
                          disabled={draft.scenes.length === 1 || processing}
                          onClick={() =>
                            change((r) => {
                              r.scenes.splice(selected, 1);
                              setSelected(Math.max(0, selected - 1));
                            })
                          }
                        >
                          <Trash2 size={14} /> Delete scene
                        </button>
                      </div>
                    </div>
                  )}
                </aside>
              </div>
            )}
          </div>
        )}
      </main>
      {modal && (
        <div className="modal-backdrop" onClick={() => !busy && setModal(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label={
              modal === "create"
                ? "Create an explanation"
                : modal === "login"
                  ? "Open your studio"
                  : "Export video"
            }
            className={`modal ${modal === "create" ? "create-modal" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-modal"
              aria-label="Close dialog"
              onClick={() => setModal(null)}
            >
              <X size={20} />
            </button>
            {modal === "login" ? (
              <>
                <Mark />
                <div className="eyebrow">YOUR NEXT GOOD EXPLANATION</div>
                <h2>
                  A little curiosity.
                  <br />A whole new perspective.
                </h2>
                <p>
                  {isCloud
                    ? "Sign in securely to keep your projects, revisions, and exports in your private workspace."
                    : "Try the complete studio on this computer. Demo identities are local fixtures, not cloud authentication."}
                </p>
                <button
                  disabled={busy}
                  className="button primary full"
                  onClick={() => act(() => login())}
                >
                  {isCloud
                    ? "Sign in with Cognito"
                    : "Enter as Maya · local demo"}
                  <ArrowRight size={17} />
                </button>
                {!isCloud && (
                  <button
                    disabled={busy}
                    className="button secondary full"
                    onClick={() => act(() => login("arjun"))}
                  >
                    Enter as Arjun · separate workspace
                  </button>
                )}
                <small className="modal-foot">
                  {isCloud
                    ? "Cognito · Authorization code with PKCE"
                    : "No AWS resources or paid API calls are used in local mode."}
                </small>
              </>
            ) : modal === "create" ? (
              <>
                <div className="eyebrow">
                  START WITH SOMETHING WORTH SHARING
                </div>
                <h2>What shall we make clear?</h2>
                <div className="mode-toggle">
                  <button
                    className={workflow === "concept" ? "active" : ""}
                    onClick={() => setWorkflow("concept")}
                  >
                    <Layers size={17} /> Explain a concept
                  </button>
                  <button
                    className={workflow === "material" ? "active" : ""}
                    onClick={() => setWorkflow("material")}
                  >
                    <FileText size={17} /> Explain my material
                  </button>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    act(async () => {
                      const j = await post(
                        "/projects",
                        {
                          title,
                          workflow,
                          language,
                          audience,
                          context,
                          sourceText,
                          ...(sourceKey ? { sourceKey } : {}),
                        },
                        true,
                      );
                      setModal(null);
                      await loadLibrary();
                      await open(j.projectId);
                    });
                  }}
                >
                  <label>
                    {workflow === "concept"
                      ? "Topic or question"
                      : "Project title"}
                    <input
                      required
                      minLength={3}
                      maxLength={100}
                      placeholder="How does a request travel across the internet?"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </label>
                  {workflow === "material" ? (
                    <>
                      <label>
                        Your source material
                        <textarea
                          rows={5}
                          maxLength={16000}
                          placeholder="Paste the text you want to explain. Supporting passages will stay linked to your scenes."
                          value={sourceText}
                          onChange={(e) => setSourceText(e.target.value)}
                        />
                      </label>
                      <label className="upload-zone">
                        <FileText size={20} />
                        <span>
                          {fileName || "Or choose a text-based PDF"}
                          <small>Up to 5 MB · 30 pages · no scanned PDFs</small>
                        </span>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) =>
                            e.target.files?.[0] &&
                            act(() => upload(e.target.files![0]))
                          }
                        />
                      </label>
                    </>
                  ) : (
                    <label>
                      Context <span>optional</span>
                      <textarea
                        rows={3}
                        maxLength={16000}
                        placeholder="What should your audience understand by the end?"
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                      />
                    </label>
                  )}
                  <div className="form-row">
                    <label>
                      Audience
                      <select
                        value={audience}
                        onChange={(e) => setAudience(e.target.value)}
                      >
                        <option value="beginner">Curious beginner</option>
                        <option value="intermediate">
                          Some prior knowledge
                        </option>
                        <option value="advanced">Technical audience</option>
                      </select>
                    </label>
                    <label>
                      Narration language
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                      >
                        {Language.options.map((l) => (
                          <option key={l}>{l}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {!isCloud && (
                    <div className="local-callout">
                      <Cloud size={17} />
                      <p>
                        Local mode uses English fixture scripts for{" "}
                        <button
                          type="button"
                          onClick={() => setTitle(samples[0].title)}
                        >
                          networks
                        </button>{" "}
                        and{" "}
                        <button
                          type="button"
                          onClick={() => setTitle(samples[1].title)}
                        >
                          binary search
                        </button>
                        , or extracts your pasted material. Other topics and
                        languages require configured cloud providers.
                      </p>
                    </div>
                  )}
                  <div className="form-footer">
                    <span>Prepare first. Edit freely. Export when ready.</span>
                    <button
                      disabled={busy}
                      className="button primary"
                      type="submit"
                    >
                      {busy ? (
                        <Loader2 size={17} className="spin" />
                      ) : (
                        "Create explanation"
                      )}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="eyebrow">
                  READY TO SHARE YOUR UNDERSTANDING?
                </div>
                <h2>
                  {artifacts
                    ? "Your explanation, in motion."
                    : "Export this revision."}
                </h2>
                {artifacts ? (
                  <>
                    <video
                      className="export-video"
                      controls
                      src={artifacts.video}
                      crossOrigin="anonymous"
                    >
                      <track
                        kind="captions"
                        src={artifacts.captions}
                        srcLang={draft?.language === "hindi" ? "hi" : "en"}
                        label="Captions"
                        default
                      />
                    </video>
                    <div className="export-links">
                      <a
                        className="button primary"
                        href={artifacts.video}
                        target="_blank"
                        rel="noreferrer"
                        download
                      >
                        Download MP4 <Download size={16} />
                      </a>
                      <a
                        className="button secondary"
                        href={artifacts.captions}
                        target="_blank"
                        rel="noreferrer"
                        download
                      >
                        WebVTT captions <FileText size={16} />
                      </a>
                    </div>
                    <p className="field-help">
                      Links expire in 15 minutes. Reopen this export to refresh
                      them.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      A saved, immutable copy of revision{" "}
                      {data?.project.revision} will be rendered. Future edits
                      won’t change this video.
                    </p>
                    <div className="export-spec">
                      <span>
                        <Film />
                        720p MP4
                      </span>
                      <span>
                        <Volume2 />
                        Narration + captions
                      </span>
                      <span>
                        <ShieldCheck />
                        Private download
                      </span>
                    </div>
                    {draft?.scenes.some((s) => s.audio.status !== "ready") && (
                      <p className="inline-error">
                        Regenerate missing or outdated narration before
                        exporting.
                      </p>
                    )}
                    <label className="approval">
                      <input
                        type="checkbox"
                        checked={approved}
                        onChange={(e) => setApproved(e.target.checked)}
                      />
                      <span>
                        I reviewed this script, checked the supporting passages,
                        and approve this saved revision for export.
                      </span>
                    </label>
                    <button
                      className="button primary full"
                      disabled={
                        !approved ||
                        busy ||
                        dirty ||
                        draft?.scenes.some((s) => s.audio.status !== "ready")
                      }
                      onClick={() =>
                        act(async () => {
                          await post(
                            `/projects/${active}/exports`,
                            {
                              revision: data!.project.revision,
                              approved: true,
                            },
                            true,
                          );
                          setModal(null);
                          await loadProject(active!);
                          setNotice(
                            "Export queued. Progress and the finished video will appear in export history.",
                          );
                        })
                      }
                    >
                      {isCloud ? "Start AWS export" : "Render on this computer"}
                      <ArrowRight size={17} />
                    </button>
                    <p className="modal-foot">
                      {isCloud
                        ? "Limited to 3 exports per day and 1 active export."
                        : "Real Remotion rendering · no AWS charges · keep the local worker running."}
                    </p>
                  </>
                )}
              </>
            )}
            {error && (
              <div role="alert" className="dialog-error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            {busy && <div className="busy-line" />}
          </section>
        </div>
      )}
    </div>
  );
}
function SceneIcon({ kind }: { kind: string }) {
  return kind === "code" ? (
    <Code2 size={22} />
  ) : kind === "diagram" ? (
    <Network size={22} />
  ) : kind === "math" ? (
    <span className="math-icon">∑</span>
  ) : kind === "concept" ? (
    <Layers size={22} />
  ) : (
    <BookOpen size={22} />
  );
}
function ArrowDown() {
  return <span className="empty-arrow">↘</span>;
}
function stageLabel(stage: string) {
  return (
    (
      {
        queued: "Queued",
        preparing: "Preparing scenes",
        narrating: "Generating narration",
        submitting: "Rendering / submitting",
        rendering: "Rendering video",
        complete: "Completed",
        failed: "Needs attention",
        needs_review: "Reconciliation required",
        cancelled: "Cancelled",
      } as Record<string, string>
    )[stage] || stage
  );
}
