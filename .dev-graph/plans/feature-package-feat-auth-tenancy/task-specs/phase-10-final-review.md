# System task overlay: 最終独立レビュー — quality_constraints 7 件の充足判定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-auth-tenancy (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-auth-tenancy", "macro-feature", "security", "final-review"]
- related_nodes: ["feat-auth-tenancy", "arch-harness-hub-security", "arch-harness-hub-backend"]
- parent_feature: feat-auth-tenancy
- phase_ref: P10
- classification: confidence=0.86, reason="quality_constraints 7 件の充足判定を実装・テスト・品質保証結果に基づき独立に確認する P10 タスク", candidates=[{artifact_kind: task, confidence: 0.86, candidate_path: tasks/feat-auth-tenancy/sys-auth-tenancy-p10.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 (アーキテクチャ)・P06 (テスト実行)・P07 (受入)・P09 (品質保証) の結果を突き合わせ、goal-spec の quality_constraints 7 件全てが充足されていることを P02 実行者から独立した視点で最終確認し、final-review-record.md として記録する。

## 背景

quality_constraints 7 件 (tenant-oidc-dynamic-resolution-authjs-d3-qa005, role4-authorization-matrix-single-middleware-deny-by-default-sec2, device-flow-os-credential-token-revocation-qa008, auth-adapter-boundary-better-auth-migration-hedge-d3-qa020, tenant-workspace-row-level-scope-isolation-test-ci-d4, no-hub-native-account-idp-delegation-i7, session-jwt-staleness-emergency-revocation-qa036) それぞれについて、対応する成果物 (P02 の architecture-decision-record.md、P06 の test-run-results.md、P09 の quality-assurance-report.md) を根拠として充足判定を行う。特に auth-adapter-boundary-better-auth-migration-hedge-d3-qa020 は P08 の refactoring-migration-note.md と P09 の adapter 境界隔離検査結果を根拠に判定する。全 7 件の充足が確認できない場合は該当する task へ差し戻す。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-auth-tenancy, arch-harness-hub-security, arch-harness-hub-backend
- Entry gate: .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5 に一致し、confirmation_status=confirmed であること。P09 の docs/features/feat-auth-tenancy/quality-assurance-report.md が全ゲート pass を記録していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 task はレビューのみで実装物を変更しない
- Backend: N/A: 本 task はレビューのみで実装物を変更しない
- API: N/A: 本 task はレビューのみで実装物を変更しない
- Data: N/A: スキーマ関連の quality_constraints 充足判定は feat-domain-model-db の責務
- Infrastructure: N/A: 新規インフラ変更なし
- Security: applicable + change: quality_constraints 7 件全体 (いずれも Security workstream 主体) の充足判定を行う
- Quality: applicable + change: quality_constraints 7 件全体の最終充足判定を行う
- Documentation: applicable + change: docs/features/feat-auth-tenancy/final-review-record.md を新規作成する
- Operations: N/A: 運用手順の確定は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task はレビューのみ

## 成果物

- Produced artifacts: docs/features/feat-auth-tenancy/final-review-record.md (quality_constraints 7 件それぞれの充足判定と根拠成果物への参照)
- Consumed artifacts: docs/features/feat-auth-tenancy/architecture-decision-record.md, docs/features/feat-auth-tenancy/design-review-notes.md, docs/features/feat-auth-tenancy/test-run-results.md, docs/features/feat-auth-tenancy/acceptance-record.md, docs/features/feat-auth-tenancy/quality-assurance-report.md
- Write scope/touches: docs/features/feat-auth-tenancy/final-review-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-auth-tenancy-p10) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-auth-tenancy-p10 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-auth-tenancy-p10) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-AUTH-TENANCY-P09]。resource_scope (docs/features/feat-auth-tenancy/final-review-record.md) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- 未充足項目の実装修正 (該当 task へ差し戻し、本 task は判定のみ)
- feat-domain-model-db 側の quality_constraints 判定 (同 feature 自身の P10 が担当)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-auth-tenancy/final-review-record.md に quality_constraints 7 件全てが「充足」と判定され、根拠成果物への参照が記載されていること

## Rollout and rollback

- Rollout: final-review-record.md で全 7 件充足を確認してから P11 (エビデンス収集) へ引き継ぐ
- Rollback trigger and steps: いずれかの項目が未充足の場合、該当する task (P02/P05/P06/P09 等) へ差し戻し是正したうえで本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (D3, D4, I7, I8, G4), system-spec/spec-state.json qa_log (qa-005, qa-006, qa-008, qa-020, qa-036)
- Detailed authoritative source: .dev-graph/staging/goal-spec.json (quality_constraints ブロック)
- Architecture: arch-harness-hub-security, arch-harness-hub-backend
- Feature: feat-auth-tenancy
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-AUTH-TENANCY-P09
