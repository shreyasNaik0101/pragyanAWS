import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Script } from '../types';

type Theme = Script['theme'];

/**
 * Pick an animated illustration based on keywords in the segment's visual_cue
 * (and a stable fallback chosen by segment index). Each illustration fills a
 * 720x720 canvas — the scene decides how much of the frame to give it.
 */
export const Illustration: React.FC<{
  cue: string;
  index: number;
  theme: Theme;
}> = ({ cue, index, theme }) => {
  const key = pickKey(cue, index);
  switch (key) {
    case 'solar':
      return <SolarSystem theme={theme} />;
    case 'dominos':
      return <Dominos theme={theme} />;
    case 'wave':
      return <Wave theme={theme} />;
    case 'bars':
      return <Bars theme={theme} />;
    case 'circuit':
      return <Circuit theme={theme} />;
    case 'network':
      return <Network theme={theme} />;
    case 'brain':
      return <BrainWiggle theme={theme} />;
    case 'seed':
      return <SeedToTree theme={theme} />;
    case 'pulse':
      return <Pulse theme={theme} />;
    case 'orbit':
      return <Orbit theme={theme} />;
    case 'triangle':
      return <Triangle theme={theme} />;
    case 'gears':
      return <Gears theme={theme} />;
    case 'rocket':
      return <RocketLaunch theme={theme} />;
    case 'stack':
    default:
      return <Stack theme={theme} />;
  }
};

type IKey =
  | 'solar'
  | 'dominos'
  | 'wave'
  | 'bars'
  | 'circuit'
  | 'network'
  | 'brain'
  | 'seed'
  | 'pulse'
  | 'orbit'
  | 'triangle'
  | 'gears'
  | 'rocket'
  | 'stack';

// Order matters — first match wins. Biology/chemistry / specific topics
// must precede generic "sun" / "orbit" keywords so "sunlight absorbed by
// plants" does not show a solar system.
const KEYWORDS: Array<[RegExp, IKey]> = [
  [/seed|tree|grow\b|plant|photosynth|chloroph|leaf|leaves|root/i, 'seed'],
  // Rockets / Newton's laws / propulsion / thrust — show an animated rocket
  // launching instead of a generic triangle/network of dots.
  [/rocket|thrust|propuls|launch|newton|F\s*=\s*ma|f=ma|fthrust|action.*reaction|reaction.*action/i, 'rocket'],
  [/triangle|pythag|geometry|right[- ]angle|hypoten/i, 'triangle'],
  [/domino|cascad|tipping point|chain react/i, 'dominos'],
  [/wave|frequenc|amplit|oscillat|sound wave|seismic/i, 'wave'],
  [/circuit|resistor|current|voltage|capacit|electric/i, 'circuit'],
  // hierarchy / governance / civics / org structure → stacked bars
  [/hierarch|pyramid|\blayer|\blevel|\btier\b|organi[sz]ation|governan|government|ministr|parliament|panchayat|council|republic|bureaucra|cabinet|constitu|federal|state\b|district|village\b/i, 'stack'],
  [/network|graph|\bnode\b|\bedge\b|connect\b|social network/i, 'network'],
  [/brain|neuron|cogni|idea|thought|memory/i, 'brain'],
  [/pulse|heart|breath|ping|\bsignal\b/i, 'pulse'],
  [/molecule|\batom|electron|proton|neutron|\bspin\b|nucleus/i, 'orbit'],
  [/solar system|astronom|planetary|constell|cosmos|universe/i, 'solar'],
  [/bar chart|histogram|growth chart|statistic/i, 'bars'],
  [/gear|machine|engine|\bclock\b/i, 'gears'],
  [/stack|array|\blist\b|queue|block|cube/i, 'stack'],
];

// Topics where ANY generic illustration looks out of place.
// Scenes should check this and render equations / text full-width instead.
const NON_ILLUSTRATIVE = /biograph|timeline|history|historical|dynasty|emperor|king\b|queen\b|warrior|war\b|battle|freedom|independence|revolution|civics|political|philosoph|religio|culture|literature|poet|poem/i;

