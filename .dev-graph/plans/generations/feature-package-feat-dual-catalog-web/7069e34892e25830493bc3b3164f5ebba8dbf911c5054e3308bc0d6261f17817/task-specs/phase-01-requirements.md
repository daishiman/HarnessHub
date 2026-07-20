# System task overlay: 要件ベースライン確定 — dual catalog UI(Workspace Catalog)・publish状況表示ポーリング・marketplace.json出力・axe/CWV品質ゲートの要件確定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-dual-catalog-web (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-dual-catalog-web", "macro-feature", "documentation", "requirements-baseline"]
- related_nodes: ["feat-dual-catalog-web", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
- parent_feature: feat-dual-catalog-web
- phase_ref: P01
- classification: confidence=0.87, reason="goal-spec (goal-spec.json) の purpose/goal/scope_in/scope_out/acceptance/quality_constraints を要件ベースラインへ確定転記する P01 タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-dual-catalog-web/sys-dual-catalog-web-p01.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

feat-dual-catalog-web の受入可能な要件ベースラインを確定し、以降の P02 以降の全 task が同一の合意事項 (dual catalog 閲覧 UI のレスポンシブ実装、publish 状況表示のポーリング方式、marketplace.json 出力と採用配布経路連携、axe 自動チェック CI、CWV 計測) を参照できる状態にする。この task 完了時点で、goal-spec の purpose/goal/scope_in 5 件/scope_out 2 件/acceptance 3 件/quality_constraints 7 件が machine-verifiable な baseline 文書として固定される。

## 背景

Harness Hub の Stage 1: Publisher + Thin Dual Catalog MVP (U7) のうち、Workspace Catalog を担うのが本 feature である (I4)。業務ツール一覧・詳細・「追加する」「Web アプリを開く」導線・低品質報告導線を提供し、承認キュー UI (Stage 2 Governance) と native アプリはスコープ外とする。品質面では WCAG 2.2 AA (コントラスト比 4.5:1 以上・全機能キーボード操作可・スクリーンリーダー対応・フォーカス管理・代替テキスト) に準拠し、axe 等の自動アクセシビリティチェックを CI に組み込み検出可能違反ゼロをリリース条件とする。速度は Core Web Vitals 全指標 good (LCP 2.5 秒以下 / INP 200 ミリ秒以下 / CLS 0.1 以下) を Worker bundle 予算・R2/edge 配信・不要 JS 削減で達成する (qa-018)。publish 状況表示は Hub API が保持する PublishRequest 状態機械 (Draft→Validating→Needs Fix/Ready→Publishing→Failed/Published) の状態を、install descriptor (GET /harnesses/:projectId/install) 取得と publish 中 2 秒間隔からの backoff ポーリングで取得し画面へ反映する (qa-009, qa-062)。配布・更新経路は URL 型 marketplace (native source) または Bootstrap Installer の 2 経路を Stage 0 technical gate (H3/H6/H7) が検証済みであり、本 feature はその判定結果 (feat-stage0-distribution-gate が所有) に従い marketplace.json を出力し採用経路へ連携する (qa-003, I6, I9)。Hub 本体の障害・停止時にも導入済み Skill と公開済み Web App は動作を継続する縮退設計 (§6.1) が acceptance の直接根拠である (qa-011)。2 社以上の顧客 Workspace が Hub 上で同時稼働し、それぞれの Workspace で公開・再利用が成立していることが成功基準 (U5) となる。

本 task は上記の確定要件を再解釈や欠落なく baseline 化するとともに、goal-spec の quality_constraints には含まれない cross-feature 境界の未確定事項を上流未解決事項として本 baseline に明記し、P02 の必須解消事項として引き継ぐ。具体的には、Hub 側 API の PublishRequest 状態機械・検査 pipeline サーバ側実装・Catalog pointer atomic 更新は feat-publish-pipeline の責務であり、本 feature は同 API/状態を消費する catalog 閲覧・publish 状況表示 (読み取り + ポーリング) 側に責務を限定する。また marketplace.json の出力先として採用する配布経路 (URL 型 marketplace か Bootstrap Installer か) の技術的成立判定自体は feat-stage0-distribution-gate が所有し、本 feature はその決定結果を消費するのみで再判定は行わない。この 2 つの境界を P02 で architecture decision として確定する。

## 前提条件

- Macro entry gate: `parent_feature.depends_on all done|closed`。canonical parent feature の現行depends_onを都度評価し、task edgeへ複製しない。

- Required spec/architecture/phase/task nodes: feat-dual-catalog-web, arch-harness-hub-frontend, arch-harness-hub-backend
- Entry gate: goal-spec.json の feature_context_digest が sha256:a0c5f78ef31fc345184884f4f48f60b0c9b2e5beaae7d9a83c0f789d13a6e9d3 に一致し、features/feat-dual-catalog-web.md の confirmation_status が confirmed であること。evaluation_status は本 task package 生成時点で pending であり、system-dev-plan-evaluator による C12 PASS 判定と C11 promotion を経て解決する
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は要件文書化のみで frontend 実装物を変更しない (S01-S04 の画面実装詳細は P02 以降で確定する)
- Backend: N/A: 本 task は要件文書化のみで backend 実装物を変更しない (install descriptor・publish 状況 API 自体は feat-publish-pipeline が所有し、本 feature は消費のみ)
- API: N/A: install descriptor 取得契約・ポーリング間隔の詳細は P02 で定義する。本 task は要件記述のみ
- Data: N/A: 本 feature はカタログ表示・marketplace.json 出力のみを行い、独自のドメインテーブルを新設しない
- Infrastructure: N/A: Cloudflare Workers デプロイ単位は feat-hub-foundation が既に確立しており、本 feature は追加インフラを新設しない
- Security: applicable + change: a11y-wcag22aa-cwv-good-axe-ci-qa018・hub-outage-degradation-continuity-section6-1-qa011・publish-status-polling-state-machine-qa009-qa062・distribution-channel-url-marketplace-bootstrap-installer-qa003-i6-i9・workspace-catalog-thin-dual-catalog-stage1-mvp-i4-u7・multi-tenant-simultaneous-workspaces-success-criteria-u5・publish-pipeline-server-side-out-of-scope-depends-on-feat-publish-pipeline の 7 件の quality_constraints を要件ベースラインへ確定記述する
- Quality: applicable + change: goal-spec acceptance 3 件と quality_constraints 7 件を machine-verifiable な受入基準として requirements-baseline.md に固定する。feat-publish-pipeline・feat-stage0-distribution-gate との境界を P02 必須解消事項として明記する
- Documentation: applicable + change: docs/features/feat-dual-catalog-web/requirements-baseline.md を新規作成する
- Operations: N/A: 障害時縮退 runbook の具体化は P12 で行う。本 task は要件確定のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend (features/feat-dual-catalog-web.md architecture_refs の正本参照。I4/I6/I9/U5/U7 と qa-003/qa-009/qa-011/qa-018/qa-062 を含む)
- Deploy unit/environment: cloudflare-workers/hub (apps/hub は Hub Worker にバンドルされる。本 task は要件確定のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は要件確定のみで実コードへの変更を伴わない (実変更は P05 で扱う)

## 成果物

- Produced artifacts: docs/features/feat-dual-catalog-web/requirements-baseline.md (要件ベースライン文書。purpose/goal/scope_in 5 件/scope_out 2 件/acceptance 3 件/quality_constraints 7 件の確定転記、および feat-publish-pipeline・feat-stage0-distribution-gate との cross-feature 境界を P02 必須解消事項として明記した記載を含む)
- Consumed artifacts: goal-spec.json, features/feat-dual-catalog-web.md, features/feat-dual-catalog-web.context.json, architecture/harness-hub-frontend.md, architecture/harness-hub-backend.md, specs/harness-hub-system-specification.md
- Write scope/touches: docs/features/feat-dual-catalog-web/requirements-baseline.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-dual-catalog-web-p01) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-dual-catalog-web-p01 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-dual-catalog-web-p01) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on が空のため他 task との着手順序制約はない。resource_scope (docs/features/feat-dual-catalog-web/requirements-baseline.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 承認キュー UI (Stage 2 Governance。owner=feat-workspace-governance 相当の将来 feature)
- native アプリ (Stage 1 スコープ外)
- PublishRequest 状態機械・検査 pipeline サーバ側実装・Catalog pointer atomic 更新 (owner=feat-publish-pipeline)
- URL 型 marketplace / Bootstrap Installer の技術的成立判定そのもの (owner=feat-stage0-distribution-gate。本 feature は判定結果を消費するのみ)
- 実装コードの作成 (本 task は要件確定のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-dual-catalog-web/requirements-baseline.md に goal-spec acceptance 3 件と quality_constraints 7 件 (a11y-wcag22aa-cwv-good-axe-ci-qa018, hub-outage-degradation-continuity-section6-1-qa011, publish-status-polling-state-machine-qa009-qa062, distribution-channel-url-marketplace-bootstrap-installer-qa003-i6-i9, workspace-catalog-thin-dual-catalog-stage1-mvp-i4-u7, multi-tenant-simultaneous-workspaces-success-criteria-u5, publish-pipeline-server-side-out-of-scope-depends-on-feat-publish-pipeline) が過不足なく転記されていること

## Rollout and rollback

- Rollout: requirements-baseline.md を作成し、feature-package.json の source_feature_digest と一致することを確認してから P02 へ引き継ぐ
- Rollback trigger and steps: goal-spec と features/feat-dual-catalog-web.md の内容不一致が判明した場合、requirements-baseline.md を作成前状態 (ファイル未作成) に戻し、goal-spec 側の再確定を dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-dual-catalog-web.context.json` (`sha256:a0c5f78ef31fc345184884f4f48f60b0c9b2e5beaae7d9a83c0f789d13a6e9d3`)
- Phase responsibility: 現行 context の purpose・goal・scope・acceptance を要件ベースラインへ全件固定する。
- Purpose: 利用者・管理者が Skill/WebApp を発見・導入できる dual catalog UI と配布出口 (marketplace 出力 / Bootstrap Installer 連携) を、WCAG 2.2 AA + CWV good (qa-018) の品質で提供する
- Goal: 2 社の顧客 Workspace が同時にカタログを閲覧・導入でき (U5)、a11y/速度の品質ゲートが CI で強制される状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- dual catalog 閲覧 UI (レスポンシブ)
- publish 状況表示 (ポーリング)
- marketplace.json 出力 + 採用配布経路連携
- axe 自動チェック CI
- CWV 計測 (LCP/INP/CLS)
- Scope out:
- 承認キュー UI (Stage 2)
- native アプリ
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- axe 検出可能違反 0 がリリース条件として CI に存在する
- CWV 全指標 good を実測で満たす
- 導入済み Skill が Hub 停止中も動作継続する (§6.1 縮退)
- Architecture/source refs:
- architecture/harness-hub-frontend.md
- architecture/harness-hub-backend.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## 参照情報

- System specification: system-spec/00-requirements-definition.md (U5, U7, I4, I6, I9), system-spec/spec-state.json qa_log (qa-003, qa-009, qa-011, qa-018, qa-062)
- Detailed authoritative source: system-spec/frontend.md (§ dual catalog UI・ポーリング契約), system-spec/backend.md (§ PublishRequest 状態機械)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-dual-catalog-web
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: なし (P01 は本 package の起点 task)
