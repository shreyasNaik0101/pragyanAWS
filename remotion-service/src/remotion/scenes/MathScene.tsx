import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { MathSegment, Script } from '../types';
import { Caption, SceneHeader } from './shared';
import { Illustration, isIllustrationRelevant } from './illustrations';

const Tex: React.FC<{ latex: string; size?: number; color?: string }> = ({
  latex,
  size = 56,
  color = '#f8fafc',
}) => {
  let html = '';
  try {
    html = katex.renderToString(latex, {
      displayMode: true,
      throwOnError: false,
      output: 'html',
      trust: false,
      maxExpand: 100,
      maxSize: 10,
    });
  } catch {
    return <span style={{fontSize:size,color}}>{latex}</span>;
  }
  return (
    <div
      className="tex-block"
      style={{
        fontSize: size,
        color,
        lineHeight: 1.15,
        // KaTeX can produce very wide display math. Let it scale down instead
        // of getting clipped by the parent panel.
        maxWidth: '100%',
        overflow: 'hidden',
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

// Rough "visible width" of a LaTeX expression — used to pick a font size that
// fits the panel. We strip common LaTeX control sequences so \frac{a}{b} and
// \text{GramPanchayat} are measured by their rendered chars, not their source.
function estimateLatexLen(latex: string): number {
  return latex
    .replace(/\\(text|mathrm|mathit|mathbf)\s*\{([^}]*)\}/g, '$2')
    .replace(/\\[a-zA-Z]+\s*/g, ' ')
    .replace(/[{}]/g, '')
    .length;
}

function fontSizeForStep(latex: string, panelWidth: number, stepCount: number): number {
  const len = estimateLatexLen(latex);
  // Base size from LaTeX length.
  let size: number;
  if (len <= 18) size = 44;
  else if (len <= 28) size = 36;
  else if (len <= 40) size = 30;
  else if (len <= 55) size = 24;
  else size = 20;
  // Shrink when there are many steps so they all fit in the ~470px-tall
  // panel (KaTeX displayMode adds ~1em vertical margin per block).
  if (stepCount >= 5) size = Math.min(size, 26);
  else if (stepCount >= 4) size = Math.min(size, 32);
  else if (stepCount >= 3) size = Math.min(size, 38);
  return size;
}

export const MathScene: React.FC<{
  segment: MathSegment;
  index: number;
  total: number;
  theme: Script['theme'];
}> = ({ segment, index, total, theme }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const steps = segment.steps;
  // Spread step reveals evenly across the segment, leaving a short tail.
  const reveal = Math.max(1, Math.floor((durationInFrames * 0.8) / steps.length));

  // Pick a geometric figure to illustrate the math — but only if the topic is
  // actually STEM-like. For civics/history/biography we skip the illustration
  // and give the equations the full width instead (otherwise the fallback
  // pool picks an atom or gear which is completely off-topic).
  const illustrationCue = [segment.text, ...steps].join(' ');
  const showIllustration = isIllustrationRelevant(illustrationCue);

  // Panel width hint for font scaling. When the illustration is shown, the
  // equations get ~55% of the canvas; otherwise they get ~95%.
  const panelWidth = showIllustration ? 720 : 1200;

  return (
    <AbsoluteFill style={{ padding: '40px 48px 110px', flexDirection: 'column' }}>
      {/* KaTeX displayMode adds a default 1em vertical margin per block which
          stacks up and clips the last step in dense panels (e.g. Newton's laws
          with 4 short equations). Collapse those margins here. */}
      <style>{`.tex-block .katex-display { margin: 0 !important; }`}</style>
      <SceneHeader index={index} total={total} kind="math" theme={theme} />
      <Caption text={segment.text} theme={theme} />

      <div
        style={{
          marginTop: 24,
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          gap: 28,
          alignItems: 'stretch',
        }}
      >
        {/* Left: animated geometric figure (only for STEM topics) */}
        {showIllustration && (
          <div
            style={{
              flex: 0.9,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 24,
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${theme.primary}33`,
              padding: 20,
              minHeight: 0,
            }}
          >
            {/log|n\/2/.test(steps.join(' ')) ? <svg viewBox="0 0 460 380" width="100%" height="100%">{[1,.5,.25,.125].map((fraction,i)=>{const progress=interpolate(frame,[i*15,i*15+24],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});return <g key={i} opacity={progress}><text x={30} y={60+i*80} fill={theme.text} fontSize={21}>{i===0?'n':`n / ${2**i}`}</text><rect x={110} y={35+i*80} width={290*fraction*progress} height={40} rx={8} fill={i%2?theme.secondary:theme.primary}/></g>;})}</svg> : <Illustration cue={illustrationCue} index={index} theme={theme} />}
          </div>
        )}

        {/* Right: step-by-step LaTeX */}
        <div
          style={{
            flex: showIllustration ? 1.1 : 1,
            padding: 28,
            borderRadius: 24,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${theme.primary}55`,
            boxShadow: `inset 0 0 60px ${theme.primary}22`,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          {steps.map((s, i) => {
            const start = i * reveal;
            const local = frame - start;
            const op = interpolate(local, [0, 15], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const slide = interpolate(local, [0, 20], [30, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            if (op <= 0) return null;
            const texSize = fontSizeForStep(s, panelWidth, steps.length);
            return (
              <div
                key={i}
                style={{
                  opacity: op,
                  transform: `translateY(${slide}px)`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    minWidth: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                    color: theme.text,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <Tex latex={s} size={texSize} color={theme.text} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
