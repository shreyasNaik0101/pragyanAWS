import React from 'react';
import type { Script } from '../types';

type Theme = Script['theme'];

/**
 * Library of labelled SVG icons used inside DiagramScene nodes so a node
 * called "Sun" actually looks like a sun, "Leaf" looks like a leaf, etc.
 *
 * Usage: <NodeIcon label="Sun" theme={theme} />
 * Renders a 160x160 icon. Returns null if no icon matches — the caller
 * should fall back to showing the label text.
 */
export const NodeIcon: React.FC<{ label: string; theme: Theme }> = ({
  label,
  theme,
}) => {
  const key = matchIcon(label);
  if (!key) return null;
  const Component = ICONS[key];
  return <Component theme={theme} />;
};

export function hasIcon(label: string): boolean {
  return matchIcon(label) !== null;
}

// --- matcher --------------------------------------------------------------
type Key =
  | 'sun'
  | 'leaf'
  | 'water'
  | 'co2'
  | 'oxygen'
  | 'glucose'
  | 'root'
  | 'tree'
  | 'cell'
  | 'dna'
  | 'atom'
  | 'electron'
  | 'battery'
  | 'bulb'
  | 'cpu'
  | 'memory'
  | 'database'
  | 'cloud'
  | 'arrow'
  | 'heart'
  | 'brain'
  | 'fire'
  | 'star'
  | 'earth'
  | 'gear'
  | 'molecule'
  | 'flask'
  | 'book'
  | 'lightning'
  | 'thylakoid'
  // History / civics icons so timelines, biographies and civics topics
  // render real figures instead of a blank gradient circle.
  | 'warrior'
  | 'crown'
  | 'person'
  | 'fort'
  | 'sword'
  | 'flag'
  | 'scroll'
  | 'calendar'
  // Machine learning / AI / data-science
  | 'neural_net'
  | 'robot'
  | 'chart'
  | 'matrix'
  | 'dataset'
  // Nuclear / reactor / radiation physics
  | 'nucleus'
  | 'radiation'
  | 'fission'
  | 'fusion'
  | 'reactor'
  // Math / symbolic notation
  | 'sigma'
  | 'integral'
  | 'pi'
  | 'infinity'
  | 'triangle_icon'
  // Aerospace / rocketry
  | 'rocket'
  | 'nose_cone'
  | 'fuel_tank'
  | 'nozzle'
  | 'engine'
  | 'payload'
  | 'fins'
  | 'parachute'
  | 'launchpad'
  | 'heat_shield'
  | 'orbit'
  | 'satellite'
  | 'astronaut'
  | 'thrust'
  | 'gimbal'
  | 'turbopump';

const RULES: Array<[RegExp, Key]> = [
  [/thylakoid|grana|chloroplast/i, 'thylakoid'],
  [/chlorophyll/i, 'leaf'],
  [/\bsun(light)?\b|solar|ray\b/i, 'sun'],
  [/leaf|leaves|stomata/i, 'leaf'],
  [/\bwater\b|h2o|h₂o|droplet|rain|moisture/i, 'water'],
  [/co2|co₂|carbon dioxide/i, 'co2'],
  [/oxygen|\bo2\b|o₂/i, 'oxygen'],
  [/glucose|sugar|c6h12o6/i, 'glucose'],
  [/root|soil|ground/i, 'root'],
  [/tree|plant|shrub/i, 'tree'],
  [/cell|mitochondr|nucleus/i, 'cell'],
  [/dna|rna|chromosome|gene/i, 'dna'],
  [/atom|nucleus of atom|proton|neutron/i, 'atom'],
  [/electron|charge/i, 'electron'],
  [/battery|voltage|power source/i, 'battery'],
  [/bulb|light|lamp/i, 'bulb'],
  [/cpu|processor|core\b/i, 'cpu'],
  [/memory|ram\b|cache|register/i, 'memory'],
  [/database|storage|table|disk/i, 'database'],
  [/cloud|atmosphere|air\b|sky/i, 'cloud'],
  [/arrow|flow\b|direction/i, 'arrow'],
  [/heart|blood|pulse|circulat/i, 'heart'],
  [/brain|neuron|synapse|mind/i, 'brain'],
  [/fire|flame|heat|burn/i, 'fire'],
  [/star|constell/i, 'star'],
  [/earth|planet|globe|world/i, 'earth'],
  // --- Aerospace / rocketry (must come BEFORE the generic gear/engine
  // rule so a label like "rocket engine" or "main engine" maps to a
  // rocket-engine icon, not a mechanical gear). ---
  [/nose\s*cone|nosecone|fairing\b/i, 'nose_cone'],
  [/fuel\s*tank|propellant\s*tank|lox\s*tank|liquid\s*oxygen|liquid\s*hydrogen|rp[- ]?1|kerosene\s*tank/i, 'fuel_tank'],
  [/nozzle|exhaust\s*bell|expansion\s*ratio/i, 'nozzle'],
  [/turbopump|fuel\s*pump|propellant\s*pump|impeller/i, 'turbopump'],
  [/gimbal|thrust\s*vector|tvc\b/i, 'gimbal'],
  [/thrust|combustion\s*chamber|main\s*engine|raptor|merlin|vulcain|rs[- ]?25|f[- ]?1\b|engine\s*bell/i, 'thrust'],
  [/payload|capsule|crew\s*module|dragon|orion|soyuz/i, 'payload'],
  [/\bfins?\b|stabili[sz]er|grid\s*fin/i, 'fins'],
  [/parachute|chute|drogue/i, 'parachute'],
  [/launch\s*pad|launchpad|gantry|launch\s*tower|service\s*tower|umbilical/i, 'launchpad'],
  [/heat\s*shield|ablativ|thermal\s*protection|tps\b|re[- ]?entry/i, 'heat_shield'],
  [/orbit|trajectory|hohmann|elliptic|apogee|perigee|parking\s*orbit/i, 'orbit'],
  [/satellite|spacecraft|probe|cubesat|gslv|isro|chandrayaan|mangalyaan/i, 'satellite'],
  [/astronaut|cosmonaut|spacesuit|crew\s*member/i, 'astronaut'],
  [/rocket|missile|booster|saturn\s*v|falcon|starship|space\s*shuttle|launch\s*vehicle|pslv\b/i, 'rocket'],
  [/gear|engine|machine/i, 'gear'],
  [/molecule|compound|bond/i, 'molecule'],
  [/flask|beaker|chemical|reagent/i, 'flask'],
  [/book|paper|document|note/i, 'book'],
  [/lightning|thunder|bolt|energy\b/i, 'lightning'],
  // --- History / civics / biography -----------------------------------
  // Specific historical figures → warrior (turbaned standing figure with
  // sword). Match Indian / Maratha / Mughal / general royal-ish vocab.
  [/shivaji|maharaj|chhatrapati|chatrapati|sambhaji|peshwa|maratha/i, 'warrior'],
  [/akbar|ashoka|aurangzeb|tipu|rana pratap|prithvi/i, 'warrior'],
  [/warrior|soldier|general|commander|knight|samurai|hero/i, 'warrior'],
  // Kings / queens / emperors → crown
  [/king|queen|emperor|empress|raja|rani|throne|monarch|dynasty/i, 'crown'],
  // Forts, palaces, castles, capitals
  [/fort|fortress|castle|palace|raigad|sindhudurg|pratapgad|citadel/i, 'fort'],
  // Swords & weapons
  [/sword|dagger|blade|weapon|shield|armor/i, 'sword'],
  // Flags / pennants / banners (Bhagwa Dhwaj, national flag, etc.)
  [/flag|banner|pennant|bhagwa|dhwaj|standard/i, 'flag'],
  // Scrolls / edicts / treaties / decrees
  [/scroll|edict|treaty|decree|proclamation|firman|manuscript/i, 'scroll'],
  // Dates / years / timelines / eras
  [/\b(year|date|era|century|ad|bc|bce|ce|timeline|birth|death)\b|\b1[0-9]{3}\b|\b2[0-9]{3}\b/i, 'calendar'],
  // Generic person / leader / portrait fallback (must come last among
  // people-ish rules so more specific roles win first).
  [/person|portrait|leader|citizen|minister|scholar|saint|philosopher|poet/i, 'person'],
  // --- Machine learning / AI / data science ---------------------------
  [/neural\s*net(work)?|deep\s*learning|perceptron|mlp\b|\bcnn\b|\brnn\b|transformer|hidden\s*layer|dense\s*layer|activation/i, 'neural_net'],
  [/\brobot\b|android|chatbot|\bai\b|artificial\s*intelligence|assistant|agent\b|llm\b|gpt|bert/i, 'robot'],
  [/chart|plot\b|loss\s*curve|accuracy\s*curve|learning\s*curve|line\s*chart|y[- ]axis|x[- ]axis|scatter/i, 'chart'],
  [/matrix|tensor|weights?\b|weight\s*matrix|jacobian|embedding/i, 'matrix'],
  [/dataset|training\s*data|test\s*set|validation\s*set|feature\s*table|\bcsv\b|samples?\b|\bcorpus\b/i, 'dataset'],
  // --- Nuclear / radiation / reactor ----------------------------------
  [/fission|splitting\s*atom|split\s*atom|chain\s*reaction/i, 'fission'],
  [/fusion|fuse\s*nuclei|deuterium|tritium|thermonuclear/i, 'fusion'],
  [/radioact|radiation|alpha\s*particle|beta\s*particle|gamma\s*ray|half[- ]life|becquerel|sievert/i, 'radiation'],
  [/reactor|meltdown|cooling\s*tower|control\s*rod|nuclear\s*(plant|power)|power\s*plant/i, 'reactor'],
  [/atomic\s*nucleus|heavy\s*nucleus|uranium|plutonium|isotope|u-?235|pu-?239|thorium/i, 'nucleus'],
  // --- Math notation --------------------------------------------------
  [/\bsigma\b|summation|Σ|∑/i, 'sigma'],
  [/integral|antideriv|area\s*under\s*the?\s*curve|definite\s*integral|∫/i, 'integral'],
  [/\bpi\b|π|3\.14|circumference\s*ratio/i, 'pi'],
  [/infinity|∞|unbounded|limitless|infinite\s*series/i, 'infinity'],
  [/triangle|pythag|hypoten|right[- ]?angle|trigon/i, 'triangle_icon'],
];

