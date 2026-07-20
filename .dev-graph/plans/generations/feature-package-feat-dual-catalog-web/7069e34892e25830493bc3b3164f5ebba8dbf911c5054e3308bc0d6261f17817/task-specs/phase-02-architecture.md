# System task overlay: アーキテクチャ設計 — S01/S02/S03/S04画面構成・install descriptor取得・ポーリング契約・marketplace.json生成方式・CWVバンドル予算の決定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-dual-catalog-web (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-dual-catalog-web", "macro-feature", "frontend", "architecture-decision"]
- related_nodes: ["feat-dual-catalog-web", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
- parent_feature: feat-dual-catalog-web
- phase_ref: P02
- classification: confidence=0.85, reason="S01(一覧)/S02(詳細)/S03(公開状態表示)/S04(Workspace設定・Release履歴の読取表示)の画面構成、install descriptor取得とポーリング契約、marketplace.json生成方式、CWVバンドル予算を確定するP02アーキテクチャ設計タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-dual-catalog-web/sys-dual-catalog-web-p02.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P01 requirements-baseline.md で確定した要件をもとに、S01(業務ツール一覧・Workspace Catalog)/S02(業務ツール詳細・版管理・インストール)/S03(公開状態・修正内容のポーリング表示)/S04(Workspace設定・Release履歴の読取表示)の画面構成と状態管理境界、install descriptor (GET /harnesses/:projectId/install) の消費方式、publish 中 2 秒間隔からの backoff ポーリング実装方式、marketplace.json 生成パイプラインの方式、CWV バンドル予算 (dynamic import 分割方針) の 4 系統の architecture decision を確定する。この task 完了時点で、P01 が引き継いだ feat-publish-pipeline・feat-stage0-distribution-gate との cross-feature 境界が解消され、P05 実装が着手可能な設計状態になる。

## 背景

docs/screen-inventory.md では S01(プラグイン Hub 一覧, feat-dual-catalog-web + feat-publisher-plugin, P2)・S02(業務ツール詳細/版管理/インストール, feat-dual-catalog-web, P2)・S03(公開状態・修正内容, feat-dual-catalog-web[表示]+feat-publish-pipeline[状態], P2)・S04(Workspace設定・Release履歴, feat-dual-catalog-web + governance拡張, P2) が本 feature の画面範囲として定義されている。docs/frontend-spec.md では apps/hub を単一 Next.js App Router アプリ (UI + API Route Handlers) とし、packages/ui を shadcn/ui ベースの共有コンポーネント、packages/schemas を zod 単一ソースとする規約が確定している。system-spec/frontend.md qa-062 により、S01/S02 のデータ取得は install descriptor (GET /harnesses/:projectId/install) と publish 中 2 秒間隔からの backoff ポーリングを用いることが確定している。marketplace.json の出力先経路 (URL 型 marketplace か Bootstrap Installer か) の技術的成立判定は feat-stage0-distribution-gate が Stage 0 technical gate (H7) で行い、本 feature はその決定結果を消費して marketplace.json を生成・出力する。CWV 予算については docs/frontend-spec.md にて First Load JS 250KB/route 以下 (CI 計測)・dynamic import によるルート分割が定められている。

本 task では、P01 で明記した 2 つの cross-feature 境界 (feat-publish-pipeline の PublishRequest 状態機械・検査 pipeline・Catalog pointer atomic 更新は本 feature が再実装しない、feat-stage0-distribution-gate の配布経路技術判定は本 feature が再判定しない) を architecture decision として明文化し、本 feature の実装範囲を「読み取り + ポーリングによる状態表示」と「marketplace.json 生成・出力」に確定する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-dual-catalog-web, arch-harness-hub-frontend, arch-harness-hub-backend
- Entry gate: P01 (docs/features/feat-dual-catalog-web/requirements-baseline.md) が作成済みであり、goal-spec の purpose/goal/scope_in/scope_out/acceptance/quality_constraints が baseline へ転記済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: S01-S04 の画面構成・コンポーネント境界・状態管理方式 (ポーリング状態を含む) を architecture-decision-record.md へ記述する
- Backend: N/A: 本 task は既存 install descriptor API・publish 状況 API (feat-publish-pipeline 所有) を消費する契約のみを確定し、backend 実装は行わない
- API: applicable + contract: install descriptor 取得契約 (GET /harnesses/:projectId/install) とポーリング間隔・backoff 契約を frontend 消費側の視点で確定する
- Data: N/A: 本 feature は独自ドメインテーブルを新設しない
- Infrastructure: applicable + IaC/deploy: marketplace.json 出力先パス・CDN/R2 配信経路 (feat-stage0-distribution-gate の判定結果消費) を確定する
- Security: applicable + control: テナント分離 (deny-by-default) を catalog 閲覧・install descriptor 消費経路に一貫適用する方針を確定する
- Quality: applicable + change: axe CI 組込方式・CWV バンドル予算 (First Load JS 250KB/route 以下) の測定方式を確定する
- Documentation: applicable + change: docs/features/feat-dual-catalog-web/architecture-decision-record.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend (I4/I6/I9/U5/U7 と qa-003/qa-009/qa-011/qa-018/qa-062 を含む)
- Deploy unit/environment: cloudflare-workers/hub (apps/hub は @opennextjs/cloudflare 経由で単一 Cloudflare Worker としてデプロイされる)
- Compatibility/migration/backfill: N/A: 本 task は新規 feature の設計確定であり既存データの互換性・移行は伴わない

## 成果物

- Produced artifacts: docs/features/feat-dual-catalog-web/architecture-decision-record.md (S01-S04 画面構成、install descriptor取得・ポーリング契約、marketplace.json生成方式、CWVバンドル予算の4系統 architecture decision)
- Consumed artifacts: docs/features/feat-dual-catalog-web/requirements-baseline.md, docs/frontend-spec.md, docs/screen-inventory.md, architecture/harness-hub-frontend.md
- Write scope/touches: docs/features/feat-dual-catalog-web/architecture-decision-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-dual-catalog-web-p02) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-dual-catalog-web-p02 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-dual-catalog-web-p02) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DUAL-CATALOG-WEB-P01] であり P01 完了後に着手する。resource_scope (docs/features/feat-dual-catalog-web/architecture-decision-record.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- PublishRequest 状態機械・検査 pipeline サーバ側実装 (owner=feat-publish-pipeline)
- URL 型 marketplace / Bootstrap Installer の技術的成立判定そのもの (owner=feat-stage0-distribution-gate)
- 承認キュー UI (Stage 2 Governance)・native アプリ
- 実装コードの作成 (本 task は設計確定のみ。実装は P05 で行う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-dual-catalog-web/architecture-decision-record.md に4系統 (画面構成/API契約/marketplace.json生成方式/CWV予算) の architecture decision が記載され、feat-publish-pipeline・feat-stage0-distribution-gate との境界が明記されていること

## Rollout and rollback

- Rollout: architecture-decision-record.md を作成し、P01 requirements-baseline.md との整合を確認してから P03 (独立設計レビュー) へ引き継ぐ
- Rollback trigger and steps: feat-publish-pipeline または feat-stage0-distribution-gate 側の API 契約・採用配布経路が本 task の前提と異なることが判明した場合、architecture decision を re-open し P02 を再実行する。再実行までは P03 以降の着手を保留する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-dual-catalog-web.context.json` (`sha256:a0c5f78ef31fc345184884f4f48f60b0c9b2e5beaae7d9a83c0f789d13a6e9d3`)
- Phase responsibility: 現行 architecture_refs と全 scope を実装境界・deploy unit・owner に割り当てる。
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

- System specification: system-spec/00-requirements-definition.md (U5, U7, I4, I6, I9), system-spec/spec-state.json qa_log (qa-003, qa-009, qa-018, qa-062)
- Detailed authoritative source: docs/frontend-spec.md, docs/screen-inventory.md, system-spec/frontend.md
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-dual-catalog-web
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-DUAL-CATALOG-WEB-P01