/** Returns false when the topic is civics/history/biography etc. — caller should
 *  skip the illustration panel entirely and give the math/text full width. */
export function isIllustrationRelevant(cue: string): boolean {
  // If a specific STEM keyword matches, it's relevant.
  for (const [re] of KEYWORDS) if (re.test(cue)) return true;
  // Otherwise, if it smells like history/civics/biography, skip.
  if (NON_ILLUSTRATIVE.test(cue)) return false;
  // Unknown generic cue — allow a safe abstract fallback.
  return true;
}

function pickKey(cue: string, index: number): IKey {
  for (const [re, k] of KEYWORDS) if (re.test(cue)) return k;
  // Fallback pool intentionally excludes:
  //   'wave'  — topic-specific (waves/oscillations)
  //   'bars'  — topic-specific (statistics)
  //   'orbit' — renders as an atom, misleading on non-physics topics
  // The remaining shapes are abstract and universally safe.
  const fallback: IKey[] = ['network', 'gears', 'stack'];
  return fallback[index % fallback.length];
}

// --- 720x720 canvas helpers ----------------------------------------------
const Canvas: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg viewBox="0 0 720 720" width="100%" height="100%">
    {children}
  </svg>
);

// --- Illustrations --------------------------------------------------------

const SolarSystem: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  return (
    <Canvas>
      <defs>
        <radialGradient id="sun">
          <stop offset="0" stopColor={theme.secondary} />
          <stop offset="1" stopColor={theme.primary} />
        </radialGradient>
      </defs>
      <circle cx={360} cy={360} r={70} fill="url(#sun)" />
      {[130, 200, 270, 330].map((r, i) => (
        <g key={i}>
          <circle
            cx={360}
            cy={360}
            r={r}
            fill="none"
            stroke={theme.text + '22'}
            strokeWidth={1.5}
          />
          <circle
            cx={360 + Math.cos(frame / (20 + i * 6) + i) * r}
            cy={360 + Math.sin(frame / (20 + i * 6) + i) * r}
            r={18 - i * 2}
            fill={i % 2 === 0 ? theme.primary : theme.secondary}
          />
        </g>
      ))}
    </Canvas>
  );
};

const Dominos: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const count = 7;
  return (
    <Canvas>
      <rect x={60} y={520} width={600} height={6} fill={theme.text + '55'} />
      {Array.from({ length: count }).map((_, i) => {
        const start = i * 8;
        const tilt = interpolate(frame - start, [0, 14], [0, 70], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <g
            key={i}
            transform={`translate(${120 + i * 72} 520) rotate(${tilt} 0 -80)`}
          >
            <rect
              x={-20}
              y={-160}
              width={40}
              height={160}
              rx={4}
              fill={i % 2 ? theme.primary : theme.secondary}
            />
          </g>
        );
      })}
    </Canvas>
  );
};

const Wave: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const pts: string[] = [];
  for (let x = 0; x <= 720; x += 8) {
    const y = 360 + Math.sin((x + frame * 6) / 50) * 140;
    pts.push(`${x},${y}`);
  }
  return (
    <Canvas>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={theme.primary}
        strokeWidth={10}
        strokeLinecap="round"
      />
      <polyline
        points={pts.map((p) => {
          const [x, y] = p.split(',').map(Number);
          return `${x},${720 - y}`;
        }).join(' ')}
        fill="none"
        stroke={theme.secondary}
        strokeWidth={6}
        strokeLinecap="round"
        opacity={0.6}
      />
    </Canvas>
  );
};

