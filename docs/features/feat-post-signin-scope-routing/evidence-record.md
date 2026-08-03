---
status: confirmed
layer: feature-quality
task: SYS-POST-SIGNIN-SCOPE-P11
parent_feature: feat-post-signin-scope-routing
feature_package_id: feature-package/feat-post-signin-scope-routing
source: docs/features/feat-post-signin-scope-routing/final-review.md
---

# P11 証跡固定

対象: `HarnessHub-3sjj.11`。

| 項目 | 値 |
| --- | --- |
| feature package digest | `sha256:ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa` |
| Beads | `HarnessHub-3sjj`（P13: `HarnessHub-3sjj.13`） |
| dev-graph node | `feat-post-signin-scope-routing` |
| task quality gate | `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-post-signin-scope-routing` |
| code evidence | `apps/hub/src/lib/routing/post-signin-landing.ts`, `apps/hub/src/middleware/authz.ts`, `apps/hub/src/lib/auth/session.ts` |
| test evidence | `docs/features/feat-post-signin-scope-routing/test-run-record.md` |

すべての参照先は repository 相対 path であり、環境固有の絶対 path は保存していない。
