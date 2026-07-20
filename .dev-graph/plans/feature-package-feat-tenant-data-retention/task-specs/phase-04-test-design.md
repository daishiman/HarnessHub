# System task overlay: テストファースト設計 — テナント分離・削除完全性・暗号化検証・R2使用量監視アラートのテスト設計

## Machine-readable registration fields

- feature_package_id: feature-package/feat-tenant-data-retention (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-tenant-data-retention", "macro-feature", "quality", "test-design"]
- related_nodes: ["feat-tenant-data-retention", "arch-harness-hub-security"]
- parent_feature: feat-tenant-data-retention
- phase_ref: P04
- classification: confidence=0.84, reason="acceptance 3件(テナント分離・削除完全性・暗号化検証)とquality_constraints 6件に対応するテナント分離テスト・削除完全性テスト(R2実体/DB行/backup断面)・暗号化検証テスト(IV再利用なし・AAD不一致復号失敗を含む)・R2使用量監視アラートテストのテストケースを設計するP04タスク", candidates=[{artifact_kind: task, confidence: 0.84, candidate_path: tasks/feat-tenant-data-retention/sys-tenant-data-retention-p04.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 で確定した削除完全性テスト ID・ケース定義をもとに、goal-spec acceptance 3 件 (テナント分離・削除完全性・暗号化検証) と quality_constraints 6 件全てに対応するテストケースを、実装 (P05) に先立って設計する。この task 完了時点で、P05 の実装対象とP06 のテスト実行対象が一意に定まる。

## 背景

goal-spec の acceptance は (1) テナント A の業務データがテナント B のいかなる authz role からも取得不可であること (テナント分離テスト)、(2) 削除 API 実行後、R2 blob・DB row・backup 断面のいずれにも当該データの平文/暗号文が残存しないこと (削除完全性テスト)、(3) 保管された業務データが R2 上で平文として存在せず、テナント別 DEK で封筒暗号化されていること (暗号化検証テスト) の 3 件で構成される。docs/security-spec.md の脅威モデルでは T14 (テナント越境読取) と T15 (削除不完全) が本 feature の直接対象であり、P02 で採番した削除完全性テスト ID をもとに R2 実体・DB 行・キャッシュの 3 点確認ケースを設計する。暗号化検証テストには IV がレコードごとに一意でありランダム 96bit で再利用されていないことの確認、AAD (table:column:row_id) が一致しない場合に復号が失敗することの確認を含める。R2 使用量監視アラートテストは、既存 Turso 使用量監視 cron への統合方式 (P02 で確定) に対する閾値 70%/90% 到達時の通知動作確認ケースを設計する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-tenant-data-retention, arch-harness-hub-security
- Entry gate: P03 (docs/features/feat-tenant-data-retention/design-review-notes.md) が作成済みであり、5 系統の architecture decision に重大な指摘がないことが確認されていること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature は host UI を持たず frontend テスト対象がない
- Backend: applicable + change: tenant_data 保管 API (upload/取得/削除) の単体・統合テストケースを設計する
- API: applicable + contract: API 契約 (パス・スキーマ・rate limit) に対する境界値・異常系テストケースを設計する
- Data: applicable + migration: tenant_data_objects テーブルへの D4 row-level scope 適用テストケースを設計する
- Infrastructure: N/A: R2/cron のテスト設計は Security/Quality 区分で扱い、本区分では infrastructure 変更を伴わない
- Security: applicable + control: テナント分離テスト (T14 対策検証)・削除完全性テスト (T15 対策検証)・暗号化検証テスト (IV 再利用なし・AAD 不一致復号失敗) のケースを設計する
- Quality: applicable + tests/gates: acceptance 3 件と quality_constraints 6 件全てに対応するテストケースの網羅表を作成し、CI 実行対象として test-design.md に固定する
- Documentation: applicable + change: docs/features/feat-tenant-data-retention/test-design.md を新規作成する
- Operations: applicable + runbook/monitoring: R2 使用量監視アラート (閾値 70%/90%) の通知動作確認テストケースを設計する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security (P02 architecture-decision-record.md の削除完全性テストID・暗号化契約を踏襲)
- Deploy unit/environment: cloudflare-workers/hub (本 task はテスト設計のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task はテスト設計のみで実コード・データへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-tenant-data-retention/test-design.md (acceptance 3件・quality_constraints 6件全てに対応するテストケース網羅表), packages/db/src/__tests__/tenant-data/ (テストスタブ)
- Consumed artifacts: docs/features/feat-tenant-data-retention/architecture-decision-record.md, docs/security-spec.md (§8.3, §8.4)
- Write scope/touches: docs/features/feat-tenant-data-retention/test-design.md, packages/db/src/__tests__/tenant-data/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-tenant-data-retention-p04) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-tenant-data-retention-p04 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-tenant-data-retention-p04) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-TENANT-DATA-RETENTION-P03] であり P03 完了後に着手する。resource_scope (docs/features/feat-tenant-data-retention/test-design.md, packages/db/src/__tests__/tenant-data/) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- テストの実行そのもの (owner=P06)
- 実装コードの作成 (本 task はテスト設計のみ。実装は P05 で行う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-tenant-data-retention`
- Required evidence: test-design.md に acceptance 3 件と quality_constraints 6 件全てに対応するテストケースが記載され、packages/db/src/__tests__/tenant-data/ にスタブが作成されていること

## Rollout and rollback

- Rollout: test-design.md を作成し、acceptance/quality_constraints との対応表を確認してから P05 (実装) へ引き継ぐ
- Rollback trigger and steps: acceptance/quality_constraints とテストケースの対応漏れが判明した場合、test-design.md の対応表を修正し不足カテゴリを追加する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/spec-state.json qa_log (qa-045)
- Detailed authoritative source: docs/security-spec.md (§1.3 T14/T15, §8.3, §8.4)
- Architecture: arch-harness-hub-security (architecture/harness-hub-security.md)
- Feature: feat-tenant-data-retention
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-TENANT-DATA-RETENTION-P03