const Bars: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const n = 6;
  return (
    <Canvas>
      {Array.from({ length: n }).map((_, i) => {
        const base = 520;
        const h = 80 + Math.abs(Math.sin((frame + i * 14) / 20)) * 320;
        const w = 60;
        const x = 100 + i * 90;
        return (
          <g key={i}>
            <rect
              x={x}
              y={base - h}
              width={w}
              height={h}
              rx={12}
              fill={i % 2 ? theme.primary : theme.secondary}
            />
          </g>
        );
      })}
      <line
        x1={60}
        y1={520}
        x2={700}
        y2={520}
        stroke={theme.text + '55'}
        strokeWidth={3}
      />
    </Canvas>
  );
};

const Circuit: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const t = (frame % 90) / 90;
  const path =
    'M 120 360 H 260 V 200 H 460 V 360 H 600';
  return (
    <Canvas>
      <path d={path} stroke={theme.text + '55'} strokeWidth={6} fill="none" />
      <circle cx={120} cy={360} r={28} fill={theme.secondary} />
      <circle cx={600} cy={360} r={28} fill={theme.primary} />
      {/* Electrons flowing */}
      {[0, 0.33, 0.66].map((o, i) => {
        const p = (t + o) % 1;
        // parametrize path
        const total = 140 + 160 + 200 + 160 + 140;
        const d = p * total;
        let x = 120;
        let y = 360;
        let left = d;
        const legs = [
          [140, 1, 0],
          [160, 0, -1],
          [200, 1, 0],
          [160, 0, 1],
          [140, 1, 0],
        ];
        for (const [len, dx, dy] of legs) {
          if (left <= len) {
            x += dx * left;
            y += dy * left;
            break;
          }
          x += dx * len;
          y += dy * len;
          left -= len;
        }
        return (
          <circle key={i} cx={x} cy={y} r={10} fill={theme.secondary} opacity={0.9} />
        );
      })}
    </Canvas>
  );
};

const Network: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const nodes = [
    [360, 140],
    [180, 320],
    [540, 320],
    [260, 520],
    [460, 520],
  ];
  const edges = [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 4],
    [1, 2],
    [3, 4],
  ];
  return (
    <Canvas>
      {edges.map(([a, b], i) => {
        const [x1, y1] = nodes[a];
        const [x2, y2] = nodes[b];
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={theme.text + '44'}
            strokeWidth={4}
          />
        );
      })}
      {nodes.map(([x, y], i) => {
        const pulse = 1 + Math.sin((frame + i * 15) / 10) * 0.15;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={36 * pulse}
            fill={i % 2 ? theme.primary : theme.secondary}
          />
        );
      })}
    </Canvas>
  );
};

const BrainWiggle: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  return (
    <Canvas>
      <path
        d="M 360 140 C 120 180 120 540 360 580 C 600 540 600 180 360 140 Z"
        fill="none"
        stroke={theme.primary}
        strokeWidth={10}
      />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2 + frame / 40;
        const cx = 360 + Math.cos(a) * 150;
        const cy = 360 + Math.sin(a) * 150;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={14}
            fill={theme.secondary}
            opacity={0.8}
          />
        );
      })}
    </Canvas>
  );
};

const SeedToTree: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const grow = interpolate(frame, [0, 90], [0, 1], {
    extrapolateRight: 'clamp',
  });
  return (
    <Canvas>
      <rect x={0} y={580} width={720} height={140} fill={theme.text + '22'} />
      <rect
        x={350}
        y={580 - 260 * grow}
        width={20}
        height={260 * grow}
        fill={theme.secondary}
      />
      {/* canopy */}
      <circle cx={360} cy={580 - 260 * grow} r={120 * grow} fill={theme.primary} />
      <circle cx={300} cy={580 - 230 * grow} r={80 * grow} fill={theme.primary} opacity={0.8} />
      <circle cx={420} cy={580 - 230 * grow} r={80 * grow} fill={theme.primary} opacity={0.8} />
    </Canvas>
  );
};

