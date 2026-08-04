---
graph_node_id: "issue-actions-secrets-provisioning-evidence-20260725"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","beads","orphan-recovery"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "GitHub Actions secret / variable を実投入し、backup 初回成功と A1 完走の証跡を取る"
owners: ["daishiman"]
created_at: "2026-07-25T03:37:11Z"
updated_at: "2026-07-25T11:12:00Z"
status: "draft"
depends_on: []
related_nodes: ["issue-bd-external-ref-orphan-nodes-20260725","issue-orphan-external-ref-backlog-disposition-20260726"]
resource_scope: []
purpose: "未解決の Beads issue HarnessHub-vns9 を canonical graph から到達可能に戻し、課題内容を失わず ready/parity の信号を回復する"
goal: "GitHub Actions secret / variable を実投入し、backup 初回成功と A1 完走の証跡を取る"
mvp_alignment: null
scope_in: ["Beads issue HarnessHub-vns9 の題名・説明・notes・受入条件を保持した issue node の復元"]
scope_out: ["orphan 復元と同時に元 issue の実装や close を行うこと"]
acceptance: ["runbook §1 の 2-a / 2-b / 2-c を実行して secret / variable を投入する","node scripts/ci/check-actions-secrets.mjs --live が exit 0 で通る (これが投入完了の証跡)","hub-backup を workflow_dispatch で 1 回起動し、R2 に db-export/<YYYY>/<YYYY-MM-DD>.jsonl.gz が置かれることを確認する (feat-hub-foundation/runbook.md §7 U-1 の残条件)","ci.yml の deploy job が完走し、feat-hub-foundation/release-notes.md の未完了項目 #5 (GitHub Secrets / Variables 未確認) と A1 blocked を解消する","C02 writer の検証を通り、external_ref が canonical graph の実在 node を指す"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-actions-secrets-provisioning-evidence-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-28T00:24:44.656Z","origin_kind":"generated","source_digest":"b40736724c6d713f67c509df3473fc31db7fdd7eee0aef97d9a677ceef0c4f80","source_path":"issues/sys-orphan-external-ref-backlog-disposition-20260726.md#HarnessHub-vns9","source_plugin":"dev-graph","source_version":null}
classification_confidence: 1
classification_reason: "2026-07-28 orphan 再棚卸しで HarnessHub-vns9 の本文と notes を確認し、未解決で実作業を持つため参照剥がし・close ではなく node 復元と判断"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-actions-secrets-provisioning-evidence-20260725.md","confidence":1}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-vns9","linked_at":"2026-07-28T00:24:44.663Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-28T00:24:44.663Z","missing_sections":[],"status":"complete"}
---

# 概要

GitHub Actions secret / variable を実投入し、backup 初回成功と A1 完走の証跡を取る

## 背景と問題

Beads の未解決 issue `HarnessHub-vns9` は `dev-graph:issue-actions-secrets-provisioning-evidence-20260725` を参照しているが、
canonical graph に node が無く、課題本文が ready/parity の対象から外れていた。
課題自体は未解決で内容も有効なため、参照を剥がしたり close したりせず node として復元する。

### Beads に記録された内容

HarnessHub-fnzl で台帳 (scripts/ci/actions-secrets-registry.json) と突合ゲート (scripts/ci/check-actions-secrets.mjs) と手順 (feat-hub-foundation/runbook.md §1) は整えたが、実投入そのものはユーザー作業のため未実施。actions/secrets=0 の状態は変わっていない。

背景: fnzl の defect は「backup.yml が要求する secret がどの文書にも載っていなかった」ことで、その乖離は解消済み。残るのは投入という運用作業と、その証跡取得。

受け入れ条件:
- runbook §1 の 2-a / 2-b / 2-c を実行して secret / variable を投入する
- node scripts/ci/check-actions-secrets.mjs --live が exit 0 で通る (これが投入完了の証跡)
- hub-backup を workflow_dispatch で 1 回起動し、R2 に db-export/<YYYY>/<YYYY-MM-DD>.jsonl.gz が置かれることを確認する (feat-hub-foundation/runbook.md §7 U-1 の残条件)
- ci.yml の deploy job が完走し、feat-hub-foundation/release-notes.md の未完了項目 #5 (GitHub Secrets / Variables 未確認) と A1 blocked を解消する

