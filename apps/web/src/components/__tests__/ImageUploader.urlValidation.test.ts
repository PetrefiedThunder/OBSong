import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@toposonics/ui', () => ({
  Button: () => null,
}));

import { ImageUploader, isSafeImageUrl } from '../ImageUploader';

// isSafeImageUrl reads window.location.origin as its URL base, which does not
// exist in the vitest node environment; stub the minimum surface it needs.
beforeEach(() => {
  vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } });
});

describe('isSafeImageUrl', () => {
  it('allows blob: URLs created for local previews', () => {
    expect(isSafeImageUrl('blob:http://localhost:3000/9d7c1a2b-3f4e-5a6b-8c9d-0e1f2a3b4c5d')).toBe(true);
  });

  it('allows data:image URLs', () => {
    expect(isSafeImageUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
  });

  it('rejects javascript: URLs', () => {
    expect(isSafeImageUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects non-image data: URLs', () => {
    expect(isSafeImageUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('rejects remote http(s) URLs and relative paths', () => {
    expect(isSafeImageUrl('https://evil.example/payload.svg')).toBe(false);
    expect(isSafeImageUrl('/uploads/avatar.png')).toBe(false);
  });
});

describe('ImageUploader preview rendering', () => {
  function renderPreview(preview: string | null) {
    return renderToStaticMarkup(
      createElement(ImageUploader, {
        onImageSelected: () => {},
        preview,
      })
    );
  }

  it('does not write an untrusted preview URL into the DOM', () => {
    const html = renderPreview('javascript:alert(1)');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('<img');
  });

  it('renders a validated blob preview', () => {
    const url = 'blob:http://localhost:3000/9d7c1a2b-3f4e-5a6b-8c9d-0e1f2a3b4c5d';
    const html = renderPreview(url);
    expect(html).toContain(`src="${url}"`);
  });
});
