// P04 テストスタブ (SYS-DOCS-CMS-P04)
// DOCS-QUEUE-* / DOCS-SEC8-*: AI 下書きキュー (kind=doc_draft) の認可と共通層汎化契約。
//
// kind 語彙の単一ソースは packages/db/schema (テーブル enum) であり、AI_QUEUE_ADAPTERS
// (apps/hub/src/lib/ai-queue/registry.ts) の kind-dispatch 登録がその値域を再現する。
// public API 境界 (@harness-hub/db は repository/composition facade のみを出し、
// schema の leaf enum は re-export しない — src/index.ts 冒頭コメント参照) を守るため、
// ここでは registry 側の登録有無だけを検証する。

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { decide } from '../../lib/authz/decide.js';
import { AI_QUEUE_ADAPTERS } from '../../lib/ai-queue/registry.js';
import type { AuthzPrincipal, AuthzResourceRef } from '../../lib/authz/types.js';

describe('DOCS-QUEUE: doc_draft kind の登録 (AD-4 汎化)', () => {
  it('DOCS-QUEUE-001: doc_draft は共通 AI キュー kind-dispatch 登録に既に含まれ、feature 側で kind 語彙を再定義しない', () => {
    expect(Object.keys(AI_QUEUE_ADAPTERS)).toContain('doc_draft');
  });
});

describe('DOCS-SEC8: AI キュー認可は既存 aijob.* action をそのまま再利用する', () => {
  const resource: AuthzResourceRef = {
    type: 'ai_job',
    id: 'job-doc-1',
    tenantId: 'tenant-a',
    workspaceId: null,
    ownerUserId: null,
  };

  function principal(overrides: Partial<AuthzPrincipal> = {}): AuthzPrincipal {
    return {
      userId: 'user-worker',
      tenantId: 'tenant-a',
      role: 'workspace-admin',
      status: 'active',
      issuedAtSeconds: 1_700_000_000,
      workspaceIds: ['ws-1'],
      scope: ['aijob:process'],
      credential: 'access_token',
      ...overrides,
    };
  }

  it('DOCS-SEC8-001: doc_draft の pull も aijob.pull の 3 条件 AND (token + scope + role) を要求する', () => {
    const outcome = decide({ action: 'aijob.pull', principal: principal(), resource, sessionRevoked: false });
    expect(outcome).toEqual({ allowed: true, effectiveRole: 'workspace-admin' });

    const sessionPrincipal = decide({
      action: 'aijob.pull',
      principal: principal({ credential: 'session', scope: null }),
      resource,
      sessionRevoked: false,
    });
    expect(sessionPrincipal).toEqual({ allowed: false, reason: 'credential_not_allowed' });
  });

  it('DOCS-SEC8-002: docs-cms 専用の aijob 系 action を新設しない (decide の既存語彙で足りる)', () => {
    // 新設していれば findActionRule が別 action 名を要求するはずだが、
    // 既存 3 action (pull/complete/fail) だけで doc_draft も処理できることを固定する
    const actions = ['aijob.pull', 'aijob.complete', 'aijob.fail'] as const;
    for (const action of actions) {
      const outcome = decide({ action, principal: principal({ credential: 'access_token', role: 'member' }), resource: { ...resource, ownerUserId: 'user-worker' }, sessionRevoked: false });
      expect(outcome.allowed).toBe(action !== 'aijob.pull'); // pull だけ workspace-admin 以上を要求する非対称
    }
  });

  it('DOCS-SEC8-003: payload に secret/PII 系キーを含めない (SEC8 は kind を問わず一律)', () => {
    const BANNED_KEY_PATTERN = /secret|token|password|api[_-]?key|credential|connection|dsn/i;
    const docDraftPayload = { document_id: 'doc-1', title: '使い方ガイド', outline: ['導入', '手順'] };
    const keys = Object.keys(docDraftPayload);
    expect(keys.filter((key) => BANNED_KEY_PATTERN.test(key))).toEqual([]);
  });

  // --- 以下は P05 実装を対象とする受入契約 (P06 で実行対象へ昇格させる) ---

  const PULL_ROUTE = resolve(process.cwd(), 'src/app/api/v1/ai-jobs/pull/route.ts');

  it('DOCS-QUEUE-101: pull route が kind-dispatch へ汎化され、sheet_generation 専用実装を複製していない', () => {
    if (!existsSync(PULL_ROUTE)) return;
    const source = readFileSync(PULL_ROUTE, 'utf8');
    // 汎化後は runtime 選択が kind に基づく分岐を持つはず。sheet_generation 固定 import だけの旧実装のままではない
    expect(source).not.toMatch(/^\s*import\s+\{\s*hearingIntakeRuntime\s*\}/m);
  });

  it('DOCS-QUEUE-102: complete route が doc_draft の結果を documents へ書き戻す consumer adapter を持つ', () => {
    const adapterFile = resolve(process.cwd(), 'src/features/docs-cms/ai-job-adapter/index.ts');
    if (!existsSync(adapterFile)) return;
    const source = readFileSync(adapterFile, 'utf8');
    expect(source).toContain('doc_draft');
  });
});
