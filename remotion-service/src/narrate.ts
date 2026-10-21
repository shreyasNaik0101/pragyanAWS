import fs from 'node:fs/promises';
import path from 'node:path';
import type { Script } from './remotion/types.js';
import { synthesize, ttsEnabled } from './tts.js';

// Intro/outro are kept very short so audio covers ~95% of the video.
// Trimmed from 1.2s → 0.8s each (saves ~20 frames total) for the fast
// context-video budget. MUST match introFrames / outroFrames in
// EducationalVideo.tsx and the calculateMetadata() values in Root.tsx.
const INTRO_SECONDS = 0.8;
const OUTRO_SECONDS = 0.8;
// Minimum time per kind. Kept LOW so audio drives segment length —
// the goal is continuous narration with NO silent gaps. The LLM is
// instructed to write 28-35 word narration per segment (~11-13s of
// TTS), which becomes the actual duration. These floors only kick in
// for unusually short narration or animated visuals that need a min
// reveal time.
const MIN_VISUAL_SECONDS: Record<string, number> = {
  concept: 6,
  math: 8,
  code: 9,
  diagram: 7,
  stage: 8,
};

export interface NarrationResult {
  script: Script;
  subtitlesPath?: string;
}

/**
 * Generate per-segment TTS audio and a WebVTT subtitle file.
 *
 * Mutates a copy of the script so each segment has `audio_url` + an adjusted
 * `duration` that matches the spoken length (plus a small tail).
 */
export async function narrate(
  jobId: string,
  script: Script,
  outDir: string,
  publicBaseUrl: string,
): Promise<NarrationResult> {
  if (!ttsEnabled(script.language)) {
    return { script };
  }

  const segments = await Promise.all(
    script.segments.map(async (seg, i) => {
      const base = path.join(outDir, `${jobId}-seg-${i}`);
      try {
        const { filePath, duration } = await synthesize(seg.text, script.language, base);
        const minVisual = MIN_VISUAL_SECONDS[seg.kind] ?? 4;
        // Segment length is driven ENTIRELY by TTS audio (with a small
        // 0.3s tail and a per-kind minimum). We deliberately IGNORE the
        // LLM's `seg.duration` because the model routinely sets it to
        // 12-20s while writing only 3-8s of actual narration text —
        // which produced long silent gaps where the visual sat with no
        // audio. The user's requirement: audio runs continuously
        // throughout each segment with NO silence. So segments now
        // end ~0.3s after speech ends.
        const padded = Math.max(duration + 0.3, minVisual);
        const audio_url = `${publicBaseUrl}/videos/${path.basename(filePath)}`;
        console.log(`[narrate] TTS ok seg ${i} (${script.language}) -> ${path.basename(filePath)} ${duration.toFixed(2)}s`);
        return { ...seg, duration: padded, audio_url };
      } catch (err) {
        console.error(`[narrate] TTS FAILED for segment ${i} (${script.language}):`, err);
        return seg;
      }
    }),
  );

  // Fail the job if TTS was requested but produced zero audio — otherwise
  // the render would silently complete as a mute video that then gets
  // cached and served forever. Better to fail loudly and let the backend
  // retry or surface the error.
  const withAudio = segments.filter((s: any) => s.audio_url).length;
  if (withAudio === 0) {
    throw new Error(
      `TTS produced no audio for any of ${segments.length} segments ` +
        `(language=${script.language}). Refusing to render a silent video.`,
    );
  }
  if (withAudio < segments.length) {
    console.warn(
      `[narrate] partial TTS: ${withAudio}/${segments.length} segments have audio`,
    );
  }

  const updated: Script = {
    ...script,
    segments: segments as Script['segments'],
    total_duration:
      INTRO_SECONDS + segments.reduce((a, s) => a + (s.duration || 6), 0) + OUTRO_SECONDS,
  };

  const subtitlesPath = path.join(outDir, `${jobId}.vtt`);
  await fs.writeFile(subtitlesPath, toWebVTT(updated));

  return { script: updated, subtitlesPath };
}

function toWebVTT(script: Script): string {
  const lines: string[] = ['WEBVTT', ''];
  let cursor = INTRO_SECONDS;
  for (const seg of script.segments) {
    const start = cursor;
    const end = cursor + (seg.duration || 6);
    cursor = end;
    lines.push(`${formatTs(start)} --> ${formatTs(end)}`);
    lines.push(escapeVtt(seg.text));
    lines.push('');
  }
  return lines.join('\n');
}

function formatTs(seconds: number): string {
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return (
    `${String(h).padStart(2, '0')}:` +
    `${String(m).padStart(2, '0')}:` +
    `${s.toFixed(3).padStart(6, '0')}`
  );
}

function escapeVtt(text: string): string {
  return text.replace(/-->/g, '→').trim();
}
