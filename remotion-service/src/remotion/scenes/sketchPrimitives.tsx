import React from 'react';

/** Off-white paper background for hand-drawn / Golpo scenes. */
export const SKETCH_PAPER = '#fdfcf9';

/** Light ruled texture — no dot grids. */
export const PaperGrain: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      opacity: 0.45,
      backgroundImage: `repeating-linear-gradient(
        0deg,
        transparent 0px,
        transparent 4px,
        rgba(0,0,0,0.018) 4px,
        rgba(0,0,0,0.018) 5px
      )`,
      pointerEvents: 'none',
    }}
  />
);

/**
 * Pen jitter filter (hand-drawn line look). Optional cross-hatch pattern for fills.
 * Reference as `url(#id)` on SVG elements; hatch at `url(#id-hatch)`.
 */
export const SketchPenFilterDefs: React.FC<{ id: string; hatch?: boolean }> = ({ id, hatch }) => (
  <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
    <defs>
      <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="1.15" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      {hatch ? (
        <pattern id={`${id}-hatch`} patternUnits="userSpaceOnUse" width={8} height={8}>
          <path d="M 0 8 L 8 0 M -2 2 L 2 -2 M 6 10 L 10 6" stroke="#15803d" strokeWidth={0.35} opacity={0.35} />
        </pattern>
      ) : null}
    </defs>
  </svg>
);

/** Wavy baseline progress (stroke-dash), not a rectangular bar. */
export const HandSketchProgressBar: React.FC<{
  frame: number;
  durationInFrames: number;
  primary: string;
  secondary: string;
  /** Unique suffix for SVG gradient id (e.g. concept-0, wb-1). */
  barId: string;
}> = ({ frame, durationInFrames, primary, secondary, barId }) => {
  const len = 1180;
  const drawn = (frame / Math.max(1, durationInFrames)) * len;
  const gid = `sk-bar-${barId}`;
  return (
    <svg
      width="100%"
      height={28}
      viewBox="0 0 1240 28"
      preserveAspectRatio="none"
      style={{ position: 'absolute', bottom: 14, left: 0, right: 0 }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={primary} />
          <stop offset="1" stopColor={secondary} />
        </linearGradient>
      </defs>
      <path
        d="M 24 14 Q 310 10 620 15 T 1216 13"
        fill="none"
        stroke="#d6d3d1"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <path
        d="M 24 14 Q 310 10 620 15 T 1216 13"
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={len}
        strokeDashoffset={len - drawn}
      />
    </svg>
  );
};

/** Double wavy underline drawn with a pen filter. */
export const WavySketchAccent: React.FC<{
  filterId: string;
  primary: string;
  muted: string;
  progress: number;
  width?: number;
}> = ({ filterId, primary, muted, progress, width = 380 }) => {
  const dash = 420;
  const off = interpolateLineProgress(progress, dash);
  return (
    <svg width={width} height={36} style={{ display: 'block', margin: '0 auto' }}>
      <path
        d="M 8 20 Q 120 12 200 20 T 360 18"
        fill="none"
        stroke={primary}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeDasharray={dash}
        strokeDashoffset={off}
        filter={`url(#${filterId})`}
      />
      <path
        d="M 10 26 Q 125 20 205 26 T 358 24"
        fill="none"
        stroke={muted}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeDasharray={dash}
        strokeDashoffset={off}
        opacity={0.65}
        filter={`url(#${filterId})`}
      />
    </svg>
  );
};

function interpolateLineProgress(t: number, dash: number): number {
  const p = Math.max(0, Math.min(1, t));
  return dash * (1 - p);
}
