# System task overlay: エビデンス収集 — テスト結果・受入記録・最終レビュー記録の証跡集約

## Machine-readable registration fields

- feature_package_id: feature-package/feat-domain-model-db (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-domain-model-db", "macro-feature", "data", "evidence"]
- related_nodes: ["feat-domain-model-db", "arch-harness-hub-data", "arch-harness-hub-backend"]
- parent_feature: feat-domain-model-db
- phase_ref: P11
- classification: confidence=0.85, reason="P06/P07/P09/P10 の証跡を単一のエビデンスサマリへ集約する P11 タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-domain-model-db/sys-domain-model-db-p11.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P06 (test-run-results.md)、P07 (acceptance-record.md)、P09 (quality-assurance-report.md)、P10 (final-review-record.md) に分散する証跡を単一の evidence-summary.md へ集約し、P12 (runbook 作成) と P13 (リリース) が参照できる状態にする。

## 背景

feature-execution-package-contract.md はリリース判定の追跡可能性のため、各 task の証跡が単一の参照点から辿れることを求める。本 task は新たな検証を行わず、既存の 4 成果物からリリース判定に必要な最小限の事実 (テストケース総数と pass 件数、acceptance 3 項目の判定、CI 品質ゲートの pass 状況、quality_constraints 9 件の充足判定) を抽出し、evidence-summary.md として一覧化する。あわせて、User 基底テーブル owner の architecture decision と qa-045 (tenant_data_objects) の follow-up 記録という 2 件の設計判断についても、根拠文書へのポインタを evidence-summary.md に含め、リリース後の追跡可能性を担保する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-domain-model-db, arch-harness-hub-data, arch-harness-hub-backend
- Entry gate: .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:ed9bbe22a2887731c84470adb8e4f8df41fd7eec46efc58b4dc8e5095b5b5fd5 に一致し、confirmation_status=confirmed であること。P10 の docs/features/feat-domain-model-db/final-review-record.md が全項目充足を記録していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 feature は UI を持たない
- Backend: N/A: 本 task は証跡集約のみで実装物を変更しない
- API: N/A: 本 feature は HTTP API endpoint を持たない
- Data: N/A: 本 task はデータモデルへの変更を伴わない
- Infrastructure: N/A: 新規インフラ変更なし
- Security: N/A: 本 task はセキュリティ実装の追加変更を伴わない (既存証跡の集約のみ)
- Quality: applicable + change: 全証跡を単一サマリへ集約し追跡可能性を担保する
- Documentation: applicable + change: docs/features/feat-domain-model-db/evidence-summary.md を新規作成する
- Operations: N/A: 運用手順の確定は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task は証跡集約のみ

## 成果物

- Produced artifacts: docs/features/feat-domain-model-db/evidence-summary.md (テスト結果・受入記録・品質保証結果・最終レビュー結果・2 件の設計判断への参照を集約したサマリ)
- Consumed artifacts: docs/features/feat-domain-model-db/test-run-results.md, docs/features/feat-domain-model-db/acceptance-record.md, docs/features/feat-domain-model-db/quality-assurance-report.md, docs/features/feat-domain-model-db/final-review-record.md
- Write scope/touches: docs/features/feat-domain-model-db/evidence-summary.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-domain-model-db-p11) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-domain-model-db-p11 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-domain-model-db-p11) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DOMAIN-MODEL-DB-P10]。resource_scope (docs/features/feat-domain-model-db/evidence-summary.md) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- 新規検証の実施 (本 task は既存証跡の集約のみで新たなテスト・レビューは行わない)
- Studio 拡張 feature のエビデンス集約 (各 feature 自身の P11 が担当)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-domain-model-db/evidence-summary.md に P06/P07/P09/P10 の 4 成果物全てへの参照と、User 基底テーブル owner 決定・qa-045 follow-up 記録への参照が含まれていること

## Rollout and rollback

- Rollout: evidence-summary.md を作成し、参照先 4 成果物が全て存在することを確認してから P12 (ドキュメント/運用) へ引き継ぐ
- Rollback trigger and steps: 参照先成果物のいずれかが欠落・不整合の場合、該当 task へ差し戻し是正したうえで本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (D2, D4, I3, G1, G4), system-spec/spec-state.json qa_log (qa-004, qa-017, qa-019, qa-020, qa-024, qa-032)
- Detailed authoritative source: docs/features/feat-domain-model-db/final-review-record.md
- Architecture: arch-harness-hub-data, arch-harness-hub-backend
- Feature: feat-domain-model-db
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-DOMAIN-MODEL-DB-P10
