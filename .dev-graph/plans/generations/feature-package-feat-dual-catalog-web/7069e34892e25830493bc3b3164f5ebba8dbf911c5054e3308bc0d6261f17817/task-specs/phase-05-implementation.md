# System task overlay: 実装 — S01/S02/S03/S04画面実装・marketplace.json出力パイプライン・配布経路連携・axe CI組込・CWVバンドル最適化・ポーリング実装

## Machine-readable registration fields

- feature_package_id: feature-package/feat-dual-catalog-web (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-dual-catalog-web", "macro-feature", "frontend", "implementation"]
- related_nodes: ["feat-dual-catalog-web", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
- parent_feature: feat-dual-catalog-web
- phase_ref: P05
- classification: confidence=0.86, reason="S01(一覧)/S02(詳細・導入)/S03(公開状態ポーリング表示)/S04(Workspace設定・Release履歴読取)の画面実装、marketplace.json出力パイプライン、採用配布経路連携、axe CI組込、CWVバンドル最適化、ポーリング(2s→backoff)実装を行うP05実装タスク", candidates=[{artifact_kind: task, confidence: 0.86, candidate_path: tasks/feat-dual-catalog-web/sys-dual-catalog-web-p05.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P04 で設計したテストケースに対応する実装を行い、S01(業務ツール一覧・Workspace Catalog)/S02(業務ツール詳細・版管理・インストール)/S03(公開状態・修正内容のポーリング表示)/S04(Workspace設定・Release履歴の読取表示)の画面、marketplace.json 出力パイプライン、採用配布経路連携、axe CI 組込、CWV バンドル最適化、install descriptor 取得とポーリング (2 秒間隔からの backoff) を実装する。

## 背景

apps/hub は単一の Next.js App Router アプリであり、packages/ui の shadcn/ui ベース共有コンポーネントと packages/schemas の zod スキーマを利用する規約になっている (docs/frontend-spec.md)。本 task では、S01-S04 の画面コンポーネントを apps/hub/src/app/(workspace)/catalog/ 配下と apps/hub/src/components/catalog/ 配下に実装し、install descriptor 取得とポーリングロジックを apps/hub/src/lib/catalog/ に実装する。marketplace.json はビルド時または API Route Handler (apps/hub/src/app/marketplace.json/route.ts) として出力し、feat-stage0-distribution-gate が確定した採用配布経路 (URL 型 marketplace または Bootstrap Installer) へ連携する。axe 自動チェックは .github/workflows/hub-web-quality-gate.yml として CI に組み込み、CWV バンドル予算 (First Load JS 250KB/route 以下) は dynamic import によるルート分割で達成する。本 task はテナント分離 (deny-by-default) を catalog 閲覧・install descriptor 消費経路に一貫適用し、Hub 側 API (feat-publish-pipeline 所有) の状態変更ロジックは再実装しない。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-dual-catalog-web, arch-harness-hub-frontend, arch-harness-hub-backend
- Entry gate: P04 (docs/features/feat-dual-catalog-web/test-design.md, apps/hub/src/__tests__/dual-catalog-web/) が作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: apps/hub/src/app/(workspace)/catalog/, apps/hub/src/components/catalog/ にS01-S04画面を実装する
- Backend: N/A: PublishRequest 状態機械・検査 pipeline サーバ側実装は feat-publish-pipeline が所有し本 task は変更しない。本 task は marketplace.json 出力用 Route Handler (読み取り専用) のみを実装する
- API: applicable + contract: install descriptor 消費・ポーリング処理を apps/hub/src/lib/catalog/ に実装する
- Data: N/A: 本 feature は独自ドメインテーブルを新設しない
- Infrastructure: applicable + IaC/deploy: .github/workflows/hub-web-quality-gate.yml に axe/Lighthouse CI ゲートを追加する
- Security: applicable + control: catalog 閲覧・install descriptor 消費経路にテナント分離 (deny-by-default) を適用する
- Quality: applicable + change: axe CI 組込、CWV バンドル予算 (dynamic import 分割) を実装する
- Documentation: applicable + change: docs/features/feat-dual-catalog-web/implementation-notes.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend (P02 architecture-decision-record.md を実装へ反映する)
- Deploy unit/environment: cloudflare-workers/hub (apps/hub は @opennextjs/cloudflare 経由で単一 Cloudflare Worker としてデプロイされる)
- Compatibility/migration/backfill: N/A: 本 feature は新規実装でありデータ移行を伴わない

## 成果物

- Produced artifacts: apps/hub/src/app/(workspace)/catalog/, apps/hub/src/components/catalog/, apps/hub/src/lib/catalog/, apps/hub/src/app/marketplace.json/route.ts, packages/schemas/dual-catalog-web/, .github/workflows/hub-web-quality-gate.yml, docs/features/feat-dual-catalog-web/implementation-notes.md
- Consumed artifacts: docs/features/feat-dual-catalog-web/test-design.md, docs/features/feat-dual-catalog-web/architecture-decision-record.md, packages/ui, packages/schemas
- Write scope/touches: apps/hub/src/app/(workspace)/catalog/, apps/hub/src/components/catalog/, apps/hub/src/lib/catalog/, apps/hub/src/app/marketplace.json/route.ts, packages/schemas/dual-catalog-web/, .github/workflows/hub-web-quality-gate.yml, docs/features/feat-dual-catalog-web/implementation-notes.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-dual-catalog-web-p05) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-dual-catalog-web-p05 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-dual-catalog-web-p05) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DUAL-CATALOG-WEB-P04] であり P04 完了後に着手する。resource_scope (apps/hub/src/app/(workspace)/catalog/, apps/hub/src/components/catalog/, apps/hub/src/lib/catalog/) が feat-publish-pipeline 等の他 feature の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- PublishRequest 状態機械・検査 pipeline サーバ側実装 (owner=feat-publish-pipeline)
- 単一認可ミドルウェアの実装 (owner=feat-auth-tenancy。本 feature は既存ミドルウェアを消費するのみ)
- 承認キュー UI (Stage 2 Governance)・native アプリ
- URL 型 marketplace / Bootstrap Installer の技術的成立判定そのもの (owner=feat-stage0-distribution-gate)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: apps/hub/src/app/(workspace)/catalog/, apps/hub/src/components/catalog/, apps/hub/src/lib/catalog/, apps/hub/src/app/marketplace.json/route.ts, packages/schemas/dual-catalog-web/, .github/workflows/hub-web-quality-gate.yml が実装され、P04 の test-design.md に列挙された全テストケースに対応する実装対象が揃っていること

## Rollout and rollback

- Rollout: 実装完了後、implementation-notes.md に実装差分を記録し P06 (テスト実行) へ引き継ぐ
- Rollback trigger and steps: 実装が P02 の architecture decision と矛盾する場合、該当コードを削除し P02 の設計に沿って再実装する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-dual-catalog-web.context.json` (`sha256:a0c5f78ef31fc345184884f4f48f60b0c9b2e5beaae7d9a83c0f789d13a6e9d3`)
- Phase responsibility: P04 を先行条件として現行 scope_in を実装し、scope_out を混入させない。
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

- System specification: system-spec/spec-state.json qa_log (qa-003, qa-009, qa-011, qa-018, qa-062)
- Detailed authoritative source: docs/frontend-spec.md, docs/backend-spec.md
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-dual-catalog-web
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-DUAL-CATALOG-WEB-P04
