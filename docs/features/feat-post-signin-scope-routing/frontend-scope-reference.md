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
- ブラウザの業務画面では、検証済み principal の tenant と、所属を再確認済みの `hh_active_workspace` cookie だけを `authorize()` に補完する。API、Bearer 認証、cookie 不在の要求は従来どおり明示 scope 必須である。
- Workspace 選択・切替の画面は本 feature の scope 外であり、`feat-workspace-switch-ux` が所有する。実装済みなのは cookie 値の fail-closed な採用までであり、未実装 UI を完了扱いにしない。
