import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { Actor, Beam, StageLabel, StageSegment, Script } from '../types';
import { SceneHeader } from './shared';
import { NodeIcon, hasIcon } from './nodeIcons';

type Theme = Script['theme'];

// Sized for the 1280x720 composition (see Root.tsx). Leaves ~80px of
// horizontal padding and room for a 60px header + 70px caption ribbon below
// without overflowing the frame.
const STAGE_W = 1120;
const STAGE_H = 430;
const ACTOR_BASE = 120; // base pixel size of an actor at scale=1

/**
 * StageScene renders a free-form illustrated composition. The LLM directs
 * the scene by specifying actors (icons) at percentage positions on a stage
 * with a themed backdrop. Beams (light rays / flow arrows) draw between
 * actors and captions animate in at specified times.
 *
 * This is the "Illustrator" scene — used when the topic has real-world
 * actors that should be shown interacting in space, rather than as an
 * abstract node-edge diagram.
 */
export const StageScene: React.FC<{
  segment: StageSegment;
  index: number;
  total: number;
  theme: Theme;
}> = ({ segment, index, total, theme }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const actorsById: Record<string, Actor> = {};
  for (const a of segment.actors) actorsById[a.id] = a;

  const actorPx = (a: Actor) => ({
    left: (a.x / 100) * STAGE_W,
    top: (a.y / 100) * STAGE_H,
  });

  return (
    <AbsoluteFill
      style={{
        padding: 40,
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      <div style={{ alignSelf: 'flex-start' }}>
        <SceneHeader index={index} total={total} kind="stage" theme={theme} />
      </div>

      {/* Stage box */}
      <div
        style={{
          position: 'relative',
          width: STAGE_W,
          height: STAGE_H,
          marginTop: 12,
          borderRadius: 24,
          overflow: 'hidden',
          border: `1px solid ${theme.primary}33`,
        }}
      >
        <Backdrop kind={segment.backdrop} theme={theme} />

        {/* Beams first (behind actors) */}
        <svg
          width={STAGE_W}
          height={STAGE_H}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
          <defs>
            <marker
              id={`arrow-${index}`}
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={theme.secondary} />
            </marker>
          </defs>

          {segment.beams.map((b, i) => {
            const from = actorsById[b.from];
            const to = actorsById[b.to];
            if (!from || !to) return null;
            const p1 = actorPx(from);
            const p2 = actorPx(to);
            return (
              <BeamGraphic
                key={i}
                sceneIndex={index}
                beam={b}
                p1={p1}
                p2={p2}
                theme={theme}
                frame={frame}
                durationInFrames={durationInFrames}
              />
            );
          })}
        </svg>

        {/* Actors */}
        {segment.actors.map((a) => (
          <ActorGraphic
            key={a.id}
            actor={a}
            pos={actorPx(a)}
            theme={theme}
            frame={frame}
            fps={fps}
            durationInFrames={durationInFrames}
          />
        ))}

        {/* Timed labels */}
        {segment.labels.map((l, i) => (
          <StageCaption
            key={i}
            label={l}
            theme={theme}
            frame={frame}
            durationInFrames={durationInFrames}
          />
        ))}
      </div>

      {/* Narration caption ribbon */}
      <div
        style={{
          marginTop: 12,
          padding: '12px 20px',
          borderRadius: 16,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${theme.primary}33`,
          color: theme.text,
          fontSize: 20,
          lineHeight: 1.35,
          fontWeight: 500,
          maxWidth: STAGE_W,
          // Keep the ribbon to 2 lines max so it never pushes the stage off
          // the 720px-tall frame.
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {segment.text}
      </div>
    </AbsoluteFill>
  );
};

// --- Backdrop presets -----------------------------------------------------

const Backdrop: React.FC<{
  kind: StageSegment['backdrop'];
  theme: Theme;
}> = ({ kind, theme }) => {
  if (kind === 'sky_ground') {
    return (
      <svg width={STAGE_W} height={STAGE_H} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1e3a8a" />
            <stop offset="0.65" stopColor="#0ea5e9" />
            <stop offset="0.9" stopColor="#fef3c7" />
            <stop offset="1" stopColor="#a3e635" />
          </linearGradient>
        </defs>
        <rect width={STAGE_W} height={STAGE_H} fill="url(#sky-grad)" />
        {/* Rolling hills */}
        <path
          d={`M 0 ${STAGE_H * 0.78} Q ${STAGE_W * 0.2} ${STAGE_H * 0.7} ${STAGE_W * 0.4} ${STAGE_H * 0.78} T ${STAGE_W} ${STAGE_H * 0.78} V ${STAGE_H} H 0 Z`}
          fill="#4d7c0f"
          opacity={0.9}
        />
        <path
          d={`M 0 ${STAGE_H * 0.88} Q ${STAGE_W * 0.3} ${STAGE_H * 0.83} ${STAGE_W * 0.6} ${STAGE_H * 0.88} T ${STAGE_W} ${STAGE_H * 0.88} V ${STAGE_H} H 0 Z`}
          fill="#3f6212"
        />
      </svg>
    );
  }

  if (kind === 'space') {
    return (
      <svg width={STAGE_W} height={STAGE_H} style={{ position: 'absolute', inset: 0 }}>
        <rect width={STAGE_W} height={STAGE_H} fill="#020617" />
        {Array.from({ length: 90 }).map((_, i) => {
          const x = (i * 137) % STAGE_W;
          const y = (i * 91) % STAGE_H;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={1.5 + ((i * 7) % 3)}
              fill="#fde68a"
              opacity={0.6 + ((i * 11) % 40) / 100}
            />
          );
        })}
      </svg>
    );
  }

  if (kind === 'zoom_cell') {
    return (
      <svg width={STAGE_W} height={STAGE_H} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id="cell-grad">
            <stop offset="0" stopColor="#86efac" />
            <stop offset="1" stopColor="#14532d" />
          </radialGradient>
        </defs>
        <rect width={STAGE_W} height={STAGE_H} fill="url(#cell-grad)" />
        <ellipse cx={STAGE_W / 2} cy={STAGE_H / 2} rx={STAGE_W * 0.48} ry={STAGE_H * 0.48} fill="none" stroke="#065f46" strokeWidth={6} />
      </svg>
    );
  }

  if (kind === 'indoor') {
    return (
      <svg width={STAGE_W} height={STAGE_H} style={{ position: 'absolute', inset: 0 }}>
        <rect width={STAGE_W} height={STAGE_H} fill="#1e293b" />
        <rect y={STAGE_H * 0.7} width={STAGE_W} height={STAGE_H * 0.3} fill="#334155" />
        <line x1={0} y1={STAGE_H * 0.7} x2={STAGE_W} y2={STAGE_H * 0.7} stroke="#475569" strokeWidth={3} />
      </svg>
    );
  }

  // plain
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(135deg, ${theme.primary}22, ${theme.secondary}22)`,
      }}
    />
  );
};

// --- Actor graphic --------------------------------------------------------

const ActorGraphic: React.FC<{
  actor: Actor;
  pos: { left: number; top: number };
  theme: Theme;
  frame: number;
  fps: number;
  durationInFrames: number;
}> = ({ actor, pos, theme, frame, fps, durationInFrames }) => {
  const enterFrame = actor.enter_at * durationInFrames;
  const s = spring({
    frame: frame - enterFrame,
    fps,
    config: { damping: 14 },
  });
  if (s <= 0) return null;

  const size = ACTOR_BASE * actor.scale;
  const halo = actor.highlight ? 30 : 0;

  const iconMatched = hasIcon(actor.actor);

  return (
    <div
      style={{
        position: 'absolute',
        left: pos.left - size / 2,
        top: pos.top - size / 2,
        width: size,
        height: size,
        transform: `scale(${s})`,
        filter: halo ? `drop-shadow(0 0 ${halo}px ${theme.secondary})` : undefined,
        transition: 'filter 200ms',
      }}
    >
      {iconMatched ? (
        <NodeIcon label={actor.actor} theme={theme} />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.text,
            fontSize: size * 0.18,
            fontWeight: 700,
            textAlign: 'center',
            padding: 8,
          }}
        >
          {actor.actor}
        </div>
      )}
    </div>
  );
};

