---
graph_node_id: "task-render-registration-stale-digest-handoff-20260804"
artifact_kind: "task"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["dev-graph","render","registration-receipt","stale-digest","phase-13"]
priority: "high"
start_date: "2026-08-04"
target_date: null
iteration: null
title: "dev-graph: render の registration receipt が sync 後に必ず stale になる"
owners: ["daishiman"]
created_at: "2026-08-04T00:00:00Z"
updated_at: "2026-08-04T04:54:05Z"
status: "active"
depends_on: []
related_nodes: ["issue-render-registration-stale-digest-20260803","feat-dev-pipeline-improvement","arch-harness-hub-testing-qa"]
resource_scope: ["tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p13-registration-stale-digest-handoff.md","docs/features/feat-dev-pipeline-improvement/render-registration-stale-digest-spec-reflection-receipt.md","plugins/dev-graph/scripts/render-graph-html.py","plugins/dev-graph/tests/test_render_registration_verification.py","plugins/dev-graph/skills/run-dev-graph-render/SKILL.md","system-spec/testing-qa.md","specs/harness-hub-system-specification.md","architecture/harness-hub-testing-qa.md","features/feat-dev-pipeline-improvement.md","eval-log/dev-graph/run-dev-graph-render/"]
purpose: "Phase 13 の補助引継ぎとして、registration receipt の stale graph digest を安全に部分照合する変更の統合条件と検証証跡を追跡可能にする"
goal: "文書、graph、Beads、draft PR が同じ Beads ID と three-state verification 契約を参照し、main への取り込み後に再現可能な証跡を残す"
scope_in: ["renderer の stale graph digest 表示契約","回帰テストと fresh live trial","system-spec/specs/architecture/features/tasks/docs への反映","Beads/graph/PR の相互記録"]
scope_out: ["製品 API、DB schema、認証認可、製品 UI、Cloudflare deploy unit","registration receipt の digest 値の書き換え"]
acceptance: ["graph digest だけが stale の場合に partial/graph_digest_stale として HTML を生成する","node ID・件数・source digest・source lineage の不一致は fail-closed を維持する","task 文書、graph node、Beads、draft PR の追跡情報が一致する"]
architecture_refs: ["arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p13-registration-stale-digest-handoff.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"d21c363fbb6264e759a30f2d5c02aa4c84783ab90c655208251d7c5b87f79669","evaluator":"final-review","evidence_ref":"eval-log/dev-graph/run-dev-graph-render/criteria-test/scenario-verdict.json"}
source_lineage: {"imported_at":"2026-08-04T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "P13 本体の 300 行上限を超えず、stale digest 変更の統合条件だけを単一責務で追跡する補助 task である"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p13-registration-stale-digest-handoff.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-0ui0","linked_at":"2026-08-04T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-08-04T00:00:00Z","missing_sections":[],"status":"complete"}
---

# Phase 13 引継ぎ: registration receipt stale digest

- registration receipt の node IDs・件数・source digest・source lineage と graph digest が一致するときは `verified` とする。後続 sync によって graph digest **だけ**が古くなったときは `partial` / `graph_digest_stale`、receipt 未指定は `not_performed` とする。その他の不一致は fail-closed（不整合時に処理を止める）を維持する。
- `origin/main` と local `main` の一致を確認後、local `main` からこの branch を作成する。focused test、plugin 回帰、task package、fresh live trial、repository CI を同じ tree で再検証する。
- 反映先は `system-spec/testing-qa.md`、`specs/harness-hub-system-specification.md`、`architecture/harness-hub-testing-qa.md`、feature/doc 更新。正本の受領書は `docs/features/feat-dev-pipeline-improvement/render-registration-stale-digest-spec-reflection-receipt.md`。
- 製品 API・DB・認証認可・UI・Cloudflare deploy unit は非変更。Beads `HarnessHub-0ui0`、issue node `issue-render-registration-stale-digest-20260803`、本補助 task node に commit、Draft PR、検証結果を記録する。

## 目的

registration receipt の stale graph digest を安全に部分一致として扱う変更の統合条件を固定する。

## 背景

sync 後は graph digest だけが変わるため、全項目一致だけを要求すると正しい receipt まで恒常的に stale になっていた。

## 入力と前提条件

render 実装、three-state verification 契約、fresh live trial、`HarnessHub-0ui0` の記録を入力とする。

## 実装対象

renderer の receipt 照合、表示状態、回帰 test、関連仕様と証跡の統合を対象とする。

## 実行手順

差分と正本 digest を確認し、focused / plugin / live-trial / repository gate を同じ tree で実行する。

## 出力と成果物

verified / partial / not_performed の判定、検証証跡、仕様反映受領書、draft PR を成果物とする。

## 依存関係

`issue-render-registration-stale-digest-20260803`、render skill、testing-qa architecture、Beads `HarnessHub-0ui0` に依存する。

## Write scope と競合制約

frontmatter の `resource_scope` 内だけを書き、receipt の既存 digest 値を検査通過目的で書き換えない。

## 受入条件

graph digest だけの stale は partial、その他の不一致は fail-closed、receipt なしは not_performed となる。

## 検証方法

focused test、plugin 回帰、task package、fresh render live trial、repository CI を実行する。

## リスクとロールバック

緩和が source / lineage 不一致へ波及するリスクがある。問題時は対象 commit を revert して完全一致へ戻す。

## GitHub publication

検証状態、Beads / issue / task node、仕様反映、残課題を draft PR 本文へ記録する。

## Handoff

main merge 後に同じ tree で receipt を再検証し、default branch の記録と Beads を reconcile する。
