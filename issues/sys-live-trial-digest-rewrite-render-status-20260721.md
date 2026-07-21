---
graph_node_id: "issue-live-trial-digest-rewrite-render-status-20260721"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["live-trial","evidence-integrity","dev-graph"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "render / status の live-trial 証跡が再 trial なしの digest 書き換えで緑化されている"
owners: ["daishiman"]
created_at: "2026-07-21T12:00:00Z"
updated_at: "2026-07-21T12:00:00Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["eval-log/dev-graph/run-dev-graph-render/live-trial","eval-log/dev-graph/run-dev-graph-status/live-trial"]
purpose: "HarnessHub-j24 の対象 7 skill 外で同じ digest 単独書き換えを受けた render / status を追跡し、証跡を実走で取り直す"
goal: "render / status の live-trial verdict が実走由来の transcript を伴う新しい run-id で再取得され、lint-live-trial-verdict --check-provenance が両 skill について違反 0 になっている"
scope_in: ["run-dev-graph-render の live-trial 再実行","run-dev-graph-status の live-trial 再実行","再取得後の provenance 検査による確認"]
scope_out: ["j24 対象 7 skill の再検証 (HarnessHub-j24 / HarnessHub-82j が担当)","digest 単独書き換えの再発防止機構 (本 issue と同時に実装済み)"]
acceptance: ["render / status に実走由来の新しい run-id の verdict.json + transcript.jsonl が存在する","lint-live-trial-verdict.py --all が両 skill について違反を報告しない","lint-live-trial-verdict.py --check-provenance <base> が両 skill について digest-only-rewrite を報告しない"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-live-trial-digest-rewrite-render-status-20260721.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-21T12:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "HarnessHub-j24 の調査中に、対象 7 skill 外の render / status も同じ digest 単独書き換えを受けていると判明したため分離した issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-live-trial-digest-rewrite-render-status-20260721.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-s7b","linked_at":"2026-07-21T12:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-21T12:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`run-dev-graph-render` と `run-dev-graph-status` の live-trial verdict は、スキルを実走させずに `skill_dir_tree_sha` だけを現在値へ書き換えることで緑化されている。HarnessHub-j24 が追跡する 7 skill と同じ汚染だが、j24 のスコープ外のため誰も追跡していない。

## 背景と問題

commit `184acbc` は 8 件の verdict.json をそれぞれ 1 行だけ変更した。変更されたのは `skill_dir_tree_sha` のみで、`transcript_sha256` と `transcript.jsonl` は一切変わっていない。すなわち再 trial は行われていない。

このうち 6 件 (init / node / sync / requirements / decompose / schedule) は j24 が、system-spec は commit `a292ec4` の r12 が正規手順で対処済み。**render と status の 2 件だけが取り残されている。**

## 現在の挙動

```
$ git show 184acbc --numstat -- eval-log/dev-graph/run-dev-graph-render/live-trial/20260713T090000-r3/verdict.json
1  1  eval-log/dev-graph/run-dev-graph-render/live-trial/20260713T090000-r3/verdict.json

$ git show 184acbc -- .../run-dev-graph-render/live-trial/20260713T090000-r3/verdict.json
-  "skill_dir_tree_sha": "3d338deae2f7cdd7c789e20cb4c3f2ea45e8eccd75e14cc21a19b14fe68a2dd9",
+  "skill_dir_tree_sha": "16b5a31e1b312fcbf9b8780386929b7b85382e21fc8c49b21ed72bbde8521597",

$ git show 184acbc --name-only -- eval-log | grep -c transcript.jsonl
0
```

status も同一パターン (`40470669452e` → `21348b991b0f`、transcript 不変)。

書き換え後は digest が現在値と一致するため、`lint-live-trial-verdict --all` の stale-sha 検査も pytest の closure 突合も緑になり、さらに `plan-live-trials.py` が `action=reuse (current-pass)` と判定して再 trial を計画しない。**証拠の失効が「検証済み」に化けている。**

## 期待する挙動

両 skill の live-trial verdict が、実走で得た transcript を伴う新しい run-id で再取得されている。

## 再現手順またはユースケース

1. `python3 scripts/lint-live-trial-verdict.py --check-provenance 184acbc^` を実行する
2. render / status を含む 9 件が `digest-only-rewrite` として報告される

## 影響と優先度

- 影響範囲: dev-graph の受け入れ証拠の信頼性
- 深刻度: medium
- 緊急度: 中 — j24 / 82j と同じ性質の汚染であり、放置すると両 skill は変更されても永久に再検証されない。ただし render / status は読み取り系で、init / node ほど破壊的な副作用は持たない。

## スコープ

- In: render / status の live-trial 再実行、再取得後の provenance 検査による確認
- Out: j24 / 82j の対象 skill、再発防止機構 (本 issue と同時に `--check-provenance` として実装済み)

## 備考

再発防止側は対応済み。`scripts/lint-live-trial-verdict.py --check-provenance <base>` が digest 単独書き換えを検出し、`check_verdict` が `transcript_sha256` と transcript 実体を突合するため、今後は同じ経路で緑化できない。本 issue は **既に main へ入ってしまった 2 件の是正**のみを対象とする。
