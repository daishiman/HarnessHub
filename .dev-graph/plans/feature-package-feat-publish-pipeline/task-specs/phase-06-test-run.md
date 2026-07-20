# System task overlay: テスト実行 — 状態機械 property test・検査 pipeline 挙動同値テスト・直列化/監査テストの実行と結果記録

## Machine-readable registration fields

- feature_package_id: feature-package/feat-publish-pipeline (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-publish-pipeline", "macro-feature", "quality", "test-run"]
- related_nodes: ["feat-publish-pipeline", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-security"]
- parent_feature: feat-publish-pipeline
- phase_ref: P06
- classification: confidence=0.86, reason="P05 の実装に対して P04 のテストスタブを実行し quality_constraints 8 件の充足状況を機械的に確認する P06 テスト実行タスク", candidates=[{artifact_kind: task, confidence: 0.86, candidate_path: tasks/feat-publish-pipeline/sys-publish-pipeline-p06.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P05 で実装した状態機械・検査 pipeline・REST endpoint・promote/rollback・監査 event 記録に対して、P04 で設計した 7 系統のテストケース (状態機械 property test、検査 pipeline 挙動同値テスト、TargetChannel 直列化並行性テスト、R2 冪等性テスト、監査 hash chain 一貫性テスト、REST 契約テスト、rollback 2 版目以降限定検査テスト) を実行し、結果を test-run-results.md として記録する。

## 背景

本 task は quality_constraints 8 件それぞれについて pass/fail を機械的に確認する。特に状態機械 property test は publish-request-state-machine-section7-2-property-test-qa009 の直接的な検証手段であり、docs/backend-spec.md §5.1 の遷移図に許可されていない全ての遷移候補が拒否されることを確認する。検査 pipeline 挙動同値テストは inspection-pipeline-shared-pure-function-package-qa010-qa020 の検証手段であり、Python 資産と TypeScript 移植版の出力差分が 0 件であることを確認する。TargetChannel 直列化並行性テストは targetchannel-serialization-single-inflight-publishrequest の検証手段であり、同一 TargetChannel への 2 件目の PublishRequest 作成リクエストが 409 を返すことを確認する。監査 hash chain 一貫性テストは append-only-audit-event-all-publish-operations の検証手段であり、全操作後に `seq`/`prev_hash`/`event_hash` の連鎖が破綻していないことを確認する。いずれかのテストが fail した場合は P05 (実装) へ差し戻す。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-publish-pipeline, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security
- Entry gate: .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41 に一致し、confirmation_status=confirmed であること。P05 の実装成果物 (apps/hub/src/lib/publish/, packages/inspection/) が存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 feature は UI を持たない
- Backend: applicable + change: apps/hub/src/__tests__/publish-pipeline/ のテストを実行する
- API: applicable + change: REST endpoint 契約テストを実行する
- Data: N/A: feat-domain-model-db 側のリポジトリ層関数はモックまたは既存確定インターフェースを用いる
- Infrastructure: N/A: 本 task はテスト実行のみで新規インフラを要しない
- Security: applicable + change: 検査 pipeline 挙動同値テスト・単一認可ミドルウェア適用テストを実行する
- Quality: applicable + change: quality_constraints 8 件全ての pass/fail を確認する
- Documentation: applicable + change: docs/features/feat-publish-pipeline/test-run-results.md を新規作成する
- Operations: N/A: 運用テスト (スモークテスト) は P13 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task はテスト実行のみで実コードへの変更を伴わない (fail 時の修正は P05 へ差し戻す)

## 成果物

- Produced artifacts: docs/features/feat-publish-pipeline/test-run-results.md (quality_constraints 8 件それぞれの pass/fail 結果と証跡を含む)
- Consumed artifacts: apps/hub/src/lib/publish/, apps/hub/src/__tests__/publish-pipeline/, packages/inspection/src/__tests__/, docs/features/feat-publish-pipeline/test-design.md
- Write scope/touches: docs/features/feat-publish-pipeline/test-run-results.md, apps/hub/src/__tests__/publish-pipeline/ (テスト結果の記録に限る)

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-publish-pipeline-p06) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-publish-pipeline-p06 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-publish-pipeline-p06) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-PUBLISH-PIPELINE-P05]。resource_scope (docs/features/feat-publish-pipeline/test-run-results.md) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- feat-domain-model-db/feat-auth-tenancy 側のテスト実行 (それぞれの owner feature が担う)
- 実装コードの修正 (fail 時は P05 へ差し戻すのみで本 task では修正しない)
- Publisher クライアント側のテスト (owner=feat-publisher-plugin)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-publish-pipeline/test-run-results.md に quality_constraints 8 件全ての pass 結果が記録されている (fail が残る場合は差し戻し理由が明記されている)

## Rollout and rollback

- Rollout: test-run-results.md に全 quality_constraints の pass を確認してから P07 (受入) へ引き継ぐ
- Rollback trigger and steps: いずれかのテストが fail した場合、test-run-results.md に原因を記録し P05 (実装) へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (I2, I3, D4, G1, G4), system-spec/spec-state.json qa_log (qa-002, qa-004, qa-006, qa-009, qa-010, qa-011, qa-020, qa-033, qa-037)
- Detailed authoritative source: docs/backend-spec.md §5.1, §6.1
- Architecture: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security
- Feature: feat-publish-pipeline
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-PUBLISH-PIPELINE-P05
