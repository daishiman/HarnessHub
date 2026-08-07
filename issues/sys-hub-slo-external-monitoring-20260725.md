---
graph_node_id: "issue-hub-slo-external-monitoring-20260725"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "infrastructure"
tags: ["feat-hub-foundation","slo","monitoring","operations","acceptance-a3"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "Hub 外形監視を Better Stack へ適用し SLO 計測を開始"
owners: ["daishiman"]
created_at: "2026-07-25T11:06:48Z"
updated_at: "2026-08-02T06:29:20Z"
status: "closed"
depends_on: []
related_nodes: ["feat-hub-foundation","SYS-HUB-FOUNDATION-P13","arch-harness-hub-infrastructure"]
resource_scope: ["apps/hub/monitoring/slo-dashboard.json","apps/hub/scripts/verify-slo-observation.mjs","apps/hub/tests/monitoring/","docs/features/feat-hub-foundation/","docs/infrastructure-spec.md","system-spec/infrastructure.md","system-spec/spec-state.json","specs/harness-hub-system-specification.md","architecture/harness-hub-infrastructure.md","features/feat-hub-foundation.md","tasks/feat-hub-foundation/sys-hub-foundation-p05.md","tasks/feat-hub-foundation/sys-hub-foundation-p11.md"]
purpose: "P13 で本番デプロイと CI 自動デプロイ経路は確立したが、acceptance A3『SLO 99.5% の計測と /health が稼働する』のうち SLO 算定側が未達で残った。外部死活監視が未設定のため可用性の時系列が存在しないためである。A3 は 3 分間隔・1 ヶ月分の観測期間を要する時間ゲートであり、P13 に紐づけたままでは実作業完了後も最短 1 ヶ月 P13 を閉じられず、feat-hub-foundation epic を depends_on に持つ 9 feature が着手できない。P13 をデプロイ作業の完了として閉じ、A3 の判定を本 issue へ切り出す。epic HarnessHub-37h の受入条件には SLO 99.5% 計測が含まれるため、epic の close 判定には本 issue の完了が必要である"
goal: "Better Stack で production /health が 3 分間隔で監視され、cron heartbeat が稼働し、外形監視の downtime と Workers analytics の 5xx 率から 1 ヶ月分の可用性を算定して SLO 99.5% を判定できる状態にし、判定結果を feat-hub-foundation の証跡へ記録する"
scope_in: ["Better Stack Free での production /health 3 分間隔 monitor 登録","cron heartbeat monitor の登録と CRON_HEARTBEAT_URL の Worker secret 投入","SLO ダッシュボードの作成 (外形監視 downtime + Workers analytics 5xx 率の複合算定)","1 ヶ月分の可用性時系列取得と A3 の判定","判定結果の evidence 記録と acceptance-report.md §0 の A3 行更新"]
scope_out: ["独自ドメイン hub.<domain> の割当 (運用上の必須要件ではない)","cron ジョブ本体の実装 (handler は実装済みでジョブ実体は各ドメイン feature の責務)","Workers analytics の取得基盤の新規実装 (Cloudflare 標準機能を使う)","restore drill の実施 (別途 runbook §6 の四半期運用)"]
acceptance: ["Better Stack で production /health の 3 分間隔監視が稼働し、monitor が up 状態を記録している","cron heartbeat monitor が登録され CRON_HEARTBEAT_URL が Worker secret へ投入済みで、日次 cron 完走時に heartbeat が着信する","SLO ダッシュボードが外形監視の downtime と Workers analytics の 5xx 率の双方を反映しており、外形監視単独を正としていない (infrastructure-spec §9 / qa-019)","1 ヶ月分の可用性時系列から 99.5% の達成可否を判定でき、判定結果と生データ参照が docs/features/feat-hub-foundation/evidence/ に記録されている","acceptance-report.md §0 の A3 行が判定結果で更新され、未達の場合はエラーバジェット運用 (消費 70% 警告 / 100% 凍結) の適用状況が併記されている"]
architecture_refs: ["arch-harness-hub-infrastructure"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-hub-slo-external-monitoring-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-25T11:06:48Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "P13 から切り出した A3 (SLO 計測) の時間ゲート作業を追跡する standalone issue。exact-13 package の子は P01-P13 固定のため package へ追加できない"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-hub-slo-external-monitoring-20260725.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-37h.15","linked_at":"2026-07-25T15:44:20Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-02T03:42:33Z","evidence_refs":["docs/features/feat-hub-foundation/runbook.md"],"policy":"manual","reconciled_at":"2026-08-02T03:42:33Z","source":"manual","status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-07-25T11:06:48Z","missing_sections":[],"status":"complete"}
---

# Hub 本番の外部死活監視と SLO 計測を稼働させ A3 を確定する

## 背景

P13（`SYS-HUB-FOUNDATION-P13` / `HarnessHub-37h.13`）で Hub の本番デプロイと CI 経由の自動デプロイ経路が確立し、acceptance A1（CI が test→deploy を完走）と A2（bundle 3MiB 以内）は達成した。cron trigger の本番登録も解決済みである。

一方 **A3「SLO 99.5% の計測と `/health` が稼働する」は未達**のまま残った。`/health` の本番稼働は実測済みだが、起票時点では SLO 99.5% を算定するための**外部死活監視が未設定**で、可用性の時系列が存在しなかったためである。

A3 は**時間ゲート**であり、デプロイ作業ではない。3 分間隔・1 ヶ月分の観測期間を経なければ判定できない。この性質のまま P13 に紐づけておくと、実作業がすべて終わっていても最短 1 ヶ月は P13 を閉じられず、`feat-hub-foundation` epic を `depends_on` に持つ 9 feature（`feat-domain-model-db` / `feat-auth-tenancy` / `feat-user-org-admin` / `feat-metrics-tracking` / `feat-hearing-intake` / `feat-build-pipeline-board` / `feat-feedback-loop` / `feat-docs-cms` / `feat-tenant-data-retention`）が着手できない。

そこで P13 を「デプロイ作業の完了」として閉じ、A3 の判定を本 issue へ切り出す。

> **これは A3 の放棄ではない。** epic `HarnessHub-37h` の受入条件には「SLO 99.5% 計測が稼働」が含まれるため、**epic の close 判定には本 issue の完了が必要**である。P13 の完了が epic の完了を意味しないことを、ここで明示的に固定する。

## 現状

| 項目 | 状態 |
|---|---|
| 本番 Worker | 稼働中（`https://harness-hub.daishimanju.workers.dev`） |
| `/health` | HTTP 200・依存 3 件（`runtime-config` / `db` / `r2`）すべて ok |
| CI 自動デプロイ | 確立済み（main push → test → deploy） |
| cron trigger | 登録済み 2 本（`0 15 * * *` / `0 0 * * 1`）。アカウント使用数 2/5 |
| 外部死活監視 | Better Stack 資源適用済み。公開実測で `operational` |
| SLO ダッシュボード | 設定済み。観測 6 日 / 30 日の `collecting` |
| `CRON_HEARTBEAT_URL`（Worker secret） | 投入済み。Worker cron の着信実測は残課題 |

## 作業手順

正本は [docs/features/feat-hub-foundation/runbook.md](../docs/features/feat-hub-foundation/runbook.md) §1 手順 5 および [docs/infrastructure-spec.md](../docs/infrastructure-spec.md) §9。

1. **Better Stack Free** で production `/health` の **3 分間隔監視**を登録する（無料枠: 10 monitors・heartbeat 10 本）
2. **cron heartbeat monitor** を登録し、払い出された URL を `wrangler secret put CRON_HEARTBEAT_URL` で Worker へ投入する
3. **SLO ダッシュボード**を作成する。算定は「外形監視の downtime + Workers analytics の 5xx 率」であり、**外形監視単独を正としない**（infrastructure-spec §9 / qa-019）
4. 1 ヶ月分の可用性時系列を取得し、99.5% を判定する
5. 判定結果を `docs/features/feat-hub-foundation/evidence/` へ証跡として記録し、`acceptance-report.md` §0 の A3 行を更新する

## 注意

- **監視の有効化タイミングに順序制約がある。** `/health` が 200 を返す状態になってから有効化する。初期の 503 を可用性へ算入させないため（runbook §1 の順序制約）。現時点では既に 200 なので、この制約は満たしている。
- **エラーバジェット運用（qa-019）と接続する。** 消費 70% で警告、100% で新規公開機能の変更を凍結する。ダッシュボードはこの判断に使える粒度で作る。
- **`/health` は認証なし・rate limit 対象外**（infrastructure-spec §9）。3 分間隔のポーリングは Workers 無料枠（10 万 req/日）に対して 1 日 480 req であり、予算上の問題はない。

## 2026-08-01 実測更新

- Better Stack の monitor / heartbeat / status page / resource と Worker secret は適用済み。
- 公開 `/index.json` を token なしで取得し、monitor は `operational`、観測済みは 6 日 / 必要 30 日と確認した。2026-07-28 の「`not_monitored` = paused」は誤読で、無データ日の履歴だった。
- `verify:slo-observation` は dashboard 宣言を実測へ収束させ、現在は `verdict.status=collecting` で一致する。30 日未満の外形合否は `null` とする。
- 観測済み窓の downtime は約 6,312 秒、30 日許容 12,960 秒に対する消費は約 48.7% で、70% 警告と 100% 変更凍結は未発動。
- 残作業は 30 日時間ゲート、Workers Analytics 5xx 率、Worker cron heartbeat 着信実測。これらが揃うまで本 issue と `HarnessHub-37h.15` は未完了を維持する。
- 仕様反映は `system-spec/infrastructure.md` の qa-116、[仕様反映受領書](../docs/features/feat-hub-foundation/slo-observation-spec-reflection-receipt.md) を参照する。

## 最終 closure (2026-08-02 / qa-123)

- 上記「未完了を維持する」は観測を継続する当初方針の履歴として保持する。その後、ユーザーが本 follow-up の追加対応は不要と判断したため、completion evidence を `not_applicable` として閉じた。
- `not_applicable` は SLO PASS ではない。最終証跡は観測 6 日 / 30 日の `collecting`、外形単独判定 `null`、Workers Analytics 5xx 率未取得のままであり、99.5% 達成を主張しない。
- qa-019 / qa-116 の目標値・計測式・エラーバジェット運用は維持する。将来再開する場合は本 issue を reopen または新 issue を起票し、runbook と `verify:slo-observation` を再実行する。
- delivery closure との分離判断は [feature closeout 仕様反映受領書](../docs/features/feat-hub-foundation/feature-closeout-spec-reflection-receipt.md) に記録する。
