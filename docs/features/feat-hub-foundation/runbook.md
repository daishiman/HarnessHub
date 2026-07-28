---
status: confirmed
layer: feature-design
task: SYS-HUB-FOUNDATION-P12
parent_feature: feat-hub-foundation
feature_package_id: feature-package/feat-hub-foundation
feature_context_digest: sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d
---

# Harness Hub 運用 runbook (P12)

> **前提**: 提供者 1 名 + AI 運用（C1）・固定費ゼロ（C2）。手順は「迷わず実行できる」ことを優先し、判断が要る箇所は判断基準を併記する。
> **注意**: 本 runbook は**手順**であり、未実装の仕組みを手順で代替しない（requirements-baseline §9.5）。未実装項目は §7 に明示する。

## 1. 初回セットアップ（**外部資源は適用済み・monitor 再開待ち**）

> **投入状況の正本は本文ではなく `node scripts/ci/check-actions-secrets.mjs --live` の出力**。散文で書いた一覧は書いた翌日には古くなるため、判断前に必ずコマンドを叩く（未投入・用途不明・台帳との食い違いを一度に出す）。

> **実施状況**: `HUB_PUBLIC_URL` は 2026-07-26 に既存 `HUB_HEALTH_URL` と同じ origin へ投入済み。**2026-07-28 に Better Stack 外部資源を適用し、`CRON_HEARTBEAT_URL` を Worker secret へ投入した**（monitor `4724920` / heartbeat `475650` / status page `256797` / resource `8978911`、適用時刻 `2026-07-27T20:46:37.686Z` UTC）。しかし、同日 `21:38:14Z` の公開 status page 再確認で個別 resource が `not_monitored`（Better Stack 公式仕様では underlying monitor が paused）と判明した。適用器は既存資源の設定差分を `PATCH` するよう是正済みであり、Uptime API token を渡して同じ適用コマンドを再実行し、resource が `operational` になった時点から 30 日観測を開始する。現在の `slo-dashboard.json` は `collection_blocked` であり、99.5% 達成を主張しない。証跡は [evidence/monitoring-applied.json](evidence/monitoring-applied.json) と [evidence/deploy-2026-07-25.json](evidence/deploy-2026-07-25.json)、経緯は [release-notes.md](release-notes.md)。なお、workflow から参照されなくなった `TURSO_API_TOKEN` / `TURSO_DATABASE_NAME` は **2026-07-28 に削除し、`--live` は exit 0 になった**（証跡は [evidence/actions-secrets-2026-07-28.json](evidence/actions-secrets-2026-07-28.json)）。同日その状態で日次 backup を実起動したところ、**secret とは別の原因**で失敗している（§7 U-1）。以下の手順は再構築時のために残す。

> **順序制約（重要）**: `wrangler secret put` は **Worker が存在しないと実行できない**ため、初回だけは「deploy → secret 投入」の順になり、その間 `/health` は 503 を返します。`ci.yml` の post-deploy `/health` チェックは 200 必須なので、**初回は CI に任せず手動 bootstrap を行ってください**（CI 側のチェックを緩めるとゲートが恒久的に甘くなるため、この方式を採ります）。
>
> **初回 bootstrap の順序**:
> 1. R2 バケット 2 本を作成（`harness-hub-packages` / `harness-hub-backups`）— 未作成だと `wrangler deploy` 自体が失敗する
> 2. 手動で `wrangler deploy`
> 3. `wrangler secret put` で secret を投入（下記）
> 4. `curl https://hub.<domain>/health` が 200 を返すことを確認
> 5. 外形監視（Better Stack）を有効化 — **ここで初めて SLO 計測を開始する**（4 より前に有効化すると初期の 503 が可用性へ算入される）
> 6. 以降は main merge による CI 自動デプロイに任せる


