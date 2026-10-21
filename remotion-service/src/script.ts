import OpenAI from 'openai';
import type { Script } from './remotion/types.js';
import { ScriptSchema, SegmentSchema } from './remotion/types.js';

const DEFAULT_THEME = {
  primary: '#6366f1',
  secondary: '#ec4899',
  background: '#0f172a',
  text: '#f8fafc',
};

// ---------------------------------------------------------------------------
// Topic-domain detection
// ---------------------------------------------------------------------------
// Each topic belongs to a domain (math / coding / biology / ...). The domain
// decides which scene kinds may appear — e.g. a math topic like "Pythagorean
// Theorem" must NOT render a Python code scene, and a biology topic like
// "Photosynthesis" must not show LaTeX or code.
// ---------------------------------------------------------------------------

type Domain =
  | 'math'
  | 'coding'
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'history'
  | 'geography'
  | 'economics'
  | 'general';

type SceneKind = 'concept' | 'math' | 'code' | 'diagram' | 'stage' | 'whiteboard';

const DOMAIN_SCENE_POLICY: Record<Domain, SceneKind[]> = {
  // Math: equations + geometric diagrams + whiteboard derivations. NO code.
  math: ['concept', 'math', 'diagram', 'stage', 'whiteboard'],
  // Coding / DSA / programming: code + diagrams (arrays, trees, graphs).
  coding: ['concept', 'code', 'diagram', 'stage', 'whiteboard'],
  // Physics: equations + diagrams + staged scenes (pendulum, orbit, etc).
  physics: ['concept', 'math', 'diagram', 'stage', 'whiteboard'],
  // Chemistry: diagrams (molecules, reactions) + occasional equations. No code.
  chemistry: ['concept', 'diagram', 'math', 'stage', 'whiteboard'],
  // Biology: diagrams + staged scenes (plant, cell, organ). No code, no LaTeX.
  biology: ['concept', 'diagram', 'stage', 'whiteboard'],
  // History / geography / economics: concept + diagrams (timelines, maps, graphs).
  history: ['concept', 'diagram', 'stage', 'whiteboard'],
  geography: ['concept', 'diagram', 'stage', 'whiteboard'],
  economics: ['concept', 'diagram', 'math', 'stage', 'whiteboard'],
  // Unknown / mixed topics: allow everything.
  general: ['concept', 'math', 'code', 'diagram', 'stage', 'whiteboard'],
};

// Keyword matchers. Each list is scanned against a lowercased concat of
// concept+explanation. First list to hit wins. Order matters — put more
// specific domains before more general ones.
// Patterns use `\b(word)` (leading boundary only) so plurals / possessives
// like "newton's", "newtons", "algorithms", "equations" still match.
const DOMAIN_KEYWORDS: [Domain, RegExp[]][] = [
  ['coding', [
    /\b(python|javascript|typescript|java|c\+\+|golang|rust|ruby|php|swift|kotlin)\b/,
    /\b(algorithm|data structure|big ?o|complexity|recursion|iteration)/,
    /\b(binary search|merge sort|quick sort|dfs|bfs|dijkstra|dynamic programming|dp)/,
    /\b(linked list|stack|queue|hash map|hash table|heap|trie|leetcode)/,
    /\b(coding|programming|software|compiler|syntax|oop)/,
  ]],
  ['math', [
    /\b(theorem|lemma|proof|pythagoras|pythagorean|euclid|fermat)/,
    /\b(calculus|derivative|integral|matrix|vector|algebra|trigonometry|geometry)/,
    /\b(polynomial|logarithm|sine|cosine|tangent|probability|statistics)/,
    /\b(fibonacci|factorial|quadratic|differentiation|integration)/,
    /\b(fourier|laplace|taylor series|convolution|eigenvalue|eigenvector)/,
    /\btransform\b/,
  ]],
  ['physics', [
    /\b(newton|gravity|gravitation|inertia|momentum|kinematic|dynamics)/,
    /\b(thermodynamics|entropy|friction|electromagnet|relativity|quantum)/,
    /\b(velocity|acceleration|voltage|resistance|electron|photon)/,
    /\b(wavelength|frequency|optics|refraction|orbit|pendulum)/,
    /\b(laws of motion|law of motion)/,
  ]],
  ['chemistry', [
    /\b(atom|molecule|ionic|covalent|acid|base)/,
    /\b(periodic table|element|compound|reactant|catalyst|oxidation|reduction)/,
    /\b(enzyme|protein synthesis|polymer|organic chemistry|inorganic)/,
    /\bchemical bond/,
  ]],
  ['biology', [
    /\b(photosynth|respiration|mitosis|meiosis|chromosome)/,
    /\b(dna|rna|gene)\b/,
    /\b(plant|leaf|root|flower|animal|organ|tissue|heart|lung|brain|nerve|muscle)/,
    /\b(ecosystem|evolution|darwin|natural selection|species|organism|bacteria|virus)/,
    /\b(digestion|circulation|excretion|hormone|immune|nervous system|cell)/,
  ]],
  ['history', [
    /\b(world war|revolution|emperor|empire|dynasty|civilization)/,
    /\b(independence|colonial|partition|mughal|maurya|gupta|ashoka|akbar|gandhi|nehru)/,
    /\b(ancient|medieval|history of)/,
  ]],
  ['geography', [
    /\b(continent|ocean|mountain range|himalaya|desert|river|climate|monsoon|latitude|longitude)/,
    /\b(tectonic|earthquake|volcano|atmosphere|weather|biome|rainforest|tundra)/,
  ]],
  ['economics', [
    /\b(economy|economic|inflation|recession|supply and demand|stock market)/,
    /\b(monetary|fiscal|microeconom|macroeconom|tariff|currency|capitalism|socialism)/,
    /\bgdp\b/,
  ]],
];