const Pulse: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  return (
    <Canvas>
      {[0, 1, 2].map((i) => {
        const t = (frame - i * 20) / 60;
        const r = (t % 1) * 360;
        const op = 1 - (t % 1);
        return (
          <circle
            key={i}
            cx={360}
            cy={360}
            r={r}
            fill="none"
            stroke={theme.primary}
            strokeWidth={8}
            opacity={op}
          />
        );
      })}
      <circle cx={360} cy={360} r={50} fill={theme.secondary} />
    </Canvas>
  );
};

const Orbit: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  return (
    <Canvas>
      <circle cx={360} cy={360} r={40} fill={theme.primary} />
      {[0, 1, 2].map((i) => {
        const a = frame / 20 + (i * Math.PI * 2) / 3;
        const rx = 240;
        const ry = 90;
        const rotate = i * 60;
        const x = 360 + Math.cos(a) * rx;
        const y = 360 + Math.sin(a) * ry;
        return (
          <g key={i} transform={`rotate(${rotate} 360 360)`}>
            <ellipse
              cx={360}
              cy={360}
              rx={rx}
              ry={ry}
              fill="none"
              stroke={theme.text + '33'}
              strokeWidth={2}
            />
            <circle
              cx={x}
              cy={y}
              r={18}
              fill={theme.secondary}
              style={{ transform: `rotate(${rotate}deg)`, transformOrigin: '360px 360px' }}
            />
          </g>
        );
      })}
    </Canvas>
  );
};

const Triangle: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: 'clamp' });
  const ax = 180;
  const ay = 540;
  const bx = 540;
  const by = 540;
  const cx = 180;
  const cy = 200;
  return (
    <Canvas>
      <polygon
        points={`${ax},${ay} ${ax + (bx - ax) * t},${ay} ${ax},${ay - (ay - cy) * t}`}
        fill={theme.primary + '33'}
        stroke={theme.primary}
        strokeWidth={8}
      />
      {/* right-angle marker */}
      <rect x={ax} y={ay - 30} width={30} height={30} fill="none" stroke={theme.secondary} strokeWidth={4} />
      {/* hypotenuse */}
      <line
        x1={ax + (bx - ax) * t}
        y1={ay}
        x2={ax}
        y2={ay - (ay - cy) * t}
        stroke={theme.secondary}
        strokeWidth={8}
      />
    </Canvas>
  );
};

const Gears: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const Gear: React.FC<{ cx: number; cy: number; r: number; teeth: number; dir: number; fill: string }> = ({
    cx,
    cy,
    r,
    teeth,
    dir,
    fill,
  }) => {
    const rot = (frame * dir) / 3;
    return (
      <g transform={`rotate(${rot} ${cx} ${cy})`}>
        <circle cx={cx} cy={cy} r={r} fill={fill} />
        {Array.from({ length: teeth }).map((_, i) => {
          const a = (i / teeth) * Math.PI * 2;
          const x = cx + Math.cos(a) * (r + 14);
          const y = cy + Math.sin(a) * (r + 14);
          return <rect key={i} x={x - 8} y={y - 8} width={16} height={16} fill={fill} />;
        })}
        <circle cx={cx} cy={cy} r={r * 0.35} fill={theme.background} />
      </g>
    );
  };
  return (
    <Canvas>
      <Gear cx={240} cy={360} r={130} teeth={14} dir={1} fill={theme.primary} />
      <Gear cx={500} cy={250} r={90} teeth={10} dir={-1} fill={theme.secondary} />
      <Gear cx={520} cy={470} r={70} teeth={8} dir={-1} fill={theme.secondary} />
    </Canvas>
  );
};

/** Animated rocket lifting off with an exhaust plume and motion arrows —
 *  used for Newton's-law / thrust / propulsion math scenes. */