```bash
# 1. Cloudflare 認証
wrangler login

# 2. GitHub Secrets / Variables（CI の deploy job と日次 backup job が参照）
#    用途・必須/任意の正本は scripts/ci/actions-secrets-registry.json（ci.yml が workflow と突合する）
gh secret set CLOUDFLARE_API_TOKEN      # Workers deploy + R2 Storage 編集権限
gh secret set CLOUDFLARE_ACCOUNT_ID
gh secret set TURSO_DATABASE_URL        # migration / 本番 smoke / 日次 export 用
gh secret set TURSO_AUTH_TOKEN          # 同上の DB 接続 token（Platform API token とは別物）
gh secret set BACKUP_HEARTBEAT_URL      # 任意。未設定なら backup cron 失敗の外形監視なし
gh variable set HUB_HEALTH_URL --body "https://hub.<domain>/health"
gh variable set HUB_PUBLIC_URL --body "https://hub.<domain>"   # cwv.yml の計測対象

# 3. Worker secret（wrangler 経由。コード・DB に平文を置かない）
cd apps/hub
wrangler secret put TURSO_DATABASE_URL
wrangler secret put TURSO_AUTH_TOKEN
wrangler secret put AUTH_SECRET
wrangler secret put CRON_HEARTBEAT_URL   # Better Stack の heartbeat URL (未設定なら ping しない)
```

