# System task overlay: 独立最終レビュー — quality_constraints 6件・acceptance 3件の最終確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-tenant-data-retention (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-tenant-data-retention", "macro-feature", "quality", "final-review"]
- related_nodes: ["feat-tenant-data-retention"]
- parent_feature: feat-tenant-data-retention
- phase_ref: P10
- classification: confidence=0.83, reason="quality_constraints 6件・acceptance 3件の最終確認を独立観点で行うP10最終レビュータスク", candidates=[{artifact_kind: task, confidence: 0.83, candidate_path: tasks/feat-tenant-data-retention/sys-tenant-data-retention-p10.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P09 の品質・セキュリティ・運用保証確認をもとに、quality_constraints 6 件と acceptance 3 件を P02〜P09 の作成者とは独立した最終レビュー観点で再確認し、本 feature が dev-graph へ登録可能な完了状態にあることを確定する。この task 完了時点で、final-review-record.md に全項目の最終確認結果が記録される。

## 背景

Feature Execution Package の固定責務マッピングでは、P10 は「独立最終レビュー」を担い、本 feature 全体を通した quality_constraints 6 件 (c4-revision-tenant-data-retention-qa045-048-appr007, tenant-data-envelope-encryption-numeric-contract, immediate-full-deletion-r2-db-backup-contract, tenant-cross-boundary-read-prevention-t14-r2-prefix, r2-usage-monitoring-alert-cron-extension, tenant-data-api-endpoint-detail-deferred-to-p02) と acceptance 3 件が、P01〜P09 の各 task 成果物を通じて過不足なく満たされていることを最終確認するゲートである。特に P02 で据置事項として扱われた 3 点 (encryption_keys.purpose enum 拡張、API エンドポイント詳細設計、削除完全性テスト採番) が実際に確定・実装・検証されたことを確認する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-tenant-data-retention
- Entry gate: P09 (docs/features/feat-tenant-data-retention/quality-assurance-report.md) が作成済みであり T14/T15 対策確認・R2 使用量監視運用確認が完了していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature は host UI を持たず frontend レビュー対象がない
- Backend: N/A: 本 task は最終レビューのみで backend 実装物を変更しない
- API: N/A: 本 task は最終レビューのみで API 契約を変更しない
- Data: N/A: 本 task は最終レビューのみでデータ移行を伴わない
- Infrastructure: N/A: 本 task は最終レビューのみでデプロイ単位の変更を伴わない
- Security: applicable + control: quality_constraints 6 件 (encryption_keys enum拡張・API詳細設計・削除完全性テスト採番の確定を含む) の最終確認を行う
- Quality: applicable + tests/gates: acceptance 3 件・quality_constraints 6 件の最終確認結果を final-review-record.md へ確定記録する
- Documentation: applicable + change: docs/features/feat-tenant-data-retention/final-review-record.md を新規作成する
- Operations: N/A: 運用手順の最終確認は P13 のリリース判定で扱う

## Architecture and deploy unit

- Architecture decisions: N/A: 本 task は最終レビューのみで新たな architecture decision を伴わない
- Deploy unit/environment: cloudflare-workers/hub (本 task は最終レビューのみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は最終レビューのみで互換性移行を伴わない

## 成果物

- Produced artifacts: docs/features/feat-tenant-data-retention/final-review-record.md (quality_constraints 6件・acceptance 3件の最終確認結果)
- Consumed artifacts: docs/features/feat-tenant-data-retention/quality-assurance-report.md, docs/features/feat-tenant-data-retention/acceptance-record.md, docs/features/feat-tenant-data-retention/architecture-decision-record.md
- Write scope/touches: docs/features/feat-tenant-data-retention/final-review-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-tenant-data-retention-p10) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-tenant-data-retention-p10 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-tenant-data-retention-p10) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-TENANT-DATA-RETENTION-P09] であり P09 完了後に着手する。resource_scope (docs/features/feat-tenant-data-retention/final-review-record.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 実装コードの作成・修正 (owner=P05。本 task は最終レビューのみ)
- 新たな architecture decision の作成 (owner=P02)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-tenant-data-retention`
- Required evidence: final-review-record.md に quality_constraints 6 件・acceptance 3 件全ての最終確認結果 (問題なし) が記載されていること

## Rollout and rollback

- Rollout: final-review-record.md を作成し、全項目に重大な指摘がないことを確認してから P11 (再現可能な証跡) へ引き継ぐ
- Rollback trigger and steps: 重大な指摘がある場合、final-review-record.md に理由を記録し該当するP02/P05/P08/P09のいずれかへ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/spec-state.json qa_log (qa-045, qa-046, qa-047, qa-048, qa-049), approval_log (appr-007)
- Detailed authoritative source: docs/security-spec.md, docs/backend-spec.md, docs/infrastructure-spec.md
- Architecture: N/A: 本 task は最終レビューのみで architecture 参照を新たに追加しない
- Feature: feat-tenant-data-retention
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-TENANT-DATA-RETENTION-P09
