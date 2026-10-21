import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { generateScript } from './script.js';
import { getBundle, renderVideo, warmup } from './render.js';
import { narrate } from './narrate.js';
import { ScriptSchema, type Script } from './remotion/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3005);
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;
const OUT_DIR = path.resolve(__dirname, '..', 'output');
fs.mkdirSync(OUT_DIR, { recursive: true });

interface Job {
  id: string;
  status:
    | 'pending'
    | 'generating_script'
    | 'narrating'
    | 'rendering'
    | 'completed'
    | 'failed';
  progress: number;
  concept: string;
  language: string;
  video_url?: string;
  subtitles_url?: string;
  error_message?: string;
  script?: Script;
  created_at: number;
}

const jobs = new Map<string, Job>();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/videos', express.static(OUT_DIR, { fallthrough: false }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'remotion-service', jobs: jobs.size });
});

app.post('/render', async (req: Request, res: Response) => {
  const {
    concept,
    explanation = '',
    language = 'english',
    jobId: externalJobId,
    script: providedScript,
  } = req.body ?? {};

  // Either a concept (we build a script via OpenAI) OR a caller-provided
  // fully-formed script (e.g. from the LangGraph agents) must be supplied.
  if (!providedScript && (!concept || typeof concept !== 'string')) {
    return res
      .status(400)
      .json({ error: 'either `concept` or `script` is required' });
  }

  // Validate a caller-supplied script up-front so malformed payloads fail
  // before we enqueue a render.
  let prevalidatedScript: Script | undefined;
  if (providedScript) {
    const parsed = ScriptSchema.safeParse(providedScript);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'invalid script', issues: parsed.error.issues });
    }
    prevalidatedScript = parsed.data;
  }

  const id = externalJobId || uuidv4();
  const job: Job = {
    id,
    status: 'pending',
    progress: 0,
    concept: concept || prevalidatedScript?.title || 'Untitled',
    language,
    created_at: Date.now(),
  };
  jobs.set(id, job);

  // Fire-and-forget — with PIPELINING: the Webpack bundle builds in
  // parallel with script generation + TTS so the render starts instantly
  // once narration finishes. On a cold start this saves ~8-15s.
  (async () => {
    try {
      // PIPELINE STAGE 0: Kick off bundle build immediately (no-op if
      // already cached from warmup). Runs concurrently with stages 1 & 2.
      const bundlePromise = getBundle();

      // PIPELINE STAGE 1: Script generation (OpenAI call)
      let script: Script;
      if (prevalidatedScript) {
        script = prevalidatedScript;
      } else {
        job.status = 'generating_script';
        job.progress = 5;
        script = await generateScript(concept, explanation, language);
      }
      job.script = script;

      // PIPELINE STAGE 2: TTS narration (runs while bundle continues
      // building in the background). Safe no-op if no TTS keys configured.
      job.status = 'narrating';
      job.progress = 10;
      const { script: narratedScript, subtitlesPath } = await narrate(
        id,
        script,
        OUT_DIR,
        PUBLIC_BASE_URL,
      );
      script = narratedScript;
      job.script = script;
      if (subtitlesPath) {
        job.subtitles_url = `${PUBLIC_BASE_URL}/videos/${path.basename(subtitlesPath)}`;
      }

      // Ensure bundle is ready before render (usually a no-op by now
      // since script gen + TTS took long enough for it to finish).
      await bundlePromise;

      // PIPELINE STAGE 3: Render (bundle is guaranteed ready)
      job.status = 'rendering';
      job.progress = 15;

      const outputPath = await renderVideo(id, script, ({ progress, status }) => {
        job.progress = Math.round(progress * 100);
        if (status === 'completed') job.status = 'completed';
      });

      job.status = 'completed';
      job.progress = 100;
      job.video_url = `${PUBLIC_BASE_URL}/videos/${path.basename(outputPath)}`;
      console.log('[server] job completed', id, job.video_url);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[server] job failed', id, message);
      job.status = 'failed';
      job.error_message = message;
    }
  })();

  return res.status(202).json({ jobId: id, status: job.status });
});

app.get('/status/:jobId', (req: Request, res: Response) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'job not found' });
  return res.json({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    video_url: job.video_url,
    subtitles_url: job.subtitles_url,
    error_message: job.error_message,
  });
});

app.listen(PORT, async () => {
  console.log(`[server] Remotion service listening on :${PORT}`);
  try {
    await warmup();
    console.log('[server] warmup complete');
  } catch (err) {
    console.error('[server] warmup failed', err);
  }
});
