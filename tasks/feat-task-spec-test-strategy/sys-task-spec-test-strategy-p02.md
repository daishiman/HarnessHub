---
graph_node_id: "SYS-TASK-SPEC-TEST-STRATEGY-P02"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-task-spec-test-strategy"
domain: "documentation"
tags: ["feat-task-spec-test-strategy","macro-feature","test-strategy","quality-gate","qa-080","system-dev-planner"]
priority: null
start_date: null
target_date: null
iteration: null
title: "設計 — テスト戦略 section スキーマ・変更種別からの導出規則・テンプレート組込位置・fail-closed 検査点の決定論設計"
owners: ["daishiman"]
created_at: "2026-07-24T23:09:08Z"
updated_at: "2026-07-28T04:12:30Z"
status: "closed"
depends_on: ["SYS-TASK-SPEC-TEST-STRATEGY-P01"]
related_nodes: ["feat-task-spec-test-strategy","arch-harness-hub-testing-qa"]
resource_scope: ["docs/features/feat-task-spec-test-strategy/design.md"]
purpose: "P01 が固定した要件ベースラインを入力に、テスト戦略 section の構造 (テストレベル選定・カバレッジ目標・層別方針・保守性制約の 4 項目)、変更内容の種別 (フロント/バックエンド/インフラ) からテストレベルと層別方針を導出する規則、P01..P13 task spec テンプレートへの必須 section 組込位置、および fail-closed validator が検査すべき具体的なチェックポイントを決定論的に設計し、design.md として固定する。"
goal: "P02 の受入条件と品質ゲートを満たし、再実行可能な検証証跡を残す"
scope_in: ["docs/features/feat-task-spec-test-strategy/design.md"]
scope_out: ["テスト実行基盤 (Vitest / Playwright / @testing-library/react) の scaffold・設定・CI 配線","カバレッジ計測と未達時マージブロックの CI 実装","flaky 検出・quarantine・再実行ポリシーの運用実装","pixel 位置・DOM 構造依存を検出する lint の実装 (本 feature は仕様上の制約明記までを範囲とする)","Hub プロダクト本体機能 (Web/API/DB) のテストケース追加","既存タスク仕様書資産の一括再生成","P01..P13 exact-13 契約そのものの変更","本 phase の責務外の成果物生成 (他 phase の write scope への書込)"]
acceptance: ["テスト戦略 section を欠いた task spec 入力に対し validator が非0終了で拒否する","4 項目 (テストレベル選定・カバレッジ目標・層別方針・保守性制約) を全て持つ task spec が validator PASS する","同一 feature context で仕様生成を二回実行し、テスト戦略 section の項目集合と順序が一致する","生成された task spec のテストレベル選定が、変更内容の種別に対応する層別方針を含む","カバレッジ目標が既定 80% で表現され、層別に上書き可能な形で記録される","保守性制約に pixel 位置・DOM 構造依存の禁止が明記される","既存の P01..P13 exact-13 契約と 13-node DAG 検査が非退行である"]
architecture_refs: ["arch-harness-hub-testing-qa"]
parent_feature: "feat-task-spec-test-strategy"
feature_package_id: "feature-package/feat-task-spec-test-strategy"
phase_ref: "P02"
file_path: "tasks/feat-task-spec-test-strategy/sys-task-spec-test-strategy-p02.md"
template_id: "task"
template_version: "1.1.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"7d185f453466523edcc7c6071fde7c24001612da367de329c10ba13c82a43bae","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-task-spec-test-strategy/7d185f453466523edcc7c6071fde7c24001612da367de329c10ba13c82a43bae/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-24T23:09:08Z","origin_kind":"system-dev-planner","source_digest":"7d185f453466523edcc7c6071fde7c24001612da367de329c10ba13c82a43bae","source_path":".dev-graph/plans/generations/feature-package-feat-task-spec-test-strategy/7d185f453466523edcc7c6071fde7c24001612da367de329c10ba13c82a43bae/task-specs/phase-02-architecture.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.86
classification_reason: "system-spec/testing-qa.md qa-076/qa-078/qa-079/qa-080 のタスク仕様書テスト戦略必須化要求のうち P02 責務 (設計 — テスト戦略 section スキーマ・変更種別からの導出規則・テンプレート組込位置・fail-closed 検査点の決定論設計) を実行する task"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-task-spec-test-strategy/sys-task-spec-test-strategy-p02.md","confidence":0.86}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-a4ks.2","linked_at":"2026-07-25T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-25T14:18:12Z","evidence_refs":["issues/sys-lint-open-residue-ci-red-20260725.md"],"policy":"manual","reconciled_at":"2026-07-26T01:19:20.811908Z","source":"reconciliation","status":"done"}
implementation_readiness: {"checked_at":"2026-07-24T21:59:18Z","missing_sections":[],"status":"complete"}
---

