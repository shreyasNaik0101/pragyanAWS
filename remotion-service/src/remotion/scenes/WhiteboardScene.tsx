import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { Script } from '../types';
import { HAND_BODY_FONT } from '../fonts';
import {
  HandSketchProgressBar,
  PaperGrain,
  SKETCH_PAPER,
  SketchPenFilterDefs,
  WavySketchAccent,
} from './sketchPrimitives';

/**
 * WhiteboardScene — Story-first explainer layout.
 *
 * Clean paper background, progressive text, and supporting visuals as
 * diagrams (flow boxes, arrows, structured shapes) — not generic hub-and-spoke circles.
 */
export const WhiteboardScene: React.FC<{
  segment: {
    text: string;
    visual_cue?: string;
    duration: number;
    kind?: string;
  };
  index: number;
  total: number;
  theme: Script['theme'];
}> = ({ segment, index, total, theme }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const appear = spring({ frame, fps, config: { damping: 18 } });

  // Break text into lines for progressive reveal
  const words = segment.text.split(' ');
  const wordsPerLine = 8;
  const lines: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerLine) {
    lines.push(words.slice(i, i + wordsPerLine).join(' '));
  }

  // Auto-generate whiteboard drawings based on the visual cue
  const drawings = getWhiteboardDrawings(segment.visual_cue || segment.text);
  const showPhotoGlow = /photo|chloro|chloroplast|glucose|stomata/i.test(
    `${segment.visual_cue || ''} ${segment.text || ''}`,
  );

  const STROKE_LEN = 1500;
  const penId = `wb-pen-${index}`;

  // Colors for the whiteboard
  const penColor = '#1a1a2e';
  const accentColor = '#e74c3c';
  const highlightColor = '#3498db';

  const underlineProgress = interpolate(
    frame,
    [durationInFrames * 0.45, durationInFrames * 0.72],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: SKETCH_PAPER }}>
      <PaperGrain />
      <SketchPenFilterDefs id={penId} hatch={showPhotoGlow} />

      <svg
        style={{
          position: 'absolute',
          left: 54,
          top: 48,
          bottom: 88,
          width: 14,
          pointerEvents: 'none',
        }}
        viewBox="0 0 14 640"
        preserveAspectRatio="none"
      >
        <path
          d="M 9 0 Q 6 160 10 320 Q 5 480 8 640"
          fill="none"
          stroke="rgba(200, 80, 80, 0.28)"
          strokeWidth={2.2}
          strokeLinecap="round"
          filter={`url(#${penId})`}
        />
      </svg>

      {/* Top header area */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 80,
          right: 40,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            opacity: appear,
          }}
        >
          <svg width={36} height={28} filter={`url(#${penId})`}>
            <path
              d="M 4 14 Q 18 8 32 14"
              fill="none"
              stroke={accentColor}
              strokeWidth={2.2}
              strokeLinecap="round"
            />
          </svg>
          <span
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: '#57534e',
              fontFamily: HAND_BODY_FONT,
            }}
          >
            {index + 1} / {total}
          </span>
        </div>
      </div>

      {/* Main content area — split left (text) and right (drawing) */}
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: 80,
          right: 40,
          bottom: 100,
          display: 'flex',
          gap: 40,
        }}
      >
        {/* Left: "Handwritten" text that writes itself */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {lines.map((line, i) => {
            const lineStart = (i / lines.length) * durationInFrames * 0.6;
            const lineOpacity = interpolate(frame, [lineStart, lineStart + 18], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const lineSlide = interpolate(frame, [lineStart, lineStart + 22], [15, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });

            return (
              <div
                key={i}
                style={{
                  fontSize: lines.length > 3 ? 28 : 34,
                  fontWeight: 500,
                  color: penColor,
                  lineHeight: 1.6,
                  opacity: lineOpacity,
                  transform: `translateY(${lineSlide}px)`,
                  fontFamily: HAND_BODY_FONT,
                  letterSpacing: 0.1,
                }}
              >
                {line}
              </div>
            );
          })}

          <div style={{ marginTop: 10, maxWidth: 400 }}>
            <WavySketchAccent
              filterId={penId}
              primary={accentColor}
              muted={highlightColor}
              progress={underlineProgress}
              width={400}
            />
          </div>
        </div>

        {/* Right: Whiteboard drawing area */}
        <div
          style={{
            flex: 0.9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width={480}
            height={400}
            viewBox="0 0 480 400"
            style={{
              filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.05))',
            }}
          >
            {showPhotoGlow ? (
              <path
                d="M 198 108 C 268 82 348 92 388 138 C 418 178 402 228 352 252 C 292 282 228 268 198 218 C 172 178 168 132 198 108 Z"
                fill={`url(#${penId}-hatch)`}
                fillOpacity={0.45 + 0.25 * Math.sin(frame / 8.5)}
                style={{ mixBlendMode: 'multiply', pointerEvents: 'none' }}
              />
            ) : null}

            {drawings.map((d, i) => {
              const drawStart = (d.delay ?? i * 0.15) * durationInFrames;
              const drawDur = durationInFrames * 0.26;

              const offset = interpolate(
                frame,
                [drawStart, drawStart + drawDur],
                [STROKE_LEN, 0],
                {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                  easing: Easing.out(Easing.cubic),
                },
              );

              const fillOp = interpolate(
                frame,
                [drawStart + drawDur * 0.8, drawStart + drawDur],
                [0, d.fillOpacity ?? 0.08],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
              );

              return (
                <path
                  key={i}
                  d={d.d}
                  stroke={d.color || penColor}
                  strokeWidth={d.width || 2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill={d.fill || 'transparent'}
                  fillOpacity={fillOp}
                  strokeDasharray={STROKE_LEN}
                  strokeDashoffset={offset}
                  filter={`url(#${penId})`}
                />
              );
            })}

            {/* Animated labels */}
            {drawings
              .filter((d) => d.label)
              .map((d, i) => {
                const labelStart = (d.delay ?? 0.3) * durationInFrames + durationInFrames * 0.2;
                const labelOp = interpolate(frame, [labelStart, labelStart + 12], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                });
                return (
                  <text
                    key={`label-${i}`}
                    x={d.labelX ?? 240}
                    y={d.labelY ?? 380}
                    fill={penColor}
                    fontSize={20}
                    fontWeight={600}
                    textAnchor="middle"
                    opacity={labelOp}
                    style={{ fontFamily: HAND_BODY_FONT }}
                  >
                    {d.label}
                  </text>
                );
              })}
          </svg>
        </div>
      </div>

      <HandSketchProgressBar
        frame={frame}
        durationInFrames={durationInFrames}
        primary={accentColor}
        secondary={highlightColor}
        barId={`wb-${index}`}
      />
    </AbsoluteFill>
  );
};