const RocketLaunch: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // Continuous lift-off across the segment.
  const lift = interpolate(frame, [0, durationInFrames], [0, 320], {
    extrapolateRight: 'clamp',
  });
  // Flame flicker.
  const flick = 1 + Math.sin(frame / 2) * 0.18;
  return (
    <Canvas>
      {/* Ground */}
      <rect x={0} y={640} width={720} height={80} fill={theme.text + '22'} />
      <line x1={0} y1={640} x2={720} y2={640} stroke={theme.text + '55'} strokeWidth={3} />
      {/* Smoke plume left behind */}
      {[0, 1, 2, 3].map((i) => {
        const t = (frame - i * 8) / 60;
        const r = 30 + (t % 1) * 70;
        const op = Math.max(0, 0.5 - (t % 1));
        return (
          <circle
            key={i}
            cx={360 + (i % 2 ? -1 : 1) * (i * 14)}
            cy={620 - (i % 2) * 10}
            r={r}
            fill={theme.text + '55'}
            opacity={op}
          />
        );
      })}
      {/* Rocket */}
      <g transform={`translate(0 ${-lift})`}>
        {/* Exhaust flame (under the nozzle) */}
        <g transform="translate(360 600)">
          <path
            d={`M -28 0 Q 0 ${60 * flick} 28 0 Q 14 ${50 * flick} 0 ${56 * flick} Q -14 ${50 * flick} -28 0 Z`}
            fill="#f97316"
          />
          <path
            d={`M -16 0 Q 0 ${36 * flick} 16 0 Q 8 ${30 * flick} 0 ${34 * flick} Q -8 ${30 * flick} -16 0 Z`}
            fill="#fde047"
          />
        </g>
        {/* Body */}
        <rect x={332} y={440} width={56} height={160} fill={theme.text} stroke={theme.primary} strokeWidth={4} />
        {/* Interstage band */}
        <rect x={332} y={510} width={56} height={6} fill={theme.primary} />
        {/* Nose cone */}
        <path d="M 360 380 L 332 440 L 388 440 Z" fill={theme.secondary} stroke={theme.primary} strokeWidth={4} />
        {/* Window */}
        <circle cx={360} cy={470} r={10} fill="#38bdf8" stroke={theme.primary} strokeWidth={3} />
        {/* Fins */}
        <path d="M 332 580 L 300 620 L 332 610 Z" fill={theme.primary} stroke={theme.secondary} strokeWidth={3} />
        <path d="M 388 580 L 420 620 L 388 610 Z" fill={theme.primary} stroke={theme.secondary} strokeWidth={3} />
        {/* Nozzle */}
        <path d="M 336 600 L 322 624 L 398 624 L 384 600 Z" fill="#475569" stroke={theme.primary} strokeWidth={3} />
      </g>
      {/* Thrust / reaction arrows (Newton's 3rd law cue) */}
      <g transform={`translate(360 ${600 - lift})`} opacity={0.95}>
        <line x1={0} y1={70} x2={0} y2={150} stroke="#fde047" strokeWidth={6} strokeLinecap="round" />
        <polygon points="-12,140 12,140 0,165" fill="#fde047" />
      </g>
      <g transform={`translate(360 ${380 - lift})`} opacity={0.95}>
        <line x1={0} y1={0} x2={0} y2={-80} stroke={theme.secondary} strokeWidth={6} strokeLinecap="round" />
        <polygon points="-12,-72 12,-72 0,-96" fill={theme.secondary} />
      </g>
    </Canvas>
  );
};

const Stack: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const n = 5;
  return (
    <Canvas>
      {Array.from({ length: n }).map((_, i) => {
        const appearAt = i * 10;
        const t = interpolate(frame - appearAt, [0, 16], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const w = 380;
        const h = 68;
        const y = 540 - i * (h + 10);
        const slide = (1 - t) * 200;
        return (
          <g key={i} opacity={t}>
            <rect
              x={170 + slide}
              y={y - h}
              width={w}
              height={h}
              rx={14}
              fill={i % 2 ? theme.primary : theme.secondary}
            />
          </g>
        );
      })}
    </Canvas>
  );
};
