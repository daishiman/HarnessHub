---
status: confirmed
layer: spec-reflection-receipt
feature_id: feat-dev-pipeline-improvement
beads_id: HarnessHub-6fgb
graph_node_id: issue-c19-resume-closure-contract-20260810
branch: devgraph/issue-resource-map-deep-cards-20260722
base_branch: main
spec_impact: reflected
reviewed_at: 2026-08-10
---

# C19 resume completion contract 仕様反映受領書

## 対象と判断

- 日付: 2026-08-10
- Dev Graph node: `issue-c19-resume-closure-contract-20260810`
- Beads ID: `HarnessHub-6fgb`
- 発見経路: branch pre-push の fresh C19 bounded live trial
- 変更種別: 開発管理パイプラインの内部仕様・設計への影響あり
- 製品 runtime 影響: なし

fresh evaluator は実際の system-spec import、source lineage、evaluator evidence、C02 single-writer が正常である一方、resume path が「upstream evaluator を再実行しない」と定めるのに、post-run gate が build path の evaluator 起動と direct upsert を一律必須にしている矛盾を検出した。また、status evidence 本文に report path が現れただけで外側セッションの代筆と誤認する偽陽性も検出した。

## 反映内容

| 層 | 反映 | 理由 |
|---|---|---|
| `system-spec/` | C04 deep card の正規 compile 済み成果を維持。C19 の追加 reopen はなし | 新しい製品要求ではなく、既存 `qa-216` / `qa-217` の実装具体化 |
| `specs/` | build / resume の経路別完了条件を追記 | 検証契約の正本化 |
| `architecture/` | authority、single-writer、report/stdout 束縛を追記 | 実装境界の明示 |
| `features/` | pipeline feature の C19 追補を追記 | feature 目的への trace |
| `tasks/` | P13 の発見・修正・再検証を追記 | リリース gate の実行記録 |
| `issues/` | C19 の修正と PR merge 後 reconciliation を追跡する issue node を追加 | Beads と dev-graph の完了状態を同じ対象へ束縛 |
| `docs/` | 本受領書を追加 | 影響判断と検証証拠の保存 |

## 実装契約

- build path は evaluator Skill の完全 `agentId` と native completion を C02 import より先に要求する。
- resume path は current な digest-bound PASS receipt を authority とし、evaluator / upstream Skill / Agent を再起動しない。
- resume path は deterministic runner を 1 回だけ実行し、runner 外の direct `upsert-node.py` を拒否する。
- runner は `system-spec-resume-closure/v1`、checklist evidence、C02 dry-run/upsert、graph preview、source digest、evidence ref の exit code を出力する。
- post-run gate は transcript の runner tool result と report JSON の一致を確認する。
- outer report 代筆は `Write` / `Edit` の target path で判定し、status 本文内の参照文字列は対象外とする。

## 検証

- focused regression: `test_validate_system_spec_evaluator_completion.py`、`test_validate_system_spec_resume.py`、`test_system_spec_evaluator_wait_contract.py`
- 変更直後結果: 26 tests PASS
- r1 (`20260809T210800Z-wt18-c19-bounded-r1`): fresh evaluator が契約矛盾と偽陽性を検出して FAIL。失敗を保持して本修正へ接続した。
- r2 (`20260809T212925Z-wt18-c19-bounded-r2`): 本体 75 秒、network / upstream Skill / Agent / direct upsert 0、post-run completion gate exit 0、goal-seek gate exit 0、fresh independent evaluator PASS、formal verdict PASS。

## 仕様影響の結論

製品の API、DB schema、認証認可、UI、Cloudflare deploy unit は変わらない。system-spec の確定 QA を reopen すると未発生の製品要求を追加するため行わない。内部の検証契約には影響があるため、`specs/`・`architecture/`・`features/`・`tasks/` と本受領書へ正規に反映した。C04 deep card 由来の `system-spec/` 更新は同じ PR で canonical compiler の成果として保持する。

## 残課題

draft PR の required checks と main merge 後の Beads / graph reconciliation は PR ライフサイクルで完了させる。
