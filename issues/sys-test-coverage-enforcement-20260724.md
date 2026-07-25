---
graph_node_id: "issue-test-coverage-enforcement-20260724"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","test-coverage","system-dev-planner","dev-graph","governance"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "タスク仕様書がテスト網羅(単体+結合+境界+回帰・カバレッジ80%+)を再現的に機械強制する仕組みの構築"
owners: ["daishiman"]
created_at: "2026-07-24T11:51:28Z"
updated_at: "2026-07-24T11:56:47Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugin-plans/system-dev-planner/references/system-task-spec-template.md","plugins/system-dev-planner/references/system-task-spec-template.md","plugins/system-dev-planner/scripts/validate-system-plan.py","packages/db/vitest.config.ts"]
purpose: "system-dev-planner が生成するタスク仕様書が、実行者の丁寧さに依存せず、単体+結合+境界+既存回帰+カバレッジ閾値を再現的に機械強制する状態にする"
goal: "テンプレート正本・C12 validator・カバレッジ実測基盤の3層で、以後の全 feature の P04/P06 が多層テストとカバレッジ閾値を満たさなければ fail-closed になる状態"
mvp_alignment: null
scope_in: ["system-task-spec-template.md (正本 plugin-plans + ビルド後 plugins) に test-type マトリクス + カバレッジ閾値を必須節化し goal-seek rubric へ束縛","validate-system-plan.py (C12) に test-type マトリクス・カバレッジ閾値宣言の中身検査を追加 (無ければ fail-closed)","各パッケージ vitest.config.ts へ coverage.thresholds + @vitest/coverage-v8 を導入","現 feature packages/db で 80% を実測し不足を補填 (スコープ A の場合)"]
scope_out: ["個別 feature のテストケース具体設計 (各 feature の P04 が所管)","E2E ランナー基盤そのものの新規構築"]
acceptance: ["テンプレート正本とビルド後が一貫し build-plugins-from-harness 再ビルドでも要求が消えない","test-type マトリクス or カバレッジ閾値を欠くタスク仕様書を validate-system-plan.py が fail-closed で拒否する","coverage 閾値割れで vitest が exit≠0 になり CI G4 が落ちる","plugins/system-dev-planner/tests が green"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-test-coverage-enforcement-20260724.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-24T11:51:28Z","origin_kind":"generated","source_digest":"43336931b9d84c400dc5782da751ef86682e031b5169643c25778584c065cd86","source_path":"system-spec/dev-workflow.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "feat-domain-model-db (u6q) のテスト品質レビュー中に判明した、タスク仕様書がテスト網羅を機械強制していない harness 横断ギャップの是正 issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-test-coverage-enforcement-20260724.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-9hj","linked_at":"2026-07-24T11:55:20Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-24T11:51:28Z","missing_sections":[],"status":"complete"}
---


# 概要

system-dev-planner が 1 feature → P01..P13 に生成するタスク仕様書が、単体だけでなく結合(integration)・境界(boundary/エラーパス)・既存回帰(0 regression)・カバレッジ 80%+ を、実行者の丁寧さに依存せず**再現的に機械強制**する状態にする。FE/BE/インフラ横断。

## 背景と問題

feat-domain-model-db (HarnessHub-u6q) のテスト品質レビュー (2026-07-24) で判明。13 フェーズ契約は P04=test-design・P06=`unit/contract/integration/e2e/security/performance` を名前として持ち、goal-seek 自己改善ループ(実装→独立評価→改善→PASS まで反復・上限で fail-closed)も実装済み。**器はあるが、テストの網羅とカバレッジが束縛されていない。**

## 現在の挙動 (2026-07-24 実測)

1. **カバレッジ閾値がどこにも無い** — `packages/db/vitest.config.ts` は `include` のみで `coverage` ブロック不在。`@vitest/coverage-v8` 未導入、test スクリプトは素の `vitest run`。「80% 満たす」証拠が取れない。
2. **結合/境界/回帰の必須テスト種別マトリクスが必須要素になっていない** — 現 feature の test-design.md は種別列を持ち品質が高いが、実行者の丁寧さであってテンプレート/validator が強制していない。
3. **各適用ワークストリーム(FE/BE/インフラ)ごとのテスト義務が無い** — `Workstream applicability` 節は適用/N/A 宣言を強制するが「適用ワークストリームは対応テストを持つこと」を強制しない。

## 期待する挙動

- テスト種別マトリクス or カバレッジ閾値を欠くタスク仕様書を validate-system-plan.py (C12) が fail-closed で拒否する。
- coverage 閾値割れで vitest が exit≠0 となり CI G4 が落ちる。
- 以後どの feature を何度実行しても、多層テスト + カバレッジ閾値の充足が担保される。

## 差し込み先(特定済み・3 レバレッジポイント)

| 対象 | 現状 | 追加する束縛 |
|---|---|---|
| 正本テンプレート `plugin-plans/system-dev-planner/references/system-task-spec-template.md`(+ ビルド後 `plugins/…`) | `Verification and evidence` 節は自由記述、goal-seek Rubric は「最低限 受け入れ条件・回帰・証跡・scope」(line 101) | test-type マトリクス(単体/結合/境界/既存回帰)+ coverage≥閾値 を必須節化。rubric PASS 条件に「coverage green」「0 regression」を追記 |
| 機械ゲート `plugins/system-dev-planner/scripts/validate-system-plan.py`(C12) | `REQUIRED_TASK_SPEC_SECTIONS`(L47-59)で節の存在は検査、`GOAL_SEEK_PASS_MARKER`(L370-374)で loop 強制。ただし中身は不問 | 本文にマトリクス行 + カバレッジ閾値宣言が無ければ fail-closed |
| カバレッジ実測基盤 各 `vitest.config.ts` | coverage 設定・ツール無し | `coverage.thresholds` + `@vitest/coverage-v8` 導入。閾値割れで vitest exit≠0 |

## スコープ選択肢(着手時に要判断)

- **A. 完全**: テンプレート正本 + C12 validator + カバレッジ実測基盤 + 現 feature(packages/db)で 80% 実測・不足補填。将来全 feature に機械強制 + 現 feature が実証例。変更量最大。
- **B. 仕様+ゲートのみ**: テンプレート正本 + C12 validator 強化まで。coverage ツール導入と現 feature retrofit は別課題へ分離。
- **C. 文言追記のみ**: rubric/Verification 節に要求文を追記するのみ。機械強制なし。Goodhart(文言はあるが実質未担保)リスク。

## 未決の判断 — カバレッジ閾値の強度

- 案 1(実用): lines/functions/statements 80% + branches 70%。
- 案 2(素直): 全指標 80% 一律。
- 案 3(厳格): 全指標 90%(control-plane 監査系向け)。

## 検証証跡

- テンプレート変更は正本(plugin-plans)とビルド後(plugins)へ一貫適用し `scripts/build-plugins-from-harness.py` 再ビルドでも消えないこと。
- validator 変更後は `plugins/system-dev-planner/tests/`(test_coverage.py 他)を実走し green。
- スコープ A: `pnpm --filter @harness-hub/db test -- --coverage` で閾値 green を実測。

## 申し送り(governance 注意)

- **ドリフト**: 正本(plugin-plans, 7567B)とビルド後(plugins, 8100B)が微差。ビルド後にだけ Automated-commands の 1 段落があり手編集がソースへ未逆流。触る際に一貫させること。
- **governance-check 鮮度ゲート**: SKILL/参照テンプレート編集は content-review 再評価の対象になり得る。
- 本課題は feat-domain-model-db(u6q)とは独立の harness 横断改善。PR #53 マージ後でも先行でも着手可。
