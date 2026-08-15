# System task overlay: アーキテクチャ設計 — route×状態対応表・fixture データモデル・冪等 seed 契約の設計

## Machine-readable registration fields

- feature_package_id: feature-package/feat-demo-coverage-dataset (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-demo-coverage-dataset", "macro-feature", "testing-qa", "seed", "coverage", "architecture"]
- related_nodes: ["feat-demo-coverage-dataset", "arch-harness-hub-data", "arch-harness-hub-testing-qa"]
- parent_feature: feat-demo-coverage-dataset
- phase_ref: P02
- classification: confidence=0.88, reason="既存 packages/db/scripts/seed-local.ts のローカル専用ガードと削除→再作成による冪等パターンを踏襲しつつ、28 route × 5 状態 × enum 全値を機械検証可能な対応表として設計する P02 タスク", candidates=[{artifact_kind: task, confidence: 0.88, candidate_path: tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p02.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P01 で確定した要件ベースラインを、P05 が直接実装できる粒度の設計 (route×状態対応表のデータ構造、fixture 生成規則、冪等性の実現方式、ローカル専用ガードの維持方針) へ具体化する。この task 完了時点で、後続 P04 のテスト設計・P05 の実装が同一の設計判断を参照できる architecture-decision-record.md が確定する。

## 背景

既存の `packages/db/scripts/seed-local.ts` は `isLocalDatabaseUrl` (`file:` / `http://127.0.0.1` / `http://localhost` のみ許可) でローカル DB 以外への実行を拒否したうえで投入を行っており、この安全境界は本 feature でも変更しない。一方で投入内容は少量の固定データに限られており、goal-spec が求める route×状態対応表・enum 全値網羅・大量/長文/エラーの各パターンを満たしていない。

本 task では、対象 28 route それぞれに対して 空/1件/大量(50件以上)/長文/エラー の 5 状態を再現するための fixture データモデルを設計する。具体的には、各ドメインテーブル (`packages/db/schema/core/catalog.ts` の projects/targetChannels/releases/packages/deploymentReferences/catalogEntries、`packages/db/schema/core/publish.ts` の publishRequests/deviceAuthorizations) の enum 全値を最低 1 件ずつ含む行を用意し、加えて一覧系 route ではページング境界 (50 件以上) を跨ぐ大量データ、見出し・説明文・タグ名など日本語の折返しが発生する長さの長文データ、取得失敗・権限不足・未同期を模したエラー状態データを設計する。エラー状態は本番相当の障害を実 DB 上で表現できないため、既存ドメインの「失敗系ステータス値」(例: publishRequests.status=failed、deviceAuthorizations.status=denied、releases.status=deprecated 等) を用いて画面上のエラー描画を再現する設計とする。

冪等性 (同じ seed を連続 2 回実行しても投入後の状態が一致する) は、`seed-local.ts` が既に採用している「対象テーブルを削除してから再投入する」方式を踏襲し、固定 ID (ULID) を用いた upsert 相当の削除→再作成で実現する設計とする。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-demo-coverage-dataset, arch-harness-hub-data, arch-harness-hub-testing-qa
- Entry gate: docs/features/feat-demo-coverage-dataset/requirements-baseline.md (P01 成果物) が存在し、goal-spec acceptance 7 件・scope_in 8 件・scope_out 5 件が転記済みであること
- P01 upstream entry gate: N/A: intra-feature depends_on gate (P02 は P01 完了を depends_on として直接要求する)
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は route が既に描画するデータの投入設計のみで frontend コンポーネント自体は変更しない
- Backend: N/A: API/サーバーアクション実装は本 feature の scope 外であり、既存の描画経路をそのまま利用する
- API: N/A: 本 feature は API endpoint を新設しない
- Data: applicable + 内容: route×状態対応表のデータ構造、各ドメイン enum 全値を含む fixture 生成規則、大量/長文/エラーパターンの生成規則、冪等性の実現方式 (削除→再作成) を設計する
- Infrastructure: N/A: デプロイ単位・CI/CD は feat-hub-foundation が既に確立しており、本 feature は追加インフラを新設しない
- Security: applicable + 内容: isLocalDatabaseUrl によるローカル以外 DB URL 拒否ガードを維持する設計とし、緩和や迂回経路を設けないことを明記する
- Quality: applicable + 内容: route×状態対応表の未カバー 0 件を機械検査する検査スクリプトのインターフェース (入出力契約) を設計する
- Documentation: applicable + 内容: docs/features/feat-demo-coverage-dataset/architecture-decision-record.md を新規作成する
- Operations: N/A: runbook 化は P12 で行う。本 task は設計のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-testing-qa
- Deploy unit/environment: cloudflare-workers/hub (packages/db は Hub Worker にバンドルされる共有パッケージ。本 task は設計のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 既存 schema (packages/db/schema/**) への列追加・変更を伴わない設計とする (P08 で N/A 判定の根拠として再確認する)

## 成果物

- Produced artifacts: docs/features/feat-demo-coverage-dataset/architecture-decision-record.md (route×状態対応表のデータ構造、各ドメイン enum 全値一覧、大量/長文/エラー各パターンの生成規則、冪等性の実現方式、ローカル専用ガード維持方針を含む)
- Consumed artifacts: docs/features/feat-demo-coverage-dataset/requirements-baseline.md, packages/db/scripts/seed-local.ts, packages/db/schema/core/catalog.ts, packages/db/schema/core/publish.ts, system-spec/database.md
- Write scope/touches: docs/features/feat-demo-coverage-dataset/architecture-decision-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-demo-coverage-dataset-p02) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-demo-coverage-dataset-p02 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-demo-coverage-dataset-p02) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DEMO-COVERAGE-DATASET-P01] のため P01 完了後に着手する。resource_scope (architecture-decision-record.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 本番・staging データベースへの投入 (goal-spec scope_out)
- 実ブラウザ検査そのもの (owner=feat-ui-integrity-audit-harness)
- UI 崩れの是正 (owner=feat-ui-layout-remediation)
- 顧客実データの取込み・匿名化
- 実装コードの作成 (本 task は設計のみ。実装は P05)

## テスト戦略

- テストレベル選定: 単体・結合・境界値・回帰の 4 レベルのうち、本 task は設計文書化のみでコード成果物を持たないため 4 レベルすべて N/A: 本 task はテスト対象コードを持たず、P04 で本設計に基づく単体 (fixture 生成関数)・結合 (seed 実行→DB 状態確認)・境界値 (50 件ちょうど/49 件/51 件のページング境界、長文の折返し発生直前/直後の文字数)・回帰 (2 回連続実行の状態一致) の各テストを設計する
- カバレッジ目標: N/A: 本 task はコード成果物を持たないためカバレッジ計測対象がない。既定 80% は P05 実装対象コード (packages/db/scripts/seed-coverage.ts 等) に適用する方針を本設計に明記する
- 層別方針: Backend/Data 層 = API 契約 (seed CLI の引数・終了コードの入出力契約) の検証と DB 結合 (seed 実行後の DB 状態確認) を必須とする方針を設計として固定する。Data 層 = fixture 生成規則とテーブルごとの enum 網羅方針。Security 層 = ローカル専用ガード非緩和の設計方針。Quality 層 = 対応表未カバー検査の入出力契約設計。Documentation 層 = architecture-decision-record.md のレビューによる整合性確認
- 保守性制約: 設計はテーブルの物理配置や DOM 構造に依存しない、データ内容 (enum 値・件数・文字数) ベースの契約として記述する。pixel 位置依存・DOM 構造依存のテストを P04 以降で作らないことを設計方針として明記する

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-demo-coverage-dataset`
- Required evidence: architecture-decision-record.md に route×状態対応表のデータ構造・各ドメイン enum 全値一覧・長文/大量/エラー各パターンの生成規則・冪等性の実現方式・ローカル専用ガード維持方針が明記されていること

## Inner goal-seek execution loop

- Methodology contract: system-task-goal-seek/v1
- Goal: architecture-decision-record.md が P05 実装者にとって曖昧さのない設計契約 (データ構造・生成規則・冪等性方式・ガード維持方針) を提供している状態
- Generic execution prompt: requirements-baseline.md と実在の schema (packages/db/schema/core/catalog.ts, publish.ts) および既存 seed-local.ts の実装パターンを読み、route×状態対応表と fixture データモデル、冪等 seed 契約を設計せよ。enum 値やテーブル名は推測せず実測すること
- Rubric: (1) 28 route × 5 状態の対応表構造が定義されている (2) 全 enum 値の一覧が実測値と一致する (3) 冪等性の実現方式が具体的な手順として記述されている (4) ローカル専用ガード維持方針が明記されている (5) validate-system-plan.py が本 task に関する違反 0 件で完了する
- Feedback loop: 設計 → 独立レビュー (P03) → 指摘があれば architecture-decision-record.md へ反映し再実行 → rubric verdict=PASS まで反復。上限 (3 回) 到達時は fail-closed とし team-lead へ差し戻す
- P13 spec/architecture writeback: N/A: P13 owns writeback

## Rollout and rollback

- Rollout: architecture-decision-record.md を作成し、requirements-baseline.md の内容と整合することを確認してから P03 へ引き継ぐ
- Rollback trigger and steps: P03 レビューで設計案が却下された場合、architecture-decision-record.md へ却下理由を追記し、本 task を再実行して代替設計を再評価する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/database.md, system-spec/testing-qa.md (qa-236)
- Architecture: arch-harness-hub-data (architecture/harness-hub-data.md), arch-harness-hub-testing-qa (architecture/harness-hub-testing-qa.md)
- Feature: feat-demo-coverage-dataset
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成しない
- Dependencies: sys-demo-coverage-dataset-p01
