---
status: confirmed
layer: feature-design
task: SYS-DOMAIN-MODEL-DB-P13
parent_feature: feat-domain-model-db
feature_package_id: feature-package/feat-domain-model-db
feature_context_digest: sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc
package_digest: sha256:6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b
consumes: [docs/features/feat-domain-model-db/runbook.md, docs/features/feat-domain-model-db/evidence-summary.md, packages/db/migrations/]
---

# feat-domain-model-db リリース記録 (P13)

> **位置づけ**: 本 feature の本番反映結果の正本。ここに記載した pass/fail はすべて 2026-07-25 に実インフラ (Turso `harness-hub-prod` / Cloudflare R2 / Cloudflare D1) に対して実行した結果であり、計画や意図ではない (Trace rule: P13 は未実装・未取得の証跡を文書で代替しない)。

## 0. 結論

- 本番 Turso への初回ベースライン migration 適用: **成功**
- D1 hedge の同一 migration 適用可能性: **成功** (一時 D1 で検証し即破棄)
- R2 content-addressed registry の有効化: **成功**
- スモークテスト 6 項目: **6/6 pass**
- 四半期 restore drill の実行可能性: **確認済み** (本番 export → 使い捨て Turso へ復元まで実走)
- finding: **8 件** (§8)。F-2 / F-3 / F-7 は解消して `HarnessHub-0yvi` を close、F-4 は設定名と runbook を同期済み、F-6 は main 取り込みで解消。F-1 は Secrets 登録まで完了し、未 push の workflow を GitHub 上で実走する工程だけを残す。F-5 は現行設計どおりの制約、F-8 は最小権限の未達を明示記録した残存リスク。
- task 仕様書の品質ゲート: `validate-system-plan.py` **`status: pass` / `violations: []`** (§8 F-6)
- 仕様・設計への反映: **あり** (§14)。`docs/infrastructure-spec.md` §7/§10・`docs/security-spec.md` §4.5・`architecture/harness-hub-infrastructure.md`・`specs/harness-hub-system-specification.md` を実装確定内容へ同期した。

## 1. リリース対象と環境

| 対象 | 実体 | 備考 |
| --- | --- | --- |
| primary DB | Turso `harness-hub-prod` (`aws-ap-northeast-1`) | D2 の primary 経路 |
| hedge DB | Cloudflare D1 | 常設せず。適用可能性のみ検証 (qa-038【3】) |
| package registry | R2 `harness-hub-packages` | prefix `packages/<sha256hex>` |
| backup 保管 | R2 `harness-hub-backups` | prefix `db-export/<YYYY>/` |

常設 staging は持たない (qa-038【3】が qa-034 を上書き)。本記録の検証はすべて「本番 + 使い捨てリソース」で行い、使い捨て分は検証後に破棄した。

## 2. 本番 Turso への migration 適用

適用は drizzle 公式 migrator 経由 (`packages/db/scripts/migrate-deploy.ts`)。生 DDL を直接流すと適用台帳 `__drizzle_migrations` が空のままになり、次回 migrate が `0000` を再適用して必ず失敗するため採らない。

```
dry-run: {"ok":true,"dryRun":true,"journal":1,"applied":0,"pending":1}
apply  : {"ok":true,"dryRun":false,"journal":1,"appliedBefore":0,"appliedAfter":1,
          "tags":["0000_baseline-core-domain"]}
```

適用後の実測 (`turso db shell harness-hub-prod`):

- ドメインテーブル: **18** (+ 適用台帳 `__drizzle_migrations` = 計 19)
- 明示 index (`sqlite_master.type='index' and sql is not null`): **12**
- FOREIGN KEY 制約: **0** (D1 互換のため意図的に持たない設計)

台帳が journal 件数へ到達しない場合は exit 1 とする fail-closed 実装のため、「適用したつもり」は成功に数えられない。

## 3. D1 hedge の適用確認

qa-038【3】により本番と同一構成を 2 系統常設しない。よって **一時 D1 を作成 → 同一 migration 適用 → 断面比較 → 即破棄** の手順で「hedge へ切り替え可能であること」だけを確認した。

