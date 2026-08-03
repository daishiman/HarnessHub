---
status: confirmed
layer: feature-quality
task: SYS-POST-SIGNIN-SCOPE-P09
parent_feature: feat-post-signin-scope-routing
feature_package_id: feature-package/feat-post-signin-scope-routing
source: docs/features/feat-post-signin-scope-routing/refactoring-record.md
---

# P09 品質保証記録

対象: `HarnessHub-3sjj.9`。2026-08-03 に安全境界を一時変異させ、対応テストが赤へ反転することを確認した後、元の実装へ復元した。

| 検査 | 一時変異 | 実測 |
| --- | --- | --- |
| open redirect 防止 | `//` の拒否を除去 | `post-signin-landing.test.ts` が 1 failure（`//evil.example.com` を `/sheets` と期待） |
| 所属再検証 | cookie 値を無条件採用 | `active-workspace-cookie.test.ts` が 1 failure（`ws-9` を `null` と期待） |
| API の明示 scope 必須 | `/api/` の session 補完除外を無効化 | `authz-session-scope.test.ts` が 1 failure（`missing_tenant_scope` を期待） |

復元後の P06、tenant-isolation、auth gate、型検査、lint はすべて PASS。検査は fail-closed（安全側に倒す）に実際に反応する。
