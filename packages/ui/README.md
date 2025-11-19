# @toposonics/ui

Shared UI components and design tokens for TopoSonics applications.

## Purpose

This package provides:

- **Design tokens**: Colors, spacing, typography, shadows, etc.
- **Basic components**: Button, Card (more to come)
- **Theming utilities**: Consistent styling across web and mobile

## Installation

```bash
pnpm add @toposonics/ui
```

## Usage

### Design Tokens

```typescript
import { theme, colors, spacing, typography } from '@toposonics/ui';

// Access colors
const primaryColor = colors.primary[600]; // '#0284c7'
const bgColor = colors.background.primary; // '#0a0a0f'

// Use spacing
const padding = spacing[4]; // 16

// Typography
const fontSize = typography.fontSize.lg.size; // 18
const lineHeight = typography.fontSize.lg.lineHeight; // 28
```

### Components (Web)

```tsx
import { Button, Card } from '@toposonics/ui';

function MyApp() {
  return (
    <Card title="Generate Soundscape" subtitle="Upload an image to begin">
      <p>Upload your image here...</p>
      <Button variant="primary" size="lg">
        Generate
      </Button>
    </Card>
  );
}
```

### With Tailwind CSS

The components use Tailwind classes. In your web app, extend your Tailwind config:

```js
// tailwind.config.ts
import { theme } from '@toposonics/ui';

export default {
  theme: {
    extend: {
      colors: theme.colors,
      spacing: theme.spacing,
      // ... other tokens
    },
  },
};
```

### React Native Adaptation

The theme tokens can be used in React Native StyleSheet:

```tsx
import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@toposonics/ui';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    padding: spacing[4],
  },
  text: {
    color: colors.text.primary,
    fontSize: typography.fontSize.base.size,
  },
});
```

Note: React components (Button, Card) are designed for web. Create React Native versions using the same design tokens.

## Design System

### Color Palette

- **Primary**: Blue tones for main actions and branding
- **Secondary**: Purple tones for accents
- **Grays**: Comprehensive neutral scale for backgrounds and text
- **Semantic**: Success (green), Warning (yellow), Error (red), Info (blue)
- **Dark theme**: Background and surface colors optimized for dark UI

### Spacing Scale

Based on 4px increments: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128

### Typography Scale

- **Font families**: System sans-serif and monospace
- **Sizes**: xs (12px) to 5xl (48px)
- **Weights**: Normal (400), Medium (500), Semibold (600), Bold (700)

### Components

#### Button

Props:
- `variant`: primary, secondary, outline, ghost, danger
- `size`: sm, md, lg
- `disabled`: boolean
- `loading`: boolean
- `fullWidth`: boolean

#### Card

Props:
- `title`: string
- `subtitle`: string
- `variant`: default, elevated, bordered, ghost
- `padding`: none, sm, md, lg
- `onClick`: () => void (makes card interactive)
- `headerActions`: React.ReactNode

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Type check
pnpm typecheck
```

## Future Components

- Input / TextArea
- Select / Dropdown
- Slider
- Modal / Dialog
- Toast / Notification
- Tabs
- Toggle / Switch
- Progress indicators
