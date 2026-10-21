import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import OpenAI from 'openai';

export interface SynthResult {
  filePath: string;
  duration: number;
}

/** Map our friendly language names to Sarvam language codes. */
const SARVAM_LANG: Record<string, string> = {
  hinglish: 'en-IN',
  hindi: 'hi-IN',
  kannada: 'kn-IN',
  tamil: 'ta-IN',
  telugu: 'te-IN',
  bengali: 'bn-IN',
  marathi: 'mr-IN',
  gujarati: 'gu-IN',
  punjabi: 'pa-IN',
};

export function ttsEnabled(language: string): boolean {
  if (process.env.DISABLE_TTS === '1') return false;
  const lang = (language || '').toLowerCase();
  if (lang === 'english') return Boolean(process.env.OPENAI_API_KEY);
  if (SARVAM_LANG[lang]) return Boolean(process.env.SARVAM_API_KEY);
  // Unknown language → try English via OpenAI if the key is present.
  return Boolean(process.env.OPENAI_API_KEY);
}

async function openaiTts(text: string, outPath: string): Promise<void> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const r = await client.audio.speech.create({
    model: 'tts-1',
    voice: 'alloy',
    input: text,
    response_format: 'mp3',
    speed: 1.1, // Slightly faster narration → shorter audio → fewer frames
  });
  const buf = Buffer.from(await r.arrayBuffer());
  await fs.writeFile(outPath, buf);
}

async function sarvamTts(
  text: string,
  language: string,
  outPath: string,
): Promise<void> {
  const langCode = SARVAM_LANG[language.toLowerCase()] || 'en-IN';
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new Error('SARVAM_API_KEY not set');

  const res = await fetch('https://api.sarvam.ai/text-to-speech', {
    method: 'POST',
    headers: {
      'api-subscription-key': key,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      inputs: [text],
      target_language_code: langCode,
      // 'meera' was deprecated in bulbul:v2. 'anushka' is the default
      // female Hindi/Indic voice in the new speaker set.
      speaker: process.env.SARVAM_SPEAKER || 'anushka',
      pitch: 0,
      pace: 1.1, // Slightly faster narration → shorter audio → fewer frames
      loudness: 1.0,
      speech_sample_rate: 16000, // 16kHz is faster to synthesize than 22kHz
      enable_preprocessing: true,
      model: 'bulbul:v2',
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Sarvam TTS ${res.status}: ${t}`);
  }
  const body: any = await res.json();
  const b64: string | undefined = body?.audios?.[0];
  if (!b64) throw new Error('Sarvam TTS response missing audio');
  await fs.writeFile(outPath, Buffer.from(b64, 'base64'));
}

/**
 * Synthesize a short voiceover for a segment. English uses OpenAI TTS (MP3),
 * Indian languages use Sarvam (WAV at 22.05 kHz).
 */
export async function synthesize(
  text: string,
  language: string,
  outPathNoExt: string,
): Promise<SynthResult> {
  const lang = (language || 'english').toLowerCase();
  const useSarvam = Boolean(SARVAM_LANG[lang] && process.env.SARVAM_API_KEY);

  const filePath = useSarvam ? `${outPathNoExt}.wav` : `${outPathNoExt}.mp3`;

  if (useSarvam) {
    await sarvamTts(text, lang, filePath);
  } else {
    await openaiTts(text, filePath);
  }

  const duration = await probeDuration(filePath);
  return { filePath, duration };
}

/** Resolve media duration in seconds via ffprobe. */
export function probeDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const p = spawn('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'csv=p=0',
      filePath,
    ]);
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d.toString()));
    p.stderr.on('data', (d) => (err += d.toString()));
    p.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffprobe exit ${code}: ${err}`));
      const d = parseFloat(out.trim());
      resolve(Number.isFinite(d) ? d : 0);
    });
    p.on('error', reject);
  });
}
