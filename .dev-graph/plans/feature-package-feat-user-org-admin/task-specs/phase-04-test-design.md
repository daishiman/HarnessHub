# System task overlay: テスト設計 — salary非露出分離テスト・監査記録テスト・axe a11yテストの設計

## Machine-readable registration fields

- feature_package_id: feature-package/feat-user-org-admin (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-user-org-admin", "studio-extension", "security", "test-design"]
- related_nodes: ["feat-user-org-admin", "arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
- parent_feature: feat-user-org-admin
- phase_ref: P04
- classification: confidence=0.88, reason="承認済み設計を根拠に P05 実装前の salary 非露出・監査記録・axe a11y の test-first 受入契約を定義する P04 タスク", candidates=[{artifact_kind: task, confidence: 0.88, candidate_path: tasks/feat-user-org-admin/sys-user-org-admin-p04.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P03 で承認された設計を根拠に、P05 実装前の test-first 受入契約 (salary 非露出分離テスト・係数変更監査記録テスト・S17/S18 axe a11y ゼロ違反テスト) を定義する。

## 背景

goal-spec acceptance は『salary が admin 以外の API/画面/export に露出しない (分離テスト + 監査記録)』『係数変更が監査 event に記録される (SEC6)』『S17/S18 が axe 違反 0 で動作する』の 3 件であり、いずれも実装後の事後確認では手戻りが大きいため、実装前にテスト契約として固定する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-user-org-admin, sys-user-org-admin-p03
- Entry gate: docs/features/feat-user-org-admin/design-review-notes.md で承認 (P03) 済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: S17/S18 の axe a11y ゼロ違反テストと、salary が admin 以外のロールで画面に表示されないことを確認する UI 分離テストを設計する
- Backend: applicable + change: salary が admin 以外のロールで API レスポンスに含まれないことを確認する分離テストと、通知ディスパッチ共通層呼び出しの契約テストを設計する
- API: applicable + change: zod schemas 契約に対する入出力検証テストを設計する
- Data: applicable + change: 係数変更 (TenantCoefficient 更新) が監査 event に記録されることを確認するテストを設計する (SEC6)
- Infrastructure: N/A: 本 feature はデプロイ単位を新設しない
- Security: applicable + change: salary の export マスクテストと role 4 種ごとの認可境界テストを設計する (SEC2/SEC4)
- Quality: applicable + change: goal-spec acceptance 3 件それぞれのテスト種別と合否基準を確定する
- Documentation: applicable + change: docs/features/feat-user-org-admin/test-design.md を新規作成する
- Operations: N/A: 運用監視のテストは P09/P12 で扱う。本 task は機能テストの設計のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend, arch-harness-hub-frontend
- Deploy unit/environment: cloudflare-workers/hub (テスト設計のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task はテスト設計のみで対象物への変更を行わない

## 成果物

- Produced artifacts: docs/features/feat-user-org-admin/test-design.md (goal-spec acceptance 3件のテスト種別と合否基準), apps/hub/src/features/user-org-admin/__tests__/ (テストスタブ一式)
- Consumed artifacts: docs/features/feat-user-org-admin/design-review-notes.md, docs/features/feat-user-org-admin/architecture-decision-record.md
- Write scope/touches: docs/features/feat-user-org-admin/test-design.md, apps/hub/src/features/user-org-admin/__tests__/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-user-org-admin-p04) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-user-org-admin-p04 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-user-org-admin-p04) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-user-org-admin-p03] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- テストの実行 (P06 で実施)
- 実装コードの作成 (P05 で実施)
- 共有 CI パイプライン設定 (.github/workflows/ci.yml) の変更 (feat-hub-foundation の write_scope。本 feature は既存パイプライン上でテストを実行するのみで同ファイルを書き換えない)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-user-org-admin/test-design.md に goal-spec acceptance 3 件それぞれのテスト種別 (分離テスト/監査記録テスト/axe a11yテスト) と合否基準が明記されている

## Rollout and rollback

- Rollout: test-design.md とテストスタブ一式を作成し、P05 実装へ引き継ぐ
- Rollback trigger and steps: P05 着手後に受入契約と実装可能性の乖離が判明した場合、test-design.md を修正し P04 を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/security.md (qa-025 SEC2/SEC4/SEC6), docs/shared-layers.md §1 (qa-018 axe 検査)
- Architecture: arch-harness-hub-security (architecture/harness-hub-security.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-user-org-admin
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-user-org-admin-p03
