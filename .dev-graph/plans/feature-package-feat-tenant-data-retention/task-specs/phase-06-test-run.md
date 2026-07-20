# System task overlay: テスト実行 — テナント分離・削除完全性・暗号化検証・R2使用量監視アラートテストの実行

## Machine-readable registration fields

- feature_package_id: feature-package/feat-tenant-data-retention (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-tenant-data-retention", "macro-feature", "quality", "test-run"]
- related_nodes: ["feat-tenant-data-retention", "arch-harness-hub-security"]
- parent_feature: feat-tenant-data-retention
- phase_ref: P06
- classification: confidence=0.84, reason="P04で設計したテナント分離テスト・削除完全性テスト(R2実体/DB行/backup断面)・暗号化検証テスト・R2使用量監視アラートテストを実行し結果を記録するP06テスト実行タスク", candidates=[{artifact_kind: task, confidence: 0.84, candidate_path: tasks/feat-tenant-data-retention/sys-tenant-data-retention-p06.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P05 で実装した tenant_data_objects API・R2 封筒暗号化保管/取得/即時完全削除・R2 使用量監視 cron 拡張に対して、P04 で設計したテナント分離テスト・削除完全性テスト・暗号化検証テスト・R2 使用量監視アラートテストを実行し、結果を記録する。この task 完了時点で、quality_constraints 6 件全ての pass/fail 状況が確定し、P07 の受入判定が着手可能になる。

## 背景

Feature Execution Package の固定責務マッピングでは、P06 は「テスト実行」を担い、P04 が設計したテストケースを P05 の実装に対して実行し客観的な pass/fail 記録を残すゲートである。本 feature はテナント越境読取 (T14) と削除不完全 (T15) という重大な脅威モデル項目を対象とするため、テナント分離テストと削除完全性テストの実行結果は特に厳密に記録する。暗号化検証テストでは IV の再利用がないこと、AAD 不一致時に復号が失敗することを実測する。R2 使用量監視アラートテストは既存 Turso 使用量監視 cron への統合後の閾値 70%/90% 到達時の通知動作を実測する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-tenant-data-retention, arch-harness-hub-security
- Entry gate: P05 (packages/db/src/schema/tenant-data-objects.ts, apps/hub/src/app/api/v1/tenant-data/, apps/hub/src/lib/tenant-data/, apps/hub/src/lib/scheduled/r2-usage-monitor.ts) が実装済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature は host UI を持たず frontend テスト実行対象がない
- Backend: applicable + change: tenant_data 保管 API (upload/取得/削除) の単体・統合テストを実行する
- API: applicable + contract: API 契約 (パス・スキーマ・rate limit) の境界値・異常系テストを実行する
- Data: applicable + migration: tenant_data_objects テーブルへの D4 row-level scope 適用テストを実行する
- Infrastructure: N/A: infrastructure 変更自体は本 task の対象外であり、cron 統合の動作確認は Operations 区分で扱う
- Security: applicable + control: テナント分離テスト (T14 対策検証)・削除完全性テスト (T15 対策検証)・暗号化検証テスト (IV 再利用なし・AAD 不一致復号失敗) を実行する
- Quality: applicable + tests/gates: acceptance 3 件と quality_constraints 6 件全てに対応するテストの実行結果を記録する
- Documentation: applicable + change: docs/features/feat-tenant-data-retention/test-run-results.md を新規作成する
- Operations: applicable + runbook/monitoring: R2 使用量監視アラート (閾値 70%/90%) の通知動作テストを実行する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security (P02 architecture-decision-record.md の削除完全性テストID・暗号化契約を検証)
- Deploy unit/environment: cloudflare-workers/hub (本 task はテスト実行のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task はテスト実行のみで実データへの互換性移行を伴わない

## 成果物

- Produced artifacts: docs/features/feat-tenant-data-retention/test-run-results.md (quality_constraints 6件全てのテスト実行結果)
- Consumed artifacts: docs/features/feat-tenant-data-retention/test-design.md, packages/db/src/__tests__/tenant-data/
- Write scope/touches: docs/features/feat-tenant-data-retention/test-run-results.md, packages/db/src/__tests__/tenant-data/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-tenant-data-retention-p06) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-tenant-data-retention-p06 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-tenant-data-retention-p06) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-TENANT-DATA-RETENTION-P05] であり P05 完了後に着手する。resource_scope (docs/features/feat-tenant-data-retention/test-run-results.md, packages/db/src/__tests__/tenant-data/) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- テストケースの新規設計・変更 (owner=P04)
- 実装コードの修正そのもの (本 task はテスト実行のみ。fail 時の修正はP05へ差し戻す)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-tenant-data-retention`
- Required evidence: test-run-results.md に quality_constraints 6 件全ての pass 結果 (テナント分離・削除完全性・暗号化検証・R2使用量監視アラートの実測結果を含む) が記録されていること (fail が残る場合は差し戻し理由が明記されていること)

## Rollout and rollback

- Rollout: 全テスト pass を確認し test-run-results.md へ記録してから P07 (受入) へ引き継ぐ
- Rollback trigger and steps: いずれかのテスト (テナント越境読取検出・削除残存検出・平文検出を含む) が fail した場合、test-run-results.md に原因を記録しP05(実装)へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/spec-state.json qa_log (qa-045)
- Detailed authoritative source: docs/security-spec.md (§1.3 T14/T15, §8.3, §8.4)
- Architecture: arch-harness-hub-security (architecture/harness-hub-security.md)
- Feature: feat-tenant-data-retention
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-TENANT-DATA-RETENTION-P05