function matchIcon(label: string): Key | null {
  for (const [re, k] of RULES) if (re.test(label)) return k;
  return null;
}

// --- shared canvas --------------------------------------------------------
const C: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg viewBox="0 0 160 160" width="100%" height="100%">
    {children}
  </svg>
);

// --- icons ---------------------------------------------------------------
const Sun: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <circle cx={80} cy={80} r={36} fill="#ffd966" />
    {Array.from({ length: 12 }).map((_, i) => {
      const a = (i / 12) * Math.PI * 2;
      const x1 = 80 + Math.cos(a) * 46;
      const y1 = 80 + Math.sin(a) * 46;
      const x2 = 80 + Math.cos(a) * 66;
      const y2 = 80 + Math.sin(a) * 66;
      return (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffd966" strokeWidth={6} strokeLinecap="round" />
      );
    })}
  </C>
);

const Leaf: React.FC<{ theme: Theme }> = () => (
  <C>
    <path
      d="M 30 120 C 30 50 90 20 130 30 C 130 90 90 130 30 120 Z"
      fill="#4ade80"
      stroke="#16a34a"
      strokeWidth={4}
    />
    <path d="M 40 115 L 120 40" stroke="#16a34a" strokeWidth={4} fill="none" />
    {[-1, 0, 1].map((i) => (
      <path
        key={i}
        d={`M ${62 + i * 10} ${90 - i * 10} L ${90 + i * 10} ${70 - i * 10}`}
        stroke="#16a34a"
        strokeWidth={2}
        fill="none"
      />
    ))}
  </C>
);

const WaterDrop: React.FC<{ theme: Theme }> = () => (
  <C>
    <path
      d="M 80 20 C 80 20 30 80 30 110 A 50 50 0 0 0 130 110 C 130 80 80 20 80 20 Z"
      fill="#38bdf8"
      stroke="#0284c7"
      strokeWidth={4}
    />
    <ellipse cx={60} cy={100} rx={14} ry={8} fill="#fff" opacity={0.6} />
  </C>
);

const CO2: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <circle cx={40} cy={80} r={28} fill="#94a3b8" />
    <circle cx={80} cy={80} r={38} fill={theme.text} opacity={0.85} />
    <circle cx={120} cy={80} r={28} fill="#94a3b8" />
    <text x={80} y={92} fontSize={34} textAnchor="middle" fontWeight={800} fill={theme.background}>
      C
    </text>
    <text x={40} y={90} fontSize={24} textAnchor="middle" fontWeight={800} fill={theme.background}>
      O
    </text>
    <text x={120} y={90} fontSize={24} textAnchor="middle" fontWeight={800} fill={theme.background}>
      O
    </text>
  </C>
);

const Oxygen: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <circle cx={50} cy={80} r={34} fill="#60a5fa" />
    <circle cx={110} cy={80} r={34} fill="#60a5fa" />
    <line x1={84} y1={70} x2={76} y2={70} stroke={theme.text} strokeWidth={3} />
    <line x1={84} y1={90} x2={76} y2={90} stroke={theme.text} strokeWidth={3} />
    <text x={50} y={92} fontSize={28} textAnchor="middle" fontWeight={800} fill="#fff">O</text>
    <text x={110} y={92} fontSize={28} textAnchor="middle" fontWeight={800} fill="#fff">O</text>
  </C>
);

const Glucose: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <polygon
      points="80,30 130,58 130,110 80,138 30,110 30,58"
      fill="#fbbf24"
      stroke="#b45309"
      strokeWidth={4}
    />
    <text
      x={80}
      y={92}
      textAnchor="middle"
      fontSize={20}
      fontWeight={800}
      fill={theme.background}
    >
      C₆H₁₂O₆
    </text>
  </C>
);

const Root: React.FC<{ theme: Theme }> = () => (
  <C>
    <rect x={0} y={60} width={160} height={100} fill="#8b5a2b" />
    <path
      d="M 80 60 Q 80 90 50 120 M 80 60 Q 80 100 110 130 M 80 60 Q 60 100 30 140 M 80 60 Q 100 110 130 150"
      stroke="#78350f"
      strokeWidth={6}
      fill="none"
      strokeLinecap="round"
    />
    <rect x={70} y={20} width={20} height={50} fill="#16a34a" />
  </C>
);

const Tree: React.FC<{ theme: Theme }> = () => (
  <C>
    {/* Ground hint */}
    <ellipse cx={80} cy={152} rx={46} ry={6} fill="#4d7c0f" opacity={0.6} />

    {/* Trunk with two visible branches (filled path, not rectangles) */}
    <path
      d="M 74 150
         L 74 100
         L 62 78
         L 68 74
         L 78 96
         L 78 76
         L 82 76
         L 82 94
         L 94 72
         L 100 76
         L 86 100
         L 86 150 Z"
      fill="#7c4a1e"
      stroke="#4a2c10"
      strokeWidth={2}
      strokeLinejoin="round"
    />

    {/* Bark texture */}
    <path
      d="M 76 150 L 76 104 M 80 150 L 80 104 M 84 150 L 84 104"
      stroke="#4a2c10"
      strokeWidth={1.2}
      fill="none"
      opacity={0.45}
    />

    {/* Organic canopy (layered bumpy cloud shape) */}
    <path
      d="M 32 68
         C 20 60 22 42 38 40
         C 40 24 58 18 72 26
         C 80 14 100 14 108 26
         C 124 20 140 34 134 52
         C 148 58 146 80 128 82
         C 132 96 116 104 102 98
         C 96 110 78 112 70 102
         C 56 110 40 102 38 88
         C 22 88 18 72 32 68 Z"
      fill="#16a34a"
      stroke="#14532d"
      strokeWidth={2.5}
      strokeLinejoin="round"
    />

    {/* Lighter highlights on the canopy for depth */}
    <path
      d="M 50 46
         C 58 40 72 40 76 50
         C 84 42 94 44 98 54
         C 90 62 78 62 70 56
         C 60 60 52 56 50 46 Z"
      fill="#4ade80"
      opacity={0.75}
    />
    <ellipse cx={114} cy={58} rx={12} ry={8} fill="#4ade80" opacity={0.6} />
    <ellipse cx={40} cy={80} rx={9} ry={7} fill="#4ade80" opacity={0.55} />

    {/* A few visible leaves on the edge */}
    {[
      [34, 70, -20],
      [54, 102, 15],
      [118, 82, 25],
      [102, 96, -15],
    ].map(([x, y, r], i) => (
      <ellipse
        key={i}
        cx={x}
        cy={y}
        rx={8}
        ry={4}
        fill="#22c55e"
        transform={`rotate(${r} ${x} ${y})`}
      />
    ))}
  </C>
);

const Cell: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <circle cx={80} cy={80} r={56} fill="#f472b6" opacity={0.25} stroke="#db2777" strokeWidth={4} />
    <circle cx={80} cy={80} r={22} fill="#db2777" />
    {[0, 1, 2, 3].map((i) => {
      const a = (i / 4) * Math.PI * 2;
      return (
        <circle
          key={i}
          cx={80 + Math.cos(a) * 36}
          cy={80 + Math.sin(a) * 36}
          r={6}
          fill={theme.primary}
        />
      );
    })}
  </C>
);

const DNA: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    {Array.from({ length: 6 }).map((_, i) => {
      const y = 20 + i * 20;
      const phase = (i % 2) * 20 - 10;
      return (
        <g key={i}>
          <line x1={40 + phase} y1={y} x2={120 - phase} y2={y + 10} stroke={theme.text + '88'} strokeWidth={3} />
          <circle cx={40 + phase} cy={y} r={8} fill={theme.primary} />
          <circle cx={120 - phase} cy={y + 10} r={8} fill={theme.secondary} />
        </g>
      );
    })}
  </C>
);

