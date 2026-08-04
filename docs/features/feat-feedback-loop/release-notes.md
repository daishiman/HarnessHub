---
title: "feat-feedback-loop リリース記録 (P13)"
status: rolled_back_pending_feedback_production_smoke
layer: feature-release
graph_node_id: "SYS-FEEDBACK-LOOP-P13"
beads_linkage: "HarnessHub-1vb.13"
feature_package_id: feature-package/feat-feedback-loop
feature_context_digest: sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3
implementation_pr: "#652"
reviewed_at: "2026-08-04"
---

# feat-feedback-loop リリース記録

## リリース対象

- S14 の一覧・詳細・新規フォーム(CLI `claude harness feedback` + Web の 2 経路受付)
- `feedbacks` テーブル migration (`packages/db/migrations/0007_feedback-loop-builds.sql`)
- feedback API (`apps/hub/src/app/api/v1/feedback/`)、AI キュー (`ai-jobs`) pull/complete/fail 連携
- 対応済み通知(アプリ内正本 + Resend メール)、既存 `PublishRequest` パイプラインへの接続(`builds` テーブル経由)

## 状態

実装 PR [#652](https://github.com/daishiman/HarnessHub/pull/652) は 2026-08-03 に `main` へマージされた。
同じ `main` push で `hub-ci` の Cloudflare deploy job が実行されたが、後続の Hearing 用本番スモークが
`POST /api/v1/ai-jobs/pull: expected=404 actual=403 body={"error":"ambiguous_scope"}` で失敗した。
原因は Bearer トークンにも browser session 用 scope 自動選択を適用していたことと特定され、
既存の機械クライアント契約へ収束させる修正は [#659](https://github.com/daishiman/HarnessHub/pull/659) として
2026-08-04 に `main` へマージされた。

2026-08-04 の #659 後の run では、migration（`0007_feedback-loop-builds` を含む journal 8 件）、
Worker deploy、health、OIDC、DB/R2 smoke までは成功した。Hearing スモークが
`tenant_mismatch` を **403** で返したため（期待は 404）、CI は Worker を直前の安定版へ自動ロールバックした。
expand-only migration は戻さないため DB は前進したままである。

この run は Feedback Loop の4項目（S14 到達、feedback API、migration、AI キュー pull）を測定した結果ではない。
migration 適用だけは確認できたが、ロールバック後の S14・feedback API・AI キュー pull は未確認である。したがって
P13 は **未完了** とし、Feedback Loop の本番状態を推測で `confirmed` に更新しない。本プロジェクトの本番反映は
CI (`hub-ci` workflow) 経由の `wrangler deploy` を正本とし、手動 `wrangler deploy` は行わない
([feat-hub-foundation/release-notes.md](../feat-hub-foundation/release-notes.md) §1 の前例に従う)。

## ローカル実装・自動テストの状態(確定済み)

P01〜P12 は全て CLOSED、mandatory evidence 6 項目は全て PASS 済み([evidence/index.md](evidence/index.md))。

| # | Evidence 項目 | 状態 |
|---|---|---|
| 1 | priority 値域/round-trip | PASS |
| 2 | workspace-admin 自 tenant pull | PASS |
| 3 | provider-admin cross-tenant pull+audit | PASS |
| 4 | 他 tenant 拒否 | PASS |
| 5 | migration (`0007_feedback-loop-builds.sql`) | PASS |
| 6 | P10/P11 証跡対応表 | PASS(evidence/index.md がその対応表) |

quality_constraints 8 件は 8 件とも PASS([final-review-notes.md](final-review-notes.md))。

## 残る実施順序

1. Hearing スモークの期待 HTTP status（404）と実際の `tenant_mismatch`（403）の乖離を、担当 P13 で既存契約へ収束させる。
2. successful `hub-ci` run で `0007_feedback-loop-builds.sql` の適用を再確認する(`feedbacks` は新規テーブルのため backfill 不要)。
3. S14 (`/feedback`) の本番到達性を確認する。
4. feedback API (`POST/GET /api/v1/feedback`) の本番疎通を確認する。
5. AI キュー pull 疎通を確認する: workspace-admin による自 tenant pull、provider-admin による cross-tenant pull と `provider.cross_tenant_access` 監査記録。
6. 4 点(S14 到達性・feedback API 疎通・migration 適用確認・AI キュー pull 疎通)の結果を本ファイルへ追記し、`status` を `confirmed` へ更新する。

## Rollback

いずれかのスモークテストが失敗した場合、cloudflare-workers/hub を直前バージョンへロールバックする。migration が適用済みの場合は down migration を実行してから、原因調査を P05(実装)/P08(migration)へ差し戻す。
