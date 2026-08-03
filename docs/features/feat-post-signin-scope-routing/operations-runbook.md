---
status: confirmed
layer: feature-operations
task: SYS-POST-SIGNIN-SCOPE-P12
parent_feature: feat-post-signin-scope-routing
feature_package_id: feature-package/feat-post-signin-scope-routing
source: docs/features/feat-post-signin-scope-routing/evidence-record.md
---

# P12 運用・一次切り分け

対象: `HarnessHub-3sjj.12`。業務画面に入れない場合は、利用者の cookie や token を共有・記録せずに切り分ける。

| 症状 | 確認 | 対応 |
| --- | --- | --- |
| 未認証（401） | tenant sign-in を完了しているか | 対象 tenant の `/[tenant_slug]/signin` から再サインイン |
| `missing_tenant_scope`（403） | browser 画面か、API/Bearer 要求か | browser は有効 session を確認。API/Bearer は `x-harness-tenant-id` を明示し、推測で補完しない |
| workspace 未所属 | `hh_active_workspace` が principal の `workspaceIds` にあるか | 非所属値は自動で無効化される。所属済み Workspace を選び直す UI は `feat-workspace-switch-ux` の実装待ち |
| `ambiguous_scope`（403） | path/header/session の tenant または workspace が矛盾していないか | header を正しい scope に直す。URL path と header の値を混在させない |

`/` は未認証時だけ稼働状況を表示する。認証済みなら `/sheets` へ redirect される。外部 URL を `returnTo` に入れても遷移しない。
