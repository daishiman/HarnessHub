/**
 * TID-BIND-01〜05: session への active workspace 束縛 (`resolveActiveWorkspaceId`)。
 * TID-BIND-04 は design-review.md 指摘2 (複数 workspace 所属 + cookie 無しの回帰) に対応する。
 *
 * feat-post-signin-scope-routing P06 (docs/features/feat-post-signin-scope-routing/test-design.md)
 */
import { describe, expect, it } from 'vitest';

import { ACTIVE_WORKSPACE_COOKIE_NAME, resolveActiveWorkspaceId } from '../../src/lib/auth/session.js';

function cookie(workspaceId: string): string {
  return `${ACTIVE_WORKSPACE_COOKIE_NAME}=${workspaceId}`;
}

describe('TID-BIND: session への active workspace 束縛', () => {
  it('TID-BIND-01: cookie が所属内の workspaceId -> その workspaceId を採用', () => {
    expect(resolveActiveWorkspaceId(cookie('ws-1'), ['ws-1', 'ws-2'])).toBe('ws-1');
  });

  it('TID-BIND-02: cookie が所属外の workspaceId -> null (直前値へフォールバックしない)', () => {
    expect(resolveActiveWorkspaceId(cookie('ws-9'), ['ws-1', 'ws-2'])).toBeNull();
  });

  it('TID-BIND-03: cookie 無し・所属 workspaceIds が1件のみ -> その1件を自動採用', () => {
    expect(resolveActiveWorkspaceId(null, ['ws-1'])).toBe('ws-1');
  });

  it('TID-BIND-04: cookie 無し・所属 workspaceIds が2件以上 -> null (未確定のまま自動選択しない)', () => {
    expect(resolveActiveWorkspaceId(null, ['ws-1', 'ws-2'])).toBeNull();
  });

  it('TID-BIND-05: 所属 workspace が無い -> null', () => {
    expect(resolveActiveWorkspaceId(cookie('ws-1'), [])).toBeNull();
  });
});
