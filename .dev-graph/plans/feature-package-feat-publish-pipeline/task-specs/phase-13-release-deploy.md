# System task overlay: リリース/デプロイ — apps/hub publish endpoint 本番デプロイと full smoke test

## Machine-readable registration fields

- feature_package_id: feature-package/feat-publish-pipeline (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-publish-pipeline", "macro-feature", "operations", "release-deploy"]
- related_nodes: ["feat-publish-pipeline", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-security"]
- parent_feature: feat-publish-pipeline
- phase_ref: P13
- classification: confidence=0.85, reason="apps/hub は cloudflare-workers/hub 上の実デプロイ単位であり、P13 は publish endpoint の本番デプロイと full smoke test を実施する release-deploy タスクとして literal に適用される", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-publish-pipeline/sys-publish-pipeline-p13.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P12 完了後、apps/hub の publish endpoint 群を cloudflare-workers/hub の本番環境へデプロイし、full smoke test サイクル (PublishRequest 作成から検査・promote/rollback までの一連の操作) を実行して release-record.md に結果を記録する。

## 背景

apps/hub は本 feature の deploy unit であり実デプロイ対象であるため、P13 は N/A としてではなく文字どおりの release/deploy task として適用される。smoke test は (1) PublishRequest 作成から submit までの検査結果が Green の場合に自動公開されること、(2) Yellow/Red の場合に Needs Fix へ差し戻り旧 stable が維持されること、(3) promote/rollback (rollback は 2 版目以降のみ) が正しく動作すること、(4) 監査 hash chain の整合性が本番環境でも保たれていること、(5) TargetChannel 直列化制約による 409 応答が本番環境でも機能すること、(6) R2 content-addressed storage への書込が正しく機能すること、の 6 項目を対象とする。デプロイは feat-domain-model-db・feat-auth-tenancy が提供するスキーマ・認可ミドルウェアが本番環境に既に存在することを前提とし、それらへの変更は本 task の対象外である。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-publish-pipeline, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security
- Entry gate: .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41 に一致し、confirmation_status=confirmed であること。P12 の docs/features/feat-publish-pipeline/runbook.md が完了していること。feat-domain-model-db・feat-auth-tenancy の本番デプロイが完了していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 feature は UI を持たない
- Backend: applicable + change: apps/hub の publish endpoint 群を本番環境へデプロイする
- API: applicable + change: 本番環境で REST endpoint 12 経路が疎通することを確認する
- Data: N/A: 本 task はデプロイ・smoke test のみでスキーマ変更を伴わない
- Infrastructure: applicable + change: cloudflare-workers/hub への本番デプロイを実施する
- Security: applicable + change: 本番環境での監査 hash chain 整合性・TargetChannel 直列化を確認する
- Quality: applicable + change: full smoke test サイクル 6 項目の pass を確認する
- Documentation: applicable + change: docs/features/feat-publish-pipeline/release-record.md を新規作成する
- Operations: applicable + change: runbook.md に基づく運用開始準備を完了する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task はデプロイ・smoke test のみで packages/db/schema/ への変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-publish-pipeline/release-record.md (本番デプロイ結果と full smoke test 6 項目の pass 結果を含む)
- Consumed artifacts: docs/features/feat-publish-pipeline/runbook.md, evidence-summary.md, apps/hub/src/app/api/v1/publish/, packages/inspection/
- Write scope/touches: docs/features/feat-publish-pipeline/release-record.md (デプロイ操作自体は cloudflare-workers/hub の既存デプロイ手順に従う)

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-publish-pipeline-p13) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-publish-pipeline-p13 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-publish-pipeline-p13) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-PUBLISH-PIPELINE-P12]。resource_scope (docs/features/feat-publish-pipeline/release-record.md) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- feat-domain-model-db・feat-auth-tenancy 自体の本番デプロイ (それぞれの owner feature が担う。本 task はそれらが完了済みであることを前提条件とする)
- Publisher クライアント側のリリース (owner=feat-publisher-plugin)
- カタログ UI・承認キュー UI のリリース (owner=feat-dual-catalog-web / feat-workspace-governance)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-publish-pipeline/release-record.md に本番デプロイ完了記録と full smoke test 6 項目全ての pass 結果が記載されていること

## Rollout and rollback

- Rollout: release-record.md で full smoke test 6 項目全ての pass を確認し、feature 全体の完了 (exact-13 全 task 完了) を確定する
- Rollback trigger and steps: smoke test のいずれかが fail した場合、本番デプロイを直前の安定版へロールバックし、release-record.md に原因を記録した上で該当する P05/P09 へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (I1, I2, I3, G1, G4), system-spec/spec-state.json qa_log (qa-002, qa-004, qa-009, qa-011, qa-033, qa-037)
- Detailed authoritative source: docs/backend-spec.md §4.6, §5.1, §6.1, §7, §8
- Architecture: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security
- Feature: feat-publish-pipeline
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-PUBLISH-PIPELINE-P12
