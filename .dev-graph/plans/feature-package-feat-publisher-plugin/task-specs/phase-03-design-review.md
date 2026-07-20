# System task overlay: 独立設計レビュー — apps/publisher構成・packages/inspection消費境界・Device Flow token保存方式・wrangler実行方式の妥当性確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-publisher-plugin (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-publisher-plugin", "macro-feature", "quality", "design-review"]
- related_nodes: ["feat-publisher-plugin", "arch-harness-hub-backend", "arch-harness-hub-security"]
- parent_feature: feat-publisher-plugin
- phase_ref: P03
- classification: confidence=0.83, reason="P02 の設計判断が P01 の要件ベースラインおよび goal-spec.json の quality_constraints と矛盾しないことを独立観点で確認する P03 設計レビュータスク", candidates=[{artifact_kind: task, confidence: 0.83, candidate_path: tasks/feat-publisher-plugin/sys-publisher-plugin-p03.md}]
- tracker_binding_intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 の architecture-decision-record.md の設計判断が P01 の要件ベースラインおよび goal-spec.json の quality_constraints 8 件と矛盾しないことを、設計者から独立した観点で確認する。

## 背景

feature-execution-package-contract.md が定める P03 (独立設計レビュー) の責務として、P02 の設計判断が (1) packages/inspection の二重実装回避 (qa-010/qa-020) を満たすか、(2) Device Flow token を OS 資格情報域にのみ保存する制約 (qa-008/qa-041) を 満たすか、(3) target=web_app の出口が作者 local session での wrangler CLI 実行に限定されているか (I5/qa-003/qa-043)、(4) 専用 desktop GUI を作らない制約 (qa-007) に抵触しないか、の 4 点を中心にレビューする。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-publisher-plugin, arch-harness-hub-backend, arch-harness-hub-security
- Entry gate: docs/features/feat-publisher-plugin/architecture-decision-record.md が P02 完了時点で存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature は frontend 実装物を持たない
- Backend: N/A: 本 task は設計判断のレビューのみでコード実装を伴わない
- API: N/A: API 契約自体のレビューは本 task の対象外で、実装境界のみ P02 の設計を参照する
- Data: N/A: 本 feature は永続データストアのスキーマ変更を伴わない
- Infrastructure: N/A: 新規インフラのプロビジョニングは本 task の対象外
- Security: applicable + change: Device Flow token 保存方式のレビュー結果を記録する
- Quality: applicable + change: 設計判断 5 点 (apps/publisher構成・plugin面配置・inspection消費境界・token保存方式・wrangler実行方式) の妥当性確認結果を design-review-notes.md に記録する
- Documentation: applicable + change: docs/features/feat-publisher-plugin/design-review-notes.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-security (P02 の architecture decision の正本参照)
- Deploy unit/environment: author-local-session/harness-hub-publisher-plugin (作者ローカル session で稼働する Publisher CLI/plugin の配布・実行単位)
- Compatibility/migration/backfill: N/A: 本 task はレビューのみで実装・migration を伴わない

## 成果物

- Produced artifacts: docs/features/feat-publisher-plugin/design-review-notes.md
- Consumed artifacts: docs/features/feat-publisher-plugin/architecture-decision-record.md, docs/features/feat-publisher-plugin/requirements-baseline.md
- Write scope/touches: docs/features/feat-publisher-plugin/design-review-notes.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-publisher-plugin-p03) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-publisher-plugin-p03 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-publisher-plugin-p03) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=['SYS-PUBLISHER-PLUGIN-P02']。resource_scope (docs/features/feat-publisher-plugin/design-review-notes.md) は他 task の active lease と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- 設計判断そのものの変更 (owner=P02。本 task はレビューのみ)
- 実装可否判断 (owner=P04以降)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-publisher-plugin`
- Required evidence: design-review-notes.md に 4 観点 (inspection二重実装回避/token保存方式/wrangler実行方式限定/desktop GUI非作成) の確認結果と承認可否が記載されていること

## Rollout and rollback

- Rollout: design-review-notes.md で承認確認を完了してから P04 (テストファースト設計) へ引き継ぐ
- Rollback trigger and steps: レビューで矛盾が発見された場合、P02 に差し戻し architecture-decision-record.md を修正した上で本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/spec-state.json qa_log (qa-003, qa-007, qa-008, qa-010, qa-020, qa-041, qa-043)
- Detailed authoritative source: docs/features/feat-publisher-plugin/architecture-decision-record.md
- Architecture: arch-harness-hub-backend, arch-harness-hub-security
- Feature: feat-publisher-plugin
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-PUBLISHER-PLUGIN-P02
