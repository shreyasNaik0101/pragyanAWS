import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { PhotosynthesisSegment, Script } from '../types';
import { HAND_BODY_FONT, HAND_TITLE_FONT } from '../fonts';
import {
  HandSketchProgressBar,
  PaperGrain,
  SKETCH_PAPER,
  SketchPenFilterDefs,
} from './sketchPrimitives';

const INK = '#1c1917';

/** Golpo / human-drawn look: organic paths, pen filter, handwriting fonts — no circles or squares. */
export const PhotosynthesisScene: React.FC<{
  segment: PhotosynthesisSegment;
  index: number;
  total: number;
  theme: Script['theme'];
}> = ({ segment, index, total, theme }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const hero = spring({ frame, fps, config: { damping: 14, stiffness: 78 } });
  const fid = `ps-pen-${index}`;

  const primary = theme.primary;
  const secondary = theme.secondary;

  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: SKETCH_PAPER }}>
      <PaperGrain />
      <SketchPenFilterDefs id={fid} hatch />

      <div
        style={{
          position: 'absolute',
          top: 24,
          left: 40,
          zIndex: 10,
          fontFamily: HAND_BODY_FONT,
          fontSize: 26,
          color: '#57534e',
          opacity: 0.85,
        }}
      >
        {index + 1} of {total}
      </div>

      <AbsoluteFill
        style={{
          padding: '84px 44px 64px',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {segment.phase === 'intro' ? (
          <IntroBeat
            frame={frame}
            fps={fps}
            durationInFrames={durationInFrames}
            hero={hero}
            fid={fid}
            primary={primary}
            secondary={secondary}
            text={segment.text}
          />
        ) : null}
        {segment.phase === 'sun_to_leaf' ? (
          <SunToLeafBeat frame={frame} fps={fps} durationInFrames={durationInFrames} fid={fid} primary={primary} secondary={secondary} text={segment.text} />
        ) : null}
        {segment.phase === 'chlorophyll' ? (
          <ChlorophyllBeat frame={frame} fps={fps} durationInFrames={durationInFrames} fid={fid} primary={primary} text={segment.text} />
        ) : null}
        {segment.phase === 'inputs' ? (
          <InputsBeat frame={frame} fps={fps} fid={fid} primary={primary} secondary={secondary} text={segment.text} />
        ) : null}
        {segment.phase === 'equation' ? (
          <EquationBeat frame={frame} durationInFrames={durationInFrames} fid={fid} primary={primary} text={segment.text} />
        ) : null}
        {segment.phase === 'outputs' ? (
          <OutputsBeat frame={frame} fps={fps} fid={fid} primary={primary} secondary={secondary} text={segment.text} />
        ) : null}
        {segment.phase === 'chloroplast' ? (
          <ChloroplastBeat frame={frame} durationInFrames={durationInFrames} fid={fid} primary={primary} text={segment.text} />
        ) : null}
      </AbsoluteFill>

      <HandSketchProgressBar
        frame={frame}
        durationInFrames={durationInFrames}
        primary={primary}
        secondary={secondary}
        barId={`ps-${index}`}
      />
    </AbsoluteFill>
  );
};

// --- Beats ------------------------------------------------------------------

