---
status: confirmed
layer: feature-operations
task: SYS-PUBLISH-PIPELINE-P13
parent_feature: feat-publish-pipeline
feature_package_id: feature-package/feat-publish-pipeline
source: docs/features/feat-publish-pipeline/runbook.md
feature_context_digest: sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security]
---

# feat-publish-pipeline リリース記録

> **位置づけ**: P13 の本番デプロイと full smoke test の実測記録。
> 記録日時は 2026-07-30、対象は Cloudflare Worker `harness-hub` と
> Turso `harness-hub-prod`、R2 `harness-hub-packages`。

## 0. 結論

本番 Worker version `62e543cf-3c39-4bb7-a0ff-9314ea159982` を 100% 配信し、
S1〜S6、TargetChannel 直列化の 409、R2 content-addressed storage をすべて実測で確認した。
続く system-plan v1.2 移行では、同じ検査を環境変数だけで再実行できる
`smoke:publish-production` を追加し、12 API 操作と必須監査 action 9 種まで
fail-closed に確認する契約を固定した。

- `/health`: 200 / `status: ok`
- dependency: `runtime-config` / `db` / `r2` がすべて `ok`
- full smoke: S1〜S6 がすべて pass
- audit hash chain: 21 events / errors 0
- 最終 stable: v2 (`01KYS683KD4F94WAJQVJVYG85Z`)

本記録の `confirmed` は本番実行結果を表す。Beads の完了条件
`linked_pr_merged_all` と default branch reconciliation は、landing 用 draft PR の
merge 後にだけ確定する。
したがって `HarnessHub-dfm.13` 自体は `in_progress` のまま維持する。

## 1. 前提とデプロイ

2026-07-30 の最終確認時に `origin/main`
`02947ebc7532c099da636a88f936874371b326f6` を fetch し、現在の作業ブランチへ
未 commit の merge として競合なく統合した。作業中に main が進んだため、
先に統合した `bcca528c` からの増分も 3-way 適用し、`MERGE_HEAD` を最終
`origin/main` と一致させた。既存の未コミット変更は退避・復元し、対象外の変更は
編集していない。

OIDC 本番試験と Project 所有者認可契約の前提解消後、Publisher Device Flow で
`publish:write` の短命 Bearer token を発行した。最初の本番要求で、Next.js
middleware が session cookie だけを認証し、Bearer を route 到達前に 401 で遮断する
統合不備を検出した。

同じ JWT 署名・claims・期限検証を middleware でも使用し、次の二段認可を維持した。

1. middleware: Bearer の署名、期限、tenant、workspace を検証
2. route `withAuthz`: scope、Project 所有者、credential 種別、失効を最終判定

無効な Bearer から有効な cookie へ fallback しない fail-closed も回帰テストへ追加した。

| 項目 | 実測 |
|---|---|
| 配信 Worker | `harness-hub` |
| 新 version | `62e543cf-3c39-4bb7-a0ff-9314ea159982` |
| 配信率 | 100% |
| 直前 version | `1dcf969f-967b-4e2c-8e30-8bdd1a6abda4` |
| Worker startup | 31 ms |
| gzip bundle | 1.227 MiB / 3.000 MiB |
| client 最大 | `/sheets/new` 116.3 KiB / 120.0 KiB |

## 2. 品質ゲート

| ゲート | 結果 |
|---|---|
| Hub full test | 68 files / 842 passed |
| middleware・認可・publish 回帰 | 4 files / 98 passed |
| inspection test | 9 files / 151 passed |
| DB test | 30 files / 231 passed |
| schemas test | 6 files / 86 passed |
| Hub typecheck | exit 0 |
| Biome | 423 files / error 0 |
| single authz middleware | 211 files / violation 0 / route exemption 5 |
| 境界・tenant・重複・secret scan | すべて pass |
| publish pipeline 回帰 | 10 files / 205 passed |
| production smoke entrypoint 契約 | 1 file / 2 passed |
| current system plan v1.2 | digest `845b61b2…cdd4d` / contract 1.2.0 / violations 0 / 独立評価 C1〜C4 pass |
| dev-graph test | 721 passed / 2 skipped / 5 subtests passed |
| OpenNext Worker build | pass |
| Wrangler upload / deploy | pass |

## 3. full smoke test

使い捨て Project `01KYRWS7NYAAGCQ5HFTXBHG57Y` と TargetChannel
`01KYS63R18N639P9XG13WCB184` を使用した。

| # | 項目 | 実測結果 | 判定 |
|---|---|---|:--:|
| S1 | PublishRequest 作成 | 201 / `draft` / `01KYS63R26Z4583QGK5YEJVM0C` | pass |
| S2 | Green ZIP upload・検査 | 200 / 483 bytes / `verdict: green` / findings 0 | pass |
| S3 | Secret 入り ZIP | 422 / `secret-scan/aws-access-key-id` / submit 後 `needs_fix` / Release なし | pass |
| S4 | Green 自動公開 | v1 と v2 が `published`、Release v1 / v2 を生成 | pass |
| S5 | rollback / promote | v2→v1、続けて v1→v2。stable が各指定 Release と一致 | pass |
| S6 | 監査 hash chain | 21 events を共通検証器で再計算 / `ok: true` / errors 0 | pass |

