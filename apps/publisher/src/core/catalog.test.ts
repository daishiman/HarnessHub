import { describe, expect, it } from 'vitest';

import { buildCatalogEntry } from './catalog.js';
import type { CompletedManifest } from './manifest.js';

describe('buildCatalogEntry', () => {
  it('補完済み manifest から表示用エントリを組み立てる (owner あり)', () => {
    const manifest: CompletedManifest = {
      name: 'demo-skill',
      version: '1.2.3',
      description: '説明文',
      owner: 'team-a',
      visibility: 'workspace',
      summary: '要約文',
    };

    expect(buildCatalogEntry(manifest)).toEqual({
      name: 'demo-skill',
      version: '1.2.3',
      description: '説明文',
      owner: 'team-a',
      visibility: 'workspace',
      summary: '要約文',
    });
  });

  it('owner が null の manifest でもそのまま null を通す (公開可否の判定はしない)', () => {
    const manifest: CompletedManifest = {
      name: 'demo-skill',
      version: '1.0.0',
      description: '説明文',
      owner: null,
      visibility: 'private',
      summary: '説明文',
    };

    expect(buildCatalogEntry(manifest).owner).toBeNull();
  });
});
