# System task overlay: アーキテクチャ設計 — apps/publisher (TS/Node/pnpm) 構成・packages/inspection消費境界・Device Flow token保存方式・wrangler実行方式の決定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-publisher-plugin (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-publisher-plugin", "macro-feature", "backend", "architecture-decision"]
- related_nodes: ["feat-publisher-plugin", "arch-harness-hub-backend", "arch-harness-hub-security"]
- parent_feature: feat-publisher-plugin
- phase_ref: P02
- classification: confidence=0.85, reason="P01 の要件ベースラインに基づき apps/publisher の実装形態・packages/inspection 消費境界・Device Flow token 保存方式・wrangler 実行方式を確定する P02 アーキテクチャタスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-publisher-plugin/sys-publisher-plugin-p02.md}]
- tracker_binding_intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P01 の要件ベースラインに基づき、Publisher の実装形態 (apps/publisher、TypeScript/Node/pnpm)、Claude Code/Codex plugin 面 (slash command /harness-hub:publish + skill + script) の構成、packages/inspection の消費境界 (実装は feat-publish-pipeline が 所有、Publisher はローカル pre-check 呼び出しのみ)、Device Flow token の OS 資格情報域格納方式、target=web_app 経路の wrangler CLI スクリプト実行方式を確定する。

## 背景

docs/backend-spec.md の monorepo 構成案 (apps/publisher: Publisher CLI, Claude Code/Codex plugin, qa-010) に従い apps/publisher を Publisher core の実装場所として確定する。plugin 面は plugins/harness-hub-publisher/ 配下に slash command (`/harness-hub:publish`) + skill + scripts として配置し、apps/publisher/src/ の CLI 実装を呼び出す ラッパーとする。packages/inspection (検査 pipeline 純関数) は feat-publish-pipeline の P05 が実装・所有するため、本 feature は 同パッケージを consumer として import するのみで再実装しない (qa-010/qa-020, C3)。認証は OAuth Device Authorization Flow (RFC 8628) を採用し、docs/backend-spec.md §4.1 の `POST /api/v1/device/code` → `POST /api/v1/device/token` (polling, interval 5秒) → 承認後 access token (15分, 非保存) + refresh token (90日, rotation) 発行の経路を Publisher 側から 呼び出す。token は macOS Keychain / Windows Credential Manager の OS 資格情報域にのみ保存し、平文ファイル・環境変数・リポジトリへの保存を行わない (qa-008/qa-041)。scope は `publish:write` のみを要求する最小権限とする (S-D7)。target=web_app の出口は Publisher が wrangler CLI をローカルでスクリプト実行し、結果 (exit code/URL) を `POST /api/v1/projects/:id/deployment` で Hub へ登録する (I5/qa-003/qa-043)。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-publisher-plugin, arch-harness-hub-backend, arch-harness-hub-security
- Entry gate: docs/features/feat-publisher-plugin/requirements-baseline.md が P01 完了時点で存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature は Hub frontend の変更を伴わない
- Backend: applicable + change: apps/publisher の内部構成 (cli/ core/ inspection-client/ auth/ deploy/) を設計する
- API: applicable + change: Hub API (device/publish/deployment 系 endpoint) の呼出し境界とリクエスト/レスポンス型 (packages/schemas 生成型 import) を設計する
- Data: N/A: 本 feature は永続データストアのスキーマ変更を伴わない
- Infrastructure: applicable + change: wrangler CLI 実行方式 (作者 local session でのスクリプト実行、Hub は URL 登録のみ) を設計する
- Security: applicable + change: Device Flow token の OS 資格情報域格納方式・scope 選択方針 (publish:write のみ要求) を設計する
- Quality: applicable + change: 設計判断を P03 で独立レビュー可能な形で記録する
- Documentation: applicable + change: docs/features/feat-publisher-plugin/architecture-decision-record.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-security
- Deploy unit/environment: author-local-session/harness-hub-publisher-plugin (作者ローカル session で稼働する Publisher CLI/plugin の配布・実行単位)
- Compatibility/migration/backfill: N/A: 本 task は設計判断の確定のみで実装・migration を伴わない

## 成果物

- Produced artifacts: docs/features/feat-publisher-plugin/architecture-decision-record.md
- Consumed artifacts: docs/features/feat-publisher-plugin/requirements-baseline.md, docs/backend-spec.md §1(monorepo構成)/§4.1(Device Flow endpoint)/§4.6(publish/deployment endpoint)/§6.1(packages/inspection), docs/security-spec.md §2.2(Device Flow数値契約)
- Write scope/touches: docs/features/feat-publisher-plugin/architecture-decision-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-publisher-plugin-p02) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-publisher-plugin-p02 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-publisher-plugin-p02) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=['SYS-PUBLISHER-PLUGIN-P01']。resource_scope (docs/features/feat-publisher-plugin/architecture-decision-record.md) は他 task の active lease と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- packages/inspection の実装 (owner=feat-publish-pipeline。本 feature は consumer)
- Hub 側 device/publish/deployment endpoint の実装 (owner=feat-publish-pipeline/feat-auth-tenancy)
- 専用 desktop GUI (goal-spec scope_out, qa-007)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-publisher-plugin`
- Required evidence: architecture-decision-record.md に apps/publisher 構成・plugin 面配置・packages/inspection 消費境界・Device Flow token 保存方式・wrangler 実行方式の 5 点が設計判断として記載されていること

## Rollout and rollback

- Rollout: architecture-decision-record.md を作成し P03 (独立設計レビュー) へ引き継ぐ
- Rollback trigger and steps: 設計判断が P01 の要件ベースラインまたは docs/backend-spec.md の確定事項と矛盾する場合、該当箇所を修正し本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/spec-state.json qa_log (qa-003, qa-008, qa-010, qa-020, qa-041, qa-043)
- Detailed authoritative source: docs/backend-spec.md §1, §4.1, §4.6, §6.1; docs/security-spec.md §2.2
- Architecture: arch-harness-hub-backend, arch-harness-hub-security
- Feature: feat-publisher-plugin
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-PUBLISHER-PLUGIN-P01
