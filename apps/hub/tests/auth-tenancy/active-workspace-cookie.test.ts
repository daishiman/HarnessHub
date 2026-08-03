// spec: harness-hub-post-signin-workspace-scope-addendum §A/D (AC7: principal 所属検証を通らない workspace は束縛されない)
import { describe, expect, it } from 'vitest';

import { ACTIVE_WORKSPACE_COOKIE_NAME, resolveActiveWorkspace } from '../../src/lib/auth/session.js';

describe('resolveActiveWorkspace', () => {
  it('cookie が無ければ null', () => {
    expect(resolveActiveWorkspace(null, ['ws-1'])).toBeNull();
  });

  it('所属している workspace の cookie はそのまま採用する', () => {
    expect(resolveActiveWorkspace(`${ACTIVE_WORKSPACE_COOKIE_NAME}=ws-1`, ['ws-1', 'ws-2'])).toBe('ws-1');
  });

  it('AC7: principal が所属していない workspace は cookie にあっても採用しない', () => {
    expect(resolveActiveWorkspace(`${ACTIVE_WORKSPACE_COOKIE_NAME}=ws-9`, ['ws-1', 'ws-2'])).toBeNull();
  });

  it('他 cookie に紛れていても名前で正しく取り出す', () => {
    const cookie = `other=1; ${ACTIVE_WORKSPACE_COOKIE_NAME}=ws-2; another=2`;
    expect(resolveActiveWorkspace(cookie, ['ws-1', 'ws-2'])).toBe('ws-2');
  });
});
