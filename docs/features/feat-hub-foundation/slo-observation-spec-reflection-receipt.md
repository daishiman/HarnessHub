---
status: confirmed
layer: feature-spec-reflection
beads_ids:
  - HarnessHub-37h.15
dev_graph_node_id: issue-hub-slo-external-monitoring-20260725
feature_node_id: feat-hub-foundation
spec_impact: reflected
reviewed_at: 2026-08-01
---

# SLO 公開実測 仕様反映受領書

## 1. 依頼と目的

`HarnessHub-37h.15` の最終レビューとして、Better Stack の設定値や画面表示ではなく、公開 status page の実測から SLO（サービス品質目標）の観測進捗を再現可能に判定する。あわせて、未観測期間を稼働時間へ読み替えたり、30 日未満のデータから 99.5% 達成／未達を断定したりする誤判定を防ぐ。

## 2. 結論

- **仕様・設計影響: あり (`reflected`)**。観測窓、終了コード、30 日未満の判定禁止、外形監視単独では最終合格にしない境界を `qa-110` として正式に追加した。
- **外部 API・DB・UI への影響: なし**。既存の 99.5% 目標、認証認可、DB schema、画面、Cloudflare deploy unit は変更しない。
- **現在の受入状態: 継続中**。外形監視は稼働しているが観測済みは 6 日 / 必要 30 日で、Workers Analytics の 5xx 率も未収集のため、A3 と Beads は未完了を維持する。
- **秘密情報への影響: なし**。検証器は認証不要の公開 JSON だけを読み、Better Stack API token と heartbeat URL を取得・保存しない。

## 3. 中学生向けの説明

学校で「今月はほとんど遅刻しなかった」と言うには、数日だけでなく 1 か月分の記録が必要です。記録していなかった日を「遅刻しなかった日」と数えるのも間違いです。

今回の機能は、公開されている毎日の記録を自動で読み、記録のない日と途中の今日を除いて数えます。まだ 30 日たまっていない間は、良い／悪いを決めず「集計中」と表示します。設定画面に監視があるだけで「測定できた」とは判断しません。

## 4. 専門的な説明

`verify-slo-observation.mjs` は Better Stack status page の `/index.json` を取得し、`status_page_resource.external_id` で対象資源を一意に選ぶ。UTC の完了日だけを観測窓へ入れ、当日と `not_monitored` を除外して downtime、外形可用性、エラーバジェット消費率を導出する。

`observed_days < minimum_observation_days_for_final_verdict` の間は `verdict.status=collecting`、`external_only_target_met=null` とする。30 日到達後も `observation_complete_pending_application_error_rate` と `workers-analytics-5xx-rate-not-collected` を保持し、Better Stack downtime と Workers Analytics 5xx 率が揃うまで qa-019 の最終判定を閉じない。

CLI は一致を exit 0、不一致を exit 1、取得不能または引数不備を exit 2 とする。`--write --json` では dashboard 更新後に再突合し、`consistent=true` の収束後証跡だけを保存する。

## 5. 仕様反映の正規フロー

1. `system-spec/spec-state.json` の `infrastructure.web` を単一 transition writer で理由付き再オープンした。
2. ユーザーの最終レビュー・仕様反映指示を明示承認として `qa-110` を追加し、qa-019 / qa-106 の既存契約を維持して再確定した。
3. coverage / foundation / source citation gate を通し、単一 compiler で `system-spec/infrastructure.md` を再生成した。
4. Dev Graph の C02 writer で `specs/` と `architecture/` の参照型 wrapper、source lineage、confirmation evidence を同期する。
5. `features/`、`tasks/`、`docs/` と実測 evidence を同じ変更単位で同期する。
6. 全 commit と main 取込後の HEAD に、`build-spec-reflection-receipt.py --spec-impact reflected` で機械受領書を束縛する。

反映先:

- `system-spec/spec-state.json`
- `system-spec/infrastructure.md`
- `specs/harness-hub-system-specification.md`
- `architecture/harness-hub-infrastructure.md`
- `features/feat-hub-foundation.md`
- `tasks/feat-hub-foundation/sys-hub-foundation-p05.md`
- `tasks/feat-hub-foundation/sys-hub-foundation-p11.md`
- `docs/infrastructure-spec.md`
- `docs/features/feat-hub-foundation/runbook.md`
- `docs/features/feat-hub-foundation/acceptance-report.md`
- `docs/features/feat-hub-foundation/evidence/slo-observation.json`

## 6. 最終品質ゲート

最終差分と main 取込後の HEAD に対して、次を再実行して結果を PR 本文と Beads notes に記録する。

- Hub monitoring の focused Vitest、typecheck、format / lint
- `verify:slo-observation` の公開実測と証跡の再生成
- `feature-package/feat-hub-foundation` の Phase 1-13 task 仕様 validator
- system-spec coverage / foundation / source citation
- Dev Graph schema / source digest / evidence ref
- artifact placement、文書行数、`git diff --check`、secret scan

## 7. ファイル分割

今回変更する人間向け文書とコードは全て 500 行以下に保つ。repository の文書上限はさらに厳しい 300 行であるため、正規 lint の対象文書は 300 行以下も確認する。`system-spec/spec-state.json` と `.dev-graph/state/graph.json` は schema が一体構造を要求する機械可読正本であり、分割対象外とする。

## 8. 残課題

- 観測済み 30 日へ到達するまで時間ゲートを継続する。
- Workers Analytics の 5xx 率を同じ月次窓で収集し、最終 SLO を算定する。
- Worker cron heartbeat の provider 側状態遷移を実測する（backup heartbeat の external ID drift は main 取込で解消済み）。
- 以上が揃うまで `HarnessHub-37h.15` を close しない。
