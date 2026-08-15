# System task overlay: ドキュメント/運用 — route×状態到達手順の runbook 作成

## Machine-readable registration fields

- feature_package_id: feature-package/feat-demo-coverage-dataset (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-demo-coverage-dataset", "macro-feature", "testing-qa", "seed", "coverage", "documentation", "operations"]
- related_nodes: ["feat-demo-coverage-dataset", "arch-harness-hub-data", "arch-harness-hub-testing-qa"]
- parent_feature: feat-demo-coverage-dataset
- phase_ref: P12
- classification: confidence=0.84, reason="P11 のエビデンスを踏まえ、seed 投入手順と seed 済み状態から特定 route の特定状態へ到達する手順を runbook 化する P12 タスク (feat-ui-integrity-audit-harness が本 runbook を前提データとして消費する)", candidates=[{artifact_kind: task, confidence: 0.84, candidate_path: tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p12.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P11 のエビデンスを踏まえ、seed 実行手順と、seed 済み状態から対象 28 route の各 5 状態へ到達する手順を runbook として文書化する。この task 完了時点で、goal-spec scope_in の「seed 済み状態から特定 route の特定状態へ到達する手順の文書化」が達成され、後続 feature `feat-ui-integrity-audit-harness` が本 runbook を前提データの利用手順として参照できる状態になる。

## 背景

seed 投入自体は P05 で自動化されるが、実ブラウザ検査の担当者 (feat-ui-integrity-audit-harness) や人手での確認担当者が、どの route でどの操作を行えば 空/1件/大量/長文/エラー の各状態を目視確認できるかは、投入されたデータの内容を知らなければ分からない。本 task は、この「到達手順」を runbook として明文化し、後続 feature の前提データ利用を円滑にする。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-demo-coverage-dataset, arch-harness-hub-data, arch-harness-hub-testing-qa
- Entry gate: docs/features/feat-demo-coverage-dataset/evidence/index.md (P11 成果物) が参照切れ 0 件で存在すること
- P01 upstream entry gate: N/A: intra-feature depends_on gate (P12 は P11 完了を depends_on として直接要求する)
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は runbook 文書化のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は runbook 文書化のみで backend 実装物を変更しない
- API: N/A: 本 feature は API endpoint を持たない
- Data: N/A: データ実装自体の変更は行わない (P05 実装済みの seed-coverage.ts の使い方を文書化するのみ)
- Infrastructure: N/A: 追加インフラを新設しない
- Security: applicable + 内容: runbook にローカル以外 URL 実行時の拒否確認手順を明記し、ガードの安全な運用方法を伝える
- Quality: N/A: 品質ゲートの再確認は P09/P10 で完了済み
- Documentation: applicable + 内容: docs/features/feat-demo-coverage-dataset/runbook.md を新規作成する
- Operations: applicable + 内容: seed 実行手順・28 route 全件について 5 状態それぞれへ到達する手順を運用者向けに明文化する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-testing-qa
- Deploy unit/environment: cloudflare-workers/hub (runbook はローカル開発環境での操作手順を対象とする)
- Compatibility/migration/backfill: N/A: P08 で migration 不要と確定済み

## 成果物

- Produced artifacts: docs/features/feat-demo-coverage-dataset/runbook.md (seed 実行手順、28 route × 5 状態到達手順、ローカル以外 URL 拒否確認手順を含む)
- Consumed artifacts: docs/features/feat-demo-coverage-dataset/evidence/index.md, route-state-matrix.md, packages/db/scripts/seed-coverage.ts
- Write scope/touches: docs/features/feat-demo-coverage-dataset/runbook.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-demo-coverage-dataset-p12) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-demo-coverage-dataset-p12 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-demo-coverage-dataset-p12) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DEMO-COVERAGE-DATASET-P11] のため P11 完了後に着手する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 実ブラウザ検査の実施 (owner=feat-ui-integrity-audit-harness。本 task は runbook 提供のみ)
- 実装コードの修正
- 本番・staging データベースへの投入

## テスト戦略

- テストレベル選定: 単体・結合・境界値・回帰の 4 レベルのうち、本 task は runbook 文書化のみでコード成果物を持たないため 4 レベルすべて N/A: 本 task は文書作成業務でありテスト対象コードを持たない。runbook 記載手順の実行可能性は、作成者自身が P05 実装物 (seed-coverage.ts) に対して手順をなぞって確認する
- カバレッジ目標: N/A: 本 task はコード成果物を持たないためカバレッジ計測対象がない。既定 80% のカバレッジ確認手順は P09 の記録を参照する形で runbook に記載する
- 層別方針: Documentation/Operations 層 = runbook 記載の各手順が実際に P05 実装物へ対して実行可能かを 1 回ずつなぞって確認する。Security 層 = ローカル以外 URL 拒否確認手順が実際の非 0 終了と一致することを確認する
- 保守性制約: runbook は route 名・状態名・コマンドといったテキストベースの手順として記述し、pixel 位置依存・DOM 構造依存の記述 (座標・要素構造への言及) は含まない

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-demo-coverage-dataset`
- Required evidence: runbook.md に seed 実行手順・28 route 全件について 5 状態それぞれへ到達する手順・ローカル以外 URL 実行時の拒否確認手順の 3 項目が記載されていること

## Inner goal-seek execution loop

- Methodology contract: system-task-goal-seek/v1
- Goal: runbook.md が seed 実行から 28 route × 5 状態への到達までを迷いなく辿れる手順として確定している状態
- Generic execution prompt: route-state-matrix.md と evidence/index.md を読み、seed 実行コマンドと 28 route × 5 状態それぞれへの到達手順 (URL パス・確認する UI 要素の説明) を runbook.md にまとめよ。手順は実際に P05 実装物に対してなぞって確認すること
- Rubric: (1) seed 実行手順が記載されている (2) 28 route 全件 × 5 状態の到達手順が記載されている (3) ローカル以外 URL 拒否確認手順が記載されている (4) 記載手順を実際になぞって確認した記録がある (5) validate-system-plan.py が本 task に関する違反 0 件で完了する
- Feedback loop: 作成 → 手順のなぞり確認 → 矛盾があれば P11 のエビデンスと突き合わせ修正 → 再確認 → rubric verdict=PASS まで反復。上限 (3 回) 到達時は fail-closed とし team-lead へ差し戻す
- P13 spec/architecture writeback: N/A: P13 owns writeback

## Rollout and rollback

- Rollout: runbook.md を作成し、P13 へ引き継ぐ
- Rollback trigger and steps: runbook.md の記載が P11 エビデンスと矛盾する場合、矛盾箇所を記録し sys-demo-coverage-dataset-p11 を再確認対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/testing-qa.md (qa-236)
- Architecture: arch-harness-hub-data (architecture/harness-hub-data.md), arch-harness-hub-testing-qa (architecture/harness-hub-testing-qa.md)
- Feature: feat-demo-coverage-dataset
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成しない
- Dependencies: sys-demo-coverage-dataset-p11
