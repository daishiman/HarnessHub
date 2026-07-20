# System task overlay: ドキュメント/運用 — S10-S12 運用手順・AI キュー滞留監視・受付番号運用のドキュメント化

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hearing-intake (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-hearing-intake", "studio-extension", "async-ai-queue", "documentation-operations"]
- related_nodes: ["feat-hearing-intake", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
- parent_feature: feat-hearing-intake
- phase_ref: P12
- classification: confidence=0.85, reason="S10-S12 の運用手順・AI キュー滞留監視・受付番号運用を P11 の証跡を根拠にドキュメント化する P12 タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-hearing-intake/sys-hearing-intake-p12.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

S10 ウィザード・S11/S12 シート管理の運用手順、AI キュー滞留監視・アラートの運用要件 (qa-027)、受付番号採番の運用上の注意点をドキュメント化し、P13 のリリース後に運用担当が参照できる runbook を確立する。

## 背景

system-spec/00-requirements-definition.md D5 の risk note は「キュー滞留 (誰も pull しない期間) — 滞留監視と滞留アラートを保守運用に組み込んで検出する (qa-027)」と定めており、P09 で洗い出した AI キュー滞留監視の運用引き継ぎ事項を本 task で具体的な runbook として文書化する。あわせて S11/S12 の status 変更が admin 限定である運用上の意味 (SEC2) と、Markdown sanitize 済み描画 (SEC7) が既に共通レンダラで担保されているため運用担当が個別に確認不要である点を明記する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hearing-intake, sys-hearing-intake-p11
- Entry gate: docs/features/feat-hearing-intake/evidence/index.md が P11 で作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task はドキュメント作成のみで frontend 実装物を変更しない
- Backend: N/A: 本 task はドキュメント作成のみで backend 実装物を変更しない
- API: N/A: API 契約の変更を伴わない
- Data: N/A: データ構造の変更を伴わない
- Infrastructure: N/A: 監視インフラ自体の追加は feat-hub-foundation の scope であり本 task はドキュメント化のみ
- Security: applicable + change: AI キューの pull/書戻し認可 (SEC8) の運用上の確認手順と、status 変更 admin 限定 (SEC2) の運用ルールを runbook.md へ明記する
- Quality: N/A: テスト実施は P06 で完了済み
- Documentation: applicable + change: docs/features/feat-hearing-intake/runbook.md を新規作成する
- Operations: applicable + change: AI キュー滞留監視・アラートの運用手順 (D5 risk note, qa-027) を確立する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (運用ドキュメント作成のみでデプロイは P13 で行う)
- Compatibility/migration/backfill: N/A: 本 task はドキュメント作成のみで対象物への変更を行わない

## 成果物

- Produced artifacts: docs/features/feat-hearing-intake/runbook.md (S10-S12 運用手順・AI キュー滞留監視/アラート運用・受付番号運用の注意点)
- Consumed artifacts: docs/features/feat-hearing-intake/evidence/index.md, docs/features/feat-hearing-intake/quality-assurance-report.md, system-spec/00-requirements-definition.md
- Write scope/touches: docs/features/feat-hearing-intake/runbook.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hearing-intake-p12) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hearing-intake-p12 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-hearing-intake-p12) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hearing-intake-p11] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- AI キュー滞留監視インフラの実装 (feat-hub-foundation の scope。本 task は運用手順の文書化のみ)
- 通知ディスパッチ共通層そのものの運用手順 (feat-hub-foundation が別途所有)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: runbook.md に S10-S12 運用手順・AI キュー滞留監視/アラート運用 (qa-027)・受付番号運用の注意点が記載されている

## Rollout and rollback

- Rollout: runbook.md 作成完了後 P13 のリリース/デプロイへ引き継ぐ
- Rollback trigger and steps: 運用手順に矛盾や欠落が見つかった場合、runbook.md を修正し P09/P11 の該当箇所と再突合する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (D5 risk note, qa-027), system-spec/security.md (qa-025 SEC2/SEC8)
- Architecture: arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-hearing-intake
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-hearing-intake-p11
