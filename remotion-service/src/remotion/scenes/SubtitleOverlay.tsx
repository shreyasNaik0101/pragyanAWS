import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

/**
 * SubtitleOverlay — Burned-in animated subtitles for Golpo-style videos.
 *
 * Renders word-by-word animated captions at the bottom of each scene.
 * Unlike WebVTT external subtitles, these are part of the video itself
 * so they work everywhere (WhatsApp, social media, etc.)
 *
 * Features:
 * - Word-by-word highlight animation
 * - Glassmorphism backdrop
 * - Smooth fade in/out
 * - Auto-wrapping for long text
 */

export const SubtitleOverlay: React.FC<{
  text: string;
  theme: { text: string; primary: string; secondary: string };
}> = ({ text, theme }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  if (!text) return null;

  // Split text into words for progressive highlight
  const words = text.split(/\s+/);
  const wordsPerFrame = words.length / (durationInFrames * 0.85);

  // Fade in at start, fade out at end
  const fadeIn = interpolate(frame, [0, fps * 0.4], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - fps * 0.3, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const opacity = Math.min(fadeIn, fadeOut);

  // Current word being "spoken"
  const currentWordIndex = Math.floor(frame * wordsPerFrame);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        opacity,
        maxWidth: 1100,
        width: '90%',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          display: 'inline-block',
          padding: '14px 28px',
          borderRadius: 16,
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div
          style={{
            fontSize: 24,
            lineHeight: 1.5,
            fontWeight: 500,
            letterSpacing: 0.3,
          }}
        >
          {words.map((word, i) => (
            <span
              key={i}
              style={{
                color: i <= currentWordIndex ? '#1a1a2e' : '#1a1a2e44',
                fontWeight: i === currentWordIndex ? 700 : 500,
                transition: 'color 150ms, font-weight 150ms',
                marginRight: 6,
              }}
            >
              {word}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * ProgressBar — Thin animated progress bar at the top of the video.
 * Shows overall video progress like Golpo/social media videos.
 */
export const ProgressBar: React.FC<{
  currentSegmentStart: number;
  totalSegments: number;
  segmentIndex: number;
  theme: { primary: string; secondary: string };
}> = ({ currentSegmentStart, totalSegments, segmentIndex, theme }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const segmentProgress = interpolate(frame, [0, durationInFrames], [0, 100], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        display: 'flex',
        gap: 3,
        padding: '8px 16px',
      }}
    >
      {Array.from({ length: totalSegments }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            background: 'rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width:
                i < segmentIndex
                  ? '100%'
                  : i === segmentIndex
                    ? `${segmentProgress}%`
                    : '0%',
              background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})`,
              borderRadius: 2,
              transition: 'width 100ms linear',
            }}
          />
        </div>
      ))}
    </div>
  );
};
