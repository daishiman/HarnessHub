# System task overlay: テストファースト設計 — quality_constraints 8件・acceptance 3件に対応する挙動同値性テスト・実機E2Eタイムボックス計測ケースの設計

## Machine-readable registration fields

- feature_package_id: feature-package/feat-publisher-plugin (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-publisher-plugin", "macro-feature", "quality", "test-design"]
- related_nodes: ["feat-publisher-plugin", "arch-harness-hub-backend", "arch-harness-hub-security"]
- parent_feature: feat-publisher-plugin
- phase_ref: P04
- classification: confidence=0.84, reason="P03 でレビュー済みの設計に基づき quality_constraints 8 件・acceptance 3 件に対応するテストケースを設計する P04 テストファーストタスク", candidates=[{artifact_kind: task, confidence: 0.84, candidate_path: tasks/feat-publisher-plugin/sys-publisher-plugin-p04.md}]
- tracker_binding_intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P03 でレビュー済みの設計に基づき、goal-spec.json の quality_constraints 8 件・acceptance 3 件それぞれに対応するテストケースを設計する。特に Python 資産との挙動同値性テスト・Hub 検査との判定同値性テスト・macOS/Windows 実機 E2E タイムボックス (15 分以内) 計測ケースを設計する。

## 背景

P05 (実装) 着手前に、(1) 既存 Python 資産 (plugins/harness-creator の package check / package contract / marketplace catalog 相当ロジック) と packages/inspection (TS 移植先) の挙動同値性テスト、(2) Publisher のローカル pre-check と Hub 公式検査 (feat-publish-pipeline 側 `POST /api/v1/publish/:id/submit`) の判定 (Green/Yellow/Red) 同値性テスト、(3) Device Flow 認証フロー (device_code TTL 10分・access token 15分・refresh token 90日 rotation・reuse-detection family 全失効) の単体テスト、(4) OS 資格情報域 (macOS Keychain / Windows Credential Manager) への token 保存・平文非保存の検証テスト、(5) macOS/Windows 実機での初回 publish E2E タイムボックス (15 分以内, O4/H8) 計測テストの 5 種を apps/publisher/src/__tests__/ にテストスタブとして設計する。テストは実装前に失敗する状態 (red) で用意し、P05 で green 化する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-publisher-plugin, arch-harness-hub-backend, arch-harness-hub-security
- Entry gate: docs/features/feat-publisher-plugin/design-review-notes.md が P03 完了時点で承認済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature は frontend 実装物を持たない
- Backend: applicable + change: apps/publisher/src/__tests__/ にテストスタブを作成する
- API: N/A: 本 task はテスト設計のみで API 契約自体は P02 で確定済み
- Data: N/A: 本 feature は永続データストアのスキーマ変更を伴わない
- Infrastructure: N/A: 実機環境の準備確認は P06 で行う
- Security: applicable + change: Device Flow token 保存・非保存検証テストを設計する
- Quality: applicable + change: quality_constraints 8 件・acceptance 3 件に対応するテストケースを漏れなく設計する
- Documentation: applicable + change: docs/features/feat-publisher-plugin/test-design.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-security (P02 の architecture decision の正本参照)
- Deploy unit/environment: author-local-session/harness-hub-publisher-plugin (作者ローカル session で稼働する Publisher CLI/plugin の配布・実行単位)
- Compatibility/migration/backfill: N/A: 本 task はテスト設計のみで実装・migration を伴わない

## 成果物

- Produced artifacts: docs/features/feat-publisher-plugin/test-design.md, apps/publisher/src/__tests__/ (テストスタブ)
- Consumed artifacts: docs/features/feat-publisher-plugin/design-review-notes.md, docs/features/feat-publisher-plugin/architecture-decision-record.md
- Write scope/touches: docs/features/feat-publisher-plugin/test-design.md, apps/publisher/src/__tests__/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-publisher-plugin-p04) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-publisher-plugin-p04 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-publisher-plugin-p04) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=['SYS-PUBLISHER-PLUGIN-P03']。resource_scope (docs/features/feat-publisher-plugin/test-design.md, apps/publisher/src/__tests__/) は他 task の active lease と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- packages/inspection 自体のテスト実装 (owner=feat-publish-pipeline。本 task は Publisher 側消費テストのみ)
- Hub 側検査 endpoint のテスト実装 (owner=feat-publish-pipeline)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: test-design.md に quality_constraints 8 件 (id 単位)・acceptance 3 件それぞれに対応するテストケースが列挙され、apps/publisher/src/__tests__/ にスタブが存在すること. Normative evidence: plugin manifest/slash command/skill/scriptの実体、apps/publisherへの単一接続、Keychain/Credential Manager、macOS/Windows E2E、初回15分、marketplace sourceのcontent hashを必須とする。

## Rollout and rollback

- Rollout: test-design.md とテストスタブを作成し P05 (実装) へ引き継ぐ
- Rollback trigger and steps: quality_constraints/acceptance の対応漏れが発見された場合、test-design.md を修正し不足テストケースを追加した上で本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-publisher-plugin.context.json` (`sha256:d75423be3a7865ec787158d70131636955ade571d9eeb1e338cdf2f0de257a41`)
- Phase responsibility: 全 acceptance と品質制約を実装前のテストケースへ写像する。
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

This section is normative for P04 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-publisher-plugin.context.json; system-spec/backend.md qa-010; docs/publisher-spec.md; Stage 0 adopted distribution decision
- Effective phase contract: Claude Code/Codex plugin面は plugins/harness-hub-publisher/ に slash command、skill、scripts、manifestを実装する。apps/publisherは共有CLI/library実体としてplugin scriptから呼び出し、二つの独立実装を作らない。P13のmarketplace登録はP05で構築・P06でmacOS/Windows検証済みのplugin artifactだけを参照する。OS credential adapterはKeychain/Credential Managerを実装する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `plugins/harness-hub-publisher/`
- `apps/publisher/`
- `packages/schemas/publisher-plugin/`
- Mandatory evidence: plugin manifest/slash command/skill/scriptの実体、apps/publisherへの単一接続、Keychain/Credential Manager、macOS/Windows E2E、初回15分、marketplace sourceのcontent hashを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/spec-state.json qa_log (qa-007, qa-008, qa-010, qa-013, qa-020, qa-041, qa-043)
- Detailed authoritative source: docs/features/feat-publisher-plugin/architecture-decision-record.md, docs/features/feat-publisher-plugin/design-review-notes.md
- Architecture: arch-harness-hub-backend, arch-harness-hub-security
- Feature: feat-publisher-plugin
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-PUBLISHER-PLUGIN-P03
