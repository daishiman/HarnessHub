# System task overlay: 受入 — テナント分離・削除完全性・暗号化検証の3件受入判定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-tenant-data-retention (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-tenant-data-retention", "macro-feature", "quality", "acceptance"]
- related_nodes: ["feat-tenant-data-retention"]
- parent_feature: feat-tenant-data-retention
- phase_ref: P07
- classification: confidence=0.85, reason="goal-spec.json acceptance 3項目 (テナントA業務データのテナントB非取得・削除API実行後の非残存・R2上の非平文暗号化保管) を確認するP07受入タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-tenant-data-retention/sys-tenant-data-retention-p07.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P06 のテスト実行結果をもとに、goal-spec acceptance 3 件 (テナント分離・削除完全性・暗号化検証) を最終確認し、本 feature の中核価値提供が受入可能な状態にあることを判定する。この task 完了時点で、acceptance-record.md に 3 件全ての pass 結果と証跡が記録される。

## 背景

goal-spec の acceptance は (1) テナント A の業務データがテナント B のいかなる authz role からも取得不可であること、(2) 削除 API 実行後、R2 blob・DB row・backup 断面のいずれにも当該データの平文/暗号文が残存しないこと、(3) 保管された業務データが R2 上で平文として存在せず、テナント別 DEK で封筒暗号化されていること、の 3 件で構成される。本 task は P06 のテスト実行結果 (test-run-results.md) を根拠として、これら 3 件が実際に満たされていることを確認し、受入記録として固定する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-tenant-data-retention
- Entry gate: P06 (docs/features/feat-tenant-data-retention/test-run-results.md) が作成済みであり、quality_constraints 6 件全てのテストが pass していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature は host UI を持たず frontend 受入対象がない
- Backend: N/A: 本 task は受入判定のみで backend 実装物を変更しない
- API: N/A: 本 task は受入判定のみで API 契約を変更しない
- Data: N/A: 本 task は受入判定のみでデータ移行を伴わない
- Infrastructure: N/A: 本 task は受入判定のみでデプロイ単位の変更を伴わない
- Security: applicable + control: テナント分離テストログ・削除完全性テストログ・暗号化検証テストログを根拠に acceptance 3 件を確認する
- Quality: applicable + tests/gates: acceptance 3 件全ての pass 結果を acceptance-record.md へ確定記録する
- Documentation: applicable + change: docs/features/feat-tenant-data-retention/acceptance-record.md を新規作成する
- Operations: N/A: 運用手順の受入は P13 のリリース判定で扱う

## Architecture and deploy unit

- Architecture decisions: N/A: 本 task は受入判定のみで新たな architecture decision を伴わない
- Deploy unit/environment: cloudflare-workers/hub (本 task は受入判定のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は受入判定のみで互換性移行を伴わない

## 成果物

- Produced artifacts: docs/features/feat-tenant-data-retention/acceptance-record.md (acceptance 3件の確認結果と証跡)
- Consumed artifacts: docs/features/feat-tenant-data-retention/test-run-results.md
- Write scope/touches: docs/features/feat-tenant-data-retention/acceptance-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-tenant-data-retention-p07) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-tenant-data-retention-p07 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-tenant-data-retention-p07) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-TENANT-DATA-RETENTION-P06] であり P06 完了後に着手する。resource_scope (docs/features/feat-tenant-data-retention/acceptance-record.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 実装コードの作成・修正 (owner=P05。本 task は受入判定のみ)
- テストの再実行そのもの (owner=P06)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-tenant-data-retention`
- Required evidence: acceptance-record.md に goal-spec acceptance 3 件全ての確認結果 (pass) と証跡 (テナント分離テストログ・削除完全性テストログ・暗号化検証テストログ) が記載されていること

## Rollout and rollback

- Rollout: acceptance-record.md を作成し、acceptance 3 件全ての pass を確認してから P08 (リファクタリング/マイグレーション) へ引き継ぐ
- Rollback trigger and steps: acceptance 3 件のいずれかが不充足の場合、acceptance-record.md に理由を記録しP05(実装)またはP02(設計)へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: features/feat-tenant-data-retention.context.json acceptance
- Detailed authoritative source: docs/security-spec.md (§1.3 T14/T15)
- Architecture: N/A: 本 task は受入判定のみで architecture 参照を新たに追加しない
- Feature: feat-tenant-data-retention
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-TENANT-DATA-RETENTION-P06
