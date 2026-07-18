# System task overlay: Hub 基盤 品質・セキュリティ・運用保証

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hub-foundation (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-hub-foundation", "stage-1", "infrastructure", "quality-assurance"]
- related_nodes: ["feat-hub-foundation", "arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
- parent_feature: feat-hub-foundation
- phase_ref: P09
- classification: confidence=0.88, reason="CI 品質ゲート・セキュリティ・運用readinessを横断的に確認する P09 タスク", candidates=[{artifact_kind: task, confidence: 0.88, candidate_path: tasks/sys-hub-foundation-p09.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

docs/shared-layers.md §3 の CI 品質ゲート (pnpm 混入検査 / axe 導線枠 / bundle 予算 Worker 3MiB / Tenant 分離テスト枠 / 検査 pipeline 挙動同値テスト枠) と qa-019 の運用 readiness (エラーバジェット運用、restore drill 手順) が実際に機能する状態であることを横断的に確認する。この task 完了時点で、品質・セキュリティ・運用の 3 観点それぞれについて readiness が確認されている状態にする。

## 背景

feature-execution-package-contract.md の P09 責務は「quality/security/operational assurance」であり、P06 の個別テスト実行とは異なり、CI ゲート全体の運用可能性・セキュリティ境界・運用手順の実効性を横断的に検証する。qa-019 は「月間エラーバジェット 0.5% を消費し切った場合は新規公開機能の変更を凍結し信頼性回復を優先する」運用と「四半期ごとの restore drill (復元できないバックアップを成功と数えない)」を求めており、これらは仕組みとして機能する準備ができているかを本 task で確認する。C4 (顧客の業務データ・secret・Web App runtime を保持しない) は本 feature の scope では新規 secret を扱わないことで担保される。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hub-foundation, arch-harness-hub-infrastructure, arch-harness-hub-frontend, sys-hub-foundation-p08
- Entry gate: docs/features/feat-hub-foundation/refactoring-migration-note.md が作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対

## Workstream applicability

- Frontend: applicable + change: axe 自動チェック導線枠と CWV 計測結果が CI 上で確認できることを quality-assurance-report.md に記録する (対象物への変更なし)
- Backend: N/A: 業務 backend ロジックは scope 外。/health の稼働確認は Infrastructure/Operations workstream で扱う
- API: N/A: 業務 API 契約は scope 外 (後続 feature)
- Data: N/A: DB スキーマ実体は scope 外 (feat-domain-model-db)
- Infrastructure: applicable + change: Worker bundle 3MiB 予算超過検知と pnpm 混入検査の品質ゲートが CI 上で実効性を持つことを確認する (意図的な違反シナリオでの fail 確認を含む)
- Security: applicable + change: npm 混入防止・secret 非保持境界 (C4) が本 feature の実装物に対して満たされていることを確認する
- Quality: applicable + change: docs/features/feat-hub-foundation/quality-assurance-report.md を新規作成する
- Documentation: applicable + change: quality-assurance-report.md 作成
- Operations: applicable + change: エラーバジェット運用 (月間 0.5% 消費で新規公開機能凍結) の運用手順と、四半期 restore drill の実施手順が定義され readiness を満たしていることを確認する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure, arch-harness-hub-frontend
- Deploy unit/environment: cloudflare-workers/hub (品質・運用保証の対象。本 task 自体はデプロイ単位を変更しない)
- Compatibility/migration/backfill: N/A: 新規 scaffold であり互換性・migration・backfill の対象がない

## 成果物

- Produced artifacts: docs/features/feat-hub-foundation/quality-assurance-report.md (CI 品質ゲート実効性・セキュリティ境界・運用 readiness の確認結果)
- Consumed artifacts: .github/workflows/ci.yml, docs/features/feat-hub-foundation/refactoring-migration-note.md, docs/shared-layers.md
- Write scope/touches: docs/features/feat-hub-foundation/quality-assurance-report.md, .github/workflows/ci.yml (品質ゲート不備発見時の是正のみ)

## Tracker publication and completion

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hub-foundation-p09) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hub-foundation-p09 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-hub-foundation-p09) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hub-foundation-p08] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- axe チェック対象画面の拡充 (対象画面が増える後続 feature の scope)
- Tenant 分離テスト・検査 pipeline 挙動同値テストの内容確定 (消費 feature の scope、本 feature では枠のみ確認する)
- restore drill の実施そのもの (四半期ごとの定常運用として実行、本 task は手順の readiness 確認のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: quality-assurance-report.md に CI 品質ゲート (pnpm 混入検査 / bundle 予算 / axe 導線枠) の実効性確認結果、エラーバジェット運用手順、restore drill 手順の readiness 状態が記録されていること

## Rollout and rollback

- Rollout: quality-assurance-report.md で readiness 確認が完了した場合、P10 (final-review) へ引き継ぐ
- Rollback trigger and steps: 品質ゲートの実効性不備が見つかった場合、.github/workflows/ci.yml を是正し、是正内容を quality-assurance-report.md に記録した上で本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/infrastructure.md (qa-019), system-spec/frontend.md (qa-018), system-spec/00-requirements-definition.md (C1, C2, C4)
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-hub-foundation
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成しない
- Dependencies: sys-hub-foundation-p08
