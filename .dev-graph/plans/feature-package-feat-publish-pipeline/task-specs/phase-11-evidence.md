# System task overlay: 再現可能な証跡 — P06/P07/P09/P10 の証跡集約と再現手順の確立

## Machine-readable registration fields

- feature_package_id: feature-package/feat-publish-pipeline (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-publish-pipeline", "macro-feature", "quality", "evidence"]
- related_nodes: ["feat-publish-pipeline", "arch-harness-hub-backend", "arch-harness-hub-security"]
- parent_feature: feat-publish-pipeline
- phase_ref: P11
- classification: confidence=0.84, reason="P06/P07/P09/P10 で得られた証跡を集約し、第三者が再現可能な形で保存する P11 証跡タスク", candidates=[{artifact_kind: task, confidence: 0.84, candidate_path: tasks/feat-publish-pipeline/sys-publish-pipeline-p11.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P10 完了後、P06 (テスト実行結果)・P07 (受入記録)・P09 (品質保証報告)・P10 (最終レビュー記録) に散在する証跡を evidence-summary.md として集約し、第三者が同一のコマンド列を実行することで同一の結果を再現できる手順を確立する。

## 背景

exact-13 契約の完了条件は P11 の再現可能な証跡の存在を要求する。本 task は新規の検証行為を行わず、既存の P06/P07/P09/P10 の各文書から (1) 実行したコマンド、(2) 得られた結果、(3) 対応する quality_constraint/acceptance ID の 3 点を抽出し一覧化する。これにより、将来の監査や引き継ぎの際に、個別の phase 文書を辿らなくても evidence-summary.md 単体で feature 全体の受入根拠を把握できる。R2 content-addressed storage の冪等性、TargetChannel 直列化の 409 応答、監査 hash chain の整合性、状態機械 property test の全遷移網羅性の 4 点は quality_constraints の中でも自動テストで機械的に再現可能なものであり、evidence-summary.md にはこれらを再実行するための正確なコマンド列を明記する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-publish-pipeline, arch-harness-hub-backend, arch-harness-hub-security
- Entry gate: .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41 に一致し、confirmation_status=confirmed であること。P10 の docs/features/feat-publish-pipeline/final-review-record.md が完了していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 feature は UI を持たない
- Backend: N/A: 本 task は証跡集約文書化のみで実装物を変更しない
- API: N/A: 本 task は証跡集約文書化のみ
- Data: N/A: 本 task は証跡集約文書化のみ
- Infrastructure: N/A: 新規インフラのプロビジョニングは行わない
- Security: applicable + change: 監査 hash chain 整合性の再現手順を明記する
- Quality: applicable + change: quality_constraints 8 件それぞれの再現手順を集約する
- Documentation: applicable + change: docs/features/feat-publish-pipeline/evidence-summary.md を新規作成する
- Operations: N/A: 運用証跡 (デプロイ実績) は P13 で扱う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-security
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task は証跡集約文書化のみ

## 成果物

- Produced artifacts: docs/features/feat-publish-pipeline/evidence-summary.md (P06/P07/P09/P10 の証跡集約、quality_constraints 8 件それぞれの再現コマンド列を含む)
- Consumed artifacts: docs/features/feat-publish-pipeline/test-run-results.md, acceptance-record.md, quality-assurance-report.md, final-review-record.md (全て docs/features/feat-publish-pipeline/ 配下)
- Write scope/touches: docs/features/feat-publish-pipeline/evidence-summary.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-publish-pipeline-p11) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-publish-pipeline-p11 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-publish-pipeline-p11) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-PUBLISH-PIPELINE-P10]。resource_scope (docs/features/feat-publish-pipeline/evidence-summary.md) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- 新規の検証行為の実施 (本 task は既存証跡の集約のみで新規テストは実行しない)
- feat-domain-model-db/feat-auth-tenancy 側の証跡集約 (それぞれの owner feature が担う)
- 本番環境での証跡取得 (owner=P13)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-publish-pipeline/evidence-summary.md に quality_constraints 8 件それぞれの再現コマンド列と対応する結果が記載されていること

## Rollout and rollback

- Rollout: evidence-summary.md の集約を完了してから P12 (文書化・運用) へ引き継ぐ
- Rollback trigger and steps: 集約対象の証跡に欠落・矛盾が見つかった場合、該当する P06/P07/P09/P10 へ差し戻し再取得を依頼する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (I2, I3), system-spec/spec-state.json qa_log (qa-009, qa-010, qa-037)
- Detailed authoritative source: docs/backend-spec.md §5.1, §6.1
- Architecture: arch-harness-hub-backend, arch-harness-hub-security
- Feature: feat-publish-pipeline
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-PUBLISH-PIPELINE-P10
