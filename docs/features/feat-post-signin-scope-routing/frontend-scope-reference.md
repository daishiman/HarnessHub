---
status: confirmed
layer: feature-spec
task: SYS-POST-SIGNIN-SCOPE-P12
parent_feature: feat-post-signin-scope-routing
feature_package_id: feature-package/feat-post-signin-scope-routing
source: docs/frontend-spec.md
---

# サインイン後の scope 解決

- テナント別サインインフォームは `returnTo` を `resolvePostSigninLanding()` で検証し、未指定または安全でない値は単一の既定値 `/sheets` に正規化する。絶対 URL、scheme 付き URL、`//`、`/\\` は受理しない。
- **`/` ランディング (2026-08-08 追補)**:
  - 未認証: テナント ID 入力フォーム（JS 無し GET）。`GET /signin?tenant=` が slug 形を検証し `/{slug}/signin` へ 303。存在有無は答えない。
  - 認証済み + scope 確定: 既定着地 `/sheets` へ redirect（終着点にしない）。
  - 認証済み + 複数 Workspace 未選択: Workspace 選択 UI。`GET /signin/workspace?workspace=` が所属内 ID のみ cookie に書く。
  - 稼働確認 Alert は入口の一部として残す。`cookies()` は env 分岐より前で無条件に呼び、`dynamic = 'force-dynamic'` で静的 prerender を禁止する（本番 500 再発防止）。
- 業務画面の scope は、所属を再確認済みの `hh_active_workspace` cookie から補完する。cookie が無い場合も所属 Workspace が 1 つだけなら同じ値を安全に採用し、複数なら `missing_tenant_scope` のまま拒否する。
- **画面 (RSC) 側のフォールバック (2026-08-08)**: 既定着地 `/sheets` は URL クエリを持たない。`(dashboard)` / `(workspace)` の各 page は `resolveDashboardScope()` (`apps/hub/src/lib/routing/dashboard-scope.ts`) で session から tenant/workspace を解決し、`query.tenant ?? scope.tenantId` の順で API ヘッダーへ渡す。判定ロジックは middleware の `resolveSessionScope()` を再利用し二重実装しない。
- **PrimaryNav シェル (2026-08-08)**: ログイン直後にブラウザ操作で他画面へ移れるよう、layout が `PrimaryNav` を描画していた。各リンクは解決済み scope をクエリへ引き継ぐ。これはサイドバー 9 項目の段階表示契約 (qa-018) の本実装ではなく、到達性を埋める最小シェルだった。
- **共通シェルへの置換 (2026-08-08 追補)**: 上記の最小シェルは `apps/hub/src/components/shell/hub-shell.tsx` (`HubShell`) に置き換わり、`PrimaryNav` は削除した。リンク定義の正本は `apps/hub/src/components/shell/nav-items.ts` の 1 箇所で、scope をクエリへ引き継ぐ責務は変わらない (`(dashboard)` / `(workspace)` の layout が `resolveShellProps()` 経由で渡す)。到達性の契約テストは `apps/hub/tests/routing/shell-nav-items.test.tsx` (TID-PNAV-01..06) が引き継いでいる。
- **ブラウザ拒否 HTML (2026-08-08)**: middleware が navigation 要求（GET + `Accept: text/html` + Bearer 無し + 非 `/api`）だけ `deny-navigation` の HTML を返す。API/Bearer は `{"error": reason}` JSON のまま。
- Workspace **常設切替** UI は `feat-workspace-switch-ux` が所有。本追補で実装したのは入口での選択と cookie 束縛・拒否時の回復リンクまでであり、シェル常設切替の完了扱いにしない。
