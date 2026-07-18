# System task overlay: 受入 — goal-spec acceptance 3 項目の確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-domain-model-db (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-domain-model-db", "macro-feature", "data", "acceptance"]
- related_nodes: ["feat-domain-model-db", "arch-harness-hub-data", "arch-harness-hub-backend"]
- parent_feature: feat-domain-model-db
- phase_ref: P07
- classification: confidence=0.86, reason="goal-spec の acceptance 3 項目を P06 のテスト結果に基づき最終確認する P07 タスク", candidates=[{artifact_kind: task, confidence: 0.86, candidate_path: tasks/feat-domain-model-db/sys-domain-model-db-p07.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

goal-spec の acceptance 3 項目 (D1 接続テスト成功、release immutable 強制、backup export + restore 手順検証済み) を P06 のテスト結果に基づき確認し、acceptance-record.md として記録する。

## 背景

acceptance は quality_constraints よりも上位の受入判定基準であり、goal-spec.json の verification ブロックに明記された 3 項目 (sqlite-dialect-compat-d1-fallback-connection-layer-d2 系の D1 接続テスト、release-immutable-atomic-stable-pointer-i3 系の immutable 強制、daily-export-quarterly-restore-drill-qa019 系の backup/restore 検証) を最終確認する。P06 の test-run-results.md に記録された実行結果を再確認し、3 項目すべてが pass していることを acceptance-record.md に明記する。いずれか未達成であれば P05/P06 へ差し戻す。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-domain-model-db, arch-harness-hub-data, arch-harness-hub-backend
- Entry gate: .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:ed9bbe22a2887731c84470adb8e4f8df41fd7eec46efc58b4dc8e5095b5b5fd5 に一致し、confirmation_status=confirmed であること。P06 の docs/features/feat-domain-model-db/test-run-results.md が全件 pass を記録していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 feature は UI を持たない
- Backend: applicable + change: acceptance 3 項目のうち D1 接続テスト・release immutable 強制を確認する
- API: N/A: 本 feature は HTTP API endpoint を持たない
- Data: applicable + change: acceptance 3 項目全体の受入判定を行う
- Infrastructure: N/A: 新規インフラ変更なし
- Security: applicable + change: backup export における salary マスク維持を確認する
- Quality: applicable + change: acceptance 3 項目の最終受入判定を記録する
- Documentation: applicable + change: docs/features/feat-domain-model-db/acceptance-record.md を新規作成する
- Operations: N/A: 運用手順自体の確定は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task は受入判定のみ

## 成果物

- Produced artifacts: docs/features/feat-domain-model-db/acceptance-record.md (acceptance 3 項目それぞれの判定結果と根拠テスト結果への参照)
- Consumed artifacts: docs/features/feat-domain-model-db/test-run-results.md, .dev-graph/staging/goal-spec.json
- Write scope/touches: docs/features/feat-domain-model-db/acceptance-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-domain-model-db-p07) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-domain-model-db-p07 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-domain-model-db-p07) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DOMAIN-MODEL-DB-P06]。resource_scope (docs/features/feat-domain-model-db/acceptance-record.md) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- acceptance 未達成時の実装修正 (P05/P06 へ差し戻し、本 task は判定のみ)
- quality_constraints 9 件全体の充足判定 (P10 で扱う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-domain-model-db/acceptance-record.md に acceptance 3 項目全てが pass と判定されていること

## Rollout and rollback

- Rollout: acceptance-record.md で 3 項目全て pass を確認してから P08 (リファクタリング/マイグレーション) へ引き継ぐ
- Rollback trigger and steps: いずれかの acceptance 項目が未達成の場合、P05/P06 へ差し戻し実装・テストを修正したうえで本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (D2, D4, I3, G1, G4), system-spec/spec-state.json qa_log (qa-004, qa-017, qa-019, qa-020, qa-024, qa-032)
- Detailed authoritative source: .dev-graph/staging/goal-spec.json (verification ブロック)
- Architecture: arch-harness-hub-data, arch-harness-hub-backend
- Feature: feat-domain-model-db
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-DOMAIN-MODEL-DB-P06
