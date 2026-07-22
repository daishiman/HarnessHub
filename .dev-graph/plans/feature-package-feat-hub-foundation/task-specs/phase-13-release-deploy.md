# System task overlay: Hub 基盤 本番リリース・デプロイ

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hub-foundation (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-hub-foundation", "stage-1", "infrastructure", "release-deploy"]
- related_nodes: ["feat-hub-foundation", "arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
- parent_feature: feat-hub-foundation
- phase_ref: P13
- classification: confidence=0.9, reason="P12 の runbook に従い wrangler CLI で Hub を Cloudflare Workers 本番環境へデプロイする P13 タスク", candidates=[{artifact_kind: task, confidence: 0.9, candidate_path: tasks/sys-hub-foundation-p13.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P12 の runbook に従い、goal-spec acceptance「CI が test→deploy まで完走する」を満たす形で、Hub 基盤を Cloudflare Workers 本番環境へ wrangler CLI 経由でデプロイする。この task 完了時点で、.github/workflows/ci.yml の deploy ステップが本番へ到達し、/health が本番 URL 上で応答し、外部死活監視と SLO ダッシュボードが本番稼働を計測している状態にする。goal-spec の acceptance 3 件のうち、本番環境での実現は本 task が担う (P07 は CI/開発環境での判定)。

## 背景

D1 決定により Hub は @opennextjs/cloudflare 経由で単一 Cloudflare Worker として wrangler CLI からデプロイされる。P05〜P11 は開発・CI 環境での実装・検証・証跡収集を担い、P12 は運用手順を整備したが、本番環境への実際のデプロイはまだ実行されていない。feature-execution-package-contract.md §3 は P13 を release/deploy として位置づけ、本 feature では実装スコープに本番デプロイが明確に含まれる (N/A 判定ではなく実タスク) ため、P08 とは異なり本 task は成果物を伴う実行タスクとする。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hub-foundation, arch-harness-hub-infrastructure, arch-harness-hub-frontend, sys-hub-foundation-p12
- Entry gate: docs/features/feat-hub-foundation/runbook.md が作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対

## Workstream applicability

- Frontend: applicable + change: apps/hub の本番ビルド成果物を Cloudflare Workers へデプロイする (実装内容自体は P05 のものをそのまま反映)
- Backend: applicable + change: /health route handler を本番環境で稼働させる
- API: N/A: 業務 API 契約は scope 外 (後続 feature)
- Data: N/A: DB スキーマ実体は feat-domain-model-db の scope であり、本 task のデプロイ対象に含めない
- Infrastructure: applicable + change: .github/workflows/ci.yml の deploy ステップを本番向けに有効化し、wrangler CLI (wrangler.jsonc の設定) 経由で本番 Worker をデプロイする
- Security: applicable + change: 本番デプロイに必要な wrangler API token 等の secret を GitHub Actions の暗号化 secret として設定する (secret の値自体は本 task の成果物に含めない、C4 に従い保持しない)
- Quality: applicable + change: 本番デプロイ後の bundle サイズが 3MiB 以内であることを最終確認する
- Documentation: applicable + change: docs/features/feat-hub-foundation/release-notes.md を新規作成する
- Operations: applicable + change: 外部死活監視と SLO ダッシュボードを本番 URL に対して有効化し、本番稼働の計測を開始する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure, arch-harness-hub-frontend
- Deploy unit/environment: cloudflare-workers/hub (本番環境、wrangler CLI 経由デプロイ)
- Compatibility/migration/backfill: N/A: 新規 scaffold の初回リリースであり互換性・migration・backfill の対象がない

## 成果物

- Produced artifacts: docs/features/feat-hub-foundation/release-notes.md (デプロイ日時、Worker バージョン、本番 URL、初回稼働確認結果)、.github/workflows/ci.yml の deploy ステップ本番有効化
- Consumed artifacts: docs/features/feat-hub-foundation/runbook.md, apps/hub/, wrangler.jsonc, open-next.config.ts
- Write scope/touches: .github/workflows/ci.yml, docs/features/feat-hub-foundation/release-notes.md

## Tracker publication and completion

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hub-foundation-p13) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hub-foundation-p13 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-hub-foundation-p13) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hub-foundation-p12] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 業務ドメインロジックのリリース (goal-spec scope_out)
- 認証・認可のリリース (feat-auth-tenancy の scope)
- 本番デプロイ後の恒常的な運用監視そのもの (P12 runbook に基づき日常運用として継続、本 task は初回デプロイと稼働確認のみ)

## Verification and evidence

- Automated commands: runbook.md 記載の wrangler deploy コマンド (`wrangler deploy` 相当) / 本番 /health への疎通確認 / `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: release-notes.md にデプロイ日時・Worker バージョン・本番 URL・/health 初回応答・bundle サイズ最終値が記録されていること

## Rollout and rollback

- Rollout: CI の deploy ステップから本番デプロイを実行し、成功後に /health と外部死活監視・SLO ダッシュボードの本番稼働を確認する
- Rollback trigger and steps: 本番デプロイ後に /health が異常応答を返す場合、runbook.md 記載のロールバック手順 (直前バージョンへの wrangler rollback) を実行し、実行結果を release-notes.md に記録する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (D1, C1, C2), system-spec/infrastructure.md (qa-003, qa-019), system-spec/frontend.md (qa-007, qa-018)
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-hub-foundation
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成しない
- Dependencies: sys-hub-foundation-p12