const IntroBeat: React.FC<{
  frame: number;
  fps: number;
  durationInFrames: number;
  hero: number;
  fid: string;
  primary: string;
  secondary: string;
  text: string;
}> = ({ frame, fps, durationInFrames, hero, fid, primary, secondary, text }) => {
  const titleY = interpolate(spring({ frame, fps, config: { damping: 16 } }), [0, 1], [22, 0]);
  const leafDraw = interpolate(frame, [8, durationInFrames * 0.45], [1550, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const underlineDraw = interpolate(frame, [12, 28], [420, 0], { extrapolateRight: 'clamp' });

  const leafPath =
    'M 208 36 C 288 22 368 48 392 112 C 412 168 352 198 288 188 C 228 178 168 162 128 118 C 88 74 108 38 168 32 C 188 30 198 34 208 36 Z';

  return (
    <div style={{ width: '100%', maxWidth: 1080, textAlign: 'center', position: 'relative' }}>
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: primary,
          opacity: hero,
          transform: `translateY(${titleY}px)`,
          fontFamily: HAND_BODY_FONT,
        }}
      >
        Nature&apos;s recipe
      </div>
      <h1
        style={{
          margin: '8px 0 0',
          fontSize: 72,
          fontWeight: 700,
          color: INK,
          opacity: hero,
          transform: `rotate(${interpolate(hero, [0, 1], [-1.2, 0])}deg)`,
          fontFamily: HAND_TITLE_FONT,
          lineHeight: 1.05,
        }}
      >
        Photosynthesis
      </h1>
      <svg width={400} height={36} style={{ margin: '12px auto 0', display: 'block' }}>
        <path
          d="M 40 22 Q 120 14 200 22 T 360 20"
          fill="none"
          stroke={secondary}
          strokeWidth={2.8}
          strokeLinecap="round"
          strokeDasharray={420}
          strokeDashoffset={underlineDraw}
          filter={`url(#${fid})`}
        />
        <path
          d="M 44 28 Q 130 22 210 28 T 356 26"
          fill="none"
          stroke="#78716c"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeDasharray={420}
          strokeDashoffset={underlineDraw}
          opacity={0.65}
          filter={`url(#${fid})`}
        />
      </svg>
      <svg width={440} height={210} style={{ margin: '20px auto 0', display: 'block' }} filter={`url(#${fid})`}>
        <path
          d={leafPath}
          fill={`url(#${fid}-hatch)`}
          fillOpacity={0.55}
          stroke="#166534"
          strokeWidth={2.8}
          strokeLinejoin="round"
          strokeDasharray={1550}
          strokeDashoffset={leafDraw}
        />
        <path
          d="M 248 72 C 262 108 262 148 248 168 M 188 102 C 220 98 268 102 308 108 M 200 78 Q 248 92 296 82 M 200 152 Q 248 138 296 152"
          stroke="#14532d"
          strokeWidth={1.6}
          fill="none"
          strokeLinecap="round"
          opacity={interpolate(frame, [durationInFrames * 0.32, durationInFrames * 0.48], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })}
        />
      </svg>
      <p
        style={{
          marginTop: 6,
          fontSize: 32,
          lineHeight: 1.4,
          color: '#44403c',
          maxWidth: 920,
          marginLeft: 'auto',
          marginRight: 'auto',
          opacity: interpolate(frame, [18, 34], [0, 1], { extrapolateRight: 'clamp' }),
          fontFamily: HAND_BODY_FONT,
        }}
      >
        {text}
      </p>
    </div>
  );
};

