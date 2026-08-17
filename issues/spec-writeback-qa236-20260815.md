---
graph_node_id: "issue-spec-writeback-qa236-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "testing-qa"
tags: ["feat-demo-coverage-dataset","spec-writeback","qa-236","follow-up"]
priority: "medium"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "system-spec/testing-qa.md へ qa-236 実行結果を writeback するか判断し反映する"
owners: ["daishiman"]
created_at: "2026-08-15T01:50:00Z"
updated_at: "2026-08-15T01:50:00Z"
status: "active"
depends_on: []
related_nodes: ["feat-demo-coverage-dataset","arch-harness-hub-testing-qa"]
resource_scope: ["system-spec/testing-qa.md","architecture/harness-hub-testing-qa.md","issues/spec-writeback-qa236-20260815.md"]
purpose: "確定章への実行結果 writeback の要否を決め、必要なら C01/C03 の正規手順で反映する"
goal: "system-spec/testing-qa.md への writeback が『不要と判断して記録済み』か『正規手順で反映済み』のどちらかに決着している"
scope_in: ["writeback 要否の判断と根拠の記録","必要時の C01 R4-reopen -> 再確定 -> C03 compile の実行"]
scope_out: ["確定章の単一 writer を迂回した直接編集","guard-confirmed-chapter-overwrite.py の緩和","feat-demo-coverage-dataset の他 phase の再実行"]
acceptance: ["判断とその根拠が文書に残っている","反映する場合は C01/C03 経由であること","確定章の既存記述が削除されていないこと"]
architecture_refs: ["arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/spec-writeback-qa236-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"f72093c7f26a5751797963d4cd1ae546b5b3c4eebf73cb07588de76a75c89605","evaluator":"feat-demo-coverage-dataset P13 close-out","evidence_ref":"docs/features/feat-demo-coverage-dataset/release-notes.md"}
source_lineage: {"imported_at":"2026-08-15T01:50:00Z","origin_kind":"manual","source_digest":null,"source_path":"docs/features/feat-demo-coverage-dataset/release-notes.md","source_plugin":"manual-close-out","source_version":"0.1.0"}
classification_confidence: 0.95
classification_reason: "確定章 writeback の要否判断という単発の作業であり、feature 分解を要しない独立 issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/spec-writeback-qa236-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T01:50:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`system-spec/testing-qa.md` (qa-236) へ、`feat-demo-coverage-dataset` の実行結果を writeback するかどうかを判断し、必要なら正規手順で反映する。

## 背景と問題

`feat-demo-coverage-dataset` の P13 (リリース/デプロイ) は、その task 仕様で spec/architecture への writeback を必須責務としている。このうち architecture 側 (`architecture/harness-hub-testing-qa.md`) は C02 `upsert-node.py` 経由で反映済みだが、spec 側は未実施のまま繰り越した。

理由は、`system-spec/testing-qa.md` が `status: confirmed` の確定章であることにある。確定章は次の 2 段で保護されている。

1. 書込経路が C01 `apply-spec-transition.py` と C03 `compile-spec-doc.py` の単一 writer に一本化されている。
2. `guard-confirmed-chapter-overwrite.py` (C11 hook) が確定章への `Write`/`Edit` を fail-closed (exit 2) で遮断する。

つまり「実行結果を 1 節追記する」だけでも、C01 の R4-reopen で当該セルを `未収集` へ戻し、再ヒアリング → 再確定 → C03 で章を再生成する、という経路を通る必要がある。確定状態の保全という仕組みの目的に照らして、この巻き戻しが妥当かどうかは判断を要する。

## 現在の挙動

- `architecture/harness-hub-testing-qa.md` に「2026-08-15 確認用データセットの実装結果 writeback」節がある (実装物一覧・実測値・設計判断 3 点・後続への前提提供)。
- `system-spec/testing-qa.md` の qa-236 節は設計内容のみで、実行結果を含まない。
- `docs/features/feat-demo-coverage-dataset/release-notes.md` §4 に、この未達と理由が記録されている。

## 期待する結末

次のどちらかに決着していること。

- **A: spec 側 writeback は不要と判断する** — 実行結果の記録先は architecture 側で足りる、という判断を根拠付きで記録し、本 issue を閉じる。確定章は「何を作るか」の正本であり、「作った結果どうだったか」は別の場所に置く、という役割分担を明示する。
- **B: 必要と判断する** — C01 R4-reopen → 再確定 → C03 compile の正規手順で `system-spec/testing-qa.md` を更新する。R4-reopen には理由の記録が必須である。

いずれの場合も、確定章を単一 writer 以外の経路で直接編集しないこと。

## 参照

- `docs/features/feat-demo-coverage-dataset/release-notes.md` §4
- `.dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/*/task-specs/phase-13-release-deploy.md` (rubric 2)
- `plugins/system-spec-harness/hooks/guard-confirmed-chapter-overwrite.py`
