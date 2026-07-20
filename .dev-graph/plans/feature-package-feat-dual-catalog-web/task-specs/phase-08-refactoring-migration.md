# System task overlay: リファクタリング/マイグレーション — mockup由来静的画面からshared-layers準拠の本番動的コンポーネント構成への移行

## Machine-readable registration fields

- feature_package_id: feature-package/feat-dual-catalog-web (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-dual-catalog-web", "macro-feature", "frontend", "refactoring-migration"]
- related_nodes: ["feat-dual-catalog-web", "arch-harness-hub-frontend"]
- parent_feature: feat-dual-catalog-web
- phase_ref: P08
- classification: confidence=0.82, reason="docs/mockups/harness-studio-v2-analysis.md 由来の静的モック画面構造を、docs/shared-layers.md の部品実装順に準拠した本番 dynamic import 構成へ移行整理するP08タスク。本 feature は新規実装であり必須の legacy データ移行は無いため、コード構造移行に適用範囲を限定する", candidates=[{artifact_kind: task, confidence: 0.82, candidate_path: tasks/feat-dual-catalog-web/sys-dual-catalog-web-p08.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P05 で実装した S01-S04 コンポーネントのうち、docs/mockups/harness-studio-v2-analysis.md の静的モック分析に由来する構造を、docs/shared-layers.md が定める共有部品実装順序 (基盤コンポーネントの再利用を優先する構成) に準拠した本番向け dynamic import 構成へ移行整理し、CWV バンドル予算 (First Load JS 250KB/route 以下) への適合を最終確認する。

## 背景

docs/mockups/harness-studio-v2-analysis.md は初期のモック画面分析であり、実装 (P05) 段階では静的モックの構造をそのまま流用したコンポーネント境界が残る可能性がある。docs/shared-layers.md は packages/ui の共有コンポーネントを部品単位で段階的に実装する規約を定めており、本 task ではこの規約に沿って S01-S04 のコンポーネント構成を整理し、モック由来の重複コードや過剰な静的インポートを、動的インポート (dynamic import) によるルート分割へ置き換える。これは本 feature が新規実装であるため、既存データベースレコードや API の互換性移行 (backfill) を伴わない、コード構造上の移行に限定される。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-dual-catalog-web, arch-harness-hub-frontend
- Entry gate: P07 (docs/features/feat-dual-catalog-web/acceptance-record.md) が作成済みであり acceptance 3件が pass していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: apps/hub/src/components/catalog/ のコンポーネント構成をモック由来構造から dynamic import 構成へ移行する
- Backend: N/A: 本 task は frontend コンポーネント構造移行のみで backend 実装物を変更しない
- API: N/A: 本 task はコンポーネント構造移行のみで API 契約を変更しない
- Data: N/A: 本 feature は独自ドメインテーブルを持たずデータ移行を伴わない
- Infrastructure: N/A: デプロイ単位の変更を伴わない
- Security: N/A: 本 task はコンポーネント構造移行のみでセキュリティ制御の変更を伴わない
- Quality: applicable + change: 移行後のバンドルサイズが CWV バンドル予算 (First Load JS 250KB/route 以下) を満たすことを確認する
- Documentation: applicable + change: docs/features/feat-dual-catalog-web/refactoring-migration-note.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend (P02 architecture-decision-record.md の CWV バンドル予算決定を踏襲)
- Deploy unit/environment: cloudflare-workers/hub (本 task はコード構造移行のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 feature は新規実装であり既存データ・API の互換性移行は発生しない。コード構造の移行のみを扱う

## 成果物

- Produced artifacts: docs/features/feat-dual-catalog-web/refactoring-migration-note.md (移行差分整理とバンドル予算適合確認結果)
- Consumed artifacts: apps/hub/src/components/catalog/, docs/mockups/harness-studio-v2-analysis.md, docs/shared-layers.md
- Write scope/touches: apps/hub/src/components/catalog/, docs/features/feat-dual-catalog-web/refactoring-migration-note.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-dual-catalog-web-p08) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-dual-catalog-web-p08 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-dual-catalog-web-p08) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DUAL-CATALOG-WEB-P07] であり P07 完了後に着手する。resource_scope (apps/hub/src/components/catalog/) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 既存データベースレコード・API の互換性移行 (backfill) (本 feature は新規実装のため対象外)
- 新規機能の追加 (本 task は既存実装のコード構造移行のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-dual-catalog-web`
- Required evidence: refactoring-migration-note.md に mockup静的構造から本番 dynamic import 構成への移行差分整理と、CWVバンドル予算への適合確認結果が記載されていること

## Rollout and rollback

- Rollout: refactoring-migration-note.md を作成し、CWV バンドル予算適合を確認してから P09 (品質・セキュリティ・運用保証) へ引き継ぐ
- Rollback trigger and steps: 移行後の構成がCWVバンドル予算またはP02設計と矛盾する場合、該当コンポーネントを移行前構成へ戻し本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/spec-state.json qa_log (qa-018)
- Detailed authoritative source: docs/mockups/harness-studio-v2-analysis.md, docs/shared-layers.md
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-dual-catalog-web
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-DUAL-CATALOG-WEB-P07