// --- Beam graphic ---------------------------------------------------------

const BeamGraphic: React.FC<{
  sceneIndex: number;
  beam: Beam;
  p1: { left: number; top: number };
  p2: { left: number; top: number };
  theme: Theme;
  frame: number;
  durationInFrames: number;
}> = ({ sceneIndex, beam, p1, p2, theme, frame, durationInFrames }) => {
  const startFrame = beam.start * durationInFrames;
  const draw = interpolate(frame, [startFrame, startFrame + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  if (draw <= 0) return null;

  const x2 = p1.left + (p2.left - p1.left) * draw;
  const y2 = p1.top + (p2.top - p1.top) * draw;

  const strokeColor =
    beam.style === 'light' ? '#fde68a' : beam.style === 'flow' ? '#38bdf8' : theme.secondary;
  const strokeWidth = beam.style === 'light' ? 5 : 4;
  const dashArray = beam.style === 'light' ? '10 6' : beam.style === 'flow' ? '14 8' : '0';
  const marchOffset = -((frame * 0.8) % 20);

  return (
    <g>
      <line
        x1={p1.left}
        y1={p1.top}
        x2={x2}
        y2={y2}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={dashArray}
        strokeDashoffset={marchOffset}
        markerEnd={draw >= 1 && beam.style === 'arrow' ? `url(#arrow-${sceneIndex})` : undefined}
        opacity={beam.style === 'light' ? 0.85 : 0.95}
      />
      {/* Particle travelling along the beam */}
      {draw >= 1 ? (
        <circle
          cx={p1.left + (p2.left - p1.left) * ((frame % 40) / 40)}
          cy={p1.top + (p2.top - p1.top) * ((frame % 40) / 40)}
          r={6}
          fill={strokeColor}
          opacity={0.9}
        />
      ) : null}
      {beam.label && draw >= 1 ? (
        <text
          x={(p1.left + p2.left) / 2}
          y={(p1.top + p2.top) / 2 - 10}
          fill={theme.text}
          fontSize={18}
          textAnchor="middle"
          opacity={0.85}
          style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.6)', strokeWidth: 4 }}
        >
          {beam.label}
        </text>
      ) : null}
    </g>
  );
};

// --- Timed caption --------------------------------------------------------

const StageCaption: React.FC<{
  label: StageLabel;
  theme: Theme;
  frame: number;
  durationInFrames: number;
}> = ({ label, theme, frame, durationInFrames }) => {
  const showAt = label.at * durationInFrames;
  const op = interpolate(frame, [showAt, showAt + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  if (op <= 0) return null;
  // Clamp position so labels near the stage edge don't bleed outside.
  const clampedX = Math.min(92, Math.max(8, label.x));
  const clampedY = Math.min(92, Math.max(8, label.y));
  return (
    <div
      style={{
        position: 'absolute',
        left: `${clampedX}%`,
        top: `${clampedY}%`,
        transform: 'translate(-50%, -50%)',
        padding: '6px 12px',
        borderRadius: 10,
        background: 'rgba(0,0,0,0.7)',
        color: theme.text,
        fontSize: 16,
        fontWeight: 600,
        opacity: op,
        maxWidth: 260,
        textAlign: 'center',
        wordBreak: 'break-word',
      }}
    >
      {label.text}
    </div>
  );
};
