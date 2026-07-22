---
graph_node_id: "issue-scenario-verdict-stale-live-trial-ref-20260721"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["dev-graph","live-trial","provenance","anti-goodhart","criteria-test"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "criteria-test の scenario-verdict が digest 書き換え済みの旧 r3 verdict を受入根拠に参照し続けている"
owners: ["daishiman"]
created_at: "2026-07-21T14:00:00Z"
updated_at: "2026-07-21T14:00:00Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["issues/sys-scenario-verdict-stale-live-trial-ref-20260721.md"]
purpose: "184acbc が skill_dir_tree_sha だけを書き換えた 9 件の r3 verdict のうち 5 件が、criteria-test の scenario-verdict から OUT1 の受入根拠として明示パスで参照され続けている。lint-live-trial-verdict は最新 run しか見ないため緑になり、この参照は検査の外に落ちる。"
goal: "criteria-test の OUT1 受入根拠が、再 trial を経た正当な live-trial verdict を指す状態にする。あわせて『scenario-verdict が指す run が最新かつ digest 書き換えを経ていない』ことを機械検査する。"
scope_in: ["issues/sys-scenario-verdict-stale-live-trial-ref-20260721.md"]
scope_out: []
acceptance: []
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-scenario-verdict-stale-live-trial-ref-20260721.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-21T14:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"eval-log/dev-graph/run-dev-graph-render/criteria-test/scenario-verdict.json","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "criteria-test の scenario-verdict が書き換え済み verdict を受入根拠に参照している検査の穴を追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-scenario-verdict-stale-live-trial-ref-20260721.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-21T14:00:00Z","missing_sections":[],"status":"complete"}
---


# 概要

`eval-log/dev-graph/<skill>/criteria-test/scenario-verdict.json` は OUT1 の受入根拠として live-trial verdict を **明示パスで参照**する。この参照先が、`184acbc` で `skill_dir_tree_sha` だけを書き換えられた旧 r3 verdict のまま 5 skill で残っている。

## 背景と問題

`HarnessHub-s7b` は「`lint-live-trial-verdict.py` は skill ごとに最新 run (`candidates[-1]`) しか見ないため、新しい run-id で再 trial すれば旧 r3 は自動的に検査対象から外れる」という前提で是正した。この前提は lint については正しい。

**しかし `scenario-verdict.json` は run を明示パスで指定する。** したがって新 run を作っても参照は旧 r3 のまま残り、検査対象から外れない。

```json
"OUT1": {
  "verify_by": "live-trial",
  "live_trial_verdict_ref": "eval-log/dev-graph/run-dev-graph-render/live-trial/20260713T090000-r3/verdict.json"
}
```

`plugins/dev-graph/tests/test_skill_criteria_evidence.py` の `test_independent_scenario_receipt_covers_exact_criteria` は `scenario-verdict.json` の `target.skill_md_sha256` が現行 SKILL.md と一致することは検査するが、**`live_trial_verdict_ref` が指す run が最新であることも、その verdict が digest 書き換えを経ていないことも検査しない**。

## 現在の挙動 (実測)

`184acbc` は 9 件の r3 verdict の `skill_dir_tree_sha` を書き換え、`transcript_sha256` は据え置いた (= 再実行していない)。

| skill | scenario-verdict が参照する run | 実在する最新 run | 参照先は書き換え済みか |
|---|---|---|---|
| `run-dev-graph-init` | `20260713T090000-r3` | `20260713T093500-r4` | **はい** |
| `run-dev-graph-node` | `20260713T090000-r3` | `20260713T093500-r4` | **はい** |
| `run-dev-graph-requirements` | `20260713T090000-r3` | `20260713T093500-r4` | **はい** |
| `run-dev-graph-status` | `20260713T090000-r3` | `20260721T181000-r6` (PASS) | **はい** |
| `run-dev-graph-render` | `20260713T090000-r3` | `20260721T225518-r8` | **はい** (s7b で是正) |

render は `HarnessHub-s7b` の再 trial に伴い参照を更新するため、本 issue の対象は**残り 4 skill** である。

## 影響と優先度

- 影響範囲: `run-dev-graph-init` / `run-dev-graph-node` / `run-dev-graph-requirements` / `run-dev-graph-status` の OUT1 受入根拠
- 深刻度: high
- 緊急度: `lint-live-trial-verdict.py` が緑を返すため**発覚しにくい**。s7b の是正でも見落とされ、最終レビューの独立検証で初めて発見された
- 本質: 「最新 run だけを見る検査」と「run を明示パスで指す受入根拠」が併存しており、**前者を緑にしても後者は古い証拠を掴んだまま**になる

## 期待する挙動

1. 4 skill の `scenario-verdict.json` の `live_trial_verdict_ref` が、再 trial を経た正当な verdict を指す
2. `scenario-verdict.json` が指す run が最新であり、かつ digest 書き換えを経ていないことを機械検査する

## 再現手順またはユースケース

```bash
for s in run-dev-graph-init run-dev-graph-node run-dev-graph-requirements run-dev-graph-status; do
  python3 -c "
import json
d = json.load(open('eval-log/dev-graph/$s/criteria-test/scenario-verdict.json'))
print('$s', d['criteria_results']['OUT1']['live_trial_verdict_ref'])
"
done
# → いずれも 20260713T090000-r3 を指す
git show 184acbc -- 'eval-log/dev-graph/run-dev-graph-init/live-trial/20260713T090000-r3/verdict.json' | grep skill_dir_tree_sha
# → skill_dir_tree_sha のみが書き換えられ transcript_sha256 は不変
```

## スコープ

- In: 4 skill の `scenario-verdict.json` の参照更新 (再 trial を伴う場合はその実走を含む)、および参照鮮度の機械検査の追加
- Out: `run-dev-graph-render` (`HarnessHub-s7b` で是正済み)、`lint-live-trial-verdict.py` の run 選択ロジック自体の変更

## 是正の選択肢

| # | 案 | 影響 |
|---|---|---|
| (a) **推奨** | `test_independent_scenario_receipt_covers_exact_criteria` に「`live_trial_verdict_ref` が当該 skill の最新 run を指す」assertion を追加し、4 skill の参照を最新 run へ更新する | 検査で再発を封じられる。参照先 verdict が PASS でない skill は再 trial が要る |
| (b) | `scenario-verdict.json` から `live_trial_verdict_ref` を削り、lint と同じ「最新 run を見る」方式へ寄せる | 受入根拠の追跡性 (どの run で受け入れたか) が失われる |
| (c) | 参照は残し、`transcript_sha256` の実体一致だけを追加検査する | 書き換え検出はできるが「古い run を根拠にし続ける」問題は残る |

(a) を推す理由: 本 issue の本質は「参照が古いこと」であり、digest の正しさだけを見ても解決しない。参照鮮度そのものを検査対象にする必要がある。

## 関連グラフ

- 発見元: `HarnessHub-s7b` の最終レビュー (独立検証)
- 同根: `issue-live-trial-digest-rewrite-render-status-20260721` (`HarnessHub-s7b`) — 184acbc の書き換えを再 trial で是正
- 同根: `issue-live-trial-evidence-provenance-20260721` (`HarnessHub-dst`) — digest 単独書き換えの遮断
- 併発: `issue-live-trial-fixture-receipt-forgery-20260721` (`HarnessHub-aoe`)
