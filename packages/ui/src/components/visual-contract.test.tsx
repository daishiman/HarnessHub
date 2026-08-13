import type { ComponentType } from 'react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { TextButton } from './TextButton.js';
import { Thumbnail } from './Thumbnail.js';

describe('視覚契約を閉じた共通部品', () => {
  it('TextButton は JavaScript 呼出しから渡された style/className でも canonical 表現を上書きさせない', () => {
    const UnsafeTextButton = TextButton as ComponentType<Record<string, unknown>>;
    const html = renderToStaticMarkup(
      createElement(
        UnsafeTextButton,
        { style: { color: '#ff00ff', borderRadius: '99px' }, className: 'escape-hatch' },
        '操作',
      ),
    );

    expect(html).not.toContain('#ff00ff');
    expect(html).not.toContain('99px');
    expect(html).not.toContain('escape-hatch');
    expect(html).toContain('var(--hh-color-primary)');
  });

  it('Thumbnail は意味的 prop だけで compact 幅と前余白を選べる', () => {
    const html = renderToStaticMarkup(
      createElement(Thumbnail, {
        src: '/sample.png',
        size: 'block',
        width: 'compact',
        spacingBefore: 'section',
      }),
    );

    expect(html).toContain('width:8rem');
    expect(html).toContain('margin-block-start:var(--hh-space-3)');
    expect(html).toContain('border-radius:var(--hh-radius-md)');
  });
});