const Atom: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <circle cx={80} cy={80} r={14} fill={theme.secondary} />
    {[0, 60, 120].map((r) => (
      <ellipse
        key={r}
        cx={80}
        cy={80}
        rx={60}
        ry={20}
        fill="none"
        stroke={theme.primary}
        strokeWidth={3}
        transform={`rotate(${r} 80 80)`}
      />
    ))}
  </C>
);

const Electron: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <circle cx={80} cy={80} r={22} fill="#38bdf8" />
    <text x={80} y={92} textAnchor="middle" fontSize={28} fontWeight={800} fill="#fff">
      e⁻
    </text>
  </C>
);

const Battery: React.FC<{ theme: Theme }> = () => (
  <C>
    <rect x={30} y={50} width={100} height={60} rx={8} fill="#22c55e" stroke="#166534" strokeWidth={4} />
    <rect x={130} y={70} width={14} height={20} fill="#166534" />
    <rect x={46} y={64} width={12} height={32} fill="#fff" />
    <rect x={70} y={64} width={12} height={32} fill="#fff" />
    <rect x={94} y={64} width={12} height={32} fill="#fff" />
  </C>
);

const Bulb: React.FC<{ theme: Theme }> = () => (
  <C>
    <circle cx={80} cy={66} r={40} fill="#fde68a" stroke="#f59e0b" strokeWidth={4} />
    <rect x={64} y={100} width={32} height={12} fill="#475569" />
    <rect x={68} y={112} width={24} height={10} fill="#334155" />
    <path d="M 70 70 Q 80 90 90 70" fill="none" stroke="#f59e0b" strokeWidth={3} />
  </C>
);

const CPU: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <rect x={30} y={30} width={100} height={100} rx={8} fill={theme.primary} />
    <rect x={50} y={50} width={60} height={60} rx={4} fill={theme.background} />
    <text x={80} y={90} textAnchor="middle" fontSize={20} fontWeight={800} fill={theme.text}>
      CPU
    </text>
    {[0, 1, 2, 3].map((i) => (
      <g key={i}>
        <rect x={10} y={50 + i * 20} width={20} height={6} fill={theme.secondary} />
        <rect x={130} y={50 + i * 20} width={20} height={6} fill={theme.secondary} />
        <rect x={50 + i * 20} y={10} width={6} height={20} fill={theme.secondary} />
        <rect x={50 + i * 20} y={130} width={6} height={20} fill={theme.secondary} />
      </g>
    ))}
  </C>
);

const Memory: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <rect x={20} y={40} width={120} height={80} rx={6} fill={theme.primary} />
    {Array.from({ length: 8 }).map((_, i) => (
      <rect
        key={i}
        x={30 + i * 14}
        y={52}
        width={10}
        height={56}
        fill={theme.background}
        stroke={theme.secondary}
        strokeWidth={1}
      />
    ))}
  </C>
);

const Database: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <ellipse cx={80} cy={40} rx={50} ry={14} fill={theme.primary} />
    <rect x={30} y={40} width={100} height={60} fill={theme.primary} />
    <ellipse cx={80} cy={100} rx={50} ry={14} fill={theme.primary} opacity={0.8} />
    <rect x={30} y={100} width={100} height={30} fill={theme.primary} opacity={0.8} />
    <ellipse cx={80} cy={130} rx={50} ry={14} fill={theme.secondary} />
  </C>
);

const Cloud: React.FC<{ theme: Theme }> = () => (
  <C>
    <ellipse cx={60} cy={90} rx={36} ry={28} fill="#e2e8f0" />
    <ellipse cx={95} cy={80} rx={38} ry={30} fill="#e2e8f0" />
    <ellipse cx={75} cy={70} rx={28} ry={22} fill="#f1f5f9" />
    <ellipse cx={100} cy={105} rx={20} ry={14} fill="#cbd5e1" />
  </C>
);

const Arrow: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <path d="M 20 80 L 120 80" stroke={theme.primary} strokeWidth={12} strokeLinecap="round" />
    <polygon points="110,60 140,80 110,100" fill={theme.primary} />
  </C>
);

const Heart: React.FC<{ theme: Theme }> = () => (
  <C>
    <path
      d="M 80 140 L 20 80 C 5 60 20 28 50 28 C 68 28 80 40 80 50 C 80 40 92 28 110 28 C 140 28 155 60 140 80 Z"
      fill="#ef4444"
    />
  </C>
);

const Brain: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <path
      d="M 80 30 C 50 30 40 50 40 70 C 30 70 30 100 45 100 C 45 120 65 130 80 130 C 95 130 115 120 115 100 C 130 100 130 70 120 70 C 120 50 110 30 80 30 Z"
      fill="#f472b6"
      stroke="#be185d"
      strokeWidth={3}
    />
    <path d="M 80 40 V 128" stroke="#be185d" strokeWidth={3} fill="none" />
    <path d="M 60 60 Q 80 70 100 60" fill="none" stroke="#be185d" strokeWidth={2} />
    <path d="M 55 90 Q 80 100 105 90" fill="none" stroke="#be185d" strokeWidth={2} />
  </C>
);

const Fire: React.FC<{ theme: Theme }> = () => (
  <C>
    <path
      d="M 80 140 C 40 130 40 90 60 70 C 55 55 70 40 75 50 C 80 35 95 30 95 50 C 110 55 120 80 110 100 C 130 110 120 140 80 140 Z"
      fill="#f97316"
    />
    <path
      d="M 80 130 C 55 120 55 95 70 80 C 72 75 80 70 84 78 C 90 85 105 105 80 130 Z"
      fill="#fde047"
    />
  </C>
);

const Star: React.FC<{ theme: Theme }> = () => (
  <C>
    <polygon
      points="80,20 98,60 140,60 105,85 120,130 80,105 40,130 55,85 20,60 62,60"
      fill="#fbbf24"
      stroke="#b45309"
      strokeWidth={3}
    />
  </C>
);

const Earth: React.FC<{ theme: Theme }> = () => (
  <C>
    <circle cx={80} cy={80} r={60} fill="#2563eb" />
    <path d="M 40 60 Q 70 55 80 70 Q 100 65 120 75 Q 110 95 85 95 Q 70 108 50 100 Q 35 85 40 60 Z" fill="#16a34a" />
    <path d="M 100 110 Q 115 118 120 125 Q 110 130 100 124 Z" fill="#16a34a" />
    <circle cx={80} cy={80} r={60} fill="none" stroke="#1e3a8a" strokeWidth={2} />
  </C>
);

const Gear: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <circle cx={80} cy={80} r={40} fill={theme.primary} />
    {Array.from({ length: 8 }).map((_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return (
        <rect
          key={i}
          x={80 - 8}
          y={30}
          width={16}
          height={18}
          fill={theme.primary}
          transform={`rotate(${(i * 360) / 8} 80 80)`}
        />
      );
    })}
    <circle cx={80} cy={80} r={16} fill={theme.background} />
  </C>
);

const Molecule: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <line x1={50} y1={60} x2={110} y2={60} stroke={theme.text} strokeWidth={4} />
    <line x1={50} y1={60} x2={40} y2={110} stroke={theme.text} strokeWidth={4} />
    <line x1={110} y1={60} x2={120} y2={110} stroke={theme.text} strokeWidth={4} />
    <circle cx={50} cy={60} r={20} fill="#60a5fa" />
    <circle cx={110} cy={60} r={20} fill="#60a5fa" />
    <circle cx={40} cy={110} r={16} fill="#f472b6" />
    <circle cx={120} cy={110} r={16} fill="#f472b6" />
  </C>
);

const Flask: React.FC<{ theme: Theme }> = () => (
  <C>
    <rect x={60} y={20} width={40} height={20} fill="#475569" />
    <path d="M 55 40 L 105 40 L 135 130 Q 80 150 25 130 Z" fill="#a78bfa" stroke="#6d28d9" strokeWidth={4} />
    <path d="M 40 100 Q 80 110 120 100 L 130 130 Q 80 150 30 130 Z" fill="#7c3aed" />
    <circle cx={65} cy={120} r={5} fill="#fff" opacity={0.6} />
    <circle cx={90} cy={128} r={4} fill="#fff" opacity={0.5} />
  </C>
);

const Book: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <rect x={20} y={30} width={120} height={100} rx={6} fill={theme.primary} />
    <rect x={30} y={38} width={100} height={84} fill={theme.background} />
    <line x1={80} y1={38} x2={80} y2={122} stroke={theme.primary} strokeWidth={3} />
    {[50, 70, 90, 110].map((y) => (
      <line key={y} x1={40} y1={y} x2={72} y2={y} stroke={theme.text + '88'} strokeWidth={2} />
    ))}
    {[50, 70, 90, 110].map((y) => (
      <line key={y} x1={88} y1={y} x2={120} y2={y} stroke={theme.text + '88'} strokeWidth={2} />
    ))}
  </C>
);

const Lightning: React.FC<{ theme: Theme }> = () => (
  <C>
    <polygon
      points="80,10 40,90 70,90 50,150 120,70 90,70 110,10"
      fill="#facc15"
      stroke="#b45309"
      strokeWidth={3}
    />
  </C>
);

