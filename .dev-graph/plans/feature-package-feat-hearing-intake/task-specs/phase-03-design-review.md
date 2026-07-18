# System task overlay: 独立設計レビュー — HearingSheet/FormData/AiJob(hearing kind) 設計・AI キュー認可・Markdown sanitize の妥当性確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hearing-intake (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-hearing-intake", "studio-extension", "async-ai-queue", "design-review"]
- related_nodes: ["feat-hearing-intake", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
- parent_feature: feat-hearing-intake
- phase_ref: P03
- classification: confidence=0.88, reason="P02 で確定した HearingSheet/FormData/AiJob(hearing kind) スキーマと AI キュー API 契約・Markdown sanitize 適用点を、設計担当から独立した視点でレビューする P03 タスク", candidates=[{artifact_kind: task, confidence: 0.88, candidate_path: tasks/feat-hearing-intake/sys-hearing-intake-p03.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 で確定した HearingSheet/FormData/AiJob (hearing kind) スキーマ、受付番号採番方式、AI キュー API 契約、Markdown sanitize 適用点を、設計担当から独立した視点でレビューし、SEC2/SEC5/SEC7/SEC8 と qa-021/qa-022/qa-023/qa-024 への適合を確認する。

## 背景

P02 の設計は本 feature の実装全体の前提になるため、単一担当者の見落としを防ぐ独立レビューを経る。特に AI キューの pull/書戻し認可 (SEC8 の secret 非混入) と試算表示のサーバ計算値限定 (SEC5) は誤りが露見しにくく実装後の手戻りコストが大きいため、実装着手前のレビューで妥当性を確認する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hearing-intake, sys-hearing-intake-p02
- Entry gate: docs/features/feat-hearing-intake/architecture-decision-record.md が P02 で作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は設計文書のレビューのみで frontend 実装物を変更しない
- Backend: N/A: 本 task は設計文書のレビューのみで backend 実装物を変更しない
- API: N/A: API 契約自体の変更は行わず、P02 の契約設計が qa-023 B1 (zod 単一ソース) に適合しているかを確認するのみ
- Data: applicable + change: HearingSheet/FormData/AiJob (hearing kind) のカラム設計が D4 (tenant_id/workspace_id スコープ列必須) と qa-024 に適合しているかをレビューする
- Infrastructure: N/A: 本 feature はデプロイ単位を新設しない
- Security: applicable + change: AI キューの pull/書戻し認可 (SEC8)・Markdown sanitize 適用点 (SEC7)・試算表示のサーバ計算値限定 (SEC5)・role×操作許可表における status 変更 admin 限定 (SEC2) の 4 点をレビューし承認可否を判定する
- Quality: applicable + change: S10-S12 の axe a11y 検査対象範囲と非同期 UI 状態遷移テスト観点がレビュー観点として妥当かを確認する
- Documentation: applicable + change: docs/features/feat-hearing-intake/design-review-notes.md を新規作成する
- Operations: N/A: 運用手順のレビューは P12 に先立つものではなく本 task の対象外

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data
- Deploy unit/environment: cloudflare-workers/hub (レビューのみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task はレビューのみで対象物への変更を行わない

## 成果物

- Produced artifacts: docs/features/feat-hearing-intake/design-review-notes.md (承認可否と SEC2/SEC5/SEC7/SEC8・qa-021/qa-022/qa-023/qa-024 適合確認結果)
- Consumed artifacts: docs/features/feat-hearing-intake/architecture-decision-record.md, system-spec/security.md, system-spec/database.md, system-spec/backend.md, system-spec/ui-ux.md
- Write scope/touches: docs/features/feat-hearing-intake/design-review-notes.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hearing-intake-p03) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hearing-intake-p03 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-hearing-intake-p03) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hearing-intake-p02] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 設計そのものの修正実施 (却下時は P02 を再実行対象として差し戻す)
- 実装コードの作成
- feat-auth-tenancy/feat-domain-model-db/feat-hub-foundation が所有する既存設計のレビュー (本 feature の設計差分のみが対象)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: design-review-notes.md に承認可否と SEC2/SEC5/SEC7/SEC8・qa-021/qa-022/qa-023/qa-024 適合確認結果が明記されている

## Rollout and rollback

- Rollout: design-review-notes.md で承認と判定された場合、P04 (test-design) へ引き継ぐ
- Rollback trigger and steps: 差し戻しと判定された場合、design-review-notes.md に指摘事項を記録し、sys-hearing-intake-p02 を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/security.md (qa-025 SEC2/SEC5/SEC7/SEC8), system-spec/database.md (qa-024), system-spec/backend.md (qa-023 B1), system-spec/ui-ux.md (qa-021)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-data (architecture/harness-hub-data.md)
- Feature: feat-hearing-intake
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-hearing-intake-p02
