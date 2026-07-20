# System task overlay: 最終独立レビュー — quality_constraints 8 件の充足判定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-feedback-loop (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-feedback-loop", "studio-extension", "feedback-loop", "final-review"]
- related_nodes: ["feat-feedback-loop", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
- parent_feature: feat-feedback-loop
- phase_ref: P10
- classification: confidence=0.86, reason="P01-P09 の成果物を根拠に goal-spec の quality_constraints 8 件の充足を独立した視点で最終判定する P10 タスク", candidates=[{artifact_kind: task, confidence: 0.86, candidate_path: tasks/feat-feedback-loop/sys-feedback-loop-p10.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P01-P09 の成果物を根拠に、goal-spec の quality_constraints 8 件 (feedback-two-route-single-resource-b6-i12, feedback-status-transition-audit-sec6, ai-response-pull-queue-d5-sec8, resolved-notification-inapp-primary-resend-supplementary-d6-b8-sec9, feedback-markdown-sanitize-sec7, feedback-entity-tenant-scope-d4, feedback-fix-publish-existing-pipeline-no-automerge, feedback-rest-zod-single-source-authz-mw-b1-sec2) それぞれの充足を、設計・実装担当から独立した視点で最終判定する。

## 背景

P03 の設計レビューは実装前の設計妥当性を確認するものであり、本 P10 は実装・テスト・migration・品質保証の全成果物を踏まえた最終ゲートとして quality_constraints 8 件それぞれに対する充足可否と根拠成果物への参照を記録する。いずれかが未充足の場合、原因工程への差し戻しを判断する最終責任を負う。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-feedback-loop, arch-harness-hub-backend, arch-harness-hub-frontend
- Entry gate: sys-feedback-loop-p09 の quality-assurance-report.md が作成済みであること。かつ goal-spec.json の feature_context_digest が sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3 に一致し、features/feat-feedback-loop.md の confirmation_status が confirmed であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は最終レビュー文書化のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は最終レビュー文書化のみで backend 実装物を変更しない
- API: N/A: 本 task は API 契約を変更しない
- Data: applicable + review: feedbacks テーブルの tenant 分離充足を最終確認する
- Infrastructure: N/A: 本 feature は追加インフラを新設しない
- Security: applicable + review: SEC2/SEC6/SEC7/SEC8/SEC9 の全件充足を最終確認する
- Quality: applicable + change: final-review-notes.md に quality_constraints 8 件それぞれの充足判定と根拠成果物への参照を記載する
- Documentation: applicable + change: docs/features/feat-feedback-loop/final-review-notes.md を新規作成する
- Operations: N/A: 運用面の最終確認は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (本 task はレビューのみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task はレビューのみで実変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-feedback-loop/final-review-notes.md (quality_constraints 8 件それぞれの充足判定と根拠成果物への参照)
- Consumed artifacts: docs/features/feat-feedback-loop/architecture-decision-record.md, docs/features/feat-feedback-loop/test-run-report.md, docs/features/feat-feedback-loop/refactoring-migration-note.md, docs/features/feat-feedback-loop/quality-assurance-report.md
- Write scope/touches: docs/features/feat-feedback-loop/final-review-notes.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-feedback-loop-p10) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-feedback-loop-p10 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-feedback-loop-p10) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-feedback-loop-p09 完了後に着手する。resource_scope (docs/features/feat-feedback-loop/final-review-notes.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 実装コードの修正 (未充足の場合は原因 task へ差し戻す。本 task は判定のみ)
- 新規テストの実行 (P06/P09 の scope)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: final-review-notes.md に quality_constraints 8 件それぞれの充足判定と根拠成果物への参照が記載されている. Normative evidence: priority値域/round-trip、workspace-admin自tenant pull、provider-admin cross-tenant pull+audit、他tenant拒否、migration、P10/P11証跡対応表を必須とする。

## Rollout and rollback

- Rollout: final-review-notes.md に全件充足を確認し、P11 エビデンス収集へ引き継ぐ
- Rollback trigger and steps: いずれかが未充足の場合、final-review-notes.md に未充足理由を記録し、該当する原因 task (P02/P05/P08 等) を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-feedback-loop.context.json` (`sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3`)
- Phase responsibility: 全 acceptance、scope、品質制約の最終充足を独立にレビューする。
- Purpose: 利用者の改善要望/レビュー依頼/バグ報告を CLI + Web (S14) の 2 経路で受け付け (B6)、D5 pull 型 AI キューで解析・修正案生成し、修正版の publish → update 通知まで閉じる改善ループ (G5/I12, J5) を確立する
- Goal: フィードバックが status 遷移 (未対応→対応中→対応済み) で管理され、AI 対応結果 (aiResponse) が S14 に反映され、修正版が publish パイプライン経由で利用者へ届く状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- Feedback エンティティ (種別・経路・aiResponse・status)
- CLI 受付 (claude harness feedback) + S14 Web フォームの 2 経路
- AI キュー (D5) でのフィードバック解析・修正案生成
- 修正版 publish (既存パイプライン) と update 通知 (D6) の接続
- Markdown 共通部品の消費 (sanitize)
- Scope out:
- publish パイプラインの変更
- 自動マージ (修正案は人の確認を経て publish)
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- 2 経路の受付が同一 Feedback 資源に正規化される
- AI 対応が pull 型で処理され status 遷移が監査記録される
- 対応済み通知がアプリ内 (正本) + メール (D6) で届く
- Architecture/source refs:
- architecture/harness-hub-backend.md
- architecture/harness-hub-frontend.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Normative implementation closure (2026-07-19)

This section is normative for P10 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-feedback-loop.context.json; docs/backend-spec.md §2.3/§4.7/§4.11; system-spec/backend.md qa-048→qa-059
- Effective phase contract: feedbacks は priority=high|medium|low を必須列/入力/DTO/migrationへ含める。AI queue pull は workspace-adminが自テナント、provider-adminが全テナント（越境はprovider.cross_tenant_access監査）を処理できる。provider-admin専用という旧記述は無効。POST feedback のsession/Bearer二経路、kind=feedback_response、status遷移、通知、既存PublishRequest接続を同じ資源で実装する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `apps/hub/src/app/api/v1/feedback/`
- `packages/db/schema/feedback-loop/`
- `packages/schemas/feedback-loop/`
- Mandatory evidence: priority値域/round-trip、workspace-admin自tenant pull、provider-admin cross-tenant pull+audit、他tenant拒否、migration、P10/P11証跡対応表を必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/security.md (qa-025 SEC2/SEC6/SEC7/SEC8/SEC9), system-spec/database.md (qa-032), system-spec/ui-ux.md (qa-021), system-spec/frontend.md (qa-022)
- Detailed authoritative source: docs/backend-spec.md (§2.1, §2.3, §3.3, §3.8, §4.7, §4.10, §4.11, §5.1, §5.4, §5.5)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-feedback-loop
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-feedback-loop-p09
