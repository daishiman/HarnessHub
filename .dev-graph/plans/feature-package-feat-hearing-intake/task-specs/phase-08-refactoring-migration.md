# System task overlay: リファクタリング/マイグレーション — HearingSheet/FormData/AiJob(hearing kind) 新規テーブルの migration 生成と後方互換性確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hearing-intake (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-hearing-intake", "studio-extension", "async-ai-queue", "refactoring-migration"]
- related_nodes: ["feat-hearing-intake", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
- parent_feature: feat-hearing-intake
- phase_ref: P08
- classification: confidence=0.85, reason="HearingSheet/FormData/AiJob(hearing kind) の新規テーブルに対する migration ファイル生成と後方互換性確認を行う P08 タスク (feature-execution-package-contract.md により P08 は N/A 判定時も常設される)", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-hearing-intake/sys-hearing-intake-p08.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P05 で実装した HearingSheet/FormData/AiJob (hearing kind) の新規テーブル定義に対する migration ファイルを生成し、既存データへの後方互換性影響がないことを確認する。

## 背景

HearingSheet/FormData/AiJob (hearing kind) はいずれも本 feature が新規追加するテーブルであり、既存行に対する ALTER 相当の変更を伴わない。feat-user-org-admin の precedent (department/salary 列の既存エンティティへの追加) とは異なり後方互換性リスクは低いが、feature-execution-package-contract.md は P08 を「N/A 判定でも常に存在する task」と定めているため、本 task は新規テーブルの migration ファイル生成そのものを実行内容とし、後方互換性確認 (既存テーブルへの影響が皆無であることの確認) を成果物として明記する。AiJob については P02 のスコープ判断 (hearing kind 用の最小分に限定し共通層汎化を行わない) を継承し、汎化を前提とした migration は生成しない。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hearing-intake, sys-hearing-intake-p07
- Entry gate: docs/features/feat-hearing-intake/acceptance-report.md で acceptance 3 項目が pass 済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task はデータ層の migration 生成のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は migration ファイル生成のみで backend ハンドラを変更しない
- API: N/A: API 契約の変更を伴わない
- Data: applicable + change: HearingSheet/FormData/AiJob (hearing kind) の新規テーブル migration ファイルを packages/db/schema/hearing-intake/ 配下に生成し、既存テーブルへの影響がないことを確認する
- Infrastructure: N/A: デプロイ単位の変更は伴わない
- Security: N/A: 認可・sanitize の実装変更を伴わない (P05 で実装済み)
- Quality: applicable + change: migration 適用後も P06 のテストが再度 green であることを確認する
- Documentation: applicable + change: docs/features/feat-hearing-intake/refactoring-migration-note.md を新規作成する
- Operations: N/A: 運用手順への反映は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data
- Deploy unit/environment: cloudflare-workers/hub (Turso 上の新規テーブル追加。本 task は migration ファイル生成のみでデプロイは P13 で行う)
- Compatibility/migration/backfill: HearingSheet/FormData/AiJob (hearing kind) はいずれも新規テーブルのため backfill は不要。既存テーブルへの ALTER は発生しない

## 成果物

- Produced artifacts: docs/features/feat-hearing-intake/refactoring-migration-note.md (migration ファイル一覧と後方互換性確認結果), packages/db/schema/hearing-intake/ 配下の migration ファイル
- Consumed artifacts: docs/features/feat-hearing-intake/architecture-decision-record.md, docs/features/feat-hearing-intake/acceptance-report.md, packages/db/schema/hearing-intake/
- Write scope/touches: docs/features/feat-hearing-intake/refactoring-migration-note.md, packages/db/schema/hearing-intake/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hearing-intake-p08) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hearing-intake-p08 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-hearing-intake-p08) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hearing-intake-p07] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- AiJob キュー共通層そのものの汎化 migration (feat-hub-foundation の未解決上流論点。P02 のスコープ判断を継承)
- 既存テーブルへの ALTER (本 feature には対象がない)
- 本番環境への migration 適用 (P13 の scope)

## Verification and evidence

- Automated commands: `pnpm --filter hub build`, `pnpm --filter hub test`, `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: refactoring-migration-note.md に生成した migration ファイル一覧と後方互換性確認結果 (既存テーブル影響なし) が記載され、P06 テストが再度 green であることの記録がある

## Rollout and rollback

- Rollout: migration ファイル生成完了後 P09 の品質保証へ引き継ぐ
- Rollback trigger and steps: migration 適用でテストが fail する場合、refactoring-migration-note.md に失敗詳細を記録し packages/db/schema/hearing-intake/ の migration ファイルを修正または削除して再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/database.md (qa-024), system-spec/00-requirements-definition.md (D4)
- Architecture: arch-harness-hub-data (architecture/harness-hub-data.md)
- Feature: feat-hearing-intake
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-hearing-intake-p07
