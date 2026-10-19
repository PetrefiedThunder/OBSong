import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { KeyType, MappingMode, ScaleType, TopoPreset } from '@toposonics/types';

vi.mock('@toposonics/core-audio', () => import('../../../../../packages/core-audio/src'));

import { MappingControls } from '../MappingControls';

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const MODE_LABELS = ['Linear Landscape', 'Depth Ridge', 'Multi-Voice'] as const;

function renderControls(musicalKey: KeyType, mappingMode: MappingMode) {
  return renderToStaticMarkup(
    createElement(MappingControls, {
      musicalKey,
      scale: 'C_MAJOR' satisfies ScaleType,
      mappingMode,
      presetId: 'sine-soft',
      selectedTopoPreset: null satisfies TopoPreset | null,
      onKeyChange: () => {},
      onScaleChange: () => {},
      onMappingModeChange: () => {},
      onPresetChange: () => {},
      onTopoPresetChange: () => {},
    })
  );
}

function buttonPressed(html: string, label: string): string | null {
  const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map((match) => ({
    pressed: match[1].match(/\baria-pressed="([^"]*)"/)?.[1] ?? null,
    text: match[2].replace(/<[^>]+>/g, '').trim(),
  }));
  // Key labels are the whole button text. Mapping-mode labels are followed by a description.
  const match =
    buttons.find((button) => button.text === label) ??
    buttons.find((button) => button.text.startsWith(label));
  return match?.pressed ?? null;
}

describe('MappingControls programmatic selection', () => {
  it('exposes the selected musical key and mapping mode as pressed', () => {
    const html = renderControls('D', 'DEPTH_RIDGE');

    expect(buttonPressed(html, 'D')).toBe('true');
    expect(buttonPressed(html, 'Depth Ridge')).toBe('true');
    for (const key of KEYS) {
      if (key === 'D') continue;
      expect(buttonPressed(html, key)).toBe('false');
    }
    for (const label of MODE_LABELS) {
      if (label === 'Depth Ridge') continue;
      expect(buttonPressed(html, label)).toBe('false');
    }
  });

  it('moves the pressed state when the controlled selection changes', () => {
    const first = renderControls('C', 'LINEAR_LANDSCAPE');
    const second = renderControls('F#', 'MULTI_VOICE');

    expect(buttonPressed(first, 'C')).toBe('true');
    expect(buttonPressed(first, 'F#')).toBe('false');
    expect(buttonPressed(first, 'Linear Landscape')).toBe('true');
    expect(buttonPressed(second, 'C')).toBe('false');
    expect(buttonPressed(second, 'F#')).toBe('true');
    expect(buttonPressed(second, 'Multi-Voice')).toBe('true');
    expect(buttonPressed(second, 'Linear Landscape')).toBe('false');
  });
});
