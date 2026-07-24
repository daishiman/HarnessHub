---
graph_node_id: "issue-live-trial-skill-contract-bypass-20260721"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["dev-graph","live-trial","goal-seek","anti-goodhart"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "live-trial が skill をロードしながら実行契約を飛ばして下位 script を直叩きできる"
owners: ["daishiman"]
created_at: "2026-07-21T18:30:00Z"
updated_at: "2026-07-23T10:25:28.267083Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["issues/sys-live-trial-skill-contract-bypass-20260721.md"]
purpose: "SKILL.md がゴールシーク配線を実行契約と定めるのに、trial は下位 script を直接叩いて成果物だけ出せる。成果物だけ見る検査では正常な実走と区別できない。task.md への明示要求は必要条件ですらない。"
goal: "SKILL.md がゴールシーク配線を実行契約と定めるのに、trial は下位 script を直接叩いて成果物だけ出せる。成果物だけ見る検査では正常な実走と区別できない。task.md への明示要求は必要条件ですらない。"
scope_in: ["issues/sys-live-trial-skill-contract-bypass-20260721.md"]
scope_out: []
acceptance: []
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-live-trial-skill-contract-bypass-20260721.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-21T18:30:00Z","origin_kind":"manual","source_digest":null,"source_path":"eval-log/dev-graph/run-dev-graph-render/live-trial/20260721T180000-r7/verdict.json","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "live-trial が skill をロードしながらゴールシーク実行契約を飛ばして下位 script を直叩きできる問題を追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-live-trial-skill-contract-bypass-20260721.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-m7d","linked_at":"2026-07-23T10:11:37Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-18T16:20:35Z","missing_sections":[],"status":"complete"}
---

# 概要

live-trial の trial セッションは被験 skill をロードしながら、SKILL.md が実行契約と定めるゴールシーク配線を飛ばして下位 script を直叩きでき、成果物だけを見る検査では正常な実走と区別できない。

## 背景と問題

SKILL.md は該当節を「frontmatter の `goal_seek.engine: inline` / `fork: subagent` / `max_loops: 5` を**実行契約とする**」と明記しており、任意の付録ではない。

しかし trial が `Skill({skill: "..."})` でロードした後に下位 script を直接実行しても、`out/status.json` は正常に出力され `DONE: PASS` で終わる。

## 現在の挙動 (実測)

`HarnessHub-s7b` の初回再 trial で **2 件とも**この経路を通った。

| run | 観測 |
|---|---|
| `run-dev-graph-status/live-trial/20260721T140000-r5` | transcript の tool_use が `ls` と `status-graph.py` の **2 本のみ**。C24 `resolve-repo-context` receipt 取得、`DEV_GRAPH_ROOT` 固定、`eval-log/` 配下への goal-spec・progress・intermediate.jsonl 記録、R1-elicit/R2-plan/R3-status prompt の読込と Agent fork が**全て未実行** |
| `run-dev-graph-render/live-trial/20260721T130000-r6` | 同様にゴールシーク成果物が fixture 配下に不在 |

## 現状の緩和と、その限界

再々 trial では **task.md に履行を明示要求した**ところ、`run-dev-graph-status/live-trial/20260721T181000-r6` は全項目を履行した (独立評価者が `sha256(goal_spec['original_goal'])` を自ら計算して `original_goal_hash` との一致を確認済み)。

**しかしこれは「書けば守られる」だけで、「書かなければ省略される」状態は変わっていない。** 実際、同じ再々 trial でも render 側 (`20260721T180000-r7`) は task.md に同じ要求を書いたにもかかわらず、**手順 4 (prompts/<R-id>.md の Agent fork) の形跡が pane.txt に皆無**だった (status 側は Task agent 3 件が可視)。

つまり task.md への記載は**必要条件ですらなく、単なるお願い**にとどまっている。

## 期待する挙動

`goal_seek` を宣言している skill の live-trial は、実行契約の履行が機械検査され、未履行なら verdict が降格される。

## 影響と優先度

- 影響範囲: `goal_seek` を宣言する全 skill の live-trial
- 深刻度: medium
- 緊急度: 単独では偽の PASS を生まないが (goal 判定で落ちる)、独立評価者の負担に依存している

## スコープ

- In: `scripts/lint-live-trial-verdict.py`、`plugins/harness-creator/skills/run-skill-live-trial/scripts/live-trial-verdict.py`
- Out: 各 skill の SKILL.md 側のゴールシーク配線の記述 (既に存在する)

## 是正案

| # | 案 | 備考 |
|---|---|---|
| (a) | **transcript の tool_use を検査する** — 被験 skill が `goal_seek` を宣言している場合、transcript に (i) `resolve-repo-context.py` の呼出、(ii) `eval-log/<skill>-goal-spec.json` / `-progress.json` / `-intermediate.jsonl` の書込、(iii) `Agent` (Task) の fork が現れることを必須化 | 独立評価者が手作業で行った検査の自動化。実効性は実証済み |
| (b) **推奨** | **`intermediate.jsonl` の内容検査を verdict 生成に組み込む** — SKILL.md の「ゴールシーク検証」python ブロック (6 キー必須 + `original_goal_hash` 一致) を `live-trial-verdict.py` が自動実行する | 検証ロジックは既に SKILL.md 内に存在し、trial 側の任意実行に委ねられているだけ。生成側へ移せば強制になる |
| (c) | 未充足なら verdict を `tier` 降格させる | 既存の `downgrade_reason` 機構を流用できる |

## 受入条件

- [ ] `goal_seek` 宣言 skill の live-trial で、ゴールシーク成果物の欠落が機械的に検出される
- [ ] `intermediate.jsonl` の 6 キーと `original_goal_hash` 一致が verdict 生成時に自動検証される
- [ ] task.md に明示要求を書かなくても検出される

## 検証証跡

- コマンド/テスト: `python3 scripts/lint-live-trial-verdict.py --self-test`
- 証跡 path: `eval-log/dev-graph/run-dev-graph-status/live-trial/20260721T140000-r5/` (未履行例) と `.../20260721T181000-r6/` (履行例)
