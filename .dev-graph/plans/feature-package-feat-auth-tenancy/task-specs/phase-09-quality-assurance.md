# System task overlay: 品質保証 — CI 品質ゲート (tenant 分離・adapter 境界隔離・dev provider 非存在・認可判定単一集約)

## Machine-readable registration fields

- feature_package_id: feature-package/feat-auth-tenancy (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-auth-tenancy", "macro-feature", "security", "quality-assurance"]
- related_nodes: ["feat-auth-tenancy", "arch-harness-hub-security", "arch-harness-hub-backend"]
- parent_feature: feat-auth-tenancy
- phase_ref: P09
- classification: confidence=0.86, reason="CI 品質ゲート (tenant 分離・adapter 境界隔離・dev provider 非存在・認可判定単一集約) を確認する P09 タスク", candidates=[{artifact_kind: task, confidence: 0.86, candidate_path: tasks/feat-auth-tenancy/sys-auth-tenancy-p09.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

本 feature に該当する CI 品質ゲート (テナント分離テストの CI 必須化、Auth.js adapter 境界外からの Auth.js 固有 API import 禁止の静的検査、dev 専用 provider 非存在検査、認可判定が単一ミドルウェア以外に実装されていないことの静的検査、secret scan) を実装・確認し、quality-assurance-report.md として記録する。

## 背景

D4 の row-level-scope 方式は分離テスト CI 必須ゲート化を revisit 条件確認の前提とする。本 task は P06 で実行したテナント分離テストを CI 必須ゲートとして固定化し、テナント数増加時 (10 超過) の revisit トリガー監視の起点とする。qa-020 の接続層/認可判定の一箇所集約要求を CI で機械検証するため、(1) `apps/hub/src/lib/auth/adapter/` 以外から Auth.js 固有型・API が import されていないことを grep ベースで検査する CI ステップ、(2) `apps/hub/src/lib/authz/` 以外の場所に認可判定ロジック (role 比較、権限チェック分岐) が実装されていないことを検査する CI ステップ、を追加する。qa-036/i7 の dev 専用 provider 非存在検査 (P08 で確立済みの検査を CI ワークフローへ実際に組み込む) を本 task で最終確認する。docs/backend-spec.md §3.2 の数値契約 (JWT maxAge 8h/updateAge 15 分、device_code TTL 10 分等) がコード中にハードコードされ設定ファイル一箇所から参照されていることを確認し、secret scan で OIDC client_secret や token 署名鍵がハードコードされていないことを確認する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-auth-tenancy, arch-harness-hub-security, arch-harness-hub-backend
- Entry gate: .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5 に一致し、confirmation_status=confirmed であること。P08 の docs/features/feat-auth-tenancy/refactoring-migration-note.md が存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 task は UI の変更を伴わない
- Backend: applicable + change: CI 品質ゲート用の静的検査スクリプトを実装する
- API: N/A: エンドポイント契約自体の変更は伴わない
- Data: N/A: スキーマ関連の品質ゲートは feat-domain-model-db の責務
- Infrastructure: applicable + change: CI ワークフローへ品質ゲートステップを追加する (feature 固有チェックスクリプトの範囲に限定)
- Security: applicable + change: adapter 境界隔離検査・認可判定単一集約検査・dev provider 非存在検査・secret scan を実装する
- Quality: applicable + change: 全 CI 品質ゲートの pass を確認する
- Documentation: applicable + change: docs/features/feat-auth-tenancy/quality-assurance-report.md を新規作成する
- Operations: N/A: 運用手順の確定は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task は品質ゲートの追加のみで既存スキーマへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-auth-tenancy/quality-assurance-report.md (CI 品質ゲート一覧と各ゲートの pass 結果), apps/hub/scripts/check-auth-adapter-boundary.ts (adapter 境界隔離検査スクリプト), apps/hub/scripts/check-single-authz-middleware.ts (認可判定単一集約検査スクリプト)
- Consumed artifacts: docs/backend-spec.md §3.2/§3.3, apps/hub/src/lib/auth/, apps/hub/src/lib/authz/
- Write scope/touches: docs/features/feat-auth-tenancy/quality-assurance-report.md, apps/hub/scripts/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-auth-tenancy-p09) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-auth-tenancy-p09 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-auth-tenancy-p09) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-AUTH-TENANCY-P08]。resource_scope (docs/features/feat-auth-tenancy/quality-assurance-report.md, apps/hub/scripts/) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- feat-domain-model-db 側のスキーマ品質ゲート (同 feature 自身の P09 が担当)
- 共有 CI パイプライン本体の変更 (共有 CI は不可侵。本 task は feature 固有チェックスクリプトの追加のみ)
- tenant_data_objects (qa-045) 関連の品質ゲート (本 digest スコープ外)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-auth-tenancy/quality-assurance-report.md に全 CI 品質ゲート (テナント分離・adapter 境界隔離・認可判定単一集約・dev provider 非存在・secret scan) の pass 結果が記録されていること

## Rollout and rollback

- Rollout: quality-assurance-report.md で全ゲート pass を確認してから P10 (最終独立レビュー) へ引き継ぐ
- Rollback trigger and steps: いずれかのゲートが fail した場合、該当する P05/P08 の実装へ差し戻し修正したうえで本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (D3, D4, I7, I8, G4), system-spec/spec-state.json qa_log (qa-005, qa-006, qa-008, qa-020, qa-036)
- Detailed authoritative source: docs/backend-spec.md §3.2, §3.3
- Architecture: arch-harness-hub-security, arch-harness-hub-backend
- Feature: feat-auth-tenancy
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-AUTH-TENANCY-P08
