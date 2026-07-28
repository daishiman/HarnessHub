---
graph_node_id: "issue-governance-notion-steps-always-skipped-20260725"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","beads","orphan-recovery"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "governance-check.yml の Notion 検査 2 step が常に skip される (fail-open)"
owners: ["daishiman"]
created_at: "2026-07-25T03:39:52Z"
updated_at: "2026-07-25T03:39:52Z"
status: "draft"
depends_on: []
related_nodes: ["issue-bd-external-ref-orphan-nodes-20260725","issue-orphan-external-ref-backlog-disposition-20260726"]
resource_scope: []
purpose: "未解決の Beads issue HarnessHub-5u5k を canonical graph から到達可能に戻し、課題内容を失わず ready/parity の信号を回復する"
goal: "governance-check.yml の Notion 検査 2 step が常に skip される (fail-open)"
mvp_alignment: null
scope_in: ["Beads issue HarnessHub-5u5k の題名・説明・notes・受入条件を保持した issue node の復元"]
scope_out: ["orphan 復元と同時に元 issue の実装や close を行うこと"]
acceptance: ["secret 有無の判定を step-level if で正しく行う (例: job-level env へ NOTION_TOKEN を置いて if から参照する、または step 内で判定して早期 return する)","NOTION_TOKEN を投入した状態で 2 step が実際に実行されることを確認する (gate 実効性の実測)","未投入時は従来どおり skip して workflow 全体は成功する","C02 writer の検証を通り、external_ref が canonical graph の実在 node を指す"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-governance-notion-steps-always-skipped-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-28T00:24:44.679Z","origin_kind":"generated","source_digest":"9b861c57ce86782aed097a4ddc1912ffe1ddeb7ce3e50bb5f4856f5e0ee8b7d3","source_path":"issues/sys-orphan-external-ref-backlog-disposition-20260726.md#HarnessHub-5u5k","source_plugin":"dev-graph","source_version":null}
classification_confidence: 1
classification_reason: "2026-07-28 orphan 再棚卸しで HarnessHub-5u5k の本文と notes を確認し、未解決で実作業を持つため参照剥がし・close ではなく node 復元と判断"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-governance-notion-steps-always-skipped-20260725.md","confidence":1}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-5u5k","linked_at":"2026-07-28T00:24:44.679Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-28T00:24:44.679Z","missing_sections":[],"status":"complete"}
---

# 概要

governance-check.yml の Notion 検査 2 step が常に skip される (fail-open)

## 背景と問題

Beads の未解決 issue `HarnessHub-5u5k` は `dev-graph:issue-governance-notion-steps-always-skipped-20260725` を参照しているが、
canonical graph に node が無く、課題本文が ready/parity の対象から外れていた。
課題自体は未解決で内容も有効なため、参照を剥がしたり close したりせず node として復元する。

### Beads に記録された内容

governance-check.yml:64,69 の step が 'if: ${{ env.NOTION_TOKEN != '' }}' で分岐しているが、参照している env.NOTION_TOKEN は同じ step の env: ブロックで定義されている。GitHub Actions は step-level の if を step の env 適用より前に評価するため、この式は workflow/job レベルの env を見に行く。workflow にも job にも NOTION_TOKEN の env 定義は無い (1-60 行に env: なし) ので、式は常に '' != '' = false になる。

結果として NOTION_TOKEN を投入しても『notion schema drift check』と『notion relation invariants』は一度も実行されない。設定漏れなら skip という意図に対し、実際は常時 skip の fail-open。

HarnessHub-fnzl (GitHub Actions secret 台帳の整備) で NOTION_TOKEN の挙動を裏取りした際に発見。fnzl の範囲は台帳と backup.yml なので分離する。

受け入れ条件:
- secret 有無の判定を step-level if で正しく行う (例: job-level env へ NOTION_TOKEN を置いて if から参照する、または step 内で判定して早期 return する)
- NOTION_TOKEN を投入した状態で 2 step が実際に実行されることを確認する (gate 実効性の実測)
- 未投入時は従来どおり skip して workflow 全体は成功する

### Beads notes

追加 notes は未記録。

## 現在の挙動

`bd-bridge.py --op orphan-audit --scan-refs` では、この参照が
`repoint_or_close` の非クローズ orphan として検出される。どの走査 ref にも同名 node が無く、
issue 文書も存在しないため、canonical graph から課題へ到達できない。

## 期待する挙動

同じ `graph_node_id` の issue node と本文が C02 writer 経由で登録され、Beads の
`external_ref` が実在 node を指す。元の課題内容と notes は失われず、実装は別タスクとして継続できる。

## 再現手順またはユースケース

1. `bd --readonly show HarnessHub-5u5k --json` で `external_ref` と元の本文を読む。
2. `python3 plugins/dev-graph/scripts/bd-bridge.py --op orphan-audit --repo-root . --scan-refs` を実行する。
3. 出力で `HarnessHub-5u5k` が非クローズ orphan に含まれることを確認する。

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
- 解決タスク: `issue-governance-notion-steps-always-skipped-20260725`

## 受入条件

- [ ] secret 有無の判定を step-level if で正しく行う (例: job-level env へ NOTION_TOKEN を置いて if から参照する、または step 内で判定して早期 return する)
- [ ] NOTION_TOKEN を投入した状態で 2 step が実際に実行されることを確認する (gate 実効性の実測)
- [ ] 未投入時は従来どおり skip して workflow 全体は成功する
- [ ] C02 writer の frontmatter/schema 検証を通り、orphan-audit の非クローズ件数が 1 件減る

## 検証証跡

- コマンド/テスト: `upsert-node.py --dry-run`、`upsert-node.py`、`bd-bridge.py --op orphan-audit --scan-refs`
- 証跡 path: `issues/sys-orphan-external-ref-backlog-disposition-20260726.md`
