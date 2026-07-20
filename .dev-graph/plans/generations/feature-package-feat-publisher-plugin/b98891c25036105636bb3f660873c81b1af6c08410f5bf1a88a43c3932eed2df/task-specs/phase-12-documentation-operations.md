# System task overlay: 文書化・runbook・引き継ぎ — 作者向けpublish手順・token失効導線・障害時対応手順の確立

## Machine-readable registration fields

- feature_package_id: feature-package/feat-publisher-plugin (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-publisher-plugin", "macro-feature", "documentation", "operations"]
- related_nodes: ["feat-publisher-plugin", "arch-harness-hub-backend", "arch-harness-hub-security"]
- parent_feature: feat-publisher-plugin
- phase_ref: P12
- classification: confidence=0.84, reason="作者向け publish 操作手順・token失効導線・障害時対応手順を runbook として確立する P12 文書化タスク", candidates=[{artifact_kind: task, confidence: 0.84, candidate_path: tasks/feat-publisher-plugin/sys-publisher-plugin-p12.md}]
- tracker_binding_intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

作者が Claude Code/Codex から `/harness-hub:publish` を実行して package 収集から公開完了までを自己完結で行うための操作手順、Device Flow token の失効導線 (Hub Web からの本人/admin による即時失効)、障害時対応手順 (pre-check 失敗時・Device Flow 承認タイムアウト時・wrangler 実行失敗時) を runbook.md として確立する。

## 背景

docs/backend-spec.md §4.1 の `DELETE /api/v1/tokens/:id` (本人または admin による失効) を Publisher token 失効導線として runbook に明記する。pre-check が Red/Yellow 判定を返した場合の作者への提示内容、Device Flow の user_code 入力タイムアウト (10分) 時の再試行手順、wrangler CLI 実行失敗時の作者向けエラーメッセージと再試行手順を runbook に含める。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-publisher-plugin, arch-harness-hub-backend, arch-harness-hub-security
- Entry gate: docs/features/feat-publisher-plugin/evidence-summary.md が P11 完了時点で存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature は frontend 実装物を持たない
- Backend: N/A: 本 task は文書化のみで新規実装を伴わない
- API: N/A: API 契約自体の変更は伴わない
- Data: N/A: 本 feature は永続データストアのスキーマ変更を伴わない
- Infrastructure: N/A: インフラ観点の確認は P09 で完了済み
- Security: applicable + change: token 失効導線 (Hub Web からの即時失効) を runbook に明記する
- Quality: N/A: 品質保証の詳細確認は P09 で完了済み
- Documentation: applicable + change: docs/features/feat-publisher-plugin/runbook.md を新規作成する
- Operations: applicable + change: 作者向け publish 手順・障害時対応手順を確立する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-security (P02 の architecture decision の正本参照)
- Deploy unit/environment: author-local-session/harness-hub-publisher-plugin (作者ローカル session で稼働する Publisher CLI/plugin の配布・実行単位)
- Compatibility/migration/backfill: N/A: 本 task は文書化のみで実装・migration を伴わない

## 成果物

- Produced artifacts: docs/features/feat-publisher-plugin/runbook.md
- Consumed artifacts: docs/features/feat-publisher-plugin/evidence-summary.md, docs/backend-spec.md §4.1
- Write scope/touches: docs/features/feat-publisher-plugin/runbook.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-publisher-plugin-p12) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-publisher-plugin-p12 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-publisher-plugin-p12) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=['SYS-PUBLISHER-PLUGIN-P11']。resource_scope (docs/features/feat-publisher-plugin/runbook.md) は他 task の active lease と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- token 失効の実装自体 (owner=feat-auth-tenancy/feat-publish-pipeline。本 task は導線の文書化のみ)
- Hub Web の UI 実装 (owner=feat-user-org-admin 等)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: runbook.md に作者向け publish 手順・token 失効導線・pre-check失敗時/Device Flow タイムアウト時/wrangler失敗時の障害時対応手順の 3 系統が記載されていること

## Rollout and rollback

- Rollout: runbook.md を作成し P13 (リリース/デプロイ) へ引き継ぐ
- Rollback trigger and steps: runbook.md の手順が実際の実装 (apps/publisher) と乖離することが判明した場合、実装または runbook.md のいずれかを修正し一致させた上で本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-publisher-plugin.context.json` (`sha256:d75423be3a7865ec787158d70131636955ade571d9eeb1e338cdf2f0de257a41`)
- Phase responsibility: 検証済み実装の運用・runbook・handover を文書化し、先行 phase の前提にしない。
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

This section is normative for P12 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-publisher-plugin.context.json; system-spec/backend.md qa-010; docs/publisher-spec.md; Stage 0 adopted distribution decision
- Effective phase contract: Claude Code/Codex plugin面は plugins/harness-hub-publisher/ に slash command、skill、scripts、manifestを実装する。apps/publisherは共有CLI/library実体としてplugin scriptから呼び出し、二つの独立実装を作らない。P13のmarketplace登録はP05で構築・P06でmacOS/Windows検証済みのplugin artifactだけを参照する。OS credential adapterはKeychain/Credential Managerを実装する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `plugins/harness-hub-publisher/`
- `apps/publisher/`
- `packages/schemas/publisher-plugin/`
- Mandatory evidence: plugin manifest/slash command/skill/scriptの実体、apps/publisherへの単一接続、Keychain/Credential Manager、macOS/Windows E2E、初回15分、marketplace sourceのcontent hashを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: docs/backend-spec.md §4.1
- Detailed authoritative source: docs/features/feat-publisher-plugin/evidence-summary.md
- Architecture: arch-harness-hub-backend, arch-harness-hub-security
- Feature: feat-publisher-plugin
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-PUBLISHER-PLUGIN-P11
