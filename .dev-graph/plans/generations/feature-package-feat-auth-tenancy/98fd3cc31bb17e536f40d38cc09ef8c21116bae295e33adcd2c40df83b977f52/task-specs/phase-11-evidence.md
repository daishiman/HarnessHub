# System task overlay: エビデンス収集 — テスト結果・受入記録・最終レビュー記録の証跡集約

## Machine-readable registration fields

- feature_package_id: feature-package/feat-auth-tenancy (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-auth-tenancy", "macro-feature", "security", "evidence"]
- related_nodes: ["feat-auth-tenancy", "arch-harness-hub-security", "arch-harness-hub-backend"]
- parent_feature: feat-auth-tenancy
- phase_ref: P11
- classification: confidence=0.85, reason="P06/P07/P09/P10 の証跡を単一のエビデンスサマリへ集約する P11 タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-auth-tenancy/sys-auth-tenancy-p11.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P06 (test-run-results.md)、P07 (acceptance-record.md)、P09 (quality-assurance-report.md)、P10 (final-review-record.md) に分散する証跡を単一の evidence-summary.md へ集約し、P12 (runbook 作成) と P13 (リリース) が参照できる状態にする。

## 背景

feature-execution-package-contract.md はリリース判定の追跡可能性のため、各 task の証跡が単一の参照点から辿れることを求める。本 task は新たな検証を行わず、既存の 4 成果物からリリース判定に必要な最小限の事実 (テストケース総数と pass 件数、acceptance 3 項目の判定、CI 品質ゲートの pass 状況、quality_constraints 7 件の充足判定) を抽出し、evidence-summary.md として一覧化する。あわせて、session_revocations/users/publisher_tokens/device_authorizations のスキーマ owner が feat-domain-model-db であるという architecture decision と、role 4 種/users.role 列 3 値の分割線という 2 件の設計判断についても、根拠文書へのポインタを evidence-summary.md に含め、リリース後の追跡可能性を担保する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-auth-tenancy, arch-harness-hub-security, arch-harness-hub-backend
- Entry gate: goal-spec.json の feature_context_digest が sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5 に一致し、confirmation_status=confirmed であること。P10 の docs/features/feat-auth-tenancy/final-review-record.md が全項目充足を記録していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 task は証跡集約のみで実装物を変更しない
- Backend: N/A: 本 task は証跡集約のみで実装物を変更しない
- API: N/A: 本 task は証跡集約のみで実装物を変更しない
- Data: N/A: 本 task はデータモデルへの変更を伴わない
- Infrastructure: N/A: 新規インフラ変更なし
- Security: N/A: 本 task はセキュリティ実装の追加変更を伴わない (既存証跡の集約のみ)
- Quality: applicable + change: 全証跡を単一サマリへ集約し追跡可能性を担保する
- Documentation: applicable + change: docs/features/feat-auth-tenancy/evidence-summary.md を新規作成する
- Operations: N/A: 運用手順の確定は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task は証跡集約のみ

## 成果物

- Produced artifacts: docs/features/feat-auth-tenancy/evidence-summary.md (テスト結果・受入記録・品質保証結果・最終レビュー結果・2 件の設計判断への参照を集約したサマリ)
- Consumed artifacts: docs/features/feat-auth-tenancy/test-run-results.md, docs/features/feat-auth-tenancy/acceptance-record.md, docs/features/feat-auth-tenancy/quality-assurance-report.md, docs/features/feat-auth-tenancy/final-review-record.md
- Write scope/touches: docs/features/feat-auth-tenancy/evidence-summary.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-auth-tenancy-p11) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-auth-tenancy-p11 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-auth-tenancy-p11) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-AUTH-TENANCY-P10]。resource_scope (docs/features/feat-auth-tenancy/evidence-summary.md) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- 新規検証の実施 (本 task は既存証跡の集約のみで新たなテスト・レビューは行わない)
- feat-domain-model-db 側のエビデンス集約 (同 feature 自身の P11 が担当)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-auth-tenancy/evidence-summary.md に P06/P07/P09/P10 の 4 成果物全てへの参照と、スキーマ owner 決定・role 分割線への参照が含まれていること. Normative evidence: P04/P06 は server-side Device Flow と downstream token contract を別 test ID に分け、P10/P11 は auth 自身の証跡と publisher consumer evidence reference を混同せず記録する。

## Rollout and rollback

- Rollout: evidence-summary.md を作成し、参照先 4 成果物が全て存在することを確認してから P12 (ドキュメント/運用) へ引き継ぐ
- Rollback trigger and steps: 参照先成果物のいずれかが欠落・不整合の場合、該当 task へ差し戻し是正したうえで本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-auth-tenancy.context.json` (`sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5`)
- Phase responsibility: P06・P07・P09・P10 の証跡を source digest 付きで集約する。
- Purpose: テナント別 OIDC (Auth.js) と role 4 種、全 API への Tenant/Workspace スコープ強制 (D4 row-level-scope)、Publisher 向け OAuth Device Flow を確立する
- Goal: 2 テナント同時稼働で認可の越境が分離テストにより 0 件と証明され、Device Flow で token 取得・失効が動作する状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- Auth.js マルチテナント OIDC 動的解決
- role: provider-admin/workspace-admin/owner/member
- 認可の単一ミドルウェア集約
- OAuth Device Flow + token 失効導線
- テナント分離テスト
- Scope out:
- 承認キュー (Stage 2)
- 監査 UI (Stage 2)
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- テナント越境アクセスが分離テストで 0 件
- Device Flow の E2E (承認→token→失効) が成功する
- Auth.js 依存が adapter 境界に隔離されている (D3 caveat)
- Architecture/source refs:
- architecture/harness-hub-security.md
- architecture/harness-hub-backend.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Normative implementation closure (2026-07-19)

This section is normative for P11 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-auth-tenancy.context.json; docs/backend-spec.md §3.2; docs/security-spec.md §2.2; system-spec/backend.md qa-010/qa-059
- Effective phase contract: 本 package が所有するのは Hub 側 Device Authorization Flow（code/approve/token、短命 access token、refresh rotation/reuse detection、本人・管理者失効）である。OS 資格情報保存は feat-publisher-plugin が所有する consumer 実装であり、auth package は保存 API を実装したと偽らず、token response/rotation/revocation の公開 contract と downstream evidence key を提供する。Device Flow acceptance は Hub E2E（承認→発行→rotation→失効）で判定し、macOS Keychain/Windows Credential Manager は publisher package の E2E evidence を相互参照する。循環依存は作らない。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `packages/schemas/auth-tenancy/`
- `apps/hub/src/app/api/v1/device/`
- `apps/hub/src/app/api/v1/token/`
- Mandatory evidence: P04/P06 は server-side Device Flow と downstream token contract を別 test ID に分け、P10/P11 は auth 自身の証跡と publisher consumer evidence reference を混同せず記録する。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/00-requirements-definition.md (D3, D4, I7, I8, G4), system-spec/spec-state.json qa_log (qa-005, qa-006, qa-008, qa-020, qa-036)
- Detailed authoritative source: docs/features/feat-auth-tenancy/final-review-record.md
- Architecture: arch-harness-hub-security, arch-harness-hub-backend
- Feature: feat-auth-tenancy
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-AUTH-TENANCY-P10
