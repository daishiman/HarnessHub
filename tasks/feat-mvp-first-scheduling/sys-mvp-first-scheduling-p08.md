---
graph_node_id: "SYS-MVP-FIRST-SCHEDULING-P08"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-mvp-first-scheduling"
domain: "operations"
tags: ["feat-mvp-first-scheduling","macro-feature","mvp-first","scheduling","qa-069","operations"]
priority: null
start_date: null
target_date: null
iteration: null
title: "移行 — 既存 task 資産一括書き換えを行わないことの互換性確認 (fallback 動作の実測記録)"
owners: ["daishiman"]
created_at: "2026-07-23T07:08:08Z"
updated_at: "2026-07-24T11:18:17Z"
status: "done"
depends_on: ["SYS-MVP-FIRST-SCHEDULING-P07"]
related_nodes: ["feat-mvp-first-scheduling","arch-harness-hub-dev-workflow"]
resource_scope: ["docs/features/feat-mvp-first-scheduling/compatibility-note.md"]
purpose: "scope_out『既存 task 資産の一括書き換え』を行わないという判断が正しいこと、および既存 node (MVP metadata 未設定) が P05 実装後も fallback 動作でスケジュール継続できることを実測し、N/A 判定の根拠として記録する。"
goal: "P08 の受入条件と品質ゲートを満たし、再実行可能な検証証跡を残す"
scope_in: ["docs/features/feat-mvp-first-scheduling/compatibility-note.md"]
scope_out: ["bd CLI 本体の変更","CI/CD・quality gate 要件 (qa-066) 自体の緩和・削除","dev-graph への新 verb 追加","既存 task 資産の一括書き換え","Hub プロダクト本体機能 (Web/API/DB) の変更","本 phase の責務外の成果物生成 (他 phase の write scope への書込)"]
acceptance: ["同一入力で next を再実行しても選定 batch と順序が一致する (冪等)"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: "feat-mvp-first-scheduling"
feature_package_id: "feature-package/feat-mvp-first-scheduling"
phase_ref: "P08"
file_path: "tasks/feat-mvp-first-scheduling/sys-mvp-first-scheduling-p08.md"
template_id: "task"
template_version: "1.1.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"55a34fe2a62841c0175b568204b4a1fde8e1fd04d1c0496bb4e0444e3cf86387","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-mvp-first-scheduling/55a34fe2a62841c0175b568204b4a1fde8e1fd04d1c0496bb4e0444e3cf86387/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-23T07:08:08Z","origin_kind":"system-dev-planner","source_digest":"55a34fe2a62841c0175b568204b4a1fde8e1fd04d1c0496bb4e0444e3cf86387","source_path":".dev-graph/plans/generations/feature-package-feat-mvp-first-scheduling/55a34fe2a62841c0175b568204b4a1fde8e1fd04d1c0496bb4e0444e3cf86387/task-specs/phase-08-refactoring-migration.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.87
classification_reason: "qa-069 の MVP ファースト化要求のうち P08 責務 (移行 — 既存 task 資産一括書き換えを行わないことの互換性確認 (fallback 動作の実測記録)) を実行する task"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-mvp-first-scheduling/sys-mvp-first-scheduling-p08.md","confidence":0.87}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-6gl.8","linked_at":"2026-07-23T08:22:25Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: [{"base_branch":"main","closing_reference_verified":true,"head_branch":"devgraph/SYS-MVP-FIRST-SCHEDULING-P13","linked_at":"2026-07-24T11:18:17Z","merge_commit_sha":"8d802c23095c896c0b129708f375d9e341ec8873","merged_at":"2026-07-24T02:54:22Z","pr_number":47,"repo":"daishiman/HarnessHub","state":"merged","url":"https://github.com/daishiman/HarnessHub/pull/47"}]
execution_contexts: [{"base_branch":"main","branch":"devgraph/SYS-MVP-FIRST-SCHEDULING-P08","head_sha":"6ab7d593967b2f93ed1c2a5f069719bfe032c71f","last_seen_at":"2026-07-23T14:03:59.766832Z","lease_acquired_at":"2026-07-23T14:03:58.232371Z","released_at":null,"state":"claimed","worktree_id":"wt_f5b59c7488943714"}]
completion_evidence: {"completed_at":"2026-07-24T02:54:22Z","evidence_refs":["https://github.com/daishiman/HarnessHub/pull/47"],"policy":"linked_pr_merged_all","reconciled_at":"2026-07-24T11:18:17Z","source":"github_pr_merge","status":"done"}
implementation_readiness: {"checked_at":"2026-07-23T06:00:00Z","missing_sections":[],"status":"complete"}
---

# System task overlay: 移行 — 既存 task 資産一括書き換えを行わないことの互換性確認 (fallback 動作の実測記録)

## Machine-readable registration fields

- feature_package_id: feature-package/feat-mvp-first-scheduling (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-mvp-first-scheduling", "macro-feature", "mvp-first", "scheduling", "qa-069", "operations"]
- related_nodes: ["feat-mvp-first-scheduling", "arch-harness-hub-dev-workflow"]
- parent_feature: feat-mvp-first-scheduling
- phase_ref: P08
- classification: confidence=0.87, reason="qa-069 の MVP ファースト化要求のうち P08 責務 (移行 — 既存 task 資産一括書き換えを行わないことの互換性確認 (fallback 動作の実測記録)) を実行する task", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-mvp-first-scheduling/sys-mvp-first-scheduling-p08.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

scope_out『既存 task 資産の一括書き換え』を行わないという判断が正しいこと、および既存 node (MVP metadata 未設定) が P05 実装後も fallback 動作でスケジュール継続できることを実測し、N/A 判定の根拠として記録する。

## 背景

本 feature は新規メタデータ軸の追加のみを scope_in とし、既存 task 資産の一括変換は明示的に scope_out としている。そのため移行作業そのものは不要だが、後方互換が実際に機能することは本 phase の責務として実測しておく必要がある。

## 前提条件

- P01 upstream entry gate: N/A: intra-feature depends_on gate
- Required predecessor: SYS-MVP-FIRST-SCHEDULING-P07 が done であること
- Required spec/architecture/phase/task nodes: feat-mvp-first-scheduling, arch-harness-hub-dev-workflow
- Entry gate: goal-spec.json の feature_context_digest が sha256:b0d003254ac6f42d4616dfff30ab605e355c09c9abe642b71559cea6a49e6291 に一致し、features/feat-mvp-first-scheduling.md の frontmatter と goal-spec の purpose/goal/scope_in/scope_out/acceptance が逐語一致すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: frontend 実装物を変更しない
- Backend: N/A: 本 phase は既存 task 資産の一括書き換えを行わない (scope_out)。実装済み fallback 動作の実測のみを行う
- API: N/A: Hub 本体の API を変更しない (scope_out)
- Data: N/A: Hub 本体の DB/schema を変更しない (scope_out)
- Infrastructure: N/A: デプロイ基盤を変更しない
- Security: N/A: 本 phase は認可・秘密情報の取り扱いを変更しない
- Quality: applicable + change: 既存 node の後方互換動作を実測する
- Documentation: applicable + change: docs/features/feat-mvp-first-scheduling/compatibility-note.md を新規作成する
- Operations: applicable + change: 既存 node 運用者向けに移行不要である理由を明記する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-dev-workflow
- Deploy unit/environment: dev-tooling/repository
- Compatibility/migration/backfill: 既存 task 資産は一括書き換えせず、MVP metadata 未設定のまま fallback 動作でスケジュール対象とし続ける

## 成果物

- Produced artifacts:
- docs/features/feat-mvp-first-scheduling/compatibility-note.md
- Consumed artifacts:
- plugins/dev-graph/scripts/schedule-graph.py
- plugins/dev-graph/scripts/bd-bridge.py
- Write scope/touches: docs/features/feat-mvp-first-scheduling/compatibility-note.md

## Tracker publication and completion

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-mvp-first-scheduling-p08) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-mvp-first-scheduling-p08 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-mvp-first-scheduling-p08) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: 直前 predecessor task (SYS-MVP-FIRST-SCHEDULING-P07) が done になるまで着手しない。write scope が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- bd CLI 本体の変更
- CI/CD・quality gate 要件 (qa-066) 自体の緩和・削除
- dev-graph への新 verb 追加
- 既存 task 資産の一括書き換え
- Hub プロダクト本体機能 (Web/API/DB) の変更

