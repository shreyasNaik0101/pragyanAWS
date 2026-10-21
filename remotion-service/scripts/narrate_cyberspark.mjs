// Standalone Sarvam-TTS narrator for the CyberSparkPromo composition.
//
// Generates one WAV per scene under:
//   remotion-service/public/cyberspark/audio/sceneN.wav
//
// Long scenes are split into sentence-chunks (Sarvam has a ~500-char input
// cap), each chunk is synthesized separately and the results are
// concatenated with ffmpeg into a single WAV.
//
// Usage:
//   cd remotion-service
//   node scripts/narrate_cyberspark.mjs
//
// Requires SARVAM_API_KEY in remotion-service/.env (or environment).

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'cyberspark', 'audio');
const TMP_DIR = path.join(OUT_DIR, '.chunks');

// ---------- env loader (no dotenv dep) -----------------------------------
async function loadEnv() {
  try {
    const txt = await fs.readFile(path.join(ROOT, '.env'), 'utf8');
    for (const line of txt.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].trim().replace(/^"|"$/g, '');
      }
    }
  } catch {
    /* optional */
  }
}

// ---------- Narration script per scene -----------------------------------
// Word counts tuned to fit each scene window at Sarvam pace=1.0 in en-IN.
// Each entry's text is split on sentences before sending to Sarvam.
const SCENES = [
  {
    name: 'scene1_intro',
    seconds: 18,
    text:
      "Welcome to India Israel CyberSpark Academy. " +
      "We bring you world-class technology training, delivered by Israeli experts who lead the world in tech development.",
  },
  {
    name: 'scene2_home',
    seconds: 42,
    text:
      "Life is too short to be stuck in the wrong job. You were destined for more. " +
      "At CyberSpark Academy, our promise is built on three simple pillars. " +
      "Save your future, by training on the technologies that will define the next decade. " +
      "Save your time, with focused, practical, hands-on programs designed by industry experts. " +
      "And save your money, by training once, training right, and avoiding costly job rejections. " +
      "Today, we offer premium courses, customized for businesses, in cybersecurity, 5G networks and the Internet of Things.",
  },
  {
    name: 'scene3_paths',
    seconds: 55,
    text:
      "Our learning paths are specialization tracks in cloud computing, data communication and information security. " +
      "Choose the Cyber Security Architect track. Across four courses, from SEC 001 to SEC 004, you will master enterprise-level security, network and application protocols, operating system hardening on both Windows and Linux, and finally, advanced cloud architecture and protection. " +
      "If you prefer cellular networks, take the Cellular and 5G Networks Engineer track. CELL 001 introduces radio technologies. CELL 002 covers 4G and 5G architecture and operation. CELL 003 dives deep into data flows and security, hands-on, with Wireshark. " +
      "And for newcomers, our Bridge Program 2026 helps students transition smoothly into either specialization.",
  },
  {
    name: 'scene4_consult',
    seconds: 55,
    text:
      "Beyond training, CyberSpark consults on intricate communication systems. " +
      "Our specialists work across land-line campus networks, wireless infrastructure and full cellular stacks. " +
      "We gather and analyze data flowing through your network with advanced tools like Wireshark, giving you on-demand insight into traffic, bandwidth, load distribution, and faults that standard monitoring will simply miss. " +
      "Consider one real case. A highway camera network suffered mysterious 50 millisecond video freezes. The switches looked clean. The fibre looked clean. But a Wireshark TCP stream graph traced the issue back to a software bug delaying I and P frames. " +
      "Comprehensive reports. Guaranteed performance improvement. That is the CyberSpark difference.",
  },
  {
    name: 'scene5_corporate',
    seconds: 55,
    text:
      "Our corporate offerings bridge theory and practice in data network design and security. " +
      "Three decades of designing and securing networks, distilled into world-class corporate programs. " +
      "More than two thousand happy students enrolled. More than fifteen hundred placed globally. More than four hundred now self-employed. " +
      "Choose from Wireshark for cellular networks, the complete Wireshark course, MPLS architecture and protocols, IPv6 basics and implementation, IoT networking, authentication and encryption, information systems security, and an introduction to data networking and TCP IP. " +
      "Every course pairs deep theoretical insight into protocols with practical applications grounded in real field experience.",
  },
  {
    name: 'scene6_kb',
    seconds: 40,
    text:
      "Our Resources hub publishes curated articles and guides on cybersecurity fundamentals, careers and emerging trends. " +
      "Read about Two Factor versus Multi Factor Authentication for 2025. Or our deep dive on breaking into cybersecurity in India and beyond. " +
      "Download our free Cybersecurity Career Guide. A comprehensive playbook to becoming a cybersecurity expert, with practical guidance to create immediate value for your next employer.",
  },
  {
    name: 'scene7_about',
    seconds: 20,
    text:
      "Israel hosts one of the world's highest performing innovation ecosystems. The highest concentration of engineers and PhDs per capita. Ranked number four globally for research personnel. " +
      "CyberSpark Academy combines that prowess with India's technological ambition.",
  },
  {
    name: 'scene8_outro',
    seconds: 15,
    text:
      "Be job ready. Enroll today and build your future. " +
      "Schedule a call with our experts. Begin your journey in cybersecurity, cloud and 5G networks. " +
      "Visit cyber spark academy dot in.",
  },
];

