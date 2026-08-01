---
status: confirmed
layer: feature-spec-reflection
beads_ids:
  - HarnessHub-fnzl
  - HarnessHub-dbx6
dev_graph_node_id: issue-backup-failure-undetected-20260728
feature_node_id: feat-hub-foundation
spec_impact: none
reviewed_at: 2026-08-01
---

# backup heartbeat 外部適用 仕様反映受領書

## 1. 依頼と目的

`HarnessHub-fnzl` と `HarnessHub-dbx6` の最終レビューとして、外部適用結果を正規文書へ書き戻し、確定済み仕様・設計へ新たな影響がないかを判定した。

## 2. 結論

- **今回新たな仕様・設計影響はない**。2026-07-29 に qa-093 / qa-094 で確定した「heartbeat 分離、required secret、fail-closed、period 86400 秒 / grace 3600 秒、外部実測まで完了にしない」という契約を、そのまま実現したためである。
- `system-spec/spec-state.json` の reopen は行わない。現行 `infrastructure.web` の qa-106 と `maintenance-ops.web` の qa-107 は qa-094 までの契約を維持すると明記しており、外部 ID・run ID・投入状態は仕様決定ではなく運用証跡である。
- 状態が古くなっていた `specs/` / `architecture/` / `features/` / `tasks/` / `docs/` は 2026-08-01 の実測へ更新した。`system-spec/` は正規 compiler と検証ゲートで既存契約が不変であることを再確認する。
- 正規 compiler は入力検証と 12 章生成には成功したが、別課題が compiler 出力後に追記した `dev-workflow.md` / `testing-qa.md` の実装注記 3 件を削除する差分を出した。情報欠落になるためその差分は不採用とし、既存注記を復元した。最終的な `system-spec/` の tracked byte diff は 0 件である。

## 3. 中学生向けの説明

前回は「バックアップ専用の見張り番を作る」というルールを決めました。今回は、その見張り番を本当に動かし、バックアップが終わった合図を受け取れることを確かめた作業です。ルールを変えたのではなく、決めたとおりに動くように最後のスイッチを入れました。

毎日バックアップが成功すると見張り番へ合図します。合図が来なければ、予定時刻から約 1 時間後に異常になります。別の定期作業とは見張り番を分けたので、片方だけ成功して失敗を隠すこともありません。

## 4. 専門的な説明

Better Stack heartbeat `477775` を backup 専用 `hub-backup-daily` として作成し、Worker cron 用 `475650` とは resource / secret binding の双方を分離した。`BACKUP_HEARTBEAT_URL` は `gh secret set` の stdin 経路だけで投入し、URL と API token は repository、Beads、ログ、証跡へ保存していない。

`node scripts/ci/check-actions-secrets.mjs --live` は workflow 参照 13 件と台帳 13 件の一致で exit 0。main の `hub-backup` run `30686023662` は control-plane export 19 テーブル / 64 行、R2 upload / get の byte 一致、`curl -fsS` による heartbeat HTTP 2xx 受理まで完走した。run と独立に同じ R2 object を再取得し、`verify-export-artifact.ts` で `ok=true` を確認した。

provider 側の状態表示そのものは Uptime API token を保持しない方針のため未確認だが、受入条件が要求する着信は HTTP 2xx 受理で確認できる。timeout alert の契約は `period=86400` / `grace=3600` から決まり、実装値・設計値とも変更していない。

## 5. 反映先

- `system-spec/`: qa-094 を維持する qa-106 / qa-107 と compiler 出力を再検証（状態証跡は正本へ混在させない）
- `specs/harness-hub-system-specification.md`: 外部適用実績と仕様不変を追記
- `architecture/harness-hub-infrastructure.md`: 未検証境界を実測済みへ更新
- `features/feat-hub-foundation.md` / `features/feat-domain-model-db.md`: feature 状態を更新
- `tasks/feat-hub-foundation/sys-hub-foundation-p12.md` / `tasks/feat-domain-model-db/sys-domain-model-db-p13.md`: 実行記録を追記
- `docs/features/feat-hub-foundation/runbook.md` / `evidence/index.md`: 適用状態と一次証跡を登録

## 6. 一次証跡

- `docs/features/feat-hub-foundation/evidence/backup-heartbeat-applied-2026-08-01.json`
- Better Stack backup heartbeat: external ID `477775`
- GitHub Actions: `hub-backup` run `30686023662`、`hub-ci` run `30684710098`
- Beads: `HarnessHub-fnzl` 6/6、`HarnessHub-dbx6` 4/4 の受入条件を満たして closed

## 7. 残課題

- 月次 SLO 99.5% の達成判定は 30 日分の観測後に行う。これは `HarnessHub-fnzl` / `HarnessHub-dbx6` の完了条件ではなく、既存の SLO 観測タスクの責務である。
- 四半期 restore drill は別の定期運用責務として継続する。今回の初回 backup 成功と混同しない。