export function detectDomain(concept: string, explanation = ''): Domain {
  const text = `${concept} ${explanation}`.toLowerCase();
  for (const [domain, patterns] of DOMAIN_KEYWORDS) {
    if (patterns.some((re) => re.test(text))) return domain;
  }
  return 'general';
}

function allowedKindsFor(domain: Domain): SceneKind[] {
  return DOMAIN_SCENE_POLICY[domain] ?? DOMAIN_SCENE_POLICY.general;
}

function fallbackScript(concept: string, explanation: string, language: string): Script {
  const clean = concept.trim() || 'Learning Topic';
  const points = [
    `We introduce ${clean} and why it matters in everyday life.`,
    explanation
      ? `Core idea: ${explanation.slice(0, 140)}`
      : `Core idea: break ${clean} down into its simplest parts.`,
    `Here is a quick example that shows ${clean} in action.`,
    `Key takeaways to remember about ${clean}.`,
  ];

  return ScriptSchema.parse({
    title: clean,
    subtitle: 'An Educational Overview',
    language,
    segments: points.map((text, i) => ({
      kind: 'concept' as const,
      text,
      visual_cue: `Step ${i + 1} visualized with animated shapes`,
      duration: 6,
      animation_type: (['fade', 'create', 'transform', 'write'] as const)[i % 4],
    })),
    total_duration: 3 + 6 * points.length + 3,
    theme: DEFAULT_THEME,
  });
}

