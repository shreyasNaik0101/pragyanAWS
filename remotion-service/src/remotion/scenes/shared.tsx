import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Script } from '../types';

export const SceneHeader: React.FC<{
  index: number;
  total: number;
  kind: string;
  theme: Script['theme'];
}> = ({ index, total, kind, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18 } });
  const slide = interpolate(enter, [0, 1], [-40, 0]);

  const kindLabel = (
    {
      concept: 'Key Idea',
      math: 'Math Step',
      code: 'Code Walkthrough',
      diagram: 'Diagram',
      stage: 'Illustration',
      whiteboard: 'Whiteboard',
      photosynthesis: 'Photosynthesis',
    } as const
  )[
    kind as 'concept' | 'math' | 'code' | 'diagram' | 'stage' | 'whiteboard' | 'photosynthesis'
  ] || 'Step';

  return (
    <div
      style={{
        display: 'flex',
        flexShrink: 0,
        alignItems: 'center',
        gap: 14,
        transform: `translateX(${slide}px)`,
        opacity: enter,
      }}
    >
      <div
        style={{
          padding: '8px 16px',
          borderRadius: 999,
          background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})`,
          color: theme.text,
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}
      >
        {kindLabel}
      </div>
      <div
        style={{
          fontSize: 20,
          color: theme.text,
          opacity: 0.55,
          letterSpacing: 2,
        }}
      >
        {index + 1} / {total}
      </div>
    </div>
  );
};

export const Caption: React.FC<{
  text: string;
  theme: Script['theme'];
}> = ({ text, theme }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });
  // Long captions (e.g. Newton's third law) used to push the diagram canvas
  // below the 720px frame. Shrink the type for verbose captions and clamp to
  // 2 lines so the layout below it stays on-screen.
  const fontSize = text.length > 140 ? 22 : text.length > 90 ? 26 : 32;
  return (
    <div
      style={{
        marginTop: 20,
        flexShrink: 0,
        fontSize,
        lineHeight: 1.3,
        color: theme.text,
        opacity,
        fontWeight: 500,
        maxWidth: 1100,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}
    >
      {text}
    </div>
  );
};
