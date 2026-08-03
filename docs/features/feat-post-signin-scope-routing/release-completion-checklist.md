---
status: confirmed
layer: feature-release
---

# feat-post-signin-scope-routing リリース完了チェックリスト

本書は [spec-reflection-receipt.md](./spec-reflection-receipt.md) の「残課題」（本番デプロイ、実環境での到達確認、PR merge と default-branch reconciliation）を、実行可能な手順とチェックリストへ分離したもの。実際のデプロイ・実環境確認自体はこの文書の対象外であり、実施記録を追記する台帳として使う。

## 1. 完了条件

- [x] PR merge と default branch reconciliation — PR #647（docs整理）・PR #648（`feat(hub): route signed-in users with resolved scope`）ともに main へ merge 済み
- [ ] `ci.yml` deploy job が success（上記 merge を含む main の反映分）
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
| 本番デプロイ | 未確認 | 上記コマンドで deploy job の成否を確認する |
| 6 系統 scope 判定の実環境確認 | 未実施 | operations-runbook.md 分岐 A〜C に沿って人手で確認する |
| open redirect フォールバック確認 | 未実施 | 同上 |
| PR merge / default branch reconciliation | 完了 | dev-graph PR linkage の記録（`reconcile-github-lifecycle.py --mode check`）を実施する |