S3 の時点では stable が v1
`01KYS65RKQYP6N687JA9ADC2M8` のままであることを DB から確認した。
Red request を Publisher owner が cancel した後に v2 を公開した。

S1〜S6 の監査 action は次を含む。

- `publish.request`
- `publish.package_upload`
- `publish.submit`
- `publish.approve`
- `publish.cancel`
- `channel.rollback`
- `channel.promote`

### 3.1 system-plan v1.2 移行後の再実行契約

本番実測後、`apps/hub/scripts/smoke-production-publish.ts` と
`smoke:publish-production` package script を追加した。runner は上記 S1〜S6 に加え、
次の12 API 操作を実際に呼び出す。

- Bearer 対応 10 操作: publish 作成・一覧・詳細、package upload、submit、cancel、
  rollback、promote、suspend、deployment 登録
- session 専用 2 操作: approve と Project release 一覧を Bearer で呼び、
  `credential_not_allowed` 403 になること

さらに S3 では旧 stable v1、Release 非生成、package registry 非登録を個別に検査し、
S6 では既存7 action に `release.suspend` と `deployment.register` を加えた
必須9 action を fail-closed に検査する。entrypoint の静的契約テスト2件、
publish pipeline 回帰204件、型検査、Biome、secret/auth/boundary gate はすべて pass。

本番実測に使った短命 access/refresh token は後処理で失効し、現環境からも削除済みである。
そのため、この v1.2 移行では新 runner の**本番再実行はしていない**。本節は既存の
S1〜S6本番実測を置き換える記録ではなく、次回の本番確認を同じ手順で12操作まで
自動再現する契約と、そのローカル検証結果を記録する。

## 4. 追加受け入れ条件

### 4.1 TargetChannel 直列化

同一 channel に `ready` request を置いた状態で Green request を submit し、
409 / `channel_busy` を確認した。競合 request を owner Bearer で cancel すると
submit が成功した。partial UNIQUE index と API エラー写像が本番でも機能している。

### 4.2 R2 content-addressed storage

| Release | content hash / R2 key | bytes | 結果 |
|---|---|---:|:--:|
| v1 | `packages/8eaeabd5…5a5963` | 483 | pass |
| v2 | `packages/42e66d08…4b9879` | 499 | pass |

R2 から両 object を再ダウンロードし、SHA-256 が API 応答と DB
`packages.content_hash` に完全一致することを確認した。各 hash は Release から 1 件ずつ
参照されている。Secret 入り ZIP の hash
`9ee5b9d3…888824c` は `packages` に 0 件であり、R2 registry へ登録されていない。

### 4.3 Smoke 資源の後処理

検証後、使い捨て Project を `archived` に変更した。Device Flow で発行した
`codex-p13-smoke` の refresh token は全て失効済みで、active 行は 0 件である。
ローカルの token 一時ファイルも削除した。Release、R2 object、監査 event は
検証証跡と参照整合性を保つため削除していない。

## 5. ロールバック

コード障害時は直前 version へ戻す。

```bash
cd apps/hub
pnpm exec wrangler versions deploy \
  1dcf969f-967b-4e2c-8e30-8bdd1a6abda4@100% \
  --config wrangler.jsonc --yes
```

直前 version は health の既知安定版だが、Bearer が middleware で遮断される既知不備を持つ。
そのため rollback 中は Publisher API を一時停止扱いにし、修正版の再デプロイを優先する。

Release 行と監査 event はロールバックしない。Release は不変、監査は append-only
（追記専用）であり、Worker の切り戻し後も履歴を保存する。

## 6. 残る完了収束

実装、品質ゲート、本番デプロイ、S1〜S6 は完了した。
残るのはリポジトリ上の完了条件だけである。

system-plan v1.2 移行 (`HarnessHub-mmk3`) は、digest
`845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d`
の昇格、現行参照からの violation 0、独立評価 pass まで完了した。
最新mainで追加された libSQL 接続復旧と dev-graph renderer 登録検証も
source lineage へ再固定し、publish pipeline の契約に意味変更がないことを照合した。

landing review で共有層 detector が production smoke の DB deep import を検出したため、
DB schema を apps/hub へ出さない `createPublishSmokeDbProbe` を追加した。fixture、
R2/Release/audit 証跡、cleanup を目的別 facade に閉じ、501 ファイルの再走査で
違反 0 件を確認した。本番 S1〜S6 の結果は変えず、次回再実行の境界だけを強化した。

2026-07-30 の landing 指示により、未コミット差分の隔離レビュー、
system-spec 正規反映、task package 品質ゲート再実行、Beads 更新後に
`devgraph/SYS-PUBLISH-PIPELINE-P13` から `main` 向け draft PR を作る。

PR 作成時点でも P01〜P13 と親 epic は `in_progress` を維持する。
残る完了収束は PR merge 後の default branch reconciliation であり、その時点で
P13 と親 epic を durable done へ更新する。