/** Thylakoid — stacked green discs (grana) inside a chloroplast membrane. */
const Thylakoid: React.FC<{ theme: Theme }> = () => (
  <C>
    <ellipse cx={80} cy={80} rx={70} ry={55} fill="#bbf7d0" stroke="#15803d" strokeWidth={4} />
    {[60, 76, 92].map((cy, i) => (
      <g key={i}>
        <ellipse cx={80} cy={cy} rx={36} ry={6} fill="#15803d" />
        <ellipse cx={80} cy={cy - 2} rx={36} ry={5} fill="#22c55e" />
      </g>
    ))}
    <path
      d="M 20 80 Q 40 50 80 50 Q 120 50 140 80 Q 120 110 80 110 Q 40 110 20 80 Z"
      fill="none"
      stroke="#14532d"
      strokeWidth={3}
    />
  </C>
);

/* -------------------------------------------------------------------------
 * History / civics / biography icons
 *
 * These intentionally read as "a person standing tall" / "a crown" /
 * "a fort" rather than abstract shapes — so timelines of historical
 * figures (Shivaji Maharaj, Ashoka, etc.) render with a silhouette the
 * viewer immediately recognises instead of the generic gradient circle.
 * Sized inside the standard 160x160 viewBox. Uses theme.primary /
 * theme.secondary so icons stay on-brand across videos.
 * ------------------------------------------------------------------------- */

/** Standing turbaned warrior with sword — used for Shivaji Maharaj, generals,
 * soldiers, any "warrior-ish" figure. Pose = facing forward, tall, noble. */
const Warrior: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    {/* Subtle halo / ground shadow for presence */}
    <ellipse cx={80} cy={148} rx={42} ry={6} fill={theme.text + '33'} />
    {/* Turban (top crest + wrap) */}
    <path
      d="M 58 30 Q 80 8 102 30 Q 100 40 80 40 Q 60 40 58 30 Z"
      fill={theme.secondary}
      stroke={theme.primary}
      strokeWidth={2}
    />
    <circle cx={80} cy={22} r={4} fill="#facc15" />
    {/* Face */}
    <ellipse cx={80} cy={48} rx={13} ry={14} fill="#f5d6b3" />
    {/* Moustache */}
    <path
      d="M 70 54 Q 80 60 90 54"
      stroke="#4b2e16"
      strokeWidth={2.5}
      fill="none"
      strokeLinecap="round"
    />
    {/* Shoulder / body drape (royal robe) */}
    <path
      d="M 46 72 Q 80 60 114 72 L 120 138 Q 80 148 40 138 Z"
      fill={theme.primary}
      stroke={theme.secondary}
      strokeWidth={2}
    />
    {/* Sash / belt */}
    <rect x={44} y={100} width={72} height={8} fill={theme.secondary} rx={2} />
    {/* Left arm by side */}
    <path d="M 48 80 L 42 120" stroke="#f5d6b3" strokeWidth={7} strokeLinecap="round" />
    {/* Right arm holding sword */}
    <path d="M 112 80 L 128 116" stroke="#f5d6b3" strokeWidth={7} strokeLinecap="round" />
    {/* Sword — blade + hilt — held at the right hand */}
    <line x1={128} y1={116} x2={140} y2={50} stroke="#e5e7eb" strokeWidth={4} strokeLinecap="round" />
    <line x1={122} y1={118} x2={138} y2={118} stroke="#b45309" strokeWidth={4} strokeLinecap="round" />
    <circle cx={140} cy={46} r={3} fill="#facc15" />
  </C>
);

/** Classic five-point crown with gems. */
const Crown: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <path
      d="M 20 110 L 30 50 L 55 80 L 80 40 L 105 80 L 130 50 L 140 110 Z"
      fill="#facc15"
      stroke={theme.primary}
      strokeWidth={3}
    />
    <rect x={20} y={110} width={120} height={20} fill="#eab308" stroke={theme.primary} strokeWidth={3} />
    <circle cx={55} cy={120} r={5} fill={theme.secondary} />
    <circle cx={80} cy={120} r={6} fill="#ef4444" />
    <circle cx={105} cy={120} r={5} fill={theme.secondary} />
  </C>
);

/** Generic standing person silhouette (neutral — for any labelled human). */
const Person: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <ellipse cx={80} cy={148} rx={36} ry={5} fill={theme.text + '33'} />
    <circle cx={80} cy={40} r={16} fill="#f5d6b3" stroke={theme.primary} strokeWidth={3} />
    <path
      d="M 46 76 Q 80 62 114 76 L 118 132 Q 80 142 42 132 Z"
      fill={theme.primary}
      stroke={theme.secondary}
      strokeWidth={2}
    />
    <path d="M 48 82 L 40 120" stroke="#f5d6b3" strokeWidth={7} strokeLinecap="round" />
    <path d="M 112 82 L 120 120" stroke="#f5d6b3" strokeWidth={7} strokeLinecap="round" />
  </C>
);

/** Fort / palace — stepped battlement silhouette. Maratha-fort vibe. */
const Fort: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    {/* Hill base */}
    <path d="M 10 140 Q 80 110 150 140 L 150 150 L 10 150 Z" fill="#4b5563" />
    {/* Main wall */}
    <rect x={30} y={70} width={100} height={70} fill={theme.primary} stroke={theme.secondary} strokeWidth={2} />
    {/* Battlements */}
    {[30, 50, 70, 90, 110, 130].map((x) => (
      <rect key={x} x={x - 4} y={60} width={8} height={14} fill={theme.primary} stroke={theme.secondary} strokeWidth={2} />
    ))}
    {/* Central tower */}
    <rect x={70} y={40} width={20} height={30} fill={theme.secondary} stroke={theme.primary} strokeWidth={2} />
    <polygon points="68,40 80,20 92,40" fill="#facc15" />
    {/* Gate */}
    <path d="M 70 140 L 70 110 Q 80 100 90 110 L 90 140 Z" fill="#1f2937" />
    {/* Windows */}
    <rect x={44} y={90} width={8} height={12} fill="#1f2937" />
    <rect x={108} y={90} width={8} height={12} fill="#1f2937" />
  </C>
);

/** Vertical sword icon (blade + cross-guard + hilt). */
const SwordIcon: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    {/* Blade */}
    <polygon points="80,10 86,110 80,118 74,110" fill="#e5e7eb" stroke={theme.primary} strokeWidth={2} />
    {/* Cross-guard */}
    <rect x={54} y={108} width={52} height={8} fill="#b45309" rx={2} />
    {/* Grip */}
    <rect x={76} y={116} width={8} height={28} fill="#1f2937" />
    {/* Pommel */}
    <circle cx={80} cy={148} r={7} fill="#facc15" stroke={theme.primary} strokeWidth={2} />
  </C>
);

/** Pennant flag on a pole — generic "banner" / bhagwa dhwaj style. */
const FlagIcon: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    {/* Pole */}
    <rect x={40} y={20} width={6} height={130} fill="#78350f" />
    <circle cx={43} cy={20} r={6} fill="#facc15" />
    {/* Flag — saffron triangular pennant */}
    <path d="M 46 26 L 130 50 L 46 76 Z" fill="#f97316" stroke={theme.primary} strokeWidth={2} />
    {/* Ground */}
    <ellipse cx={44} cy={150} rx={16} ry={3} fill={theme.text + '33'} />
  </C>
);

/** Rolled parchment / scroll — edicts, treaties, manuscripts. */
const Scroll: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <rect x={30} y={40} width={100} height={80} rx={6} fill="#fef3c7" stroke={theme.primary} strokeWidth={3} />
    {/* Text lines */}
    {[56, 72, 88, 104].map((y) => (
      <line key={y} x1={44} y1={y} x2={116} y2={y} stroke={theme.primary} strokeWidth={2} opacity={0.6} />
    ))}
    {/* Rolled ends */}
    <rect x={22} y={32} width={18} height={96} rx={9} fill={theme.secondary} stroke={theme.primary} strokeWidth={2} />
    <rect x={120} y={32} width={18} height={96} rx={9} fill={theme.secondary} stroke={theme.primary} strokeWidth={2} />
    {/* Wax seal */}
    <circle cx={80} cy={124} r={8} fill="#dc2626" stroke="#7f1d1d" strokeWidth={2} />
  </C>
);

/** Calendar / timeline marker — a dated leaf showing a year. */
const Calendar: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <rect x={24} y={30} width={112} height={110} rx={10} fill={theme.background} stroke={theme.primary} strokeWidth={4} />
    {/* Binder rings */}
    <rect x={46} y={18} width={8} height={22} rx={3} fill={theme.secondary} />
    <rect x={106} y={18} width={8} height={22} rx={3} fill={theme.secondary} />
    {/* Header strip */}
    <rect x={24} y={30} width={112} height={24} fill={theme.primary} />
    {/* Grid */}
    {[0, 1, 2, 3].map((r) =>
      [0, 1, 2, 3, 4, 5, 6].map((c) => (
        <rect
          key={`${r}-${c}`}
          x={32 + c * 14}
          y={62 + r * 16}
          width={12}
          height={14}
          fill={r === 2 && c === 3 ? theme.secondary : 'transparent'}
          stroke={theme.primary + '55'}
          strokeWidth={1}
        />
      )),
    )}
  </C>
);

