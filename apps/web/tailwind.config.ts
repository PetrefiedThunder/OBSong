import type { Config } from 'tailwindcss';
import { theme as uiTheme } from '@toposonics/ui';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: uiTheme.colors.primary,
        secondary: uiTheme.colors.secondary,
        surface: {
          ...uiTheme.colors.surface,
          subtle: '#14141a',
        },
        background: {
          primary: uiTheme.colors.surface.primary,
        },
        text: {
          primary: '#f9fafb',
          secondary: '#d1d5db',
          tertiary: '#9ca3af',
          disabled: '#6b7280',
        },
        border: {
          primary: '#374151',
          secondary: '#4b5563',
          subtle: '#1f2937',
        },
        sonic: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
        accent: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        graphite: {
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          950: '#030712',
        },
        notation: {
          400: '#fcd34d',
        },
        error: {
          light: '#f87171',
          DEFAULT: '#ef4444',
          dark: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['SF Mono', 'Cascadia Code', 'Roboto Mono', 'Consolas', 'Courier New', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-sonic': '0 0 18px rgba(34, 197, 94, 0.35)',
        'glow-amber': '0 0 18px rgba(245, 158, 11, 0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
