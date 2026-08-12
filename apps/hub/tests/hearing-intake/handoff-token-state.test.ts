import type { HearingShareTokenListItem } from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';

import { hearingShareTokenState } from '../../src/features/hearing-intake/components/handoff-tokens-panel.js';

const NOW_MS = 1_800_000_000_000;

function token(overrides: Partial<HearingShareTokenListItem> = {}): HearingShareTokenListItem {
  return {
    id: 'token-1',
    audience: 'harness_creator',
    expires_at: NOW_MS + 60_000,
    revoked_at: null,
    last_accessed_at: null,
    access_count: 0,
    created_at: NOW_MS - 60_000,
    ...overrides,
  };
}

describe('共有トークンの表示状態', () => {
  it('失効を最優先し、期限前だけを有効と表示する', () => {
    expect(hearingShareTokenState(token(), NOW_MS)).toBe('有効');
    expect(hearingShareTokenState(token({ expires_at: NOW_MS }), NOW_MS)).toBe('期限切れ');
    expect(hearingShareTokenState(token({ expires_at: NOW_MS - 1, revoked_at: NOW_MS - 2 }), NOW_MS)).toBe('失効済み');
  });
});