const SunToLeafBeat: React.FC<{
  frame: number;
  fps: number;
  durationInFrames: number;
  fid: string;
  primary: string;
  secondary: string;
  text: string;
}> = ({ frame, fps, durationInFrames, fid, primary, secondary, text }) => {
  const pulse = 0.92 + 0.08 * Math.sin(frame / 8);
  const beam = interpolate(frame, [10, durationInFrames * 0.42], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });
  const leafBob = spring({ frame: frame - 4, fps, config: { damping: 12, stiffness: 90 } });
  const sunPath =
    'M 64 96 C 42 78 38 48 58 32 C 78 14 108 18 128 38 C 148 58 142 88 118 102 C 98 112 72 108 64 96 Z';

  return (
    <div style={{ display: 'flex', width: '100%', maxWidth: 1120, gap: 28, alignItems: 'center' }}>
      <div style={{ flex: 1.05 }}>
        <p
          style={{
            fontSize: 34,
            lineHeight: 1.45,
            color: INK,
            margin: 0,
            fontFamily: HAND_BODY_FONT,
            opacity: spring({ frame, fps, config: { damping: 18 } }),
          }}
        >
          {text}
        </p>
      </div>
      <svg width={420} height={360} style={{ flex: 0.95 }} filter={`url(#${fid})`}>
        <g transform={`translate(92, 72) scale(${pulse}) translate(-74, -56)`}>
          <path
            d={sunPath}
            fill="#fde047"
            fillOpacity={0.85}
            stroke="#ca8a04"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
        </g>
        <g stroke="#eab308" strokeWidth={2} strokeLinecap="round" opacity={0.9}>
          <path d="M 92 28 L 92 8 M 118 40 L 132 24 M 132 72 L 148 72 M 118 100 L 130 118 M 92 112 L 92 132 M 66 100 L 52 118 M 52 72 L 34 72 M 66 40 L 48 26" />
        </g>
        <path
          d="M 118 88 Q 180 120 248 168 Q 300 200 338 218"
          fill="none"
          stroke="#facc15"
          strokeWidth={11 + 5 * pulse}
          strokeLinecap="round"
          opacity={0.12 + 0.55 * beam}
          style={{ filter: 'blur(5px)' }}
        />
        <path
          d="M 118 88 Q 180 120 248 168 Q 300 200 338 218"
          fill="none"
          stroke="#f59e0b"
          strokeWidth={2.8}
          strokeLinecap="round"
          strokeDasharray={380}
          strokeDashoffset={interpolate(beam, [0, 1], [380, 0])}
        />
        <g
          transform={`translate(260, 175) rotate(${interpolate(leafBob, [0, 1], [-5, 0])}) translate(${interpolate(leafBob, [0, 1], [0, 8])}, ${interpolate(leafBob, [0, 1], [10, 0])})`}
        >
          <path
            d="M 12 24 C 52 8 108 18 128 68 C 142 108 108 142 58 138 C 18 134 -8 98 8 58 C 14 42 12 24 12 24 Z"
            fill="#4ade80"
            fillOpacity={0.2}
            stroke="#15803d"
            strokeWidth={2.6}
          />
          <path d="M 68 38 L 68 118 M 28 78 L 108 78" stroke="#166534" strokeWidth={1.6} strokeLinecap="round" />
        </g>
        <text x={8} y={348} fill={secondary} fontSize={22} fontFamily={HAND_BODY_FONT} opacity={interpolate(frame, [durationInFrames * 0.35, durationInFrames * 0.48], [0, 1], { extrapolateLeft: 'clamp' })}>
          Light → leaf
        </text>
      </svg>
    </div>
  );
};

const ChlorophyllBeat: React.FC<{
  frame: number;
  fps: number;
  durationInFrames: number;
  fid: string;
  primary: string;
  text: string;
}> = ({ frame, fps, durationInFrames, fid, primary, text }) => {
  const stack = spring({ frame: frame - 8, fps, config: { damping: 15 } });
  const stacks = [
    'M 48 58 Q 210 48 372 58 Q 378 62 374 88 Q 210 96 44 88 Q 40 68 48 58 Z',
    'M 52 118 Q 214 108 376 118 Q 382 124 378 150 Q 212 158 46 148 Q 44 128 52 118 Z',
    'M 46 178 Q 208 168 380 178 Q 386 186 382 212 Q 206 220 40 210 Q 38 188 46 178 Z',
    'M 50 238 Q 212 228 374 238 Q 380 246 376 272 Q 210 280 44 270 Q 42 248 50 238 Z',
  ];

  return (
    <div style={{ display: 'flex', width: '100%', maxWidth: 1100, gap: 32, alignItems: 'center' }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 34, lineHeight: 1.45, color: INK, margin: 0, fontFamily: HAND_BODY_FONT }}>{text}</p>
      </div>
      <svg width={420} height={320} style={{ flex: 0.88, transform: `scale(${0.94 + 0.06 * stack})` }} filter={`url(#${fid})`}>
        <path
          d="M 28 24 Q 210 8 392 28 Q 404 160 388 292 Q 210 308 32 288 Q 16 156 28 24 Z"
          fill="#fff"
          fillOpacity={0.72}
          stroke={primary}
          strokeWidth={2.4}
          strokeLinejoin="round"
        />
        {stacks.map((d, i) => {
          const s = spring({ frame: frame - 10 - i * 7, fps, config: { damping: 16 } });
          return (
            <path
              key={i}
              d={d}
              fill={`url(#${fid}-hatch)`}
              fillOpacity={0.35 + 0.15 * s}
              stroke={primary}
              strokeWidth={1.8}
              opacity={s}
              transform={`translateX(${interpolate(s, [0, 1], [18, 0])})`}
            />
          );
        })}
        <text x={210} y={308} textAnchor="middle" fill={primary} fontSize={22} fontFamily={HAND_BODY_FONT}>
          Thylakoid stacks · light capture
        </text>
      </svg>
    </div>
  );
};

