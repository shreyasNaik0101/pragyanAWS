import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { Script, Segment } from './types';
import { FONT_STACK } from './fonts';
import { ConceptScene } from './scenes/ConceptScene';
import { MathScene } from './scenes/MathScene';
import { CodeScene } from './scenes/CodeScene';
import { DiagramScene } from './scenes/DiagramScene';
import { StageScene } from './scenes/StageScene';
import { WhiteboardScene } from './scenes/WhiteboardScene';
import { PhotosynthesisScene } from './scenes/PhotosynthesisScene';
import { CameraMotion, getCameraPreset } from './scenes/CameraMotion';
import { SubtitleOverlay, ProgressBar } from './scenes/SubtitleOverlay';
import { SceneTransition, getTransitionType } from './scenes/SceneTransition';

// --- Golpo whiteboard background (clean, educational, light) ---------------
const AnimatedBackground: React.FC<{ from: string; to: string; bg: string }> = ({
  from,
  to,
  bg,
}) => {
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(145deg, #fefefe 0%, #f8f6f0 50%, #faf8f2 100%)' }}>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 90% 80% at 50% 40%, transparent 30%, rgba(248,246,240,0.85) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};

// --- Golpo-style title card (whiteboard aesthetic) ----------------------
const TitleCard: React.FC<{ title: string; subtitle: string; theme: Script['theme'] }> = ({
  title,
  subtitle,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const appear = spring({ frame, fps, config: { damping: 14 } });
  const slide = interpolate(appear, [0, 1], [50, 0]);

  const underlineW = interpolate(frame, [10, 26], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const subOpacity = interpolate(frame, [14, 28], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: 80,
        overflow: 'hidden',
        background: 'linear-gradient(145deg, #fefefe 0%, #f5f3ee 100%)',
      }}
    >
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 15% 20%, rgba(231,76,60,0.08), transparent 55%), radial-gradient(ellipse 55% 50% at 88% 78%, rgba(52,152,219,0.09), transparent 50%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 5,
          background: 'linear-gradient(180deg, #e74c3c, #3498db)',
          opacity: interpolate(frame, [0, 12], [0, 0.85], { extrapolateRight: 'clamp' }),
        }}
      />

      <div
        style={{
          transform: `translateY(${slide}px)`,
          opacity: appear,
          textAlign: 'center',
          maxWidth: '85%',
          position: 'relative',
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: 6,
            textTransform: 'uppercase',
            color: '#e74c3c',
            marginBottom: 20,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Gyan Pragyan
        </div>
        <h1
          style={{
            fontSize: title.length > 48 ? 44 : title.length > 28 ? 56 : 68,
            fontWeight: 800,
            margin: 0,
            color: '#1a1a2e',
            lineHeight: 1.2,
            wordBreak: 'break-word',
            fontFamily: '"Segoe UI", "SF Pro Display", system-ui, sans-serif',
          }}
        >
          {title}
        </h1>

        <div
          style={{
            margin: '28px auto 0',
            width: 'min(420px, 75%)',
            height: 4,
            borderRadius: 2,
            background: '#eee',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${underlineW}%`,
              background: 'linear-gradient(90deg, #e74c3c, #3498db)',
              borderRadius: 2,
            }}
          />
        </div>

        <div
          style={{
            marginTop: 24,
            fontSize: 26,
            color: '#666',
            opacity: subOpacity,
            fontWeight: 400,
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
          }}
        >
          {subtitle}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Per-segment scene dispatcher with Golpo enhancements
const SceneDispatch: React.FC<{
  segment: Segment;
  index: number;
  total: number;
  theme: Script['theme'];
}> = ({ segment, index, total, theme }) => {
  switch (segment.kind) {
    case 'math':
      return <MathScene segment={segment} index={index} total={total} theme={theme} />;
    case 'code':
      return <CodeScene segment={segment} index={index} total={total} theme={theme} />;
    case 'diagram':
      return <DiagramScene segment={segment} index={index} total={total} theme={theme} />;
    case 'stage':
      return <StageScene segment={segment} index={index} total={total} theme={theme} />;
    case 'whiteboard':
      return <WhiteboardScene segment={segment as any} index={index} total={total} theme={theme} />;
    case 'photosynthesis':
      return <PhotosynthesisScene segment={segment} index={index} total={total} theme={theme} />;
    case 'concept':
      return <ConceptScene segment={segment} index={index} total={total} theme={theme} />;
    default:
      return <ConceptScene segment={segment as any} index={index} total={total} theme={theme} />;
  }
};

// --- Golpo-style Outro (whiteboard aesthetic) ---------------------------
const Outro: React.FC<{ title: string; theme: Script['theme'] }> = ({ title, theme }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 18 } });

  const badgePop = interpolate(frame, [6, 20], [0.88, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const badgeOp = interpolate(frame, [4, 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: 80,
        overflow: 'hidden',
        background: 'linear-gradient(145deg, #fefefe 0%, #f5f3ee 100%)',
      }}
    >
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 50% 45%, transparent 35%, rgba(245,243,238,0.9) 100%)',
        }}
      />

      <div style={{ transform: `scale(${s})`, textAlign: 'center', maxWidth: '85%', position: 'relative' }}>
        <div
          style={{
            margin: '0 auto 22px',
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'linear-gradient(145deg, rgba(39,174,96,0.15), rgba(39,174,96,0.05))',
            border: '2px solid rgba(39,174,96,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            color: '#27ae60',
            fontWeight: 800,
            opacity: badgeOp,
            transform: `scale(${badgePop})`,
          }}
        >
          ✓
        </div>

        <div
          style={{
            fontSize: 18,
            color: '#27ae60',
            letterSpacing: 4,
            textTransform: 'uppercase',
            marginBottom: 16,
            fontWeight: 600,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Keep Learning
        </div>
        <h1
          style={{
            fontSize: title.length > 48 ? 40 : title.length > 28 ? 52 : 60,
            margin: 0,
            lineHeight: 1.2,
            wordBreak: 'break-word',
            color: '#1a1a2e',
            fontWeight: 800,
            fontFamily: '"Segoe UI", "SF Pro Display", system-ui, sans-serif',
          }}
        >
          {title}
        </h1>
        <div
          style={{
            marginTop: 28,
            color: '#999',
            fontSize: 20,
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
          }}
        >
          Powered by Gyan Pragyan · Remotion
        </div>
      </div>
    </AbsoluteFill>
  );
};

// --- Main composition with ALL Golpo enhancements -------------------------
export const EducationalVideo: React.FC<Script> = (props) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const theme = props.theme;

  // Short intro/outro — must match narrate.ts
  const introFrames = Math.round(0.8 * fps);
  const outroFrames = Math.round(0.8 * fps);

  let cursor = introFrames;
  const segmentSequences = props.segments.map((seg, i) => {
    const dur = Math.max(2, seg.duration || 6);
    const frames = Math.round(dur * fps);
    const start = cursor;
    cursor += frames;

    const cameraPreset = getCameraPreset(i);
    const transitionType = getTransitionType(i);

    return (
      <Sequence key={i} from={start} durationInFrames={frames}>
        {/* Scene transition effect */}
        <SceneTransition type={transitionType} theme={theme}>
          {/* Camera motion wrapper */}
          <CameraMotion config={{ preset: cameraPreset }}>
            <SceneDispatch
              segment={seg}
              index={i}
              total={props.segments.length}
              theme={theme}
            />
          </CameraMotion>
        </SceneTransition>

        {/* Burned-in subtitles */}
        <SubtitleOverlay text={seg.text} theme={theme} />

        {/* Segment progress bar */}
        <ProgressBar
          currentSegmentStart={start}
          totalSegments={props.segments.length}
          segmentIndex={i}
          theme={theme}
        />

        {/* Per-segment TTS audio */}
        {seg.audio_url ? <Audio src={seg.audio_url} /> : null}
      </Sequence>
    );
  });

  return (
    <AbsoluteFill
      style={{
        fontFamily: FONT_STACK,
        overflow: 'hidden',
      }}
    >
      <AnimatedBackground from={theme.primary} to={theme.secondary} bg={theme.background} />

      {/* Intro title card with camera motion */}
      <Sequence from={0} durationInFrames={introFrames}>
        <CameraMotion config={{ preset: 'zoom_in' }}>
          <TitleCard title={props.title} subtitle={props.subtitle} theme={theme} />
        </CameraMotion>
      </Sequence>

      {segmentSequences}

      {/* Outro with zoom out */}
      <Sequence from={cursor} durationInFrames={outroFrames}>
        <CameraMotion config={{ preset: 'zoom_out' }}>
          <Outro title={props.title} theme={theme} />
        </CameraMotion>
      </Sequence>

      {/* Global watermark — subtle branding like Golpo */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          right: 20,
          zIndex: 150,
          fontSize: 14,
          color: 'rgba(0, 0, 0, 0.12)',
          fontWeight: 600,
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}
      >
        Gyan_Pragyan
      </div>
    </AbsoluteFill>
  );
};
