# acceptance-report: feat-build-pipeline-board (P07)

> SYS-BUILD-PIPELINE-BOARD-P07 の正本成果物。goal-spec acceptance 3 項目を判定する。

## goal-spec acceptance 3 項目の判定

| # | acceptance 項目 | 判定 | 根拠 (test-run-report.md 参照) |
| --- | --- | --- | --- |
| 1 | 7 工程の遷移が admin のみ操作でき監査 event に記録される | **PASS** | test-run-report.md「1 stage-transition-admin-only」「2 stage-change-audit-event」— `stage-transition-admin-audit.test.ts` (BPB-SEC2-001〜003, BPB-SEC6-001/002, BPB-SM-001〜005) 全27テストPASS。member は 403、workspace-admin は隣接遷移のみ 200、成功時のみ監査event 1件記録を確認済み。 |
| 2 | 公開工程が PublishRequest の状態と整合する (二重状態を持たない) | **PASS** | test-run-report.md「3 publish-stage-publishrequest-integrity」— BPB-B4-001〜003 (`stage-transition-admin-audit.test.ts`) + `build-stage-transition.test.ts` B4節。publish 遷移は接続済み PublishRequest が `published` でない場合 409 拒否、既存状態機械を単一参照し二重実装なしを確認済み。 |
| 3 | ボードが axe 違反 0・CWV good で動作する | **PARTIAL PASS** | axe: test-run-report.md Normative closure — `board-a11y-and-page.test.tsx` (BPB-A11Y-001/002) PASS、違反0件。CWV: 本番URL実測が前提のため、P07時点ではローカルの client bundle 予算テストで間接担保のみ。実測 (LCP/INP/CLS 各 good) は P13 production smoke の責務として引き継ぐ (test-design.md に明記済み)。 |

## scope_in / acceptance 未割当チェック

feature context (`sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441`) の scope_in/acceptance に対し、上表 3 項目全件を P07 責務として追跡した (未割当 0 件)。

## Normative closure (現行 3 endpoint 実測)

現行実装の 3 endpoint (`GET /api/v1/builds`, `GET /api/v1/builds/:id`, `POST /api/v1/builds/:id/stage`) は、role/tenant/validation tests と stage transition tests を `stage-transition-admin-audit.test.ts` + `build-stage-transition.test.ts` で実測済み (test-run-report.md 参照)。ADR の目標契約にある `POST /api/v1/builds` (manual recovery) と `PATCH /api/v1/builds/:id` (metadata 更新) は現時点で未実装であり、今回の既存 3 endpoint の事実整合スコープ外の残課題とする。CWV report は production smoke (P13) まで同一測定IDで追跡する。

## 結論

3 項目中 2 項目は完全 PASS、1 項目 (CWV) はローカル環境の制約により axe 部分のみ実測完了・CWV 実測は P13 へ引き継ぎという条件付き PASS。これは feature 側の test-design.md / task spec 自体が明記している既定の分担であり、P07 時点での未実施ではなく計画通りの引き継ぎである。