/* -------------------------------------------------------------------------
 * Machine-learning / AI icons
 * ------------------------------------------------------------------------- */

/** 3-layer neural network — nodes + connecting edges. */
const NeuralNet: React.FC<{ theme: Theme }> = ({ theme }) => {
  const layers = [
    [40, 60, 100], // input layer y positions
    [30, 55, 80, 105, 130],
    [50, 80, 110],
  ];
  const xs = [30, 80, 130];
  return (
    <C>
      {/* edges */}
      {layers[0].map((y1, i) =>
        layers[1].map((y2, j) => (
          <line key={`e1-${i}-${j}`} x1={xs[0]} y1={y1} x2={xs[1]} y2={y2} stroke={theme.secondary + '88'} strokeWidth={1.5} />
        )),
      )}
      {layers[1].map((y1, i) =>
        layers[2].map((y2, j) => (
          <line key={`e2-${i}-${j}`} x1={xs[1]} y1={y1} x2={xs[2]} y2={y2} stroke={theme.secondary + '88'} strokeWidth={1.5} />
        )),
      )}
      {/* neurons */}
      {layers.map((col, li) =>
        col.map((y, i) => (
          <circle key={`n-${li}-${i}`} cx={xs[li]} cy={y} r={8} fill={theme.primary} stroke={theme.secondary} strokeWidth={2} />
        )),
      )}
    </C>
  );
};

/** Friendly robot head — rounded body + eyes + antenna. */
const Robot: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    {/* antenna */}
    <line x1={80} y1={18} x2={80} y2={36} stroke={theme.secondary} strokeWidth={3} />
    <circle cx={80} cy={16} r={5} fill="#facc15" />
    {/* head */}
    <rect x={30} y={36} width={100} height={80} rx={18} fill={theme.primary} stroke={theme.secondary} strokeWidth={3} />
    {/* screen-face */}
    <rect x={42} y={52} width={76} height={48} rx={8} fill={theme.background} />
    {/* eyes */}
    <circle cx={60} cy={76} r={7} fill="#22d3ee" />
    <circle cx={100} cy={76} r={7} fill="#22d3ee" />
    {/* mouth */}
    <rect x={60} y={90} width={40} height={4} rx={2} fill="#22d3ee" />
    {/* ears / side panels */}
    <rect x={22} y={60} width={10} height={32} rx={4} fill={theme.secondary} />
    <rect x={128} y={60} width={10} height={32} rx={4} fill={theme.secondary} />
    {/* neck / body base */}
    <rect x={60} y={116} width={40} height={22} rx={4} fill={theme.secondary} />
    <ellipse cx={80} cy={146} rx={32} ry={5} fill={theme.text + '33'} />
  </C>
);

/** Line chart — axes + polyline with data points. */
const Chart: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <rect x={20} y={20} width={120} height={120} rx={8} fill={theme.background} stroke={theme.primary + '55'} strokeWidth={2} />
    {/* grid */}
    {[50, 80, 110].map((y) => (
      <line key={`g-${y}`} x1={32} y1={y} x2={136} y2={y} stroke={theme.primary + '22'} strokeWidth={1} />
    ))}
    {/* axes */}
    <line x1={32} y1={24} x2={32} y2={128} stroke={theme.text} strokeWidth={2} />
    <line x1={32} y1={128} x2={140} y2={128} stroke={theme.text} strokeWidth={2} />
    {/* line */}
    <polyline
      points="36,118 56,96 76,100 96,68 116,52 134,34"
      fill="none"
      stroke={theme.secondary}
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* data points */}
    {[
      [36, 118], [56, 96], [76, 100], [96, 68], [116, 52], [134, 34],
    ].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r={4} fill={theme.primary} stroke={theme.secondary} strokeWidth={2} />
    ))}
  </C>
);

/** 3x3 matrix of numbers — with brackets. */
const Matrix: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    {/* left bracket */}
    <path d="M 30 30 L 20 30 L 20 130 L 30 130" stroke={theme.primary} strokeWidth={4} fill="none" strokeLinecap="round" />
    {/* right bracket */}
    <path d="M 130 30 L 140 30 L 140 130 L 130 130" stroke={theme.primary} strokeWidth={4} fill="none" strokeLinecap="round" />
    {/* cells */}
    {[0, 1, 2].map((r) =>
      [0, 1, 2].map((c) => (
        <text
          key={`${r}-${c}`}
          x={46 + c * 32}
          y={60 + r * 32}
          fill={theme.text}
          fontSize={22}
          fontWeight="700"
          textAnchor="middle"
          fontFamily="monospace"
        >
          {((r * 3 + c) % 3) === 0 ? '1' : ((r * 3 + c) % 3) === 1 ? '0' : 'x'}
        </text>
      )),
    )}
  </C>
);

/** Dataset / table icon — header + rows. */
const Dataset: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <rect x={20} y={26} width={120} height={108} rx={8} fill={theme.background} stroke={theme.primary} strokeWidth={3} />
    {/* header row */}
    <rect x={20} y={26} width={120} height={22} fill={theme.primary} rx={8} />
    <rect x={20} y={40} width={120} height={8} fill={theme.primary} />
    {/* vertical dividers */}
    {[60, 100].map((x) => (
      <line key={x} x1={x} y1={48} x2={x} y2={134} stroke={theme.primary + '55'} strokeWidth={1} />
    ))}
    {/* rows */}
    {[68, 88, 108, 128].map((y, i) => (
      <line key={y} x1={20} y1={y} x2={140} y2={y} stroke={theme.primary + '55'} strokeWidth={1} />
    ))}
    {/* cell content dots */}
    {[60, 80, 100, 120].map((y) =>
      [40, 80, 120].map((x) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={2.5} fill={theme.text} opacity={0.6} />
      )),
    )}
  </C>
);

/* -------------------------------------------------------------------------
 * Nuclear-physics icons
 * ------------------------------------------------------------------------- */

/** Dense atomic nucleus — cluster of protons + neutrons. */
const Nucleus: React.FC<{ theme: Theme }> = ({ theme }) => {
  const nucleons = [
    { x: 70, y: 70, c: '#ef4444' },
    { x: 90, y: 70, c: '#3b82f6' },
    { x: 80, y: 54, c: '#ef4444' },
    { x: 60, y: 84, c: '#3b82f6' },
    { x: 100, y: 84, c: '#ef4444' },
    { x: 80, y: 96, c: '#3b82f6' },
    { x: 70, y: 106, c: '#ef4444' },
    { x: 98, y: 102, c: '#3b82f6' },
  ];
  return (
    <C>
      {/* subtle glow */}
      <circle cx={80} cy={80} r={54} fill={theme.primary} opacity={0.15} />
      {nucleons.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={11} fill={n.c} stroke="#1f2937" strokeWidth={1.5} />
      ))}
    </C>
  );
};

/** Radiation trefoil — internationally recognised symbol. */
const Radiation: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <circle cx={80} cy={80} r={70} fill="#facc15" />
    {/* three trefoil wedges at 0, 120, 240 deg */}
    {[0, 120, 240].map((deg) => (
      <g key={deg} transform={`rotate(${deg} 80 80)`}>
        <path
          d="M 80 80 L 108 36 A 52 52 0 0 0 52 36 Z"
          fill="#1f2937"
        />
      </g>
    ))}
    <circle cx={80} cy={80} r={14} fill="#1f2937" />
    <circle cx={80} cy={80} r={70} fill="none" stroke={theme.primary} strokeWidth={3} />
  </C>
);

/** Fission — nucleus splitting into 2 fragments + flying neutrons. */
const Fission: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    {/* left fragment */}
    <g>
      <circle cx={44} cy={80} r={18} fill="#ef4444" />
      <circle cx={36} cy={74} r={6} fill="#3b82f6" />
      <circle cx={52} cy={86} r={6} fill="#3b82f6" />
    </g>
    {/* right fragment */}
    <g>
      <circle cx={116} cy={80} r={18} fill="#ef4444" />
      <circle cx={108} cy={86} r={6} fill="#3b82f6" />
      <circle cx={124} cy={74} r={6} fill="#3b82f6" />
    </g>
    {/* flying neutrons */}
    <circle cx={80} cy={30} r={7} fill="#93c5fd" stroke={theme.primary} strokeWidth={2} />
    <circle cx={80} cy={130} r={7} fill="#93c5fd" stroke={theme.primary} strokeWidth={2} />
    <circle cx={80} cy={80} r={7} fill="#93c5fd" stroke={theme.primary} strokeWidth={2} />
    {/* motion lines */}
    <line x1={64} y1={80} x2={80} y2={80} stroke={theme.secondary} strokeWidth={2} strokeDasharray="3 3" />
    <line x1={96} y1={80} x2={80} y2={80} stroke={theme.secondary} strokeWidth={2} strokeDasharray="3 3" />
    <line x1={80} y1={46} x2={80} y2={80} stroke={theme.secondary} strokeWidth={2} strokeDasharray="3 3" />
    <line x1={80} y1={114} x2={80} y2={80} stroke={theme.secondary} strokeWidth={2} strokeDasharray="3 3" />
  </C>
);

