# System task overlay: リファクタリング/マイグレーション — Python→TypeScript 検査 pipeline 移植の最終整理と CI 恒久検査確立

## Machine-readable registration fields

- feature_package_id: feature-package/feat-publish-pipeline (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-publish-pipeline", "macro-feature", "backend", "refactor-migration"]
- related_nodes: ["feat-publish-pipeline", "arch-harness-hub-backend", "arch-harness-hub-security"]
- parent_feature: feat-publish-pipeline
- phase_ref: P08
- classification: confidence=0.85, reason="本 feature は packages/db/schema/ を write_scope に持たないため DB migration 生成を伴わない。P08 は harness-creator Python 資産の TypeScript 移植最終整理と検査ロジック二重実装防止の CI 恒久検査確立に読み替える required-node タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-publish-pipeline/sys-publish-pipeline-p08.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

本 feature は packages/db/schema/ 配下を write_scope に持たず (publish_requests/releases/target_channels/packages/deployment_references/audit_events/idempotency_ledger のスキーマ owner は feat-domain-model-db)、DB migration の生成・適用対象を持たない。したがって本 task は前例 (feat-domain-model-db の P08 における migration 生成) に相当する処理を、(1) 既存 Python 資産 (harness-creator の package check / package contract / marketplace catalog) から packages/inspection への移植の最終整理 (挙動同値性テストで検出された差分の是正、移植漏れチェック項目の解消)、(2) Publisher (feat-publisher-plugin) と Hub の検査ロジック二重実装を恒久的に防止する CI 検査の確立 (packages/inspection 外へ検査ロジックが複製されていないかを検出する import/依存グラフ検査)、(3) packages/db/schema/ への直接アクセスが apps/hub/src/lib/publish/ や apps/hub/src/app/api/v1/publish/ 配下に混入していないかを恒久的に検出する CI 検査の確立、に読み替えて実施する。

## 背景

qa-010/qa-020 の「検査ロジックは Hub 側と共有し二重実装を回避する」「既存 Python 資産を仕様の正本として TypeScript へ移植し、挙動同値性をテストで担保する」という要件は、移植完了時点の一致確認だけでなく、将来の変更で Publisher 側に検査ロジックが独自実装される事態を恒久的に防ぐ CI ゲートを要求する。本 task はこの要件を恒久的な検査として確立する唯一の task であり、P06 で判明した挙動同値性の差分があれば本 task で是正する。あわせて、P05 で実装した apps/hub 側コードが packages/db/schema/ への直接 import を持たないこと (feat-domain-model-db のリポジトリ層関数のみを経由すること) を CI で機械的に検証する。本 feature は control-plane DB のスキーマ変更を一切伴わないため、既存データへの後方互換性・backfill の考慮は構造的に発生しない。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-publish-pipeline, arch-harness-hub-backend, arch-harness-hub-security
- Entry gate: .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41 に一致し、confirmation_status=confirmed であること。P07 の docs/features/feat-publish-pipeline/acceptance-record.md が全項目 pass を記録していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 task は UI の変更を伴わない
- Backend: applicable + change: packages/inspection/ の Python→TypeScript 移植最終整理を行う
- API: N/A: エンドポイント契約自体の変更は伴わない
- Data: N/A: 本 feature は packages/db/schema/ への変更を一切行わない (feat-domain-model-db が owner)
- Infrastructure: N/A: 新規インフラのプロビジョニングは行わない
- Security: applicable + change: 検査ロジック二重実装防止 CI 検査・packages/db/schema/ 直接アクセス禁止 CI 検査を恒久ゲートとして確立する
- Quality: applicable + change: inspection-pipeline-shared-pure-function-package-qa010-qa020 の恒久的な充足を CI ゲートで保証する
- Documentation: applicable + change: docs/features/feat-publish-pipeline/refactoring-migration-note.md を新規作成する (Python 資産移植の最終差分整理記録を含む)
- Operations: N/A: 運用手順の確定は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-security
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 feature は packages/db/schema/ を write_scope に持たないため migration 生成・適用の対象がなく、後方互換性・backfill は構造的に N/A

## 成果物

- Produced artifacts: docs/features/feat-publish-pipeline/refactoring-migration-note.md (Python 資産移植の最終差分整理記録、検査ロジック二重実装防止 CI 検査の設定内容、packages/db/schema/ 直接アクセス禁止 CI 検査の設定内容を含む)、CI 検査設定 (検査ロジック複製禁止検査、apps/hub からの packages/db/schema/ 直接 import 禁止検査)
- Consumed artifacts: docs/features/feat-publish-pipeline/test-run-results.md, docs/features/feat-publish-pipeline/acceptance-record.md, packages/inspection/
- Write scope/touches: packages/inspection/, docs/features/feat-publish-pipeline/refactoring-migration-note.md (CI 検査設定ファイルは共有 CI 構成の不可侵範囲外である feature 固有チェックスクリプトに限定)

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-publish-pipeline-p08) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-publish-pipeline-p08 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-publish-pipeline-p08) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-PUBLISH-PIPELINE-P07]。resource_scope (packages/inspection/, docs/features/feat-publish-pipeline/refactoring-migration-note.md) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- packages/db/schema/ への migration 生成・適用 (owner=feat-domain-model-db。本 feature は永続化スキーマを持たない)
- 共有 CI パイプライン本体の変更 (共有 CI は不可侵。本 task は feature 固有チェックスクリプトの追加のみ)
- Publisher/CLI 側での packages/inspection 消費実装の変更 (owner=feat-publisher-plugin)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-publish-pipeline/refactoring-migration-note.md に Python 資産移植の最終差分整理記録・検査ロジック二重実装防止 CI 検査設定・packages/db/schema/ 直接アクセス禁止 CI 検査設定の 3 点が記載されていること

## Rollout and rollback

- Rollout: Python→TypeScript 移植の最終整理と CI 検査確立を完了し、refactoring-migration-note.md を確認してから P09 (品質保証) へ引き継ぐ
- Rollback trigger and steps: CI 検査導入により既存の正当な import が誤検知される場合、検査ルールを是正し本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (I2, D4, G1), system-spec/spec-state.json qa_log (qa-010, qa-020)
- Detailed authoritative source: docs/backend-spec.md §1, §6.1
- Architecture: arch-harness-hub-backend, arch-harness-hub-security
- Feature: feat-publish-pipeline
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-PUBLISH-PIPELINE-P07
