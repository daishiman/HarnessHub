# System task overlay: テストファースト設計 — 網羅性検査・冪等性・ローカル専用ガードのテストスタブ作成

## Machine-readable registration fields

- feature_package_id: feature-package/feat-demo-coverage-dataset (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-demo-coverage-dataset", "macro-feature", "testing-qa", "seed", "coverage", "test-design"]
- related_nodes: ["feat-demo-coverage-dataset", "arch-harness-hub-data", "arch-harness-hub-testing-qa"]
- parent_feature: feat-demo-coverage-dataset
- phase_ref: P04
- classification: confidence=0.87, reason="P03 で承認された設計に基づき、P05 実装の受入契約となるテストスタブ (網羅性・冪等性・ローカル専用ガード拒否・長文折返し検出・大量ページング境界) を作成する P04 タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p04.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P03 で承認された設計に基づき、テストファーストで P05 実装の受入契約となるテストスタブを作成する。この task 完了時点で、route×状態網羅性検査・enum 全値網羅検査・冪等性検査 (2 回連続実行の状態一致)・ローカル以外 URL 拒否検査・長文折返し検査・大量50件以上ページング境界検査の 6 テストカテゴリが red 状態 (実装未着手のため失敗) のテストコードとして存在する状態になる。

## 背景

goal-spec の acceptance 7 件のうち、機械検査を要求するものが複数ある (enum 未使用値 0 件の機械検査、route×状態対応表の未カバー 0 件の機械検査、冪等性の実測、ローカル以外 URL 拒否の実測、大量パターンのページング境界跨ぎの実測、長文パターンの折返し発生の実測)。これらを P05 実装後に事後的に検証するのではなく、P04 の時点で先にテストとして固定し、P05 が満たすべき受入契約として明示する。既存の `packages/db` は vitest (`pnpm --filter @harness-hub/db test`) を採用しており、本 feature のテストもこの枠組みに追加する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-demo-coverage-dataset, arch-harness-hub-data, arch-harness-hub-testing-qa
- Entry gate: docs/features/feat-demo-coverage-dataset/design-review-notes.md (P03 成果物) が承認判定であること
- P01 upstream entry gate: N/A: intra-feature depends_on gate (P04 は P03 完了を depends_on として直接要求する)
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task はデータ投入層のテスト設計のみで frontend コンポーネントのテストは持たない
- Backend: N/A: 本 feature は API/サーバーアクションを新設しない
- API: N/A: 本 feature は API endpoint を持たない
- Data: applicable + 内容: 6 テストカテゴリ (網羅性・enum全値・冪等性・ローカル専用ガード・長文折返し・大量ページング境界) のテストスタブを packages/db/__tests__/seed-coverage/ に作成する
- Infrastructure: N/A: 追加インフラを新設しない
- Security: applicable + 内容: ローカル以外 URL 拒否のテストスタブ (非 0 終了を検証) を作成する
- Quality: applicable + 内容: 6 テストカテゴリの合否基準を test-design.md に明記する
- Documentation: applicable + 内容: docs/features/feat-demo-coverage-dataset/test-design.md を新規作成する
- Operations: N/A: 本 task はテスト設計のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-testing-qa
- Deploy unit/environment: cloudflare-workers/hub (packages/db は Hub Worker にバンドルされる共有パッケージ)
- Compatibility/migration/backfill: N/A: 本 task はテストスタブ作成のみで実スキーマへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-demo-coverage-dataset/test-design.md (6 テストカテゴリの合否基準)、packages/db/__tests__/seed-coverage/ 配下のテストスタブ (P05 実装前は red 状態)
- Consumed artifacts: docs/features/feat-demo-coverage-dataset/architecture-decision-record.md, docs/features/feat-demo-coverage-dataset/design-review-notes.md
- Write scope/touches: docs/features/feat-demo-coverage-dataset/test-design.md, packages/db/__tests__/seed-coverage/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-demo-coverage-dataset-p04) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-demo-coverage-dataset-p04 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-demo-coverage-dataset-p04) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DEMO-COVERAGE-DATASET-P03] のため P03 完了後に着手する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- テスト対象コード (seed-coverage スクリプト等) の実装 (P05 の scope)
- テストの実行と green 化 (P06 の scope。本 task は red 状態のテストスタブ作成まで)
- 本番・staging データベースへの投入