const InputsBeat: React.FC<{
  frame: number;
  fps: number;
  fid: string;
  primary: string;
  secondary: string;
  text: string;
}> = ({ frame, fps, fid, primary, secondary, text }) => {
  const wiggle = (frame * 2.5) % 24;

  return (
    <div style={{ width: '100%', maxWidth: 1140 }}>
      <p
        style={{
          fontSize: 32,
          lineHeight: 1.4,
          color: INK,
          fontWeight: 400,
          marginBottom: 20,
          textAlign: 'center',
          fontFamily: HAND_BODY_FONT,
        }}
      >
        {text}
      </p>
      <svg width="100%" height={200} viewBox="0 0 1100 200" preserveAspectRatio="xMidYMid meet" filter={`url(#${fid})`}>
        <SketchBubble x={40} y={30} w={200} h={120} delay={4} frame={frame} fps={fps} title="H₂O" sub="From roots" color="#0ea5e9" />
        <path
          d={`M 260 95 Q 330 ${88 + (wiggle % 8)} 400 92 T 520 96`}
          fill="none"
          stroke={primary}
          strokeWidth={2.5}
          strokeDasharray="10 12"
          strokeDashoffset={-frame * 2}
          strokeLinecap="round"
        />
        <SketchBubble x={540} y={28} w={200} h={124} delay={12} frame={frame} fps={fps} title="Leaf" sub="Chloroplasts" color="#16a34a" strong />
        <path
          d={`M 760 98 Q 830 ${92 - (wiggle % 6)} 900 96 T 1020 94`}
          fill="none"
          stroke={secondary}
          strokeWidth={2.5}
          strokeDasharray="10 12"
          strokeDashoffset={frame * 2}
          strokeLinecap="round"
        />
        <SketchBubble x={860} y={34} w={200} h={118} delay={20} frame={frame} fps={fps} title="CO₂" sub="Stomata" color="#57534e" />
      </svg>
    </div>
  );
};

const SketchBubble: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub: string;
  color: string;
  delay: number;
  frame: number;
  fps: number;
  strong?: boolean;
}> = ({ x, y, w, h, title, sub, color, delay, frame, fps, strong }) => {
  const s = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 90 } });
  const d = `M ${x + 8} ${y + 12} Q ${x + w * 0.45} ${y - 4} ${x + w - 6} ${y + 10} Q ${x + w + 4} ${y + h * 0.5} ${x + w - 10} ${y + h - 8} Q ${x + w * 0.55} ${y + h + 6} ${x + 6} ${y + h - 12} Q ${x - 4} ${y + h * 0.4} ${x + 8} ${y + 12} Z`;
  return (
    <g opacity={s} transform={`translate(0, ${interpolate(s, [0, 1], [14, 0])})`}>
      <path
        d={d}
        fill={strong ? color : '#fff'}
        fillOpacity={strong ? 0.14 : 0.94}
        stroke={color}
        strokeWidth={strong ? 2.6 : 2}
        strokeLinejoin="round"
      />
      <text x={x + w / 2} y={y + h * 0.45} textAnchor="middle" fill={color} fontSize={36} fontWeight={700} fontFamily={HAND_TITLE_FONT}>
        {title}
      </text>
      <text x={x + w / 2} y={y + h * 0.72} textAnchor="middle" fill="#57534e" fontSize={22} fontFamily={HAND_BODY_FONT}>
        {sub}
      </text>
    </g>
  );
};

