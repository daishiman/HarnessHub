# System task overlay: 受入 — goal-spec acceptance 3 項目の確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-auth-tenancy (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-auth-tenancy", "macro-feature", "security", "acceptance"]
- related_nodes: ["feat-auth-tenancy", "arch-harness-hub-security", "arch-harness-hub-backend"]
- parent_feature: feat-auth-tenancy
- phase_ref: P07
- classification: confidence=0.86, reason="goal-spec の acceptance 3 項目を P06 のテスト結果に基づき最終確認する P07 タスク", candidates=[{artifact_kind: task, confidence: 0.86, candidate_path: tasks/feat-auth-tenancy/sys-auth-tenancy-p07.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

goal-spec/feat-auth-tenancy.context.json の acceptance 3 項目 (テナント越境アクセスが分離テストで 0 件、Device Flow の E2E [承認→token→失効] が成功する、Auth.js 依存が adapter 境界に隔離されている) を P06 のテスト結果に基づき確認し、acceptance-record.md として記録する。

## 背景

acceptance は quality_constraints よりも上位の受入判定基準であり、features/feat-auth-tenancy.context.json の acceptance ブロックに明記された 3 項目を最終確認する。P06 の test-run-results.md に記録された実行結果を再確認し、(1) 2 tenant 同時稼働状態でのテナント分離テストが 0 件の越境を記録していること、(2) Device Flow E2E テスト (device code 発行→approve→token 交換→失効) が成功していること、(3) `apps/hub/src/lib/auth/adapter/` 以外から Auth.js 固有 API が import されていないことを確認する CI grep 検査が pass していること、の 3 項目すべてが pass していることを acceptance-record.md に明記する。いずれか未達成であれば P05/P06 へ差し戻す。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-auth-tenancy, arch-harness-hub-security, arch-harness-hub-backend
- Entry gate: .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5 に一致し、confirmation_status=confirmed であること。P06 の docs/features/feat-auth-tenancy/test-run-results.md が全件 pass を記録していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 task はログイン UI 自体の受入判定を含まない
- Backend: applicable + change: acceptance 3 項目のうち Auth.js adapter 境界隔離を確認する
- API: applicable + change: Device Flow E2E の受入判定を行う
- Data: N/A: スキーマの受入判定は feat-domain-model-db の責務
- Infrastructure: N/A: 新規インフラ変更なし
- Security: applicable + change: テナント分離 0 件の受入判定を行う
- Quality: applicable + change: acceptance 3 項目の最終受入判定を記録する
- Documentation: applicable + change: docs/features/feat-auth-tenancy/acceptance-record.md を新規作成する
- Operations: N/A: 運用手順自体の確定は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task は受入判定のみ

## 成果物

- Produced artifacts: docs/features/feat-auth-tenancy/acceptance-record.md (acceptance 3 項目それぞれの判定結果と根拠テスト結果への参照)
- Consumed artifacts: docs/features/feat-auth-tenancy/test-run-results.md, features/feat-auth-tenancy.context.json
- Write scope/touches: docs/features/feat-auth-tenancy/acceptance-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-auth-tenancy-p07) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-auth-tenancy-p07 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-auth-tenancy-p07) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-AUTH-TENANCY-P06]。resource_scope (docs/features/feat-auth-tenancy/acceptance-record.md) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- acceptance 未達成時の実装修正 (P05/P06 へ差し戻し、本 task は判定のみ)
- quality_constraints 7 件全体の充足判定 (P10 で扱う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-auth-tenancy/acceptance-record.md に acceptance 3 項目全てが pass と判定されていること

## Rollout and rollback

- Rollout: acceptance-record.md で 3 項目全て pass を確認してから P08 (リファクタリング/マイグレーション) へ引き継ぐ
- Rollback trigger and steps: いずれかの acceptance 項目が未達成の場合、P05/P06 へ差し戻し実装・テストを修正したうえで本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (D3, D4, I7, I8, G4), system-spec/spec-state.json qa_log (qa-005, qa-006, qa-008, qa-020, qa-036)
- Detailed authoritative source: features/feat-auth-tenancy.context.json (acceptance ブロック)
- Architecture: arch-harness-hub-security, arch-harness-hub-backend
- Feature: feat-auth-tenancy
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-AUTH-TENANCY-P06
