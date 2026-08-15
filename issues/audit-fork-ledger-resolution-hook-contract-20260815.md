---
graph_node_id: "issue-audit-fork-ledger-resolution-hook-contract-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["audit-fork","hook","regression-test","system-spec-harness"]
priority: "high"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "監査 fork 台帳の pending 解決を hook 契約として固定する"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:10.340791Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["eval-log/system-spec-harness/prototypes/resolve-audit-fork.py","plugins/system-spec-harness/hooks/record-audit-fork.py","plugins/system-spec-harness/tests/","plugins/system-spec-harness/skills/assign-system-spec-completeness-evaluator/prompts/R2-delegate.md"]
purpose: "監査 fork の verdict 帰属検証が構造的に FAIL する状態を解消し、解決経路を回帰テストで固定する"
goal: "resolve-audit-fork.py の解決規則が回帰テストで固定され、pending 行の昇格が単調・冪等・早取りなしで再現できる状態"
scope_in: ["plugins/system-spec-harness/tests/ へ resolve-audit-fork.py の回帰テストを追加","単調性・in-place・冪等・早取り凍結・自己 absent 再試行・他者 absent 不可侵の 6 観点","名前付き fork (<name>@<teamName>) の meta 突合による transcript 解決","record-audit-fork.py の agent_id 抽出を payload fixture で固定","R2-delegate.md の台帳 writer 記述を PostToolUse / SubagentStop へ更新"]
scope_out: ["台帳 schema そのものの再設計","Agent 起動の同期化"]
acceptance: ["resolved 行の verdict を書き換えないテストが green","実行中 (marker 未書込) transcript に対して行が変更されないテストが green","resolution_source 付き absent が marker 出現後に resolved へ昇格するテストが green","同名 fork の meta 複数一致時に解決せず pending を残すテストが green","2 回実行で差分 0 の冪等テストが green"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/audit-fork-ledger-resolution-hook-contract-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"1f42a7f2e929d742af2b755369ff099f17eca4539d54c231e96aadba24090680","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "監査 fork の verdict 帰属検証が構造的に FAIL する状態を解消し、解決経路を回帰テストで固定する"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/audit-fork-ledger-resolution-hook-contract-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-y2x1","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

監査 fork 台帳の pending 解決を hook 契約として固定する

## 背景と問題

監査 fork の verdict 帰属検証が構造的に FAIL する状態を解消し、解決経路を回帰テストで固定する

## 現在の挙動

### 背景

現行ハーネスの `Agent` は非同期起動で、`PostToolUse` が観測できるのは `status=async_launched` の起動受理のみ。最終応答 (`AUDIT_VERDICT:`) がそこに無いため台帳は必ず `verdict_state=pending` で着地し、`audit_fork_attribution.py` が要求する `resolved` を満たせず fork 帰属検証が構造的に FAIL していた。

### 実装済みの対応

pending 行だけを fork transcript の最終 marker から in-place 昇格させる hook を設計し、未配線の実装草案を `eval-log/system-spec-harness/prototypes/resolve-audit-fork.py` に保存した。正式な `hooks/resolve-audit-fork.py` 配置、`SubagentStop` / `Stop` 配線、回帰テスト、live-trial 更新が揃うまでは実行入口にしない。

### 踏んだ欠陥 1 (修正済み・回帰テスト必須)

初版は marker 未検出時に `absent` を書いていた。`SubagentStop` は個別 fork の停止で発火するのに本 hook は台帳全体を掃くため、fork A の停止が実行中の fork B の transcript を早取りし、終端状態へ凍結していた。実測で 2 行が `absent` に凍結され、その fork は実際には `AUDIT_VERDICT: PASS` を書き終えていた。

修正: marker が無いときは行を変更せず `pending` のまま残す。自分が書いた `absent` は `resolution_source` で識別して再試行対象へ戻す。

### 踏んだ欠陥 2 (修正済み・回帰テスト必須)

名前を付けて起動した fork (`taskKind: in_process_teammate`) は台帳の `agent_id` が `c07-matrix-r8@session-0b3baed6` の `<name>@<teamName>` 形式になる一方、transcript の実ファイル名は `agent-a<name>-<hash>.jsonl` で hash が付く。`find_transcript` は完全一致だけを見ていたため、名前付き fork は marker を書き終えていても永久に pending のままだった。

修正: 併置された `*.meta.json` の `name` + `teamName` で厳密に突き合わせる `find_transcript_by_meta` を fallback に追加。候補が 1 件に定まらなければ解決せず pending を残す。

### この欠陥が隠れていた理由

症状が「監査 fork が marker を書かない」と区別できない。実際 `c07-matrix-r5` / `r6` は本当に marker を書いておらず、同じ pending として混ざっていた。台帳に `resolution_attempted_reason` を残し「transcript 未発見」と「marker 未検出」を区別できるようにする follow-up を検討する。

### 禁止事項

台帳は PostToolUse / SubagentStop hook だけが書く証跡であり、outer session が pending 行を resolved へ手で書き換えてはならない。

## 期待する挙動

resolve-audit-fork.py の解決規則が回帰テストで固定され、pending 行の昇格が単調・冪等・早取りなしで再現できる状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: quality
- 深刻度: high
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - plugins/system-spec-harness/tests/ へ resolve-audit-fork.py の回帰テストを追加
  - 単調性・in-place・冪等・早取り凍結・自己 absent 再試行・他者 absent 不可侵の 6 観点
  - 名前付き fork (<name>@<teamName>) の meta 突合による transcript 解決
  - record-audit-fork.py の agent_id 抽出を payload fixture で固定
  - R2-delegate.md の台帳 writer 記述を PostToolUse / SubagentStop へ更新
- Out:
  - 台帳 schema そのものの再設計
  - Agent 起動の同期化

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] resolved 行の verdict を書き換えないテストが green
- [ ] 実行中 (marker 未書込) transcript に対して行が変更されないテストが green
- [ ] resolution_source 付き absent が marker 出現後に resolved へ昇格するテストが green
- [ ] 同名 fork の meta 複数一致時に解決せず pending を残すテストが green
- [ ] 2 回実行で差分 0 の冪等テストが green

## 検証証跡

- 対象 path:
- `eval-log/system-spec-harness/prototypes/resolve-audit-fork.py`
- `plugins/system-spec-harness/hooks/record-audit-fork.py`
- `plugins/system-spec-harness/tests/`
- `plugins/system-spec-harness/skills/assign-system-spec-completeness-evaluator/prompts/R2-delegate.md`
- 証跡 path: eval-log/dev-graph/
