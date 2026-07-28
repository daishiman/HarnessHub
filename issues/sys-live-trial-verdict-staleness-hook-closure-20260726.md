---
graph_node_id: "issue-live-trial-verdict-staleness-hook-closure-20260726"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","beads","orphan-recovery"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "plugin hooks が全 skill の挙動閉包に入るため hook 1 件の修正で dev-graph 8 skill の live-trial verdict が一斉に stale 化する"
owners: ["daishiman"]
created_at: "2026-07-25T21:00:25Z"
updated_at: "2026-07-27T21:55:19Z"
status: "draft"
depends_on: []
related_nodes: ["issue-bd-external-ref-orphan-nodes-20260725","issue-orphan-external-ref-backlog-disposition-20260726"]
resource_scope: []
purpose: "未解決の Beads issue HarnessHub-r65n を canonical graph から到達可能に戻し、課題内容を失わず ready/parity の信号を回復する"
goal: "plugin hooks が全 skill の挙動閉包に入るため hook 1 件の修正で dev-graph 8 skill の live-trial verdict が一斉に stale 化する"
mvp_alignment: null
scope_in: ["Beads issue HarnessHub-r65n の題名・説明・notes・受入条件を保持した issue node の復元"]
scope_out: ["orphan 復元と同時に元 issue の実装や close を行うこと"]
acceptance: ["Beads issue HarnessHub-r65n の未解決内容と判断根拠が保持され、実装時に検証結果を記録できる","C02 writer の検証を通り、external_ref が canonical graph の実在 node を指す"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-live-trial-verdict-staleness-hook-closure-20260726.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-28T00:24:44.685Z","origin_kind":"generated","source_digest":"3caa841defecc3c802626cbc7b7cd2ed7466110004c5f4d36d240b489b9393a3","source_path":"issues/sys-orphan-external-ref-backlog-disposition-20260726.md#HarnessHub-r65n","source_plugin":"dev-graph","source_version":null}
classification_confidence: 1
classification_reason: "2026-07-28 orphan 再棚卸しで HarnessHub-r65n の本文と notes を確認し、未解決で実作業を持つため参照剥がし・close ではなく node 復元と判断"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-live-trial-verdict-staleness-hook-closure-20260726.md","confidence":1}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-r65n","linked_at":"2026-07-28T00:24:44.685Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-28T00:24:44.685Z","missing_sections":[],"status":"complete"}
---

# 概要

plugin hooks が全 skill の挙動閉包に入るため hook 1 件の修正で dev-graph 8 skill の live-trial verdict が一斉に stale 化する

## 背景と問題

Beads の未解決 issue `HarnessHub-r65n` は `dev-graph:issue-live-trial-verdict-staleness-hook-closure-20260726` を参照しているが、
canonical graph に node が無く、課題本文が ready/parity の対象から外れていた。
課題自体は未解決で内容も有効なため、参照を剥がしたり close したりせず node として復元する。

### Beads に記録された内容

HarnessHub-6in4 の guard-graph-schema.py 修正で dev-graph 8 skill (decompose/node/render/requirements/schedule/status/sync/system-spec) の live-trial verdict が stale 化した。原因は live-trial-verdict.py の behavior_closure_files() が plugins/<plugin>/hooks/ tree 全体を無条件に閉包へ含めること。詳細と選択肢は issues/sys-live-trial-verdict-staleness-hook-closure-20260726.md を参照。

### Beads notes

2026-07-26 content-review (run-dev-graph-init, incremental) が low/inconsistency を 1 件検出。hooks/guard-graph-schema.py:591 の Write/Edit 遮断メッセージが「.dev-graph/ 配下」と述べるが、実際の GRAPH_AUTHORITY_PATH は state/ と config.json だけで templates/ cache/ tmp/ は意図的に保護外。遮断された利用者が templates も writer 必須と誤読して存在しない writer を探す。文言を実判定範囲へ合わせる 1 行修正だが、hooks/ tree は本課題が指す closure に入るため、単独で直すと 2026-07-26 に再取得したばかりの C01 live-trial 証跡まで即 stale になる。closure 設計を直す本課題で hook 修正と 9 skill 再取得を 1 バッチにまとめること。
2026-07-26 本課題が言う「hook 1 件の修正で一斉 stale 化する」コストを実測した。HarnessHub-q5h9 で 9 skill 分を 1 バッチ再取得し完了 (6in4 / q5h9 とも close 済み)。closure 設計の是正判断に使える実データとして記録する。

