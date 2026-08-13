---
status: recorded
layer: feature-spec-reflection
spec_impact: reflected
reviewed_at: 2026-08-13
feature_node_ids:
  - feat-hub-foundation
  - feat-post-signin-scope-routing
dev_graph_node_id: issue-elegant-home-review-20260813
beads_ids:
  - HarnessHub-1cno
recorded_at: 2026-08-13
---

# 着地ダッシュボード契約整合 — 仕様反映受領書

## 1. 依頼と目的

今回変更中の着地ダッシュボードを最終レビューし、承認済みの `/dashboard`・本人の最近作業・分析 KPI なしという契約へ実装・仕様・テストを揃える。目的は、サインイン直後に「いま何をすればよいか」が分かり、既存業務画面へ進める着地面を MVP として公開することである。

## 2. 結論

- **仕様・設計影響: あり (`reflected`)**。
- 新規の製品判断は無い。appr-034 / qa-170 / qa-171 で確定済みの既定着地と画面内容を、実装と派生文書の現行値へ書き戻した。
- `spec-state.json` の歴史的 qa セルは改変しない（qa-135 時点の `/sheets` は履歴として残す）。
- 公開 API の新規は集約 `GET /api/v1/dashboard/summary` のみ。DB schema・role 階層・`authorize()` 判定順は不変。
- 「要対応」件数は運用キューであり、S09 の推移・ランキング KPI ではない。

## 3. 正規反映先

| 層 | 反映 |
|---|---|
| `system-spec/` | `frontend.md` / `ui-ux.md` に post-compile writeback。`testing-qa.md` の O5 既定を `/dashboard` へ更新。`index.md` に writeback 行。R4-reopen なし |
| `specs/` | `harness-hub-post-signin-workspace-scope-addendum.md` の現行着地を `/dashboard` へ更新。observability contract は既に `/dashboard` |
| `architecture/` | `harness-hub-frontend.md` / `harness-hub-security.md` の現行既定値を `/dashboard` へ置換（行数上限維持） |
| `features/` | `feat-hub-foundation.md` / `feat-post-signin-scope-routing.md` に P13 後 writeback |
| `tasks/` | hub-foundation P13 / post-signin-scope P13 に writeback。exact-13 非改変 |
| `docs/` | screen-inventory、user-journeys、frontend-spec、情報設計 S00.LANDING、本受領書 |

## 4. R4-reopen 不要の理由

1. 既定着地の値は qa-170 / appr-034 で確定済み。今回は実装結線と派生文書の現行値揃えである。
2. 着地内容は qa-171 / appr-035 の本人 recent・行き止まり禁止・稼働状況を主役にしない契約の具体化である。
3. `dashboard.summary_read` は到達可否だけを足し、機能ごとの閲覧は既存 own/all 規則に委譲する。
4. S09 分析 KPI・role 階層・DB 列・deny 判定集合は変えない。

## 5. 品質ゲート (MVP 最小)

| ゲート | 結果 |
|---|---|
| `validate-system-plan.py` feat-hub-foundation | PASS（baseline exemption、violations 0） |
| `validate-system-plan.py` feat-post-signin-scope-routing | PASS（contract 1.3.0、violations 0） |
| home-dashboard / landing / nav / authz focused | PASS（8 files / 80 tests） |
| DB hearing / feedback / build recent | PASS（3 files / 31 tests） |
| UI DataTable / navigation | PASS（2 files / 54 tests） |
| `git diff --check` | PASS |

## 6. 残課題

- 本番 URL での着地目視と OIDC smoke O5 の既定 path 再実測
- Linux VRT baseline（HarnessHub-7mc6）
- S09 分析 KPI（feat-metrics-tracking、P5 据え置き）