4. **Better Stack Free** の外形監視を適用する（**要求内容の正本は [`apps/hub/monitoring/better-stack.monitors.json`](../../../apps/hub/monitoring/better-stack.monitors.json)**。ダッシュボードで独自に値を決めない）

   登録内容は monitor（production `/health` を **3 分間隔**・SLO 99.5% の一次計測源）・heartbeat（日次バッチ完了 ping 用。period 86,400s / 猶予 3,600s）・status page（履歴 30 日。monitor を resource として関連付け）の 3 点。**画面から手で登録せず、正本ファイルを適用する script を使う**：

   ```bash
   # a. 何を送るかを先に確認する (ネットワークへは出ない)
   node apps/hub/scripts/apply-better-stack-monitoring.mjs --dry-run

   # b. 適用する。token は環境変数で渡す (引数は ps とシェル履歴に残る)
   #    --put-secret を付けると heartbeat URL を標準出力へ出さずに wrangler の stdin へ直接流す
   export BETTER_STACK_API_TOKEN=...   # 取得場所は下の注記を参照
   node apps/hub/scripts/apply-better-stack-monitoring.mjs \
     --put-secret \
     --json docs/features/feat-hub-foundation/evidence/monitoring-applied.json
   unset BETTER_STACK_API_TOKEN

   # c. 書き戻しと状態遷移を検証する
   pnpm --filter @harness-hub/hub test tests/monitoring
   ```

   - **token の取得場所**: Better Stack にログイン →左下のアカウントメニュー→ **API tokens** → **Team-based tokens** → 対象チームを選び **Uptime API tokens** セクションからコピー（無ければ新規作成）。**team 単位の Uptime API token を使うこと**。同じ画面にある **Global API token（全 team 横断）を使うと、作成 body に `team_name` が必須**になり、正本にその項目が無いため作成が失敗する（[公式手順](https://betterstack.com/docs/uptime/api/getting-started-with-uptime-api/)）。
   - token は可視 ASCII のみ。全角文字・改行・空白が混ざると script が**適用前に**落ちる（HTTP ヘッダへ載せると token の文字コードが例外メッセージへ出てしまうため、手前で塞いでいる）。コピー時に改行が付いていないか確認する。
   - script は既存資源を名前・URL・subdomain で同定し、monitor / heartbeat は正本との差分だけを `PATCH` してから不足分だけを作るため、**再実行しても二重登録にならず、paused のような dashboard 側 drift も正本へ戻る**。中断したら同じコマンドをそのまま流し直す。
   - 適用に成功すると設定ファイルへ `external_id` / `applied_at` が書き戻り `application_state` が `applied` になり、`slo-dashboard.json` の `verdict` が `collecting`（`observation_started_at` と `first_monthly_verdict_due_at` 付き）へ進む。**書き戻るまで SLO は「計測開始前」として扱う**。
   - heartbeat URL は secret。script は標準出力・設定ファイル・エラーメッセージのいずれにも出さない。`--put-secret` を使わず手で入れる場合は `cd apps/hub && wrangler secret put CRON_HEARTBEAT_URL` で標準入力から渡す。
   - 書き戻しは JSON を丸ごと再出力する（2 space インデント）。差分が状態遷移分だけになるよう正本側の数値表記は正規化済み（例: `1.0` ではなく `1`）。適用後の差分に状態以外の行が出たら、それは正本の書式が崩れた合図なので取り込む前に確認する。
   - **API フィールド名は 2026-07-26 に公式ドキュメント（`create-a-new-monitor` / `create-a-hearbeat` / `create-a-new-status-page` / `create-a-new-status-page-resource`）へ照合済み**。422 が出た場合は Better Stack 側の仕様変更なので、**ダッシュボードではなく設定ファイルを直して**再適用する。
   - **403 `Cannot modify status page advanced settings` はプラン制限**であり、フィールド名の誤りではない。Free プランでは status page の advanced settings 群（`automatic_reports` / `subscribable` / `hide_from_search_engines` など）は**既定値と同じ値でも送信自体が拒否される**（2026-07-26 実測）。該当フィールドは正本の payload から外し、理由を `$comment_omitted_fields` に残してある。有料プランへ上げたときに復活を検討する。
   - **途中で失敗した場合、作成済みの資源は Better Stack 側に残るが設定ファイルへは書き戻らない**（`applyMonitoring` は 4 資源すべての成功を条件に書き戻すため）。この「リモートには在るのにファイルは `pending_credentials`」という状態は正常な中間状態で、同じコマンドを流し直せば既存分は `reused` として拾い直される。

> secret / binding の**内容正本**は [docs/infrastructure-spec.md](../../infrastructure-spec.md) §2。本 runbook は手順のみを持つ。

## 2. 通常デプロイ

main への merge で `ci.yml` が全自動実行する（qa-034）。手動 gate は置かない。

```
静的ゲート(G1 pnpm混入 / G10 duplicate) → install → G2 lint → G3 typecheck
  → build → G4 test → G6 secret scan → G7 DDL → G8 drift → G9 axe
  → Worker 成果物生成 → G5 bundle 予算 → deploy → post-deploy /health 確認
```

- **deploy は全ゲート通過後にのみ実行される**。1 つでも落ちれば deploy は走らない。
- ローカルで同じ検査を再現する: `pnpm verify`

## 3. ロールバック

```bash
cd apps/hub
wrangler deployments list          # 直近の version を確認
wrangler rollback [<version-id>]   # 直前 version へ戻す
curl -s https://hub.<domain>/health | jq .   # 復旧確認
```

**判断基準**: post-deploy `/health` が 200 以外、または `status` が `ok` 以外を返したら**即ロールバック**。原因究明はロールバック後に行う。

## 4. 障害対応

| 症状 | 一次切り分け | 対応 |
|---|---|---|
| `/health` が 503 | 応答 body の `db` / `r2` を見る | Turso 障害 → 縮退バナー表示。R2 障害 → publish/install を一時停止表示（infrastructure-spec §10 の縮退マトリクス） |
| 応答は 200 だが機能不全 | Workers analytics の 5xx 率 | エラーバジェット算定に 5xx も含まれる。原因の Worker version を特定しロールバック |
| cron が動かない | heartbeat 未達アラート | scheduled handler のログを確認。ジョブ単位 try/catch のため 1 ジョブ失敗でも後続は継続する |
| **cron の登録に失敗する** | `wrangler` は「A request to the Cloudflare API failed.」としか出さないので、**Cloudflare API を直接叩いてエラーコードを取る**（下記 §4.1） | コード `10072` なら**アカウント全体の cron 枠が上限 5 本に達している**。他 Worker の cron を減らす。詳細は [docs/infrastructure-spec.md](../../infrastructure-spec.md) §5 |
| デプロイ失敗 | Actions のログ | ゲートで落ちたなら是正して再 push。deploy 中失敗なら §3 |

### 4.1 cron 枠の確認と操作（2026-07-25 の実障害から）

**上限 5 本は Worker 単位ではなくアカウント単位である。** 本 Worker の cron を減らしても、他プロジェクトが枠を埋めていれば登録できない。

```bash
# 現在の登録内容を確認（Worker ごとに実行）
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/<script>/schedules"

# 更新は宣言的。残したい cron を配列で丸ごと送る（個別 DELETE は存在しない）
curl -s -X PUT -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/<script>/schedules" \
  --data '[{"cron":"0 15 * * *"}]'
```

- **枠を空ける前に、削除する cron の内容を控える。** 配列を丸ごと置き換える方式のため、送信内容が新しい全量になる。復元用ペイロードは [evidence/deploy-2026-07-25.json](evidence/deploy-2026-07-25.json) の `cron_triggers.prior_failure.restore_payloads` に保全してある。
- Hub の現在の使用数は **2 / 5**（`0 15 * * *` / `0 0 * * 1`）。新規 cron を足す前に、アカウント全体の残枠を数えること。

### 4.2 CI デプロイ運用の注意（同上）

- **古い run の再実行は本番を巻き戻しうる。** `concurrency` グループは `github.ref` 単位で新規 run を直列化するが、**過去 run の再実行はその制御外**にある。失敗 run を再実行するときは、それが main の最新 sha であることを確認する。
- **GitHub Actions は未設定の secret / variable をエラーではなく空文字として渡す。** 設定漏れは「認証情報が無い」ではなく「認証に失敗した」形で deploy 途中に現れ、切り分けが遅れる。必要な値は `.github/workflows/ci.yml` 冒頭のコメントに列挙してある。
- **GitHub Secrets の値は登録後に読み出せない**（API も Web 画面も名前と更新日時のみ返す）。登録時に原本をパスワードマネージャへ保存する。
- **デプロイ直後の `/health` は 1 つ前の版を返しうる。** エッジへの伝播に時間差があるため、`version` フィールドで版を確認するときは数十秒おいて再取得する。

## 5. エラーバジェット運用（qa-019）

- SLO: **可用性 99.5%/月**（許容停止 約 3.6 時間/月）
- 算定: **外形監視の downtime + Workers analytics の 5xx 率**（外形監視単独を正としない）
- **消費 70%**: 警告。信頼性作業を優先度に入れる
- **消費 100%**: **新規公開機能の変更を凍結**し、信頼性回復を最優先にする
- ユーザー影響のある障害は blame-free ポストモーテムを issue 化し、再発防止を自動化候補へ接続する

## 6. バックアップと restore drill（RPO ≤ 24h / RTO ≤ 4h）

**手順**:
1. [domain-model DB runbook §2](../feat-domain-model-db/runbook.md#2-四半期-restore-drill-qa-019-復元できないバックアップを成功と数えない) に従い、R2 の最新 JSONL export を使い捨ての一時 DB へ restore CLI で流し込む
2. restore report の `ok` / `chainOk` に加え、18 domain table / 12 explicit index を確認（行数一致・audit chain・暗号断面は CLI が内部で強制する）
3. 障害復旧時だけ Worker secret の URL/token を復元 DB へ差し替え
4. `/health` で確認

**四半期ごとの restore drill**: 一時 DB へ実際に restore し、**行数・整合検査まで実施する**。
**復元できないバックアップを成功と数えない**（qa-019）。

## 7. 未実装（手順で代替しないもの）

| # | 未実装 | 影響 | 必要な作業 |
|---|---|---|---|
| U-1 | ~~backup workflow 未実装~~ → 実装済み (`.github/workflows/backup.yml`)。ただし**初回成功はまだ取れていない** | R2 に成果物が 1 つも無く、RPO ≤ 24h を実際には満たしていない | 2026-07-28 の実起動 (run 30321679596) と直前 2 回の cron はいずれも export step で失敗していた。原因は secret ではなく「データ行が 0 なら不採用」という判定で、稼働直後の本番 DB は 19 テーブルすべて 0 行のため恒常的に落ちていた。判定を `verify-export-artifact` CLI へ一本化して是正済み。**main へ land 後に workflow_dispatch で再実行し、`db-export/<year>/<stamp>.jsonl.gz` を確認すること** |
| ~~U-2~~ | ~~scheduled handler 未実装~~ → **実装済み** (`apps/hub/src/worker.ts` + `src/worker/cron.ts`) | ジョブ本体は空 (id は登録済み)。各ドメイン feature が中身を実装する | — |
| ~~U-3~~ | ~~G6 / G8 未配線~~ → **配線済み**。実効性も実測 | — | — |
| U-4 | 未 wrap route の静的検出 | 認可 fail-open のリスクが残る | detector 拡張 |

> **これらは「運用手順があるから大丈夫」ではない。** 実装されるまでは、対応する運用は成立していない。
