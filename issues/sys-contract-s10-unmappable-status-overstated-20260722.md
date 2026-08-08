---
graph_node_id: "issue-contract-s10-unmappable-status-overstated-20260722"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","beads","orphan-recovery"]
priority: "low"
start_date: null
target_date: null
iteration: null
title: "execution-tracker-contract §10 の unmappable_status の説明が実測より過大で、回復手順の > 上書きが既存 receipt を壊しうる"
owners: ["daishiman"]
created_at: "2026-07-21T21:26:06Z"
updated_at: "2026-08-04T03:16:47Z"
status: "closed"
depends_on: []
related_nodes: ["issue-bd-external-ref-orphan-nodes-20260725","issue-orphan-external-ref-backlog-disposition-20260726"]
resource_scope: []
purpose: "未解決の Beads issue HarnessHub-rzc を canonical graph から到達可能に戻し、課題内容を失わず ready/parity の信号を回復する"
goal: "execution-tracker-contract §10 の unmappable_status の説明が実測より過大で、回復手順の > 上書きが既存 receipt を壊しうる"
mvp_alignment: null
scope_in: ["Beads issue HarnessHub-rzc の題名・説明・notes・受入条件を保持した issue node の復元"]
scope_out: ["orphan 復元と同時に元 issue の実装や close を行うこと"]
acceptance: ["Beads issue HarnessHub-rzc の未解決内容と判断根拠が保持され、実装時に検証結果を記録できる","C02 writer の検証を通り、external_ref が canonical graph の実在 node を指す"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-contract-s10-unmappable-status-overstated-20260722.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-28T00:24:44.674Z","origin_kind":"generated","source_digest":"18bb3add3f12e332db583858d1cc7e58983a6a65b0677c1b543a1b5ec561bc86","source_path":"issues/sys-orphan-external-ref-backlog-disposition-20260726.md#HarnessHub-rzc","source_plugin":"dev-graph","source_version":null}
classification_confidence: 1
classification_reason: "2026-07-28 orphan 再棚卸しで HarnessHub-rzc の本文と notes を確認し、未解決で実作業を持つため参照剥がし・close ではなく node 復元と判断"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-contract-s10-unmappable-status-overstated-20260722.md","confidence":1}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-rzc","linked_at":"2026-07-28T00:24:44.674Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-28T00:24:44.674Z","missing_sections":[],"status":"complete"}
---

# 概要

execution-tracker-contract §10 の unmappable_status の説明が実測より過大で、回復手順の > 上書きが既存 receipt を壊しうる

## 背景と問題

Beads の未解決 issue `HarnessHub-rzc` は `dev-graph:issue-contract-s10-unmappable-status-overstated-20260722` を参照しているが、
canonical graph に node が無く、課題本文が ready/parity の対象から外れていた。
課題自体は未解決で内容も有効なため、参照を剥がしたり close したりせず node として復元する。

### Beads に記録された内容

HarnessHub-bsa で §10 へ追記した再生成手順に 2 点の不正確さが残る。(1) 『unmappable_status に列挙し、C28 で conflicts になる件数を実行前に見せる』と書いたが、実測では unmappable_status=2 (draft 2 件) に対し conflicts=0 だった。C28 が conflicts を出すのは bd ready 候補と照合された node に限られるため、unmappable_status は『conflicts になりうる node』の上限であって件数ではない。(2) 回復手順 2 段目のコマンドが bd-bridge.py ... > <ready json> と上書きリダイレクトのため、途中で失敗すると既存の正常な receipt が 0 バイトへ切り詰められる。一時ファイルへ書いてから mv する形か、bd-bridge 側に出力先引数を持たせるのが安全。

### Beads notes

[2026-07-25] HarnessHub-57v の対応で execution-tracker-contract §10 を編集したため、本 issue の前提を再確認した結果 (本 issue は未解決のまま据え置き)。

- 指摘 (1) `unmappable_status` の説明が過大: 現行 §10 本文に `unmappable_status` という語は存在しない (repo 全文検索の hit は plugins/dev-graph/tests/test_build_parity_manifest.py の関数名のみ)。指摘対象の文言は別 commit で既に消えている可能性が高い。close 前に「どの文が過大なのか」を現行本文で再特定すること。
- 指摘 (2) 回復手順の `>` 上書きが既存 receipt を破壊しうる: §10 側は未対処。参考実装として docs/features/feat-mvp-first-scheduling/operations.md §2.3 は mktemp + mv 形式で書いてあるので、§10 の回復手順も同形式へ揃えるのが残作業。
- 57v 側で追記したのは generator authority (単一 writer / status 無間引き / unlinked・dependency_gaps の理由残置 / C03 apply 時の pending_retry) の 4 bullet であり、上記 2 点には触れていない。

## 現在の挙動

`bd-bridge.py --op orphan-audit --scan-refs` では、この参照が
`repoint_or_close` の非クローズ orphan として検出される。どの走査 ref にも同名 node が無く、
issue 文書も存在しないため、canonical graph から課題へ到達できない。

## 期待する挙動

同じ `graph_node_id` の issue node と本文が C02 writer 経由で登録され、Beads の
`external_ref` が実在 node を指す。元の課題内容と notes は失われず、実装は別タスクとして継続できる。

## 再現手順またはユースケース

1. `bd --readonly show HarnessHub-rzc --json` で `external_ref` と元の本文を読む。
2. `python3 plugins/dev-graph/scripts/bd-bridge.py --op orphan-audit --repo-root . --scan-refs` を実行する。
3. 出力で `HarnessHub-rzc` が非クローズ orphan に含まれることを確認する。

## 影響と優先度

- 影響範囲: dev-graph の ready/parity 表示と、未解決バックログへの到達性
- 深刻度: low
- 緊急度: 警告を orphan 在庫で埋めず、本物の manifest 取りこぼしを識別できる状態へ戻す必要がある

## スコープ

- In: 元 Beads issue の内容を保持した issue node の復元
- Out: 元 issue が要求する機能・文書・運用作業そのものの実装

## 関連グラフ

- 原因/親ノード: `issue-bd-external-ref-orphan-nodes-20260725`
- 関連仕様: `issue-orphan-external-ref-backlog-disposition-20260726`
- 関連アーキテクチャ: N/A: orphan 復元は既存課題の到達性回復であり新規アーキテクチャを定義しない
- 解決タスク: `issue-contract-s10-unmappable-status-overstated-20260722`

## 受入条件

- [ ] Beads issue HarnessHub-rzc の未解決内容と判断根拠が保持され、実装時に検証結果を記録できる
- [ ] C02 writer の frontmatter/schema 検証を通り、orphan-audit の非クローズ件数が 1 件減る

## 検証証跡

- コマンド/テスト: `upsert-node.py --dry-run`、`upsert-node.py`、`bd-bridge.py --op orphan-audit --scan-refs`
- 証跡 path: `issues/sys-orphan-external-ref-backlog-disposition-20260726.md`
