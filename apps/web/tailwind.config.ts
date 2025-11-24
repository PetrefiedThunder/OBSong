import type { Config } from 'tailwindcss';
import { theme as uiTheme } from '@toposonics/ui';

const toPxValues = (values: Record<string, number>) =>
  Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, `${value}px`])
  );

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    // Include UI package components
    './node_modules/@toposonics/ui/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: uiTheme.colors,
      spacing: toPxValues(uiTheme.spacing),
      borderRadius: toPxValues(uiTheme.radii),
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: uiTheme.typography.fontFamily.mono,
        display: uiTheme.typography.fontFamily.display,
      },
      fontSize: Object.entries(uiTheme.typography.fontSize).reduce(
        (acc, [key, value]) => {
          acc[key] = `${value.size}px`;
          return acc;
        },
        {} as Record<string, string>
      ),
      boxShadow: uiTheme.shadows,
      transitionDuration: uiTheme.transitions,
      zIndex: toPxValues(uiTheme.zIndex),
    },
  },
  plugins: [],
};

export default config;
