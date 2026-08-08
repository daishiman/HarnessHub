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
- `/` は未認証時の稼働状況表示を保つ。署名・失効を確認済みの session があるときだけ `/sheets` に redirect する。
- 業務画面の scope は、所属を再確認済みの `hh_active_workspace` cookie から補完する。cookie が無い場合も所属 Workspace が 1 つだけなら同じ値を安全に採用し、複数なら `missing_tenant_scope` のまま拒否する。
- **画面 (RSC) 側のフォールバック (2026-08-08)**: 既定着地 `/sheets` は URL クエリを持たない。`(dashboard)` / `(workspace)` の各 page は `resolveDashboardScope()` (`apps/hub/src/lib/routing/dashboard-scope.ts`) で session から tenant/workspace を解決し、`query.tenant ?? scope.tenantId` の順で API ヘッダーへ渡す。判定ロジックは middleware の `resolveSessionScope()` を再利用し二重実装しない。
- **PrimaryNav シェル (2026-08-08)**: ログイン直後にブラウザ操作で他画面へ移れるよう、layout が `PrimaryNav` を描画していた。各リンクは解決済み scope をクエリへ引き継ぐ。これはサイドバー 9 項目の段階表示契約 (qa-018) の本実装ではなく、到達性を埋める最小シェルだった。
- **共通シェルへの置換 (2026-08-08 追補)**: 上記の最小シェルは `apps/hub/src/components/shell/hub-shell.tsx` (`HubShell`) に置き換わり、`PrimaryNav` は削除した。リンク定義の正本は `apps/hub/src/components/shell/nav-items.ts` の 1 箇所で、scope をクエリへ引き継ぐ責務は変わらない (`(dashboard)` / `(workspace)` の layout が `resolveShellProps()` 経由で渡す)。到達性の契約テストは `apps/hub/tests/routing/shell-nav-items.test.tsx` (TID-PNAV-01..06) が引き継いでいる。
- Workspace 選択・切替の画面は本 feature の scope 外であり、`feat-workspace-switch-ux` が所有する。実装済みなのは cookie 値の fail-closed（安全に確認できない場合は拒否する）な採用と単一 Workspace の安全な既定だけであり、未実装 UI を完了扱いにしない。
