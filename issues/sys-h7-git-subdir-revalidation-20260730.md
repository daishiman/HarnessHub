---
graph_node_id: "issue-h7-git-subdir-revalidation-20260730"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "platform"
tags: ["stage0","h7","claude-code","git-subdir","revalidation"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "H7 を現行 git-subdir source で macOS / Windows 再検証する"
owners: ["daishiman"]
created_at: "2026-07-30T02:09:26Z"
updated_at: "2026-07-30T02:13:24.924968Z"
status: "draft"
depends_on: []
related_nodes: ["feat-stage0-distribution-gate","SYS-STAGE0-DISTRIBUTION-GATE-P06","SYS-STAGE0-DISTRIBUTION-GATE-P07"]
resource_scope: ["docs/features/feat-stage0-distribution-gate/","features/feat-stage0-distribution-gate.md","tasks/feat-stage0-distribution-gate/","system-spec/fetched-references.json","specs/harness-hub-system-specification.md","architecture/harness-hub-infrastructure.md"]
purpose: "H7 終結時には存在しなかった正式 git-subdir source を、過去の観測と混同せず現行 CLI で再評価する"
goal: "現行 git-subdir source で H7 の配布経路を macOS / Windows の実利用まで再検証し、Stage 1 entry condition を証拠に基づき再判定できる状態"
scope_in: ["現行 Claude Code の git-subdir source 契約と CLI 版の一次照合","url/path と ref または sha pin を使う最小 plugin の再現可能な検体","macOS / Windows の install・plugin details・skill 実行 E2E","SSH 鍵・global git rewrite・実環境汚染への非依存確認","A1/A2/A3 と Stage 1 entry condition の fail-closed 再判定"]
scope_out: ["過去の H7 実行証跡の書き換え","E2E 未完了のまま D7 を confirmed 登録すること","Publisher 本体の実装","有償 Windows 実行環境の常設"]
acceptance: ["Anthropic 公式 marketplace 文書と実行対象 Claude Code CLI の版を実行直前に再照合し、git-subdir の url/path/ref/sha 契約を証跡化する","macOS と Windows の両方で git-subdir source を install し、plugin details の Skills が 1 件以上で、対象 skill の実行が期待出力を返す","SSH 鍵や global git url rewrite に依存しない経路で成功し、隔離設定と cleanup の証跡を残す","A1/A2/A3 と Stage 1 entry condition は実行済み証跡だけで再判定し、未充足なら REJECTED / NOT_MET を維持する","docs/features・features・tasks・specs・architecture・system-spec の影響判断と仕様反映受領書を記録する"]
architecture_refs: ["arch-harness-hub-infrastructure"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-h7-git-subdir-revalidation-20260730.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-30T02:09:26Z","origin_kind":"manual","source_digest":"5c420336d7904d8f56e53cc537c80ef881ac9b88dc8aa641ba130788f0d58360","source_path":"system-spec/fetched-references.json","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.97
classification_reason: "2026-07-30 の公式再照合で、H7 終結時の再開条件だった git-subdir source が現行 Claude Code の正式契約になったため"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-h7-git-subdir-revalidation-20260730.md","confidence":0.97}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-n2c0","linked_at":"2026-07-30T02:13:08.338393Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-30T02:09:26Z","missing_sections":[],"status":"complete"}
---

# 概要

2026-07-30 の公式一次資料再照合で、Claude Code の plugin source に
`git-subdir` が正式追加されていることを確認した。H7 終結時の再開条件
「CLI 側で subdirectory source が実装される」が成立したため、現行 CLI で
配布経路を再評価する。

## 背景と問題

2026-07-21 の H7 は、当時の CLI で外部 `github` source の `path` / `subdir`
が無視されることを実測し、専用 repository root または npm が必要と結論した。
その後の公式文書では `git-subdir` が `url` / `path` と任意の `ref` / `sha`
を持ち、sparse partial clone で monorepo の一部を取得する正式 source になった。

一方、H7 の最終 `REJECTED` は Windows 上の skill 実行
`T-A3-03` が未完了であることにも基づく。source type の追加だけで過去の
判定を `PASS` へ読み替えてはならない。

## 現在の挙動

- `system-spec/fetched-references.json` は現行 `git-subdir` 契約を記録済み。
- 過去の H7 実測は当時の CLI に対する履歴として有効。
- `stage0-gate-conclusion.md` の verdict は `H7_NOT_ESTABLISHED`、
  Stage 1 entry condition は `NOT_MET` のまま。
- 現行 `git-subdir` での macOS / Windows E2E は未実施。

## 期待する挙動

現行 CLI と公式契約に固定した検体を使い、macOS / Windows の両方で
install、`plugin details` の component inventory、skill 実行までを確認する。
実行済み証跡だけで A1/A2/A3 を再判定し、全条件が揃わなければ従来の
`REJECTED` / `NOT_MET` を維持する。

## 再現手順またはユースケース

1. 実行直前に公式 plugin marketplace 文書と CLI version を記録する。
2. `git-subdir` の `url` / `path` と `sha` pin を持つ最小 plugin を用意する。
3. macOS と Windows で隔離設定を使い install する。
4. `claude plugin details` で `Skills >= 1` を確認する。
5. 対象 skill を実行し、期待トークンを確認する。
6. SSH 鍵、global git URL rewrite、実環境設定の混入がないことを確認する。
7. A1/A2/A3 と Stage 1 entry condition を fail-closed で再判定する。

## 影響と優先度

- 影響範囲: Stage 0 配布経路と Stage 1 の開始条件
- 深刻度: medium
- 緊急度: Publisher 実装着手前に判断が必要。現時点の製品実装を止める新障害ではない

## スコープ

- In: 現行 `git-subdir` source、macOS / Windows E2E、仕様・設計反映、再判定
- Out: 過去証跡の改変、未検証での D7 登録、Publisher 実装、有償環境の常設

## 関連グラフ

- 原因/親ノード: `issue-source-freshness-ops-20260722`
- 関連仕様: `feat-stage0-distribution-gate`
- 関連アーキテクチャ: `arch-harness-hub-infrastructure`
- 解決タスク: 本 issue を feature / exact-13 task へ昇格する場合に dev-graph で分解する

## 受入条件

- [ ] 公式契約と CLI 版が実行直前の証跡に固定されている
- [ ] macOS / Windows の install → details → skill 実行が全て成功する
- [ ] SSH 鍵・global rewrite・実環境汚染へ依存しない
- [ ] A1/A2/A3 と Stage 1 entry condition が実行済み証跡だけで再判定される
- [ ] 各仕様層と仕様反映受領書、Beads の状態が同期される

## 検証証跡

- コマンド/テスト: `claude --version`、公式文書取得、OS 別 install/details/skill 実行
- 証跡 path: `docs/features/feat-stage0-distribution-gate/` 配下の再評価成果物
