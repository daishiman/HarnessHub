# System task overlay: エビデンス収集 — 再現可能な検証証跡の集約

## Machine-readable registration fields

- feature_package_id: feature-package/feat-docs-cms (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-docs-cms", "studio-extension", "docs-cms", "evidence"]
- related_nodes: ["feat-docs-cms", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
- parent_feature: feat-docs-cms
- phase_ref: P11
- classification: confidence=0.84, reason="P06/P07/P09/P10 の検証結果を再現可能な証跡として索引化する P11 タスク", candidates=[{artifact_kind: task, confidence: 0.84, candidate_path: tasks/feat-docs-cms/sys-docs-cms-p11.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P06 (テスト実行)・P07 (受入)・P09 (品質保証)・P10 (最終レビュー) の検証結果を、第三者が再実行して同一結果を得られる再現可能な証跡として docs/features/feat-docs-cms/evidence/ に索引化する。

## 背景

feature-execution-package-contract.md §3 は P11 を「再現可能なエビデンス」と定めており、口頭または一時的な確認ではなく、コマンドと結果が紐づいた形で検証証跡を残すことを求める。これにより P12 のドキュメント化と将来の監査・引き継ぎが、実行済みタスクを再走査せずに参照可能になる。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-docs-cms
- Entry gate: sys-docs-cms-p10 の final-review-notes.md で quality_constraints 8 件すべてが充足と判定されていること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は既存成果物の索引化のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は既存成果物の索引化のみで backend 実装物を変更しない
- API: N/A: 本 task は既存成果物の索引化のみ
- Data: N/A: 本 task は既存成果物の索引化のみ
- Infrastructure: N/A: 本 feature は追加インフラを新設しない
- Security: applicable + change: tenant 分離・doc 編集監査・AI キュー認可・XSS sanitize の検証コマンドと結果を証跡として索引化する
- Quality: applicable + change: evidence/index.md に P06/P07/P09/P10 の成果物への参照と再実行コマンドを記録する
- Documentation: applicable + change: docs/features/feat-docs-cms/evidence/ を新規作成する
- Operations: N/A: 運用手順の文書化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (本 task は証跡索引化のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は証跡索引化のみで実変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-docs-cms/evidence/index.md (P06/P07/P09/P10 成果物への参照と再実行コマンドの索引)
- Consumed artifacts: docs/features/feat-docs-cms/test-run-report.md, docs/features/feat-docs-cms/acceptance-report.md, docs/features/feat-docs-cms/quality-assurance-report.md, docs/features/feat-docs-cms/final-review-notes.md
- Write scope/touches: docs/features/feat-docs-cms/evidence/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-docs-cms-p11) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-docs-cms-p11 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-docs-cms-p11) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-docs-cms-p10 完了後に着手する。resource_scope (docs/features/feat-docs-cms/evidence/) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 新規テストの追加実行 (P06/P09 で既に確定した結果の索引化のみ)
- 実装コードの修正

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: evidence/index.md から P06/P07/P09/P10 の各成果物へのリンクと、それぞれの再実行コマンドが辿れること

## Rollout and rollback

- Rollout: evidence/index.md を作成し、P06/P07/P09/P10 全件への参照を確認してから P12 ドキュメント化へ引き継ぐ
- Rollback trigger and steps: 参照先成果物が未整合 (欠落・矛盾) の場合、evidence/index.md に不整合箇所を記録し、該当する原因 task を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/security.md (qa-025 SEC2/SEC6/SEC7/SEC8), system-spec/database.md (qa-024)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-docs-cms
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-docs-cms-p10
