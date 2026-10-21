import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

/**
 * SceneTransition — Golpo-style transition effects between scenes.
 *
 * Renders an overlay at the beginning of each scene that creates a smooth
 * crossfade / wipe / dissolve effect. This eliminates the harsh cut-to-black
 * that makes educational videos feel cheap.
 */

export type TransitionType = 'fade' | 'wipe_left' | 'wipe_right' | 'zoom_blur' | 'dissolve' | 'slide_up';

export const SceneTransition: React.FC<{
  type?: TransitionType;
  theme: { primary: string; secondary: string; background: string };
  children: React.ReactNode;
}> = ({ type = 'fade', theme, children }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Transition duration: 12 frames in, 8 frames out
  const inDuration = Math.min(12, durationInFrames * 0.15);
  const outDuration = Math.min(8, durationInFrames * 0.1);

  const enterOpacity = interpolate(frame, [0, inDuration], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const exitOpacity = interpolate(
    frame,
    [durationInFrames - outDuration, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const opacity = Math.min(enterOpacity, exitOpacity);

  const getTransitionStyle = (): React.CSSProperties => {
    switch (type) {
      case 'wipe_left': {
        const clipX = interpolate(frame, [0, inDuration], [100, 0], {
          extrapolateRight: 'clamp',
        });
        return {
          clipPath: `inset(0 ${clipX}% 0 0)`,
          opacity: exitOpacity,
        };
      }
      case 'wipe_right': {
        const clipX = interpolate(frame, [0, inDuration], [100, 0], {
          extrapolateRight: 'clamp',
        });
        return {
          clipPath: `inset(0 0 0 ${clipX}%)`,
          opacity: exitOpacity,
        };
      }
      case 'zoom_blur': {
        const scale = interpolate(frame, [0, inDuration], [1.15, 1], {
          extrapolateRight: 'clamp',
        });
        const blur = interpolate(frame, [0, inDuration], [8, 0], {
          extrapolateRight: 'clamp',
        });
        return {
          transform: `scale(${scale})`,
          filter: `blur(${blur}px)`,
          opacity: exitOpacity,
        };
      }
      case 'dissolve': {
        return {
          opacity,
          filter: `saturate(${interpolate(frame, [0, inDuration], [0.3, 1], {
            extrapolateRight: 'clamp',
          })})`,
        };
      }
      case 'slide_up': {
        const slideY = interpolate(frame, [0, inDuration], [40, 0], {
          extrapolateRight: 'clamp',
        });
        return {
          transform: `translateY(${slideY}px)`,
          opacity,
        };
      }
      case 'fade':
      default:
        return { opacity };
    }
  };

  return (
    <AbsoluteFill style={getTransitionStyle()}>
      {children}
    </AbsoluteFill>
  );
};

/**
 * Pick a transition type based on scene index for variety.
 */
export function getTransitionType(index: number): TransitionType {
  const types: TransitionType[] = [
    'fade',
    'wipe_left',
    'zoom_blur',
    'dissolve',
    'slide_up',
    'wipe_right',
  ];
  return types[index % types.length];
}