export async function generateScript(
  concept: string,
  explanation: string,
  language: string,
): Promise<Script> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return fallbackScript(concept, explanation, language);
  }

  const client = new OpenAI({ apiKey: key });
  const languageInstruction =
    {
      hinglish: 'Write in Hinglish (Roman Hindi + English mix) like a friendly Indian tutor.',
      hindi: 'Write in pure Hindi using Devanagari script.',
      english: 'Write in simple, conversational English.',
      kannada: 'Write in simple, conversational Kannada using Kannada script.',
      marathi: 'Write in simple, conversational Marathi using Devanagari script.',
    }[language] || 'Write in simple conversational English.';

  // ---- Domain-aware scene selection ---------------------------------------
  const domain = detectDomain(concept, explanation);
  const allowed = allowedKindsFor(domain);
  const disallowed = (['concept', 'math', 'code', 'diagram', 'stage', 'whiteboard'] as SceneKind[]).filter(
    (k) => !allowed.includes(k),
  );
  console.log(`[script] concept="${concept}" domain=${domain} allowed=[${allowed.join(',')}]`);

  const domainGuidance: Record<Domain, string> = {
    math: 'This is a MATH topic. Use "math" segments (LaTeX steps) as the backbone and "diagram" for geometric figures. NEVER use "code".',
    coding: 'This is a PROGRAMMING topic. Use "code" segments (real runnable code) plus "diagram" for data structures (arrays, trees, graphs).',
    physics: 'This is a PHYSICS topic. Use "math" for equations (F=ma, E=mc², etc.), "diagram" for force diagrams/circuits, and "stage" for staged scenes (pendulum, orbit, collision). NEVER use "code".',
    chemistry: 'This is a CHEMISTRY topic. Use "diagram" for molecular structures and reaction pathways, "math" sparingly for balanced equations. NEVER use "code".',
    biology: 'This is a BIOLOGY topic. Use "diagram" for cellular / organ-system / ecosystem flows and "stage" for staged scenes (plant + sunlight, cell division). NEVER use "code" or "math" / LaTeX — biology students do not need equations or Python code.',
    history: 'This is a HISTORY topic. Use "concept" narration and "diagram" for timelines and cause-effect graphs. NEVER use "code" or "math".',
    geography: 'This is a GEOGRAPHY topic. Use "diagram" for maps / layered climate zones / river systems. NEVER use "code" or "math".',
    economics: 'This is an ECONOMICS topic. Use "diagram" for supply-demand curves and market flows, "math" sparingly for formulas. NEVER use "code".',
    general: 'Pick whichever scene kinds best explain the topic.',
  };

  const prompt = `You are an engaging educator creating a short explainer video in Golpo-style (cinematic, well-paced).
The renderer supports SIX scene types:

1. "concept" — plain text + visual cue. Use for intros, summaries, conceptual points.
2. "math"    — step-by-step equations rendered with KaTeX (LaTeX strings).
3. "code"    — syntax-highlighted code block (Python, JS, etc.).
4. "diagram" — labelled nodes with arrows (flowcharts, graphs, relationships).
5. "stage"   — staged scenes with positioned actors (sun, plant, cell, pendulum, etc.).
6. "whiteboard" — Golpo-style hand-drawn SVG whiteboard animation. Great for visual explanations, step-by-step derivations, and concept maps. Uses a white notebook background with animated hand-drawing effect.

=== GOLPO-STYLE PACING (CRITICAL) ===
Think like a Golpo AI storyteller — add emotional pacing:
- Start with a HOOK (interesting question or surprising fact)
- Build TENSION (present the problem)
- REVEAL the concept (the "aha!" moment)  
- REINFORCE with examples
- End with a TAKEAWAY (memorable conclusion)

Concept: ${concept}
Additional context: ${explanation || '(none)'}
Topic domain: ${domain}

=== DOMAIN RULES (CRITICAL) ===
${domainGuidance[domain]}
ALLOWED scene kinds for this topic: ${allowed.map((k) => `"${k}"`).join(', ')}.
FORBIDDEN scene kinds for this topic: ${disallowed.length ? disallowed.map((k) => `"${k}"`).join(', ') : '(none)'}.
Do NOT emit any segment whose "kind" is in the FORBIDDEN list — it will be rejected.

${languageInstruction}

Return STRICT JSON with this shape:
{
  "title": "Short catchy title about ${concept}",
  "subtitle": "One line subtitle",
  "segments": [
    // A "concept" segment:
    { "kind": "concept", "text": "Spoken explanation (1-2 sentences)",
      "visual_cue": "What to show", "duration": 6,
      "animation_type": "create|transform|move|write|fade" },

    // A "math" segment (example):
    // { "kind": "math", "text": "Derive Pythagoras theorem",
    //   "steps": ["a^2 + b^2 = c^2", "c = \\\\sqrt{a^2 + b^2}"],
    //   "duration": 8 },

    // A "code" segment (example):
    // { "kind": "code", "text": "Binary search in Python",
    //   "language": "python",
    //   "code": "def bsearch(arr, t):\\n    lo, hi = 0, len(arr)-1\\n    ...",
    //   "highlights": [2, 4], "duration": 8 },

    // A "diagram" segment (example):
    // { "kind": "diagram", "text": "Photosynthesis flow",
    //   "nodes": [{"label":"Sunlight","x":0,"y":0},{"label":"Leaf","x":1,"y":0}],
    //   "edges": [{"from":0,"to":1,"label":"absorbed"}],
    //   "duration": 8 },

    // A "stage" segment (illustrated composition — use named actors from
    // the library positioned on a 100x100 stage, with optional animated
    // beams between them and timed labels):
    // { "kind": "stage", "text": "The sun warms the leaf, driving photosynthesis.",
    //   "backdrop": "sky_ground",
    //   "actors": [
    //     { "id": "sun",  "actor": "sun",  "x": 15, "y": 20, "scale": 1.2, "enter_at": 0.0, "highlight": true },
    //     { "id": "leaf", "actor": "leaf", "x": 65, "y": 55, "scale": 1.0, "enter_at": 0.3 },
    //     { "id": "root", "actor": "root", "x": 75, "y": 85, "scale": 1.0, "enter_at": 0.6 }
    //   ],
    //   "beams": [
    //     { "from": "sun", "to": "leaf", "at": 0.4, "style": "light" }
    //   ],
    //   "labels": [
    //     { "text": "sunlight",      "x": 30, "y": 35, "at": 0.5 },
    //     { "text": "chlorophyll",   "x": 70, "y": 50, "at": 0.8 }
    //   ],
    //   "duration": 10 }

    // A "whiteboard" segment (Golpo-style hand-drawn animation):
    // { "kind": "whiteboard", "text": "Let's visualize how data flows through a tree structure.",
    //   "visual_cue": "tree hierarchy drawing",
    //   "duration": 10 }
    // The whiteboard auto-generates hand-drawn SVG shapes based on the visual_cue.
    // Good visual_cue keywords: "idea", "concept", "flow", "process", "cycle", "tree", "hierarchy"
  ],
  "total_duration": 30
}

Stage scene notes:
- Every actor object MUST include: id (string), actor (library name), x (0-100), y (0-100). Optional: scale (default 1), enter_at (0-1, default 0), highlight (bool).
- "beams[].from" and "beams[].to" must reference an existing actor "id".
- Valid backdrop values: "sky_ground", "space", "indoor", "plain", "zoom_cell".
- Valid actor library names (choose the closest match): sun, leaf, water, co2, oxygen, glucose, root, tree, cell, dna, atom, electron, battery, bulb, cpu, memory, database, cloud, arrow, heart, brain, fire, star, earth, gear, molecule, flask, book, lightning, thylakoid, warrior, crown, person, fort, sword, flag, scroll, calendar, neural_net, robot, chart, matrix, dataset, nucleus, radiation, fission, fusion, reactor, sigma, integral, pi, infinity, triangle_icon. If none fit, pick the closest or use a plain noun like "ball" / "pendulum" — it will render as a text chip.
- **Icon-picking tips by domain** (pick node/actor labels that *match these keywords* so the icon library triggers instead of rendering a blank circle):
  - *History / biography / civics*: "warrior" (Shivaji Maharaj, generals, soldiers, Chhatrapati, Sambhaji), "crown" (king, queen, emperor, raja, rani, dynasty, throne), "fort" (Raigad, Sindhudurg, Pratapgad, palace), "sword"/"flag" (bhagwa dhwaj, banner), "scroll" (treaty, edict, firman), "calendar" (any 4-digit year, birth, death, timeline), "person" (minister, scholar, saint, poet).
  - *Machine learning / AI*: "neural_net" (neural network, deep learning, hidden layer, perceptron, CNN, RNN, transformer), "robot" (AI, agent, chatbot, LLM, GPT, BERT), "chart" (loss curve, accuracy, learning curve, plot), "matrix" (tensor, weights, embedding, Jacobian), "dataset" (training data, test set, validation, corpus).
  - *Nuclear / radiation physics*: "nucleus" (atomic nucleus, uranium, plutonium, U-235, isotope), "fission" (splitting atom, chain reaction), "fusion" (deuterium, tritium, thermonuclear), "radiation" (radioactive, alpha/beta/gamma, half-life), "reactor" (cooling tower, control rod, nuclear plant, meltdown).
  - *Math / geometry*: "sigma" (summation, Σ), "integral" (∫, area under curve, antiderivative), "pi" (π, 3.14, circle ratio), "infinity" (∞, unbounded), "triangle_icon" (Pythagoras, hypotenuse, right-angle, trigonometry).
- **CRITICAL**: when the topic is a biography / timeline / flow / concept-map, every diagram or stage segment MUST use node/actor labels that trigger one of the icons above. NEVER use generic labels like "event", "concept", "thing 1" — they will render as blank circles. Re-word a generic node so its label contains a keyword from the list (e.g. rename "key event 1" to "Battle of Pratapgad" so it triggers "fort").
- **CRITICAL — no fake math**: NEVER use a "math" segment for civics / history / biography / social-science / governance topics (e.g. Panchayati Raj, freedom movement, Mughal dynasty). Math scenes render LaTeX equations which look absurd for non-quantitative topics like "TotalLevels = GramPanchayat + PanchayatSamiti + ZillaParishad". For hierarchy / structure topics use a "diagram" segment with nodes and edges instead.

Rules:
- Produce 5 segments totalling 55-65 seconds — this is a 1-minute context video (target ~2 min end-to-end render).
- Each segment should be 11-13 seconds. Keep narration tight; cover 5 distinct ideas one per segment.
- **Strongly prefer VISUAL scenes (${allowed.filter((k) => k !== 'concept').map((k) => `"${k}"`).join(' / ') || '"diagram"'}) over plain "concept" text.** Use AT MOST ONE "concept" segment (the intro). Every other segment MUST be one of: ${allowed.filter((k) => k !== 'concept').map((k) => `"${k}"`).join(', ') || '"diagram"'} — with rich structured data (multiple LaTeX steps, 4+ diagram nodes, positioned actors, etc.).
${allowed.includes('math')    ? '- For any equations / formulas: use "math" segments — 2-4 LaTeX steps each, building progressively.' : ''}
${allowed.includes('code')    ? '- For code: pair "code" segments with a "diagram" segment showing the data structure (array / tree / graph) being manipulated.' : ''}
${allowed.includes('diagram') ? '- Use "diagram" segments with 4+ labelled nodes and connecting edges to visualise flows, cycles, hierarchies, circuits, force diagrams, etc.' : ''}
${allowed.includes('stage')   ? '- Use "stage" segments to place real-world actors (sun, plant, leaf, pendulum, ball, planet, cell, etc.) in a composed scene with animated beams, arrows, and timed labels.' : ''}
- Every segment MUST include "kind". **"text" is the spoken voiceover and IT DETERMINES SEGMENT LENGTH. Write 200-260 characters (3-4 full sentences, 32-42 words) per segment.** This produces ~12-13 seconds of TTS at normal speed. Total video = sum of TTS audio across all 5 segments + 1.6s intro/outro ≈ 60-70s. *Shorter text = shorter video with no silent gaps; longer text = longer video.* Avoid one-liners. Be substantive: name what's on screen, explain why it matters, give a concrete example.
- Use vivid "visual_cue" strings for concept segments (e.g. "rotating planets", "dominos falling").
- In math "steps", escape backslashes properly in JSON (use \\\\ for a single \\).
- REMINDER: allowed kinds = [${allowed.map((k) => `"${k}"`).join(', ')}]. Any other kind will be silently dropped.
- Output JSON only, no markdown fences.`;

  try {
    const res = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You write structured JSON scripts for short educational videos.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      response_format: { type: 'json_object' },
    });

    const content = res.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    parsed.language = language;
    parsed.theme = parsed.theme || DEFAULT_THEME;

    // Enforce domain scene policy + per-segment schema validation:
    // 1. Drop any segment whose kind is not allowed for this domain.
    // 2. Drop any segment that fails Zod validation (e.g. malformed stage
    //    actors missing x/y). One bad segment should NOT nuke the whole
    //    script and trigger the text-only fallback.
    if (Array.isArray(parsed.segments)) {
      const before = parsed.segments.length;
      let policyDrops = 0;
      let schemaDrops = 0;
      const kept: unknown[] = [];
      for (const s of parsed.segments) {
        const kind = (s as { kind?: string })?.kind;
        if (kind && !allowed.includes(kind as SceneKind)) {
          policyDrops++;
          continue;
        }
        const check = SegmentSchema.safeParse(s);
        if (!check.success) {
          schemaDrops++;
          console.warn(
            `[script] dropping malformed ${kind ?? 'unknown'} segment:`,
            check.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`),
          );
          continue;
        }
        kept.push(check.data);
      }
      parsed.segments = kept;
      if (policyDrops || schemaDrops) {
        console.warn(
          `[script] kept ${kept.length}/${before} segments (policy_drops=${policyDrops}, schema_drops=${schemaDrops})`,
        );
      }
      // Hard cap: the prompt asks for 5 segments, but LLMs sometimes return
      // 6-7 anyway. Trim to 6 so end-to-end render stays under ~4 min for a
      // ~1.5-minute context video. Also clamp per-segment duration to 24s so
      // one verbose segment can't blow up the total runtime.
      const MAX_SEGMENTS = 6;
      const MAX_SEG_DURATION = 24;
      if (parsed.segments.length > MAX_SEGMENTS) {
        console.log(
          `[script] trimming ${parsed.segments.length} → ${MAX_SEGMENTS} segments for fast render`,
        );
        parsed.segments = parsed.segments.slice(0, MAX_SEGMENTS);
      }
      for (const s of parsed.segments as Array<{ duration?: number }>) {
        if (typeof s.duration === 'number' && s.duration > MAX_SEG_DURATION) {
          s.duration = MAX_SEG_DURATION;
        }
      }
      if (parsed.segments.length < 2) {
        console.warn('[script] too few segments survived — using fallback');
        return fallbackScript(concept, explanation, language);
      }
    }

    return ScriptSchema.parse(parsed);
  } catch (err) {
    console.warn('[script] OpenAI failed, using fallback:', err);
    return fallbackScript(concept, explanation, language);
  }
}
