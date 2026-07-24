---
graph_node_id: "issue-promoted-plan-validator-version-drift-20260724"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "tooling"
tags: ["system-dev-planner","validator","task-spec","backward-compatibility","feat-hub-foundation"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "promoted plan が validator 強化後に遡及失敗する（goal-seek / P13 writeback 契約差）"
owners: ["daishiman"]
created_at: "2026-07-24T09:29:31Z"
updated_at: "2026-07-24T09:33:16.827962Z"
status: "draft"
depends_on: []
related_nodes: ["feat-hub-foundation"]
resource_scope: ["plugins/system-dev-planner/",".dev-graph/plans/generations/","tasks/"]
purpose: "2026-07-19 に pass/readiness complete で promoted された feat-hub-foundation の固定 digest を、2026-07-24 の validate-system-plan.py で再検証すると、後から追加された Inner goal-seek execution loop と P13 spec/architecture writeback を遡及要求され 27 violations になる。content-addressed generation の不変性と current validator の契約強化が両立していない。"
goal: "promoted generation が生成時の契約版で再検証可能か、正規の再生成・再 promotion で新契約へ移行でき、固定 generation を手編集せず品質ゲートを再現できる状態"
scope_in: ["plan/task-spec の contract version を generation metadata へ明示","validator の version-aware 検証または正規 migration / repromotion 経路","旧 promoted package と新 package の回帰テスト","task projection の current pointer・digest・再実行コマンド整合"]
scope_out: ["content-addressed generation の直接手編集","required section を無条件に緩和","feat-hub-foundation 成果物の実装変更","旧 issue HarnessHub-p4f が扱った acceptance 3→4 / quality constraints 8→9 の drift"]
acceptance: ["固定 digest 8735bb の feat-hub-foundation package が生成時契約で再現可能に validate pass する、または新 digest への正規 repromotion 手順が機械実行できる","旧 generation を直接書き換えず source digest と registration receipt の整合を維持する","新規生成 package では Inner goal-seek execution loop と P13 writeback 契約を引き続き必須にする","validator 強化前後の promoted package を対象にした backward-compatibility / migration test が pass する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/promoted-plan-validator-version-drift-20260724.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-24T09:29:31Z","origin_kind":"manual","source_digest":"368722ab009d1297dabe0193417ef1b58cb08daff4003458f977b1abda498d45","source_path":"plugins/system-dev-planner/scripts/validate-system-plan.py","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.98
classification_reason: "promoted content-addressed plan と validator の契約版が分離されておらず、後日の validator 強化で既存の pass package が遡及失敗する tooling compatibility issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/promoted-plan-validator-version-drift-20260724.md","confidence":0.98}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-4q8","linked_at":"2026-07-24T09:31:20Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-24T09:29:31Z","missing_sections":[],"status":"complete"}
---

# 概要

`feature-package/feat-hub-foundation` の promoted digest `8735bb...` は生成時に confirmation pass / readiness complete だったが、現在の `validate-system-plan.py` では後から追加された必須 section を遡及要求され fail する。

## 背景と問題

P01〜P13 task projection は固定 digest と task-spec SHA を pin し、再検証は current pointer 経由の validator command を正規経路としている。ところが validator の REQUIRED_TASK_SPEC_SECTIONS と P13 writeback marker が強化された後も、generation metadata に契約版が無いため、過去に正しく promoted された不変 package へ新契約がそのまま適用される。

2026-07-24 の実測では 13 task spec すべてに `task-spec-section-missing: Inner goal-seek execution loop` と `inner-goal-seek-contract`、P13 に `p13-spec-architecture-writeback` が出て計 27 violations となる。Hub の実装・テストは `pnpm verify` で pass しており、この failure は成果物不良ではなく plan contract の版管理不在である。

## 現在の挙動

- promoted package: confirmation pass / evaluation pass / readiness complete
- current validator: exit 2 / status fail / 27 violations
- package は content-addressed のため section をその場で追記すると digest・receipt・projection の整合を壊す

## 期待する挙動

生成時契約版で過去 package を再現検証できるか、正規 generator を再実行して新 digest へ repromote し、task projection と receipt を一括更新できる。新規 package では強化後の goal-seek / P13 writeback 要件を維持する。

## 影響と優先度

- 影響範囲: 既存 promoted feature package の再検証、P01〜P13 close-out
- 深刻度: medium — 実装品質は保たれるが、正規 completion gate が後日理由なく赤へ変わる
- 緊急度: lifecycle reconcile 前に failure の所有先を分離しないと task 実装の失敗と誤認する

## スコープ

- In: contract versioning、version-aware validation または repromotion、回帰テスト、projection 整合
- Out: immutable generation の手編集、強化要件の削除、Hub 実装変更

## 関連グラフ

- 対象 feature: `feat-hub-foundation`
- 旧 drift issue: HarnessHub-p4f（acceptance/QC 件数 drift。今回とは別）

## 受入条件

- [ ] 旧 promoted package を生成時契約で再現検証できる、または正規 repromotion が完走する
- [ ] content-addressed generation を直接手編集しない
- [ ] 新規 package の goal-seek / P13 writeback gate は維持される
- [ ] 旧・新 contract の回帰テストが pass する

## 検証証跡

- 再現: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-hub-foundation`
- observed: status=fail / 27 violations（13×2 + P13×1）
