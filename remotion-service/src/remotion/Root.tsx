import React from 'react';
import { Composition } from 'remotion';
import { EducationalVideo } from './EducationalVideo';
import { CyberSparkPromo } from './CyberSparkPromo';
import { photosynthesisScript } from './photosynthesisScript';
import { ScriptSchema, type Script, type Segment } from './types';
// Side-effect import: registers Noto Sans Devanagari / Kannada so that
// Hindi / Kannada narrations render as real glyphs in headless Chromium
// instead of tofu boxes.
import './fonts';

// 24fps is cinematic standard — 20% fewer frames to render than 30fps,
// directly speeding up the render. Smooth enough for educational animations.
const FPS = 24;
const WIDTH = 1280;
const HEIGHT = 720;

const defaultScript = {
  title: 'Gyan_Pragyan',
  subtitle: 'Educational Video',
  segments: [
    {
      kind: 'concept' as const,
      text: 'Welcome! Today we will explore an important concept.',
      visual_cue: 'Title introduction with animated accent',
      duration: 6,
      animation_type: 'fade' as const,
    },
    {
      kind: 'concept' as const,
      text: 'Here is the core idea broken down into simple steps.',
      visual_cue: 'Three connected nodes appearing in sequence',
      duration: 6,
      animation_type: 'create' as const,
    },
    {
      kind: 'concept' as const,
      text: 'Notice how each part relates to the next.',
      visual_cue: 'Arrows highlighting connections',
      duration: 6,
      animation_type: 'transform' as const,
    },
    {
      kind: 'concept' as const,
      text: 'You now have the foundation. Keep learning!',
      visual_cue: 'Summary with key takeaways',
      duration: 6,
      animation_type: 'write' as const,
    },
  ],
  total_duration: 24,
  language: 'english',
  theme: {
    primary: '#6366f1',
    secondary: '#ec4899',
    background: '#0f172a',
    text: '#f8fafc',
  },
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="EducationalVideo"
        component={EducationalVideo}
        durationInFrames={FPS * 30}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        schema={ScriptSchema}
        defaultProps={defaultScript}
        calculateMetadata={({ props }) => {
          // Must match INTRO_SECONDS / OUTRO_SECONDS in narrate.ts and the
          // introFrames / outroFrames in EducationalVideo.tsx. Kept short so
          // voiceover covers ~95% of the runtime.
          const intro = 0.8;
          const outro = 0.8;
          const script = props as unknown as Script;
          const segments = script.segments.reduce(
            (acc: number, s: Segment) => acc + (s.duration || 6),
            0,
          );
          const total = Math.max(8, intro + segments + outro);
          return {
            durationInFrames: Math.round(total * FPS),
          };
        }}
      />
      <Composition
        id="PhotosynthesisVideo"
        component={EducationalVideo}
        durationInFrames={FPS * 120}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        schema={ScriptSchema}
        defaultProps={photosynthesisScript}
        calculateMetadata={({ props }) => {
          const intro = 0.8;
          const outro = 0.8;
          const script = props as unknown as Script;
          const segments = script.segments.reduce(
            (acc: number, s: Segment) => acc + (s.duration || 6),
            0,
          );
          const total = Math.max(8, intro + segments + outro);
          return {
            durationInFrames: Math.round(total * FPS),
          };
        }}
      />
      {/* CyberSpark Academy promo: 5-minute branded marketing video at 1080p / 30fps. */}
      <Composition
        id="CyberSparkPromo"
        component={CyberSparkPromo}
        durationInFrames={300 * 30}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