// --- Drawing definitions by keyword matching ---

interface Drawing {
  d: string;
  color?: string;
  width?: number;
  fill?: string;
  fillOpacity?: number;
  delay?: number;
  label?: string;
  labelX?: number;
  labelY?: number;
}

function getPhotosynthesisEquationDrawings(): Drawing[] {
  const pen = '#1a1a2e';
  return [
    {
      d: 'M 36 148 L 124 148 L 124 212 L 36 212 Z',
      color: '#0ea5e9',
      width: 2.5,
      fill: '#0ea5e9',
      fillOpacity: 0.09,
      delay: 0.04,
      label: '6 CO₂',
      labelX: 80,
      labelY: 186,
    },
    {
      d: 'M 138 148 L 226 148 L 226 212 L 138 212 Z',
      color: '#38bdf8',
      width: 2.5,
      fill: '#38bdf8',
      fillOpacity: 0.09,
      delay: 0.11,
      label: '6 H₂O',
      labelX: 182,
      labelY: 186,
    },
    { d: 'M 238 176 L 268 176', color: pen, width: 2.5, delay: 0.2 },
    { d: 'M 262 166 L 278 176 L 262 186', color: pen, width: 2.5, delay: 0.22 },
    {
      d: 'M 288 148 L 402 148 L 402 212 L 288 212 Z',
      color: '#16a34a',
      width: 2.5,
      fill: '#22c55e',
      fillOpacity: 0.1,
      delay: 0.28,
      label: 'C₆H₁₂O₆',
      labelX: 345,
      labelY: 186,
    },
    {
      d: 'M 412 148 L 468 148 L 468 212 L 412 212 Z',
      color: '#f59e0b',
      width: 2.5,
      fill: '#fcd34d',
      fillOpacity: 0.11,
      delay: 0.36,
      label: '6 O₂',
      labelX: 440,
      labelY: 186,
    },
    {
      d: 'M 70 228 L 190 228',
      color: '#94a3b8',
      width: 1.5,
      delay: 0.46,
      label: 'Reactants',
      labelX: 130,
      labelY: 248,
    },
    {
      d: 'M 300 228 L 430 228',
      color: '#94a3b8',
      width: 1.5,
      delay: 0.48,
      label: 'Products',
      labelX: 365,
      labelY: 248,
    },
    {
      d: 'M 120 288 L 360 288',
      color: '#0f766e',
      width: 2,
      delay: 0.54,
      label: '6CO₂ + 6H₂O  →  C₆H₁₂O₆ + 6O₂',
      labelX: 240,
      labelY: 318,
    },
  ];
}

