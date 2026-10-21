import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { DiagramSegment, Script } from '../types';
import { Caption, SceneHeader } from './shared';
import { NodeIcon, hasIcon } from './nodeIcons';

const MAX_NODE_SIZE = 140;
const MIN_NODE_SIZE = 76;

export const DiagramScene: React.FC<{
  segment: DiagramSegment;
  index: number;
  total: number;
  theme: Script['theme'];
}> = ({ segment, index, total, theme }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const nodes = segment.nodes;
  const edges = segment.edges;

  // Normalise node positions into a 1000x520 canvas.
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = Math.max(1, maxX - minX);
  const rangeY = Math.max(1, maxY - minY);
  // Sized for the 1280x720 composition. 1120x420 canvas leaves room for a
  // header + caption above and 40px of padding on all sides.
  const PAD = 70;
  const W = 1120 - PAD * 2;
  const H = 420 - PAD * 2;

  const toPx = (x: number, y: number) => ({
    left: PAD + (maxX === minX ? W / 2 : ((x - minX) / rangeX) * W),
    top: PAD + (maxY === minY ? H / 2 : ((y - minY) / rangeY) * H),
  });

  // Adaptive node size — keeps bubbles from overlapping when the LLM packs
  // many parts (e.g. all the rocket components) into a small region. We pick
  // the largest size that respects the minimum pairwise gap, then floor it
  // to MIN_NODE_SIZE so icons stay legible.
  let minDist = Infinity;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = toPx(nodes[i].x, nodes[i].y);
      const b = toPx(nodes[j].x, nodes[j].y);
      const d = Math.hypot(a.left - b.left, a.top - b.top);
      if (d < minDist) minDist = d;
    }
  }
  const NODE_SIZE = Math.round(
    Math.max(MIN_NODE_SIZE, Math.min(MAX_NODE_SIZE, minDist === Infinity ? MAX_NODE_SIZE : minDist * 0.92)),
  );

  const perNode = Math.max(6, Math.min(16, Math.floor((durationInFrames * 0.2) / Math.max(1, nodes.length))));
  const edgesStartAt = perNode * nodes.length;
  const perEdge = Math.max(6, Math.min(16, Math.floor((durationInFrames * 0.2) / Math.max(1, edges.length))));

  return (
    <AbsoluteFill
      style={{
        padding: 40,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        overflow: 'hidden',
      }}
    >
      <div style={{ alignSelf: 'flex-start' }}>
        <SceneHeader index={index} total={total} kind="diagram" theme={theme} />
      </div>
      <Caption text={segment.text} theme={theme} />

      <div
        style={{
          position: 'relative',
          width: 1120,
          height: 420,
          marginTop: 16,
          borderRadius: 24,
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${theme.primary}33`,
          overflow: 'hidden',
        }}
      >
        {/* Edges first, so they sit under nodes. */}
        <svg
          width={1120}
          height={420}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
          <defs>
            <marker
              id="arrow"
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
          {edges.map((e, i) => {
            const a = nodes[e.from];
            const b = nodes[e.to];
            if (!a || !b) return null;
            const c1 = toPx(a.x, a.y), c2 = toPx(b.x, b.y);
            const distance = Math.max(1, Math.hypot(c2.left-c1.left,c2.top-c1.top));
            const ux=(c2.left-c1.left)/distance, uy=(c2.top-c1.top)/distance;
            const offset=NODE_SIZE/2+12;
            const p1={left:c1.left+ux*offset,top:c1.top+uy*offset};
            const p2={left:c2.left-ux*offset,top:c2.top-uy*offset};
            const start = edgesStartAt + i * perEdge;
            const t = interpolate(frame, [start, start + 12], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const x2 = p1.left + (p2.left - p1.left) * t;
            const y2 = p1.top + (p2.top - p1.top) * t;
            return (
              <g key={i}>
                <line
                  x1={p1.left}
                  y1={p1.top}
                  x2={x2}
                  y2={y2}
                  stroke={theme.secondary}
                  strokeWidth={3}
                  markerEnd={t >= 1 ? 'url(#arrow)' : undefined}
                />
                {t >= 1 ? <circle cx={p1.left+(p2.left-p1.left)*((frame-start)%60)/60} cy={p1.top+(p2.top-p1.top)*((frame-start)%60)/60} r={5} fill={theme.primary}/> : null}
                {e.label && t >= 1 ? (
                  <text
                    x={(p1.left + p2.left) / 2}
                    y={(p1.top + p2.top) / 2 - 10}
                    fill={theme.text}
                    fontSize={18}
                    textAnchor="middle"
                    opacity={0.8}
                  >
                    {e.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        {nodes.map((n, i) => {
          const { left, top } = toPx(n.x, n.y);
          const appearAt = i * perNode;
          const s = spring({
            frame: frame - appearAt,
            fps,
            config: { damping: 14 },
          });
          const iconMatched = hasIcon(n.label);
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: left - NODE_SIZE / 2,
                top: top - NODE_SIZE / 2,
                width: NODE_SIZE,
                height: NODE_SIZE + 40,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                transform: `scale(${s})`,
              }}
            >
              {/* Icon bubble — when the label matches a known icon we show a
                  themed SVG; otherwise we fall back to the gradient bubble
                  with the label printed inside. */}
              <div
                style={{
                  width: NODE_SIZE,
                  height: NODE_SIZE,
                  borderRadius: 22,
                  background: '#fffefd',
                  boxShadow: `0 8px 20px ${theme.primary}18`,
                  border: `2px solid ${theme.primary}55`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: iconMatched ? 14 : 10,
                }}
              >
                {iconMatched ? (
                  <NodeIcon label={n.label} theme={theme} />
                ) : (
                  <span
                    style={{
                      color: theme.text,
                      fontSize: 18,
                      fontWeight: 700,
                      textAlign: 'center',
                    }}
                  >
                    {n.label}
                  </span>
                )}
              </div>
              {/* Label pill under every node (also when icon is shown) */}
              {iconMatched ? (
                <div
                  style={{
                    marginTop: 8,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: `${theme.primary}12`,
                    color: theme.text,
                    fontSize: 14,
                    fontWeight: 600,
                    // Wrap long labels (e.g. "Combustion Chamber") to two
                    // lines instead of letting them shoot out sideways and
                    // overlap with adjacent rocket-part bubbles.
                    maxWidth: NODE_SIZE + 8,
                    textAlign: 'center',
                    lineHeight: 1.15,
                    wordBreak: 'break-word',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                  title={n.label}
                >
                  {n.label}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
