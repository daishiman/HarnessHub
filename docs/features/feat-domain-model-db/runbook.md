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

- **正本経路**: GitHub Actions `backup.yml` (cron `0 17 * * *` = JST 2:00)。下記 export CLI → gzip → R2 `harness-hub-backups` の `db-export/<YYYY>/<YYYY-MM-DD>.jsonl.gz`。secret 欠落時は fail-closed (成功に数えない)。
- **成果物を JSONL にしている理由**: §2 の restore drill が読める形でなければ「復元できないバックアップを成功と数えない」(qa-019) を満たせないため。SQL dump にすると日次成果物と drill の入力が別物になり、drill が検証しているのは本番バックアップではなくなる。副次的に、この経路は Turso CLI とその Platform API token を必要としない。
- **手動実行 (検証・調査時)**: 正本経路と同じ CLI を手で叩く。成果物は決定論的 JSONL で、salary / client_secret_enc は**暗号文のまま**転写される (復号処理が export 経路に存在しないため、平文はどの断面にも現れない)。
  ```bash
  # 成果物置き場を 1 つ決め、パスは必ず絶対で渡す。`pnpm --filter` は対象 package を cwd にして
  # 子プロセスを起動するため、相対パスだと packages/db 基準になり打った場所と食い違う
  WORK_DIR="$(mktemp -d)"

  # 認証トークンは argv (プロセス一覧に見えるコマンド引数) へ載せず、環境変数で渡す
  pnpm --filter @harness-hub/db exec tsx scripts/export-control-plane.ts \
    --url "$TURSO_DATABASE_URL" --out "$WORK_DIR/export.jsonl"
  ```
- **Workers cron ジョブ**: `packages/db/cron/export-daily.ts` の `createDailyExportJob()` (feat-hub-foundation の CronJob 契約と構造互換)。apps/hub の cron registry への配線は消費側 feature の統合作業として行う。
- **salary マスク確認手順**: export 成果物に対し `grep -c '"salary":"[0-9]\+:'` で暗号文形式 (`{key_version}:{iv}:{ct}:{tag}`) を確認し、平文数値が 0 件であることを見る。機械検証は DMDB-T06 (CI G4) が毎 PR で実施済み。

## 2. 四半期 restore drill (qa-019: 復元できないバックアップを成功と数えない)

常設 staging は持たない (qa-038)。**一時 DB を都度作成して使い捨てる**。

```bash
# 0) 成果物置き場を 1 つ決める (§1 と同じ規約)。以降のパスはすべて絶対で渡す
WORK_DIR="$(mktemp -d)"

# 1) backup.yml が作った最新の export を R2 から取得して展開
#    LATEST_OBJECT_KEY の日付は R2 一覧で最新の成功日を選ぶ
#    展開先は §1 の手動 export と同じ名前にする。以降の restore は取得元 (R2 / 手動) を問わず同一コマンドになる
LATEST_OBJECT_KEY="db-export/YYYY/YYYY-MM-DD.jsonl.gz"
pnpm --filter @harness-hub/hub exec wrangler r2 object get \
  "harness-hub-backups/$LATEST_OBJECT_KEY" --file "$WORK_DIR/latest.jsonl.gz" --remote
gzip -dc "$WORK_DIR/latest.jsonl.gz" > "$WORK_DIR/export.jsonl"

# 2) 削除済み tenant_data を古い artifact から復活させないため、同じ export から tombstone manifest を抽出する
#    古い artifact を復元する場合は、削除後に作られた新しい export から manifest を抽出して、このファイルを差し替える
pnpm --filter @harness-hub/db exec tsx scripts/extract-tenant-data-tombstones.ts \
  --in "$WORK_DIR/export.jsonl" --out "$WORK_DIR/tenant-data-tombstones.json"

# 3) 空の一時 DB へ restore する。常設 staging は持たないので使い捨てのローカル DB を使う
DRILL_DATABASE_URL="file:$WORK_DIR/drill.db"
pnpm --filter @harness-hub/db exec tsx scripts/restore-control-plane.ts \
  --url "$DRILL_DATABASE_URL" --in "$WORK_DIR/export.jsonl" \
  --tombstone-manifest "$WORK_DIR/tenant-data-tombstones.json"
# exit 0 かつ report の ok / chainOk がともに true = drill 成功。
# 1 つでも欠ければ、そのバックアップを成功と数えない

# 4) 復元 DB を独立クエリで確認 (baseline は domain table=18 / explicit index=12)
sqlite3 "$WORK_DIR/drill.db" \
  "SELECT count(*) AS domain_tables FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> '__drizzle_migrations';
   SELECT count(*) AS explicit_indexes FROM sqlite_master WHERE type='index' AND sql IS NOT NULL;"

# 5) 作業ディレクトリごと破棄 (一時 DB もこの中にあるため Turso 側の後始末は不要)
rm -rf "$WORK_DIR"
```

- **本番復旧のときも同じ 2)-3) を打つ。** 復旧先を Turso にする場合は `DRILL_DATABASE_URL` を新規 DB の接続 URL に、`TURSO_AUTH_TOKEN` を発行済みの DB 接続 token に差し替えるだけで、コマンド本体は変わらない。drill と復旧で別のコマンドを持たない (drill で通した経路がそのまま復旧経路であることが RTO ≤ 4h の根拠)。
- 検証順序は ADR §9 のとおり CLI 内部で強制される: header 検証 → schema 適用 → insert → 行数一致 → audit chain 全体検証 → salary/secret 暗号断面検査。schema は restore CLI 自身が適用するため、SQL dump を別途流し込む手順は要らない。
- 2026-07-25 の実走で、Turso の SQL dump は `turso db create --from-dump` へ渡すと Turso CLI 1.0.30 で 0 table のまま成功表示になることを確認済み。**復元できたように見えて中身が空になる経路**があるため、成功判定は CLI の exit code ではなく上記 report の `ok` / `chainOk` で行う。
- §1 の手動 export をそのまま検証する場合は 1) を飛ばして 2) から 3) を実行する (`$WORK_DIR/export.jsonl` が既にある状態)。この最短経路は DMDB-T14 が CI で毎 PR 実走している。

## 2.1 本番最初のテナント投入

`seed-local` は同じ slug を消して作り直すので本番禁止。本番の最初の
tenant / workspace / 管理者所属は
[`bootstrap-tenant`](../feat-auth-tenancy/production-tenant-bootstrap-runbook.md)
だけを使う。既存 name / plan は上書きせず、無い行だけを足す。

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

## 7. ローカル file DB が `ConnectionPoisonedError` になったとき

対象は Node の `file:` / `:memory:` libSQL だけで、Turso remote / D1 の本番 request-bound 経路には適用しない。

1. 現在の処理を失敗として終了する。同じ adapter の read/write を再試行しない。
2. 併走中の export、restore drill、別テスト process、dev server が同じ file DB を開いていないか確認する。
3. lock holder を正常終了させる。強制終了した場合は一時 DB と成果物の整合も確認する。
4. 既存 adapter を継続利用する必要がある場合だけ `adapter.reconnect()` を呼ぶ。公開 client / Drizzle / repository の作り直しは不要。
5. reconnect 後は、別接続から commit 済みデータが見えることを確認してから処理を再開する。

`isPoisoned()` が `true` の間に同じ接続を叩き続けてはいけない。例外の `cause` に元の
`SQLITE_BUSY` を残すのは原因調査用であり、再試行可能という意味ではない。
