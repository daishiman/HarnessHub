# リファクタリングと移行記録 — feat-post-signin-scope-routing

> P08 成果物。正本: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa/task-specs/phase-08-refactoring-migration.md`
> 目的: scope 解決の分岐と既定着地の定数を集約し、経路ごとの二重実装と path 直書きを排除する。

## 判定サマリー

P05 (実装) の時点で、本 task が要求する「単一関数への集約」「単一定数への集約」は既に満たされていた。棚卸しの結果、二重実装・直書きは 0 件のため、実装ファイルへの追加変更は行っていない。テストを再実行し、P06 記録との結果同一性を確認した。

## 棚卸し対象と結果

Write scope として宣言された実装ファイルを 1 件ずつ確認した。

| # | ファイル | 集約対象 | 確認結果 |
|---|---|---|---|
| 1 | `apps/hub/src/middleware/authz.ts` | 明示ヘッダー系統と session 系統の合流判定 | `mergeScopes()` 単一関数に集約済み。`authorize()` からの呼び出しは 1 箇所のみで、判定順「public判定→認証→スコープ一意性→tenant一致→workspace所属」を変更する分岐は無い |
| 2 | `apps/hub/src/lib/authz/resource.ts` | session 由来 scope の解決 | `resolveSessionScope()` 単一関数に集約済み。`TENANT_HEADER`/`WORKSPACE_HEADER` の文字列リテラルは公開入口 (`middleware/index.js`) からの import のみで、再定義箇所は無い |
| 3 | `apps/hub/src/lib/authz/types.ts` | (role 判定の語彙。本 feature の scope 解決とは無関係) | scope 解決・着地先解決に関わるコードなし。変更不要 |
| 4 | `apps/hub/src/lib/auth/session.ts` | active workspace 束縛 | `resolveActiveWorkspaceId()` 単一関数に集約済み。cookie 名 `ACTIVE_WORKSPACE_COOKIE_NAME` の定義は 1 箇所のみ |
| 5 | `apps/hub/src/lib/routing/post-signin-landing.ts` | 既定着地の定数 | `DEFAULT_POST_SIGNIN_LANDING = '/sheets'` という単一定数に集約済み。着地先解決は `resolvePostSigninLanding()` 単一関数のみ |
| 6 | `apps/hub/src/app/[tenant_slug]/signin/tenant-oidc-signin-form.tsx` | 着地先の直書き | `DEFAULT_POST_SIGNIN_LANDING` と `resolvePostSigninLanding()` を import して使用しており、`'/sheets'` の文字列直書きは無い |
| 7 | `apps/hub/src/app/page.tsx` | 着地先の直書き | `DEFAULT_POST_SIGNIN_LANDING` を import して `redirect()` に渡しており、直書きは無い |

## 直書き検査 (grep による裏付け)

`apps/hub/src` 配下で `/sheets` という文字列リテラルが定数定義以外に出現しないことを確認した。

```bash
grep -rn "'/sheets'" apps/hub/src --include="*.ts" --include="*.tsx"
```

結果: `post-signin-landing.ts` の `DEFAULT_POST_SIGNIN_LANDING` 定義 1 箇所のみ。画面側は全て定数/関数の import 経由で参照しており、直書きは 0 件。

## 変更の有無

**実装ファイルへの変更なし。** P05 時点の設計(合流点を単一関数に保つ、既定着地を単一定数から解決する)が、本 task の集約要求を既に満たしていたため、追加のリファクタリングは不要と判断した。

## テスト結果同一性の確認

リファクタリング (棚卸し) 前後で `apps/hub` 全体のテストを再実行し、P06 (`test-run-record.md`) と結果が同一であることを確認した。

- 実行結果: **1103 PASS / 1 SKIP / 0 FAIL**（91 テストファイル / 1104 テストケース）— P06 記録と完全一致
- 実行コマンド:
  ```bash
  cd apps/hub
  /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run --coverage
  ```
- 実行日: 2026-08-03

## スコープ外の確認

- 外部契約 (`DenyReason`/`status`) は変更していない
- `authorize()` の判定順・role 判定・deny-by-default の挙動は変更していない
- 新規機能は追加していない
