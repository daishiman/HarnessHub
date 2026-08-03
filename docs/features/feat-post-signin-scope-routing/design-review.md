---
status: confirmed
layer: feature-design
task: SYS-POST-SIGNIN-SCOPE-P03
parent_feature: feat-post-signin-scope-routing
feature_package_id: feature-package/feat-post-signin-scope-routing
source: docs/features/feat-post-signin-scope-routing/architecture-decision.md
---

# P03 設計レビュー

対象: `HarnessHub-3sjj.3`。結論は **実装可**。

| リスク | 審査結果 | 対応 |
| --- | --- | --- |
| 認可迂回 | redirect は相対 path に制限し、到達先も通常の `authorize()` を通るため迂回なし | P05/P09 テスト |
| open redirect | absolute、scheme、protocol-relative、`/\\` を既定着地へ落とす | P05/P09 テスト |
| deny-by-default 退行 | API、Bearer、cookie なしでは session 補完を使わず `missing_tenant_scope` のまま | P05/P09 テスト |

残存事項は Workspace 選択 UI と本番 6 画面到達の実測であり、それぞれ後続 feature と P13 が所有する。
