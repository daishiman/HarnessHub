---
graph_node_id: "issue-beads-jsonl-stash-conflict-20260725"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["beads","conflict-resolution","runbook","ops"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: ".beads/interactions.jsonl の stash pop コンフリクト解消と JSONL 運用 runbook 整備"
owners: ["daishiman"]
created_at: "2026-07-25T02:35:37Z"
updated_at: "2026-08-10T02:43:42Z"
status: "closed"
depends_on: []
related_nodes: ["feat-dev-pipeline-improvement"]
resource_scope: ["issues/sys-beads-jsonl-stash-conflict-20260725.md","docs/beads-operations-runbook.md",".beads/README.md",".beads/interactions.jsonl"]
purpose: "git stash pop の中断で .beads/interactions.jsonl に残置したコンフリクトを、append-only ログの性質に沿って欠落なく解消し、同種事故の再発時に調査コストを払わずに済む手順を確立する"
goal: "コンフリクトが和集合で解消され JSONL 構文と id 一意性が機械検証されており、かつ append-only JSONL の解消手順と bd-bridge 経由の beads 書込規約が docs から辿れる状態になっている"
scope_in: [".beads/interactions.jsonl のコンフリクト解消と検証","append-only JSONL コンフリクト解消手順の runbook 化","beads 書込が bd-bridge.py 単一経路である旨の明文化",".beads/README.md のリポジトリ実態への追随"]
scope_out: ["滞留 stash 12 件の棚卸し","Dolt リモート同期 (bd dolt push) の実行",".gitattributes merge driver による自動解消の実装"]
acceptance: ["interactions.jsonl からコンフリクトマーカーが除去され全レコードが JSON として解析できる","stash 側と HEAD 側の行が欠落なく保持され id 重複が 0 件である","append-only JSONL の解消手順が runbook として文書化されている","beads 変更が bd-bridge.py 経由に限定される旨が .beads/README.md から辿れる","lint-doc-line-limit.py の 300 行規約に適合している"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-beads-jsonl-stash-conflict-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"1935c7898ff6b6b3969a3c2aed5e82bc75150c4d6c9acfa85c13e31a4fce493f","evaluator":"2026-08-08 measured: interactions.jsonl 315 records parse OK, duplicate id 0, conflict marker 0, runbook and bd-bridge guidance present, doc-line gate PASS","evidence_ref":"docs/beads-operations-runbook.md"}
source_lineage: {"imported_at":"2026-07-25T02:35:37Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "2026-07-25 の stash pop 中断で発生した .beads/interactions.jsonl コンフリクトの解消と、再発防止のための運用 runbook 整備を追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-beads-jsonl-stash-conflict-20260725.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-su8y","linked_at":"2026-08-04T03:57:52.184479Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-08T08:41:07Z","evidence_refs":["docs/beads-operations-runbook.md",".beads/README.md","docs/features/feat-dev-pipeline-improvement/su8y-beads-jsonl-reconciliation-spec-reflection-receipt.md"],"policy":"manual","reconciled_at":"2026-08-10T02:43:42Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-07-25T02:35:37Z","missing_sections":[],"status":"complete"}
---

# 概要

`git stash pop` が中断し、`.beads/interactions.jsonl` にコンフリクトマーカーが残置した。stash 側が HEAD 側の上位集合（superset＝片方がもう片方を完全に含む関係）であることを検証したうえで和集合として解消し、再発防止のため append-only JSONL の解消手順とリポジトリ固有の beads 書込規約を runbook 化した。

## 背景と問題

`.beads/interactions.jsonl` は Beads の passive export（受動的エクスポート＝正本ではなく Dolt DB から書き出された写し）である。append-only（追記専用＝既存行を書き換えず末尾に足すだけ）のログのため、行単位の 3-way マージ（3 方向マージ＝共通の祖先・自分側・相手側を突き合わせる統合方式）では衝突しやすい。

今回は `git stash pop` がコンフリクトで中断し、`MERGE_HEAD` が無いまま index に未解決エントリだけが残る状態になった。この状態は `git status` 上「マージ中」に見えないため、原因の特定を誤りやすい。

加えて、解消作業のなかで `.beads/README.md` の記述がリポジトリ実態と食い違っていることが判明した。README は `bd create` / `bd update` を直接実行する例を載せているが、本リポジトリでは `plugins/dev-graph/hooks/guard-graph-schema.py`（PreToolUse hook）が beads mutation（変更操作）を `plugins/dev-graph/scripts/bd-bridge.py` の単一チョークポイント（choke-point＝唯一の通り道）経由に限定しており、README 通りに実行すると BLOCK される。

## 現在の挙動

- `.beads/interactions.jsonl` に `<<<<<<< Updated upstream` / `>>>>>>> Stashed changes` が残置し、JSONL として解析不能だった。
- `MERGE_HEAD` が存在せず、`git status` は「マージ中」を示さないため、マージ由来と誤認しやすい。
- `.beads/README.md` の `bd create` 直叩き例に従うと guard hook に遮断され、作業が止まる。
- append-only JSONL のコンフリクト解消手順が、リポジトリ内のどのドキュメントにも記載されていない。

## 期待する挙動

- コンフリクトマーカーの文言から発生源（stash pop / merge / rebase）を判別でき、append-only ログは和集合で解消する手順が文書化されている。
- 解消後に JSONL 構文と `id` 重複を機械検証してからコミットする手順が定まっている。
- beads の変更操作は `bd-bridge.py` 経由であることがドキュメントから読み取れ、guard に遮断されない。

## 再現手順またはユースケース

1. `.beads/interactions.jsonl` に差分がある状態で `git stash push` する。
2. `git pull` で同ファイルに追記が入る。
3. `git stash pop` する → コンフリクトで中断し、`MERGE_HEAD` 無しの未解決 index が残る。
4. `bd create` を直接実行する → guard hook が BLOCK する。

## 影響と優先度

- 影響範囲: Beads 課題ログの同期、コンフリクト解消作業、beads 書込経路の理解
- 深刻度: low（正本は Dolt DB 側にあり、jsonl の欠落はデータ損失に直結しない）
- 緊急度: medium（stash が 12 件滞留しており同種事故が反復しうる。手順が無いと解消のたびに調査コストが発生する）

## スコープ

- In: 今回のコンフリクト解消、append-only JSONL の解消手順 runbook 化、beads 書込規約（bd-bridge 必須）の明文化、`.beads/README.md` のリポジトリ実態への追随
- Out: 滞留 stash 12 件の棚卸し、Dolt リモート同期（`bd dolt push`）の実行、jsonl のマージ戦略（`.gitattributes` merge driver）の自動化

## 関連グラフ

- 関連ノード: `feat-dev-pipeline-improvement`
- 解決課題: `issue-beads-jsonl-stash-conflict-20260725`
- 関連実装: `plugins/dev-graph/scripts/bd-bridge.py`, `plugins/dev-graph/hooks/guard-graph-schema.py`
- 追加ドキュメント: `docs/beads-operations-runbook.md`

## 受入条件

- [x] `.beads/interactions.jsonl` からコンフリクトマーカーが除去され、全レコードが JSON として解析できる
- [x] stash 側が HEAD 側の上位集合であることを検証し、両者の行が欠落なく保持されている
- [x] `id` の重複が 0 件である
- [x] append-only JSONL のコンフリクト解消手順が runbook として文書化されている
- [x] beads 変更が `bd-bridge.py` 経由に限定される旨が `.beads/README.md` から辿れる
- [x] `lint-doc-line-limit.py` の 300 行規約に適合している

## 検証証跡

- コンフリクト解消の検証: stage2（240 行）と stage3 先頭 240 行の完全一致を `diff` で確認
- JSONL 構文検証: 全レコードの `json.loads` 成功・`id` 重複 0 件
- ドキュメント規約: `python3 scripts/lint-doc-line-limit.py --repo-root .`
- 追加 runbook: `docs/beads-operations-runbook.md`