/** Fusion — two small nuclei approaching + merged product + energy burst. */
const Fusion: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    {/* energy burst behind */}
    <circle cx={80} cy={80} r={48} fill="#facc15" opacity={0.3} />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => (
      <line
        key={d}
        x1={80}
        y1={80}
        x2={80 + Math.cos((d * Math.PI) / 180) * 60}
        y2={80 + Math.sin((d * Math.PI) / 180) * 60}
        stroke="#facc15"
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.6}
      />
    ))}
    {/* two nuclei approaching from sides */}
    <circle cx={48} cy={80} r={14} fill="#3b82f6" stroke={theme.primary} strokeWidth={2} />
    <circle cx={112} cy={80} r={14} fill="#3b82f6" stroke={theme.primary} strokeWidth={2} />
    {/* merged centre */}
    <circle cx={80} cy={80} r={18} fill="#ef4444" stroke={theme.primary} strokeWidth={3} />
    {/* arrows in */}
    <polygon points="62,76 70,80 62,84" fill={theme.secondary} />
    <polygon points="98,76 90,80 98,84" fill={theme.secondary} />
  </C>
);

/** Nuclear reactor — cooling tower with steam. */
const Reactor: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    {/* steam puffs */}
    <ellipse cx={64} cy={28} rx={14} ry={8} fill="#cbd5e1" opacity={0.8} />
    <ellipse cx={86} cy={22} rx={18} ry={10} fill="#e2e8f0" opacity={0.9} />
    <ellipse cx={104} cy={30} rx={12} ry={6} fill="#cbd5e1" opacity={0.7} />
    {/* cooling tower (hyperboloid approximation) */}
    <path
      d="M 50 46 L 44 140 L 116 140 L 110 46 Q 80 60 50 46 Z"
      fill={theme.primary}
      stroke={theme.secondary}
      strokeWidth={3}
    />
    {/* mouth shading */}
    <ellipse cx={80} cy={48} rx={30} ry={6} fill="#1f2937" />
    {/* radiation symbol on tower */}
    <circle cx={80} cy={98} r={14} fill="#facc15" />
    {[0, 120, 240].map((deg) => (
      <g key={deg} transform={`rotate(${deg} 80 98)`}>
        <path d="M 80 98 L 90 84 A 12 12 0 0 0 70 84 Z" fill="#1f2937" />
      </g>
    ))}
    <circle cx={80} cy={98} r={3.5} fill="#1f2937" />
    {/* ground */}
    <rect x={30} y={140} width={100} height={6} fill="#4b5563" />
  </C>
);

/* -------------------------------------------------------------------------
 * Math-notation icons
 * ------------------------------------------------------------------------- */

const Sigma: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <circle cx={80} cy={80} r={62} fill={theme.primary} opacity={0.12} />
    <text
      x={80}
      y={112}
      textAnchor="middle"
      fontSize={110}
      fontWeight="700"
      fill={theme.text}
      fontFamily="Georgia, serif"
    >
      Σ
    </text>
  </C>
);

const Integral: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <circle cx={80} cy={80} r={62} fill={theme.primary} opacity={0.12} />
    <text
      x={80}
      y={124}
      textAnchor="middle"
      fontSize={130}
      fontWeight="500"
      fill={theme.text}
      fontFamily="Georgia, serif"
      fontStyle="italic"
    >
      ∫
    </text>
  </C>
);

const Pi: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <circle cx={80} cy={80} r={62} fill={theme.primary} opacity={0.12} />
    <text
      x={80}
      y={116}
      textAnchor="middle"
      fontSize={100}
      fontWeight="700"
      fill={theme.text}
      fontFamily="Georgia, serif"
    >
      π
    </text>
  </C>
);

const Infinity: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <circle cx={80} cy={80} r={62} fill={theme.primary} opacity={0.12} />
    <text
      x={80}
      y={112}
      textAnchor="middle"
      fontSize={100}
      fontWeight="700"
      fill={theme.text}
      fontFamily="Georgia, serif"
    >
      ∞
    </text>
  </C>
);

/** Right triangle with labelled sides — geometry / Pythagoras node icon. */
const TriangleIcon: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <polygon
      points="30,130 130,130 30,40"
      fill={theme.primary}
      opacity={0.25}
      stroke={theme.primary}
      strokeWidth={3}
    />
    {/* right-angle square */}
    <polyline points="30,118 42,118 42,130" fill="none" stroke={theme.secondary} strokeWidth={3} />
    {/* side labels */}
    <text x={18} y={88} fill={theme.text} fontSize={16} fontWeight="700" fontFamily="Georgia, serif">a</text>
    <text x={76} y={144} fill={theme.text} fontSize={16} fontWeight="700" fontFamily="Georgia, serif">b</text>
    <text x={82} y={78} fill={theme.text} fontSize={16} fontWeight="700" fontFamily="Georgia, serif">c</text>
  </C>
);

/* -------------------------------------------------------------------------
 * Aerospace / rocketry icons
 *
 * Each icon is purpose-built for rocket-launch / spaceflight diagrams so
 * a node labelled "Rocket" actually shows a multi-stage rocket
 * silhouette instead of a gradient circle, "Nozzle" shows a bell-shaped
 * engine, etc. All sit inside the standard 160x160 viewBox and
 * harmonise with theme.primary / theme.secondary.
 * ------------------------------------------------------------------------- */

/** Multi-stage rocket silhouette — nose cone + body + window + fins + nozzle. */
const Rocket: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    {/* Exhaust glow under the nozzle */}
    <ellipse cx={80} cy={150} rx={26} ry={6} fill="#fb923c" opacity={0.55} />
    {/* Nose cone */}
    <path d="M 80 8 L 60 50 L 100 50 Z" fill={theme.secondary} stroke={theme.primary} strokeWidth={2} />
    {/* Body */}
    <rect x={60} y={50} width={40} height={70} fill={theme.text} stroke={theme.primary} strokeWidth={2} />
    {/* Stage interstage band */}
    <rect x={60} y={84} width={40} height={4} fill={theme.primary} />
    {/* Window porthole */}
    <circle cx={80} cy={66} r={6} fill="#38bdf8" stroke={theme.primary} strokeWidth={2} />
    {/* Left fin */}
    <path d="M 60 110 L 40 138 L 60 132 Z" fill={theme.primary} stroke={theme.secondary} strokeWidth={2} />
    {/* Right fin */}
    <path d="M 100 110 L 120 138 L 100 132 Z" fill={theme.primary} stroke={theme.secondary} strokeWidth={2} />
    {/* Center fin behind */}
    <path d="M 75 116 L 80 140 L 85 116 Z" fill={theme.secondary} opacity={0.7} />
    {/* Nozzle */}
    <path d="M 64 120 L 56 140 L 104 140 L 96 120 Z" fill="#475569" stroke={theme.primary} strokeWidth={2} />
    {/* Exhaust flames */}
    <path d="M 64 140 Q 80 156 96 140 Q 88 152 80 154 Q 72 152 64 140 Z" fill="#f97316" />
    <path d="M 70 142 Q 80 152 90 142 Q 84 150 80 151 Q 76 150 70 142 Z" fill="#fde047" />
  </C>
);

/** Pointed nose cone / fairing — triangular with a small access hatch. */
const NoseCone: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    <path d="M 80 14 L 40 130 L 120 130 Z" fill={theme.primary} stroke={theme.secondary} strokeWidth={3} />
    {/* Vertical seam */}
    <line x1={80} y1={14} x2={80} y2={130} stroke={theme.secondary} strokeWidth={2} opacity={0.5} />
    {/* Access hatch */}
    <rect x={70} y={88} width={20} height={14} rx={2} fill={theme.background} stroke={theme.secondary} strokeWidth={2} />
    {/* Tip highlight */}
    <circle cx={80} cy={20} r={3} fill="#facc15" />
  </C>
);

/** Cylindrical fuel / propellant tank — vertical, with cryogenic frost banding. */
const FuelTank: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    {/* Top cap */}
    <ellipse cx={80} cy={28} rx={32} ry={8} fill={theme.primary} stroke={theme.secondary} strokeWidth={2} />
    {/* Cylinder body */}
    <rect x={48} y={28} width={64} height={104} fill={theme.text} stroke={theme.primary} strokeWidth={2} />
    {/* Frost / cryogenic stripe */}
    <rect x={48} y={56} width={64} height={6} fill="#bfdbfe" />
    <rect x={48} y={92} width={64} height={6} fill="#bfdbfe" />
    {/* Vent */}
    <rect x={76} y={20} width={8} height={10} fill={theme.secondary} />
    {/* "FUEL" label */}
    <text x={80} y={86} textAnchor="middle" fontSize={14} fontWeight="800" fill={theme.background} fontFamily="monospace">FUEL</text>
    {/* Bottom cap + outlet */}
    <ellipse cx={80} cy={132} rx={32} ry={8} fill={theme.primary} stroke={theme.secondary} strokeWidth={2} />
    <rect x={74} y={138} width={12} height={10} fill={theme.secondary} />
  </C>
);

