---
graph_node_id: "issue-backup-failure-undetected-20260728"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["backup","monitoring","ops","qa-027"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "日次 backup の連続失敗が 3 夜気づかれなかった (BACKUP_HEARTBEAT_URL 未投入で不発・失敗が無音になる)"
owners: ["daishiman"]
created_at: "2026-07-28T02:40:00Z"
updated_at: "2026-07-28T04:49:52.215131Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["issues/sys-backup-failure-undetected-20260728.md",".github/workflows/backup.yml","scripts/ci/actions-secrets-registry.json","apps/hub/monitoring/better-stack.monitors.json","docs/features/feat-hub-foundation/runbook.md"]
purpose: "hub-backup が稼働開始以来 3 回連続で失敗し R2 に成果物が 1 つも無い状態が続いたにもかかわらず誰も気づかなかった。失敗そのものは是正したが、気づけなかった経路の欠落を塞がない限り同じ事態が再発する"
goal: "日次 backup が失敗または不発になったとき、外形監視側が無音のままにならず、当日中に気づける状態になっている"
scope_in: ["BACKUP_HEARTBEAT_URL の投入と着信実測","backup 用 heartbeat 資源を CRON_HEARTBEAT_URL と共用するか分離するかの決定","連続失敗が無音にならないことの確認 (period と猶予の整合)","台帳の requirement 見直し (optional 据え置き / required 昇格)"]
scope_out: ["backup.yml の採否判定の是正 (HarnessHub-vns9 で実施済み)","四半期 restore drill の実行","Better Stack monitor の paused 解除 (HarnessHub-37h.15)"]
acceptance: ["BACKUP_HEARTBEAT_URL を投入し、成功 run で heartbeat の着信を実測している","Worker cron 用 CRON_HEARTBEAT_URL と資源を共用するか分離するかを決め、根拠を runbook へ記録している","日次 backup が連続失敗した場合に無音にならないことを、heartbeat の period と猶予の整合で説明できる","scripts/ci/actions-secrets-registry.json の requirement を optional 据え置きか required 昇格かで判断し反映している"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-backup-failure-undetected-20260728.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-28T02:40:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "HarnessHub-vns9 の実作業中に判明した監視側の欠陥。backup 自体の判定不具合は vns9 で是正したが、3 夜連続失敗が誰にも気づかれなかった経路の欠落は別問題であり独立 issue として切り出す"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-backup-failure-undetected-20260728.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-dbx6","linked_at":"2026-07-28T04:49:52.215131Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-28T02:40:00Z","missing_sections":[],"status":"complete"}
---

# 概要

日次 backup (`hub-backup`) が稼働開始以来 3 回連続で失敗し R2 に成果物が 1 つも無い状態が数日続いたが、誰にも気づかれなかった。失敗そのものは `HarnessHub-vns9` で是正したが、**気づけなかった経路の欠落**は塞がれていない。

## 背景と問題

`backup.yml` には Better Stack の heartbeat を叩く step があるが、その URL を渡す `BACKUP_HEARTBEAT_URL` が GitHub Actions の secret として投入されていない (`requirement: optional` のため `check-actions-secrets.mjs --live` も落ちない)。

結果として次の 2 つがどちらも無音になる。

- **cron 不発**: schedule が発火せずジョブが起動すらしない場合、GitHub 側には run が 1 つも残らない。run が無いので「失敗通知」も出ない (qa-027 が対象とする経路)。
- **cron 失敗**: 起動はしたが step で落ちる場合、run は `failure` で残るが、それを能動的に見に行かない限り気づけない。

2026-07-28 に `HarnessHub-vns9` の作業で `gh run list` を叩いて初めて、run 30321679596 / 30293639238 / 30213823182 の 3 連続失敗と、R2 バケット `harness-hub-backups` が空であること (`The specified key does not exist`) が判明した。

つまり RPO ≤ 24h は**運用上満たされていなかった**にもかかわらず、その事実が数日間だれの目にも触れなかった。

## 現在の挙動

- `BACKUP_HEARTBEAT_URL` 未投入 → `backup.yml` の heartbeat step は skip される。
- Better Stack 側には backup 用の heartbeat 資源が存在しない (適用済みなのは Worker cron 用の heartbeat 475650 のみ、`apps/hub/monitoring/better-stack.monitors.json`)。
- したがって backup が 3 夜連続で落ちても、外形監視は一切変化しない。
- `scripts/ci/actions-secrets-registry.json` 上の requirement は `optional`。ゲートは通るので、CI からも欠落が指摘されない。

## 期待する挙動

日次 backup が失敗または不発になったとき、外形監視側の状態が当日中に変化し、能動的に run 一覧を見に行かなくても気づける。

## 再現手順またはユースケース

1. `BACKUP_HEARTBEAT_URL` が未投入の状態で `backup.yml` を失敗させる (または schedule を発火させない)。
2. Better Stack の incident / status を確認する。
3. 何も変化していないことを確認する。

## 影響と優先度

- 影響範囲: system / data — バックアップが取れていない期間そのものがデータ損失リスク。復旧目標 (RPO ≤ 24h) の達成可否が観測できない。
- 深刻度: high
- 緊急度: 実際に 3 夜連続で見逃した実績がある。`HarnessHub-vns9` の是正で backup 自体は通るようになる見込みだが、次に別の原因で落ちたときは同じく無音になる。

## スコープ

- In: `BACKUP_HEARTBEAT_URL` の投入と着信実測 / backup 用 heartbeat 資源を Worker cron 用 (`CRON_HEARTBEAT_URL`) と共用するか分離するかの決定 / 連続失敗が無音にならないことの確認 (heartbeat の period と猶予の整合) / 台帳 requirement の見直し
- Out: `backup.yml` の採否判定の是正 (`HarnessHub-vns9` で実施済み) / 四半期 restore drill の実行 / Better Stack monitor の paused 解除 (`HarnessHub-37h.15`)

## 関連グラフ

- 原因/親ノード: `issue-actions-secrets-missing-20260725` (`HarnessHub-fnzl`。secret 台帳とゲートを整えた元ノード)
  - 直接の派生元は `HarnessHub-vns9` (GitHub issue 111) だが、**これに対応する dev-graph node は存在しない**。beads と GitHub issue だけで追跡されている運用タスクのため、ここでは node ID を書かない (実在しない ID を書くと後続の突合が空振りする)。backup 失敗の直接原因は vns9 側で是正済み。
- 関連仕様: `feature-package/feat-hub-foundation`
- 関連アーキテクチャ: `apps/hub/monitoring/better-stack.monitors.json` (監視資源の正本)
- 解決タスク: 未作成

## 受入条件

- [ ] `BACKUP_HEARTBEAT_URL` を投入し、成功 run で heartbeat の着信を実測している
- [ ] Worker cron 用 `CRON_HEARTBEAT_URL` と資源を共用するか分離するかを決め、根拠を runbook へ記録している
- [ ] 日次 backup が連続失敗した場合に無音にならないことを、heartbeat の period と猶予の整合で説明できる
- [ ] `scripts/ci/actions-secrets-registry.json` の requirement を optional 据え置きか required 昇格かで判断し反映している

## 検証証跡

- コマンド/テスト:
  - `node scripts/ci/check-actions-secrets.mjs --live`
  - `gh workflow run backup.yml --ref main` → `gh run view <id> --json conclusion,jobs`
  - `pnpm --filter @harness-hub/hub exec vitest run tests/monitoring`
- 証跡 path: `docs/features/feat-hub-foundation/evidence/actions-secrets-2026-07-28.json` (3 連続失敗と R2 空の実測)