| 断面 | Turso `harness-hub-prod` | 一時 D1 `harness-hub-d1-hedge-check` |
| --- | --- | --- |
| ドメインテーブル数 | 18 | 18 |
| 明示 index 数 | 12 | 12 |

- 適用コマンド: `wrangler d1 execute harness-hub-d1-hedge-check --remote --file packages/db/migrations/0000_baseline-core-domain.sql`
- 適用結果 meta: `num_tables: 18`, `rows_written: 66`, エラーなし
- 破棄: `wrangler d1 delete harness-hub-d1-hedge-check --skip-confirmation` → `wrangler d1 list` に HarnessHub 系 D1 が残っていないことを確認済み

同一 DDL が Turso/D1 双方で同一断面を作ることをもって、D2 ヘッジの方言互換が実インフラ上で成立していると判定する。

## 4. R2 registry の有効化確認

- バケット実在: `harness-hub-packages` / `harness-hub-backups` (`wrangler r2 bucket list` で確認)
- `apps/hub/wrangler.jsonc` の binding: `PACKAGES_BUCKET` → `harness-hub-packages`、`BACKUPS_BUCKET` → `harness-hub-backups`
- key 導出は実装 (`packages/db/registry/index.ts`) の `packageR2Key()` をそのまま通し、テスト用 fake ではなく実バケットへ put/get した (§5 S4)

## 5. スモークテスト (P13 受入条件 6 項目)

実行体: `packages/db/scripts/smoke-production.ts` (再実行可能)。専用テナント `smoke-<ulid>` を発行し、検査後に自動削除する。

| ID | 検査 | 結果 | 実測 |
| --- | --- | --- | --- |
| S1 | DB 接続 / スキーマ実在 | **pass** | domainTables=18, migrationLedger=true |
| S2 | ULID PK 発行 | **pass** | tenantId=`01KYBANXCYFEVQM6131WF4W8YY` (26 文字) |
| S3 | releases immutable | **pass** | 公開面 4 関数のみ / 汎用 CRUD 拒否 / 同一 hash 再作成は `created:false` / status 以外不変 |
| S4 | R2 registry put/get | **pass** | key=`packages/28a352b2…becc`, 36 bytes, bytesMatch=true, 冪等 put=true |
| S5 | audit hash chain | **pass** | 3 件 append → chain 検証 ok, errors=[] |
| S6 | 日次 export cron dry-run | **pass** | key=`db-export/2026/2026-07-25.jsonl`, restore round-trip ok, chainOk=true |

- 後片付け: `cleanup.remainingRows = 0` (tenants / target_channels / releases / audit_events すべて 0 件)
- S4 で put した検証オブジェクトは `wrangler r2 object delete` で削除済み。再実行 CLI も検証直後に自動削除し、削除失敗を smoke failure とする
- S6 は本番 R2 へは書かず、cron job の R2 put をメモリ上で捕捉して使い捨てローカル DB へ復元する (本番バックアップ断面を汚さない)

## 6. 四半期 restore drill の実行可能性 (qa-019)

本 task の範囲は drill 本実施ではなく「runbook.md §2 の手順どおりに実行できること」の確認。空 DB の復元では「復元できた」証明にならないため、**実データを含む本番断面** で実走した。

1. スモークを `--keep` で実行し本番に実データを作成 (tenants 1 / target_channels 1 / releases 1 / audit_events 3)
2. `export-control-plane.ts` で本番を export (7 行 JSONL)
3. 使い捨て Turso `harness-hub-drill-20260725b` を新規作成し `restore-control-plane.ts` で復元

```
{"ok":true,"restoredCounts":{"audit_events":3,"releases":1,"target_channels":1,"tenants":1},
 "chainOk":true,"errors":[]}
```

4. 復元先を独立クエリで再確認: `tenants=1 / target_channels=1 / releases=1 / audit_events=3` (一致)
5. 本番の検証行を削除し全テーブル 0 件へ復帰、使い捨て DB 2 件を `turso db destroy` で破棄

**副次確認**: 既にスキーマ適用済みの DB へ再 restore すると `CREATE TABLE` 衝突で exit 1 になることを実測した。復元先を取り違えて既存 DB へ上書きする事故が fail-closed で止まる。

