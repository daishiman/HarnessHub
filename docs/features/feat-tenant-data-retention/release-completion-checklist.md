---
status: confirmed
layer: feature-release
---

# feat-tenant-data-retention リリース完了チェックリスト

本書は [spec-reflection-receipt.md](./spec-reflection-receipt.md) の残課題（main merge 後の production deploy、planned の Turso Platform API secret 投入、実環境 smoke／restore drill）を、実行可能な手順とチェックリストへ分離したもの。実際のデプロイ・secret 投入・実環境確認自体はこの文書の対象外であり、実施記録を追記する台帳として使う。

## 1. 完了条件

- [x] PR merge — PR #650（`feat: テナント業務データ保管を追加`）は main へ merge 済み
- [ ] `ci.yml` deploy job が success（上記 merge を含む main の反映分）
- [ ] Turso Platform API secret（`TURSO_API_TOKEN` / `TURSO_ORG_SLUG` / `TURSO_DATABASE_NAME`）を投入する。現状 `scripts/ci/worker-secrets-registry.json` で `requirement: "planned"` のまま未投入
- [ ] R2 使用量監視（`runbook.md` §2）の critical/warning 通知が本番 cron で実際に発火することを確認する
- [ ] Turso 側使用量監視（rows_read/rows_written/storage_bytes）が secret 投入後に有効化されることを確認する
- [ ] 削除 → backup restore drill（`runbook.md` §1.5、tombstone manifest 必須・古い manifest は fail-closed で停止すること含む）を実環境で 1 回実施する
- [ ] encryption_keys ローテーション（`runbook.md` §3、`tenant_data` purpose）を実環境で 1 回実施し、旧 `key_version` で暗号化済みデータが復号可能なままであることを確認する

1 件でも欠けたまま `HarnessHub-47b.13`、親 Beads、dev-graph node を完了にしない。

## 2. 実行手順

```bash
gh run list --workflow ci.yml --branch main --limit 1   # deploy 状態の確認
```

### Turso Platform API secret 投入（未実施・要事前承認）

```bash
printf %s "$TURSO_API_TOKEN"    | pnpm --filter @harness-hub/hub exec wrangler secret put TURSO_API_TOKEN
printf %s "$TURSO_ORG_SLUG"     | pnpm --filter @harness-hub/hub exec wrangler secret put TURSO_ORG_SLUG
printf %s "$TURSO_DATABASE_NAME"| pnpm --filter @harness-hub/hub exec wrangler secret put TURSO_DATABASE_NAME
```

投入後は `scripts/ci/worker-secrets-registry.json` の該当 3 エントリの `requirement` を `"planned"` から `"required"` へ更新し、`check-worker-secrets.mjs --live` で実投入状況との突合を確認する。

### restore drill

```bash
pnpm --filter @harness-hub/db exec tsx scripts/extract-tenant-data-tombstones.ts \
  --in <delete後の新しい-export.jsonl> --out <tenant-data-tombstones.json>
pnpm --filter @harness-hub/db exec tsx scripts/restore-control-plane.ts \
  --url <空の復元先-libsql-url> --in <復元対象-export.jsonl> \
  --tombstone-manifest <tenant-data-tombstones.json>
```

R2 使用量監視・restore drill・encryption_keys ローテーションは本番相当の R2/DB 環境を要するため CI/CLI から自動実行できず、人手で実施し証跡（実行ログ・出力）を本書へ追記する。

## 3. 引き継ぎ

| 項目 | 状態 | 次のアクション |
|---|---|---|
| 実装・テスト・文書 | 完了 | — (PR #650 merge 済み) |
| 本番デプロイ | 未確認 | 上記コマンドで deploy job の成否を確認する |
| Turso Platform API secret 投入 | 未実施 | 上記コマンドで投入し、台帳の requirement を更新する（外部認証情報のため事前承認必須） |
| R2/Turso 使用量監視の実発火確認 | 未実施 | 本番 cron 実行後に通知ログを確認する |
| restore drill | 未実施 | runbook.md §1.5 の手順で 1 回実施する |
| encryption_keys ローテーション | 未実施 | runbook.md §3 の手順で 1 回実施する |
| PR merge | 完了 | dev-graph PR linkage の記録（`reconcile-github-lifecycle.py --mode check`）を実施する |