const EquationBeat: React.FC<{
  frame: number;
  durationInFrames: number;
  fid: string;
  primary: string;
  text: string;
}> = ({ frame, durationInFrames, fid, primary, text }) => {
  const pen = INK;
  const STROKE = 950;
  const boxes = [
    { d: 'M 38 116 L 108 108 L 114 174 L 32 180 Z', fill: 'url(#eq-h1)', label: '6 CO₂', lx: 73, ly: 148, delay: 0.05 },
    { d: 'M 128 112 L 198 106 L 204 172 L 122 178 Z', fill: 'url(#eq-h2)', label: '6 H₂O', lx: 163, ly: 144, delay: 0.12 },
    { d: 'M 248 108 L 358 102 L 366 176 L 242 182 Z', fill: 'url(#eq-h3)', label: 'C₆H₁₂O₆', lx: 304, ly: 146, delay: 0.28 },
    { d: 'M 378 114 L 432 108 L 438 168 L 372 174 Z', fill: 'url(#eq-h4)', label: '6 O₂', lx: 405, ly: 144, delay: 0.38 },
  ];

  return (
    <div style={{ width: '100%', textAlign: 'center' }}>
      <p style={{ fontSize: 30, color: INK, margin: '0 0 14px', maxWidth: 980, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.35, fontFamily: HAND_BODY_FONT }}>
        {text}
      </p>
      <svg width={480} height={230} viewBox="0 0 480 230" style={{ maxWidth: '100%' }} filter={`url(#${fid})`}>
        <defs>
          <pattern id="eq-h1" patternUnits="userSpaceOnUse" width={6} height={6}>
            <path d="M 0 6 L 6 0" stroke="#0ea5e9" strokeWidth={0.5} opacity={0.5} />
          </pattern>
          <pattern id="eq-h2" patternUnits="userSpaceOnUse" width={6} height={6}>
            <path d="M 0 6 L 6 0" stroke="#0284c7" strokeWidth={0.5} opacity={0.45} />
          </pattern>
          <pattern id="eq-h3" patternUnits="userSpaceOnUse" width={6} height={6}>
            <path d="M 0 6 L 6 0" stroke="#16a34a" strokeWidth={0.5} opacity={0.5} />
          </pattern>
          <pattern id="eq-h4" patternUnits="userSpaceOnUse" width={6} height={6}>
            <path d="M 0 6 L 6 0" stroke="#d97706" strokeWidth={0.5} opacity={0.5} />
          </pattern>
        </defs>
        {boxes.map((b, i) => {
          const start = b.delay * durationInFrames;
          const dur = durationInFrames * 0.22;
          const off = interpolate(frame, [start, start + dur], [STROKE, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.cubic),
          });
          const fo = interpolate(frame, [start + dur * 0.72, start + dur], [0, 0.85], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <g key={i}>
              <path
                d={b.d}
                stroke={pen}
                strokeWidth={2.4}
                fill={b.fill}
                fillOpacity={fo}
                strokeDasharray={STROKE}
                strokeDashoffset={off}
                strokeLinejoin="round"
              />
              <text
                x={b.lx}
                y={b.ly}
                textAnchor="middle"
                fill={pen}
                fontSize={20}
                fontFamily={HAND_BODY_FONT}
                opacity={interpolate(frame, [start + dur, start + dur + 10], [0, 1], { extrapolateLeft: 'clamp' })}
              >
                {b.label}
              </text>
            </g>
          );
        })}
        <text
          x={228}
          y={148}
          fill={pen}
          fontSize={36}
          fontFamily={HAND_TITLE_FONT}
          opacity={interpolate(frame, [durationInFrames * 0.18, durationInFrames * 0.28], [0, 1], { extrapolateLeft: 'clamp' })}
        >
          →
        </text>
        <path d="M 64 202 Q 240 196 416 204" fill="none" stroke={primary} strokeWidth={1.8} strokeLinecap="round" opacity={0.45} />
        <text x={240} y={224} textAnchor="middle" fill="#57534e" fontSize={20} fontFamily={HAND_BODY_FONT}>
          balanced · atoms conserved
        </text>
      </svg>
    </div>
  );
};

