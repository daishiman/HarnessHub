---
title: "feat-feedback-loop リリース記録 (P13)"
status: deployed_pending_feedback_production_smoke
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

## 実測による更新 (2026-08-08)

上記「ロールバック後」の記述は、**現在の本番状態とは食い違う**ため以下で是正する。main `44109782` の hub-ci run [31240466397](https://github.com/daishiman/HarnessHub/actions/runs/31240466397) は deploy job の全 step が success で、`失敗時ロールバック` は **skipped** だった。

| 項目 | 状態 |
|---|---|
| production migration 適用 | success |
| wrangler deploy | success |
| `/health` 疎通・配信版一致ゲート・稼働ビルド鮮度検査 | いずれも success |
| 本番 OIDC smoke | success |
| 本番 DB / R2 smoke (6 項目) | success |
| 本番 hearing smoke (`tenant_mismatch` の 404/403 乖離) | **success** — 乖離は既存契約へ収束済み |
| 失敗時ロールバック | skipped |

したがって「残る実施順序」の 1・2 は完了、Worker はロールバック状態ではなく本 feature を含む main が配信されている。frontmatter の `status` を `rolled_back_pending_feedback_production_smoke` → `deployed_pending_feedback_production_smoke` へ改めた。

**残っているのは Feedback 固有の 3 項目 (下記 3〜5) だけであり、その未測定の理由は「デプロイされていないから」ではなく「測る手段が実装されていないから」である。** `apps/hub/scripts/` に存在する本番 smoke は hearing / publish / oidc の 3 系統のみで、Feedback 用は無い。人手確認で済ませると次のデプロイで壊れても気付けないため、`smoke-production-hearing.ts` と同型の `smoke-production-feedback.ts` を実装し `ci.yml` の smoke 群へ結線するのが正しい塞ぎ方である。

## 残る実施順序

1. ~~Hearing スモークの期待 HTTP status（404）と実際の `tenant_mismatch`（403）の乖離を、担当 P13 で既存契約へ収束させる。~~ **完了 (run 31240466397 で hearing smoke success)**
2. ~~successful `hub-ci` run で `0007_feedback-loop-builds.sql` の適用を再確認する~~ **完了 (同 run の production migration step success)**
3. S14 (`/feedback`) の本番到達性を確認する。
4. feedback API (`POST/GET /api/v1/feedback`) の本番疎通を確認する。
5. AI キュー pull 疎通を確認する: workspace-admin による自 tenant pull、provider-admin による cross-tenant pull と `provider.cross_tenant_access` 監査記録。
6. 4 点(S14 到達性・feedback API 疎通・migration 適用確認・AI キュー pull 疎通)の結果を本ファイルへ追記し、`status` を `confirmed` へ更新する。

## Rollback

いずれかのスモークテストが失敗した場合、cloudflare-workers/hub を直前バージョンへロールバックする。migration は expand-only の既定契約に従い自動 down せず、DB を前進させたまま原因調査を P05(実装)/P08(migration)へ差し戻す。

## 2026-08-08 production coverage smoke 準備

`HarnessHub-p0lr` の F1〜F5 で投稿、AI queue pull/complete、応答書戻し、状態遷移を同じ使い捨て tenant で検査できるようにした。local focused test / typecheck は PASS。provider-admin 越境の edge/route 不一致 (`HarnessHub-stmx`) と production run は残課題であり、P13 は未完了のままとする。

## 2026-08-08 production coverage smoke 実走結果

main `35a10b87` の hub-ci run `31253674292` で F1〜F5 が SUCCESS。feedback 作成、`feedback_response` pull/complete、AI 応答書戻し、`open → in_progress → resolved` を本番 DB で確認し、cleanup 後の残存行は 0 だった。ただし S8 は provider-admin 越境を edge が 404 で止め、`provider.cross_tenant_access` 監査行は 0 の現行挙動を確認した。これは `HarnessHub-stmx` の未解決契約そのものなので、Feedback P13 は in_progress を維持する。
