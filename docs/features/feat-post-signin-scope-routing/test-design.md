---
status: confirmed
layer: feature-design
---

# テスト設計 — feat-post-signin-scope-routing

> P04 成果物。正本: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa/task-specs/phase-04-test-design.md`
> 前提: [design-review.md](./design-review.md) の指摘2件（open redirect のランタイム挙動検査、複数workspace所属+cookie無しの回帰）を本設計に組み込む。

テストファイル配置（P05実装配置に対応、P06で実装・実行）:
- `apps/hub/test/authz/scope-resolution.test.ts`（scope 解決の真理値表 = TID-SCOPE-*）
- `apps/hub/test/routing/post-signin-landing.test.ts`（着地先解決の入力分類 = TID-LAND-*）
- `apps/hub/test/auth/session-workspace-binding.test.ts`（session への active workspace 束縛 = TID-BIND-*）

## 1. scope 解決の真理値表（TID-SCOPE-*）

明示ヘッダー由来 scope（explicit）と session 由来 scope（session）の組合せ4通り。

| Test ID | explicit | session | 期待結果 | 対応 acceptance |
|---|---|---|---|---|
| TID-SCOPE-01 | なし | なし | `missing_tenant_scope`（deny-by-default 非退行） | 6 |
| TID-SCOPE-02 | あり(正) | なし | explicit を採用し許可判定へ進む | 4 |
| TID-SCOPE-03 | なし | あり(正) | session を採用し許可判定へ進む | 4 |
| TID-SCOPE-04 | あり | あり・tenantId/workspaceId 一致 | 一致した scope を採用し許可判定へ進む | 4 |
| TID-SCOPE-05 | あり | あり・不一致 | `ambiguous_scope` | 5 |

## 2. session への active workspace 束縛（TID-BIND-*）

| Test ID | 前提 | 期待結果 | 対応 acceptance / 設計レビュー対応 |
|---|---|---|---|
| TID-BIND-01 | cookie に所属内の workspaceId | その workspaceId を active として採用 | 7 |
| TID-BIND-02 | cookie に所属外の workspaceId | `null`（束縛しない。直前値へフォールバックしない） | 7 |
| TID-BIND-03 | cookie 無し、所属 workspaceIds が1件のみ | その1件を自動採用 | — |
| TID-BIND-04 | cookie 無し、所属 workspaceIds が2件以上 | `null`（未確定） | 6（design-review 指摘2の回帰） |
| TID-BIND-05 | principal が `null` | `null` | 6 |

## 3. 着地先解決の入力分類（TID-LAND-*）

| Test ID | 入力(`returnTo`) | 期待結果 | 対応 acceptance / 設計レビュー対応 |
|---|---|---|---|
| TID-LAND-01 | `null` / `undefined`（遷移元なし） | `DEFAULT_POST_SIGNIN_LANDING`（`/dashboard`） | 1 |
| TID-LAND-02 | `/sheets/new`（同一 origin 相対 path） | そのまま採用 | — |
| TID-LAND-03 | `https://evil.com/phish`（絶対URL） | `/dashboard` へフォールバック | 2 |
| TID-LAND-04 | `javascript:alert(1)`（スキーム付き） | `/dashboard` へフォールバック | 2 |
| TID-LAND-05 | `//evil.com`（protocol-relative） | `/dashboard` へフォールバック | 2（design-review 指摘1） |
| TID-LAND-06 | `/\evil.com`（バックスラッシュトリック） | `/dashboard` へフォールバック | 2（design-review 指摘1） |
| TID-LAND-07 | `http://user@evil.com`（資格情報付きURL） | `/dashboard` へフォールバック | 2（design-review 指摘1） |

## 4. 結合・回帰テスト

| Test ID | シナリオ | 期待結果 | 対応 acceptance |
|---|---|---|---|
| TID-INT-01 | 遷移元なしでサインイン成功 | `/dashboard` に着地する（`/` に留まらない） | 1 |
| TID-INT-02 | 認証済み session で `/` を開く | `/dashboard` へ redirect される | 3 |
| TID-INT-03 | 未認証で `/` を開く | 稼働確認表示のまま（redirect されない） | — |
| TID-INT-04 | 業務画面6種（`/sheets`, `/sheets/new`, `/sheets/{id}`, `/catalog`, `/catalog/releases`, `/catalog/{id}`）へ session scope のみで通常アクセス | いずれも `403 missing_tenant_scope` にならない | 4 |
| TID-INT-05 | 着地先解決の結果へ実際に redirect した後、その path への再アクセス | 通常の `authorize()` 判定が適用される（迂回しない） | 8 |

## 5. Acceptance 8件との対応表（被覆確認）

| # | Acceptance | 対応 Test ID |
|---|---|---|
| 1 | 遷移元が無いサインイン成功で /dashboard に着地し、/ に留まらない | TID-LAND-01, TID-INT-01 |
| 2 | 戻り先に絶対URL・スキーム付き・protocol-relativeを与えても外部へ遷移せず既定着地へ落ちる | TID-LAND-03〜07 |
| 3 | 認証済みsessionで/を開くと既定着地へredirectされる | TID-INT-02 |
| 4 | 業務画面6種が通常のブラウザ操作で403 missing_tenant_scopeにならない | TID-SCOPE-02〜04, TID-INT-04 |
| 5 | 明示ヘッダーとsession scopeが併存し不一致のときambiguous_scopeで拒否される | TID-SCOPE-05 |
| 6 | どちらのscope入力も無い場合はmissing_tenant_scopeのままである | TID-SCOPE-01, TID-BIND-04 |
| 7 | principalの所属検証を通らないworkspaceはsessionへ束縛されない | TID-BIND-01, TID-BIND-02 |
| 8 | 戻り先の解決結果に対してもauthorize()が適用される | TID-INT-05 |

被覆漏れ: **0件**（全 acceptance に1件以上のテストIDが対応）。

## 6. テストレベルと保守性制約

- 単体: TID-SCOPE-*, TID-BIND-*, TID-LAND-*（純粋関数のみで実装、pixel/DOM 構造非依存）。
- 結合: TID-INT-*（middleware 経由の実リクエストをシミュレートする vitest 統合テスト）。
- 境界値: TID-LAND-05〜07（open redirect のランタイム挙動、design-review 指摘1に対応）。
- 回帰: TID-BIND-04（deny-by-default 非退行、design-review 指摘2に対応）。
- カバレッジ目標: 実装対象コード（scope 解決・着地先解決・session 束縛の新規/変更ロジック）で80%以上。
