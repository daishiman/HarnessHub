# System task overlay: 品質・セキュリティ・運用保証 — Device Flow数値契約遵守・OS資格情報域保存・scope最小権限・secret非保存の確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-publisher-plugin (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-publisher-plugin", "macro-feature", "security", "quality-assurance"]
- related_nodes: ["feat-publisher-plugin", "arch-harness-hub-backend", "arch-harness-hub-security"]
- parent_feature: feat-publisher-plugin
- phase_ref: P09
- classification: confidence=0.85, reason="quality_constraints のうちセキュリティ関連制約 (Device Flow/OS資格情報域保存/scope最小権限) の遵守を機械的に確認する P09 品質保証タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-publisher-plugin/sys-publisher-plugin-p09.md}]
- tracker_binding_intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

goal-spec.json の quality_constraints のうち特にセキュリティに関わる device-flow-auth-os-credential-storage-qa008-qa041 を中心に、Device Flow の数値契約 (device_code TTL 10分・user_code 8文字・access token 15分・refresh token 90日 rotation・reuse-detection family 全失効)・OS 資格情報域への token 保存・scope 最小権限 (publish:write のみ要求)・secret/token の非平文保存を確認し quality-assurance-report.md に記録する。

## 背景

docs/security-spec.md §2.2 の数値契約 (device_code TTL 10分・SHA-256 ハッシュ保存・user_code 8文字 Crockford Base32・5回失敗denied・polling interval 5秒・access token 15分非保存・refresh token 90日rotation・reuse検知でfamily全失効・OS資格情報域格納) を Publisher クライアント側の実装がそのまま遵守しているかを確認する。scope は `publish:write` のみを要求し `metrics:write`/`feedback:write`/`aijob:process` を要求しないこと (最小権限, S-D7) を確認する。token・secret がリポジトリ・環境変数・平文ファイルに保存されていないことを apps/publisher/scripts/ の静的チェックスクリプトで機械的に確認する。両 OS (macOS 主・Windows 従) で同一の pnpm script が動作すること (qa-043) も本 task で確認する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-publisher-plugin, arch-harness-hub-backend, arch-harness-hub-security
- Entry gate: docs/features/feat-publisher-plugin/refactoring-migration-note.md が P08 完了時点で存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature は frontend 実装物を持たない
- Backend: N/A: 本 task は確認作業でありコード実装は apps/publisher/scripts/ の確認スクリプト追加のみ
- API: N/A: API 契約自体の変更は伴わない
- Data: N/A: 本 feature は永続データストアのスキーマ変更を伴わない
- Infrastructure: N/A: 新規インフラのプロビジョニングは本 task の対象外
- Security: applicable + change: Device Flow 数値契約遵守・OS 資格情報域保存・scope 最小権限・secret 非平文保存を確認する
- Quality: applicable + change: 全確認結果を quality-assurance-report.md に記録する
- Documentation: applicable + change: docs/features/feat-publisher-plugin/quality-assurance-report.md を新規作成する
- Operations: applicable + change: apps/publisher/scripts/ に secret/token 非平文保存の静的チェックスクリプトを追加する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security
- Deploy unit/environment: author-local-session/harness-hub-publisher-plugin (作者ローカル session で稼働する Publisher CLI/plugin の配布・実行単位)
- Compatibility/migration/backfill: N/A: 本 task は非機能要件の確認でありスキーマへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-publisher-plugin/quality-assurance-report.md, apps/publisher/scripts/ (secret/token 非平文保存の静的チェックスクリプト)
- Consumed artifacts: docs/features/feat-publisher-plugin/refactoring-migration-note.md, apps/publisher/
- Write scope/touches: docs/features/feat-publisher-plugin/quality-assurance-report.md, apps/publisher/scripts/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-publisher-plugin-p09) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-publisher-plugin-p09 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-publisher-plugin-p09) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=['SYS-PUBLISHER-PLUGIN-P08']。resource_scope (docs/features/feat-publisher-plugin/quality-assurance-report.md, apps/publisher/scripts/) は他 task の active lease と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- Hub 側 Device Flow endpoint の実装・監査 (owner=feat-publish-pipeline/feat-auth-tenancy)
- 共有 CI パイプライン本体の変更 (共有 CI は不可侵。本 task は feature 固有スクリプトの追加のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-publisher-plugin`
- Required evidence: quality-assurance-report.md に Device Flow 数値契約 (TTL/rotation/reuse検知)・OS資格情報域保存・scope最小権限・secret非平文保存・両OS pnpm script同一動作の全確認結果が記載されていること

## Rollout and rollback

- Rollout: quality-assurance-report.md で全項目の確認を完了してから P10 (独立最終レビュー) へ引き継ぐ
- Rollback trigger and steps: token が平文保存されている、または scope が過剰要求である等の逸脱が発見された場合、apps/publisher の該当実装を修正し本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: docs/security-spec.md §2.2/§2.2.1, system-spec/spec-state.json qa_log (qa-008, qa-041, qa-043)
- Detailed authoritative source: docs/features/feat-publisher-plugin/refactoring-migration-note.md
- Architecture: arch-harness-hub-security
- Feature: feat-publisher-plugin
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-PUBLISHER-PLUGIN-P08