実コスト: 17 run を走らせ 9 run を採用、8 run を破棄。採用 9 run の wall-clock 合計 5169s (86 分)、破棄 8 run 合計 8205s (137 分)、総計 13374s (3.7 時間、live-trial の実走時間のみで verdict 生成・独立評価・受領書更新は含まない)。採用分の内訳は decompose 941s / node 941s / init 769s / system-spec 605s / status 433s / requirements 426s / sync 388s / schedule 364s / render 302s。

破棄 8 run の内訳と原因 (いずれも被験の逸脱ではなく計測装置である task.md 側の欠陥): status 286s・dcmp 452s・render 403s・node 594s は script 直叩きで代替され invoked_skills=[] の launch=FAIL。init 1174s は exit 2 (STALL)。system-spec は 1589s / 2153s / 1554s の 3 連続失敗で、原因は 3 回とも別 (WebFetch 連打 / elicit のゼロからのやり直し / C02 登録直前で停止) だが根本は同一で、fixture が既に確定済みなのに被験が SKILL.md step 3 を頭から再実行していた。task.md へ「入力前提」節を置いて既確定成果物の再生成と WebFetch/WebSearch を禁止したところ 605s で完走。

closure 設計への含意: 再取得は 1 skill あたり 5〜16 分の実走だが、task.md の設計品質次第で破棄コストが採用コストを上回る (今回は 137 分 vs 86 分)。したがって hook 1 件の変更に対する実効コストは「9 skill x 実走時間」ではなく「9 skill x 実走時間 x 再走係数 (今回 2.6 = 17/9 run)」に近い。closure を skill 単位へ絞る是正の費用対効果はこの倍率で評価すること。

本課題の notes が挙げていた hooks/guard-graph-schema.py:591 の遮断文言不整合 (「.dev-graph/ 配下」と過大表記) は既に修正済みで、init2-wt6 の transcript line93 の実遮断メッセージが「.dev-graph/state/、.dev-graph/config.json、graph-node.schema.json」と実判定範囲どおりに出ることを確認した。「1 バッチにまとめること」の指示は今回の再取得で消化済みであり、本課題に残るのは closure 設計そのものの是正のみ。
2026-07-28 実測 (PR #82): 本 issue の閉包コストを是正案の選択理由として初めて実データで使った。guard-graph-schema.py の 500 行分割で生まれた import 専用 support module (hooks/guard_graph_commands.py) が、契約テスト test_dev_graph_native_manifest_and_sidecar_are_separated の「hooks/ の .py 一覧 = entry_points.hooks」不変条件に衝突して CI FAIL。support module を hooks/ の外へ移す案は skill_dir_tree_sha が own-plugin hooks/ ツリー全体を含むため live-trial receipt 9 件を一斉に stale 化させると判明し不採用。repo-root tests/ は閉包外である性質を使い、契約テスト側の不変条件を hooks.json 登録内容との突合へ変更して receipt を 1 件も失効させずに解決した。つまり本 issue の閉包粒度は、hooks/ 配下のリファクタリング自体を経済的に禁止する副作用を持つ。

## 現在の挙動

`bd-bridge.py --op orphan-audit --scan-refs` では、この参照が
`repoint_or_close` の非クローズ orphan として検出される。どの走査 ref にも同名 node が無く、
issue 文書も存在しないため、canonical graph から課題へ到達できない。

## 期待する挙動

同じ `graph_node_id` の issue node と本文が C02 writer 経由で登録され、Beads の
`external_ref` が実在 node を指す。元の課題内容と notes は失われず、実装は別タスクとして継続できる。

## 再現手順またはユースケース

1. `bd --readonly show HarnessHub-r65n --json` で `external_ref` と元の本文を読む。
2. `python3 plugins/dev-graph/scripts/bd-bridge.py --op orphan-audit --repo-root . --scan-refs` を実行する。
3. 出力で `HarnessHub-r65n` が非クローズ orphan に含まれることを確認する。

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
- 解決タスク: `issue-live-trial-verdict-staleness-hook-closure-20260726`

## 受入条件

- [ ] Beads issue HarnessHub-r65n の未解決内容と判断根拠が保持され、実装時に検証結果を記録できる
- [ ] C02 writer の frontmatter/schema 検証を通り、orphan-audit の非クローズ件数が 1 件減る

## 検証証跡

- コマンド/テスト: `upsert-node.py --dry-run`、`upsert-node.py`、`bd-bridge.py --op orphan-audit --scan-refs`
- 証跡 path: `issues/sys-orphan-external-ref-backlog-disposition-20260726.md`