const OutputsBeat: React.FC<{
  frame: number;
  fps: number;
  fid: string;
  primary: string;
  secondary: string;
  text: string;
}> = ({ frame, fps, fid, primary, secondary, text }) => {
  const a = spring({ frame: frame - 6, fps, config: { damping: 14 } });
  const b = spring({ frame: frame - 18, fps, config: { damping: 14 } });

  return (
    <div style={{ textAlign: 'center', maxWidth: 1000 }}>
      <p style={{ fontSize: 34, lineHeight: 1.45, color: INK, marginBottom: 24, fontFamily: HAND_BODY_FONT }}>{text}</p>
      <svg width={920} height={220} viewBox="0 0 920 220" style={{ maxWidth: '100%', margin: '0 auto' }} filter={`url(#${fid})`}>
        <g opacity={a} transform={`translate(${interpolate(a, [0, 1], [0, 0])}, ${interpolate(a, [0, 1], [16, 0])})`}>
          <path
            d="M 48 40 Q 120 24 220 36 Q 248 100 228 168 Q 120 188 40 160 Q 20 100 48 40 Z"
            fill="#dcfce7"
            fillOpacity={0.55}
            stroke="#15803d"
            strokeWidth={2.6}
          />
          <text x={140} y={88} textAnchor="middle" fill={primary} fontSize={22} fontFamily={HAND_BODY_FONT}>
            fuel
          </text>
          <text x={140} y={128} textAnchor="middle" fill="#166534" fontSize={40} fontFamily={HAND_TITLE_FONT}>
            Glucose
          </text>
          <text x={140} y={162} textAnchor="middle" fill="#57534e" fontSize={22} fontFamily={HAND_BODY_FONT}>
            plant + food webs
          </text>
        </g>
        <g opacity={b} transform={`translate(${interpolate(b, [0, 1], [0, 0])}, ${interpolate(b, [0, 1], [16, 0])})`}>
          <path
            d="M 520 44 Q 620 28 720 40 Q 760 110 732 172 Q 620 188 508 168 Q 488 98 520 44 Z"
            fill="#ffedd5"
            fillOpacity={0.6}
            stroke="#c2410c"
            strokeWidth={2.5}
          />
          <text x={620} y={92} textAnchor="middle" fill={secondary} fontSize={22} fontFamily={HAND_BODY_FONT}>
            release
          </text>
          <text x={620} y={132} textAnchor="middle" fill="#9a3412" fontSize={40} fontFamily={HAND_TITLE_FONT}>
            Oxygen
          </text>
          <text x={620} y={166} textAnchor="middle" fill="#57534e" fontSize={22} fontFamily={HAND_BODY_FONT}>
            air we breathe
          </text>
        </g>
      </svg>
    </div>
  );
};

const ChloroplastBeat: React.FC<{
  frame: number;
  durationInFrames: number;
  fid: string;
  primary: string;
  text: string;
}> = ({ frame, durationInFrames, fid, primary, text }) => {
  const zoom = interpolate(frame, [0, durationInFrames], [0.94, 1.02], { extrapolateRight: 'clamp' });
  const breathe = 0.35 + 0.25 * Math.sin(frame / 11);

  const outer =
    'M 96 32 C 188 8 268 32 296 96 C 318 148 288 208 220 228 C 152 248 72 220 48 156 C 28 96 48 48 96 32 Z';
  const inner =
    'M 128 72 C 188 56 248 72 268 116 C 282 152 258 188 210 200 C 162 212 112 196 96 156 C 84 120 96 88 128 72 Z';

  return (
    <div style={{ display: 'flex', width: '100%', maxWidth: 1080, gap: 28, alignItems: 'center' }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 32, lineHeight: 1.45, color: INK, margin: 0, fontFamily: HAND_BODY_FONT }}>{text}</p>
      </div>
      <svg width={340} height={340} style={{ flex: 0.85 }} filter={`url(#${fid})`}>
        <g transform={`translate(170, 170) scale(${zoom}) translate(-170, -170)`}>
          <path
            d={outer}
            fill={`url(#${fid}-hatch)`}
            fillOpacity={0.35 + breathe}
            stroke={primary}
            strokeWidth={3}
            strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 8px 20px rgba(22,101,52,${0.15 + breathe}))` }}
          />
          <path d={inner} fill="#022c22" fillOpacity={0.55} stroke="#a7f3d0" strokeWidth={2} strokeLinejoin="round" />
          <text x={170} y={155} textAnchor="middle" fill="#ecfdf5" fontSize={28} fontFamily={HAND_TITLE_FONT}>
            chloroplast
          </text>
          <text x={170} y={188} textAnchor="middle" fill="#a7f3d0" fontSize={20} fontFamily={HAND_BODY_FONT}>
            light → bond energy
          </text>
        </g>
      </svg>
    </div>
  );
};
