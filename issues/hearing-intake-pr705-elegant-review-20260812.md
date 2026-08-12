---
graph_node_id: "issue-hearing-intake-pr705-elegant-review-20260812"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "fullstack"
tags: ["hearing-intake","security","elegant-review","pr-705"]
priority: "high"
start_date: "2026-08-12"
target_date: null
iteration: null
title: "PR #705 と未コミット拡張を30思考法で再検証し整合させる"
owners: ["daishiman"]
created_at: "2026-08-12T00:00:00Z"
updated_at: "2026-08-12T06:58:00Z"
status: "closed"
depends_on: []
related_nodes: []
resource_scope: ["apps/hub/src/features/hearing-intake/","apps/hub/src/app/api/hearing/","apps/hub/src/app/api/v1/sheets/","apps/hub/src/app/(dashboard)/sheets/","packages/schemas/hearing-intake/","packages/db/schema/hearing-intake/","packages/db/repository/hearing-screenshots.ts","packages/db/repository/hearing-share-tokens.ts"]
purpose: "現在の PR と作業ツリーに含まれるヒアリング intake 拡張を、先入観なしで多角的に再検証し、安全で最小複雑性の実装へ整える。"
goal: "30思考法の分析結果を反映し、矛盾なし・漏れなし・整合性あり・依存関係整合の4条件をすべて満たす。"
scope_in: ["PR #705 の変更","現在の未コミット・未追跡のヒアリング intake 拡張","検出欠陥の実装修正と回帰テスト","関連仕様の実装状態への同期"]
scope_out: ["成果物の削除","他 PR・他機能の無関係な変更","本番デプロイと外部サービス mutation"]
acceptance: ["30思考法すべての分析結果が揃う","公開共有・画像・トークン・tenant 認可の安全境界がテストで固定される","schema・DB・repository・API・UI・仕様の依存鎖が整合する","関連 typecheck・test・lint が成功する","矛盾なし・漏れなし・整合性あり・依存関係整合がすべて PASS"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-backend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/hearing-intake-pr705-elegant-review-20260812.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"15aa5fa85e2b0d16eef1e65590b542ac7531a92f528a8a4b88924aa152bc8b52","evaluator":"2026-08-12 の思考リセット後30思考法レビュー","evidence_ref":"issues/hearing-intake-pr705-elegant-review-20260812.md"}
source_lineage: {"imported_at":"2026-08-12T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "PR と作業ツリーの具体的な実装欠陥を修正・検証する単一のレビュー改善課題。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/hearing-intake-pr705-elegant-review-20260812.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-370h","linked_at":"2026-08-12T06:17:42.806262Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: [{"base_branch":"main","closing_reference_verified":false,"head_branch":"feat/hearing-intake-usage-axes","linked_at":"2026-08-12T06:00:00Z","merge_commit_sha":null,"merged_at":null,"pr_number":705,"repo":"daishiman/HarnessHub","state":"open","url":"https://github.com/daishiman/HarnessHub/pull/705"}]
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-12T06:55:26Z","evidence_refs":["issues/hearing-intake-pr705-elegant-review-20260812.md","apps/hub/tests/hearing-intake/contracts-compatibility.test.ts","apps/hub/tests/hearing-intake/public-hearing-route.test.ts","apps/hub/tests/hearing-intake/safe-image.test.ts","apps/hub/tests/hearing-intake/handoff-routes.test.ts","apps/hub/tests/hearing-intake/wizard-structure.test.ts","packages/db/__tests__/hearing-share-repositories.test.ts","packages/db/__tests__/migration-lineage.test.ts","packages/db/__tests__/backup-restore.test.ts"],"policy":"manual","reconciled_at":"2026-08-12T06:56:00Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-08-12T00:00:00Z","missing_sections":[],"status":"complete"}
---

# PR #705 と未コミット拡張を30思考法で再検証し整合させる

## 概要

PR #705 の用途プロファイル追加と、同じブランチの作業ツリーにある公開共有・スクリーンショット・引き渡しトークン拡張を、思考リセット後に30思考法で再検証した。

## 背景と問題

PR の説明範囲より作業ツリーの実装範囲が広がり、schema、DB、repository、API、認可、UI、仕様の依存鎖に不整合が入りうる状態だった。公開トークンと画像配信は認証外の境界を新設するため、通常のUI改善より強い安全確認を要した。

## 改善結果

- 旧11項目 snapshot を現行形式へ読む互換 decoder と、現行 request の厳格な条件付き検証を分離した。
- 公開経路を正確な token / ULID 形式だけに限定し、middleware と route の認証例外を一致させた。
- 画像を PNG / JPEG / WebP の実データ検証と安全な添付配信に限定し、認証付きダウンロードと削除確認を追加した。
- share token の時刻を epoch milliseconds に統一し、アクセス数を原子的に更新するようにした。
- 新規2テーブルを migration、全テーブル台帳、バックアップ/復元、テナント分離へ結線した。
- UIを責務別に分割し、28項目・8画面と関連仕様を同期した。
- UIの排他選択と親子項目を操作時に正規化し、非表示の古い値を送信しないようにした。

## 受入結果

- 30思考法: 3分析エージェントへカテゴリ分割し、30/30を適用して統合した。
- 矛盾なし: PASS
- 漏れなし: PASS
- 整合性あり: PASS
- 依存関係整合: PASS

## 検証証跡

2026-08-12 に次を実測し、すべて PASS した。

- Hub hearing-intake: 18 files / 180 tests
- Hub 横断 security / authz / detail UI: 4 files / 48 tests
- DB: 42 files / 341 tests
- Schemas: 9 files / 134 tests
- Auth release contract: 6 files / 64 tests
- Accessibility: UI 30 tests + Hub 5 tests
- Hub / DB / Schemas typecheck、Hub production build、対象ソース lint
- auth、duplicate、DDL、tenant isolation、connection isolation、contract drift、bundle、dynamic route gates

成果物の削除、本番デプロイ、commit、push は実施していない。
