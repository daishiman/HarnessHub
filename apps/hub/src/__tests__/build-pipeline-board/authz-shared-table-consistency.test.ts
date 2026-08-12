/**
 * BPB-B9-*: build 関連 action (`builds.read` / `builds.stage_change` / `publish.approve`) が
 * 単一の共有 `ACTION_RULES` テーブルに同居し、admin 限定の意味論が食い違っていないことを固定する
 * (SYS-BUILD-PIPELINE-BOARD-P04 / P03 独立設計レビュー B9 妥当性確認)。
 *
 * 表引きが二箇所に分かれると「builds.stage_change だけ admin だが publish.approve は member」
 * のような黙った不整合が起きうる。この test は表の中身そのものを検証し、実装 (`decide`) を経由しない。
 */

import { describe, expect, it } from 'vitest';

import { ACTION_RULES } from '../../lib/authz/rules.js';
import { atLeast } from '../../lib/authz/types.js';

describe('BPB-B9: 共有 ACTION_RULES テーブルの整合性', () => {
  it('BPB-B9-001: builds.read / builds.stage_change / publish.approve が同一テーブルに存在する', () => {
    expect(ACTION_RULES).toHaveProperty('builds.read');
    expect(ACTION_RULES).toHaveProperty('builds.stage_change');
    expect(ACTION_RULES).toHaveProperty('publish.approve');
  });

  it('BPB-B9-002: builds.stage_change と publish.approve は同じ workspace-admin 以上を要求する (工程操作と公開承認の権限が食い違わない)', () => {
    expect(ACTION_RULES['builds.stage_change']?.minRole).toBe('workspace-admin');
    expect(ACTION_RULES['publish.approve']?.minRole).toBe('workspace-admin');
    expect(ACTION_RULES['builds.stage_change']?.minRole).toBe(ACTION_RULES['publish.approve']?.minRole);
  });

  it('BPB-B9-003: builds.read は member 以上で読める (閲覧は工程操作より広く許可される)', () => {
    expect(ACTION_RULES['builds.read']?.minRole).toBe('member');
    expect(atLeast('member', ACTION_RULES['builds.read']?.minRole ?? 'provider-admin')).toBe(true);
  });

  it('BPB-B9-004: builds.read/builds.stage_change/publish.approve はすべて session credential のみで、token 経由の抜け道が無い', () => {
    for (const action of ['builds.read', 'builds.stage_change', 'publish.approve'] as const) {
      expect(ACTION_RULES[action]?.credential).toBe('session');
    }
  });

  it('BPB-B9-005: builds.read/builds.stage_change は selfOnly=false (workspace 全体の Build を対象にする。個人所有物に限定しない)', () => {
    expect(ACTION_RULES['builds.read']?.selfOnly).toBe(false);
    expect(ACTION_RULES['builds.stage_change']?.selfOnly).toBe(false);
  });
});
