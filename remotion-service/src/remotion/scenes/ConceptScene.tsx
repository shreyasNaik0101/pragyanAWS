import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { ConceptSegment, Script } from '../types';
import { HAND_BODY_FONT } from '../fonts';
import {
  HandSketchProgressBar,
  PaperGrain,
  SKETCH_PAPER,
  SketchPenFilterDefs,
  WavySketchAccent,
} from './sketchPrimitives';

/**
 * ConceptScene — hand-drawn Golpo-style key-idea card.
 * Pen filter, handwriting fonts, wavy accents; no geometric UI chrome.
 */
export const ConceptScene: React.FC<{
  segment: ConceptSegment;
  index: number;
  total: number;
  theme: Script['theme'];
}> = ({ segment, index, total, theme }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const appear = spring({ frame, fps, config: { damping: 14 } });
  const slide = interpolate(appear, [0, 1], [40, 0]);

  const words = segment.text.split(' ');
  const wordsPerFrame = words.length / (durationInFrames * 0.7);

  const accentBar = interpolate(
    frame,
    [durationInFrames * 0.15, durationInFrames * 0.45],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const currentWord = Math.floor(frame * wordsPerFrame);
  const penId = `concept-pen-${index}`;

  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: SKETCH_PAPER }}>
      <PaperGrain />
      <SketchPenFilterDefs id={penId} />

      <svg
        width={140}
        height={120}
        style={{ position: 'absolute', top: 72, left: 32, opacity: 0.2 * appear, pointerEvents: 'none' }}
        filter={`url(#${penId})`}
      >
        <path
          d="M 20 40 Q 60 20 100 45 Q 120 70 90 95 Q 50 110 25 85 Q 8 60 20 40"
          fill="none"
          stroke={theme.primary}
          strokeWidth={1.8}
        />
      </svg>
      <svg
        width={160}
        height={100}
        style={{ position: 'absolute', bottom: 100, right: 28, opacity: 0.18 * appear, pointerEvents: 'none' }}
        filter={`url(#${penId})`}
      >
        <path
          d="M 10 60 Q 50 30 120 40 Q 145 55 130 80 Q 90 95 40 78 Q 15 65 10 60"
          fill="none"
          stroke={theme.secondary}
          strokeWidth={1.6}
        />
      </svg>

      <div
        style={{
          position: 'absolute',
          top: 28,
          left: 48,
          opacity: appear * 0.88,
          fontFamily: HAND_BODY_FONT,
          fontSize: 26,
          color: '#57534e',
        }}
      >
        {index + 1} of {total}
      </div>

      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px 80px',
        }}
      >
        <div
          style={{
            maxWidth: 1000,
            textAlign: 'center',
            opacity: appear,
            transform: `translateY(${slide}px)`,
            position: 'relative',
          }}
        >
          <WavySketchAccent
            filterId={penId}
            primary={theme.primary}
            muted="#78716c"
            progress={accentBar}
            width={400}
          />

          <div
            style={{
              marginTop: 8,
              fontSize: words.length > 25 ? 38 : words.length > 15 ? 44 : 52,
              lineHeight: 1.5,
              fontWeight: 600,
              letterSpacing: 0.2,
              fontFamily: HAND_BODY_FONT,
              color: '#1c1917',
            }}
          >
            {words.map((word, i) => (
              <span
                key={i}
                style={{
                  color: i <= currentWord ? '#1c1917' : '#1c191755',
                  marginRight: 10,
                  display: 'inline',
                }}
              >
                {word}
              </span>
            ))}
          </div>

          {segment.visual_cue ? (
            <div
              style={{
                marginTop: 28,
                fontSize: 28,
                color: '#57534e',
                lineHeight: 1.4,
                opacity: interpolate(frame, [durationInFrames * 0.3, durationInFrames * 0.5], [0, 0.85], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }),
                fontFamily: HAND_BODY_FONT,
              }}
            >
              — {segment.visual_cue}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>

      <HandSketchProgressBar
        frame={frame}
        durationInFrames={durationInFrames}
        primary={theme.primary}
        secondary={theme.secondary}
        barId={`concept-${index}`}
      />
    </AbsoluteFill>
  );
};
