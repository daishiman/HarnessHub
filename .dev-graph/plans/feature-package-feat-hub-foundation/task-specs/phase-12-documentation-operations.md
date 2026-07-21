# System task overlay: Hub 基盤 運用ドキュメント整備

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hub-foundation (13 task で共有)
- feature_context_digest: sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d
- feature_acceptance: 4 items (A1-A4)
- quality_constraints: 9 items
- owners: ["daishiman"]
- tags: ["feat-hub-foundation", "stage-1", "infrastructure", "documentation-operations"]
- related_nodes: ["feat-hub-foundation", "arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
- parent_feature: feat-hub-foundation
- phase_ref: P12
- classification: confidence=0.87, reason="P13 の本番デプロイに先立ち運用 runbook と利用者向けドキュメントを整備する P12 タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/sys-hub-foundation-p12.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

C1 (単独運用者が長期的に低運用負荷で回せる) を満たすため、Hub 基盤の運用手順を runbook として整備し、README.md の初期セットアップ手順を最終形へ更新する。この task 完了時点で、P13 の本番デプロイと、デプロイ後の日常運用 (障害対応、エラーバジェット運用、restore drill) が runbook 一つで完結できる状態にする。

## 背景

qa-019 は月間エラーバジェット 0.5% 消費時の新規公開機能凍結運用と、四半期ごとの restore drill を求めている。これらは P09 で readiness を確認済みだが、実際の運用時に単独運用者が迷わず実行できるよう、手順を runbook として文書化する必要がある。P05 で README.md に追記した初期セットアップ手順は開発環境構築のみを対象としており、本 task で本番運用手順を追加する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hub-foundation, arch-harness-hub-infrastructure, arch-harness-hub-frontend, sys-hub-foundation-p11
- Entry gate: docs/features/feat-hub-foundation/evidence/index.md が作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対

## Workstream applicability

- Frontend: N/A: 運用ドキュメント整備のみを行い、frontend 実装物への変更は行わない
- Backend: N/A: 運用ドキュメント整備のみを行い、backend 実装物への変更は行わない
- API: N/A: 運用ドキュメント整備のみを行い、API 実装物への変更は行わない
- Data: N/A: DB スキーマ実体は feat-domain-model-db の scope であり、本 task の対象に含めない
- Infrastructure: applicable + change: wrangler deploy コマンド、ロールバック手順 (直前バージョンへの revert) を runbook.md に記録する (対象物 (wrangler.jsonc 等) への変更なし)
- Security: N/A: 認証・認可は feat-auth-tenancy の scope であり、本 task の対象に含めない
- Quality: applicable + change: bundle 予算超過時の対応手順 (コード分割・依存削減、Workers Paid 移行検討) を runbook.md に記録する
- Documentation: applicable + change: docs/features/feat-hub-foundation/runbook.md を新規作成し、README.md の本番運用セクションを更新する
- Operations: applicable + change: エラーバジェット消費時の新規公開機能凍結手順、四半期 restore drill の実施手順、/health 障害時の一次対応手順を runbook.md に記録する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure, arch-harness-hub-frontend
- Deploy unit/environment: cloudflare-workers/hub (runbook の対象。本 task 自体はデプロイ単位を変更しない)
- Compatibility/migration/backfill: N/A: 新規 scaffold であり互換性・migration・backfill の対象がない

## 成果物

- Produced artifacts: docs/features/feat-hub-foundation/runbook.md (デプロイ・ロールバック・障害対応・エラーバジェット運用・restore drill の各手順)、README.md の本番運用セクション追記
- Consumed artifacts: docs/features/feat-hub-foundation/quality-assurance-report.md, docs/features/feat-hub-foundation/evidence/index.md
- Write scope/touches: docs/features/feat-hub-foundation/runbook.md, README.md

## Tracker publication and completion

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hub-foundation-p12) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hub-foundation-p12 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-hub-foundation-p12) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hub-foundation-p11] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 業務ドメインロジックの運用ドキュメント (goal-spec scope_out)
- 認証・認可の運用手順 (feat-auth-tenancy の scope)
- 実際のデプロイ実行 (P13 の scope)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: runbook.md にデプロイ・ロールバック・障害対応・エラーバジェット運用・restore drill の 5 手順すべてが記載されていること

## Rollout and rollback

- Rollout: runbook.md と README.md 更新を完了した後、P13 (release-deploy) へ引き継ぐ
- Rollback trigger and steps: runbook.md の記載内容が P09 の readiness 確認結果と矛盾する場合、矛盾箇所を記録した上で sys-hub-foundation-p09 を再確認対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (C1), system-spec/infrastructure.md (qa-003, qa-019)
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-hub-foundation
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成しない
- Dependencies: sys-hub-foundation-p11
