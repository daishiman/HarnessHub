# System task overlay: 実装 — apps/publisher (CLI + Claude Code/Codex plugin)・Device Flow認証クライアント・wrangler実行ラッパーの実装

## Machine-readable registration fields

- feature_package_id: feature-package/feat-publisher-plugin (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-publisher-plugin", "macro-feature", "backend", "implementation"]
- related_nodes: ["feat-publisher-plugin", "arch-harness-hub-backend", "arch-harness-hub-security"]
- parent_feature: feat-publisher-plugin
- phase_ref: P05
- classification: confidence=0.85, reason="P02/P04 で確定した設計とテストスタブに基づき apps/publisher の CLI core・auth・deploy・plugin 面を実装する P05 実装タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-publisher-plugin/sys-publisher-plugin-p05.md}]
- tracker_binding_intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 の architecture-decision-record.md と P04 の test-design.md に基づき、apps/publisher に Publisher core (TypeScript/Node/pnpm) を実装し、Claude Code/Codex plugin 面 (slash command `/harness-hub:publish` + skill + script) を実装する。

## 背景

apps/publisher/src/ に package 収集・manifest 補完・ローカル pre-check 呼び出し (packages/inspection の consumer)・Device Flow 認証クライアント・target=web_app 経路の wrangler CLI スクリプト実行ラッパーを実装する。認証は `POST /api/v1/device/code` で device_code/user_code/verification_uri/interval を取得し、`POST /api/v1/device/token` を interval (既定5秒、`slow_down` 受信時 +5秒) で polling し、承認後の access token (15分, 非保存) と refresh token (90日, `publisher_tokens.expires_at` に対応する rotation) を受け取る。token は macOS Keychain / Windows Credential Manager の OS 資格情報域にのみ保存し、平文ファイル・環境変数・リポジトリへの保存を行わない (qa-008/qa-041)。scope は `publish:write` のみを要求し、`metrics:write`/`feedback:write`/`aijob:process` は要求しない (最小権限)。ローカル pre-check は packages/inspection (feat-publish-pipeline 提供の共有パッケージ) を import して呼び出し、Publisher 側で検査ロジックを再実装しない (qa-010/qa-020)。package upload は `POST /api/v1/publish` → `PUT /api/v1/publish/:id/package` → `POST /api/v1/publish/:id/submit` → `GET /api/v1/publish/:id` (polling) の順で Hub API を呼び出す。target=web_app の場合、apps/publisher/src/deploy/ で wrangler CLI をローカルスクリプト実行し、実行結果 (exit code/URL) を `POST /api/v1/projects/:id/deployment` で Hub へ登録する。既存 Python 資産 (plugins/harness-creator の package check / package contract / marketplace catalog 相当ロジック) は仕様の正本 (移植元) として参照するのみで、実際の TS 実装 (packages/inspection) 自体は feat-publish-pipeline の P05 が提供済みのものを消費する。両 OS (macOS 主・Windows 従) で同一の pnpm script (corepack 経由、他パッケージマネージャ禁止) が動作するよう、パス区切り・改行コード・シェル依存をコマンドへ埋め込まない実装とする (qa-043)。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-publisher-plugin, arch-harness-hub-backend, arch-harness-hub-security
- Entry gate: docs/features/feat-publisher-plugin/test-design.md が P04 完了時点で存在すること。feat-publish-pipeline が提供する packages/inspection および Hub 側 device/publish/deployment endpoint が利用可能であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature は Hub frontend の変更を伴わない
- Backend: applicable + change: apps/publisher/src/ (CLI core・auth・deploy) を実装する
- API: applicable + change: packages/schemas の生成型を import して Hub API 呼出しクライアントを実装する
- Data: N/A: 本 feature は永続データストアのスキーマ変更を伴わない
- Infrastructure: applicable + change: wrangler CLI ローカル実行ラッパーを実装する
- Security: applicable + change: Device Flow 認証クライアント・OS 資格情報域への token 保存を実装する
- Quality: applicable + change: P04 のテストスタブに対応する実装対象を過不足なく実装する
- Documentation: applicable + change: docs/features/feat-publisher-plugin/implementation-notes.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-security
- Deploy unit/environment: author-local-session/harness-hub-publisher-plugin (作者ローカル session で稼働する Publisher CLI/plugin の配布・実行単位)
- Compatibility/migration/backfill: N/A: 本 task はコード実装のみで Hub 側スキーマへの変更を伴わない

## 成果物

- Produced artifacts: apps/publisher/ (CLI core・auth・deploy・plugin 面), packages/schemas/publisher-plugin/ (Publisher 固有 zod スキーマ), docs/features/feat-publisher-plugin/implementation-notes.md, plugins/harness-hub-publisher/, apps/publisher/, packages/schemas/publisher-plugin/ (normative implementation artifacts)
- Consumed artifacts: docs/features/feat-publisher-plugin/test-design.md, docs/backend-spec.md §4.1/§4.6/§6.1, packages/inspection (feat-publish-pipeline 提供), packages/schemas (feat-publish-pipeline/feat-auth-tenancy 提供の生成型)
- Write scope/touches: apps/publisher/, packages/schemas/publisher-plugin/, docs/features/feat-publisher-plugin/implementation-notes.md, plugins/harness-hub-publisher/, apps/publisher/, packages/schemas/publisher-plugin/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-publisher-plugin-p05) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-publisher-plugin-p05 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-publisher-plugin-p05) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=['SYS-PUBLISHER-PLUGIN-P04']。resource_scope (apps/publisher/, packages/schemas/publisher-plugin/, docs/features/feat-publisher-plugin/implementation-notes.md) は他 task の active lease と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- packages/inspection の実装 (owner=feat-publish-pipeline。本 task は import のみ)
- Hub 側 device/publish/deployment endpoint の実装 (owner=feat-publish-pipeline/feat-auth-tenancy)
- 専用 desktop GUI の実装 (goal-spec scope_out, qa-007)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: apps/publisher/ に CLI core・auth・deploy・plugin 面が実装され、P04 の test-design.md に列挙された全テストケースに対応する実装対象が揃っていること. Normative evidence: plugin manifest/slash command/skill/scriptの実体、apps/publisherへの単一接続、Keychain/Credential Manager、macOS/Windows E2E、初回15分、marketplace sourceのcontent hashを必須とする。

