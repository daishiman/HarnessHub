# System task overlay: ドキュメント CMS 要件ベースライン確定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-docs-cms (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-docs-cms", "studio-extension", "docs-cms", "requirements-baseline"]
- related_nodes: ["feat-docs-cms", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
- parent_feature: feat-docs-cms
- phase_ref: P01
- classification: confidence=0.92, reason="goal-spec (goal-spec.json) と features/feat-docs-cms.md の purpose/goal/scope/acceptance/quality_constraints を要件ベースラインへ確定転記する P01 タスク", candidates=[{artifact_kind: task, confidence: 0.92, candidate_path: tasks/feat-docs-cms/sys-docs-cms-p01.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

feat-docs-cms の受入可能な要件ベースラインを確定し、以降の P02 以降の全 task が同一の合意事項 (common/tenant スコープの Doc エンティティ・S15 の閲覧/編集 UI・D5 pull 型 AI 下書きキュー・8 件の quality_constraints) を参照できる状態にする。この task 完了時点で、goal-spec の purpose/goal/scope_in/scope_out/acceptance/quality_constraints が machine-verifiable な baseline 文書として固定される。

## 背景

Harness Studio mockup 反映 (I13, qa-021 S15) により、ドキュメント CMS は利用ガイド・FAQ 等を common (全テナント共有) / tenant (テナント限定) スコープで管理する S15 (一覧/閲覧/編集。編集は admin 限定) と、D5 pull 型 AI キューによる下書き生成を確立する feature として確定した (features/feat-docs-cms.md, confirmation_status=confirmed)。backend 実装は qa-023 の B7 (ドキュメント CMS は common/tenant スコープ) と、新規 REST 資源群を zod 単一ソースへ追加し認可単一ミドルウェア (deny-by-default) 配下に置く方針 (qa-023 B1) に従う。全新規テーブルには tenant_id/workspace_id スコープ列が必須であり (D4, qa-024)、doc 本文の Markdown は design system の共通レンダラの sanitize で XSS を一括担保する (qa-025 SEC7、qa-021/qa-022 の共通部品方針)。doc 編集操作は SEC6 で追加確定された監査対象に含まれる。AI 下書き生成 (I13) の pull/書戻し認可は Device Flow token 保有者に限定し、job payload に secret を含めない (qa-025 SEC8)。本 task は、実装に入る前にこれらの確定要件を再解釈や欠落なく baseline 化し、後続タスクの手戻りを防ぐ。

## 前提条件

- Macro entry gate: `parent_feature.depends_on all done|closed`。canonical parent feature の現行depends_onを都度評価し、task edgeへ複製しない。

- Required spec/architecture/phase/task nodes: feat-docs-cms, arch-harness-hub-frontend, arch-harness-hub-backend
- Entry gate: goal-spec.json の feature_context_digest が sha256:6e8ea8a7a1042002d0bb0b3ff2a2b3464ea4a45ba77ddea709580cc3bed03d34 に一致し、features/feat-docs-cms.md の confirmation_status が confirmed であること。evaluation_status は本 task package 生成時点で pending であり、system-dev-plan-evaluator による C12 PASS 判定と C11 promotion を経て解決する
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は要件文書化のみで frontend 実装物 (S15 画面) を変更しない。frontend 要件の具体化は P02 設計・P05 実装で行う
- Backend: N/A: 本 task は要件文書化のみで backend 実装物 (Doc REST 資源・AI 下書きキュー投入/受領 API) を変更しない
- API: N/A: API 契約の置き場と形状の確定は P02 の workstream 設計で行う。本 task は要件記述のみ
- Data: N/A: Doc エンティティ (scope=common/tenant・tenant_id/workspace_id スコープ列) のカラム定義詳細設計は P02 で行う (qa-024: カラム定義の詳細設計は各 feature の P02 で行う)。本 task は要件記述のみ
- Infrastructure: N/A: デプロイ単位・CI/CD は feat-hub-foundation が既に確立しており、本 feature は追加インフラを新設しない
- Security: applicable + change: tenant-scope-d4-doc-entity・markdown-sanitize-sec7-doc・doc-edit-audit-sec6・ai-queue-pull-type-d5-doc-draft・ai-queue-authz-payload-secret-ban・doc-edit-admin-only-qa021-sec2 の 6 件のセキュリティ関連要件を要件ベースラインへ確定記述する
- Quality: applicable + change: goal-spec acceptance 3 件 (tenant スコープ doc の分離・Markdown XSS sanitize・編集操作の監査記録) と quality_constraints 8 件を machine-verifiable な受入基準として requirements-baseline.md に固定する
- Documentation: applicable + change: docs/features/feat-docs-cms/requirements-baseline.md を新規作成する
- Operations: N/A: AI キュー滞留監視・通知運用の具体化は P09/P12 で行う。本 task は要件確定のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend (features/feat-docs-cms.md architecture_refs の正本参照。D4/D5/qa-021/qa-022/qa-023(B7)/qa-024/qa-025 を含む)
- Deploy unit/environment: cloudflare-workers/hub (Hub は単一 Worker。本 task は要件確定のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は要件確定のみで、Doc エンティティへの実変更を伴わない (実変更は P05/P08 で扱う)

## 成果物

- Produced artifacts: docs/features/feat-docs-cms/requirements-baseline.md (要件ベースライン文書。purpose/goal/scope_in/scope_out/acceptance 3 件/quality_constraints 8 件の確定転記と qa-021(S15)/qa-022/qa-023(B1/B7)/qa-024/qa-025(SEC2/SEC6/SEC7/SEC8)/D4/D5/I13 の紐付けを含む)
- Consumed artifacts: goal-spec.json, features/feat-docs-cms.md, features/feat-docs-cms.context.json, system-spec/ui-ux.md, system-spec/frontend.md, system-spec/backend.md, system-spec/database.md, system-spec/security.md, system-spec/00-requirements-definition.md, docs/shared-layers.md, docs/screen-inventory.md
- Write scope/touches: docs/features/feat-docs-cms/requirements-baseline.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-docs-cms-p01) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-docs-cms-p01 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-docs-cms-p01) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on が空のため他 task との着手順序制約はない。resource_scope (docs/features/feat-docs-cms/requirements-baseline.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 外部公開サイト生成 (goal-spec scope_out)
- バージョン管理 (Git 連携) (goal-spec scope_out)
- Markdown レンダラ/エディタ部品の実装 (design system 共通部品。owner は feat-hub-foundation で、本 feature は消費のみ)
- AI 実行基盤のサーバ側実装 (D5 で不採用。goal-spec scope_out)
- 認証方式・role 体系の要件確定 (feat-auth-tenancy の scope)
- 実装コードの作成 (本 task は要件確定のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-docs-cms/requirements-baseline.md に goal-spec acceptance 3 件と quality_constraints 8 件 (tenant-scope-d4-doc-entity, markdown-sanitize-sec7-doc, markdown-common-component-qa021-qa022, doc-edit-audit-sec6, ai-queue-pull-type-d5-doc-draft, ai-queue-authz-payload-secret-ban, doc-edit-admin-only-qa021-sec2, b7-zod-single-source-authz-mw) が過不足なく転記されていること

## Rollout and rollback

- Rollout: requirements-baseline.md を作成し、feature-package.json の source_feature_digest と一致することを確認してから P02 へ引き継ぐ
- Rollback trigger and steps: goal-spec と features/feat-docs-cms.md の内容不一致が判明した場合、requirements-baseline.md を作成前状態 (ファイル未作成) に戻し、goal-spec 側の再確定を dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-docs-cms.context.json` (`sha256:6e8ea8a7a1042002d0bb0b3ff2a2b3464ea4a45ba77ddea709580cc3bed03d34`)
- Phase responsibility: 現行 context の purpose・goal・scope・acceptance を要件ベースラインへ全件固定する。
- Purpose: 利用ガイド・FAQ 等のドキュメントを common (全テナント) / tenant (テナント限定) スコープで管理し (B7/I13)、S15 の閲覧/編集 UI と D5 pull 型 AI キューによる下書き生成を提供する
- Goal: ドキュメントがスコープ規則 (tenant 分離 + common 共有) 下で閲覧・編集でき、Markdown が sanitize 済みで描画され (SEC7)、AI 下書きがキュー経由で生成される状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- Doc エンティティ (scope=common/tenant・Markdown 本文)
- S15 一覧/閲覧/編集 (編集は admin)
- Markdown レンダラ + エディタ共通部品の消費 (XSS sanitize)
- AI 下書き生成 (D5 キュー)
- doc 編集の監査 event (SEC6)
- Scope out:
- 外部公開サイト生成
- バージョン管理 (Git 連携)
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- tenant スコープ doc が他テナントから参照できない (分離テスト)
- Markdown 描画で XSS が sanitize される (テスト付き)
- 編集操作が監査 event に記録される
- Architecture/source refs:
- architecture/harness-hub-frontend.md
- architecture/harness-hub-backend.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## 参照情報

- System specification: system-spec/ui-ux.md (qa-021 S15), system-spec/frontend.md (qa-022), system-spec/backend.md (qa-023 B1/B7), system-spec/database.md (qa-024), system-spec/security.md (qa-025 SEC2/SEC6/SEC7/SEC8), system-spec/00-requirements-definition.md (D4, D5, I13)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-docs-cms
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: なし (P01 は本 package の起点 task)
