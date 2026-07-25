---
graph_node_id: "issue-task-spec-validate-command-unrunnable-20260725"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["system-dev-planner","task-spec","validator"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "R3-emit が生成する task spec の C12 検証コマンド `--staging .` が実行不能"
owners: ["daishiman"]
created_at: "2026-07-25T13:00:00Z"
updated_at: "2026-07-25T13:00:00Z"
status: "draft"
depends_on: []
related_nodes: ["feat-task-spec-test-strategy"]
resource_scope: ["issues/sys-task-spec-validate-command-unrunnable-20260725.md"]
purpose: "R3-emit が生成する全 task spec の Verification 節が `validate-system-plan.py --staging .` を列挙するが、`--staging` は staging generation path を要求するためカレントディレクトリ `.` では解決できず、記載どおりに実行すると必ず失敗する。promotion 後は staging path 自体が消滅するため構造的にも不適切。feat-task-spec-test-strategy の P05..P13 実行時に実測で判明し、世代非依存形 `--feature-package <id>` へ読み替えて証跡を取得した (final-review.md D-2)。"
goal: "R3-emit が出力する検証コマンドが、生成された task spec を読んだだけで無改変に実行でき、promotion 後も有効な世代非依存形になっている"
scope_in: ["plugins/system-dev-planner/skills/run-system-dev-plan/prompts/R3-emit.md","plugins/system-dev-planner/references/system-task-spec-template.md"]
scope_out: ["既に promoted 済み世代の task spec 本文の遡及書き換え"]
acceptance: ["新規生成される task spec の Verification 節が `--feature-package <feature_package_id>` 形 (または staging 実 path) を持つ","生成直後の staging 段階と promotion 後の双方で、記載コマンドが無改変で exit 0 になることを実測記録する","既存 promoted 世代の validated_digest が不変であること (遡及書き換えをしない)"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-task-spec-validate-command-unrunnable-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-23T13:51:02Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "feat-task-spec-test-strategy P10 最終レビューが記録済み逸脱 D-2 として申し送った生成側欠陥"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-task-spec-validate-command-unrunnable-20260725.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-25T13:00:00Z","missing_sections":[],"status":"incomplete"}
---

# 概要

R3-emit が生成する task spec の Verification 節が列挙する C12 検証コマンド `validate-system-plan.py --staging .` は、記載どおりに実行すると必ず失敗する。

## 背景と問題

`--staging` は staging generation の repository 相対 path を要求するが、生成される task spec には `.` (カレントディレクトリ) が埋め込まれている。task spec を読んだ実行者は、記載されたコマンドをそのまま実行できない。

さらに promotion (C11 の atomic rename) 後は staging path 自体が消滅するため、仮に正しい staging path が書かれていても、promoted 世代の task spec からは再実行できない。task spec は promotion 後も読まれる文書であるため、staging 依存のコマンドは構造的に不適切である。

## 現在の挙動

feat-task-spec-test-strategy の P05..P13 実行時に実測で判明した。実行者は世代非依存形 `--feature-package feature-package/<parent_feature>` へ読み替え、P06 / P08 / P09 の全証跡をその形で取得した (`docs/features/feat-task-spec-test-strategy/final-review.md` §7 D-2)。

読み替えが各実行者の判断に委ねられている限り、証跡ごとに異なるコマンドが使われる余地が残り、「同じ検証を再実行した」ことを証跡から確認できない。

## 期待する挙動

生成された task spec を読んだだけで、無改変に実行して exit 0 になる検証コマンドが記載されている。promotion の前後どちらでも成立する。

## 再現手順またはユースケース

1. 任意の feature に対し `run-system-dev-plan` を実行し exact-13 package を生成する
2. 生成された `task-specs/phase-05-implementation.md` の Verification and evidence 節を読む
3. 記載された `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .` をそのまま実行する
4. staging generation として `.` を解決できず失敗する

## 影響と優先度

- 影響範囲: system-dev-planner が生成する全 feature の task spec 13 件 × feature 数
- 深刻度: medium
- 緊急度: 記載どおりの実行は失敗するが、正しい代替形 (`--feature-package`) が存在し実行者が読み替えれば検証自体は完遂できるため、機能停止には至らない。ただし証跡の再現性を損なうため放置は不可。

## スコープ

- In: `plugins/system-dev-planner/skills/run-system-dev-plan/prompts/R3-emit.md` の生成指示、および `references/system-task-spec-template.md` の Verification 節ひな形
- Out: 既に promoted 済み世代の task spec 本文の遡及書き換え (validated_digest を動かすため行わない)

## 関連グラフ

- 原因/親ノード: feat-task-spec-test-strategy
- 関連仕様: spec-harness-hub-requirements
- 関連アーキテクチャ: arch-harness-hub-dev-workflow
- 解決タスク: (未着手)

## 受入条件

- [ ] 新規生成される task spec の Verification 節が `--feature-package <feature_package_id>` 形 (または staging 実 path) を持つ
- [ ] 生成直後の staging 段階と promotion 後の双方で、記載コマンドが無改変で exit 0 になることを実測記録する
- [ ] 既存 promoted 世代の validated_digest が不変であること (遡及書き換えをしない)

## 検証証跡

- コマンド/テスト: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/<parent_feature>`
- 証跡 path: `docs/features/feat-task-spec-test-strategy/final-review.md` §7 D-2 (発見時の実測記録)