**日次 SQL dump 経路の追補確認**: main 取り込み後、`backup.yml` が保存する形式そのものでも drill を実施した。本番 `.dump` (6,755 bytes) を新規 Turso へ `turso db shell <name> < production.sql` で投入し、domain table 18 / explicit index 12 を確認。その復元 DB を JSONL へ再 export し、ローカル空 DB への restore も `chainOk:true / errors:[]` で完走後、使い捨て Turso を破棄した。Turso CLI 1.0.30 の `db create --from-dump` は同じファイルで成功表示を返しながら 20 秒待っても 0 table だったため、runbook は標準入力による直接 restore を正本とする。

## 7. ロールバック

- **DB**: 本 feature の migration は expand-only (`CREATE TABLE` のみ / 破壊的 DDL 0 件)。適用前状態 = テーブル未作成であり、`drop table` 一括で復帰可能なことは §6 の使い捨て DB 破棄で等価に確認済み。ただし本番投入後は実データ喪失を伴うため、**CI は自動で巻き戻さない**。実行は「テーブル未作成へ戻して P08/P05 へ差し戻す」判断が確定した場合の手動操作に限る。旧 Worker は新規テーブルを参照しないため、DB を前進させたままでも本番は整合する。
- **Worker**: `wrangler rollback` で直前 version へ即時復帰。CI 配線は `.github/workflows/ci.yml` の「失敗時ロールバック」step (`if: failure()`)。
- **自動ロールバックの発火条件**: `steps.deploy.outcome == 'success'` のとき、すなわち**壊れた新 version が既に本番へ出ている**ときだけ Worker を戻す。migration 失敗 (deploy は `skipped`) や deploy 自体の失敗では新 version が出ていないため、戻す対象が無く何もしない。
- **step の exit code の意味**: この step の成否は「ロールバックの成否」を表す。元の失敗は前段 step が既に赤にしており job は failure のまま残るため、ここを無条件に赤くはしない (「復旧も失敗した」との誤読を避ける)。`wrangler rollback` 自体が失敗した場合のみ `::error::` 付きで exit 1 とし、手動介入を要求する。
- **分岐の検証**: 3 分岐 (deploy 未成功 / rollback 成功 / rollback 失敗) を `wrangler` を stub 化して実走し、それぞれ exit 0 / exit 0 / exit 1 と期待どおりの annotation を確認済み。

## 8. finding と対応状況

