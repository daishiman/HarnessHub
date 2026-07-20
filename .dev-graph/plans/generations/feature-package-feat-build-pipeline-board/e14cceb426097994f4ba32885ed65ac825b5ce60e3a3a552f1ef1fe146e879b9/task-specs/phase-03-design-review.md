# System task overlay: 独立設計レビュー — Build スキーマ・工程操作認可・PublishRequest 接続・共有認可表の妥当性確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-build-pipeline-board (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-build-pipeline-board", "studio-extension", "build-pipeline-board", "design-review"]
- related_nodes: ["feat-build-pipeline-board", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
- parent_feature: feat-build-pipeline-board
- phase_ref: P03
- classification: confidence=0.88, reason="P02 で確定した Build スキーマ・S13 ボード構成・builds API 契約・工程遷移状態機械・PublishRequest 接続契約・B9 共有認可表を、設計担当から独立した視点でレビューする P03 タスク", candidates=[{artifact_kind: task, confidence: 0.88, candidate_path: tasks/feat-build-pipeline-board/sys-build-pipeline-board-p03.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 で確定した Build スキーマ・S13 ボード構成・builds API 契約・工程遷移状態機械・PublishRequest 接続契約・B9 共有認可表を、設計担当から独立した視点でレビューし、quality_constraints 6 件との整合を判定する。

## 背景

feature-execution-package-contract.md は実装着手前の独立設計レビュー (P03) を必須工程と定めており、SEC2/SEC6 の認可・監査要件、D4 の tenant scope 要件、B4/I2/I3 の PublishRequest 接続要件、B9 の共有認可表要件を実装者以外の視点で検証する必要がある。特に publish 工程は既存状態機械への接続であり二重状態を持つ設計は不可 (goal-spec acceptance 2 件目) であるため、この観点のレビューを本 task の中心に置く。工程遷移が admin 限定であり member/owner に操作権限を与えない設計になっているか (SEC2, docs/backend-spec.md §3.3) も重点確認項目とする。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-build-pipeline-board, arch-harness-hub-frontend, arch-harness-hub-backend
- Entry gate: sys-build-pipeline-board-p02 の architecture-decision-record.md が作成済みであること。かつ goal-spec.json の feature_context_digest が sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441 に一致し、features/feat-build-pipeline-board.md の confirmation_status が confirmed であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task はレビューのみで frontend 実装物を変更しない
- Backend: N/A: 本 task はレビューのみで backend 実装物を変更しない
- API: N/A: 本 task はレビューのみで API 契約を変更しない
- Data: applicable + review: Build/build_stage_events のカラム定義と tenant_id/workspace_id スコープ列の妥当性 (D4/qa-024) をレビューする
- Infrastructure: N/A: 本 feature は追加インフラを新設しない
- Security: applicable + review: 工程遷移 admin 限定認可 (SEC2)、build.stage_change 監査 event (SEC6)、PublishRequest 接続の二重状態排除 (B4/I2/I3)、B9 共有認可表構造の妥当性をレビューする
- Quality: applicable + change: design-review-notes.md に承認可否と各 quality_constraints への適合確認結果を記録する
- Documentation: applicable + change: docs/features/feat-build-pipeline-board/design-review-notes.md を新規作成する
- Operations: N/A: 運用手順のレビューは P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (本 task はレビューのみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task はレビューのみで実 migration は伴わない

## 成果物

- Produced artifacts: docs/features/feat-build-pipeline-board/design-review-notes.md (承認可否、SEC2/SEC6・B4/I2/I3・D4・B9・qa-021/qa-022/qa-023(B1/B9)/qa-024 適合確認結果を含む)
- Consumed artifacts: docs/features/feat-build-pipeline-board/architecture-decision-record.md, system-spec/security.md, system-spec/database.md, system-spec/backend.md, docs/backend-spec.md
- Write scope/touches: docs/features/feat-build-pipeline-board/design-review-notes.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-build-pipeline-board-p03) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-build-pipeline-board-p03 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-build-pipeline-board-p03) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-build-pipeline-board-p02 完了後に着手する。resource_scope (docs/features/feat-build-pipeline-board/design-review-notes.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 設計案自体の修正 (却下時は P02 へ差し戻し、本 task では修正を行わない)
- 実装コードの作成

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: design-review-notes.md に承認可否と SEC2/SEC6・B4/I2/I3・D4・qa-021/qa-022/qa-023(B1/B9)/qa-024 適合確認結果が明記されていること

## Rollout and rollback

- Rollout: design-review-notes.md を作成し、承認の場合は P04 テスト設計へ、却下の場合は P02 へ差し戻す
- Rollback trigger and steps: 差し戻しと判定された場合、design-review-notes.md に指摘事項を記録し、sys-build-pipeline-board-p02 を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-build-pipeline-board.context.json` (`sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441`)
- Phase responsibility: P02 の設計が現行 context を漏れなく、矛盾なく満たすか独立レビューする。
- Purpose: ヒアリング→要件定義→設計→構築→テスト→レビュー→公開の 7 工程を S13 のボードで進行管理し (工程操作は admin)、公開工程を既存 PublishRequest 状態機械 (B4/I2/I3) へ接続する
- Goal: 各ハーネスの構築進捗が 7 工程ボードで可視化され、工程操作が admin 限定 + 監査記録付きで行え、公開工程が publish パイプラインと二重実装なしに連動する状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- Build エンティティ (7 stage・リスク表示)
- S13 パイプラインボード (ステージボード共通部品の消費)
- 工程操作の admin 権限 + 監査 event (SEC6)
- 公開工程の PublishRequest 接続 (B4)
- Scope out:
- publish 状態機械の再実装 (既存 I2/I3 を使う)
- 工程の自動遷移 (手動運用から開始)
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- 7 工程の遷移が admin のみ操作でき監査 event に記録される
- 公開工程が PublishRequest の状態と整合する (二重状態を持たない)
- ボードが axe 違反 0・CWV good で動作する
- Architecture/source refs:
- architecture/harness-hub-frontend.md
- architecture/harness-hub-backend.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## 参照情報

- System specification: system-spec/security.md (qa-025 SEC2/SEC6), system-spec/database.md (qa-032), system-spec/backend.md (qa-033), system-spec/00-requirements-definition.md (D4)
- Detailed authoritative source: docs/backend-spec.md (§3.3 認可マトリクス, §3.8 監査対象, §5.3 Build 状態機械)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-build-pipeline-board
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-build-pipeline-board-p02
