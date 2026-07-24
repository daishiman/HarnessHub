---
status: confirmed
layer: feature-design
task: SYS-DOMAIN-MODEL-DB-P12
parent_feature: feat-domain-model-db
feature_package_id: feature-package/feat-domain-model-db
feature_context_digest: sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc
package_digest: sha256:6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b
consumes: [docs/features/feat-domain-model-db/evidence-summary.md, docs/backend-spec.md, docs/security-spec.md, docs/infrastructure-spec.md]
---

# feat-domain-model-db 運用 Runbook (P12)

> **位置づけ**: 本 feature が owner の運用手順の正本。ここに書かれたコマンドはすべて P05-P11 で実装・実行済みの成果物 (backup ライブラリ・CLI・CI ゲート) を呼ぶものであり、未実装処理を文書で代替していない。

## 1. 日次 export (qa-019 / RPO ≤ 24h)

- **正本経路**: GitHub Actions `backup.yml` (cron `0 17 * * *` = JST 2:00)。Turso dump → gzip → R2 `harness-hub-backups` の `db-export/<YYYY>/<YYYY-MM-DD>.sql.gz`。secret 欠落時は fail-closed (成功に数えない)。
- **補完経路 (手動/検証用)**: 本 feature の export CLI。成果物は決定論的 JSONL で、salary / client_secret_enc は**暗号文のまま**転写される (復号処理が export 経路に存在しないため、平文はどの断面にも現れない)。
  ```bash
  # 認証トークンは argv (プロセス一覧に見えるコマンド引数) へ載せず、環境変数で渡す
  pnpm --filter @harness-hub/db run export:control-plane -- \
    --url "$TURSO_DATABASE_URL" --out export.jsonl
  ```
- **Workers cron ジョブ**: `packages/db/cron/export-daily.ts` の `createDailyExportJob()` (feat-hub-foundation の CronJob 契約と構造互換)。apps/hub の cron registry への配線は消費側 feature の統合作業として行う。
- **salary マスク確認手順**: export 成果物に対し `grep -c '"salary":"[0-9]\+:'` で暗号文形式 (`{key_version}:{iv}:{ct}:{tag}`) を確認し、平文数値が 0 件であることを見る。機械検証は DMDB-T06 (CI G4) が毎 PR で実施済み。

## 2. 四半期 restore drill (qa-019: 復元できないバックアップを成功と数えない)

常設 staging は持たない (qa-038)。**一時 DB を都度作成して使い捨てる**。

```bash
# 1) 一時 DB を作成 (本番とは別インスタンス)
turso db create harness-hub-drill-$(date +%Y%m%d)
# 2) 最新 export を取得 (backup.yml 経路の場合は R2 から download して展開)
# 3) restore CLI — migration 適用 → 全行復元 → 行数一致 → audit chain 検証 → 暗号断面検査 を一括実行
TURSO_AUTH_TOKEN="$DRILL_AUTH_TOKEN" pnpm --filter @harness-hub/db run restore:control-plane -- \
  --url "$DRILL_DATABASE_URL" \
  --in export.jsonl --migrations-dir packages/db/migrations
# exit 0 = drill 成功。exit 1 = そのバックアップを成功と数えない (原因調査へ)
# 4) 一時 DB を破棄
turso db destroy harness-hub-drill-YYYYMMDD --yes
```

- 検証順序は ADR §9 のとおり CLI 内部で強制される: header 検証 → schema 適用 → insert → 行数一致 → audit chain 全体検証 → salary/secret 暗号断面検査。
- ローカルでの手順予行は `--url file:/tmp/drill.db` で同一コマンドが動く (DMDB-T12 が CI で毎 PR 検証)。

## 3. migration 積み増し手順 (Studio 拡張 feature 向け)

正本: [refactoring-migration-note.md](./refactoring-migration-note.md) §3。要点:

1. `packages/db/schema/{studio-feature}/` に定義追加 → barrel へ re-export 1 行
2. `pnpm --filter @harness-hub/db exec drizzle-kit generate --name <変更名>`
3. `check:ddl` / `check:tenant-isolation-coverage` を通す (tenant_id 新テーブルは fixture seed 追加が必須)
4. 並行追加でコンフリクトしたら自分の migration を破棄し main 取込後に再生成 (連番の手詰め禁止)
5. 破壊的 DDL は expand → デュアルリード/ライト → contract の 3 段階 + `-- ddl:contract-approved <理由>` 注釈が必須

## 4. KEK / DEK ローテーション (security-spec §4.1.2)

### 4.1 KEK ローテーション (年 1 回。全行再暗号化**不要**)

1. 新 KEK (32 byte random, base64) を生成し Workers Secret へ追加: `openssl rand -base64 32` → `wrangler secret put ENCRYPTION_KEK_NEXT`
2. 全 DEK (encryption_keys の全行 = 数件) を旧 KEK で unwrap → 新 KEK で wrap し直す (対象は `dek_wrapped` 列のみ)
3. `ENCRYPTION_KEK` を新値へ切替え、旧 KEK を削除
4. 検証: 任意の salary 行を `decryptSalary()` 経由で復号できること (DMDB-T11 相当のラウンドトリップ)

### 4.2 DEK ローテーション (年 1 回 + 侵害疑い時。対象は salary / idp_secret の小規模再暗号化)

1. `ColumnCipher.rotateDek(purpose)` を実行 — 現 active を `retiring` へ落とし、新 key_version を `active` で発行 (実装済み・DMDB-T11 で検証済み)
2. 新規書込は自動的に新 version を使う (encryptColumn は常に active を使用)
3. バッチで旧 version の行を読み (`decryptColumn` は key_version 列により旧版を常に復号可能)、`updateSalary()` / 再暗号化で新 version へ移行
4. 移行完了後、旧 version の status を `retired` へ更新 (**行は削除しない** — 復旧可能性の確保)
- 契機: 定期 = 年 1 回。臨時 = 侵害の疑い・退職者の DB アクセス失効時

## 5. audit chain 日次検証 (security-spec §5.4.4)

- **ジョブ**: `packages/db/cron/verify-audit-chain.ts` の `createVerifyAuditChainJob()` — テナントごとに chain 全体を再計算し、不一致・seq 欠番で `AuditChainBrokenError` を throw (cron 基盤が failed 記録)。検出ロジックは restore drill と同一実装 (`backup/verify.ts`) で、改竄・削除・挿入の検出力は DMDB-T10 が CI で毎 PR 検証。
- **手動実行 (調査時)**: restore CLI の chain 検証部を単体で使う場合は、export → 空 DB へ restore して report の `chainOk` を見るのが最短 (§2 の手順を流用)。
- **検出時の対応**: 該当テナントの監査画面に警告 → 提供者が原因調査 → 顧客管理者へ通知 (`audit.chain_broken`)。通知配線は通知 feature の責務。
- **検出できないもの**: chain 全体の再計算による改竄 (提供者による) は N1 の残余リスクとして受容 (security-spec §5.4.4)。

## 6. 運用チェックリスト (月次)

- [ ] backup.yml の heartbeat が直近 24h 以内に届いている (欠落 = export 失敗)
- [ ] R2 `harness-hub-backups` の lifecycle rule (直近 90 日 + 月次 12 ヶ月) が有効
- [ ] `verify-audit-chain` cron の failed 記録が 0 件
- [ ] 四半期境界の月は §2 の restore drill を実施し、結果 (exit code と report) を記録
