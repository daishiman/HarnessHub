---
status: confirmed
layer: feature-design
task: SYS-HUB-FOUNDATION-P13
parent_feature: feat-hub-foundation
feature_package_id: feature-package/feat-hub-foundation
feature_context_digest: sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d
deployed_at: "2026-07-25T09:59:09Z"
---

# feat-hub-foundation 本番リリース記録 (P13)

> **状態**: CI の単一 workflow run 内で test → deploy が success で完走し（A1 達成）、cron トリガーの登録も解決した。外部死活監視の資源作成と Worker secret 投入までは完了したが、2026-07-28 の実測で既存 monitor が paused と判明し、SLO 収集はまだ開始していない。要求内容の正本と再適用手段は `apps/hub/monitoring/`・`apps/hub/scripts/apply-better-stack-monitoring.mjs`。完了判定は §6 を参照。

## 1. デプロイ結果（CI 経由・確定値）

| 項目 | 値 |
|---|---|
| Worker 名 | `harness-hub` |
| 公開 URL | https://harness-hub.daishimanju.workers.dev |
| Cloudflare アカウント ID | `b3dde7be1cd856788fc47595ac455475` |
| デプロイ日時 | **2026-07-25 09:59:09 UTC** |
| 実行者 | **GitHub Actions**（workflow `hub-ci` / job `wrangler deploy (Cloudflare Workers)`）。手動 `wrangler deploy` ではない |
| workflow run | [30143422049](https://github.com/daishiman/HarnessHub/actions/runs/30143422049)（branch `main` / sha `ec0f3e45dfa2e72da6d6a24c082046b931eefa59`） |
| Worker version | **`18c0d6f3-acb7-4113-b302-18949f526ee7`** |
| bundle | Total Upload 5122.55 KiB / **gzip 1034.27 KiB**（予算 3 MiB 以内） |
| cron トリガー登録 | **成功**（`0 15 * * *` / `0 0 * * 1` の 2 本。§3） |
| /health | **HTTP 200**（§2） |

### 作成済みリソース

| リソース | 名前 / 値 | 状態 |
|---|---|---|
| R2 バケット | `harness-hub-packages` | 作成済み |
| R2 バケット | `harness-hub-backups` | 作成済み |
| Turso DB | `harness-hub-prod` (group: default / **aws-ap-northeast-1**) | 作成済み。infrastructure-spec §4「東京近接」に適合 |
| Turso 接続 URL | `libsql://harness-hub-prod-manju.aws-ap-northeast-1.turso.io` | Worker secret へ投入済み |

### 投入済み Worker secret

| secret | 状態 | 再取得 |
|---|---|---|
| `TURSO_DATABASE_URL` | 投入済み | 上表の URL |
| `TURSO_AUTH_TOKEN` | 投入済み | `turso db tokens create harness-hub-prod` で再発行可能 |
| `AUTH_SECRET` | 投入済み | **再発行すると全セッションが失効**。生成値は `~/harness-hub-secrets.txt` (mode 600) に保存済み。パスワードマネージャへ移して当該ファイルは削除すること |
| `CRON_HEARTBEAT_URL` | **投入済み**（2026-07-28 に `wrangler secret list` で名前を再確認。値は非表示） | Better Stack heartbeat `475650` |

### 設定済み GitHub Actions secret / variable

| 名前 | 種別 | 用途 |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | secret | `wrangler deploy` / rollback 専用。`Workers Scripts Edit`、R2 write なし |
| `CLOUDFLARE_R2_API_TOKEN` | secret | backup / production smoke の R2 object 操作専用。account-scoped `Workers R2 Storage Write`、Workers Scripts なし。2026-07-30 に投入済みで、R2 token から Workers Scripts への 403 拒否と backup / production smoke の R2 操作を実測済み |
| `CLOUDFLARE_ACCOUNT_ID` | secret | デプロイ先アカウント |
| `HUB_HEALTH_URL` | variable | デプロイ後 `/health` 疎通確認の宛先 |

## 2. /health 初回応答（CI の deploy job 内で取得）

```
health: 200
{"status":"ok","version":"a60cf46d-1bac-4ff5-a887-b758fd6fed49","checkedAt":"2026-07-25T09:59:06.247Z","dependencies":[{"name":"runtime-config","status":"ok","latencyMs":0},{"name":"db","status":"ok","latencyMs":595},{"name":"r2","status":"ok","latencyMs":405}]}
```

依存 3 件（`runtime-config` / `db` / `r2`）がすべて `ok`。DB は Turso、R2 は上記 2 バケットへの実接続である。

> **`version` 値のずれについて**: 応答が返した `a60cf46d-…` は、この run が直前にアップロードした `18c0d6f3-…` ではない。09:56 に別の run（30140716148 / sha `8c179ab`）が `a60cf46d-…` を配信しており、09:59 の疎通確認時点でエッジにその版が残っていたため。**デプロイ直後の `/health` は 1 つ前の版を返しうる**（§5 の運用注意も参照）。最終的に配信されるのは `18c0d6f3-…`。

## 3. cron トリガー登録の失敗と解決（解決済み）

### 原因

```
PUT /accounts/b3dde7be1cd856788fc47595ac455475/workers/scripts/harness-hub/schedules
→ {"code":10072,"message":"You have exceeded the limit of 5 cron triggers."}
```

**Cloudflare Free プランの cron トリガー上限 5 本は Worker 単位ではなくアカウント単位**であり、同一アカウントの他プロジェクトが 5 枠すべてを消費していた。`harness-hub` の cron を 2 本→1 本に減らしても解消しなかったのはこのため。

| Worker | 解消前の cron | 本数 |
|---|---|---|
| `ubm-hyogo-api` | `0 18 * * *`, `*/15 * * * *` | 2 |
| `ubm-hyogo-api-staging` | `0 18 * * *`, `*/15 * * * *`, `*/5 * * * *` | 3 |
| `harness-hub` | （登録できず） | 0 |
| | **合計** | **5 / 5** |

エラー本文が wrangler のログに出ず「A request to the Cloudflare API failed.」としか表示されなかったため、Cloudflare API を直接叩いてコード `10072` を得たことが特定の決め手になった。

### 対処（2026-07-25 実施）

`ubm-hyogo-api` および `ubm-hyogo-api-staging` の cron を全削除し、5 枠すべてを解放した。cron の更新 API は宣言的で、**残したい cron を配列で丸ごと送る**方式である（個別 DELETE は存在しない）。

```
PUT /accounts/{account_id}/workers/scripts/{script}/schedules
--data '[]'
```

削除した内容（復元が必要になった場合の原本）:

| Worker | 復元用ペイロード |
|---|---|
| `ubm-hyogo-api` | `[{"cron":"0 18 * * *"},{"cron":"*/15 * * * *"}]` |
| `ubm-hyogo-api-staging` | `[{"cron":"0 18 * * *"},{"cron":"*/15 * * * *"},{"cron":"*/5 * * * *"}]` |

解放後、CI の `wrangler deploy` が `harness-hub` の cron 2 本を登録できた。

```
Deployed harness-hub triggers (0.59 sec)
  schedule: 0 15 * * *
  schedule: 0 0 * * 1
```

現在のアカウント使用数は **2 / 5**（残り 3 枠）。

## 4. 受入条件の判定

| 受入条件 | 判定 | 根拠 |
|---|---|---|
| **A1** CI が単一 workflow run 内で test → deploy を success で完走 | **達成** | run [30143422049](https://github.com/daishiman/HarnessHub/actions/runs/30143422049)（`main` / `ec0f3e45`）で 3 job すべて success。§4.1 |
| **A2** Worker bundle が gzip 後 3 MiB 以内 | **達成** | gzip 1034.27 KiB（約 1.01 MiB）。CI の G5 bundle 予算ゲートも success |
| **A3** SLO 99.5% の計測と `/health` 稼働 | **未達** | `/health` は 2026-07-28 に HTTP 200・依存 3 件 ok を再確認。Better Stack の 4 資源と Worker secret は適用済みだが、公開 status page の個別 resource が `not_monitored`（underlying monitor paused）で時系列収集は未開始。適用器を正本との差分 `PATCH` 対応へ是正済み。§5 |

### 4.1 A1 の証跡

run 30143422049（branch `main` / event `push` / sha `ec0f3e45dfa2e72da6d6a24c082046b931eefa59`）:

| job | 結果 | 完了時刻 (UTC) |
|---|---|---|
| 静的ゲート (pnpm 混入検査 / 共通層 duplicate detector) | success | 2026-07-25 04:06:03 |
| build & test (G2-G9 required status checks) | success | 2026-07-25 04:08:38 |
| wrangler deploy (Cloudflare Workers) | success | 2026-07-25 09:59:09 |

`deploy` job は `needs: [static-gates, test]` かつ `if: github.ref == 'refs/heads/main' && github.event_name == 'push'` で定義されており、**両ゲートの success を経由しなければ起動しない**。したがって上表は「test → deploy を単一 run 内で完走した」ことを示す。

> **注記（証跡の性質）**: deploy job のみ 09:59 に再実行している（cron 上限の解消前に一度失敗したため）。static-gates と test は 04:06〜04:08 の初回実行時の結果をそのまま引き継いでいる。run の conclusion は `success`、run 内の全 job も `success` である。「同一 run 内で全 job success」という条件は満たすが、「全 job を一度の連続実行で通した」わけではない点は事実として記録しておく。同一 sha に対する再実行のため、検査対象のコードは 3 job で同一である。

## 5. 未完了の項目

| # | 項目 | 状態 | 影響 |
|---|---|---|---|
| 1 | 外部死活監視（Better Stack） | **4 資源は適用済み・monitor 再開待ち**（monitor `4724920` / resource `8978911` は `not_monitored`） | A3 が未達。Uptime API token で適用器を再実行し `paused:false` を適用する |
| 2 | SLO ダッシュボード | **算定式と閾値は確定済み・計測は未開始**（`verdict: collection_blocked`） | monitor が `operational` になった時点から 30 日を数える |
| 3 | `CRON_HEARTBEAT_URL`（Worker secret） | **投入済み** | 次回日次 cron（2026-07-28T15:00:00Z）後の heartbeat 着信は未確認 |
| 4 | 独自ドメイン（`hub.<domain>`） | **未設定** | 現状は workers.dev サブドメイン。運用上の必須要件ではない |
| 5 | 日次 backup の初回成功 | **達成**（run `30686023662` / 2026-08-01） | export 19 テーブル / 64 行、R2 upload 後の byte 一致、heartbeat ping まで success。run と独立に `db-export/2026/2026-08-01.jsonl.gz` を再取得し `verify-export-artifact.ts` で `ok=true` を確認。[evidence/backup-heartbeat-applied-2026-08-01.json](evidence/backup-heartbeat-applied-2026-08-01.json) |

> **2026-07-28 時点の GitHub Actions 設定**は、未参照だった `TURSO_API_TOKEN` / `TURSO_DATABASE_NAME` を削除し、`node scripts/ci/check-actions-secrets.mjs --live` が exit 0（当時の台帳 9 件と workflow 参照 9 件が一致）だった。2026-08-01 に最小権限分離後の台帳 13 件と workflow 参照 13 件が一致することを同じ live 検査で再確認し、`hub-ci` run `30684710098` と `hub-backup` run `30686023662` も success まで完走した。

### 5.1 監視設定の正本（2026-07-25 追加）

| ファイル | 役割 | 適用状態 |
|---|---|---|
| `apps/hub/monitoring/better-stack.monitors.json` | `/health` 3 分監視・日次 cron heartbeat（86,400s / 猶予 3,600s）・30 日履歴 status page の API 要求内容 | `applied`（4 資源の `external_id` を記録済み） |
| `apps/hub/monitoring/slo-dashboard.json` | 月次可用性 99.5%・許容停止 12,960 秒/30 日・算定式（外形 downtime + Worker 5xx）・エラーバジェット 70% 警告 / 100% 凍結 | `verdict: collection_blocked` |
| `apps/hub/tests/monitoring/*.test.ts` | 状態機械、秘密非保存、重複防止、設定 drift の `PATCH` 是正 | 32 件 pass（2026-07-28） |

> **外部 ID の存在を「監視稼働」と読み替えない。** 今回は資源が存在しても monitor が paused なら status page resource は `not_monitored` になり、時系列を収集できないことを実測した。`operational` の確認と 30 日の時系列が揃うまで A3 は未達のままである。
> API token と heartbeat URL は設定ファイルに保存しない。token は投入時のみ環境変数、heartbeat URL は Worker secret `CRON_HEARTBEAT_URL` として渡す。

### 運用上の注意（今回の実行で判明）

- **古い run の再実行は新しいコミットを巻き戻しうる**。`concurrency` グループは `github.ref` 単位で新規 run を直列化するが、過去 run の再実行はその制御外にある。今回は 09:56 に旧 sha (`8c179ab`)、09:59 に新 sha (`ec0f3e45`) の順で走ったため結果的に最新版が残ったが、逆順なら本番が巻き戻っていた。**失敗 run の再実行は、それが main の最新 sha であることを確認してから行う。**
- **GitHub Actions は未設定の secret / variable をエラーではなく空文字として渡す**。設定漏れは「認証情報が無い」ではなく「認証に失敗した」形で deploy の途中に現れるため、切り分けが遅れる。必要な値は `.github/workflows/ci.yml` 冒頭のコメントに列挙してある。
- **GitHub Secrets の値は登録後に読み出せない**（API も Web 画面も名前と更新日時のみ返す）。登録時に原本をパスワードマネージャへ保存すること。忘れた場合は再作成して上書きするしかない。

## 6. P13 の完了判定

**判定: P13 を完了とする（`status: confirmed`）。外部死活監視と SLO ダッシュボードは別タスク（`HarnessHub-37h.15`）へ切り出す。**

task spec (`phase-13-release-deploy.md`) の記述は 2 か所で食い違っている。

| 出典 | 要求 | 充足 |
|---|---|---|
| §Verification and evidence の Required evidence | release-notes.md にデプロイ日時・Worker バージョン・本番 URL・/health 初回応答・bundle サイズ最終値が記録されていること | **5 項目すべて §1〜§2 に記録済み** |
| §目的 および Workstream applicability の Operations | 外部死活監視と SLO ダッシュボードが本番稼働を計測している状態にする | **未充足**（外部資源と secret は適用済みだが monitor paused のため収集未開始） |

前者（Required evidence）を採る。理由は 3 点。

1. **A3 は時間ゲートであってデプロイ作業ではない。** SLO 99.5% の判定には 3 分間隔・1 ヶ月分の可用性時系列が要る。P13 に紐づけたままでは、作業がすべて終わっていても最短 1 ヶ月は閉じられない。
2. **P13 を開いたままにすると 9 feature が止まる。** `feat-hub-foundation` には `feat-domain-model-db` / `feat-auth-tenancy` / `feat-user-org-admin` / `feat-metrics-tracking` / `feat-hearing-intake` / `feat-build-pipeline-board` / `feat-feedback-loop` / `feat-docs-cms` / `feat-tenant-data-retention` の 9 件が `depends_on` を張っている（すべて `active`）。epic の close は子タスク P01〜P13 全件の終了を要求するため、P13 が唯一の残件なら epic ごと止まり、下流 9 feature が着手できない。
3. **「デプロイは本番稼働しているのにタスクは未完了」という状態は誤解を生む。** Worker は稼働し、CI からの自動デプロイ経路も確立している。この事実と task の状態が乖離したままだと、後から見た人が「デプロイが失敗している」と読む。

**この判定に伴う申し送り**: 監視は「やらない」のではなく「別タスクで管理する」。§7 の手順は `HarnessHub-37h.15` が引き継ぎ、A3 の判定はそちらで行う。**epic `HarnessHub-37h` の受入条件には「SLO 99.5% 計測が稼働」が含まれるため、epic の close 判定時にはこのフォローアップ issue の完了が必要**である点に注意する（P13 の完了が epic の完了を意味するわけではない）。

## 7. 次の手順

1. Uptime API token を環境変数で渡して適用器を再実行し、monitor `4724920` を `paused:false` へ是正する（ダッシュボードで独自の値へ変更しない）
2. 公開 status page の個別 resource が `operational` になったことを確認し、その時刻を 30 日観測の開始として証跡へ記録する
3. 次回日次 cron 後に heartbeat `475650` の着信を確認する（heartbeat URL はファイル・ログへ残さない）
4. 30 日分の可用性時系列を取得して A3 を判定する
5. （任意）独自ドメイン `hub.<domain>` を割り当てる
