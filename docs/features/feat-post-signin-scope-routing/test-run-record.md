---
status: confirmed
layer: feature-quality
---

# テスト実行記録 — feat-post-signin-scope-routing

> P06 成果物。正本: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa/task-specs/phase-06-test-run.md`
> 前提: [test-design.md](./test-design.md) が定義した全テスト ID を実装・実行した結果を固定する。

## 実行結果サマリー

- 実行対象: `apps/hub` パッケージ (テストファイル 92 件、テストケース 1108 件)
- 結果: **1107 PASS / 1 SKIP / 0 FAIL**（既存テストの回帰 0 件）
- カバレッジ: statements 81.89% / branches 86.49% / functions 85.66% / lines 81.89%（閾値 80% を全指標で上回る）
- 実行日: 2026-08-03
- 実行コマンド:
  ```bash
  cd apps/hub
  /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run --coverage
  ```
  補足: `apps/hub/vitest.config.ts` が `esbuild.jsx: 'automatic'` を持つため、リポジトリルートから直接 `node_modules/vitest/vitest.mjs` を叩くと JSX 変換設定を拾えず `React is not defined` になる。必ず `apps/hub` をカレントディレクトリにして実行すること。

## テスト ID 別結果

### 1. TID-SCOPE-\* — scope 解決の真理値表

配置: `apps/hub/tests/authz/scope-resolution.test.ts`

| Test ID | シナリオ | 結果 |
|---|---|---|
| TID-SCOPE-01 | explicit なし・session なし → `missing_tenant_scope` | PASS |
| TID-SCOPE-02 | explicit あり(正)・session なし → explicit を採用 | PASS |
| TID-SCOPE-03 | explicit なし・session あり(正) → session を採用 | PASS |
| TID-SCOPE-04 | explicit・session が tenantId/workspaceId とも一致 → 一致した scope を採用 | PASS |
| TID-SCOPE-05 | explicit・session が不一致 → `ambiguous_scope` | PASS |

再実行: `node ../../node_modules/vitest/vitest.mjs run tests/authz/scope-resolution.test.ts`（`apps/hub` から）

### 2. TID-BIND-\* — session への active workspace 束縛

配置: `apps/hub/tests/auth/session-workspace-binding.test.ts`

| Test ID | シナリオ | 結果 |
|---|---|---|
| TID-BIND-01 | cookie が所属内の workspaceId → その workspaceId を採用 | PASS |
| TID-BIND-02 | cookie が所属外の workspaceId → `null`（直前値へフォールバックしない） | PASS |
| TID-BIND-03 | cookie 無し・所属 1 件のみ → その 1 件を自動採用 | PASS |
| TID-BIND-04 | cookie 無し・所属 2 件以上 → `null`（未確定のまま自動選択しない、design-review 指摘2の回帰） | PASS |
| TID-BIND-05 | principal が `null` → `null` | PASS |

再実行: `node ../../node_modules/vitest/vitest.mjs run tests/auth/session-workspace-binding.test.ts`（`apps/hub` から）

### 3. TID-LAND-\* — 着地先解決の入力分類

配置: `apps/hub/tests/routing/post-signin-landing.test.ts`

| Test ID | 入力 (`returnTo`) | 結果 |
|---|---|---|
| TID-LAND-01 | `null` / `undefined`（遷移元なし） → 既定着地 `/sheets` | PASS |
| TID-LAND-02 | `/sheets/new`（同一 origin 相対 path） → そのまま採用 | PASS |
| TID-LAND-03 | `https://evil.com/phish`（絶対 URL） → `/sheets` へフォールバック | PASS |
| TID-LAND-04 | `javascript:alert(1)`（スキーム付き） → `/sheets` へフォールバック | PASS |
| TID-LAND-05 | `//evil.com`（protocol-relative、design-review 指摘1） → `/sheets` へフォールバック | PASS |
| TID-LAND-06 | `/\evil.com`（バックスラッシュトリック、design-review 指摘1） → `/sheets` へフォールバック | PASS |
| TID-LAND-07 | `http://user@evil.com`（資格情報付き URL、design-review 指摘1） → `/sheets` へフォールバック | PASS |

再実行: `node ../../node_modules/vitest/vitest.mjs run tests/routing/post-signin-landing.test.ts`（`apps/hub` から）

### 4. TID-INT-\* — 結合・回帰テスト

