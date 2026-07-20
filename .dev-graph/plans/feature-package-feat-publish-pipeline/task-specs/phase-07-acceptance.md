# System task overlay: 受入 — goal-spec acceptance 3 項目の確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-publish-pipeline (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-publish-pipeline", "macro-feature", "quality", "acceptance"]
- related_nodes: ["feat-publish-pipeline", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-security"]
- parent_feature: feat-publish-pipeline
- phase_ref: P07
- classification: confidence=0.87, reason="P06 で green 化したテスト結果を基に goal-spec acceptance 3 件の充足を確認する P07 受入タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-publish-pipeline/sys-publish-pipeline-p07.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P06 の test-run-results.md で全 quality_constraints が pass した状態を前提に、features/feat-publish-pipeline.md/context.json および goal-spec の acceptance 3 件 (状態遷移が §7.2 準拠で property test を通る、検査 FAIL 時に Needs Fix へ差し戻り旧 stable が維持される、全操作が append-only 監査 event に記録される) を最終確認し、feature acceptance の判定材料として acceptance-record.md を作成する。

## 背景

exact-13 契約の完了条件は「feature acceptance が P07/P10/P11 の evidence から満たされること」であり、P07 は実装者の視点で acceptance 3 件を一次確認する task である (独立した最終確認は P10 で行う)。3 件の acceptance はいずれも P06 のテスト結果から直接導出可能であり、(1) は状態機械 property test の全 pass、(2) は Yellow/Red 判定テストと Failed 遷移時の stable pointer 非更新テストの pass、(3) は監査 hash chain 一貫性テストの pass を根拠とする。本 task はこれら 3 件それぞれについて、対応するテストケース ID・実行結果・該当する quality_constraint との対応関係を明示的に記録する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-publish-pipeline, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security
- Entry gate: .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41 に一致し、confirmation_status=confirmed であること。P06 の docs/features/feat-publish-pipeline/test-run-results.md が全項目 pass を記録していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 feature は UI を持たない
- Backend: N/A: 本 task は受入判定文書化のみで実装物を変更しない
- API: N/A: 受入判定は P06 のテスト結果を参照するのみ
- Data: N/A: 受入判定はスキーマ変更を伴わない
- Infrastructure: N/A: 新規インフラのプロビジョニングは行わない
- Security: applicable + change: acceptance 3 件のうち検査 FAIL 時の Needs Fix 差戻り・旧 stable 維持・監査 event 記録の充足を確認する
- Quality: applicable + change: goal-spec acceptance 3 件の充足を確認する
- Documentation: applicable + change: docs/features/feat-publish-pipeline/acceptance-record.md を新規作成する
- Operations: N/A: 運用受入 (本番スモークテスト) は P13 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task は受入判定文書化のみ

## 成果物

- Produced artifacts: docs/features/feat-publish-pipeline/acceptance-record.md (goal-spec acceptance 3 件全ての確認結果と対応するテストケース・quality_constraint への参照を含む)
- Consumed artifacts: docs/features/feat-publish-pipeline/test-run-results.md, features/feat-publish-pipeline.context.json, .dev-graph/staging/goal-spec.json
- Write scope/touches: docs/features/feat-publish-pipeline/acceptance-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-publish-pipeline-p07) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-publish-pipeline-p07 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-publish-pipeline-p07) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-PUBLISH-PIPELINE-P06]。resource_scope (docs/features/feat-publish-pipeline/acceptance-record.md) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- 実装コードの修正 (acceptance 不充足の場合は該当 phase へ差し戻すのみ)
- 本番環境での受入確認 (owner=P13。本 task はステージング/テスト環境の結果に基づく)
- feat-domain-model-db/feat-auth-tenancy 側の acceptance 判定 (それぞれの owner feature が担う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-publish-pipeline/acceptance-record.md に goal-spec acceptance 3 件全ての確認結果 (pass) と証跡が記載されている

## Rollout and rollback

- Rollout: acceptance-record.md で 3 件全ての pass を確認してから P08 (リファクタリング/マイグレーション) へ引き継ぐ
- Rollback trigger and steps: acceptance 3 件のいずれかが不充足の場合、acceptance-record.md に理由を記録し P05 (実装) または P02 (設計) へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (I2, I3, D4, G1, G4), system-spec/spec-state.json qa_log (qa-002, qa-004, qa-006, qa-009, qa-010, qa-011, qa-020, qa-033, qa-037)
- Detailed authoritative source: docs/backend-spec.md §5.1, §6.1
- Architecture: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security
- Feature: feat-publish-pipeline
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-PUBLISH-PIPELINE-P06
