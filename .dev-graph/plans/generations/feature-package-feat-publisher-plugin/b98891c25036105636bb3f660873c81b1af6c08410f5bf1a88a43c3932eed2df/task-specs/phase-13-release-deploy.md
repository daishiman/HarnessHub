# System task overlay: リリース/デプロイ — Claude Code/Codex marketplaceへのPublisher plugin配布登録依頼とStage1完了条件判定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-publisher-plugin (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-publisher-plugin", "macro-feature", "operations", "release-deploy"]
- related_nodes: ["feat-publisher-plugin", "arch-harness-hub-backend", "arch-harness-hub-security"]
- parent_feature: feat-publisher-plugin
- phase_ref: P13
- classification: confidence=0.85, reason="marketplace.json への Publisher plugin 登録依頼内容の確定と acceptance 最終充足の close-out 判断を行う P13 リリースタスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-publisher-plugin/sys-publisher-plugin-p13.md}]
- tracker_binding_intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

本 feature の最終 task として、apps/publisher の Claude Code/Codex plugin 面を feat-stage0-distribution-gate で確立された配布経路 (marketplace.json 経由) への登録依頼内容を確定し、feat-publisher-plugin の Stage 1 完了条件 (macOS/Windows 実機 E2E 成功・pre-check と Hub 検査の判定同値・初回 publish 15 分以内) の充足結果を release-record.md として確定する。

## 背景

本 feature は Hub 本体のデプロイを持たないため、P13 (リリース/デプロイ) は Hub 本体への実デプロイではなく、(1) Publisher plugin (slash command + skill + script) の marketplace.json への登録依頼内容の確定 (実際の登録作業・decision record 登録は C01 writer/dev-graph が所有)、(2) goal-spec.json の acceptance 3 件が P07/P10 で最終的に満たされていることの close-out 判断、(3) feat-publish-pipeline への依存 (Hub 側 API 実装) が feat-publish-pipeline 側で提供済み・利用可能であることの確認、という 3 点を扱う。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-publisher-plugin, arch-harness-hub-backend, arch-harness-hub-security
- Entry gate: docs/features/feat-publisher-plugin/runbook.md が P12 完了時点で存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature は frontend 実装物を持たない
- Backend: N/A: 本 feature は Hub backend の変更を伴わない
- API: N/A: 本 feature は API 契約の新設を伴わない
- Data: N/A: marketplace.json への登録依頼内容の確定のみで実書込は行わない
- Infrastructure: N/A: 本 feature は Hub 本体の実デプロイを持たない
- Security: N/A: セキュリティ観点の最終確認は P10 で完了済み
- Quality: applicable + change: acceptance 3 件の最終充足確認結果を release-record.md に確定記録する
- Documentation: applicable + change: docs/features/feat-publisher-plugin/release-record.md を新規作成する
- Operations: applicable + change: marketplace.json への Publisher plugin 登録依頼内容を確定し dev-graph への引き渡し内容として整理する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-security (P02 の architecture decision の正本参照)
- Deploy unit/environment: author-local-session/harness-hub-publisher-plugin (作者ローカル session で稼働する Publisher CLI/plugin の配布・実行単位)
- Compatibility/migration/backfill: N/A: 本 task は登録依頼確定と判定のみで実コードへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-publisher-plugin/release-record.md
- Consumed artifacts: docs/features/feat-publisher-plugin/runbook.md, docs/features/feat-publisher-plugin/final-review-record.md, features/feat-publisher-plugin.md
- Write scope/touches: docs/features/feat-publisher-plugin/release-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-publisher-plugin-p13) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-publisher-plugin-p13 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-publisher-plugin-p13) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=['SYS-PUBLISHER-PLUGIN-P12']。resource_scope (docs/features/feat-publisher-plugin/release-record.md) は他 task の active lease と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- Hub 側 API 実装 (goal-spec scope_out。owner=feat-publish-pipeline)
- 専用 desktop GUI (goal-spec scope_out, qa-007)
- marketplace.json への実書込 (owner=dev-graph/C01 writer相当。本 task は登録依頼内容の確定のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: release-record.md に acceptance 3 件の最終充足確認結果・marketplace.json 登録依頼内容・feat-publish-pipeline 依存の利用可能性確認の 3 点が記載されていること. Normative evidence: plugin manifest/slash command/skill/scriptの実体、apps/publisherへの単一接続、Keychain/Credential Manager、macOS/Windows E2E、初回15分、marketplace sourceのcontent hashを必須とする。

## Rollout and rollback

- Rollout: release-record.md を作成し、marketplace.json への登録依頼を dev-graph へ引き渡す
- Rollback trigger and steps: acceptance 3 件のいずれかが最終確認時点で満たされないと判明した場合、release-record.md に不成立理由を記録し、fail-closed として登録依頼の発行を保留する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-publisher-plugin.context.json` (`sha256:d75423be3a7865ec787158d70131636955ade571d9eeb1e338cdf2f0de257a41`)
- Phase responsibility: release/deploy/close-out と rollback 証跡を残し、N/A でも理由を確定する。
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

## Normative implementation closure (2026-07-19)

This section is normative for P13 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-publisher-plugin.context.json; system-spec/backend.md qa-010; docs/publisher-spec.md; Stage 0 adopted distribution decision
- Effective phase contract: Claude Code/Codex plugin面は plugins/harness-hub-publisher/ に slash command、skill、scripts、manifestを実装する。apps/publisherは共有CLI/library実体としてplugin scriptから呼び出し、二つの独立実装を作らない。P13のmarketplace登録はP05で構築・P06でmacOS/Windows検証済みのplugin artifactだけを参照する。OS credential adapterはKeychain/Credential Managerを実装する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `plugins/harness-hub-publisher/`
- `apps/publisher/`
- `packages/schemas/publisher-plugin/`
- Mandatory evidence: plugin manifest/slash command/skill/scriptの実体、apps/publisherへの単一接続、Keychain/Credential Manager、macOS/Windows E2E、初回15分、marketplace sourceのcontent hashを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: goal-spec.json acceptance
- Detailed authoritative source: docs/features/feat-publisher-plugin/runbook.md, docs/features/feat-publisher-plugin/final-review-record.md
- Architecture: arch-harness-hub-backend, arch-harness-hub-security
- Feature: feat-publisher-plugin
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-PUBLISHER-PLUGIN-P12