| ID | 内容 | 影響 | 扱い |
| --- | --- | --- | --- |
| F-1 | GitHub Actions に Turso 認証情報が未登録 | 2026-07-25 に DB 接続用 `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` と、backup CLI 用 `TURSO_API_TOKEN` / `TURSO_DATABASE_NAME` を repository secrets へ登録済み。Platform API token は空の設定 directory から `SELECT 1` を実行して有効性を確認。更新後 workflow は未 commit / push のため GitHub 上の backup / deploy 実走だけ未確認 | **HarnessHub-fnzl** を実走待ちで継続 |
| F-2 | `runbook.md` §1/§2 の `pnpm … run <script> -- --url` が pnpm 10.9.0 で失敗 | `pnpm --filter @harness-hub/db exec tsx scripts/...` へ修正し、runbook と同じ export / restore を一時 DB で実走して exit 0 | **解消**。HarnessHub-0yvi close |
| F-3 | 同 §2 の `--migrations-dir packages/db/migrations` が解決不能 | 誤った二重相対 path を削除し、CLI が `import.meta.dirname` から解決する既定 migration directory を利用。restore exit 0 | **解消**。HarnessHub-0yvi close |
| F-4 | GitHub Actions secret 一覧が不完全で、Turso / R2 の token 種別も曖昧 | runbook に deploy / backup の全 secret を列挙。DB 接続 token (`TURSO_AUTH_TOKEN`) と Platform API token (`TURSO_API_TOKEN`) を分離し、backup の R2 側は既存 Cloudflare API token + Wrangler put/get へ統一して専用 key 3 件を不要化 | **実装解消**。GitHub Actions 実走は F-1 と同じく待機 |
| F-5 | `apps/hub/wrangler.jsonc` に D1 binding が無い | hedge へ切り替える際は binding 追加が必要。現状は「切替可能性の確認」まで (§3) | 設計どおり。切替判断時に対応 |
| F-6 | `validate-system-plan.py` が 27 violations で red | `task-spec-section-missing` (Inner goal-seek execution loop) 13 件 + `inner-goal-seek-contract` 13 件 + `p13-spec-architecture-writeback` 1 件。`feat-hub-foundation` / `feat-doc-governance-portability` も同一の 27 件を返す既存かつリポジトリ全域の状態で、本タスクは `.dev-graph/plans/` も `tasks/` も変更していない | **解消**。2026-07-25 の main 取り込みで validator 契約版管理 (`validate-task-spec-contract.py` + `validation-contract-baseline.json`) が landed し、`status: pass` / `violations: []` / `contract_baseline_exemption: true` になった。本 task 側の是正は不要だった |
| F-7 | runbook の四半期 drill が JSONL CLI だけを案内し、日次 SQL dump の復元経路と不一致 | R2 SQL dump の取得 → 新 Turso へ標準入力 restore → 18 table / 12 index → JSONL semantic round-trip の 2 段検証へ修正。Turso `--from-dump` の偽成功経路を明示的に不採用 | **解消**。HarnessHub-0yvi の追補として実走済み |
| F-8 | R2 write を `CLOUDFLARE_API_TOKEN` 1 本へ統合したため、infrastructure-spec §7 が推奨する「Workers deploy 権限と R2 write 権限を分離した 2 token」が未達 | secret 台帳は 3 件減ったが、token 漏洩時の影響範囲は deploy + R2 write の両方へ広がる (最小権限の後退)。ただし §4.5 は「Workers binding 利用時は R2 専用キー不要」を既に確定しており、キー削除自体は確定範囲内 | **未達として明示記録**。`issue-ci-token-least-privilege-20260725` (**HarnessHub-bda4**) で追跡 |

## 9. CI 配線 (qa-038【5】)

`.github/workflows/ci.yml` の `deploy` job に以下を追加した。手動適用は採らず、deploy の直前に CI が production Turso へ適用する。

1. **production migration 適用** — `migrate-deploy.ts` を dry-run → 本適用の順で実行。`TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` が空なら exit 1 (未適用のまま Worker を出さない)
2. `opennext build` → `wrangler deploy` → `/health` 疎通確認 (既存)
3. **本番スモークテスト** — `smoke-production.ts` で §5 の 6 項目を毎デプロイ再実行
4. **失敗時ロールバック** — `if: failure()` step。方針は §7 のとおり「DB は戻さない / 壊れた新 version が出ているときだけ Worker を戻す / job は failure のまま残す」。判定に使うため `migrate` / `deploy` / `health` / `smoke` の 4 step へ `id` を付与した

## 10. 再実行コマンド

```bash
# migration 適用 (dry-run で未適用件数を確認してから本適用)
TURSO_AUTH_TOKEN="$TOKEN" pnpm --filter @harness-hub/db exec tsx scripts/migrate-deploy.ts \
  --url "$TURSO_DATABASE_URL" --dry-run
TURSO_AUTH_TOKEN="$TOKEN" pnpm --filter @harness-hub/db exec tsx scripts/migrate-deploy.ts \
  --url "$TURSO_DATABASE_URL"

# スモークテスト 6 項目 (専用テナントは自動削除)
TURSO_AUTH_TOKEN="$TOKEN" pnpm --filter @harness-hub/db exec tsx scripts/smoke-production.ts \
  --url "$TURSO_DATABASE_URL" --r2-bucket harness-hub-packages

# plan 再検証
python3 plugins/system-dev-planner/scripts/validate-system-plan.py \
  --repo-root . --feature-package feature-package/feat-domain-model-db
```

`--` を挟まない形が正 (F-2)。認証トークンは argv へ載せず環境変数で渡す。

## 11. スコープ注記

published task spec の `Write scope/touches` は本ファイルのみだが、`Effective implementation/evidence paths` に `.github/workflows/ci.yml` と `packages/db/scripts/` 系が含まれる。CI 配線 (§9) と再実行可能な証跡 (§5/§10) を成立させるため、以下を新規追加した。