## Rollout and rollback

- Rollout: apps/publisher と packages/schemas/publisher-plugin/ の実装を完了し、P02 の architecture decision との一致を確認してから P06 (テスト実行) へ引き継ぐ
- Rollback trigger and steps: 実装が P02 の architecture decision と矛盾する場合 (例: packages/inspection の検査ロジックが重複実装された場合、token が平文で保存された場合)、該当コードを削除し P02 の設計に沿って再実装する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-publisher-plugin.context.json` (`sha256:d75423be3a7865ec787158d70131636955ade571d9eeb1e338cdf2f0de257a41`)
- Phase responsibility: P04 を先行条件として現行 scope_in を実装し、scope_out を混入させない。
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

This section is normative for P05 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-publisher-plugin.context.json; system-spec/backend.md qa-010; docs/publisher-spec.md; Stage 0 adopted distribution decision
- Effective phase contract: Claude Code/Codex plugin面は plugins/harness-hub-publisher/ に slash command、skill、scripts、manifestを実装する。apps/publisherは共有CLI/library実体としてplugin scriptから呼び出し、二つの独立実装を作らない。P13のmarketplace登録はP05で構築・P06でmacOS/Windows検証済みのplugin artifactだけを参照する。OS credential adapterはKeychain/Credential Managerを実装する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `plugins/harness-hub-publisher/`
- `apps/publisher/`
- `packages/schemas/publisher-plugin/`
- Mandatory evidence: plugin manifest/slash command/skill/scriptの実体、apps/publisherへの単一接続、Keychain/Credential Manager、macOS/Windows E2E、初回15分、marketplace sourceのcontent hashを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/spec-state.json qa_log (qa-003, qa-007, qa-008, qa-010, qa-020, qa-041, qa-043)
- Detailed authoritative source: docs/backend-spec.md §4.1, §4.6, §6.1; docs/security-spec.md §2.2
- Architecture: arch-harness-hub-backend, arch-harness-hub-security
- Feature: feat-publisher-plugin
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-PUBLISHER-PLUGIN-P04
