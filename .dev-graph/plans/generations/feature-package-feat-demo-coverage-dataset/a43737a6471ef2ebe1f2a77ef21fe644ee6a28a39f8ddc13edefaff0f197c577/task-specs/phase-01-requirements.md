# System task overlay: 確認用データセット要件ベースライン確定 — 28 route × 5 状態 × enum 全値の対応表確定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-demo-coverage-dataset (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-demo-coverage-dataset", "macro-feature", "testing-qa", "seed", "coverage", "requirements-baseline"]
- related_nodes: ["feat-demo-coverage-dataset", "arch-harness-hub-data", "arch-harness-hub-testing-qa"]
- parent_feature: feat-demo-coverage-dataset
- phase_ref: P01
- classification: confidence=0.9, reason="goal-spec (goal-spec.json) と features/feat-demo-coverage-dataset.md の purpose/goal/scope_in 8 件/scope_out 5 件/acceptance 7 件を要件ベースラインへ確定転記する P01 タスク", candidates=[{artifact_kind: task, confidence: 0.9, candidate_path: tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p01.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

feat-demo-coverage-dataset の受入可能な要件ベースラインを確定し、以降の P02〜P13 全 task が同一の合意事項 (対象 28 route、route ごとの 空/1件/大量50件以上/長文/エラー の 5 状態、各ドメインモデルの enum ステータス全値、seed の冪等性、ローカル専用ガードの維持) を参照できる状態にする。この task 完了時点で、goal-spec の purpose/goal/scope_in 8 件/scope_out 5 件/acceptance 7 件が machine-verifiable な baseline 文書として固定される。

## 背景

Harness Hub の画面は現状、空か 1 件しかデータが無い状態でしか確認されておらず、大量件数での折返し・長文での横溢れ・エラー時の描画といった崩れが最も出やすい状態が一度も観測されていない (goal-spec purpose)。後続 feature `feat-ui-integrity-audit-harness` は実ブラウザで 28 route × 3 幅 × 2 テーマ = 168 通りを検査する計画であり、その前提として全画面・全状態を再現できる確認用データが正本として必要になる (system-spec/testing-qa.md qa-236)。空 DB のまま検査を実行すると、データが薄いことによる「崩れていない」という偽の合格が出てしまうため、本 feature はその前提データを先に整備する。

対象 route は Next.js App Router 配下 `apps/hub/src/app` の `page.tsx` を実測すると 28 件確認でき (`(dashboard)` / `(workspace)` の 2 route group を含む)、`docs/screen-inventory.md` の Route 一覧 (S-code 付き) と一致する。既存の投入経路は `packages/db/scripts/seed-local.ts` であり、`isLocalDatabaseUrl` により `file:` / `http://127.0.0.1` / `http://localhost` 以外の DB URL を拒否するガードを持つが、投入内容はプロジェクト 2 件・リリース 1 件・公開申請 2 件・ヒアリングシート 3 件程度にとどまり、goal-spec が求める「大量 (50 件以上)」「長文」「エラー」の各状態や、各ドメイン enum の全値網羅には遠く届いていない。この不足が、本 feature が解決すべき具体的なギャップである。

各ドメインモデルの enum は `packages/db/schema/core/catalog.ts` (`projects.status`: active/suspended/archived、`targetChannels.target`: skill/web_app、`releases.status`: available/suspended/deprecated、`packages.kind`: skills-package、`deploymentReferences.provider`: cloudflare、`catalogEntries.visibility`: private/workspace) と `packages/db/schema/core/publish.ts` (`publishRequests.status` の 9 値: draft/validating/needs_fix/ready/approval_pending/approved/publishing/failed/published、`publishRequests.verdict`: green/yellow/red、`deviceAuthorizations.status`: pending/approved/denied/consumed) を実測して確認済みであり、これらを本 baseline に enum 一覧として明記する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-demo-coverage-dataset, arch-harness-hub-data, arch-harness-hub-testing-qa
- Entry gate: goal-spec.json の feature_context_digest が sha256:fffd1ddd4841cd50675ff48dea77f4788059ca468e7895c73ce73bbc020fa6c3 に一致し、features/feat-demo-coverage-dataset.md の confirmation_status が confirmed であること。evaluation_status は本 task package 生成時点で pending であり、system-dev-plan-evaluator による C12 PASS 判定と C11 promotion を経て解決する
- P01 upstream entry gate: parent_feature.depends_on all done|closed (features/feat-demo-coverage-dataset.md の depends_on は空のため、本条件は自明に充足する)
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は要件文書化のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は要件文書化のみで backend 実装物 (packages/db) を変更しない
- API: N/A: 本 feature は API endpoint を新設しない (投入経路は既存の local 専用 seed スクリプト)
- Data: applicable + 内容: 対象 28 route と route ごとの 5 状態 (空/1件/大量50件以上/長文/エラー) の対応表、および各ドメイン enum 全値の一覧を要件として確定する。カラム設計詳細は P02 で行う
- Infrastructure: N/A: デプロイ単位・CI/CD は feat-hub-foundation が既に確立しており、本 feature は追加インフラを新設しない
- Security: applicable + 内容: ローカル以外の DB URL を拒否する既存ガード (isLocalDatabaseUrl) を緩めないことを要件として明記する
- Quality: applicable + 内容: goal-spec acceptance 7 件を machine-verifiable な受入基準として requirements-baseline.md に固定する
- Documentation: applicable + 内容: docs/features/feat-demo-coverage-dataset/requirements-baseline.md を新規作成する
- Operations: N/A: seed 実行手順・到達手順の runbook 化は P12 で行う。本 task は要件確定のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-testing-qa (features/feat-demo-coverage-dataset.md architecture_refs の正本参照)
- Deploy unit/environment: cloudflare-workers/hub (packages/db は Hub Worker にバンドルされる共有パッケージ。本 task は要件確定のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は要件確定のみで実スキーマへの変更を伴わない (P08 で migration 不要判定を行う)

## 成果物

- Produced artifacts: docs/features/feat-demo-coverage-dataset/requirements-baseline.md (要件ベースライン文書。purpose/goal/scope_in 8 件/scope_out 5 件/acceptance 7 件の確定転記、対象 28 route 一覧、route×状態対応表の骨子、各ドメイン enum 一覧を含む)
- Consumed artifacts: goal-spec.json, features/feat-demo-coverage-dataset.md, features/feat-demo-coverage-dataset.context.json, system-spec/testing-qa.md, system-spec/00-requirements-definition.md, system-spec/database.md, docs/screen-inventory.md
- Write scope/touches: docs/features/feat-demo-coverage-dataset/requirements-baseline.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-demo-coverage-dataset-p01) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-demo-coverage-dataset-p01 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-demo-coverage-dataset-p01) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on が空のため他 task との着手順序制約はない。resource_scope (docs/features/feat-demo-coverage-dataset/requirements-baseline.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 本番・staging データベースへの投入 (goal-spec scope_out。ローカル専用ガードを緩めない)
- 実ブラウザ検査そのもの (owner=feat-ui-integrity-audit-harness、goal-spec scope_out)
- UI 崩れの是正 (owner=feat-ui-layout-remediation、goal-spec scope_out)
- 顧客実データの取込み・匿名化 (goal-spec scope_out)
- パフォーマンス負荷試験用の大規模データ (goal-spec scope_out。本 feature は表示網羅が目的で負荷が目的ではない)
- 実装コードの作成 (本 task は要件確定のみ)

## テスト戦略

- テストレベル選定: 単体・結合・境界値・回帰の 4 レベルのうち、本 task は要件文書化のみでコード成果物を持たないため 4 レベルすべて N/A: 本 task はテスト対象コードを持たず、実行可能なテストは P04 で設計し P05 で実装対象コードとともに定義する
- カバレッジ目標: N/A: 本 task はコード成果物を持たないためカバレッジ計測対象がない。既定 80% は P05 実装以降の対象コードに適用する
- 層別方針: Backend/Data 層 = 本 task はコード成果物を持たないため実行はしないが、後続 task が満たすべき方針として API 契約 (seed CLI の引数・終了コードの入出力契約) の検証と DB 結合 (seed 実行後の DB 状態確認) を必須要件として定める。Documentation 層 = 要件ベースライン文書のレビューによる内容整合性確認。他の applicable 層 (Data/Security/Quality) はコード成果物を持たないため本 task では方針適用外
- 保守性制約: 本 task は文書のみを扱うため pixel 位置依存・DOM 構造依存の懸念はない。以降の task (P04/P05/P06) で作成するテストはいずれも pixel 位置依存・DOM 構造依存を禁止し、実装詳細へ密結合した過剰なテストを作らない

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-demo-coverage-dataset`
- Required evidence: docs/features/feat-demo-coverage-dataset/requirements-baseline.md に goal-spec acceptance 7 件と scope_in 8 件・scope_out 5 件が過不足なく転記され、対象 28 route の一覧と route×状態対応表の骨子が明記されていること

## Inner goal-seek execution loop

- Methodology contract: system-task-goal-seek/v1
- Goal: docs/features/feat-demo-coverage-dataset/requirements-baseline.md が goal-spec の purpose/goal/scope_in/scope_out/acceptance を過不足なく転記し、28 route 一覧と route×状態対応表の骨子を含む状態
- Generic execution prompt: goal-spec.json と features/feat-demo-coverage-dataset.md/.context.json を読み、system-spec/testing-qa.md (qa-236) と docs/screen-inventory.md を突き合わせて requirements-baseline.md を作成せよ。route 名や enum 値は推測せず、apps/hub/src/app 配下の page.tsx と packages/db/schema/** を実測して確認すること
- Rubric: (1) acceptance 7 件が全件転記されている (2) scope_in 8 件・scope_out 5 件が全件転記されている (3) 28 route 一覧が実測 (page.tsx 数) と一致する (4) validate-system-plan.py が本 task に関する違反 0 件で完了する (5) 未記入マーカー (山括弧の穴埋め語・未着手マーカー語) が残っていない
- Feedback loop: 作成 → 独立レビュー (P03) → 指摘があれば requirements-baseline.md へ反映し再実行 → rubric verdict=PASS まで反復。上限 (3 回) 到達時は fail-closed とし team-lead へ差し戻す
- P13 spec/architecture writeback: N/A: P13 owns writeback

## Rollout and rollback

- Rollout: requirements-baseline.md を作成し、feature-package.json の source_feature_digest と一致することを確認してから P02 へ引き継ぐ
- Rollback trigger and steps: goal-spec と features/feat-demo-coverage-dataset.md の内容不一致が判明した場合、requirements-baseline.md を作成前状態 (ファイル未作成) に戻し、goal-spec 側の再確定を dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/testing-qa.md (qa-236, qa-211), system-spec/00-requirements-definition.md, system-spec/database.md
- Architecture: arch-harness-hub-data (architecture/harness-hub-data.md), arch-harness-hub-testing-qa (architecture/harness-hub-testing-qa.md)
- Feature: feat-demo-coverage-dataset
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: なし (P01 は本 package の起点 task)