## テスト戦略

- テストレベル選定: 単体 = fixture 生成関数 (enum 値網羅・長文生成・大量生成) の個別動作検証。結合 = seed 実行から DB 状態確認までの一連の流れの検証。境界値 = ページング境界 (49件/50件/51件) と長文折返し発生直前/直後の文字数の検証。回帰 = 同一 seed の連続 2 回実行で投入後の状態が一致することの検証。4 レベルすべてに言及済みであり、いずれも applicable
- カバレッジ目標: 既定 80% を P05 実装対象コード (packages/db/scripts/seed-coverage.ts, verify-demo-coverage-matrix.ts) に適用する。本 task ではテストスタブのみを作成しカバレッジ計測は P06 で行う
- 層別方針: Backend 層 = API 契約 (seed CLI の引数・終了コードの入出力契約) に対するテストスタブを作成する。Data 層 = DB 結合テスト (seed 実行→DB 状態確認) を中心に据え、fixture 生成ロジックは単体テストで個別検証する。他の applicable 層 (Security/Quality) も同じ結合テスト経路 (ローカル以外 URL での非 0 終了確認) で担保する
- 保守性制約: テストは DB 上のレコード件数・enum 値・文字数といったデータ内容ベースの assertion のみを行い、pixel 位置依存・DOM 構造依存の assertion は作らない。実装の内部関数名やモジュール構成に密結合した過剰なテストも作らず、seed 実行結果 (DB 状態) という公開契約に対してのみ検証する

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-demo-coverage-dataset`
- Required evidence: test-design.md に 6 テストカテゴリの合否基準が明記され、packages/db/__tests__/seed-coverage/ に対応するテストスタブが作成されていること (P05 実装前は red 状態で構わない)

## Inner goal-seek execution loop

- Methodology contract: system-task-goal-seek/v1
- Goal: 6 テストカテゴリのテストスタブが packages/db/__tests__/seed-coverage/ に存在し、test-design.md にそれぞれの合否基準が明記されている状態
- Generic execution prompt: architecture-decision-record.md の設計契約 (データ構造・生成規則・冪等性方式・ガード維持方針) を読み、その契約を検証する 6 テストカテゴリのテストスタブを vitest で作成せよ。テストは P05 実装対象コードに対する公開契約 (DB 状態・非 0 終了コード) のみを検証すること
- Rubric: (1) 6 テストカテゴリすべてにテストスタブが存在する (2) 各テストの合否基準が test-design.md に明記されている (3) テストが DB 状態ベースの assertion のみで構成されている (4) validate-system-plan.py が本 task に関する違反 0 件で完了する
- Feedback loop: 設計 → 独立レビュー相当の自己点検 (合否基準が P02 設計と矛盾しないか) → 矛盾があれば修正し再実行 → rubric verdict=PASS まで反復。上限 (3 回) 到達時は fail-closed とし team-lead へ差し戻す
- P13 spec/architecture writeback: N/A: P13 owns writeback

## Rollout and rollback

- Rollout: test-design.md とテストスタブを作成し、P05 へ引き継ぐ
- Rollback trigger and steps: 合否基準が P02 設計と矛盾する場合、矛盾箇所を記録し sys-demo-coverage-dataset-p02 または sys-demo-coverage-dataset-p03 を再確認対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/testing-qa.md (qa-236, qa-211)
- Architecture: arch-harness-hub-data (architecture/harness-hub-data.md), arch-harness-hub-testing-qa (architecture/harness-hub-testing-qa.md)
- Feature: feat-demo-coverage-dataset
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成しない
- Dependencies: sys-demo-coverage-dataset-p03
