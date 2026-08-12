import { describe, expect, it } from 'vitest';

import { externalDocumentEtag, revisionFromIfMatch } from '../../features/docs-cms/external-sync.js';

describe('DOCS-EXT HTTP precondition helpers', () => {
  it('revisionをstrong ETagへ往復する', () => {
    expect(externalDocumentEtag(3)).toBe('"docs-import-3"');
    expect(revisionFromIfMatch('"docs-import-3"')).toBe(3);
  });

  it('未指定と不正値を区別する', () => {
    expect(revisionFromIfMatch(null)).toBeUndefined();
    expect(revisionFromIfMatch('*')).toBeNull();
    expect(revisionFromIfMatch('W/"docs-import-1"')).toBeNull();
  });
});
