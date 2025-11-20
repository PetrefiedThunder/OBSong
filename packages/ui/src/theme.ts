/**
 * TopoSonics Design System
 * Inspired by Dieter Rams' "Less but Better" philosophy
 * Colors reflect the musical and visual nature of the project
 */

/**
 * Color Palette Philosophy:
 *
 * - **Sound Spectrum**: Deep indigos and teals representing frequency visualization
 * - **Musical Notation**: Warm creams and off-whites like sheet music
 * - **Natural Light**: Amber accents inspired by landscape photography (golden hour)
 * - **Graphite**: Precise neutral grays following Braun design language
 * - **Sonic**: Vibrant green for active states (oscilloscope displays)
 */

export const colors = {
  // Primary: Sound Spectrum (indigo-teal gradient representing frequency)
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',  // Core frequency blue
    600: '#2563eb',
    700: '#1e40af',
    800: '#1e3a8a',
    900: '#1e293b',
    950: '#0f172a',
  },

  // Accent: Natural Amber (golden hour, landscape warmth)
  accent: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',  // Golden hour
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Sonic: Active States (oscilloscope green, sound wave energy)
  sonic: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',  // Core sonic green
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Graphite: Neutral grays (Braun precision)
  graphite: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',  // Core graphite
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },

  // Musical Notation: Warm off-whites (sheet music)
  notation: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
  },

  // Semantic Colors
  success: {
    light: '#86efac',
    DEFAULT: '#22c55e',
    dark: '#15803d',
  },
  warning: {
    light: '#fde047',
    DEFAULT: '#eab308',
    dark: '#a16207',
  },
  error: {
    light: '#fca5a5',
    DEFAULT: '#ef4444',
    dark: '#b91c1c',
  },
  info: {
    light: '#93c5fd',
    DEFAULT: '#3b82f6',
    dark: '#1e40af',
  },

  // Surface Colors (Rams-inspired precision)
  background: {
    primary: '#0f172a',      // Deep space (primary canvas)
    secondary: '#1e293b',    // Elevated surface
    tertiary: '#334155',     // Highest elevation
  },
  surface: {
    primary: '#1e293b',      // Card default
    secondary: '#334155',    // Card hover/elevated
    elevated: '#475569',     // Modals, popovers
    subtle: '#0f172a',       // Recessed elements
  },

  // Text Colors (Musical Notation inspired)
  text: {
    primary: '#fef9c3',      // Warm cream (like sheet music)
    secondary: '#cbd5e1',    // Soft gray
    tertiary: '#94a3b8',     // Muted gray
    disabled: '#64748b',     // Very muted
    inverse: '#0f172a',      // For light backgrounds
  },

  // Border Colors (Subtle, functional)
  border: {
    primary: '#334155',      // Default borders
    secondary: '#475569',    // Hover states
    accent: '#3b82f6',       // Focus/active
    subtle: '#1e293b',       // Very subtle dividers
  },

  // Special Effects
  overlay: {
    dark: 'rgba(15, 23, 42, 0.95)',     // Modal backdrop
    light: 'rgba(255, 255, 255, 0.05)', // Subtle highlight
  },
};

/**
 * Spacing Scale (8px base grid - Rams precision)
 * Based on musical intervals (harmonic ratios)
 */
export const spacing = {
  0: 0,
  0.5: 2,   // 1/4 unit
  1: 4,     // 1/2 unit
  2: 8,     // 1 unit (base)
  3: 12,    // 1.5 units
  4: 16,    // 2 units
  5: 20,    // 2.5 units
  6: 24,    // 3 units
  8: 32,    // 4 units (major third)
  10: 40,   // 5 units (perfect fourth)
  12: 48,   // 6 units (perfect fifth)
  16: 64,   // 8 units (octave)
  20: 80,   // 10 units
  24: 96,   // 12 units
  32: 128,  // 16 units (two octaves)
  40: 160,
  48: 192,
  64: 256,
};

/**
 * Border Radius (Minimal, functional)
 */
export const radii = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999,
};

/**
 * Typography Scale
 * Using system fonts for maximum clarity (Rams principle)
 */
export const typography = {
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"SF Mono", "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
    display: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
  },
  fontSize: {
    xs: { size: 11, lineHeight: 16 },
    sm: { size: 13, lineHeight: 20 },
    base: { size: 15, lineHeight: 24 },
    lg: { size: 17, lineHeight: 28 },
    xl: { size: 19, lineHeight: 28 },
    '2xl': { size: 23, lineHeight: 32 },
    '3xl': { size: 29, lineHeight: 36 },
    '4xl': { size: 35, lineHeight: 40 },
    '5xl': { size: 47, lineHeight: 52 },
    '6xl': { size: 59, lineHeight: 64 },
  },
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  letterSpacing: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.02em',
    wider: '0.05em',
  },
};

/**
 * Shadows (Subtle, functional depth)
 */
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.12)',
  DEFAULT: '0 2px 4px 0 rgba(0, 0, 0, 0.16)',
  md: '0 4px 8px -1px rgba(0, 0, 0, 0.20)',
  lg: '0 8px 16px -2px rgba(0, 0, 0, 0.24)',
  xl: '0 12px 24px -4px rgba(0, 0, 0, 0.28)',
  '2xl': '0 24px 48px -8px rgba(0, 0, 0, 0.32)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.12)',
  glow: '0 0 16px rgba(59, 130, 246, 0.3)',  // For active/focus states
  'glow-sonic': '0 0 16px rgba(34, 197, 94, 0.3)',  // Sonic green glow
  'glow-amber': '0 0 16px rgba(251, 191, 36, 0.3)',  // Amber glow
};

/**
 * Animation Durations (Musical timing)
 * Based on musical note values: 16th, 8th, quarter, half
 */
export const transitions = {
  instant: '0ms',
  fast: '150ms',      // 16th note at 100 BPM
  DEFAULT: '200ms',   // 8th note
  slow: '300ms',      // Dotted 8th
  slower: '400ms',    // Quarter note
  slowest: '600ms',   // Dotted quarter
};

/**
 * Animation Easing (Natural, functional)
 */
export const easing = {
  linear: 'linear',
  ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',  // Subtle bounce
};

/**
 * Z-index Layers (Systematic hierarchy)
 */
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  overlay: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  notification: 1080,
};

/**
 * Breakpoints (Responsive design)
 */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

/**
 * Component-specific tokens
 */
export const components = {
  button: {
    height: {
      sm: 32,
      md: 40,
      lg: 48,
      xl: 56,
    },
    minWidth: {
      sm: 64,
      md: 80,
      lg: 96,
      xl: 128,
    },
  },
  input: {
    height: {
      sm: 32,
      md: 40,
      lg: 48,
    },
  },
  card: {
    padding: {
      sm: spacing[3],
      md: spacing[4],
      lg: spacing[6],
      xl: spacing[8],
    },
  },
};

/**
 * Complete theme object
 */
export const theme = {
  colors,
  spacing,
  radii,
  typography,
  shadows,
  transitions,
  easing,
  zIndex,
  breakpoints,
  components,
};

export type Theme = typeof theme;

export default theme;
