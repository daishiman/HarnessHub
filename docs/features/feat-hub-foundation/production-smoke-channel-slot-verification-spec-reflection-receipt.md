---
layer: feature-spec-reflection
feature_id: feat-hub-foundation
related_feature_id: feat-publish-pipeline
beads_ids: [HarnessHub-pf5o, HarnessHub-bmhq, HarnessHub-f04p]
dev_graph_node_id: issue-hub-local-dev-runtime-reliability-20260811
related_node_ids:
  - issue-production-publish-smoke-cwd-paths-20260811
  - issue-publish-smoke-unwired-20260808
spec_impact: none
status: verified
updated: 2026-08-11
---

# production smoke channel slot 検証強化 — 仕様反映受領書

## 依頼・目的・背景

本番 publish smoke で、S3 の `needs_fix`（差戻し）request が channel の非終端 UNIQUE slot を掴んだまま S4 の競合 fixture を `ready` にすると partial UNIQUE 違反で失敗した。cancel で `draft` へ戻す順序は既に実装済みだが、API 応答だけ見て DB を再確認しないと「解放したつもり」が残る。本変更は DB 再確認・観測フィールド・service 層 T4-A を足し、契約の読み違いを機械的に防ぐ。

## 結論

仕様・設計への影響は **なし（none）** と判断した。

理由:

1. TargetChannel 直列化の正本は既存の partial UNIQUE index（`status NOT IN ('published','failed','draft')`）であり、`needs_fix` が非終端であることは AD-6 / qa-009 で確定済み。
2. `needs_fix → cancel → draft` と S3 cleanup 後に S4 へ進む順序は、既に production coverage smoke 追補と `HarnessHub-pf5o` で契約化済み。
3. 本差分は公開 API・DB schema・状態機械辺・監査 action を増やさず、**既存契約の観測と回帰テストを強化するだけ**である。

このため `system-spec/` への新しい QA transition は行わない。`specs/`・`architecture/`・`features/`・`tasks/`・`docs/` には「非影響判断」と検証強化の所在だけを追記した。

## 中学生向けの説明

公開レーンは 1 本しか同時に使えません。「直して」と差し戻された依頼も、まだレーンを使っている状態です。次の試験を始める前に「キャンセルしてレーンを空ける」必要があります。今回は、空けたつもりでも本当に空いたかをデータベースでもう一度見て、テストで間違えないようにしました。

## 技術的な変更

| 対象 | 内容 |
|---|---|
| `apps/hub/scripts/smoke-production-publish.ts` | cancel API 後に `db.findRequest` で status=`draft` を再確認。観測 `channel_slot_released: 'draft'` を記録 |
| `production-smoke-script.test.ts` | source 契約に `rejectedAfterCancel` と `channel_slot_released` を要求 |
| `service-request.cases.ts` | T4-A: `needs_fix` 占有で後続 submit が `channel_busy` になることを固定 |

## 検証結果（MVP 最小）

| 検証 | 結果 |
|---|---|
| `service.test.ts` + `production-smoke-script.test.ts` | PASS: 60 tests |
| task package exact-13 (`feat-hub-foundation`) | PASS: P01..P13、各ファイル 500 行未満 |
| Dev Graph schema | PASS: violations 0 |
| 仕様影響 | none（本受領書） |

本番 Worker への再 smoke 実走は default branch 統合後の境界とし、本ブランチでは行わない。

## 関連タスク

| Beads | 役割 |
|---|---|
| `HarnessHub-bmhq` | ブランチ主題: ローカル開発 runtime 信頼性（closed） |
| `HarnessHub-f04p` | production smoke cwd 非依存 path（closed） |
| `HarnessHub-pf5o` | publish smoke 結線と S3 slot 解放順序（in_progress。本番再実走証跡が残） |

## 残課題

- `HarnessHub-pf5o`: 最新 SHA での production publish smoke 再実走証跡
- `HarnessHub-aauo`: CI cancel 時の disposable tenant 回収
