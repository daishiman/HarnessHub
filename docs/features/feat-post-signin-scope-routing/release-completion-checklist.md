---
status: confirmed
layer: feature-release
---

# feat-post-signin-scope-routing リリース完了チェックリスト

本書は [spec-reflection-receipt.md](./spec-reflection-receipt.md) の「残課題」（本番デプロイ、実環境での到達確認、PR merge と default-branch reconciliation）を、実行可能な手順とチェックリストへ分離したもの。実際のデプロイ・実環境確認自体はこの文書の対象外であり、実施記録を追記する台帳として使う。

## 1. 完了条件

- [x] PR merge と default branch reconciliation — PR #647（docs整理）・PR #648（`feat(hub): route signed-in users with resolved scope`）ともに main へ merge 済み
- [x] `ci.yml` deploy job が success（上記 merge を含む main の反映分）— **2026-08-08 実測で確定**: main `44109782` の hub-ci run [31240466397](https://github.com/daishiman/HarnessHub/actions/runs/31240466397) は deploy job 全 step success（配信版一致ゲート・稼働ビルド鮮度検査・OIDC smoke・DB/R2 smoke・hearing smoke を含む）、`失敗時ロールバック` は skipped。PR #648 は既に main へ merge 済みのため、この run が配備した版に本 feature の実装が含まれる
- [ ] 本番環境で `authorize()` の判定順（`apps/hub/src/middleware/authz.ts`）どおりに、下記 6 系統の scope 判定が到達可能であることを確認する
  1. 未認証 (`unauthenticated`, 401 → サインイン画面)
  2. scope 未申告 (`missing_tenant_scope`, 403)
  3. 二重申告・明示ヘッダーと session の不一致 (`ambiguous_scope`, 403)
  4. tenant 越境 (`tenant_mismatch`, 403)
  5. workspace 非所属 (`workspace_not_member`, 403)
  6. 正常到達（`/sheets` へ着地、または安全な `returnTo` の同一 origin 相対 path へ着地）
- [ ] open redirect 防止（絶対 URL・スキーム付き・`//host`・backslash trick の戻り先が既定着地 `/sheets` へフォールバックすること）を本番で確認する
- [ ] acceptance record（本チェックリスト）に実測値付きで pass を追記する

1 件でも欠けたまま `HarnessHub-3sjj.13`、親 Beads、dev-graph node を完了にしない。

## 2. 実行手順

```bash
gh run list --workflow ci.yml --branch main --limit 1   # deploy 状態の確認
```

残る 6 系統の scope 判定と open redirect フォールバックの確認は、複数 workspace 所属を含む認証済みセッションを要するため CI/CLI からは実行できない。`docs/features/feat-post-signin-scope-routing/operations-runbook.md` の分岐 A〜C・「着地先が想定外の画面になる場合」の確認手順に従い、人手で実施する。

## 3. 引き継ぎ

| 項目 | 状態 | 次のアクション |
|---|---|---|
| 実装・テスト・文書 | 完了 | — (PR #647・#648 merge 済み) |
| 本番デプロイ | **完了 (2026-08-08 実測)** | — (run 31240466397 / main `44109782` で deploy job 全 step success) |
| 6 系統 scope 判定の実環境確認 | 未実施 | operations-runbook.md 分岐 A〜C。**人手のブラウザ確認は再現性が無く、次のデプロイで壊れても気付けない。** 1〜5 は session cookie / scope ヘッダーの組合せで HTTP 応答 status が決まるため、`apps/hub/scripts/smoke-production-hearing.ts` と同型の本番 smoke として自動化し、`ci.yml` の smoke 群へ結線するのが望ましい (6 のみ着地 path の確認が要る) |
| open redirect フォールバック確認 | 未実施 | 同上。戻り先の判定は `returnTo` を変えた HTTP 応答の `Location` で機械的に測れるため、上記 smoke に含められる |
| PR merge / default branch reconciliation | 完了 | dev-graph PR linkage の記録（`reconcile-github-lifecycle.py --mode check`）を実施する |
| ランディング `/` 500 修復と入口 smoke | 実装済み・本番反映待ち | issue `issue-hub-root-500-signin-20260808`。CI に `check:dynamic-routes` と本番 `GET /` smoke（200 + `name="tenant"`）を追加。merge 後の hub-ci deploy で green を確認する |
