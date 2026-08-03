---
graph_node_id: "issue-guard-script-file-indirection-20260726"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","beads","orphan-recovery"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "dev-graph: guard-graph-schema の共起判定はコマンド文字列しか見ないため script file へ隠した graph authority 書込みを遮断できない"
owners: ["daishiman"]
created_at: "2026-07-25T23:05:02Z"
updated_at: "2026-07-25T23:05:02Z"
status: "draft"
depends_on: []
related_nodes: ["issue-bd-external-ref-orphan-nodes-20260725","issue-orphan-external-ref-backlog-disposition-20260726"]
resource_scope: []
purpose: "未解決の Beads issue HarnessHub-kzth を canonical graph から到達可能に戻し、課題内容を失わず ready/parity の信号を回復する"
goal: "dev-graph: guard-graph-schema の共起判定はコマンド文字列しか見ないため script file へ隠した graph authority 書込みを遮断できない"
mvp_alignment: null
scope_in: ["Beads issue HarnessHub-kzth の題名・説明・notes・受入条件を保持した issue node の復元"]
scope_out: ["orphan 復元と同時に元 issue の実装や close を行うこと"]
acceptance: ["Beads issue HarnessHub-kzth の未解決内容と判断根拠が保持され、実装時に検証結果を記録できる","C02 writer の検証を通り、external_ref が canonical graph の実在 node を指す"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-guard-script-file-indirection-20260726.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-28T00:24:44.682Z","origin_kind":"generated","source_digest":"91e37bc560f21490df788d4899112e593a6bfcafafbf5aa06f126164f1831635","source_path":"issues/sys-orphan-external-ref-backlog-disposition-20260726.md#HarnessHub-kzth","source_plugin":"dev-graph","source_version":null}
classification_confidence: 1
classification_reason: "2026-07-28 orphan 再棚卸しで HarnessHub-kzth の本文と notes を確認し、未解決で実作業を持つため参照剥がし・close ではなく node 復元と判断"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-guard-script-file-indirection-20260726.md","confidence":1}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-kzth","linked_at":"2026-07-28T00:24:44.682Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-28T00:24:44.682Z","missing_sections":[],"status":"complete"}
---

# 概要

dev-graph: guard-graph-schema の共起判定はコマンド文字列しか見ないため script file へ隠した graph authority 書込みを遮断できない

## 背景と問題

Beads の未解決 issue `HarnessHub-kzth` は `dev-graph:issue-guard-script-file-indirection-20260726` を参照しているが、
canonical graph に node が無く、課題本文が ready/parity の対象から外れていた。
課題自体は未解決で内容も有効なため、参照を剥がしたり close したりせず node として復元する。

### Beads に記録された内容

guard-graph-schema.py は graph authority への interpreter 経由書込みを「interpreter 起動 x 書込み動詞 x authority path」の共起で遮断するが、3 条件すべてをコマンド文字列から読むため、書込みを script file の中へ移すと 1 つも成立しない。deny_reason() を直接呼んだ 2026-07-25 実測: 直接 interpreter の pathlib 迂回と heredoc redirect は BLOCK、間接起動 2 形 (python3 と bash) は ALLOW、さらに authority path を引数で渡す形も ALLOW。最後の 1 件は authority path がコマンド文字列に現れているのに、書込み動詞が script 側にあり共起が成立せず通る。script 自体は authority ではないので作成する Write も遮断されず、2 手で guard を一度も踏まずに graph authority を書ける。共起から書込み動詞を落とす 2 条件化は C11 検証起動と読取りを巻き込むため採らない。script の中身を読む案は遮断経路の内側に file I/O を足すことになり HarnessHub-6in4 の fail-open 原因を再導入する方向で、間接の深さにも上限が無い。想定される方向は PostToolUse での事後検出、store 側 envelope 検査の強化 (2026-07-26 に init-store の canonicality を 4 key 完全一致へ強化したのはこの方向だが C11 が envelope を見ないため層として未完成)、遮断できない範囲の契約としての明文化の 3 つ。詳細は該当 issue 文書を参照。

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

1. `bd --readonly show HarnessHub-kzth --json` で `external_ref` と元の本文を読む。
2. `python3 plugins/dev-graph/scripts/bd-bridge.py --op orphan-audit --repo-root . --scan-refs` を実行する。
3. 出力で `HarnessHub-kzth` が非クローズ orphan に含まれることを確認する。

## 影響と優先度

- 影響範囲: dev-graph の ready/parity 表示と、未解決バックログへの到達性
- 深刻度: medium
- 緊急度: 警告を orphan 在庫で埋めず、本物の manifest 取りこぼしを識別できる状態へ戻す必要がある

## スコープ

- In: 元 Beads issue の内容を保持した issue node の復元
- Out: 元 issue が要求する機能・文書・運用作業そのものの実装

## 関連グラフ

- 原因/親ノード: `issue-bd-external-ref-orphan-nodes-20260725`
- 関連仕様: `issue-orphan-external-ref-backlog-disposition-20260726`
- 関連アーキテクチャ: N/A: orphan 復元は既存課題の到達性回復であり新規アーキテクチャを定義しない
- 解決タスク: `issue-guard-script-file-indirection-20260726`

## 受入条件

- [ ] Beads issue HarnessHub-kzth の未解決内容と判断根拠が保持され、実装時に検証結果を記録できる
- [ ] C02 writer の frontmatter/schema 検証を通り、orphan-audit の非クローズ件数が 1 件減る

## 検証証跡

- コマンド/テスト: `upsert-node.py --dry-run`、`upsert-node.py`、`bd-bridge.py --op orphan-audit --scan-refs`
- 証跡 path: `issues/sys-orphan-external-ref-backlog-disposition-20260726.md`
