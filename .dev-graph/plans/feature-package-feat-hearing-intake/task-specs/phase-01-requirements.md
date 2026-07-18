# System task overlay: ヒアリング intake 要件ベースライン確定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hearing-intake (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-hearing-intake", "studio-extension", "async-ai-queue", "requirements-baseline"]
- related_nodes: ["feat-hearing-intake", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
- parent_feature: feat-hearing-intake
- phase_ref: P01
- classification: confidence=0.92, reason="goal-spec (.dev-graph/staging/goal-spec.json) と features/feat-hearing-intake.md の purpose/goal/scope/acceptance/quality_constraints を要件ベースラインへ確定転記する P01 タスク", candidates=[{artifact_kind: task, confidence: 0.92, candidate_path: tasks/feat-hearing-intake/sys-hearing-intake-p01.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

feat-hearing-intake の受入可能な要件ベースラインを確定し、以降の P02 以降の全 task が同一の合意事項 (S10-S12 のスコープ・受入基準・10 件の quality_constraints) を参照できる状態にする。この task 完了時点で、goal-spec の purpose/goal/scope_in/scope_out/acceptance/quality_constraints が machine-verifiable な baseline 文書として固定される。

## 背景

Harness Studio mockup 反映 (I11, J4) により、ヒアリング intake は S10 の 4 ステップウィザード (削減効果の自動試算表示)・受付番号採番・D5 pull 型 AI キューによるヒアリングシート生成・S11/S12 のシート管理を確立する feature として確定した (features/feat-hearing-intake.md, confirmation_status=confirmed)。backend 実装は qa-023 の B1 (新規 REST 資源を zod 単一ソースへ追加し認可 MW 配下に置く) と B5 (AI 処理キューは D5 確定の pull 型) として確定しており、AI キューの pull/書戻し認可は Device Flow token 保有者に限定し job payload に secret を含めない (qa-025 SEC8)。試算表示はサーバ計算値の表示専用でありクライアント側の再計算・自己申告を行わない (qa-025 SEC5)。シート本文の Markdown は共通レンダラの sanitize で描画する (qa-025 SEC7)。認証方式 (D3) と role 体系 (qa-005) はいずれも本 feature の scope_out であり、feat-auth-tenancy が確立した基盤をそのまま利用する。本 task は、実装に入る前にこれらの確定要件を再解釈や欠落なく baseline 化し、後続タスクの手戻りを防ぐ。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hearing-intake, arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data
- Entry gate: .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:d186363b613242215867a3dabda3c9a25690f884d363ae23de6d492538a09507 に一致し、features/feat-hearing-intake.md の confirmation_status が confirmed であること。evaluation_status は本 task package 生成時点で pending であり、system-dev-plan-evaluator による C12 PASS 判定と C11 promotion を経て解決する
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は要件文書化のみで frontend 実装物 (S10-S12 画面) を変更しない。frontend 要件の具体化は P02 設計・P05 実装で行う
- Backend: N/A: 本 task は要件文書化のみで backend 実装物 (受付番号採番/AI キュー投入・受領 API) を変更しない
- API: N/A: API 契約の置き場と形状の確定は P02 の workstream 設計で行う。本 task は要件記述のみ
- Data: N/A: HearingSheet/FormData/AiJob (hearing kind) のカラム定義詳細設計は P02 で行う (qa-024: カラム定義の詳細設計は各 feature の P02 で行う)。本 task は要件記述のみ
- Infrastructure: N/A: デプロイ単位・CI/CD は feat-hub-foundation が既に確立しており、本 feature は追加インフラを新設しない
- Security: applicable + change: async-ui-pattern-hearing-wizard・ai-queue-pull-type-d5・ai-queue-authz-payload-secret-ban (SEC8)・markdown-sanitize-sec7・estimate-server-computed-only (SEC5) の 5 件のセキュリティ関連要件を要件ベースラインへ確定記述する
- Quality: applicable + change: goal-spec acceptance 3 件 (受付番号発番+生成中状態表示 / AI キュー pull→書戻し完結でサーバ側課金なし / Markdown sanitize 済み描画) と quality_constraints 10 件を machine-verifiable な受入基準として requirements-baseline.md に固定する
- Documentation: applicable + change: docs/features/feat-hearing-intake/requirements-baseline.md を新規作成する
- Operations: N/A: AI キュー滞留監視・通知運用の具体化は P09/P12 で行う。本 task は要件確定のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data (D4/D5/qa-021/qa-022/qa-023/qa-024/qa-025 の正本参照)
- Deploy unit/environment: cloudflare-workers/hub (Hub は単一 Worker。本 task は要件確定のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は要件確定のみで、HearingSheet/FormData/AiJob (hearing kind) への実変更を伴わない (実変更は P05/P08 で扱う)

## 成果物

- Produced artifacts: docs/features/feat-hearing-intake/requirements-baseline.md (要件ベースライン文書。purpose/goal/scope_in/scope_out/acceptance 3 件/quality_constraints 10 件の確定転記と qa-021/qa-022/qa-023(B1/B5)/qa-024/qa-025(SEC2/SEC5/SEC7/SEC8)/D4/D5/I11 の紐付けを含む)
- Consumed artifacts: .dev-graph/staging/goal-spec.json, features/feat-hearing-intake.md, features/feat-hearing-intake.context.json, system-spec/ui-ux.md, system-spec/frontend.md, system-spec/backend.md, system-spec/database.md, system-spec/security.md, system-spec/00-requirements-definition.md, docs/shared-layers.md, docs/screen-inventory.md, docs/user-journeys.md
- Write scope/touches: docs/features/feat-hearing-intake/requirements-baseline.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hearing-intake-p01) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hearing-intake-p01 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-hearing-intake-p01) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on が空のため他 task との着手順序制約はない。resource_scope (docs/features/feat-hearing-intake/requirements-baseline.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- AI 実行基盤のサーバ側実装 (D5 で不採用。goal-spec scope_out)
- 構築工程の進行管理 (feat-build-pipeline-board。goal-spec scope_out)
- 試算エンジン本体 (annualHours・分/回・削減率を用いた実際の削減額計算) の要件確定 (owner 未確定の上流論点。本 feature は TenantCoefficient 係数の読取消費のみを要件とする)
- 認証方式・role 体系の要件確定 (feat-auth-tenancy の scope)
- 実装コードの作成 (本 task は要件確定のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-hearing-intake/requirements-baseline.md に goal-spec acceptance 3 件と quality_constraints 10 件 (async-ui-pattern-hearing-wizard, ai-queue-pull-type-d5, ai-queue-authz-payload-secret-ban, markdown-sanitize-sec7, tenant-scope-d4-new-entities, hearing-sheet-entities-and-receipt-number, wizard-common-component-qa022, estimate-server-computed-only, b1-zod-single-source-authz-mw, authz-single-mw-role-table) が過不足なく転記されていること

## Rollout and rollback

- Rollout: requirements-baseline.md を作成し、feature-package.json の source_feature_digest と一致することを確認してから P02 へ引き継ぐ
- Rollback trigger and steps: goal-spec と features/feat-hearing-intake.md の内容不一致が判明した場合、requirements-baseline.md を作成前状態 (ファイル未作成) に戻し、goal-spec 側の再確定を dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/ui-ux.md (qa-021), system-spec/frontend.md (qa-022), system-spec/backend.md (qa-023 B1/B5), system-spec/database.md (qa-024), system-spec/security.md (qa-025 SEC2/SEC5/SEC7/SEC8), system-spec/00-requirements-definition.md (D4, D5, I11)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-data (architecture/harness-hub-data.md)
- Feature: feat-hearing-intake
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: なし (P01 は本 package の起点 task)