# System task overlay: 設計 — テスト戦略 section スキーマ・変更種別からの導出規則・テンプレート組込位置・fail-closed 検査点の決定論設計

## Machine-readable registration fields

- feature_package_id: feature-package/feat-task-spec-test-strategy (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-task-spec-test-strategy", "macro-feature", "test-strategy", "quality-gate", "qa-080", "system-dev-planner"]
- related_nodes: ["feat-task-spec-test-strategy", "arch-harness-hub-testing-qa"]
- parent_feature: feat-task-spec-test-strategy
- phase_ref: P02
- classification: confidence=0.86, reason="system-spec/testing-qa.md qa-076/qa-078/qa-079/qa-080 のタスク仕様書テスト戦略必須化要求のうち P02 責務 (設計 — テスト戦略 section スキーマ・変更種別からの導出規則・テンプレート組込位置・fail-closed 検査点の決定論設計) を実行する task", candidates=[{artifact_kind: task, confidence: 0.86, candidate_path: tasks/feat-task-spec-test-strategy/sys-task-spec-test-strategy-p02.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P01 が固定した要件ベースラインを入力に、テスト戦略 section の構造 (テストレベル選定・カバレッジ目標・層別方針・保守性制約の 4 項目)、変更内容の種別 (フロント/バックエンド/インフラ) からテストレベルと層別方針を導出する規則、P01..P13 task spec テンプレートへの必須 section 組込位置、および fail-closed validator が検査すべき具体的なチェックポイントを決定論的に設計し、design.md として固定する。

## 背景

qa-076 は単体・結合・境界値・回帰の 4 テストレベル網羅を要求し、qa-078 はフロント/バックエンド/インフラの層別テスト方針 (フロントは behavior ベース必須・pixel 位置と DOM 構造依存禁止、バックエンドは API 契約+ロジック単体+DB 結合、インフラは IaC 静的検証+デプロイ後 smoke) を確定した。既存の system-dev-planner は P01..P13 の exact-13 契約と単一 writer である validate-system-plan.py を持つが、テスト戦略 section を検査する仕組みは未設計であり、この検査点をどこに追加すれば既存の 13-node DAG 検査と衝突しないかを本 phase で確定する必要がある。

## 前提条件

- Macro entry gate (P01 起点で評価済み): parent_feature.depends_on all done|closed。本 task (P02) は intra-feature 直列 chain の一部であり、この marker は package 起点の P01 でのみ評価され、以降の phase へ複製しない。
- Required predecessor: SYS-TASK-SPEC-TEST-STRATEGY-P01 が done であること
- Required spec/architecture/phase/task nodes: feat-task-spec-test-strategy, arch-harness-hub-testing-qa
- Entry gate: goal-spec.json の feature_context_digest が sha256:eafd046f7f71c3c44f48a69297d08e0ca160a3f503e243a99a8a11c7bd178df7 に一致し、features/feat-task-spec-test-strategy.md の frontmatter と goal-spec の purpose/goal/scope_in/scope_out/acceptance が逐語一致すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: frontend 実装物を変更しない
- Backend: N/A: Hub 本体の backend 実装物を変更しない (scope_out)
- API: N/A: Hub 本体の API を変更しない (scope_out)
- Data: N/A: 本 phase はスキーマ設計を文書化するのみでデータ実体を変更しない (実装は P05 が担う)
- Infrastructure: N/A: デプロイ基盤を変更しない
- Security: N/A: 本 phase は認可・秘密情報の取り扱いを変更しない
- Quality: applicable + change: fail-closed validator が検査すべきチェックポイントを設計する
- Documentation: applicable + change: docs/features/feat-task-spec-test-strategy/design.md を新規作成する
- Operations: applicable + change: fail-closed 検査点の設計により、promotion パイプラインの運用挙動 (欠落時の非0終了) を確定する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-testing-qa (architecture/harness-hub-testing-qa.md 正本参照)
- Deploy unit/environment: dev-tooling/repository (docs/features 配下のドキュメント資産。Cloudflare Workers へのデプロイは伴わない)
- Compatibility/migration/backfill: 既存 promoted package・証跡の digest を失効させない。実データ移行は伴わず、既存 promoted 世代への非破壊性確認は P08 が所有する

## 成果物

- Produced artifacts: docs/features/feat-task-spec-test-strategy/design.md
- Consumed artifacts: docs/features/feat-task-spec-test-strategy/requirements-baseline.md, goal-spec.json, architecture/harness-hub-testing-qa.md, system-spec/testing-qa.md
- Write scope/touches: docs/features/feat-task-spec-test-strategy/design.md

## Tracker publication and completion

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-task-spec-test-strategy-p02) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-task-spec-test-strategy-p02 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-task-spec-test-strategy-p02) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: 直前 predecessor task (SYS-TASK-SPEC-TEST-STRATEGY-P01) が done になるまで着手しない。write scope が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- テスト実行基盤 (Vitest / Playwright / @testing-library/react) の scaffold・設定・CI 配線
- カバレッジ計測と未達時マージブロックの CI 実装
- flaky 検出・quarantine・再実行ポリシーの運用実装
- pixel 位置・DOM 構造依存を検出する lint の実装 (本 feature は仕様上の制約明記までを範囲とする)
- Hub プロダクト本体機能 (Web/API/DB) のテストケース追加
- 既存タスク仕様書資産の一括再生成
- P01..P13 exact-13 契約そのものの変更

## Verification and evidence

- Automated commands:
  - `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: design.md に、テスト戦略 section の 4 項目それぞれのフィールド構造、変更種別からテストレベル/層別方針への導出規則の対応表、P01..P13 テンプレートへの組込位置 (見出し名と挿入順序)、および fail-closed validator が拒否すべき欠落パターン (section 欠如・4 項目の一部欠落・空本文) が具体的に記載され、既存 exact-13 契約 (単一 writer=validate-system-plan.py、13-node DAG) と非干渉であることの根拠が明記されること

## Inner goal-seek execution loop

- Methodology contract: `system-task-goal-seek/v1`
- Goal: P02 の Phase acceptance と Verification and evidence をすべて満たす
- Generic execution prompt: 目的・背景・前提条件・write scope・成果物・受け入れ条件を入力に、実装手段を固定せず最小の安全な変更を行う
- Rubric: acceptance 全件、回帰テスト、必須証跡、write scope、依存整合がすべて PASS
- Feedback loop: 実装→独立評価→finding を次の prompt へ反映→再実行し、`rubric verdict=PASS` まで反復する。上限到達時は fail-closed
- P13 spec/architecture writeback: N/A: P13 owns writeback

## Rollout and rollback

- Rollout: 設計内容が P01 baseline の 4 項目定義と矛盾しないことを確認し、design.md として固定してから P03 のレビューへ引き継ぐ
- Rollback trigger and steps: 設計が exact-13 契約または既存 promoted 世代の digest を破る場合、design.md を差し戻し P01 の baseline から再設計する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature: `features/feat-task-spec-test-strategy.md` (feature_context_digest `sha256:eafd046f7f71c3c44f48a69297d08e0ca160a3f503e243a99a8a11c7bd178df7`)
- Phase responsibility: 現行 feature の purpose・goal・scope・acceptance のうち本 phase 責務の部分集合を所有する。
- Purpose: タスク仕様書がテスト網羅を明記しない、あるいは書き方が実行ごとにぶれるため、実装後に「結合が通らない」「既存機能が壊れた」を後追いで発見している (qa-076/qa-079)。仕様生成の時点でテスト戦略を必須 section 化し欠落を機械的に拒否することで、何度実行しても同じ品質基準の仕様書が出る冪等な仕組みへ移す。あわせて、ボタン配置など見た目の微調整でテストが壊れる保守性崩壊 (qa-078) を、実装ではなく仕様段階の制約として先に封じる
- Goal: system-dev-planner が生成する P01..P13 タスク仕様書が、テストレベル選定 (単体・結合・境界値・回帰)・カバレッジ目標 (既定 80%、層別上書き可)・層別方針 (フロント behavior ベース / バックエンド API 契約+ロジック単体+DB 結合 / インフラ IaC 静的検証+デプロイ後 smoke)・保守性制約 (pixel 位置・DOM 構造依存の禁止、過剰テストを作らない線引き) の 4 項目を必須 section として持ち、欠落した仕様書は promotion 前に fail-closed で拒否され、同一入力の再生成で section 構成が冪等に一致する状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
  - タスク仕様書テスト戦略 section のスキーマ定義 (テストレベル選定・カバレッジ目標・層別方針・保守性制約の 4 項目)
  - system-dev-planner の task spec テンプレート (P01..P13) への必須 section 組込
  - テスト戦略 section 欠落を promotion 前に非0終了で拒否する fail-closed validator
  - 変更内容の種別 (フロント/バックエンド/インフラ) からテストレベルと層別方針を導出する規則
  - 層別テスト方針の明文化 (フロント= accessible role/ラベル選択の behavior ベース必須かつ pixel 位置・DOM 構造依存禁止、バックエンド= API 契約テスト+ビジネスロジック単体+DB 結合、インフラ= IaC/設定の静的検証+デプロイ後 smoke)
  - 「どこまで管理するか」の線引き (実装詳細への密結合となる過剰テストを作らない基準) の仕様記述
  - 同一 feature context での再生成における section 構成の冪等性検証
- Scope out:
  - テスト実行基盤 (Vitest / Playwright / @testing-library/react) の scaffold・設定・CI 配線
  - カバレッジ計測と未達時マージブロックの CI 実装
  - flaky 検出・quarantine・再実行ポリシーの運用実装
  - pixel 位置・DOM 構造依存を検出する lint の実装 (本 feature は仕様上の制約明記までを範囲とする)
  - Hub プロダクト本体機能 (Web/API/DB) のテストケース追加
  - 既存タスク仕様書資産の一括再生成
  - P01..P13 exact-13 契約そのものの変更
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
  - テスト戦略 section を欠いた task spec 入力に対し validator が非0終了で拒否する
  - 4 項目 (テストレベル選定・カバレッジ目標・層別方針・保守性制約) を全て持つ task spec が validator PASS する
  - 同一 feature context で仕様生成を二回実行し、テスト戦略 section の項目集合と順序が一致する
  - 生成された task spec のテストレベル選定が、変更内容の種別に対応する層別方針を含む
  - カバレッジ目標が既定 80% で表現され、層別に上書き可能な形で記録される
  - 保守性制約に pixel 位置・DOM 構造依存の禁止が明記される
  - 既存の P01..P13 exact-13 契約と 13-node DAG 検査が非退行である
- Architecture/source refs:
  - architecture/harness-hub-testing-qa.md
  - system-spec/testing-qa.md
  - specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Phase acceptance

- テスト戦略 section を欠いた task spec 入力に対し validator が非0終了で拒否する
- 4 項目 (テストレベル選定・カバレッジ目標・層別方針・保守性制約) を全て持つ task spec が validator PASS する
- 同一 feature context で仕様生成を二回実行し、テスト戦略 section の項目集合と順序が一致する
- 生成された task spec のテストレベル選定が、変更内容の種別に対応する層別方針を含む
- カバレッジ目標が既定 80% で表現され、層別に上書き可能な形で記録される
- 保守性制約に pixel 位置・DOM 構造依存の禁止が明記される
- 既存の P01..P13 exact-13 契約と 13-node DAG 検査が非退行である

## 参照情報

- goal-spec: goal-spec.json (parent_feature=feat-task-spec-test-strategy, feature_context_digest=sha256:eafd046f7f71c3c44f48a69297d08e0ca160a3f503e243a99a8a11c7bd178df7)
- 仕様正本: system-spec/testing-qa.md qa-076/qa-078/qa-079/qa-080 (タスク仕様書テスト戦略の必須化)
- trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 依存

- `SYS-TASK-SPEC-TEST-STRATEGY-P01`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-task-spec-test-strategy` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
