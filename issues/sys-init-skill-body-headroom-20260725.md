---
graph_node_id: "issue-init-skill-body-headroom-20260725"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","skill-design","pd-001","run-dev-graph-init"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "dev-graph: run-dev-graph-init に skill-local references/ を新設し Execution contract 5 の過積載と PD-001 の残 1 行を解消する"
owners: ["daishiman"]
created_at: "2026-07-25T00:29:18Z"
updated_at: "2026-07-28T04:12:10Z"
status: "closed"
depends_on: []
related_nodes: []
resource_scope: ["plugins/dev-graph/skills/run-dev-graph-init/SKILL.md"]
purpose: "本文行数の上限に張り付いた状態を解消し、以後の run-dev-graph-init への追記が PD-001 違反や過積載を招かない構造にする"
goal: "Execution contract 5 が 2 コマンドと停止条件だけを述べ、詳細は skill-local references/ が持ち、PD-001 が references 枝でも充足する状態"
mvp_alignment: null
scope_in: ["skill-local references/ の新設と検証契約詳細の退避","Execution contract 5 の主張数の削減","移設後の content-review 再評価 (elegance/rubric 両方)"]
scope_out: ["validate-repo-config.py の挙動変更 (HarnessHub-sgt で確定済み)","live-trial / criteria scenario receipt の再取得 (HarnessHub-5pdc の担当)"]
acceptance: ["Execution contract 5 が step 1-4 と同程度の粒度になっている","PD-001 が skill-local references/ の存在枝で充足する","elegance と rubric の両 verdict が移設後の sha で PASS する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-init-skill-body-headroom-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-25T00:29:18Z","origin_kind":"generated","source_digest":"43336931b9d84c400dc5782da751ef86682e031b5169643c25778584c065cd86","source_path":"system-spec/dev-workflow.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "HarnessHub-sgt の content-review で rubric が low として継続指摘し、恒久解として references/ 新設を提案した構造課題"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-init-skill-body-headroom-20260725.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-5tp8","linked_at":"2026-07-25T00:29:18Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-25T03:10:14Z","evidence_refs":["plugins/dev-graph/skills/run-dev-graph-init/references/validation-contract.md","plugins/dev-graph/skills/run-dev-graph-init/SKILL.md","plugins/dev-graph/tests/test_validate_repo_config.py","eval-log/dev-graph/run-dev-graph-init/content-review/elegance-verdict.json","eval-log/dev-graph/run-dev-graph-init/content-review/rubric-verdict.json"],"policy":"manual","reconciled_at":"2026-07-25T03:10:14Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-07-25T00:29:18Z","missing_sections":[],"status":"complete"}
---

# 概要

`run-dev-graph-init` の SKILL.md 本文が PD-001 の上限 100 行に対して 99 行まで到達しており、以後の追記が構造変更なしには入らない。skill-local `references/` を新設して検証契約の詳細を退避し、あわせて Execution contract 5 の過積載を解消する。

## 背景と問題

HarnessHub-sgt の content-review で rubric evaluator が 2 周連続 low として指摘した。

- Execution contract 5 が 1 段で 7 主張（2 script と検証対象の対応 / `$DEV_GRAPH_PLUGIN`・`$DEV_GRAPH_ROOT` の束縛 / config 検証 3 観点 / `--require-content-roots` に渡す範囲 / `system_spec` の責務帰属 / jsonschema 手書き禁止 / 二回目 planned changes 0）を抱え、約 400 字の 1 行になっている。step 1-4 が各 1-2 文であるのに対し粒度が非対称。
- PD-001 は「body ≤ 100 行 **または** skill-local `references/` の存在」で充足する。本 skill は `references/` を持たないため行数枝でのみ PASS しており、余裕は 1 行しかない。

sgt の中では修正を見送った。step 5 を分割するだけの案（Gotchas へ 1 bullet、変数束縛を独立行へ）は body 99→102 行となり PD-001 を新たに割るため、low を 1 件消して low を 1 件作る取引にしかならないと判断したためである。rubric evaluator もこの見送り判断を「定量的に正当」と評価したうえで、恒久解として `references/` 新設を提案した。

## 現在の挙動

2026-07-25 実測。body 99 行（`wc -l`=179、frontmatter 区切りが 1 行目と 80 行目）。`plugins/dev-graph/skills/run-dev-graph-init/` 配下に `references/` は存在しない。

## 期待する挙動

Execution contract 5 が step 1-4 と同程度の粒度になり、検証契約の詳細（変数束縛・root 一覧の根拠・`system_spec` の責務帰属）は skill-local `references/` が持つ。PD-001 が references 枝で充足し、本文行数の残余に依存しなくなる。

## 再現手順またはユースケース

1. `wc -l plugins/dev-graph/skills/run-dev-graph-init/SKILL.md` で frontmatter を除いた本文行数を数える
2. `ls plugins/dev-graph/skills/run-dev-graph-init/references/` が存在しないことを確認する

## 影響と優先度

- 影響範囲: system。以後 run-dev-graph-init へ 2 行以上の追記が必要になった時点で、その変更は必ず構造変更を伴う。
- 深刻度: low
- 緊急度: 現時点で gate は緑。次に本 skill を触る変更とセットで扱うのが効率的。

## スコープ

- In: skill-local `references/`（例 `references/validation-contract.md`）の新設と検証契約詳細の退避、Execution contract 5 の主張数削減、移設後の content-review 再評価。
- Out: `validate-repo-config.py` の挙動変更（sgt で確定済み）、live-trial / criteria scenario receipt の再取得（HarnessHub-5pdc の担当）。

## 関連グラフ

- 原因/親ノード: `issue-repo-config-schema-validation-20260724`
- 関連仕様: `spec-dev-workflow`
- 関連アーキテクチャ: <該当なし>
- 解決タスク: <未起票>

## 受入条件

- [ ] Execution contract 5 が step 1-4 と同程度の粒度になっている
- [ ] PD-001 が skill-local `references/` の存在枝で充足する
- [ ] elegance と rubric の両 verdict が移設後の sha で PASS する

## 検証証跡

- コマンド/テスト: `python3 scripts/lint-content-review.py --all`、`python3 -m pytest plugins/dev-graph/tests -q`
- 証跡 path: `eval-log/dev-graph/run-dev-graph-init/content-review/{elegance,rubric}-verdict.json`

## 補足

SKILL.md を変更すると content-review の 2 verdict と live-trial 系証跡が同時に失効する。HarnessHub-5pdc（挙動面証跡の再取得）と同じ周回で扱うと再評価コストを 1 回に抑えられる。
