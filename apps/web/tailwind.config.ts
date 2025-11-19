import type { Config } from 'tailwindcss';
import { theme as uiTheme } from '@toposonics/ui';

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
      spacing: uiTheme.spacing,
      borderRadius: uiTheme.radii,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: Object.entries(uiTheme.typography.fontSize).reduce(
        (acc, [key, value]) => {
          acc[key] = `${value.size}px`;
          return acc;
        },
        {} as Record<string, string>
      ),
      boxShadow: uiTheme.shadows,
      transitionDuration: uiTheme.transitions,
      zIndex: uiTheme.zIndex,
    },
  },
  plugins: [],
};

export default config;
