# System task overlay: 構築パイプラインボード要件ベースライン確定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-build-pipeline-board (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-build-pipeline-board", "studio-extension", "build-pipeline-board", "requirements-baseline"]
- related_nodes: ["feat-build-pipeline-board", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
- parent_feature: feat-build-pipeline-board
- phase_ref: P01
- classification: confidence=0.92, reason="goal-spec (.dev-graph/staging/goal-spec.json) と features/feat-build-pipeline-board.md の purpose/goal/scope/acceptance/quality_constraints を要件ベースラインへ確定転記する P01 タスク", candidates=[{artifact_kind: task, confidence: 0.92, candidate_path: tasks/feat-build-pipeline-board/sys-build-pipeline-board-p01.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

feat-build-pipeline-board の受入可能な要件ベースラインを確定し、以降の P02 以降の全 task が同一の合意事項 (hearing→requirements→design→build→test→review→publish の 7 stage を持つ Build エンティティ・S13 パイプラインボード・工程操作 admin 限定 + 監査・公開工程の PublishRequest 接続・6 件の quality_constraints) を参照できる状態にする。この task 完了時点で、goal-spec の purpose/goal/scope_in/scope_out/acceptance/quality_constraints が machine-verifiable な baseline 文書として固定される。

## 背景

Harness Studio mockup 反映により、構築パイプラインは hearing→requirements→design→build→test→review→publish の 7 工程を S13 のボードで進行管理する feature として確定した (features/feat-build-pipeline-board.md, confirmation_status=confirmed)。工程操作は SEC2 の role×操作許可表により admin (workspace-admin/provider-admin) 限定とし、SEC6 で新規確定した監査対象に build.stage_change を含める (system-spec/security.md qa-025)。publish 工程は新規状態機械を作らず既存 PublishRequest 状態機械 (B4/I2/I3) へ接続することで二重実装を避ける (docs/backend-spec.md §2.3, §5.3)。Build エンティティは Studio 拡張の新規テーブルであり D4 に従い tenant_id/workspace_id スコープ列を必須とする (system-spec/database.md qa-032, qa-024)。S13 の 7 工程ボードは design system の共通部品 (ステージボード) を消費するのみとし独自実装を行わない (system-spec/ui-ux.md qa-021, system-spec/frontend.md qa-022)。新規 REST 資源群 (builds) は B1 の方針に従い zod スキーマ単一ソースへ追加し認可単一ミドルウェア (deny-by-default) 配下の role×操作許可表に従う (qa-023)。工程操作の admin 権限判定は Yellow review (I8) の承認 queue と共通の認可表で扱う (B9, qa-023)。本 task は、実装に入る前にこれらの確定要件を再解釈や欠落なく baseline 化し、後続タスクの手戻りを防ぐ。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-build-pipeline-board, arch-harness-hub-frontend, arch-harness-hub-backend
- Entry gate: .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441 に一致し、features/feat-build-pipeline-board.md の confirmation_status が confirmed であること。evaluation_status は本 task package 生成時点で pending であり、system-dev-plan-evaluator による C12 PASS 判定と C11 promotion を経て解決する
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は要件文書化のみで frontend 実装物 (S13 ボード) を変更しない。frontend 要件の具体化は P02 設計・P05 実装で行う
- Backend: N/A: 本 task は要件文書化のみで backend 実装物 (builds REST 資源・工程遷移 API) を変更しない
- API: N/A: API 契約の置き場と形状の確定は P02 の workstream 設計で行う。本 task は要件記述のみ
- Data: N/A: Build エンティティ (tenant_id/workspace_id スコープ列) のカラム定義詳細設計は P02 で行う (qa-024: カラム定義の詳細設計は各 feature の P02 で行う)。本 task は要件記述のみ
- Infrastructure: N/A: デプロイ単位・CI/CD は feat-hub-foundation が既に確立しており、本 feature は追加インフラを新設しない
- Security: applicable + change: stage-transition-admin-audit-sec2-sec6-qa021・publish-stage-publishrequest-connect-no-dup-b4-i2-i3・build-entity-tenant-scope-d4-qa024・rest-zod-single-source-authz-mw-b1-qa023・approval-queue-authz-table-shared-b9-qa023 の 5 件のセキュリティ関連要件を要件ベースラインへ確定記述する
- Quality: applicable + change: goal-spec acceptance 3 件 (工程遷移 admin 限定 + 監査記録・公開工程と PublishRequest の整合・axe 違反 0/CWV good) と quality_constraints 6 件を machine-verifiable な受入基準として requirements-baseline.md に固定する
- Documentation: applicable + change: docs/features/feat-build-pipeline-board/requirements-baseline.md を新規作成する
- Operations: N/A: 工程操作監査運用の具体化は P09/P12 で行う。本 task は要件確定のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend (features/feat-build-pipeline-board.md architecture_refs の正本参照。D4/qa-021/qa-022/qa-023(B1/B9)/qa-024/qa-025(SEC2/SEC6)/B4/I2/I3 を含む)
- Deploy unit/environment: cloudflare-workers/hub (Hub は単一 Worker。本 task は要件確定のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は要件確定のみで、Build エンティティへの実変更を伴わない (実変更は P05/P08 で扱う)

## 成果物

- Produced artifacts: docs/features/feat-build-pipeline-board/requirements-baseline.md (要件ベースライン文書。purpose/goal/scope_in 4 件/scope_out 2 件/acceptance 3 件/quality_constraints 6 件の確定転記と qa-021(S13)/qa-022/qa-023(B1/B9)/qa-024/qa-025(SEC2/SEC6)/D4/B4/I2/I3 の紐付けを含む)
- Consumed artifacts: .dev-graph/staging/goal-spec.json, features/feat-build-pipeline-board.md, features/feat-build-pipeline-board.context.json, system-spec/ui-ux.md, system-spec/frontend.md, system-spec/backend.md, system-spec/database.md, system-spec/security.md, system-spec/00-requirements-definition.md, docs/backend-spec.md, docs/screen-inventory.md
- Write scope/touches: docs/features/feat-build-pipeline-board/requirements-baseline.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-build-pipeline-board-p01) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-build-pipeline-board-p01 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-build-pipeline-board-p01) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on が空のため他 task との着手順序制約はない。resource_scope (docs/features/feat-build-pipeline-board/requirements-baseline.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- publish 状態機械の再実装 (goal-spec scope_out。既存 I2/I3 を使う)
- 工程の自動遷移 (goal-spec scope_out。手動運用から開始)
- ステージボード共通部品自体の実装 (design system 共通部品。owner は feat-hub-foundation で、本 feature は消費のみ)
- AI 下書きキュー・ヒアリング intake の実装 (feat-hearing-intake の scope)
- 認証方式・role 体系の要件確定 (feat-auth-tenancy の scope)
- 実装コードの作成 (本 task は要件確定のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-build-pipeline-board/requirements-baseline.md に goal-spec acceptance 3 件と quality_constraints 6 件 (stage-transition-admin-audit-sec2-sec6-qa021, publish-stage-publishrequest-connect-no-dup-b4-i2-i3, build-entity-tenant-scope-d4-qa024, stage-board-shared-component-qa021-qa022, rest-zod-single-source-authz-mw-b1-qa023, approval-queue-authz-table-shared-b9-qa023) が過不足なく転記されていること

## Rollout and rollback

- Rollout: requirements-baseline.md を作成し、feature-package.json の source_feature_digest と一致することを確認してから P02 へ引き継ぐ
- Rollback trigger and steps: goal-spec と features/feat-build-pipeline-board.md の内容不一致が判明した場合、requirements-baseline.md を作成前状態 (ファイル未作成) に戻し、goal-spec 側の再確定を dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/ui-ux.md (qa-021 S13), system-spec/frontend.md (qa-022), system-spec/backend.md (qa-033), system-spec/database.md (qa-032), system-spec/security.md (qa-025 SEC2/SEC6), system-spec/00-requirements-definition.md (D4)
- Detailed authoritative source: docs/backend-spec.md (qa-031〜033。§2.3 builds/build_stage_events テーブル定義, §3.3 認可マトリクス, §3.8 監査対象, §4.4 builds API, §5.3 Build 状態機械), docs/screen-inventory.md (S13)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-build-pipeline-board
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: なし (P01 は本 package の起点 task)