- `packages/db/scripts/migrate-deploy.ts` — production migration 適用 CLI
- `packages/db/scripts/smoke-production.ts` — スモークテスト 6 項目の実行体

いずれも既存 CLI (`export-control-plane.ts` / `restore-control-plane.ts`) と同じ規約 (`parseArgs` / JSON 出力 / fail-closed exit code) に従う。既存ファイルの振る舞いは変更していない。

`packages/db/__tests__/backup-restore.test.ts` には P13 CLI の結合検査も追加した。ローカル DB と R2 CLI stub (実コマンドと同じ put/get/delete 引数契約を持つ代役) で 6 項目を完走し、既存テナントを保持したままスモーク専用行と R2 検証 object だけが削除されることを機械検証する。

## 12. 再実行安全性の補強後検証

2026-07-25、P13 CLI の fail-closed (異常時に成功扱いしない設計) を補強した後に以下を再検証した。

- 本番の読み取り確認: Turso は domain table 18 / explicit index 12 / migration ledger 1、`smoke-%` tenant 0 件
- Cloudflare の読み取り確認: `harness-hub-packages` / `harness-hub-backups` が実在し、使い捨て HarnessHub D1 は残存 0 件
- GitHub Actions の読み取り確認: Cloudflare secrets 2 件 + `HUB_HEALTH_URL` に加え、Turso secrets 4 件 (`TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` / `TURSO_API_TOKEN` / `TURSO_DATABASE_NAME`) を登録済み。更新後 workflow は未 push なので、backup 直近 4 回 failure の履歴はまだ置き換わっていない。Worker `harness-hub` には 2026-07-21 の既存 deployment がある
- DB package: 13 test files / **65 tests pass**、TypeScript / Biome / DDL / tenant isolation / connection isolation は全 pass
- monorepo: 63 test files / **768 tests pass**、全 workspace typecheck / Biome / Next.js build / OpenNext Worker build は pass
- Worker bundle: gzip **0.997 MiB / 3.000 MiB**
- CI deploy job: 7 個の shell block が `bash -n` と ShellCheck を pass
- dev-graph schema: `valid: true`、文書行数ゲート: 359 文書を検査して pass

この時点の `validate-system-plan.py` は §8 F-6 の 27 violations が残っており、green として扱っていない (解消は §15)。

## 13. main 取り込み後の残課題対応

