---
graph_node_id: "issue-c03-live-trial-closure-stale-after-merge-20260725"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","live-trial","behavior-closure","merge"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "main マージで C03 の behavior closure digest が両親のどちらとも異なり live-trial 受領書が stale になる"
owners: ["daishiman"]
created_at: "2026-07-25T03:20:00Z"
updated_at: "2026-07-25T04:45:00Z"
status: "done"
depends_on: []
related_nodes: []
resource_scope: ["eval-log/dev-graph/run-dev-graph-sync/criteria-test/scenario-verdict.json","eval-log/dev-graph/run-dev-graph-sync/live-trial/","plugins/dev-graph/skills/run-dev-graph-sync/SKILL.md","plugins/dev-graph/tests/test_skill_criteria_evidence.py"]
purpose: "behavior closure に触れる 2 本のブランチをマージすると、どちらの親でも緑だった live-trial 受領書がマージ後に必ず stale になる。この構造的な取りこぼしを塞ぐ"
goal: "マージ後の木で C03 の live-trial 受領書が現行 closure digest と一致し、test_skill_criteria_evidence が緑になる状態"
mvp_alignment: null
scope_in: ["マージ後の木 (devgraph/issue-c28-draft-status-unmappable-20260722) に対する C03 run-dev-graph-sync の live-trial 再取得","再取得した verdict / transcript で scenario-verdict.json の live_trial_verdict_ref と test_refs を差し替え","同じ構造の取りこぼしが C05/C16 等の他 skill でも起きるかの確認"]
scope_out: ["verdict の skill_dir_tree_sha を現在値へ手で書き換えること (stale 検出の恒久無効化にあたるため禁止)","test_skill_criteria_evidence の digest 検査そのものの緩和"]
acceptance: ["`python3 -m pytest plugins/dev-graph/tests/test_skill_criteria_evidence.py -q` が緑","再取得した live-trial verdict の skill_dir_tree_sha が現行 closure と一致する","verdict は fresh session の実走で取得されており、手編集されていない","他 skill で同種の stale が無いことを確認した記録がある"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-c03-live-trial-closure-stale-after-merge-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"72cc7c43cd72eac2027c742fb703dfbb836de5ca5bbd112ee2fde4088fa75953","evaluator":"dev-graph-sync-conflict-verifier-fresh-goal-evaluator-i08-merged-20260725","evidence_ref":"eval-log/dev-graph/run-dev-graph-sync/live-trial/20260725T042500Z-i08-merged-r2/verdict.json"}
source_lineage: {"imported_at":"2026-07-25T03:20:00Z","origin_kind":"generated","source_digest":"43336931b9d84c400dc5782da751ef86682e031b5169643c25778584c065cd86","source_path":"system-spec/dev-workflow.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.95
classification_reason: "HarnessHub-57v のブランチへ main をマージした結果、両親のどちらでも緑だった C03 の live-trial 受領書が stale 判定になったことで判明した構造的ギャップ"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-c03-live-trial-closure-stale-after-merge-20260725.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-hwlm","linked_at":"2026-07-25T03:23:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-25T04:45:00Z","evidence_refs":["eval-log/dev-graph/run-dev-graph-sync/live-trial/20260725T042500Z-i08-merged-r2/verdict.json","eval-log/dev-graph/run-dev-graph-sync/criteria-test/scenario-verdict.json"],"policy":"manual","reconciled_at":null,"source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-07-25T03:20:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`behavior closure` (SKILL の挙動を決めるファイル集合) に触れるブランチを 2 本マージすると、**どちらの親でも緑だった live-trial 受領書がマージ後に必ず stale になる**。digest は木の状態から決まるのに、証跡は片方の親の木でしか取得されていないためである。

## 実測 (2026-07-25)

`devgraph/issue-c28-draft-status-unmappable-20260722` へ main (8c179ab) をマージした直後:

```
FAILED plugins/dev-graph/tests/test_skill_criteria_evidence.py::
  test_independent_scenario_receipt_covers_exact_criteria[C03-run-dev-graph-sync-...]
AssertionError: C03/OUT1: stale behavior closure digest
  期待 (現行木): 718a9c065c6f9e81502ee4fc693d3e29ac06cac44a5e486b02e0b375dd7cf7ef
  実際 (受領書): c741b079190fba1ba189c442ab06b827e38e6b72cac09889998fcc3511ef96bf
```

| 木 | closure digest | 判定 |
|---|---|---|
| main 単体 (8c179ab) | `3a33eb8f…` | GREEN (受領書の記録値と一致) |
| 本ブランチ単体 (マージ前) | `c741b079…` | GREEN (438 passed) |
| マージ後 | `718a9c06…` | **RED** (1 failed / 440 passed) |

## 原因

C03 `run-dev-graph-sync` の behavior closure は 25 ファイル。ここへ両側が別々に触れた。

| 側 | closure 内で変更したファイル |
|---|---|
| main | `plugins/dev-graph/references/github-lifecycle-contract.md`、`plugins/dev-graph/scripts/reconcile-github-lifecycle.py` |
| 本ブランチ | `plugins/dev-graph/skills/run-dev-graph-sync/SKILL.md`、`scripts/sync-graph.py`、`scripts/bd-bridge.py`、`scripts/build-parity-manifest.py` (新規)、`references/execution-tracker-contract.md` |

両者の和集合はどちらの親にも存在しない木なので、そこでの digest は誰も実走していない。ゲートは設計どおり fail-closed で止めている。

## なぜ digest の書き換えで済ませてはいけないか

`skill_dir_tree_sha` を現在値へ合わせるのは、**stale 検出を恒久的に無効化する**こと。以後どれだけ closure が変わっても受領書は緑のままになり、「証跡が実際の挙動を保証している」という前提そのものが失われる。`execution-tracker-contract.md` §10 が parity manifest の digest について禁じているのと同じ理由である。

## 対処

1. マージ後の木に対して C03 `run-dev-graph-sync` の live-trial を fresh session で再取得する。
2. 取得した verdict / transcript で `scenario-verdict.json` の `live_trial_verdict_ref` と `test_refs` を差し替える。
3. 同種の stale が他 skill (C05 / C16 等) でも起きていないか確認する。

## 構造的な論点 (要検討)

この失敗はマージのたびに起きうる。「closure に触れた PR は merge 直前に live-trial を再取得する」という運用で吸収するのか、closure digest の粒度を見直すのか、どちらを取るかは本 issue で判断して記録する。

## 解消 (2026-07-25)

マージ後の木 (HEAD `db569a8`) で C03 `run-dev-graph-sync` の live-trial を fresh session で再取得し、解消した。

- run: `eval-log/dev-graph/run-dev-graph-sync/live-trial/20260725T042500Z-i08-merged-r2/`
- `overall=PASS` (launch / completion / goal_fit すべて PASS)、nudge 0 / gate 応答 0 の自走完走、Skill ツール起動、wall_clock 360s
- verdict の `skill_dir_tree_sha` = `718a9c065c6f9e81502ee4fc693d3e29ac06cac44a5e486b02e0b375dd7cf7ef` で**現行 closure と一致**
- 独立 fresh evaluator (`dev-graph-sync-conflict-verifier`) が fixture を複製して 3 パスを自力再現し、graph / snapshot / remote の digest を `shasum` で再計算して一致を確認 (被験 fixture は read-only)
- `scenario-verdict.json` の OUT1 `live_trial_verdict_ref` / `test_refs` / `observed` を新 run へ差し替え

検証: `pytest plugins/dev-graph/tests` **441 passed (0 failed)**、`lint-live-trial-verdict.py --all` は 9 verdict verified で緑。CI の `verify` / `change-category-guard` 両ジョブの失敗要因が解消。

`skill_dir_tree_sha` の手書き換えは行っていない (scope_out どおり)。

**対処 3 (他 skill の同種 stale) の確認結果**: `lint-live-trial-verdict.py --all` が全 9 verdict を検査して stale 0 件。不在 6 skill は D13 パイロット中の record-only WARN で、本件とは別軸。

## 構造的な論点の扱い

「closure に触れた PR は merge 直前に live-trial を再取得する」運用で吸収するか、closure digest の粒度を見直すかは**本 run では判断していない**。今回は再取得 (前者) で通したが、恒久方針としては未決。再発時に本 issue を参照して決める。

## 副次的な所見: 並行 live-trial の相互 kill

初回試行 (`20260725T033500Z-i08-merged`) は tmux セッションが起動 10 秒後に消失して失敗した。`live-trial-backend.py reap` は `lt-*` を一括 kill するため、**別 worktree で並行実行中の live-trial が互いのセッションを殺す**。今回は `reap` を実行せず `kill-session` のみで終了した。運用上の注意として記録する。
