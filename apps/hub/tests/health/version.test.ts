// HF-A3-HEALTH-004: /health の version が「いま配信されている版」を指すこと (follow-up H-01 の是正)
import { describe, expect, it } from 'vitest';

import { resolveVersion } from '../../src/app/health/runtime-env.js';

describe('HF-A3-HEALTH-004: version の解決', () => {
  it('Cloudflare の version metadata があればそれを返す', () => {
    const version = resolveVersion({ CF_VERSION_METADATA: { id: 'fa8b36af-ab62-4520-ad34-ece1ca940125' } });
    expect(version).toBe('fa8b36af-ab62-4520-ad34-ece1ca940125');
  });

  it('version metadata を HUB_VERSION より優先する', () => {
    // rollback で前の版へ戻したとき、build 時に焼き込んだ HUB_VERSION は嘘をつく。
    // 実際に配信されている版を指す metadata を常に優先しなければ、
    // 障害時に「どの版が動いているか」を応答から特定できずロールバック判断を誤る。
    const version = resolveVersion({
      CF_VERSION_METADATA: { id: 'deployed-version' },
      HUB_VERSION: 'built-version',
    });
    expect(version).toBe('deployed-version');
  });

  it('metadata が無ければ HUB_VERSION へ退避する', () => {
    expect(resolveVersion({ HUB_VERSION: 'built-version' })).toBe('built-version');
  });

  it('どちらも無ければ unknown を返す (schema の min 1 文字を満たす)', () => {
    expect(resolveVersion({})).toBe('unknown');
  });

  it('空文字・空白のみの値は採用しない', () => {
    expect(resolveVersion({ CF_VERSION_METADATA: { id: '   ' }, HUB_VERSION: '  ' })).toBe('unknown');
  });

  it('前後の空白を落として返す', () => {
    expect(resolveVersion({ CF_VERSION_METADATA: { id: '  abc123  ' } })).toBe('abc123');
  });
});
