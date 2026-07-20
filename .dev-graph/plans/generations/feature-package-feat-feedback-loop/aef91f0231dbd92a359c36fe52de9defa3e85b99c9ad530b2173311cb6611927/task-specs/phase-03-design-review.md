# System task overlay: 独立設計レビュー — Feedback スキーマ・認可・AI キュー接続・通知/publish 接続の妥当性確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-feedback-loop (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-feedback-loop", "studio-extension", "feedback-loop", "design-review"]
- related_nodes: ["feat-feedback-loop", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
- parent_feature: feat-feedback-loop
- phase_ref: P03
- classification: confidence=0.88, reason="P02 で確定した Feedback スキーマ・S14 画面構成・feedback API 契約・AI キュー連携・通知/publish 接続設計を、設計担当から独立した視点でレビューする P03 タスク", candidates=[{artifact_kind: task, confidence: 0.88, candidate_path: tasks/feat-feedback-loop/sys-feedback-loop-p03.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 の architecture-decision-record.md を設計担当から独立した視点でレビューし、feedbacks スキーマの tenant 分離・feedback API の認可単一ミドルウェア適合・AI キュー (D5 pull 型) の Device Flow token 限定・通知のアプリ内正本+Resend補助方式・PublishRequest 接続の二重状態排除が goal-spec と qa-021/qa-022/qa-025/backend-spec.md に整合していることを確認し、承認可否を判定する。

## 背景

P02 の設計は複数のセキュリティ・データ要件 (D4 tenant scope, SEC6 監査対象, SEC7 XSS sanitize, SEC8 AI キュー Device Flow 限定, SEC9 メール PII 制限) に同時に従う必要があり、単一担当者の見落としリスクを低減するため、設計から独立したレビュー工程を設ける。特に、feedback status 変更が workspace-admin 限定であること (§3.3)、AiJob(`feedback_response`) の pull/書戻しが workspace-admin (自テナント) または provider-admin (全テナント、越境監査必須) の Device Flow token 保有者に限定されること (§4.11)、修正版 publish が既存 PublishRequest 状態機械に接続され新規状態機械を作らないこと (I2/I3)、resolved 通知がアプリ内通知を正本としメール不達でも情報が欠けない設計であること (D6) を重点的に確認する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-feedback-loop, arch-harness-hub-backend, arch-harness-hub-frontend
- Entry gate: sys-feedback-loop-p02 の architecture-decision-record.md が作成済みであること。かつ goal-spec.json の feature_context_digest が sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3 に一致し、features/feat-feedback-loop.md の confirmation_status が confirmed であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は設計文書のレビューのみで frontend 実装物を変更しない
- Backend: N/A: 本 task は設計文書のレビューのみで backend 実装物を変更しない
- API: N/A: API 契約自体の変更は伴わず、P02 契約の妥当性確認のみ行う
- Data: applicable + review: feedbacks テーブルの tenant_id/workspace_id スコープ列強制注入設計の妥当性をレビューする
- Infrastructure: N/A: 本 feature は追加インフラを新設しない
- Security: applicable + review: SEC2 (認可単一ミドルウェア)・SEC6 (feedback.status_change 監査)・SEC7 (Markdown sanitize)・SEC8 (AI キュー Device Flow 限定)・SEC9 (Resend PII 制限) の適合性をレビューする
- Quality: applicable + review: goal-spec acceptance 3 件と quality_constraints 8 件が P02 設計で全件充足可能かをレビューする
- Documentation: applicable + change: docs/features/feat-feedback-loop/design-review-notes.md を新規作成する
- Operations: N/A: 運用レビューは P09/P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (本 task はレビューのみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task はレビューのみで実変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-feedback-loop/design-review-notes.md (承認可否と SEC2/SEC6/SEC7/SEC8/SEC9・qa-021/qa-022・D4/D5/D6・I2/I3 適合確認結果)
- Consumed artifacts: docs/features/feat-feedback-loop/architecture-decision-record.md, system-spec/security.md, system-spec/database.md, docs/backend-spec.md
- Write scope/touches: docs/features/feat-feedback-loop/design-review-notes.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-feedback-loop-p03) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-feedback-loop-p03 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-feedback-loop-p03) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-feedback-loop-p02 完了後に着手する。resource_scope (docs/features/feat-feedback-loop/design-review-notes.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 設計内容の再作成 (差し戻しは P02 の再実行対象とし、本 task 自体は判定のみ行う)
- 実装コードの作成 (本 task はレビューのみ)
- テスト仕様の作成 (P04 の scope)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: design-review-notes.md に承認可否と SEC2/SEC6/SEC7/SEC8/SEC9・qa-021/qa-022・D4/D5/D6・I2/I3 適合確認結果が明記されている

## Rollout and rollback

- Rollout: design-review-notes.md に承認結果を記録し、P04 テストファースト設計へ引き継ぐ
- Rollback trigger and steps: 差し戻しと判定された場合、design-review-notes.md に指摘事項を記録し、sys-feedback-loop-p02 を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-feedback-loop.context.json` (`sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3`)
- Phase responsibility: P02 の設計が現行 context を漏れなく、矛盾なく満たすか独立レビューする。
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

This section is normative for P03 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-feedback-loop.context.json; docs/backend-spec.md §2.3/§4.7/§4.11; system-spec/backend.md qa-048→qa-059
- Effective phase contract: feedbacks は priority=high|medium|low を必須列/入力/DTO/migrationへ含める。AI queue pull は workspace-adminが自テナント、provider-adminが全テナント（越境はprovider.cross_tenant_access監査）を処理できる。provider-admin専用という旧記述は無効。POST feedback のsession/Bearer二経路、kind=feedback_response、status遷移、通知、既存PublishRequest接続を同じ資源で実装する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `apps/hub/src/app/api/v1/feedback/`
- `packages/db/schema/feedback-loop/`
- `packages/schemas/feedback-loop/`
- Mandatory evidence: priority値域/round-trip、workspace-admin自tenant pull、provider-admin cross-tenant pull+audit、他tenant拒否、migration、P10/P11証跡対応表を必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/security.md (qa-025 SEC2/SEC6/SEC7/SEC8/SEC9), system-spec/database.md (qa-032), system-spec/ui-ux.md (qa-021 S14)
- Detailed authoritative source: docs/backend-spec.md (§3.3 認可マトリクス, §3.8 監査対象, §4.7 feedback API, §4.11 ai-jobs API, §5.4/§5.5 状態機械)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-feedback-loop
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-feedback-loop-p02
