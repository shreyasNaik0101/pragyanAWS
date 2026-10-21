import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import type { Script } from './remotion/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY = path.resolve(__dirname, 'remotion/index.ts');
const OUT_DIR = path.resolve(__dirname, '..', 'output');
fs.mkdirSync(OUT_DIR, { recursive: true });

let bundleLocationPromise: Promise<string> | undefined;

export function getBundle(): Promise<string> {
  if (!bundleLocationPromise) {
    console.log('[render] bundling Remotion project...');
    bundleLocationPromise = bundle({
      entryPoint: ENTRY,
      webpackOverride: (config: unknown) => config as never,
    }).then((loc: string) => {
      console.log('[render] bundle ready at', loc);
      return loc;
    });
  }
  return bundleLocationPromise as Promise<string>;
}

export async function warmup() {
  await getBundle();
}

export interface RenderProgress {
  progress: number;
  status: string;
}

export async function renderVideo(
  jobId: string,
  script: Script,
  onProgress?: (p: RenderProgress) => void,
): Promise<string> {
  const bundleLocation = await getBundle();

  onProgress?.({ progress: 0.1, status: 'selecting_composition' });

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'EducationalVideo',
    inputProps: script,
    timeoutInMilliseconds: 120_000,
  });

  const outputPath = path.join(OUT_DIR, `${jobId}.mp4`);

  onProgress?.({ progress: 0.2, status: 'rendering' });

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: script,
    // delayRender() handles must clear within this window. Bumped from 90s
    // → 180s: font CSS loads, large bundle initial mount, and Chromium
    // worker spin-up together can exceed 90s on cold-start laptops. Render
    // itself should still finish in <100s for a 60s video; this is just
    // the ceiling before Remotion gives up on stuck delayRender handles.
    timeoutInMilliseconds: 180_000,
    // Render 2 frames in parallel. Bumped to 3 briefly, but that caused
    // Chromium memory pressure on dev laptops and manifested as
    // "delayRender() 'Waiting for root component to load' not cleared
    // after 88000ms" — the parallel workers starved each other of event-
    // loop time during initial React mount. 2 is the proven-stable value.
    // Concurrency=1 because dev laptops can't fit 2 parallel Chromium
    // renderers + Rust compositor frame cache in available RAM. With
    // <1GB free, parallel renderers caused infinite swap-thrashing
    // (compositor stuck before producing any frame). Single-worker is
    // ~30% slower but actually completes.
    concurrency: 1,
    // Cap the Rust compositor's frame cache. Default scales to 50% of
    // free RAM and on a memory-starved machine it picks ~800MB which
    // immediately swaps. 128MB is enough for h264 GOP buffers.
    offthreadVideoCacheSizeInBytes: 128 * 1024 * 1024,
    // CRF 28 + fast preset trades a tiny bit of visual quality for
    // significantly faster encoding (~2x vs default). Educational
    // videos are mostly text/shapes so the quality loss is invisible.
    crf: 28,
    x264Preset: 'fast',
    // Disable expensive Chromium features that slow headless rendering.
    chromiumOptions: {
      disableWebSecurity: true,
      gl: 'angle',
    },
    onProgress: ({ progress }: { progress: number }) => {
      // Remotion gives 0..1; map 0.2 -> 0.95
      const mapped = 0.2 + progress * 0.75;
      onProgress?.({ progress: mapped, status: 'rendering' });
    },
    // Surface anything Chromium prints — including unhandled exceptions
    // from inside the React tree. Without this, a thrown error during
    // render manifests only as a delayRender timeout 88s later with no
    // useful diagnostic. Filter noisy Remotion internal logs.
    onBrowserLog: (log: { type: string; text: string }) => {
      if (log.type === 'error' || log.type === 'warning') {
        console.warn(`[browser ${log.type}]`, log.text);
      } else if (process.env.REMOTION_VERBOSE === '1') {
        console.log(`[browser ${log.type}]`, log.text);
      }
    },
    logLevel: 'verbose',
  } as Parameters<typeof renderMedia>[0]);

  onProgress?.({ progress: 1, status: 'completed' });
  return outputPath;
}
