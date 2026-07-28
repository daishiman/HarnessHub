---
graph_node_id: "issue-spec-state-writer-implicit-contracts-20260721"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","beads","orphan-recovery"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "spec-state writer の暗黙挙動 4 件を契約化し、C06 早期停止の除外ルールを再設計する"
owners: ["daishiman"]
created_at: "2026-07-21T10:01:10Z"
updated_at: "2026-07-21T10:01:10Z"
status: "draft"
depends_on: []
related_nodes: ["issue-bd-external-ref-orphan-nodes-20260725","issue-orphan-external-ref-backlog-disposition-20260726"]
resource_scope: []
purpose: "未解決の Beads issue HarnessHub-d15 を canonical graph から到達可能に戻し、課題内容を失わず ready/parity の信号を回復する"
goal: "spec-state writer の暗黙挙動 4 件を契約化し、C06 早期停止の除外ルールを再設計する"
mvp_alignment: null
scope_in: ["Beads issue HarnessHub-d15 の題名・説明・notes・受入条件を保持した issue node の復元"]
scope_out: ["orphan 復元と同時に元 issue の実装や close を行うこと"]
acceptance: ["Beads issue HarnessHub-d15 の未解決内容と判断根拠が保持され、実装時に検証結果を記録できる","C02 writer の検証を通り、external_ref が canonical graph の実在 node を指す"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-spec-state-writer-implicit-contracts-20260721.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-28T00:24:44.697Z","origin_kind":"generated","source_digest":"438b211516b0c8e65e2c6cbbe3390d2be55682d4cb403a45e52b8741bb9a60cb","source_path":"issues/sys-orphan-external-ref-backlog-disposition-20260726.md#HarnessHub-d15","source_plugin":"dev-graph","source_version":null}
classification_confidence: 1
classification_reason: "2026-07-28 orphan 再棚卸しで HarnessHub-d15 の本文と notes を確認し、未解決で実作業を持つため参照剥がし・close ではなく node 復元と判断"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-spec-state-writer-implicit-contracts-20260721.md","confidence":1}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-d15","linked_at":"2026-07-28T00:24:44.698Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-28T00:24:44.698Z","missing_sections":[],"status":"complete"}
---

# 概要

spec-state writer の暗黙挙動 4 件を契約化し、C06 早期停止の除外ルールを再設計する

## 背景と問題

Beads の未解決 issue `HarnessHub-d15` は `dev-graph:issue-spec-state-writer-implicit-contracts-20260721` を参照しているが、
canonical graph に node が無く、課題本文が ready/parity の対象から外れていた。
課題自体は未解決で内容も有効なため、参照を剥がしたり close したりせず node として復元する。

### Beads に記録された内容

# 概要

`issue-audit-followups-20260717` (HarnessHub-xon) の最終レビューで、SSOT 記述を `apply-spec-transition.py` の実挙動へ独立に突き合わせた際、hearing_progress 3 field の意味論とは別に **契約に未記載の暗黙挙動 4 件** と **C06 早期停止 (a) の除外ルールの構造的な穴 2 件** が判明した。前者の issue はスコープを「hearing_progress の意味論」に限って閉じたため、本 issue で分離して追跡する。

## 背景と問題

C01 の単一 transition writer 契約 (`references/spec-state-contract.md`) は「確定巻き戻し拒否」「R4-reopen 経由のみ確定変更」を不変則として掲げるが、writer の実挙動にはそれと整合しない、あるいは監査が依存しているのに契約へ書かれていない振る舞いが残っている。

## 現在の挙動

1. **[medium] reopen が field を無言で破棄する**: `reopen` op はセル dict を `{"state": "未収集", "reopened_from": ..., "reopen_reason": ...}` で**丸ごと置換**するため、`qa_ref` と `serves_goals` が失われる。C9 anchor (上位概念トレース) が reopen で消え、`reopen_log` にも破棄の事実は残らない。
2. **[medium] `init --state` が確定巻き戻し拒否を迂回する**: 既存 state を渡した `init` は matrix を全セル未収集で作り直すため、確定セルが `reopen_log` なしで巻き戻る。契約本文の「確定を動かせるのは `reopen` だけ」と文面上矛盾する。
3. **[low] 早期停止 (b) が実質発火不能**: 監査条件「`loop_count` が上限に達したのに `next_question`/未完了状態が保存されず打ち切られ resume 不能」は、`run_chunk` が末尾で常に両 field を保存するため writer 出力に対して成立しない。加えて監査側は上限 5 をハードコードするが `--max-loops` は任意値を取れる。
4. **[low] `reopened_from` / `reopen_reason` が形状定義に無い**: C11 hook (`guard-confirmed-chapter-overwrite.py`) と C06 の除外条件がこのキーに依存しているのに、契約の形状サンプルと cell state 表には未記載。
5. **[medium] 早期停止 (a) の除外ルールの穴**: 現行の 2 マーカー方式は (i) reopen 後に再収集されず放置されたセルを恒久的に検出対象外にし (自己解消は再 `confirm`/`exclude` された場合のみ)、(ii) `add-category` 後に `apply` で一部セルだけ埋めると `

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

1. `bd --readonly show HarnessHub-d15 --json` で `external_ref` と元の本文を読む。
2. `python3 plugins/dev-graph/scripts/bd-bridge.py --op orphan-audit --repo-root . --scan-refs` を実行する。
3. 出力で `HarnessHub-d15` が非クローズ orphan に含まれることを確認する。

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
- 解決タスク: `issue-spec-state-writer-implicit-contracts-20260721`

## 受入条件

- [ ] Beads issue HarnessHub-d15 の未解決内容と判断根拠が保持され、実装時に検証結果を記録できる
- [ ] C02 writer の frontmatter/schema 検証を通り、orphan-audit の非クローズ件数が 1 件減る

## 検証証跡

- コマンド/テスト: `upsert-node.py --dry-run`、`upsert-node.py`、`bd-bridge.py --op orphan-audit --scan-refs`
- 証跡 path: `issues/sys-orphan-external-ref-backlog-disposition-20260726.md`
