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
- Workspace 選択・切替の画面は本 feature の scope 外であり、`feat-workspace-switch-ux` が所有する。実装済みなのは cookie 値の fail-closed（安全に確認できない場合は拒否する）な採用と単一 Workspace の安全な既定だけであり、未実装 UI を完了扱いにしない。
