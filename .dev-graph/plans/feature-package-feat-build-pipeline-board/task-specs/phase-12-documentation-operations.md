# System task overlay: ドキュメント/運用 — S13 運用手順・工程操作監査運用・PublishRequest 接続監視の runbook 作成

## Machine-readable registration fields

- feature_package_id: feature-package/feat-build-pipeline-board (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-build-pipeline-board", "studio-extension", "build-pipeline-board", "documentation", "operations"]
- related_nodes: ["feat-build-pipeline-board", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
- parent_feature: feat-build-pipeline-board
- phase_ref: P12
- classification: confidence=0.85, reason="P11 のエビデンスを踏まえ S13 運用手順・工程操作監査運用・PublishRequest 接続監視を runbook 化する P12 タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-build-pipeline-board/sys-build-pipeline-board-p12.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P11 のエビデンスを踏まえ、S13 パイプラインボードの運用手順・工程操作 (build.stage_change) 監査ログ確認運用・publish 工程と PublishRequest 接続の整合監視手順を runbook.md として作成する。

## 背景

工程遷移操作は admin 限定であり SEC6 の監査対象に含まれるため、運用担当が定期的に build_stage_events / 監査ログを確認できる手順が必要である (docs/backend-spec.md §3.8)。また publish 工程は既存 PublishRequest 状態機械へ接続するのみであるため (B4)、build.stage=publish と接続先 PublishRequest.status の不整合が発生していないかを定期監視する手順を確立する。ボード自体は 30 秒間隔のポーリングで進捗を更新するため (docs/backend-spec.md §8)、リアルタイム性の運用上の制約についても runbook に明記する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-build-pipeline-board, arch-harness-hub-frontend, arch-harness-hub-backend
- Entry gate: sys-build-pipeline-board-p11 の evidence/index.md が作成済みであること。かつ .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441 に一致し、features/feat-build-pipeline-board.md の confirmation_status が confirmed であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + review: S13 ボードのポーリング間隔 (30 秒) と表示更新挙動を運用者向けに文書化する
- Backend: applicable + review: 工程遷移 API の監査ログ出力先と確認手順を文書化する
- API: N/A
- Data: N/A
- Infrastructure: N/A
- Security: applicable + change: 工程操作監査ログ確認手順 (SEC6) と PublishRequest 整合監視手順 (B4) を runbook 化する
- Quality: applicable + change: runbook.md に S13 運用手順・工程操作監査確認手順・PublishRequest 接続監視手順の 3 項目を記載する
- Documentation: applicable + change: docs/features/feat-build-pipeline-board/runbook.md を新規作成する
- Operations: applicable + change: 本番運用開始後の定期監視項目 (監査ログ確認頻度・PublishRequest 不整合検知) を確立する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (本 task は runbook 作成のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は runbook 作成のみで実 migration は伴わない

## 成果物

- Produced artifacts: docs/features/feat-build-pipeline-board/runbook.md (S13 運用手順・工程操作監査確認手順・PublishRequest 接続監視手順)
- Consumed artifacts: docs/features/feat-build-pipeline-board/evidence/index.md, docs/backend-spec.md
- Write scope/touches: docs/features/feat-build-pipeline-board/runbook.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-build-pipeline-board-p12) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-build-pipeline-board-p12 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-build-pipeline-board-p12) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-build-pipeline-board-p11 完了後に着手する。resource_scope (docs/features/feat-build-pipeline-board/runbook.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 監視基盤自体の新規構築 (feat-hub-foundation が既に確立している運用基盤に乗り入れる)
- publish 状態機械自体の運用手順 (既存 I2/I3 の運用手順を参照するのみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: runbook.md に S13 運用手順・工程操作監査確認手順・PublishRequest 接続監視手順の 3 項目が記載されていること

## Rollout and rollback

- Rollout: runbook.md を作成し、P13 リリースへ引き継ぐ
- Rollback trigger and steps: runbook.md の記載が P11 エビデンスと矛盾する場合、矛盾箇所を記録し sys-build-pipeline-board-p11 を再確認対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/ui-ux.md (qa-021 S13), system-spec/00-requirements-definition.md (B4), system-spec/security.md (qa-025 SEC6)
- Detailed authoritative source: docs/backend-spec.md (§3.8 監査対象, §8 非機能要件 ポーリング仕様, §5.3 Build 状態機械)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-build-pipeline-board
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-build-pipeline-board-p11
