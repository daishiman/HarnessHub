# System task overlay: 独立設計レビュー — 対応表網羅性・冪等性設計・ローカル専用ガードの妥当性確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-demo-coverage-dataset (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-demo-coverage-dataset", "macro-feature", "testing-qa", "seed", "coverage", "design-review"]
- related_nodes: ["feat-demo-coverage-dataset", "arch-harness-hub-data", "arch-harness-hub-testing-qa"]
- parent_feature: feat-demo-coverage-dataset
- phase_ref: P03
- classification: confidence=0.86, reason="P02 で確定した route×状態対応表・enum 網羅方式・冪等性実現方式・ローカル専用ガード維持方針を、設計担当から独立した視点でレビューする P03 タスク", candidates=[{artifact_kind: task, confidence: 0.86, candidate_path: tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p03.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 の architecture-decision-record.md を、設計担当とは独立した視点でレビューし、route×状態対応表の網羅性・enum 全値網羅方式・冪等性実現方式・ローカル専用ガード非緩和方針の 4 論点が P05 実装の受入契約として十分かを判定する。この task 完了時点で、P04 のテスト設計・P05 の実装に着手可能な承認済み設計が確定する。

## 背景

本 feature は後続 feature `feat-ui-integrity-audit-harness` の前提データを担う機微な役割を持ち、対応表に未カバーの route×状態が残ると後続の実ブラウザ検査が偽の緑を出す。また、ローカル専用ガードの緩和は本番・staging データベースへの誤投入という重大なリスクに直結するため (goal-spec scope_out)、設計段階での独立レビューによって見落としを防ぐ必要がある。P03 は P02 の設計者自身ではなく独立した評価者の視点で、対応表の抜け・enum 値の網羅漏れ・冪等性実現方式の妥当性・ガード非緩和方針の明確さを確認する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-demo-coverage-dataset, arch-harness-hub-data, arch-harness-hub-testing-qa
- Entry gate: docs/features/feat-demo-coverage-dataset/architecture-decision-record.md (P02 成果物) が存在すること
- P01 upstream entry gate: N/A: intra-feature depends_on gate (P03 は P02 完了を depends_on として直接要求する)
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は設計文書のレビューのみで frontend 実装物を変更しない
- Backend: N/A: 本 task は設計文書のレビューのみで backend 実装物を変更しない
- API: N/A: 本 feature は API endpoint を持たない
- Data: applicable + 内容: route×状態対応表の網羅性 (28 route × 5 状態、未カバー 0 件) と各ドメイン enum 全値網羅方式の妥当性をレビューする
- Infrastructure: N/A: 追加インフラを新設しない
- Security: applicable + 内容: ローカル専用ガード非緩和方針が P02 設計に明記され、迂回経路が存在しないことをレビューする
- Quality: applicable + 内容: 冪等性実現方式 (削除→再作成) が「同じ seed を連続 2 回実行しても投入後の状態が一致する」という acceptance を満たす設計かをレビューする
- Documentation: applicable + 内容: docs/features/feat-demo-coverage-dataset/design-review-notes.md を新規作成する
- Operations: N/A: 本 task は設計レビューのみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-testing-qa
- Deploy unit/environment: cloudflare-workers/hub (本 task はレビューのみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task はレビューのみで実スキーマへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-demo-coverage-dataset/design-review-notes.md (承認可否判定、4 論点それぞれへの適合確認結果を含む)
- Consumed artifacts: docs/features/feat-demo-coverage-dataset/architecture-decision-record.md, docs/features/feat-demo-coverage-dataset/requirements-baseline.md
- Write scope/touches: docs/features/feat-demo-coverage-dataset/design-review-notes.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-demo-coverage-dataset-p03) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-demo-coverage-dataset-p03 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-demo-coverage-dataset-p03) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DEMO-COVERAGE-DATASET-P02] のため P02 完了後に着手する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 設計の修正そのもの (却下時は P02 へ差し戻し、P03 は判定のみを行う)
- 実装コードの作成
- 本番・staging データベースへの投入

## テスト戦略

- テストレベル選定: 単体・結合・境界値・回帰の 4 レベルのうち、本 task はレビュー業務でコード成果物を持たないため 4 レベルすべて N/A: 本 task はテスト対象コードを持たず、P04 で単体/結合/境界値/回帰の各テストを設計する
- カバレッジ目標: N/A: 本 task はコード成果物を持たないためカバレッジ計測対象がない。既定 80% は P05 実装対象コードに適用する方針が P02 設計に明記されているかをレビューする
- 層別方針: Backend/Data 層 = P02 設計に API 契約 (seed CLI の入出力契約) の検証方針と DB 結合 (seed 実行後の DB 状態確認) の検証方針が含まれているかをレビュー観点として確認する。Data/Security/Quality 層 = P02 設計文書の記述内容が具体的かつ機械検証可能な粒度かをチェックリストでレビューする。Documentation 層 = design-review-notes.md 自体のレビュー
- 保守性制約: レビューは設計文書の記述内容 (データ構造・生成規則・方針) に対して行い、pixel 位置依存・DOM 構造依存の観点は本 task の対象外 (P04 以降のテスト設計で禁止事項として明記する)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-demo-coverage-dataset`
- Required evidence: design-review-notes.md に承認可否と、28 route×5状態対応表の未カバー 0 件方針・enum 全値網羅方式・冪等性実現方式・ローカル専用ガード非緩和の 4 論点への適合確認結果が明記されていること

## Inner goal-seek execution loop

- Methodology contract: system-task-goal-seek/v1
- Goal: design-review-notes.md が P02 設計の 4 論点それぞれについて明確な承認/差し戻し判定を下している状態
- Generic execution prompt: architecture-decision-record.md と requirements-baseline.md を独立した視点で読み、4 論点 (対応表網羅性・enum 網羅方式・冪等性実現方式・ガード非緩和方針) それぞれの適合可否を判定せよ。判定根拠は具体的な記述箇所への参照を伴うこと
- Rubric: (1) 4 論点それぞれに pass/fail 判定が付与されている (2) fail 判定がある場合は具体的な差し戻し理由が記述されている (3) 承認の場合は P04 着手可能である旨が明記されている (4) validate-system-plan.py が本 task に関する違反 0 件で完了する
- Feedback loop: レビュー → 判定 → fail の場合は P02 を再実行対象として差し戻し → 再レビュー → rubric verdict=PASS まで反復。上限 (3 回) 到達時は fail-closed とし team-lead へ差し戻す
- P13 spec/architecture writeback: N/A: P13 owns writeback

## Rollout and rollback

- Rollout: design-review-notes.md に承認判定を記録し、P04 へ引き継ぐ
- Rollback trigger and steps: 差し戻しと判定された場合、design-review-notes.md に指摘事項を記録し、sys-demo-coverage-dataset-p02 を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/testing-qa.md (qa-236), system-spec/database.md
- Architecture: arch-harness-hub-data (architecture/harness-hub-data.md), arch-harness-hub-testing-qa (architecture/harness-hub-testing-qa.md)
- Feature: feat-demo-coverage-dataset
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成しない
- Dependencies: sys-demo-coverage-dataset-p02