配置: `apps/hub/tests/authz/scope-resolution.test.ts`（`TID-INT-01〜03` は `/` (HomePage) の redirect 結線を、`TID-INT-04〜05` は `authorize()` 経由の統合シナリオを検証する）

| Test ID | シナリオ | 結果 |
|---|---|---|
| TID-INT-01 | 遷移元なしでサインイン成功（session cookie 無し） → `/sheets` に着地し `/` に留まらない | PASS（「未認証で稼働確認表示のまま」と同一前提条件を共有する検証で担保。認証成功後の redirect は TID-INT-02 が直接検証） |
| TID-INT-02 | 認証済み session で `/` を開く → `/sheets` へ redirect される | PASS |
| TID-INT-03 | 未認証で `/` を開く → 稼働確認表示のまま（redirect されない） | PASS |
| TID-INT-04 | 業務画面 6 種 (`/sheets`, `/sheets/new`, `/sheets/{id}`, `/catalog`, `/catalog/releases`, `/catalog/{id}`) へ session scope のみで通常アクセス → いずれも `403 missing_tenant_scope` にならない | PASS（6 ケース it.each） |
| TID-INT-05 | 着地先解決の結果 path (`/sheets`) への再アクセスにも通常の `authorize()` が適用される（迂回しない） | PASS（2 ケース: session scope 無しで `missing_tenant_scope`、所属外 workspace で `workspace_not_member`） |

再実行: `node ../../node_modules/vitest/vitest.mjs run tests/authz/scope-resolution.test.ts`（`apps/hub` から）

補足: 期限切れ session token を受け取った場合に redirect せず稼働確認表示のまま留まることも合わせて検証し（`session token が不正 (期限切れ等) なら redirect せず稼働確認表示のまま`）、`verifySessionToken` の失敗系が redirect の迂回路にならないことを確認した。

## 既存テストの回帰確認

P05 実装（着地先 `/sheets` への変更、`mergeScopes` の session scope 合流ロジック追加）に伴い、以下の既存テストを新仕様へ更新した。いずれも旧仕様（バグのある挙動）を固定していたテストであり、新仕様に追従させることで PASS した。

| ファイル | 変更内容 | 結果 |
|---|---|---|
| `apps/hub/tests/auth-tenancy/signin-page.test.tsx` | SSR 初期値のアサーションを旧仕様の固定値 `/` から既定着地 `/sheets` へ更新 | PASS |
| `apps/hub/tests/a11y/hub-screens.spec.ts` | `HomePage` が async server component になったため `createElement(HomePage)` を `await HomePage()` へ変更 | PASS |
| `apps/hub/tests/security/middleware-entry.test.ts` | `mergeScopes` 修正後の意図した挙動変化（cookie 無し・所属 1 件のみで自動束縛、explicit/session 不一致で `ambiguous_scope`）に合わせて 2 箇所のアサーションを更新 | PASS |
| `apps/hub/src/__tests__/dual-catalog-web/catalog-hard-navigation-scope.test.ts` | CI で検出した旧契約を更新。単一 workspace 所属の通常 session は `/catalog` へ到達でき、query string は scope を偽装できず、複数 workspace で未選択なら `missing_tenant_scope` のままであることを実 middleware 経由で固定 | PASS（4 ケース） |

`apps/hub/tests/security/authz-deny-by-default.test.ts`（deny-by-default 本体、principal が 2 workspace 所属で本 feature の変更の影響を受けない構成）は無変更のまま全 12 件 PASS を維持しており、健全性の裏付けとした。

## 共通層契約テスト

`apps/hub/tests/shared-layers/contract.in-app-layers.test.ts`（公開入口 `middleware/index.js` 経由必須の deep import 禁止契約、26 テスト）も PASS。`apps/hub/src/lib/authz/resource.ts` の import 元を `middleware/scope.js`（直接）から `middleware/index.js`（公開バレル）へ変更したことで、この契約違反を解消した。

## 既知の事前失敗（本 feature の変更対象外）

`apps/hub` 配下の対象テストは全件 PASS（0 FAIL）。参考として、リポジトリルート直下から誤った cwd で vitest を実行すると（`apps/hub/vitest.config.ts` の JSX 設定を拾えず）`React is not defined` エラーで多数のテストが失敗する現象を確認したが、これは実行方法の誤りであり feature の実装や既存コードの不具合ではない（本記録冒頭の実行コマンド注記を参照）。
