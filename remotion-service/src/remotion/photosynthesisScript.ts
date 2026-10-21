import type { Script } from './types';

/**
 * Golpo-style photosynthesis explainer: dedicated `photosynthesis` segments
 * with spring-driven motion, light beams, equation draw, and chloroplast beat.
 * Use as defaultProps for the PhotosynthesisVideo composition.
 */
export const photosynthesisScript: Script = {
  title: 'Photosynthesis',
  subtitle: 'How plants turn sunlight into food — one beautiful story.',
  total_duration: 66,
  language: 'english',
  theme: {
    primary: '#0d9488',
    secondary: '#f59e0b',
    background: '#ecfdf5',
    text: '#f8fafc',
  },
  segments: [
    {
      kind: 'photosynthesis',
      phase: 'intro',
      text: 'Every green leaf is a tiny solar kitchen. Sunlight, water, and carbon dioxide go in — sugar and oxygen come out.',
      duration: 8,
      animation_type: 'fade',
    },
    {
      kind: 'photosynthesis',
      phase: 'sun_to_leaf',
      text: 'Light streams from the sun and hits the leaf. That energy is the spark that starts photosynthesis.',
      duration: 9,
      animation_type: 'fade',
    },
    {
      kind: 'photosynthesis',
      phase: 'chlorophyll',
      text: 'Inside the leaf, chlorophyll traps photons. That energy splits water and powers the building of sugar molecules.',
      duration: 9,
      animation_type: 'write',
    },
    {
      kind: 'photosynthesis',
      phase: 'inputs',
      text: 'Roots pull up water. Tiny pores called stomata let carbon dioxide drift in from the air — both feed the chloroplast.',
      duration: 9,
      animation_type: 'create',
    },
    {
      kind: 'photosynthesis',
      phase: 'equation',
      text: 'The balanced chemistry: six carbon dioxides plus six waters rearrange into one glucose and six oxygen molecules.',
      duration: 11,
      animation_type: 'write',
    },
    {
      kind: 'photosynthesis',
      phase: 'outputs',
      text: 'Glucose fuels the plant — and indirectly nearly all life. Oxygen is released as a gift to the atmosphere we breathe.',
      duration: 8,
      animation_type: 'fade',
    },
    {
      kind: 'photosynthesis',
      phase: 'chloroplast',
      text: 'Zoomed in: the chloroplast is where light becomes chemical bond energy — the heart of photosynthesis.',
      duration: 11,
      animation_type: 'transform',
    },
  ],
};
