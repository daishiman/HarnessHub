---
graph_node_id: "issue-worktree-main-ref-desync-20260728"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","beads","orphan-recovery"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "並列 worktree の refs/heads/main 直接更新で主ワークツリーが desync し、main 巻き戻しコミットを生む"
owners: ["daishiman"]
created_at: "2026-07-28T02:06:37Z"
updated_at: "2026-07-28T02:07:48Z"
status: "draft"
depends_on: []
related_nodes: ["issue-bd-external-ref-orphan-nodes-20260725","issue-orphan-external-ref-backlog-disposition-20260726"]
resource_scope: []
purpose: "未解決の Beads issue HarnessHub-7xi9 を canonical graph から到達可能に戻し、課題内容を失わず ready/parity の信号を回復する"
goal: "並列 worktree の refs/heads/main 直接更新で主ワークツリーが desync し、main 巻き戻しコミットを生む"
mvp_alignment: null
scope_in: ["Beads issue HarnessHub-7xi9 の題名・説明・notes・受入条件を保持した issue node の復元"]
scope_out: ["orphan 復元と同時に元 issue の実装や close を行うこと"]
acceptance: ["Beads issue HarnessHub-7xi9 の未解決内容と判断根拠が保持され、実装時に検証結果を記録できる","C02 writer の検証を通り、external_ref が canonical graph の実在 node を指す"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-worktree-main-ref-desync-20260728.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-28T02:10:16.353Z","origin_kind":"generated","source_digest":"eb47c26353f1604af3efa5a4b7c5b5494b6489f399bb25230f7e02a2396e1d9c","source_path":"issues/sys-orphan-external-ref-backlog-disposition-20260726.md#HarnessHub-7xi9","source_plugin":"dev-graph","source_version":null}
classification_confidence: 1
classification_reason: "2026-07-28 orphan 再棚卸しで HarnessHub-7xi9 の本文と notes を確認し、未解決で実作業を持つため参照剥がし・close ではなく node 復元と判断"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-worktree-main-ref-desync-20260728.md","confidence":1}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-7xi9","linked_at":"2026-07-28T02:10:16.353Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-28T02:10:16.353Z","missing_sections":[],"status":"complete"}
---

# 概要

並列 worktree の refs/heads/main 直接更新で主ワークツリーが desync し、main 巻き戻しコミットを生む

## 背景と問題

Beads の未解決 issue `HarnessHub-7xi9` は `dev-graph:issue-worktree-main-ref-desync-20260728` を参照しているが、
canonical graph に node が無く、課題本文が ready/parity の対象から外れていた。
課題自体は未解決で内容も有効なため、参照を剥がしたり close したりせず node として復元する。

### Beads に記録された内容

並列稼働中の worktree / エージェントセッションが refs/heads/main を「作業ツリーを更新せずに」直接書き換えるため、主ワークツリーで HEAD と index だけが最新へ進み実ファイルが古いまま取り残される。この状態で git commit -a すると直前の PR のマージ内容を丸ごと巻き戻すコミットが main に載る。

2026-07-28 の実測: git reflog show main に理由メッセージが空のエントリが 3 件 (10:06:29 -> 8560e92 / 10:16:32 -> 6e03e8f / 10:52:28 -> 9fe09e5)。pull・merge・checkout いずれの経路でもないため update-ref 系の直接書き換えと確定。作業ツリーは 09:36 の 03093e4 に取り残され、そのまま commit -a すれば 65 files / -5467 行の巻き戻しが main へ到達しうる状態だった。commit 前に検知して復旧済み。stash@{26} に同種の退避が残っており再発である。

受入条件:
(1) worktree から「他ワークツリーが checkout 中の ref」を直接更新する操作が遮断される。遮断できない場合はその制約が根拠つきで記録されている。
(2) desync 状態でのコミットが検査で止まり、巻き戻しコミットが main へ到達しないことが再現手順つきで検証されている。
(3) hook が beads 更新で消えないこと、または消失を検知できることが検証されている (core.hooksPath が .beads/hooks を指すため)。
(4) 並列稼働を止めない復旧手順が runbook 化されている。実証済み順序は git checkout --detach で HEAD を SHA 固定 -> git stash push -u -> 一致確認 -> 選択復元 -> git checkout main。
(5) stash 参照を番号でなくメッセージで行う規約が文書化されている (復旧中に別セッションの stash push で stash@{0} の指す対象が入れ替わる事象を観測)。

詳細: issues/sys-worktree-main-ref-desync-20260728.md

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

1. `bd --readonly show HarnessHub-7xi9 --json` で `external_ref` と元の本文を読む。
2. `python3 plugins/dev-graph/scripts/bd-bridge.py --op orphan-audit --repo-root . --scan-refs` を実行する。
3. 出力で `HarnessHub-7xi9` が非クローズ orphan に含まれることを確認する。

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
- 解決タスク: `issue-worktree-main-ref-desync-20260728`

## 受入条件

- [ ] Beads issue HarnessHub-7xi9 の未解決内容と判断根拠が保持され、実装時に検証結果を記録できる
- [ ] C02 writer の frontmatter/schema 検証を通り、orphan-audit の非クローズ件数が 1 件減る

## 検証証跡

- コマンド/テスト: `upsert-node.py --dry-run`、`upsert-node.py`、`bd-bridge.py --op orphan-audit --scan-refs`
- 証跡 path: `issues/sys-orphan-external-ref-backlog-disposition-20260726.md`