/** Bell-shaped engine nozzle (Laval). */
const Nozzle: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    {/* Throat */}
    <rect x={66} y={20} width={28} height={18} fill={theme.primary} stroke={theme.secondary} strokeWidth={2} />
    {/* Bell expansion */}
    <path d="M 66 38 L 28 138 L 132 138 L 94 38 Z" fill="#475569" stroke={theme.primary} strokeWidth={3} />
    {/* Inner shading */}
    <path d="M 66 38 L 38 130 L 122 130 L 94 38 Z" fill="#1f2937" />
    {/* Cooling channels (vertical lines) */}
    {[42, 58, 74, 86, 102, 118].map((x) => (
      <line key={x} x1={x} y1={48} x2={x - (x < 80 ? 4 : -4)} y2={130} stroke={theme.secondary} strokeWidth={1.5} opacity={0.6} />
    ))}
    {/* Exhaust glow */}
    <path d="M 38 132 Q 80 152 122 132 Q 100 148 80 150 Q 60 148 38 132 Z" fill="#f97316" />
  </C>
);

/** Combustion chamber + nozzle (compact engine icon). */
const Engine: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    {/* Top fuel/oxidizer feed pipes */}
    <rect x={48} y={14} width={10} height={20} fill={theme.secondary} />
    <rect x={102} y={14} width={10} height={20} fill={theme.secondary} />
    {/* Combustion chamber (rounded) */}
    <ellipse cx={80} cy={56} rx={36} ry={26} fill={theme.primary} stroke={theme.secondary} strokeWidth={3} />
    {/* Throat */}
    <rect x={68} y={78} width={24} height={14} fill={theme.primary} stroke={theme.secondary} strokeWidth={2} />
    {/* Bell nozzle */}
    <path d="M 68 92 L 38 142 L 122 142 L 92 92 Z" fill="#475569" stroke={theme.secondary} strokeWidth={3} />
    {/* Flame */}
    <path d="M 50 142 Q 80 158 110 142 Q 96 154 80 156 Q 64 154 50 142 Z" fill="#f97316" />
    <path d="M 60 144 Q 80 154 100 144 Q 90 152 80 153 Q 70 152 60 144 Z" fill="#fde047" />
  </C>
);

/** Crew capsule / payload — rounded conical with antenna. */
const Payload: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    {/* Antenna */}
    <line x1={80} y1={6} x2={80} y2={26} stroke={theme.secondary} strokeWidth={3} />
    <circle cx={80} cy={6} r={3} fill="#facc15" />
    {/* Capsule body — truncated cone */}
    <path d="M 50 132 L 60 32 Q 80 24 100 32 L 110 132 Z" fill={theme.primary} stroke={theme.secondary} strokeWidth={3} />
    {/* Window */}
    <rect x={68} y={56} width={24} height={14} rx={3} fill="#38bdf8" stroke={theme.secondary} strokeWidth={2} />
    {/* Hatch */}
    <circle cx={80} cy={94} r={10} fill={theme.background} stroke={theme.secondary} strokeWidth={2} />
    {/* Heat-shield base curve */}
    <path d="M 50 132 Q 80 148 110 132" fill="#fb7185" stroke="#9f1239" strokeWidth={2} />
  </C>
);

/** Triangular stabilizer fins (pair). */
const Fins: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    {/* Center body slice for context */}
    <rect x={72} y={20} width={16} height={120} fill={theme.text} stroke={theme.primary} strokeWidth={2} />
    {/* Left fin */}
    <path d="M 72 60 L 20 130 L 72 110 Z" fill={theme.primary} stroke={theme.secondary} strokeWidth={3} />
    {/* Right fin */}
    <path d="M 88 60 L 140 130 L 88 110 Z" fill={theme.primary} stroke={theme.secondary} strokeWidth={3} />
    {/* Detail lines */}
    <line x1={26} y1={128} x2={70} y2={108} stroke={theme.secondary} strokeWidth={1.5} opacity={0.6} />
    <line x1={134} y1={128} x2={90} y2={108} stroke={theme.secondary} strokeWidth={1.5} opacity={0.6} />
  </C>
);

/** Parachute — dome with cords going to a payload. */
const Parachute: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    {/* Dome */}
    <path d="M 20 70 Q 80 0 140 70 Z" fill="#f97316" stroke={theme.primary} strokeWidth={3} />
    {/* Dome panels (vertical seams) */}
    {[40, 60, 80, 100, 120].map((x) => (
      <line key={x} x1={x} y1={70} x2={80} y2={20} stroke="#9a3412" strokeWidth={1.5} opacity={0.7} />
    ))}
    {/* Cords */}
    <line x1={20} y1={70} x2={70} y2={120} stroke={theme.secondary} strokeWidth={2} />
    <line x1={50} y1={56} x2={75} y2={120} stroke={theme.secondary} strokeWidth={2} />
    <line x1={80} y1={20} x2={80} y2={120} stroke={theme.secondary} strokeWidth={2} />
    <line x1={110} y1={56} x2={85} y2={120} stroke={theme.secondary} strokeWidth={2} />
    <line x1={140} y1={70} x2={90} y2={120} stroke={theme.secondary} strokeWidth={2} />
    {/* Payload box */}
    <rect x={66} y={120} width={28} height={20} rx={3} fill={theme.primary} stroke={theme.secondary} strokeWidth={2} />
  </C>
);

/** Launch pad — gantry tower with rocket alongside. */
const Launchpad: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    {/* Ground */}
    <rect x={0} y={140} width={160} height={20} fill="#4b5563" />
    {/* Gantry — vertical truss */}
    <rect x={20} y={20} width={6} height={120} fill={theme.primary} />
    <rect x={50} y={20} width={6} height={120} fill={theme.primary} />
    {/* Cross-bracing */}
    {[30, 50, 70, 90, 110, 130].map((y) => (
      <g key={y}>
        <line x1={26} y1={y} x2={50} y2={y + 16} stroke={theme.secondary} strokeWidth={2} />
        <line x1={50} y1={y} x2={26} y2={y + 16} stroke={theme.secondary} strokeWidth={2} />
      </g>
    ))}
    {/* Service arm to rocket */}
    <rect x={56} y={70} width={26} height={4} fill={theme.secondary} />
    {/* Mini rocket alongside */}
    <path d="M 90 30 L 80 50 L 100 50 Z" fill={theme.secondary} />
    <rect x={80} y={50} width={20} height={68} fill={theme.text} stroke={theme.primary} strokeWidth={2} />
    <circle cx={90} cy={64} r={3} fill="#38bdf8" />
    <path d="M 80 110 L 70 130 L 100 130 L 90 110 Z" fill="#475569" />
    {/* Exhaust trench */}
    <rect x={70} y={130} width={30} height={10} fill="#1f2937" />
    {/* Lightning towers */}
    <line x1={134} y1={140} x2={134} y2={50} stroke={theme.primary} strokeWidth={3} />
    <circle cx={134} cy={48} r={3} fill="#facc15" />
  </C>
);

/** Heat shield — curved ablative tile dome. */
const HeatShield: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    {/* Heat plume behind */}
    <path d="M 30 60 Q 80 0 130 60" stroke="#f97316" strokeWidth={4} fill="none" opacity={0.6} />
    <path d="M 40 80 Q 80 20 120 80" stroke="#fde047" strokeWidth={3} fill="none" opacity={0.7} />
    {/* Shield curve (concave) */}
    <path d="M 20 110 Q 80 140 140 110 L 140 130 Q 80 160 20 130 Z" fill="#9f1239" stroke={theme.primary} strokeWidth={3} />
    {/* Tile pattern */}
    {[34, 52, 70, 88, 106, 124].map((x) => (
      <line key={x} x1={x} y1={114} x2={x} y2={140} stroke="#7f1d1d" strokeWidth={1.5} />
    ))}
    {/* Glowing edge */}
    <path d="M 20 110 Q 80 140 140 110" stroke="#fb923c" strokeWidth={4} fill="none" />
  </C>
);

/** Orbit — planet + elliptical trajectory + a tiny spacecraft. */
const Orbit: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    {/* Star field hint */}
    {[[20, 20], [140, 30], [25, 130], [135, 110]].map(([cx, cy], i) => (
      <circle key={i} cx={cx} cy={cy} r={1.5} fill="#e2e8f0" />
    ))}
    {/* Earth */}
    <circle cx={80} cy={80} r={28} fill="#2563eb" stroke="#1e3a8a" strokeWidth={2} />
    <path d="M 56 78 Q 70 70 80 80 Q 92 78 102 84 Q 96 96 80 96 Q 64 92 56 78 Z" fill="#16a34a" />
    {/* Elliptical orbit */}
    <ellipse cx={80} cy={80} rx={64} ry={36} fill="none" stroke={theme.secondary} strokeWidth={2} strokeDasharray="4 4" />
    {/* Spacecraft on the orbit */}
    <g transform="translate(140 80)">
      <rect x={-4} y={-4} width={8} height={8} fill={theme.primary} stroke={theme.text} strokeWidth={1} />
      <rect x={-12} y={-3} width={6} height={6} fill="#38bdf8" />
      <rect x={6} y={-3} width={6} height={6} fill="#38bdf8" />
    </g>
    {/* Apogee/perigee markers */}
    <circle cx={16} cy={80} r={3} fill={theme.primary} />
    <circle cx={144} cy={80} r={3} fill={theme.primary} />
  </C>
);

