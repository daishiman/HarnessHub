---
graph_node_id: "feat-user-org-admin"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "security"
tags: ["macro-feature","studio-extension","security"]
priority: "medium"
start_date: null
target_date: null
iteration: "Studio 拡張"
title: "Studio: ユーザー管理・アカウント設定 (role 統合・係数設定・PII ガード)"
owners: ["daishiman"]
created_at: "2026-07-17T10:44:09Z"
updated_at: "2026-08-02T20:57:08.713980Z"
status: "active"
depends_on: ["feat-hub-foundation","feat-domain-model-db","feat-auth-tenancy"]
related_nodes: []
resource_scope: ["features/feat-user-org-admin.md"]
purpose: "ユーザー管理 (S17) とアカウント設定 (S18) を提供し、role 管理 (qa-005 の 4 role と統合)・年収→時給換算の係数設定 (PII: admin 限定・API 非公開・export マスク = SEC4)・通知設定 (D6 Resend)・規約公開を確立する (I14)"
goal: "workspace-admin がユーザーの role・部門・年収係数を管理でき、salary が PII ガード (admin 限定表示・読取監査・export マスク) 下にあり、通知設定が通知ディスパッチ共通層と接続され、全利用者が規約・ポリシーを参照できる状態"
scope_in: ["S17 ユーザー管理 + 個別ダッシュボード","S18 アカウント設定 (プロフィール/通知/表示)","S18 配下の /legal 規約・ポリシー静的ページ (全利用者が閲覧可能)","User 拡張 (department/salary) + TenantCoefficient エンティティ","PII ガード共通層 (salary の admin 限定・監査・export マスク)","通知設定と D6 (Resend) 通知ディスパッチの接続"]
scope_out: ["認証方式の変更 (D3 の IdP 委譲を維持。パスワード/2FA 自前実装は不採用)","role 体系の再設計 (qa-005 の 4 role を維持)"]
acceptance: ["salary が admin 以外の API/画面/export に露出しない (分離テスト + 監査記録)","係数変更が監査 event に記録される (SEC6)","S17/S18 と /legal が axe 違反 0 で動作し、/legal は全利用者が閲覧できる"]
architecture_refs: ["arch-harness-hub-security","arch-harness-hub-backend","arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-user-org-admin.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-user-org-admin/2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-18T22:35:48Z","origin_kind":"generated","source_digest":"7e1a6753bec43aa5e758f148039c1af71517142bb6e039dc8b1de20638018d77","source_path":"specs/harness-hub-system-specification.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "C14 マクロ分解 (Studio mockup 反映で確定した U7 拡張スコープ + I10-I14 から導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-user-org-admin.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-xwt","linked_at":"2026-07-18T01:46:50Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# Studio: ユーザー管理・アカウント設定 (role 統合・係数設定・PII ガード)

> Studio 拡張 / macro feature (C14)。1 feature = 13 task への細分解は system-dev-planner (`/dev-graph plan`) が行う。
> 由来: Harness Studio mockup 反映 (qa-021〜030・U7 改訂 appr-004/005・D5/D6)。正本分析: docs/mockups/harness-studio-v2-analysis.md

## 目的

ユーザー管理 (S17) とアカウント設定 (S18) を提供し、role 管理 (qa-005 の 4 role と統合)・年収→時給換算の係数設定 (PII: admin 限定・API 非公開・export マスク = SEC4)・通知設定 (D6 Resend)・規約公開を確立する (I14)

## 到達状態

workspace-admin がユーザーの role・部門・年収係数を管理でき、salary が PII ガード (admin 限定表示・読取監査・export マスク) 下にあり、通知設定が通知ディスパッチ共通層と接続され、全利用者が規約・ポリシーを参照できる状態

## スコープ

**対象 (in):**

- S17 ユーザー管理 + 個別ダッシュボード
- S18 アカウント設定 (プロフィール/通知/表示)
- S18 配下の /legal 規約・ポリシー静的ページ (全利用者が閲覧可能)
- User 拡張 (department/salary) + TenantCoefficient エンティティ
- PII ガード共通層 (salary の admin 限定・監査・export マスク)
- 通知設定と D6 (Resend) 通知ディスパッチの接続

**対象外 (out):**

- 認証方式の変更 (D3 の IdP 委譲を維持。パスワード/2FA 自前実装は不採用)
- role 体系の再設計 (qa-005 の 4 role を維持)

## 受入

- salary が admin 以外の API/画面/export に露出しない (分離テスト + 監査記録)
- 係数変更が監査 event に記録される (SEC6)
- S17/S18 と /legal が axe 違反 0 で動作し、/legal は全利用者が閲覧できる

## アーキテクチャ参照

- [arch-harness-hub-security](../architecture/harness-hub-security.md)
- [arch-harness-hub-backend](../architecture/harness-hub-backend.md)
- [arch-harness-hub-frontend](../architecture/harness-hub-frontend.md)

- 要件正本: [spec-harness-hub-requirements](../specs/harness-hub-system-specification.md)

## 機能間依存

- feat-hub-foundation
- feat-domain-model-db
- feat-auth-tenancy

## MVP 追補 (2026-08-12 / issue-hearing-sheet-overhaul)

- S17 個別ダッシュボード (`/users/[id]`) に、API で取得済みだった **email** と **最終ログイン日時** を読み取り表示する。
- 編集対象ではなく定義リストの読み取り項目。一覧 (S17) では出さず詳細のみ。
- 情報設計: `docs/features/feat-user-org-admin/information-design/S17-detail.md`。

## Handoff

### Post-merge 状態（2026-08-07）

- 実装 PR: [#657](https://github.com/daishiman/HarnessHub/pull/657) / merge commit `fb05db56`（`main` 取り込み済み）
- Beads: `HarnessHub-xwt.5`〜`.12` を完了。`HarnessHub-xwt.13`（本番デプロイ）と epic `HarnessHub-xwt` は未完了
- 仕様影響: なし（`docs/features/feat-user-org-admin/post-merge-lifecycle-receipt.md`）
- 再検証: task package validator PASS、focused tests 132 passed / 10 todo
- 次アクション: 承認後に P13（Cloudflare Workers 本番反映）を実施し、完了後に feature completion_evidence を graph 正規フローで記録

- 次工程: `/dev-graph plan --feature-id <本 feature id> --feature-context features/<id>.context.json` (exact-13 task 仕様化)
- 昇格条件: confirmation_status=confirmed + evaluation_status=pass + implementation_readiness=complete で起票対象になる
