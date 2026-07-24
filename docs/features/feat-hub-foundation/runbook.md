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

## 1. 初回セットアップ（未実施。ユーザー作業）

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

# 2. GitHub Secrets / Variables（CI の deploy job が参照）
gh secret set CLOUDFLARE_API_TOKEN      # Workers deploy 権限
gh secret set CLOUDFLARE_ACCOUNT_ID
gh variable set HUB_HEALTH_URL --body "https://hub.<domain>/health"

# 3. Worker secret（wrangler 経由。コード・DB に平文を置かない）
cd apps/hub
wrangler secret put TURSO_DATABASE_URL
wrangler secret put TURSO_AUTH_TOKEN
wrangler secret put AUTH_SECRET
wrangler secret put CRON_HEARTBEAT_URL   # Better Stack の heartbeat URL (未設定なら ping しない)
```

4. **Better Stack Free** で以下を登録
   - production `/health` を **3 分間隔**で監視（SLO 99.5% の一次計測源）
   - cron heartbeat（日次バッチ完了 ping 用）

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
| デプロイ失敗 | Actions のログ | ゲートで落ちたなら是正して再 push。deploy 中失敗なら §3 |

## 5. エラーバジェット運用（qa-019）

- SLO: **可用性 99.5%/月**（許容停止 約 3.6 時間/月）
- 算定: **外形監視の downtime + Workers analytics の 5xx 率**（外形監視単独を正としない）
- **消費 70%**: 警告。信頼性作業を優先度に入れる
- **消費 100%**: **新規公開機能の変更を凍結**し、信頼性回復を最優先にする
- ユーザー影響のある障害は blame-free ポストモーテムを issue 化し、再発防止を自動化候補へ接続する

## 6. バックアップと restore drill（RPO ≤ 24h / RTO ≤ 4h）

**手順**:
1. 新 Turso DB を作成
2. R2 `harness-hub-backups` の最新 dump を restore
3. secret の URL/token を差し替え
4. `/health` で確認

**四半期ごとの restore drill**: 一時 DB へ実際に restore し、**行数・整合検査まで実施する**。
**復元できないバックアップを成功と数えない**（qa-019）。

## 7. 未実装（手順で代替しないもの）

| # | 未実装 | 影響 | 必要な作業 |
|---|---|---|---|
| ~~U-1~~ | ~~backup workflow 未実装~~ → **実装済み** (`.github/workflows/backup.yml`) | — | secret 投入後に初回実行を確認すること |
| ~~U-2~~ | ~~scheduled handler 未実装~~ → **実装済み** (`apps/hub/src/worker.ts` + `src/worker/cron.ts`) | ジョブ本体は空 (id は登録済み)。各ドメイン feature が中身を実装する | — |
| ~~U-3~~ | ~~G6 / G8 未配線~~ → **配線済み**。実効性も実測 | — | — |
| U-4 | 未 wrap route の静的検出 | 認可 fail-open のリスクが残る | detector 拡張 |

> **これらは「運用手順があるから大丈夫」ではない。** 実装されるまでは、対応する運用は成立していない。
