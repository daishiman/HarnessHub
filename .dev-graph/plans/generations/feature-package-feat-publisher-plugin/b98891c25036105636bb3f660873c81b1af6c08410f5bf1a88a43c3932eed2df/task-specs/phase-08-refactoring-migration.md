# System task overlay: リファクタリング/マイグレーション — Python資産参照コメントの整理とpackages/inspection消費コードのクリーンアップ

## Machine-readable registration fields

- feature_package_id: feature-package/feat-publisher-plugin (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-publisher-plugin", "macro-feature", "backend", "refactor-migration"]
- related_nodes: ["feat-publisher-plugin", "arch-harness-hub-backend", "arch-harness-hub-security"]
- parent_feature: feat-publisher-plugin
- phase_ref: P08
- classification: confidence=0.82, reason="本 feature は永続 DB migration を持たないため、Python資産参照コメント整理とinspection消費コードのクリーンアップに読み替える required-node タスク", candidates=[{artifact_kind: task, confidence: 0.82, candidate_path: tasks/feat-publisher-plugin/sys-publisher-plugin-p08.md}]
- tracker_binding_intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P07 で受入判定済みの実装に対し、既存 Python 資産 (plugins/harness-creator の package check / package contract / marketplace catalog 相当ロジック) への参照コメント・移行メモを整理し、Publisher 側の packages/inspection 消費コードに重複・不要な暫定実装が残っていないことを確認する。

## 背景

本 feature は永続 DB スキーマの migration を持たない (Hub 側スキーマは feat-domain-model-db が所有)。本 task は feature-execution-package-contract.md の P08 (リファクタリング/マイグレーション) を、(1) P05 実装時に一時的に残した Python 資産参照コメントの整理、(2) apps/publisher 側で packages/inspection の呼び出しが二重実装になっていないことの確認、(3) Python 資産自体 (plugins/harness-creator) への変更は行わず参照のみであることの明記、という読み替えで適用する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-publisher-plugin, arch-harness-hub-backend, arch-harness-hub-security
- Entry gate: docs/features/feat-publisher-plugin/acceptance-record.md が P07 完了時点で存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature は frontend 実装物を持たない
- Backend: applicable + change: apps/publisher/src/ の packages/inspection 呼び出しコードの整理・重複排除を行う
- API: N/A: API 契約自体の変更は伴わない
- Data: N/A: 本 feature は DB migration を持たない
- Infrastructure: N/A: 新規インフラのプロビジョニングは本 task の対象外
- Security: N/A: セキュリティ観点の詳細検証は P09 で扱う
- Quality: applicable + change: 整理結果と Python 資産非改変の明記を refactoring-migration-note.md に記録する
- Documentation: applicable + change: docs/features/feat-publisher-plugin/refactoring-migration-note.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend (P02 の architecture decision の正本参照)
- Deploy unit/environment: author-local-session/harness-hub-publisher-plugin (作者ローカル session で稼働する Publisher CLI/plugin の配布・実行単位)
- Compatibility/migration/backfill: N/A: 本 feature は DB migration や既存システムとの互換性維持対象コードを持たない

## 成果物

- Produced artifacts: docs/features/feat-publisher-plugin/refactoring-migration-note.md
- Consumed artifacts: apps/publisher/, docs/features/feat-publisher-plugin/acceptance-record.md
- Write scope/touches: apps/publisher/src/, docs/features/feat-publisher-plugin/refactoring-migration-note.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-publisher-plugin-p08) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-publisher-plugin-p08 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-publisher-plugin-p08) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=['SYS-PUBLISHER-PLUGIN-P07']。resource_scope (apps/publisher/src/, docs/features/feat-publisher-plugin/refactoring-migration-note.md) は他 task の active lease と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- plugins/harness-creator (Python 資産本体) への変更 (本 feature は参照のみで改変しない)
- packages/inspection 自体のリファクタリング (owner=feat-publish-pipeline)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: refactoring-migration-note.md に Python 資産参照コメントの整理結果・inspection 呼び出しの重複排除確認・Python 資産本体への非改変の明記の 3 点が記載されていること

## Rollout and rollback

- Rollout: refactoring-migration-note.md を作成し P09 (品質保証) へ引き継ぐ
- Rollback trigger and steps: 整理により実装が P02 の設計や P07 の受入結果と乖離した場合、変更を取り消し refactoring-migration-note.md に理由を記録した上で本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-publisher-plugin.context.json` (`sha256:d75423be3a7865ec787158d70131636955ade571d9eeb1e338cdf2f0de257a41`)
- Phase responsibility: migration・互換性・refactor の適用要否を実行し、N/A でも根拠を残す。
- Purpose: 作者が Claude Code / Codex から自己完結で publish できる操作面 (slash command + skill + スクリプト) を TypeScript で提供し、既存 Python 資産を挙動同値で移植する
- Goal: 作者環境 (macOS/Windows) から初回 publish が 15 分以内 (O4/H8) に完了する状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- package 収集 + manifest 補完
- ローカル pre-check (Hub と検査ロジック共有)
- Device Flow 認証 + OS 資格情報域保存
- web_app 経路の wrangler スクリプト実行
- Python 資産の挙動同値移植テスト
- Scope out:
- Hub 側 API 実装
- 専用 desktop GUI (作らない: qa-007)
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- macOS/Windows 両実機で publish E2E が成功する
- pre-check と Hub 検査の判定が同値
- 初回 publish 15 分以内の実測記録
- Architecture/source refs:
- architecture/harness-hub-backend.md
- architecture/harness-hub-security.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## 参照情報

- System specification: system-spec/spec-state.json qa-010 (C3 整合)
- Detailed authoritative source: docs/features/feat-publisher-plugin/acceptance-record.md
- Architecture: arch-harness-hub-backend
- Feature: feat-publisher-plugin
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-PUBLISHER-PLUGIN-P07
