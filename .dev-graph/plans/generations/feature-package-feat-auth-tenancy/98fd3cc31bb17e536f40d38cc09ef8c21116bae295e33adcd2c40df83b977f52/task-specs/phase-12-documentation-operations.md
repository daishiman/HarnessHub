# System task overlay: ドキュメント/運用 — 緊急失効・Device Flow token 監視・OIDC provider 追加の runbook

## Machine-readable registration fields

- feature_package_id: feature-package/feat-auth-tenancy (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-auth-tenancy", "macro-feature", "security", "documentation"]
- related_nodes: ["feat-auth-tenancy", "arch-harness-hub-security", "arch-harness-hub-backend"]
- parent_feature: feat-auth-tenancy
- phase_ref: P12
- classification: confidence=0.85, reason="緊急失効・Device Flow token 監視・OIDC provider 追加の運用手順を runbook 化する P12 タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-auth-tenancy/sys-auth-tenancy-p12.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

本 feature が owner の運用手順 (退職・侵害時の session 緊急失効操作、Device Flow token の棚卸し/失効導線、新規テナントの OIDC provider 登録手順、Dev tenant の Google Workspace OIDC provider 登録手順、テナント数 10 超過時の row-level-scope revisit トリガー監視) を runbook.md として整備し、P13 (リリース/デプロイ) での実運用開始に備える。

## 背景

qa-036 は JWT の最大 15 分の反映遅延を許容しつつ、退職・侵害時は session_revocations への `revoked_at` 設定により即時失効することを求める。本 task はこの緊急失効操作 (feat-domain-model-db が提供する session_revocations リポジトリ関数の呼び出し手順) を runbook.md にまとめ、運用者が実行可能な手順として明記する。qa-008 の Device Flow については、`GET /api/v1/tokens` による発行済み token の一覧確認と `DELETE /api/v1/tokens/:id` による個別失効の運用手順、および refresh token 再利用検知時の家族全失効アラート対応手順を整備する。D3 の新規テナント追加時は idp_connections への OIDC provider 設定登録 (issuer/client_id/client_secret) 手順を明記し、qa-036 の開発/デモ環境要件に基づき Dev tenant では提供者の Google Workspace を同一経路で登録する手順を明記する。D4 の row-level-scope 方式は「テナント数が 10 を超過した場合または分離テスト失敗が頻発した場合に DB-per-tenant を再評価する」revisit 条件を持つため、本 task はこの条件を監視する運用手順 (テナント数の定期確認、分離テスト失敗頻度の監視) を runbook.md に明記する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-auth-tenancy, arch-harness-hub-security, arch-harness-hub-backend
- Entry gate: goal-spec.json の feature_context_digest が sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5 に一致し、confirmation_status=confirmed であること。P11 の docs/features/feat-auth-tenancy/evidence-summary.md が存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 task は UI の変更を伴わない
- Backend: N/A: 運用手順の整備が中心であり実装コードの追加変更を伴わない
- API: N/A: 既存 API を運用手順から呼び出すのみで契約変更はない
- Data: N/A: 本 feature はデータモデルを持たない
- Infrastructure: N/A: 新規インフラ変更なし
- Security: applicable + change: 緊急失効操作・Device Flow token 失効導線・OIDC provider 登録手順・revisit 条件監視手順を整備する
- Quality: N/A: 本 task は運用手順の整備が中心であり新たな品質判定は行わない (P10 で判定済み)
- Documentation: applicable + change: docs/features/feat-auth-tenancy/runbook.md を新規作成する
- Operations: applicable + change: 緊急失効・token 棚卸し・OIDC provider 登録・revisit 条件監視の運用手順を確定する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task は運用手順の整備のみで実装への変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-auth-tenancy/runbook.md (session 緊急失効手順、Device Flow token 棚卸し/失効手順、新規テナント OIDC provider 登録手順、Dev tenant OIDC provider 登録手順、row-level-scope revisit 条件監視手順を含む)
- Consumed artifacts: docs/features/feat-auth-tenancy/evidence-summary.md, docs/backend-spec.md §3.2, §4.1, system-spec/00-requirements-definition.md (D4)
- Write scope/touches: docs/features/feat-auth-tenancy/runbook.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-auth-tenancy-p12) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-auth-tenancy-p12 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-auth-tenancy-p12) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-AUTH-TENANCY-P11]。resource_scope (docs/features/feat-auth-tenancy/runbook.md) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- feat-domain-model-db 側の運用手順 (session_revocations テーブル自体の backup/restore は同 feature 自身の P12 が担当)
- Publisher/CLI 側の OS 資格情報域の運用手順 (owner=Publisher 実装 feature)
- 承認キュー/監査 UI の運用手順 (owner=feat-workspace-governance)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-auth-tenancy/runbook.md に session 緊急失効・Device Flow token 棚卸し/失効・OIDC provider 登録 (新規テナント/Dev tenant)・row-level-scope revisit 条件監視の 5 手順全てが記載されていること

## Rollout and rollback

- Rollout: runbook.md を作成し、緊急失効手順が P05 で実装した session_revocations 参照ロジックと整合することを確認してから P13 (リリース/デプロイ) へ引き継ぐ
- Rollback trigger and steps: 運用手順が実装済みの API/ロジックと非整合と判明した場合、runbook.md を是正し本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-auth-tenancy.context.json` (`sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5`)
- Phase responsibility: 検証済み実装の運用・runbook・handover を文書化し、先行 phase の前提にしない。
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

This section is normative for P12 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

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
- Detailed authoritative source: docs/backend-spec.md §3.2, §4.1
- Architecture: arch-harness-hub-security, arch-harness-hub-backend
- Feature: feat-auth-tenancy
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-AUTH-TENANCY-P11