/** Satellite — boxy bus with 2 solar-panel wings + dish antenna. */
const Satellite: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    {/* Solar panel — left */}
    <rect x={6} y={56} width={48} height={48} fill="#1e3a8a" stroke={theme.primary} strokeWidth={2} />
    {[18, 30, 42].map((x) => (
      <line key={x} x1={x} y1={56} x2={x} y2={104} stroke="#3b82f6" strokeWidth={1} />
    ))}
    <line x1={6} y1={80} x2={54} y2={80} stroke="#3b82f6" strokeWidth={1} />
    {/* Solar panel — right */}
    <rect x={106} y={56} width={48} height={48} fill="#1e3a8a" stroke={theme.primary} strokeWidth={2} />
    {[118, 130, 142].map((x) => (
      <line key={x} x1={x} y1={56} x2={x} y2={104} stroke="#3b82f6" strokeWidth={1} />
    ))}
    <line x1={106} y1={80} x2={154} y2={80} stroke="#3b82f6" strokeWidth={1} />
    {/* Body */}
    <rect x={54} y={50} width={52} height={60} rx={4} fill={theme.primary} stroke={theme.secondary} strokeWidth={3} />
    {/* Dish */}
    <ellipse cx={80} cy={32} rx={20} ry={10} fill={theme.text} stroke={theme.primary} strokeWidth={2} />
    <line x1={80} y1={32} x2={80} y2={50} stroke={theme.secondary} strokeWidth={3} />
    {/* Antenna */}
    <line x1={80} y1={110} x2={80} y2={130} stroke={theme.secondary} strokeWidth={2} />
    <circle cx={80} cy={132} r={3} fill="#facc15" />
  </C>
);

/** Astronaut — helmet + suit + visor. */
const Astronaut: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    {/* Helmet */}
    <circle cx={80} cy={48} r={28} fill="#e2e8f0" stroke={theme.primary} strokeWidth={3} />
    {/* Visor */}
    <path d="M 60 50 Q 80 32 100 50 Q 100 64 80 64 Q 60 64 60 50 Z" fill="#1e3a8a" />
    <ellipse cx={72} cy={44} rx={5} ry={3} fill="#fff" opacity={0.7} />
    {/* Suit body */}
    <path d="M 50 78 Q 80 68 110 78 L 116 142 Q 80 152 44 142 Z" fill="#f3f4f6" stroke={theme.primary} strokeWidth={3} />
    {/* Chest control panel */}
    <rect x={68} y={94} width={24} height={18} rx={3} fill={theme.secondary} stroke={theme.primary} strokeWidth={2} />
    <circle cx={74} cy={103} r={2} fill="#22c55e" />
    <circle cx={84} cy={103} r={2} fill="#ef4444" />
    {/* Arms */}
    <path d="M 50 84 L 30 122" stroke="#f3f4f6" strokeWidth={10} strokeLinecap="round" />
    <path d="M 110 84 L 130 122" stroke="#f3f4f6" strokeWidth={10} strokeLinecap="round" />
  </C>
);

/** Thrust force — big arrow with motion lines (rocket-engine output). */
const Thrust: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    {/* Combustion chamber + bell at top */}
    <rect x={66} y={10} width={28} height={18} fill={theme.primary} stroke={theme.secondary} strokeWidth={2} />
    <path d="M 56 28 L 38 60 L 122 60 L 104 28 Z" fill="#475569" stroke={theme.primary} strokeWidth={2} />
    {/* Big downward thrust arrow */}
    <polygon points="60,60 100,60 100,128 116,128 80,156 44,128 60,128" fill="#f97316" stroke="#9a3412" strokeWidth={2} />
    {/* Motion lines */}
    <line x1={28} y1={80} x2={36} y2={120} stroke="#fde047" strokeWidth={3} strokeLinecap="round" />
    <line x1={132} y1={80} x2={124} y2={120} stroke="#fde047" strokeWidth={3} strokeLinecap="round" />
    <line x1={20} y1={104} x2={32} y2={140} stroke="#fde047" strokeWidth={2} strokeLinecap="round" />
    <line x1={140} y1={104} x2={128} y2={140} stroke="#fde047" strokeWidth={2} strokeLinecap="round" />
  </C>
);

/** Gimbal — engine bell rotated on its mount, with rotation arrows. */
const Gimbal: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    {/* Mount ring */}
    <circle cx={80} cy={50} r={20} fill="none" stroke={theme.primary} strokeWidth={4} />
    <circle cx={80} cy={50} r={6} fill={theme.secondary} />
    {/* Engine bell tilted */}
    <g transform="rotate(15 80 50)">
      <rect x={66} y={50} width={28} height={14} fill={theme.primary} />
      <path d="M 64 64 L 38 140 L 122 140 L 96 64 Z" fill="#475569" stroke={theme.primary} strokeWidth={3} />
    </g>
    {/* Rotation arrows */}
    <path d="M 18 50 A 30 30 0 0 1 48 30" stroke={theme.secondary} strokeWidth={3} fill="none" />
    <polygon points="46,28 56,32 50,40" fill={theme.secondary} />
    <path d="M 142 50 A 30 30 0 0 0 112 30" stroke={theme.secondary} strokeWidth={3} fill="none" />
    <polygon points="114,28 104,32 110,40" fill={theme.secondary} />
  </C>
);

/** Turbopump — impeller wheel with curved blades. */
const Turbopump: React.FC<{ theme: Theme }> = ({ theme }) => (
  <C>
    {/* Casing */}
    <circle cx={80} cy={80} r={62} fill={theme.background} stroke={theme.primary} strokeWidth={4} />
    {/* Inlet pipe */}
    <rect x={40} y={20} width={14} height={40} fill={theme.secondary} />
    {/* Outlet pipe */}
    <rect x={106} y={100} width={40} height={14} fill={theme.secondary} />
    {/* Impeller — curved blades */}
    <circle cx={80} cy={80} r={14} fill={theme.secondary} />
    {Array.from({ length: 7 }).map((_, i) => {
      const a = (i / 7) * Math.PI * 2;
      const x1 = 80 + Math.cos(a) * 14;
      const y1 = 80 + Math.sin(a) * 14;
      const x2 = 80 + Math.cos(a + 0.4) * 44;
      const y2 = 80 + Math.sin(a + 0.4) * 44;
      const cx = 80 + Math.cos(a + 0.2) * 30;
      const cy = 80 + Math.sin(a + 0.2) * 30;
      return (
        <path key={i} d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`} stroke={theme.primary} strokeWidth={5} fill="none" strokeLinecap="round" />
      );
    })}
    {/* Hub */}
    <circle cx={80} cy={80} r={6} fill={theme.text} />
  </C>
);

const ICONS: Record<Key, React.FC<{ theme: Theme }>> = {
  sun: Sun,
  leaf: Leaf,
  water: WaterDrop,
  co2: CO2,
  oxygen: Oxygen,
  glucose: Glucose,
  root: Root,
  tree: Tree,
  cell: Cell,
  dna: DNA,
  atom: Atom,
  electron: Electron,
  battery: Battery,
  bulb: Bulb,
  cpu: CPU,
  memory: Memory,
  database: Database,
  cloud: Cloud,
  arrow: Arrow,
  heart: Heart,
  brain: Brain,
  fire: Fire,
  star: Star,
  earth: Earth,
  gear: Gear,
  molecule: Molecule,
  flask: Flask,
  book: Book,
  lightning: Lightning,
  thylakoid: Thylakoid,
  warrior: Warrior,
  crown: Crown,
  person: Person,
  fort: Fort,
  sword: SwordIcon,
  flag: FlagIcon,
  scroll: Scroll,
  calendar: Calendar,
  neural_net: NeuralNet,
  robot: Robot,
  chart: Chart,
  matrix: Matrix,
  dataset: Dataset,
  nucleus: Nucleus,
  radiation: Radiation,
  fission: Fission,
  fusion: Fusion,
  reactor: Reactor,
  sigma: Sigma,
  integral: Integral,
  pi: Pi,
  infinity: Infinity,
  triangle_icon: TriangleIcon,
  rocket: Rocket,
  nose_cone: NoseCone,
  fuel_tank: FuelTank,
  nozzle: Nozzle,
  engine: Engine,
  payload: Payload,
  fins: Fins,
  parachute: Parachute,
  launchpad: Launchpad,
  heat_shield: HeatShield,
  orbit: Orbit,
  satellite: Satellite,
  astronaut: Astronaut,
  thrust: Thrust,
  gimbal: Gimbal,
  turbopump: Turbopump,
};