### Beads notes

2026-07-25 wt-10 訂正: 本 issue の前提だった『actions/secrets=0 の状態は変わっていない』は事実誤認になった。gh api 実測で secrets 6 件 (CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN / TURSO_API_TOKEN / TURSO_AUTH_TOKEN / TURSO_DATABASE_NAME / TURSO_DATABASE_URL) と variables 1 件 (HUB_HEALTH_URL) が wt-6 により投入済み。残る未投入は R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / HUB_PUBLIC_URL。ただし R2_* 3 本を投入すべきかは HarnessHub-7j21 (backup.yml の R2 書込方式が wt-10 と wt-6 で衝突) の決着次第で、wt-6 案を採るなら 3 本とも不要になる。よって本 issue の残作業は 7j21 の決着後に確定する。HUB_PUBLIC_URL (cwv.yml の計測対象) だけは方式に依存しないため先行投入可。

## 現在の挙動

`bd-bridge.py --op orphan-audit --scan-refs` では、この参照が
`repoint_or_close` の非クローズ orphan として検出される。どの走査 ref にも同名 node が無く、
issue 文書も存在しないため、canonical graph から課題へ到達できない。

## 期待する挙動

同じ `graph_node_id` の issue node と本文が C02 writer 経由で登録され、Beads の
`external_ref` が実在 node を指す。元の課題内容と notes は失われず、実装は別タスクとして継続できる。

## 再現手順またはユースケース

1. `bd --readonly show HarnessHub-vns9 --json` で `external_ref` と元の本文を読む。
2. `python3 plugins/dev-graph/scripts/bd-bridge.py --op orphan-audit --repo-root . --scan-refs` を実行する。
3. 出力で `HarnessHub-vns9` が非クローズ orphan に含まれることを確認する。

## 影響と優先度

- 影響範囲: dev-graph の ready/parity 表示と、未解決バックログへの到達性
- 深刻度: high
- 緊急度: 警告を orphan 在庫で埋めず、本物の manifest 取りこぼしを識別できる状態へ戻す必要がある

## スコープ

- In: 元 Beads issue の内容を保持した issue node の復元
- Out: 元 issue が要求する機能・文書・運用作業そのものの実装

## 関連グラフ

- 原因/親ノード: `issue-bd-external-ref-orphan-nodes-20260725`
- 関連仕様: `issue-orphan-external-ref-backlog-disposition-20260726`
- 関連アーキテクチャ: N/A: orphan 復元は既存課題の到達性回復であり新規アーキテクチャを定義しない
- 解決タスク: `issue-actions-secrets-provisioning-evidence-20260725`

## 受入条件

- [ ] runbook §1 の 2-a / 2-b / 2-c を実行して secret / variable を投入する
- [ ] node scripts/ci/check-actions-secrets.mjs --live が exit 0 で通る (これが投入完了の証跡)
- [ ] hub-backup を workflow_dispatch で 1 回起動し、R2 に db-export/<YYYY>/<YYYY-MM-DD>.jsonl.gz が置かれることを確認する (feat-hub-foundation/runbook.md §7 U-1 の残条件)
- [ ] ci.yml の deploy job が完走し、feat-hub-foundation/release-notes.md の未完了項目 #5 (GitHub Secrets / Variables 未確認) と A1 blocked を解消する
- [ ] C02 writer の frontmatter/schema 検証を通り、orphan-audit の非クローズ件数が 1 件減る

## 検証証跡

- コマンド/テスト: `upsert-node.py --dry-run`、`upsert-node.py`、`bd-bridge.py --op orphan-audit --scan-refs`
- 証跡 path: `issues/sys-orphan-external-ref-backlog-disposition-20260726.md`