// ---------- Sarvam TTS ----------------------------------------------------
const SARVAM_URL = 'https://api.sarvam.ai/text-to-speech';

function splitIntoChunks(text, max = 450) {
  // Split by sentence terminators while keeping them, then greedily pack
  // chunks under `max` characters.
  const sentences = text
    .replace(/\s+/g, ' ')
    .trim()
    .match(/[^.!?]+[.!?]?/g) || [text];
  const chunks = [];
  let cur = '';
  for (const s of sentences) {
    const piece = s.trim();
    if (!piece) continue;
    if ((cur + ' ' + piece).trim().length > max) {
      if (cur) chunks.push(cur.trim());
      cur = piece;
    } else {
      cur = (cur + ' ' + piece).trim();
    }
  }
  if (cur) chunks.push(cur.trim());
  return chunks;
}

async function sarvamSynthesize(text, outPath) {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new Error('SARVAM_API_KEY is not set in remotion-service/.env');
  const res = await fetch(SARVAM_URL, {
    method: 'POST',
    headers: {
      'api-subscription-key': key,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      inputs: [text],
      target_language_code: 'en-IN',
      speaker: process.env.SARVAM_SPEAKER || 'anushka',
      pitch: 0,
      pace: 1.0,
      loudness: 1.0,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
      model: 'bulbul:v2',
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Sarvam ${res.status}: ${t}`);
  }
  const body = await res.json();
  const b64 = body?.audios?.[0];
  if (!b64) throw new Error('Sarvam response missing audio');
  await fs.writeFile(outPath, Buffer.from(b64, 'base64'));
}

// ---------- ffmpeg helpers -----------------------------------------------
function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d.toString()));
    p.on('error', reject);
    p.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exit ${code}: ${err.slice(-400)}`));
    });
  });
}

async function probeDuration(file) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration',
      '-of', 'csv=p=0', file,
    ]);
    let out = '';
    p.stdout.on('data', (d) => (out += d.toString()));
    p.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffprobe exit ${code}`));
      resolve(parseFloat(out.trim()) || 0);
    });
    p.on('error', reject);
  });
}

async function concatWav(inputs, outPath) {
  if (inputs.length === 1) {
    await fs.copyFile(inputs[0], outPath);
    return;
  }
  // Concat demuxer needs a list file
  const listFile = `${outPath}.list.txt`;
  const lines = inputs.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
  await fs.writeFile(listFile, lines);
  await run('ffmpeg', [
    '-y', '-f', 'concat', '-safe', '0', '-i', listFile,
    '-c', 'copy', outPath,
  ]);
  await fs.unlink(listFile).catch(() => {});
}

// ---------- main ---------------------------------------------------------
async function main() {
  await loadEnv();
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(TMP_DIR, { recursive: true });

  const summary = [];
  for (const scene of SCENES) {
    const chunks = splitIntoChunks(scene.text);
    const chunkPaths = [];
    for (let i = 0; i < chunks.length; i++) {
      const cp = path.join(TMP_DIR, `${scene.name}_${i}.wav`);
      process.stdout.write(`  • ${scene.name} chunk ${i + 1}/${chunks.length} ... `);
      await sarvamSynthesize(chunks[i], cp);
      console.log('ok');
      chunkPaths.push(cp);
    }
    const finalPath = path.join(OUT_DIR, `${scene.name}.wav`);
    await concatWav(chunkPaths, finalPath);
    const dur = await probeDuration(finalPath);
    const status = dur <= scene.seconds ? 'fits' : `OVER by ${(dur - scene.seconds).toFixed(1)}s`;
    console.log(`✓ ${scene.name}: ${dur.toFixed(2)}s / window ${scene.seconds}s [${status}]`);
    summary.push({ name: scene.name, duration: +dur.toFixed(2), window: scene.seconds });
  }

  await fs.writeFile(
    path.join(OUT_DIR, 'manifest.json'),
    JSON.stringify(summary, null, 2),
  );
  console.log(`\nDone. Audio in ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