2026-07-25、既存の未コミット変更を stash へ退避して `origin/main` を `47052fb` → `8c179ab` → `ec0f3e4` (PR #63 auth-tenancy まで) へ 2 回 fast-forward し、各回で退避内容を復元した。`.dev-graph/state/graph.json` の競合は最新 main revision 532 / 285 nodes を基点に C02 writer で本作業の 2 issue node だけを再投入し、revision 534 / 287 nodes とした。直接 JSON merge はしていない。退避 stash は未コミット変更の回復用安全網として保持する。

- `HarnessHub-0yvi`: runbook / migration note / CLI コメントを実行可能な `pnpm exec tsx` 形式へ同期。一時 DB の migration → export → restore が exit 0、DB 65 tests pass を確認し close
- restore drill 追補: 本番 SQL dump を新 Turso へ直接 restore して 18 table / 12 index、続けて JSONL semantic round-trip を確認。成功表示でも 0 table だった `turso db create --from-dump` は runbook から排除
- `HarnessHub-fnzl`: GitHub repository secrets 4 件を値非表示で登録。DB 接続 token と Turso Platform API token を用途別に分離し、backup workflow は R2 S3 key 方式をやめて既存 Cloudflare API token + Wrangler 4.113.0 へ統一
- R2 転送検証: `harness-hub-backups/manual-smoke/` の使い捨て object で put → get → byte 一致 → delete を完走
- workflow 検証: `backup.yml` / `ci.yml` の YAML parse、全 30 run block の `bash -n` + ShellCheck が pass
- dev-graph schema / artifact placement / doc line limit は pass。`lint-open-residue` の 50 件は main 取り込み後から存在する他 feature を含む全域残置で、本 task の 2 issue node は整合済み
- 未実施: 未 push workflow の GitHub Actions dispatch (push 後に実走可能となる)

## 14. 仕様・設計への反映 (spec impact = reflected)

P13 の実装は、確定済み仕様が前提としていた運用手順を 3 点で**上書き**した。文書側を実装に合わせず放置すると、次に runbook を読む人が動かない手順を実行することになるため、正規フロー (詳細正本 → 上位設計へ差分追記) で反映した。

| # | 実装で確定した内容 | 旧記述 | 反映先 |
| --- | --- | --- | --- |
| 1 | backup の R2 upload は `wrangler r2 object put --remote` + 再 download `cmp` | 「R2 へ S3 API で upload」 / ContentLength 比較 | `docs/infrastructure-spec.md` §7 (`backup.yml` 行 + 経路確定の根拠) |
| 2 | R2 専用アクセスキーを発行しない。deploy step は migrate → deploy → health → **smoke 6 項目** → 条件付き rollback | secret 台帳に「R2 アクセスキー (backup 専用)」/ deploy 記述に smoke と rollback 条件が無い | `docs/infrastructure-spec.md` §7 (secret 台帳を表形式へ)・`docs/security-spec.md` §4.5 |
| 3 | dump restore の正本は `turso db shell <db> < dump.sql`。drill は SQL dump 復元 + JSONL semantic round-trip の 2 段 | RTO 手順が「dump restore」のみ / drill が形式を特定していない | `docs/infrastructure-spec.md` §10 |

上位設計 (`architecture/harness-hub-infrastructure.md` の *Delivery, migration and rollback* / *Risks and verification*、`specs/harness-hub-system-specification.md` の *互換性・移行・リリース* / *テストと受入条件*) へは、全書換を避けて**差分追記**のみを行った (要件 C18/C19)。

**`system-spec/spec-state.json` は変更していない。** `qa_log` はユーザー確認済み Q&A の記録であり、qa-071【9】が「確定済み qa entry を AI が単独で書き換えること」を禁じている。本反映は確定済み qa (qa-011 / qa-019 / qa-038【5】) の**実装手順レベルの具体化**であって決定の変更ではないため、詳細正本 `docs/*-spec.md` への反映で足り、新規 qa entry の捏造は行わない。R2 キー削除も §4.5 が既に「Workers binding 利用時は不要」と確定した範囲内。

**未達として持ち越す設計差**: `CLOUDFLARE_API_TOKEN` の 1 本共用 (F-8)。`issue-ci-token-least-privilege-20260725` (**HarnessHub-bda4**) で追跡し、infrastructure-spec §7 の残存リスク節にも明記した。

## 15. 最終レビューと main 取り込み後の再検証 (2026-07-25)

commit 前の最終レビューとして、`origin/main` (`9e39e96`) を本ブランチへ取り込んだ上で全ゲートを再実行した。

| ゲート | 結果 |
| --- | --- |
| `validate-system-plan.py` (feat-domain-model-db) | **pass / violations: []** — F-6 が main 取り込みで解消 |
| `@harness-hub/db` テスト | **13 files / 65 tests pass** (21.2s) |
| `validate-graph-schema.py` | `valid: true` / `violations: []` |
| `validate-source-digest.py` (本 task の 3 issue node) | `checked: 3` / `registered_mismatch: []` |
| `lint-doc-line-limit.py` | 362 文書 pass (上限 300 行) |
| `lint-artifact-placement.py` | pass |

**最終レビューで見つけて直した実欠陥 1 件**: `packages/db/__tests__/backup-restore.test.ts` の P13 新規 2 test に vitest の明示 timeout が無く、既定 5s のまま `tsx` 子プロセスを最大 3 回起動していた。実装が正しくても timeout で赤くなる = 「落ちたら再実行」を招いてゲートの信頼性を失う構造だったため、同ファイルの既存規約に合わせて 120s / 60s を明示した。**§12 の「65 tests pass」はこの修正後に成立した主張である。**

**graph.json の競合解決**: main 側 (`revision 545` / 293 node) を採用し、本 task の 3 issue node のみを C02 writer (`upsert-node.py`) で再投入して `revision 548` / 296 node とした。JSON を直接 merge していない。
