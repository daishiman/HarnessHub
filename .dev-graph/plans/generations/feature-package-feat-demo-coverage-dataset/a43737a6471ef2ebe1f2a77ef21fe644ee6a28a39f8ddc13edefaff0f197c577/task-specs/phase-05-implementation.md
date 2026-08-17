# System task overlay: 実装 — seed-coverage スクリプトと route×状態対応表・網羅性検査スクリプトの実装

## Machine-readable registration fields

- feature_package_id: feature-package/feat-demo-coverage-dataset (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-demo-coverage-dataset", "macro-feature", "testing-qa", "seed", "coverage", "implementation"]
- related_nodes: ["feat-demo-coverage-dataset", "arch-harness-hub-data", "arch-harness-hub-testing-qa"]
- parent_feature: feat-demo-coverage-dataset
- phase_ref: P05
- classification: confidence=0.89, reason="P03 承認済み設計と P04 テストスタブに基づき、既存 packages/db/scripts/seed-local.ts のローカル専用ガードを再利用しつつ 28 route × 5 状態 × enum 全値を投入する seed-coverage スクリプトと route×状態対応表の機械検証スクリプトを実装する P05 タスク", candidates=[{artifact_kind: task, confidence: 0.89, candidate_path: tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p05.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 の設計と P04 のテストスタブに基づき、`packages/db/scripts/seed-coverage.ts` (28 route × 5 状態 × enum 全値の fixture 投入スクリプト) と `packages/db/scripts/verify-demo-coverage-matrix.ts` (route×状態対応表の未カバー 0 件を機械検査するスクリプト) を実装する。この task 完了時点で、P04 のテストスタブが green になり、`pnpm --filter @harness-hub/db typecheck` と `pnpm --filter @harness-hub/db test` が成功する。

## 背景

既存の `packages/db/scripts/seed-local.ts` は `isLocalDatabaseUrl` によるローカル専用ガードを持つが、投入内容がプロジェクト 2 件・リリース 1 件・公開申請 2 件・ヒアリングシート 3 件程度にとどまり、goal-spec が求める大量 (50件以上)・長文・エラーの各状態や enum 全値の網羅を満たしていない。本 task は、この既存ガードのパターン (DB URL 検証を最初に行い非ローカルなら 非 0 終了) を再利用しつつ、新規スクリプト `seed-coverage.ts` として fixture 投入ロジックを実装する。既存 `seed-local.ts` 自体は変更しない (スコープ外に明記)。

`verify-demo-coverage-matrix.ts` は、P02 で設計した route×状態対応表 (28 route × 5 状態) と各ドメイン enum 全値の一覧を機械検証する独立スクリプトとし、`plugins/system-spec-harness/scripts/validate-coverage-matrix.py` (system-spec のカテゴリ×プラットフォーム対応表を検証する別目的のスクリプト) とは無関係かつ名前も衝突しないように命名した。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-demo-coverage-dataset, arch-harness-hub-data, arch-harness-hub-testing-qa
- Entry gate: packages/db/__tests__/seed-coverage/ (P04 成果物) が存在し red 状態であること
- P01 upstream entry gate: N/A: intra-feature depends_on gate (P05 は P04 完了を depends_on として直接要求する)
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 既存 route/コンポーネントは変更せず、DB へのデータ投入のみで画面描画に必要な状態を再現する
- Backend: applicable + change: packages/db/scripts/seed-coverage.ts を実装し、既存 drizzle-orm リポジトリ層経由でデータを投入する
- API: N/A: 本 feature は API endpoint を新設しない
- Data: applicable + change: 28 route × 5 状態 × 各ドメイン enum 全値の fixture データを投入する。既存 schema (packages/db/schema/**) への変更は行わない
- Infrastructure: N/A: 追加インフラを新設しない
- Security: applicable + change: seed-coverage.ts の冒頭で isLocalDatabaseUrl 相当のガードを適用し、ローカル以外の DB URL を非 0 終了で拒否する
- Quality: applicable + change: verify-demo-coverage-matrix.ts で route×状態対応表の未カバー 0 件と enum 未使用値 0 件を機械検査する
- Documentation: N/A: 実装コード自体のコメントで説明し、独立文書は作成しない (P12 で runbook 化する)
- Operations: N/A: 運用手順の文書化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-testing-qa
- Deploy unit/environment: cloudflare-workers/hub (packages/db は Hub Worker にバンドルされる共有パッケージ。本 task はローカル専用 CLI スクリプトを追加するのみで Worker のデプロイ物自体は変更しない)
- Compatibility/migration/backfill: N/A: 既存 schema (packages/db/schema/**) への変更を伴わない (P08 で N/A 判定として再確認する)

## 成果物

- Produced artifacts: packages/db/scripts/seed-coverage.ts, packages/db/scripts/verify-demo-coverage-matrix.ts, docs/features/feat-demo-coverage-dataset/route-state-matrix.md (route×状態対応表の確定版)
- Consumed artifacts: docs/features/feat-demo-coverage-dataset/architecture-decision-record.md, packages/db/__tests__/seed-coverage/, packages/db/scripts/seed-local.ts (参照のみ、変更なし), packages/db/schema/core/catalog.ts, packages/db/schema/core/publish.ts
- Write scope/touches: packages/db/scripts/seed-coverage.ts, packages/db/scripts/verify-demo-coverage-matrix.ts, docs/features/feat-demo-coverage-dataset/route-state-matrix.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-demo-coverage-dataset-p05) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-demo-coverage-dataset-p05 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-demo-coverage-dataset-p05) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DEMO-COVERAGE-DATASET-P04] のため P04 完了後に着手する。resource_scope (packages/db/scripts/seed-coverage.ts 等) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- packages/db/scripts/seed-local.ts の変更 (既存ガードパターンは参照のみ)
- 既存 schema (packages/db/schema/**) の変更
- 本番・staging データベースへの投入
- 実ブラウザ検査そのもの (owner=feat-ui-integrity-audit-harness)

## テスト戦略

- テストレベル選定: 単体 = fixture 生成関数 (enum 値網羅生成・長文生成・大量生成) の個別動作を検証する。結合 = seed-coverage.ts 実行から DB 状態確認までを検証する。境界値 = ページング境界 (49件/50件/51件) と長文折返し発生直前/直後の文字数を検証する。回帰 = 同一 seed の連続 2 回実行で投入後の状態が一致することを検証する。4 レベルすべて applicable であり、P04 で作成したテストスタブをそのまま満たす実装を行う
- カバレッジ目標: 既定 80% を packages/db/scripts/seed-coverage.ts と verify-demo-coverage-matrix.ts に適用する
- 層別方針: Backend 層 = API 契約 (seed CLI の引数・終了コードの入出力契約) を実装し同契約に対するテストで検証する。Backend/Data 層 = drizzle-orm リポジトリ層経由の DB 結合テストを中心に据え、fixture 生成ロジックは単体テストで個別検証する。Security 層 = ローカル以外 URL 指定時の非 0 終了を結合テストで検証する。Quality 層 = verify-demo-coverage-matrix.ts の出力 (未カバー件数) を単体テストで検証する
- 保守性制約: テストは DB 上のレコード件数・enum 値・文字数といったデータ内容ベースの assertion のみを行い、pixel 位置依存・DOM 構造依存の assertion は作らない (本 feature は画面実装を変更しないため対象外だが、後続 feat-ui-integrity-audit-harness が pixel/DOM 検証を担う前提を維持する)。実装の内部関数名に密結合した過剰なテストも作らない

## Verification and evidence

- Automated commands: `pnpm install --frozen-lockfile`; `pnpm --filter @harness-hub/db typecheck`; `pnpm --filter @harness-hub/db test`; `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-demo-coverage-dataset`
- Required evidence: P04 のテストスタブがすべて green であること、および pnpm --filter @harness-hub/db typecheck/test の成功ログが得られていること

## Inner goal-seek execution loop

- Methodology contract: system-task-goal-seek/v1
- Goal: seed-coverage.ts の実行によって 28 route × 5 状態 × 各ドメイン enum 全値が DB に投入され、verify-demo-coverage-matrix.ts が未カバー 0 件を報告する状態
- Generic execution prompt: architecture-decision-record.md の設計契約と packages/db/__tests__/seed-coverage/ のテストスタブを読み、それらを満たす seed-coverage.ts と verify-demo-coverage-matrix.ts を実装せよ。既存 seed-local.ts のローカル専用ガードパターンを踏襲し、実在の schema (packages/db/schema/core/catalog.ts, publish.ts) のカラム・enum 値のみを使うこと
- Rubric: (1) P04 テストスタブが全件 green (2) typecheck が成功する (3) 既存の他テストに回帰が 0 件 (4) route-state-matrix.md が実装内容と一致する (5) validate-system-plan.py が本 task に関する違反 0 件で完了する
- Feedback loop: 実装 → テスト実行 (P06 相当の自己検証) → fail があれば実装を修正し再実行 → rubric verdict=PASS まで反復。上限 (3 回) 到達時は fail-closed とし team-lead へ差し戻す
- P13 spec/architecture writeback: N/A: P13 owns writeback

## Rollout and rollback

- Rollout: seed-coverage.ts と verify-demo-coverage-matrix.ts を実装し、P04 テストスタブが green になったことを確認してから P06 へ引き継ぐ
- Rollback trigger and steps: typecheck/test が失敗する場合、失敗箇所を write_scope 内の該当 path に限定して修正し、影響が設計 (P02/P03) に及ぶ場合は該当 task を再実行対象として差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/database.md, system-spec/testing-qa.md (qa-236)
- Architecture: arch-harness-hub-data (architecture/harness-hub-data.md), arch-harness-hub-testing-qa (architecture/harness-hub-testing-qa.md)
- Feature: feat-demo-coverage-dataset
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成しない
- Dependencies: sys-demo-coverage-dataset-p04