## Verification and evidence

- Automated commands:
  - `python3 -m pytest plugins/dev-graph/tests/test_schedule_graph_mvp_first.py -k backward_compat`
- Required evidence: compatibility-note.md に既存 node (MVP metadata 未設定) が fallback 動作でスケジュールされ続けることの実測結果が記録されていること

## Inner goal-seek execution loop

- Methodology contract: `system-task-goal-seek/v1`
- Goal: P08 の Phase acceptance と Verification and evidence をすべて満たす
- Generic execution prompt: 目的・背景・前提条件・write scope・成果物・受け入れ条件を入力に、実装手段を固定せず最小の安全な変更を行う
- Rubric: acceptance 全件、回帰テスト、必須証跡、write scope、依存整合がすべて PASS
- Feedback loop: 実装→独立評価→finding を次の prompt へ反映→再実行し、`rubric verdict=PASS` まで反復する。上限到達時は fail-closed
- P13 spec/architecture writeback: N/A: P13 owns writeback

## Rollout and rollback

- Rollout: 既存 node の fallback 動作を実測し、compatibility-note.md に N/A 判定の根拠を記録してから P09 へ引き継ぐ
- Rollback trigger and steps: fallback 動作の実測で既存 node のスケジュール停止が確認された場合、P05 の後方互換実装を修正し本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature: `features/feat-mvp-first-scheduling.md` (feature_context_digest `sha256:b0d003254ac6f42d4616dfff30ab605e355c09c9abe642b71559cea6a49e6291`)
- Phase responsibility: 現行 feature の purpose・goal・scope・acceptance のうち本 phase 責務の部分集合を所有する。
- Purpose: dev-graph/beads (bd) のタスク優先度選定が品質・本質・再現性を先回りする基準に寄り、いちばん作りたい機能 (MVP) から離れて同じ基盤タスクを繰り返す停滞が起きている (qa-069)。判断軸を「目的=何のために作るか / 背景=どういう経緯か / MVP=今必要な動くもの」の3軸へ組み替え、まず作って使って課題をあぶり出す build-use-learn の回転を取り戻す
- Goal: next/schedule と bd ready の着手候補選定が MVP 適合 (今必要な動くものへの直結度) を第一ソートキーとして動作し、品質・再現性強化系タスクは MVP 成立後へ繰り延べられ、同一入力での選定結果が冪等に再現される状態 (既確定 CI/CD・quality gate 要件 qa-066 は維持)
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
  - feature/task metadata への MVP 判断軸 (目的・背景・MVP 適合度) の表現追加と登録経路
  - schedule/next の着手候補算出への MVP 適合第一ソートキー導入
  - bd-bridge ready 候補順序の MVP-first 整合
  - 品質・再現性強化系タスクの MVP 成立後繰り延べ規則
  - 選定理由 (なぜこのタスクが先か) の receipt 出力
