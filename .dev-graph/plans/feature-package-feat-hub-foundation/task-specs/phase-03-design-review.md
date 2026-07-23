# System task overlay: Hub 基盤 独立設計レビュー

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hub-foundation (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-hub-foundation", "stage-1", "infrastructure", "design-review"]
- related_nodes: ["feat-hub-foundation", "arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
- parent_feature: feat-hub-foundation
- phase_ref: P03
- classification: confidence=0.88, reason="P02 で確定した pnpm workspace 構成・デプロイ単位を P02 の設計担当から独立した視点でレビューする P03 タスク", candidates=[{artifact_kind: task, confidence: 0.88, candidate_path: tasks/sys-hub-foundation-p03.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 で確定した pnpm workspace 構成 (apps/hub + packages/ui,schemas,inspection,db)・Cloudflare Workers デプロイ単位・CI 品質ゲート設計を、設計担当から独立した基準で検証し、qa-003/qa-019/qa-007/qa-018 と D1 決定・C1/C2 制約に対する整合性を確定する。この task 完了時点で、P04 以降が安心して依拠できる承認済み設計になっている状態にする。

## 背景

docs/shared-layers.md §4 が「要ユーザー確認」としていた共通層のパッケージ構成は、複数 feature (feat-domain-model-db, feat-auth-tenancy, feat-publish-pipeline, feat-publisher-plugin, feat-dual-catalog-web, feat-workspace-governance) が消費する基盤であるため、単独の設計者判断だけで確定せず、独立レビューによる二重検証を経る必要がある。feature-execution-package-contract.md の P03 責務 (independent design gate) に従い、本 task は P02 の成果物を対象に、要件充足・制約適合・過剰設計の有無を確認する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hub-foundation, arch-harness-hub-infrastructure, arch-harness-hub-frontend, sys-hub-foundation-p02
- Entry gate: docs/features/feat-hub-foundation/architecture-decision-record.md が作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対

## Workstream applicability

- Frontend: N/A: P02 の frontend 構成決定に対するレビュー記録のみを行い、対象物 (apps/hub) への変更は行わない
- Backend: N/A: P02 の backend 構成決定に対するレビュー記録のみを行い、対象物への変更は行わない
- API: N/A: P02 の API 契約置き場決定に対するレビュー記録のみを行い、対象物への変更は行わない
- Data: N/A: DB スキーマ実体は feat-domain-model-db の scope。本 task の対象外
- Infrastructure: applicable + change: pnpm workspace 構成案 (b) の採用理由と代替案 (a)(c) の棄却理由を、qa-020 (過剰な層分割の禁止) と docs/shared-layers.md §5 (第 3 の利用者が現れて初めて共通化) の基準で再検証し、design-review-notes.md へ承認記録を残す (構成そのものの変更は行わない)
- Security: applicable + change: 認可ミドルウェアの配置境界予約が qa-006/qa-020/D4 (row-level-scope) と矛盾しないことを確認する記録を残す
- Quality: applicable + change: design-review-notes.md の新規作成、CI 品質ゲート設計 (docs/shared-layers.md §3) が qa-018 の axe 検出可能違反ゼロ・bundle 予算 3MiB を機械的に強制できる設計になっているかを確認する
- Documentation: applicable + change: docs/features/feat-hub-foundation/design-review-notes.md を新規作成する
- Operations: applicable + change: /health + 外部死活監視 + SLO ダッシュボードの構成要素配置 (qa-019) が Google SRE 上流指針 (SLI/SLO・エラーバジェット・監視・ポストモーテム・バックアップ検証) を漏れなく満たしているかを確認する記録を残す

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure, arch-harness-hub-frontend, sys-hub-foundation-p02 の architecture-decision-record.md
- Deploy unit/environment: cloudflare-workers/hub (レビュー対象。本 task 自体はデプロイ単位を変更しない)
- Compatibility/migration/backfill: N/A: 新規 scaffold であり互換性・migration・backfill の対象がない

## 成果物

- Produced artifacts: docs/features/feat-hub-foundation/design-review-notes.md (承認可否・指摘事項・是正要否の記録)
- Consumed artifacts: docs/features/feat-hub-foundation/architecture-decision-record.md, docs/features/feat-hub-foundation/requirements-baseline.md, docs/shared-layers.md, system-spec/infrastructure.md, system-spec/frontend.md
- Write scope/touches: docs/features/feat-hub-foundation/design-review-notes.md

## Tracker publication and completion

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hub-foundation-p03) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hub-foundation-p03 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-hub-foundation-p03) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hub-foundation-p02] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- P02 設計内容そのものの再設計 (差し戻しが必要な場合は P02 を再実行する)
- 実装コードの作成 (本 task はレビューのみ)
- DB スキーマ実体・認可実装本体 (他 feature の scope)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-hub-foundation/design-review-notes.md に承認可否 (承認 / 差し戻し) と、qa-003/qa-019/qa-007/qa-018 それぞれへの適合確認結果が明記されていること

## Rollout and rollback

- Rollout: design-review-notes.md で承認が確定した場合、P04 (test-first design) へ引き継ぐ
- Rollback trigger and steps: 差し戻しと判定された場合、design-review-notes.md に指摘事項を記録し、sys-hub-foundation-p02 を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/infrastructure.md (qa-003, qa-019), system-spec/frontend.md (qa-007, qa-018)
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-hub-foundation
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成しない
- Dependencies: sys-hub-foundation-p02
