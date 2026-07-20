# System task overlay: 要件ベースライン確定 — TypeScript統一Publisher・Device Flow認証・検査ロジック共有・wranglerスクリプト実行・初回publish15分以内

## Machine-readable registration fields

- feature_package_id: feature-package/feat-publisher-plugin (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-publisher-plugin", "macro-feature", "documentation", "requirements-baseline"]
- related_nodes: ["feat-publisher-plugin", "arch-harness-hub-backend", "arch-harness-hub-security"]
- parent_feature: feat-publisher-plugin
- phase_ref: P01
- classification: confidence=0.86, reason="goal-spec.json の purpose/goal/scope_in/scope_out/acceptance/quality_constraints を要件ベースラインとして確定する P01 要件タスク", candidates=[{artifact_kind: task, confidence: 0.86, candidate_path: tasks/feat-publisher-plugin/sys-publisher-plugin-p01.md}]
- tracker_binding_intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

goal-spec.json の purpose/goal/scope_in 5件/scope_out 2件/acceptance 3件/quality_constraints 8件/lineage 4件を逐語転記し、feat-publisher-plugin の要件ベースラインとして確定する。以降の P02-P13 は本ベースラインの確定内容にのみ従う。

## 背景

作者 (macOS/Windows) が Claude Code / Codex から自己完結で publish できる操作面 (slash command + skill + スクリプト) を TypeScript で提供し、既存 Python 資産 (plugins/harness-creator の package check / package contract / marketplace catalog) を挙動同値で移植する (qa-010/C3)。認証は OAuth Device Authorization Flow (RFC 8628) を採用し token は OS の資格情報域 (macOS Keychain / Windows Credential Manager) にのみ保存する (qa-008/qa-041)。検査ロジックは Hub 側 (Workers=JS) と共有し二重実装を回避する (qa-010/qa-020)。target=web_app の出口は作者 local session での wrangler CLI スクリプト実行とし、Hub は URL 登録・公開範囲検査・health 確認のみを担う (I5/qa-003/qa-043)。専用 desktop GUI は作らない (qa-007)。作者/提供者環境は macOS 主・Windows 従とし、Claude Code + pnpm (corepack 経由・他パッケージマネージャ禁止) + git + wrangler CLI を用い、両 OS で同一の pnpm script が動作すること (qa-043)。Hub 側 API 実装は feat-publish-pipeline の責務でありスコープ外、本 feature は同 feature へ依存する。到達ゴールは作者環境からの初回 publish が 15 分以内 (O4/H8) に完了する状態である。

## 前提条件

- Macro entry gate: `parent_feature.depends_on all done|closed`。canonical parent feature の現行depends_onを都度評価し、task edgeへ複製しない。

- Required spec/architecture/phase/task nodes: feat-publisher-plugin, arch-harness-hub-backend, arch-harness-hub-security
- Entry gate: goal-spec.json の feature_context_digest が sha256:d75423be3a7865ec787158d70131636955ade571d9eeb1e338cdf2f0de257a41 に一致し、verification.status=complete であること。features/feat-publisher-plugin.md/.context.json が実在し graph_node_id=feat-publisher-plugin で一致すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature は Hub 側 frontend の変更を伴わない。Publisher の操作面は slash command/skill/script であり Web UI を持たない
- Backend: N/A: 本 task は要件確定のみでコード実装を伴わない
- API: N/A: 本 task は要件確定のみで API 契約定義を伴わない
- Data: N/A: 本 feature は永続データストアのスキーマ変更を伴わない (Hub 側スキーマは feat-domain-model-db/feat-publish-pipeline が所有)
- Infrastructure: N/A: 新規インフラのプロビジョニングは本 task の対象外
- Security: applicable + change: Device Flow 数値契約 (qa-008/qa-041) と OS 資格情報域格納制約を要件ベースラインに明記する
- Quality: applicable + change: quality_constraints 8 件・acceptance 3 件を漏れなく要件ベースラインへ転記する
- Documentation: applicable + change: docs/features/feat-publisher-plugin/requirements-baseline.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-security (要件確定段階の参照。具体的な設計判断は P02 で確定する)
- Deploy unit/environment: author-local-session/harness-hub-publisher-plugin (作者ローカル session で稼働する Publisher CLI/plugin の配布・実行単位)
- Compatibility/migration/backfill: N/A: 本 task は要件確定のみで実装・migration を伴わない

## 成果物

- Produced artifacts: docs/features/feat-publisher-plugin/requirements-baseline.md (purpose/goal/scope_in 5件/scope_out 2件/acceptance 3件/quality_constraints 8件/lineage 4件を逐語転記)
- Consumed artifacts: goal-spec.json, features/feat-publisher-plugin.md, features/feat-publisher-plugin.context.json, architecture/harness-hub-backend.md, architecture/harness-hub-security.md, specs/harness-hub-system-specification.md
- Write scope/touches: docs/features/feat-publisher-plugin/requirements-baseline.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-publisher-plugin-p01) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-publisher-plugin-p01 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-publisher-plugin-p01) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on が空のため他 task との着手順序制約はない。resource_scope (docs/features/feat-publisher-plugin/requirements-baseline.md) は他 task の active lease と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- Hub 側 API 実装 (goal-spec scope_out。owner=feat-publish-pipeline)
- 専用 desktop GUI (goal-spec scope_out、qa-007)
- 設計判断の確定 (P02 で行う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: requirements-baseline.md に purpose/goal/scope_in 5件/scope_out 2件/acceptance 3件/quality_constraints 8件 (id 単位) が goal-spec.json と逐語一致で記載されていること

## Rollout and rollback

- Rollout: requirements-baseline.md を作成し P02 (アーキテクチャ設計) へ引き継ぐ
- Rollback trigger and steps: goal-spec.json との逐語一致に齟齬が見つかった場合、requirements-baseline.md を修正し本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-publisher-plugin.context.json` (`sha256:d75423be3a7865ec787158d70131636955ade571d9eeb1e338cdf2f0de257a41`)
- Phase responsibility: 現行 context の purpose・goal・scope・acceptance を要件ベースラインへ全件固定する。
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

- System specification: system-spec/spec-state.json qa_log (qa-007, qa-008, qa-010, qa-020, qa-041, qa-043), system-spec/00-requirements-definition.md (U7, U8[C1-C4], I5, I9, O4/H8)
- Detailed authoritative source: features/feat-publisher-plugin.md, features/feat-publisher-plugin.context.json
- Architecture: arch-harness-hub-backend, arch-harness-hub-security
- Feature: feat-publisher-plugin
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: なし (P01 は本 package の起点 task)
