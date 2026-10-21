import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

/**
 * CameraMotion — Golpo-style cinematic camera movement wrapper.
 *
 * Wraps any scene with smooth zoom, pan, and subtle parallax. This is what
 * gives Golpo videos their "cinematic" feel vs static educational slides.
 *
 * The camera moves slowly and subtly — it should feel like the viewer is
 * being guided through the content, not like the camera is shaking.
 */

export interface CameraConfig {
  /** Zoom factor range [start, end]. Default [1, 1.06] — subtle zoom in */
  zoom?: [number, number];
  /** Horizontal pan in pixels [start, end]. Default [0, 0] */
  panX?: [number, number];
  /** Vertical pan in pixels [start, end]. Default [0, 0] */
  panY?: [number, number];
  /** Camera motion preset. Overrides individual settings */
  preset?: 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | 'ken_burns' | 'drift' | 'none';
  /** Easing: how the motion accelerates. Default: linear */
  easing?: 'linear' | 'ease_in' | 'ease_out';
}

const PRESETS: Record<string, Omit<CameraConfig, 'preset'>> = {
  zoom_in: { zoom: [1, 1.08], panX: [0, 0], panY: [0, -8] },
  zoom_out: { zoom: [1.08, 1], panX: [0, 0], panY: [-8, 0] },
  pan_left: { zoom: [1, 1.03], panX: [15, -15], panY: [0, 0] },
  pan_right: { zoom: [1, 1.03], panX: [-15, 15], panY: [0, 0] },
  ken_burns: { zoom: [1, 1.12], panX: [-10, 10], panY: [5, -10] },
  drift: { zoom: [1, 1.04], panX: [0, 0], panY: [0, 0] },
  none: { zoom: [1, 1], panX: [0, 0], panY: [0, 0] },
};

export const CameraMotion: React.FC<{
  config?: CameraConfig;
  children: React.ReactNode;
}> = ({ config = {}, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const preset = config.preset || 'drift';
  const base = PRESETS[preset] || PRESETS.drift;

  const zoom = config.zoom || base.zoom || [1, 1.04];
  const panX = config.panX || base.panX || [0, 0];
  const panY = config.panY || base.panY || [0, 0];

  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const currentZoom = interpolate(progress, [0, 1], zoom);
  const currentPanX = interpolate(progress, [0, 1], panX);
  const currentPanY = interpolate(progress, [0, 1], panY);

  // Subtle breathing effect for organic feel
  const breathe = Math.sin(frame / 60) * 0.003;

  return (
    <AbsoluteFill
      style={{
        transform: `scale(${currentZoom + breathe}) translate(${currentPanX}px, ${currentPanY}px)`,
        transformOrigin: 'center center',
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/**
 * Pick a camera preset based on scene index to create visual variety.
 * Golpo videos cycle through subtle camera movements per scene.
 */
export function getCameraPreset(index: number): CameraConfig['preset'] {
  const presets: CameraConfig['preset'][] = [
    'zoom_in',
    'pan_right',
    'ken_burns',
    'zoom_out',
    'pan_left',
    'drift',
  ];
  return presets[index % presets.length];
}
