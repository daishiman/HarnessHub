---
graph_node_id: "issue-hub-foundation-progress-reconcile-20260721"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "governance"
tags: ["beads","dev-graph","hub-foundation","progress-reconcile"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "feat-hub-foundation (HarnessHub-37h) の bd 進捗 0/13 が実装実体と乖離している疑い"
owners: ["daishiman"]
created_at: "2026-07-21T00:00:00Z"
updated_at: "2026-07-21T13:15:06Z"
status: "done"
depends_on: []
related_nodes: ["issue-bd-bridge-notes-passthrough-20260721"]
resource_scope: ["issues/sys-hub-foundation-progress-reconcile-20260721.md","docs/features/feat-hub-foundation/"]
purpose: "epic HarnessHub-37h の beads 進捗 0/13 が実装実体を反映していない状態を突合し、bd 側の status と進捗記録を実体へ収束させる"
goal: "13 task それぞれの beads status が着手実体と一致し、各 task の notes から phase 別の完了判定と残項目が読める状態"
scope_in: ["13 phase の受入条件と成果物実体の突合","bd status の実体への収束 (bd-bridge 経由)","phase 別の突合結果を各 task の notes へ記録","close を見送った理由の記録と派生課題の特定"]
scope_out: ["未完了 9 phase の残項目そのものの解消 (各 phase 側の課題)","reconcile-github-lifecycle.py の実行環境是正 (派生課題へ分離)","graph.json の status/completion_evidence 書き換え (C02 writer と reconcile の責務)"]
acceptance: ["13 task すべての beads status が着手実体と一致している","13 task すべての notes に phase 別の完了判定と残項目が記録されている","close を見送った判断とその根拠が課題側から追跡できる"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-hub-foundation-progress-reconcile-20260721.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-21T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"issues/sys-bd-bridge-notes-passthrough-20260721.md","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "epic HarnessHub-37h の進捗表示と実装実体の乖離を追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-hub-foundation-progress-reconcile-20260721.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-8bc","linked_at":"2026-07-21T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-21T13:15:06Z","evidence_refs":["beads:HarnessHub-8bc","issues/sys-hub-foundation-progress-reconcile-20260721.md"],"policy":"linked_pr_merged_all","reconciled_at":"2026-07-21T13:15:06Z","source":"manual (graph 未登録 node のため reconcile-github-lifecycle.py 対象外)","status":"closed"}
implementation_readiness: {"checked_at":"2026-07-21T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

epic `HarnessHub-37h` (feat-hub-foundation) の beads 進捗が 0/13 complete のまま停止している一方で、13 phase 分の実装と証跡は既に main へ取り込まれている。進捗表示と実体の乖離を突合し、bd 側を実体へ収束させる。

## 背景と問題

`HarnessHub-37h` は 7 つの epic を blocks する上流にあり、進捗の誤りは下流の ready 判定へ波及する。しかし beads 上は 13 task 中 12 件が `open`、1 件 (P01) のみ `in_progress` で、**13 件すべての `notes` が空**だった。進捗記録は epic 側の notes にのみ存在し、どの phase がどこまで進んだかを task 単位で追跡できない状態だった。

## 現在の挙動 (突合前)

| 層 | 状態 |
|---|---|
| beads task | 37h.1 のみ `in_progress`、37h.2〜.13 は `open`。13 件すべて notes 空 |
| dev-graph node | `SYS-HUB-FOUNDATION-P01`〜`P13` の 13 件とも `status: active` / `completion_evidence.status: in_progress` / `pull_request_linkages: []` |
| 実装実体 | 13 phase 分の成果物がすべて実在。関連コミット 24 件が PR #21 (merge `4e60f27`, branch `feat/wt-2`) で main に取込済み |

## 期待する挙動

13 task の beads status が着手実体と一致し、各 task の notes から「その phase がどこまで到達し、何が残っているか」を課題側だけで判断できる。

## 突合結果

13 phase すべてが着手済みで成果物が実在する。受入条件を完全充足するのは 4 件、残る 9 件は未完了項目を抱える。

| phase | bd id | 判定 | 主な残項目 |
|---|---|---|---|
| P01 要件ベースライン | 37h.1 | DONE | task-spec 側が acceptance 3 件 / QC 8 件の 1 世代前提のまま (実体は 4 件 / 9 件) |
| P02 アーキテクチャ設計 | 37h.2 | DONE | spec は 5 member 想定、実体は `packages/estimation` を含む 6 member |
| P03 独立設計レビュー | 37h.3 | PARTIAL | ADR 改訂 2 (`0880eec`) 後の再レビュー記録が無く verdict が「差し戻し」のまま |
| P04 テスト設計 | 37h.4 | DONE | なし (実行は P06 の責務) |
| P05 実装 | 37h.5 | PARTIAL | README.md の初期セットアップ手順が不在 / 外部死活監視・SLO ダッシュボードの設定ファイルが不在 |
| P06 テスト実行 | 37h.6 | PARTIAL | CI の deploy job が main 限定条件で skip / 外形監視疎通 / CWV 実測 (G11) |
| P07 受入判定 | 37h.7 | PARTIAL | 4 件中 A2 のみ合格、A1・A3 blocked、A4 は `app_wiring: pending` |
| P08 リファクタ・移行 | 37h.8 | PARTIAL | N/A 根拠が 4 観点で、spec 要求の 9 workstream 単位になっていない |
| P09 品質・セキュリティ保証 | 37h.9 | PARTIAL | G9 axe の違反注入未実施 / G11 CWV 未実行 / restore drill 未実施 |
| P10 最終独立レビュー | 37h.10 | PARTIAL | 「条件付き承認」。`slo-error-budget`・`cwv-good` 未充足、blocker 4 件 |
| P11 証跡収集 | 37h.11 | DONE | index §4 の未取得証跡は生成元 phase 側の未完了であり P11 の欠落ではない |
| P12 運用ドキュメント | 37h.12 | PARTIAL | README.md の本番運用セクションが不在 |
| P13 リリース・デプロイ | 37h.13 | PARTIAL | cron トリガー登録失敗 / `CRON_HEARTBEAT_URL` 未投入 / 外形監視未設定 / GitHub Secrets 未確認 / 独自ドメイン未設定 |

各 phase の根拠証跡パスと残項目の詳細は、対応する beads task の notes に記録した。

## 実施した収束

すべて `plugins/dev-graph/scripts/bd-bridge.py` の単一チョークポイント経由。

1. `--op update --status in_progress` で 37h.2〜.13 の 12 件を `open` から `in_progress` へ遷移 (37h.1 は既に `in_progress` のため status 変更なし)。
2. `--op update --notes` で 13 件すべてに phase 別の判定・根拠証跡パス・残項目・close 見送り理由を記録。
3. `--op update --append-notes` で epic 37h に突合サマリを追記。

## close を見送った理由

進捗表示 0/13 は closed 数のカウントであり、close しない限り 0/13 のまま変わらない。それでも close しない判断をした。

- `completion_evidence.policy: linked_pr_merged_all` の充足判定を行うのは `plugins/dev-graph/scripts/reconcile-github-lifecycle.py` だけで、beads の close もそこから `bd-bridge --op close` として発火する設計になっている。
- 本 worktree で `reconcile-github-lifecycle.py --mode check` を実行すると `C24 repository context omits required identity` で停止し、判定自体が成立しない。加えて 13 node の `pull_request_linkages` は空で、PR #21 は node へ紐付いていない。
- ここで手動 `bd close` を打つと、beads は `closed`・graph は `completion_evidence.status: in_progress` という**本課題が是正しようとしているのと同型の乖離を新たに作る**。
- 実体としても、受入条件を完全充足するのは 13 件中 4 件のみで、9 件は未完了項目を抱えている。

## 派生課題

いずれも本課題の突合中に観測し、beads へ分離起票した。

1. **`HarnessHub-mhh`** (`issues/sys-devgraph-completion-reconcile-blocked-20260721.md`) — reconcile 実行経路の不成立。`C24 repository context omits required identity` により task worktree から completion reconcile を実行できず、PR #21 の本文にも `dev-graph: <NODE_ID>` マーカーが無いため 13 node の `pull_request_linkages` が空のまま。PR merge を完了判定へ反映する経路が塞がっている。
2. **`HarnessHub-p4f`** (`issues/sys-hub-foundation-task-spec-drift-20260721.md`) — task-spec と成果物の世代ずれ。13 phase の spec が `feature_context_digest: sha256:06c97e2e...` / acceptance 3 件 / QC 8 件を前提にしているのに対し、成果物は `sha256:938ecf38...` / 4 件 / 9 件へ更新済み。

2026-07-21 の後続実装で `HarnessHub-p4f` は是正完了した。13 task-spec は現行 digest / acceptance 4 件 / quality_constraints 9 件へ揃い、P02 の 6 member と P08 の 4 判定軸も成果物へ一致した。`HarnessHub-mhh` は C24 detached HEAD 誤判定、projection verification 解決、Beads gate 互換性を修正し、P02 の `gh:pr` gate まで登録済み。残る durable reconcile は、既存変更を保持したまま clean・同期済み main worktree を用意できないため継続課題とする。

未完了 9 phase の残項目そのものは、各 phase の beads task の notes に記録済みで、本課題の scope_out とする。

## 再発防止

**方針: reconcile 経路の是正 (`HarnessHub-mhh`) を主対策とし、あわせて phase 完了時の notes 記録を運用規約とする。status 差分による自動検出は採らない。**

自動検出を候補から外したのは、実測とコードで次を確認したためである。

- `sync-graph.py --dry-run` では検出できない。status の比較は local / remote の両側を `_status_to_remote()` に通してから行う実装 (`plugins/dev-graph/scripts/sync-graph.py:341-345`) で、この関数は `done` / `closed` / `tombstoned` / `blocked` 以外をすべて `open` へ丸める (`:224-227`)。graph の `active`、beads の `open`、beads の `in_progress` はいずれも同じ値になり、**本課題の乖離は収束前も収束後も差分ゼロと判定される**。加えて 219 node を 1 件ずつ `bd-bridge --op show` で照会する設計のため、本 repo では 180 秒でも完走しない (実測 exit 124)。
- `bd doctor --check=conventions` は embedded mode 未サポートで、案内文を返すのみで検査が走らない。
- `reconcile-github-lifecycle.py --mode drain-pending` も `C24 repository context omits required identity` で停止する。完了経路が壊れている間は、未消化イベントの列挙という検出手段も同時に死ぬ。

したがって、完了収束は `HarnessHub-mhh` の是正で機械へ戻し、進行中の記録は人の手で残す二段構えとする。notes は status と違って丸め写像を持たず、「実装は進んだが記録が無い」状態を直接観測できる唯一の軸である。

## スコープ

- In: 13 phase の突合、bd status の収束、突合結果の notes 記録、close 見送り判断の記録
- Out: 未完了 9 phase の残項目そのものの解消、reconcile 実行環境の是正、graph.json の直接書き換え

## 関連グラフ

- 対象 epic: `feat-hub-foundation` (`HarnessHub-37h`)
- 対象 task: `SYS-HUB-FOUNDATION-P01`〜`P13` (`HarnessHub-37h.1`〜`.13`)
- 関連 issue: `issue-bd-bridge-notes-passthrough-20260721` (`HarnessHub-8ql`) — 本課題の notes 記録は、この issue で追加された `--notes` パススルーに依存している

## 受入条件

- [x] 13 task すべての beads status が着手実体と一致している (14 件が `in_progress`: epic + 13 task)
- [x] 13 task すべての notes に phase 別の完了判定と残項目が記録されている
- [x] close を見送った判断とその根拠が課題側から追跡できる (epic notes と本文書)
- [x] 再発防止方針が確定している (自動検出は不成立と実測し、reconcile 是正 + notes 記録の二段構えを採用)

## 検証証跡

- コマンド: `bd list --status=in_progress --json` → `HarnessHub-37h` 系 14 件がすべて `in_progress`、notes は 550〜981 文字
- コマンド: `python3 plugins/dev-graph/scripts/reconcile-github-lifecycle.py --repo-root . --graph .dev-graph/state/graph.json --graph-node-id SYS-HUB-FOUNDATION-P02 --pr 21 --mode check` → `C24 repository context omits required identity` (close 経路が不成立であることの一次証跡)
- コマンド: 同 `--mode drain-pending` → 同じ identity エラーで停止 (未消化イベントの列挙も不可)
- コマンド: `timeout 180 python3 plugins/dev-graph/scripts/sync-graph.py --repo-root . --dry-run --no-eval-log` → exit 124 (219 node の逐次照会が完走しない)
- コマンド: `bd doctor --check=conventions` → `'bd doctor' is not yet supported in embedded mode.`
- コマンド: `python3 -m pytest plugins/dev-graph/tests -q` → 243 passed
- コマンド: `python3 scripts/lint-artifact-placement.py` → orphan / docs-frontmatter / system-spec / root すべて緑
- コマンド: `python3 plugins/dev-graph/scripts/validate-graph-schema.py --graph .dev-graph/state/graph.json --repo-root .` → `valid: true`, violations 0
- 証跡 path: 各 phase の判定根拠は `docs/features/feat-hub-foundation/` 配下 (`requirements-baseline.md`, `architecture-decision-record.md`, `design-review-notes.md`, `test-design.md`, `acceptance-report.md`, `refactoring-migration-note.md`, `quality-assurance-report.md`, `final-review-round2-notes.md`, `runbook.md`, `release-notes.md`, `evidence/`)
