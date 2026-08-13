---
status: confirmed
layer: feature-quality
---

# 受入判定 — feat-post-signin-scope-routing

> **履歴注記 (2026-08-13):** 本書の `/sheets` は 2026-08-03 の実測結果を保存した履歴値である。現行の既定着地は後続の appr-034 と正規 contract により `/dashboard`。現在値の根拠には本書でなく `DEFAULT_POST_SIGNIN_LANDING` と正規 contract を使う。

> P07 成果物。正本: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa/task-specs/phase-07-acceptance.md`
> 判定根拠: [test-run-record.md](./test-run-record.md) が記録した P06 実行済み証跡のみ。計画中の作業・未実行のテスト・文書上の宣言は根拠にしない。

## 判定サマリー

goal-spec acceptance 8 件、**8/8 PASS**。

## Acceptance 対応表

| # | Acceptance | 判定 | 根拠 Test ID | 実測内容 |
|---|---|---|---|---|
| 1 | 遷移元が無いサインイン成功で `/sheets` に着地し、`/` に留まらない | PASS | TID-LAND-01, TID-INT-01 | `resolvePostSigninLanding(undefined \| null)` が `DEFAULT_POST_SIGNIN_LANDING` (`/sheets`) を返すこと（純粋関数レベル）に加え、`tenant-oidc-signin-form.tsx` の callbackUrl hidden input 既定値が `/sheets`（旧仕様の固定値 `/` から更新済み、`signin-page.test.tsx` で SSR 初期値を確認）であることを結合レベルでも検証した |
| 2 | 戻り先に絶対 URL・スキーム付き・protocol-relative を与えても外部へ遷移せず既定着地へ落ちる | PASS | TID-LAND-03〜07 | `https://evil.com/phish`（絶対URL）、`javascript:alert(1)`（スキーム付き）、`//evil.com`（protocol-relative）、`/\evil.com`（バックスラッシュトリック）、`http://user@evil.com`（資格情報付きURL）の 5 分類すべてで `resolvePostSigninLanding` が `/sheets` へフォールバックすることを実測。判定は文字列前方一致ではなく `new URL(value, RESOLUTION_BASE_ORIGIN).origin === RESOLUTION_BASE_ORIGIN` によるパース方式で行っており、前方一致依存の抜け穴を作らない |
| 3 | 認証済み session で `/` を開くと既定着地へ redirect される | PASS | TID-INT-02 | `HomePage`（`apps/hub/src/app/page.tsx`）を `verifySessionToken` が `ok: true` を返す状態で render し、`redirect('/sheets')` が正確に 1 回だけ呼ばれることを実測（`toHaveBeenCalledExactlyOnceWith`） |
| 4 | 業務画面 6 種が通常のブラウザ操作で `403 missing_tenant_scope` にならない | PASS | TID-SCOPE-02〜04, TID-INT-04 | `/sheets`, `/sheets/new`, `/sheets/{id}`, `/catalog`, `/catalog/releases`, `/catalog/{id}` の 6 種すべてに、session cookie のみ（明示ヘッダー無し）で `authorize()` を呼び `allowed: true` になることを it.each で実測 |
| 5 | 明示ヘッダーと session scope が併存し不一致のとき `ambiguous_scope` で拒否される | PASS | TID-SCOPE-05 | 明示ヘッダーが `ws-1`、session cookie が `ws-2` を申告する要求で `authorize()` が `{ allowed: false, reason: 'ambiguous_scope', status: 403 }` を返すことを実測。tenantId は比較対象にしない設計（`mergeScopes` のコメント参照）だが、workspaceId の不一致は独立した二重申告として検出する |
| 6 | どちらの scope 入力も無い場合は `missing_tenant_scope` のままである（deny-by-default 非退行） | PASS | TID-SCOPE-01, TID-BIND-04 | 明示ヘッダー・session cookie とも無い要求で `missing_tenant_scope` を実測。加えて、所属 workspace が 2 件以上で cookie が無い場合に `resolveActiveWorkspaceId` が `null` を返す（未確定のまま自動選択しない）ことも実測し、design-review 指摘2（複数 workspace 所属時の回帰）を再現的に防いでいることを確認した |
| 7 | principal の所属検証を通らない workspace は session へ束縛されない | PASS | TID-BIND-01, TID-BIND-02 | cookie が所属内の workspaceId ならそれを採用し、所属外の workspaceId なら `null`（直前値へフォールバックしない）ことを実測 |
| 8 | 戻り先の解決結果に対しても `authorize()` が適用される | PASS | TID-INT-05 | 着地先解決の結果 path (`/sheets`) へ session scope 無しでアクセスすると `missing_tenant_scope`、所属外 workspace の session cookie では `workspace_not_member` になることを実測。redirect 先が認可の迂回路になっていないことを確認した |

## 判定方針の遵守確認

- 判定は P06 が実際に実行した自動テストの結果（`test-run-record.md`）のみを根拠とし、未実行のテストや文書上の宣言を根拠に PASS としていない。
- acceptance 4（業務画面 6 種の到達性）は仕様上「単体テストだけでは成立を示せない」ため、`authorize()` を実際に呼び出す結合レベルの `TID-INT-04` を根拠に含めている（単体レベルの `TID-SCOPE-*` のみで判定していない）。
- 8 件全てに 1 件以上の実行済み Test ID が対応しており、根拠のない PASS は 0 件。

## 被覆漏れ

**0 件**（test-design.md 「5. Acceptance 8件との対応表」と本判定表は一致し、全 acceptance に実行済み Test ID が対応する）。

## 再実行コマンド

```bash
cd apps/hub
/opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run --coverage
```

または個別:

```bash
cd apps/hub
node ../../node_modules/vitest/vitest.mjs run tests/authz/scope-resolution.test.ts
node ../../node_modules/vitest/vitest.mjs run tests/auth/session-workspace-binding.test.ts
node ../../node_modules/vitest/vitest.mjs run tests/routing/post-signin-landing.test.ts
```