- Scope out:
  - bd CLI 本体の変更
  - CI/CD・quality gate 要件 (qa-066) 自体の緩和・削除
  - dev-graph への新 verb 追加
  - 既存 task 資産の一括書き換え
  - Hub プロダクト本体機能 (Web/API/DB) の変更
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
  - MVP 適合度を持つ task と品質先行 task が混在する入力で、next が MVP 適合 task を先に選定する
  - 同一入力で next を再実行しても選定 batch と順序が一致する (冪等)
  - MVP 判断軸 metadata を持つ node が validate-graph-schema.py PASS で登録できる
  - 選定 receipt に 目的・背景・MVP 適合の判断根拠が記録される
  - qa-066 由来の既存品質ゲートの検査が非退行である
- Architecture/source refs:
  - architecture/harness-hub-dev-workflow.md
  - system-spec/dev-workflow.md (qa-069)

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Phase acceptance

- 同一入力で next を再実行しても選定 batch と順序が一致する (冪等)

## 参照情報

- goal-spec: goal-spec.json (parent_feature=feat-mvp-first-scheduling, feature_context_digest=sha256:b0d003254ac6f42d4616dfff30ab605e355c09c9abe642b71559cea6a49e6291)
- 仕様正本: system-spec/dev-workflow.md qa-069 (dev-graph/beads タスク優先度選定の MVP ファースト化)
- trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 依存

- `SYS-MVP-FIRST-SCHEDULING-P07`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-mvp-first-scheduling` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
