import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Highlight, themes } from 'prism-react-renderer';
import type { CodeSegment, Script } from '../types';
import { Caption, SceneHeader } from './shared';

export const CodeScene: React.FC<{
  segment: CodeSegment;
  index: number;
  total: number;
  theme: Script['theme'];
}> = ({ segment, index, total, theme }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const lines = segment.code.split('\n');
  const perLine = Math.max(3, Math.floor((durationInFrames * 0.7) / Math.max(1, lines.length)));

  return (
    <AbsoluteFill style={{ padding: '40px 60px 110px', flexDirection: 'column', justifyContent: 'flex-start' }}>
      <SceneHeader index={index} total={total} kind="code" theme={theme} />
      <Caption text={segment.text} theme={theme} />

      <div
        style={{
          marginTop: 22,
          flex: 1,
          minHeight: 0,
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: `0 20px 60px ${theme.primary}44`,
          border: `1px solid ${theme.primary}33`,
        }}
      >
        {/* Pseudo window chrome */}
        <div
          style={{
            background: '#1a1a2e',
            padding: '12px 20px',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ width: 14, height: 14, borderRadius: 7, background: '#ff5f56' }} />
          <div style={{ width: 14, height: 14, borderRadius: 7, background: '#ffbd2e' }} />
          <div style={{ width: 14, height: 14, borderRadius: 7, background: '#27c93f' }} />
          <div
            style={{
              marginLeft: 16,
              fontSize: 16,
              color: '#f8fafc99',
              fontFamily: 'monospace',
            }}
          >
            {segment.language || 'code'}
          </div>
        </div>

        <Highlight
          code={segment.code}
          language={(segment.language as any) || 'python'}
          theme={themes.nightOwl}
        >
          {({ style, tokens, getLineProps, getTokenProps }) => (
            <pre
              style={{
                ...style,
                margin: 0,
                padding: '18px 26px',
                fontSize: Math.min(26, Math.max(13, 320 / Math.max(1, lines.length) - 4)),
                lineHeight: 1.25,
                fontFamily:
                  'ui-monospace, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
              }}
            >
              {tokens.map((line, i) => {
                const appearAt = i * perLine;
                const local = frame - appearAt;
                const op = interpolate(local, [0, 12], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                });
                const dx = interpolate(local, [0, 18], [-20, 0], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                });
                const highlighted = (segment.highlights || []).includes(i + 1);
                return (
                  <div
                    key={i}
                    {...getLineProps({ line })}
                    style={{
                      ...getLineProps({ line }).style,
                      opacity: op,
                      transform: `translateX(${dx}px)`,
                      background: highlighted ? `${theme.secondary}22` : 'transparent',
                      padding: '2px 12px',
                      margin: '0 -12px',
                      borderLeft: highlighted ? `3px solid ${theme.secondary}` : '3px solid transparent',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: 40,
                        color: '#ffffff44',
                        textAlign: 'right',
                        marginRight: 16,
                        userSelect: 'none',
                      }}
                    >
                      {i + 1}
                    </span>
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </div>
                );
              })}
            </pre>
          )}
        </Highlight>
      </div>
    </AbsoluteFill>
  );
};