function getWhiteboardDrawings(cue: string): Drawing[] {
  const lower = cue.toLowerCase();

  // Photosynthesis balanced equation (must run before generic "photo" biology)
  if (
    /c6h12o6|6\s*co2|6\s*h2o|6\s*co₂|6\s*h₂o|photosynthesis equation|balanced equation|glucose.*6\s*o2|glucose.*oxygen/i.test(
      lower,
    )
  ) {
    return getPhotosynthesisEquationDrawings();
  }

  // Math / equations
  if (/theorem|equation|formula|math|pythag|triangle|calculus/.test(lower)) {
    return [
      // Right triangle
      { d: 'M 80 320 L 380 320 L 380 80 Z', color: '#1a1a2e', width: 3, fill: '#3498db', fillOpacity: 0.06, delay: 0.05, label: 'a² + b² = c²', labelX: 240, labelY: 370 },
      // Right angle marker
      { d: 'M 350 320 L 350 290 L 380 290', color: '#e74c3c', width: 2, delay: 0.25 },
      // Side labels
      { d: 'M 230 330 L 230 345', color: '#666', width: 1.5, delay: 0.35, label: 'a', labelX: 230, labelY: 360 },
      { d: 'M 390 200 L 405 200', color: '#666', width: 1.5, delay: 0.4, label: 'b', labelX: 420, labelY: 205 },
      // Hypotenuse
      { d: 'M 200 170 L 215 185', color: '#e74c3c', width: 1.5, delay: 0.45, label: 'c', labelX: 200, labelY: 165 },
      // Decorative arcs
      { d: 'M 120 320 A 40 40 0 0 1 100 290', color: '#3498db', width: 2, delay: 0.6 },
    ];
  }

  // Biology / photosynthesis / cells
  if (/photo|plant|cell|bio|leaf|dna|mitosis|ecosystem/.test(lower)) {
    return [
      // Light source — wide panel, not a cartoon sun circle
      {
        d: 'M 45 62 L 115 62 Q 120 62 120 67 L 120 93 Q 120 98 115 98 L 45 98 Q 40 98 40 93 L 40 67 Q 40 62 45 62 Z',
        color: '#f39c12',
        width: 2.5,
        fill: '#f39c12',
        fillOpacity: 0.14,
        delay: 0.0,
        label: 'Light',
        labelX: 80,
        labelY: 118,
      },
      // Sun rays
      { d: 'M 80 40 L 80 28 M 105 52 L 118 40 M 115 80 L 130 80 M 105 108 L 118 120 M 80 120 L 80 132 M 55 108 L 42 120 M 45 80 L 30 80 M 55 52 L 42 40', color: '#f39c12', width: 2, delay: 0.1 },
      // Arrow from light panel
      { d: 'M 125 80 L 200 180', color: '#f39c12', width: 2, delay: 0.2, label: 'Energy', labelX: 175, labelY: 150 },
      // Leaf shape
      { d: 'M 240 160 Q 320 100 400 160 Q 320 220 240 160', color: '#27ae60', width: 3, fill: '#27ae60', fillOpacity: 0.1, delay: 0.25, label: 'Leaf (Chloroplast)', labelX: 320, labelY: 240 },
      // Leaf vein
      { d: 'M 260 160 L 380 160 M 300 140 L 320 160 M 300 180 L 320 160 M 340 140 L 360 160 M 340 180 L 360 160', color: '#2ecc71', width: 1.5, delay: 0.35 },
      // Arrow down (CO2)
      { d: 'M 320 260 L 320 300 L 310 290 M 320 300 L 330 290', color: '#3498db', width: 2, delay: 0.45, label: 'CO₂ + H₂O', labelX: 320, labelY: 325 },
      // Output arrow
      { d: 'M 320 340 L 320 370 L 310 360 M 320 370 L 330 360', color: '#e74c3c', width: 2, delay: 0.55, label: 'Glucose + O₂', labelX: 320, labelY: 395 },
    ];
  }

  // Physics / forces / motion
  if (/newton|force|motion|gravity|velocity|physics|momentum|friction/.test(lower)) {
    return [
      // Block on surface
      { d: 'M 140 220 L 280 220 L 280 280 L 140 280 Z', color: '#1a1a2e', width: 3, fill: '#3498db', fillOpacity: 0.08, delay: 0.0, label: 'm', labelX: 210, labelY: 260 },
      // Ground
      { d: 'M 40 280 L 440 280', color: '#1a1a2e', width: 2, delay: 0.05 },
      // Hatching below
      { d: 'M 60 280 L 50 295 M 100 280 L 90 295 M 140 280 L 130 295 M 180 280 L 170 295 M 220 280 L 210 295 M 260 280 L 250 295 M 300 280 L 290 295 M 340 280 L 330 295 M 380 280 L 370 295 M 420 280 L 410 295', color: '#999', width: 1, delay: 0.08 },
      // Force arrow right (F)
      { d: 'M 280 250 L 400 250 L 385 240 M 400 250 L 385 260', color: '#e74c3c', width: 3, delay: 0.2, label: 'F = ma', labelX: 380, labelY: 235 },
      // Weight arrow down
      { d: 'M 210 280 L 210 360 L 200 345 M 210 360 L 220 345', color: '#27ae60', width: 2.5, delay: 0.35, label: 'W = mg', labelX: 240, labelY: 355 },
      // Normal force up
      { d: 'M 210 220 L 210 140 L 200 155 M 210 140 L 220 155', color: '#3498db', width: 2.5, delay: 0.45, label: 'N', labelX: 230, labelY: 155 },
    ];
  }

  // Computer science / code / algorithms
  if (/algorithm|code|program|binary|search|sort|data struct|linked|tree|graph|stack|queue/.test(lower)) {
    return [
      // Array boxes
      { d: 'M 40 180 L 40 240 L 100 240 L 100 180 Z', color: '#1a1a2e', width: 2, fill: '#3498db', fillOpacity: 0.06, delay: 0.0 },
      { d: 'M 100 180 L 100 240 L 160 240 L 160 180 Z', color: '#1a1a2e', width: 2, fill: '#e74c3c', fillOpacity: 0.06, delay: 0.05 },
      { d: 'M 160 180 L 160 240 L 220 240 L 220 180 Z', color: '#1a1a2e', width: 2, fill: '#f39c12', fillOpacity: 0.06, delay: 0.1 },
      { d: 'M 220 180 L 220 240 L 280 240 L 280 180 Z', color: '#1a1a2e', width: 2, fill: '#27ae60', fillOpacity: 0.06, delay: 0.15 },
      { d: 'M 280 180 L 280 240 L 340 240 L 340 180 Z', color: '#1a1a2e', width: 2, fill: '#9b59b6', fillOpacity: 0.06, delay: 0.2 },
      // Arrow pointer
      { d: 'M 190 160 L 190 175 L 185 170 M 190 175 L 195 170', color: '#e74c3c', width: 2, delay: 0.35, label: 'i', labelX: 190, labelY: 150 },
      // Label
      { d: 'M 40 260 L 340 260', color: 'transparent', width: 0, delay: 0.4, label: 'Array[0...n]', labelX: 190, labelY: 275 },
      // Complexity badge — rounded rectangle, not a hollow circle
      {
        d: 'M 330 88 L 430 88 Q 438 88 438 96 L 438 144 Q 438 152 430 152 L 330 152 Q 322 152 322 144 L 322 96 Q 322 88 330 88 Z',
        color: '#e74c3c',
        width: 2.5,
        fill: '#e74c3c',
        fillOpacity: 0.07,
        delay: 0.5,
        label: 'O(log n)',
        labelX: 380,
        labelY: 128,
      },
    ];
  }

  // Chemistry
  if (/chemical|molecule|atom|bond|ionic|covalent|periodic|reaction|acid|base/.test(lower)) {
    return [
      // Atom 1
      { d: 'M 140 200 m -40 0 a 40 40 0 1 1 80 0 a 40 40 0 1 1 -80 0', color: '#3498db', width: 3, fill: '#3498db', fillOpacity: 0.08, delay: 0.0, label: 'Na', labelX: 140, labelY: 205 },
      // Atom 2
      { d: 'M 340 200 m -40 0 a 40 40 0 1 1 80 0 a 40 40 0 1 1 -80 0', color: '#e74c3c', width: 3, fill: '#e74c3c', fillOpacity: 0.08, delay: 0.1, label: 'Cl', labelX: 340, labelY: 205 },
      // Bond line
      { d: 'M 180 200 L 300 200', color: '#1a1a2e', width: 3, delay: 0.25, label: 'Ionic Bond', labelX: 240, labelY: 185 },
      // Electron transfer arrow
      { d: 'M 160 150 Q 240 100 320 150', color: '#f39c12', width: 2, delay: 0.4, label: 'e⁻ transfer', labelX: 240, labelY: 105 },
      // Plus/minus signs
      { d: 'M 130 260 L 150 260 M 140 250 L 140 270', color: '#3498db', width: 2, delay: 0.5, label: 'Na⁺', labelX: 140, labelY: 290 },
      { d: 'M 330 260 L 350 260', color: '#e74c3c', width: 2, delay: 0.55, label: 'Cl⁻', labelX: 340, labelY: 290 },
    ];
  }

  // Default: narrative flow — stacked story beats (rectangles + connectors)
  return [
    {
      d: 'M 90 72 L 390 72 Q 398 72 398 80 L 398 128 Q 398 136 390 136 L 90 136 Q 82 136 82 128 L 82 80 Q 82 72 90 72 Z',
      color: '#1a1a2e',
      width: 2.5,
      fill: '#3498db',
      fillOpacity: 0.07,
      delay: 0.05,
      label: 'Main idea',
      labelX: 240,
      labelY: 112,
    },
    { d: 'M 240 136 L 240 168', color: '#95a5a6', width: 2, delay: 0.18 },
    {
      d: 'M 70 168 L 190 168 L 190 238 L 70 238 Z',
      color: '#e74c3c',
      width: 2,
      fill: '#e74c3c',
      fillOpacity: 0.06,
      delay: 0.22,
      label: 'Why it matters',
      labelX: 130,
      labelY: 208,
    },
    {
      d: 'M 290 168 L 410 168 L 410 238 L 290 238 Z',
      color: '#27ae60',
      width: 2,
      fill: '#27ae60',
      fillOpacity: 0.06,
      delay: 0.3,
      label: 'Key detail',
      labelX: 350,
      labelY: 208,
    },
    { d: 'M 130 238 L 240 268 M 350 238 L 240 268', color: '#bdc3c7', width: 1.5, delay: 0.4 },
    { d: 'M 240 268 L 240 292', color: '#95a5a6', width: 2, delay: 0.44 },
    {
      d: 'M 100 292 L 380 292 L 380 352 L 100 352 Z',
      color: '#f39c12',
      width: 2,
      fill: '#f39c12',
      fillOpacity: 0.06,
      delay: 0.48,
      label: 'Takeaway',
      labelX: 240,
      labelY: 328,
    },
  ];
}
