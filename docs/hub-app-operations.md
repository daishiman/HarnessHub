---
status: confirmed
layer: system-wide-design
sources: [README.md, docs/features/feat-hub-foundation/runbook.md, apps/hub/monitoring/better-stack.monitors.json, apps/hub/monitoring/slo-dashboard.json]
---

# Hub アプリ（apps/hub）の開発と本番運用

> README.md「Part 5」から分離した入口ガイド。運用手順の**正本**は `docs/features/feat-hub-foundation/runbook.md`、監視設定の正本は `apps/hub/monitoring/` の 2 ファイル。本書は全体像と入口だけを示す。

## 初期セットアップ（開発環境）

Hub 本体（Cloudflare Workers 上で動く Next.js アプリ）をローカルで動かす手順です。

```bash
# 1. 依存のインストール（パッケージマネージャは pnpm 固定。npm の混入は CI が検知して fail する）
pnpm install --frozen-lockfile

# 2. Cloudflare へのログイン（デプロイ・secret 操作に必要。開発サーバの起動だけなら不要）
wrangler login

# 3. 開発サーバの起動
pnpm --filter @harness-hub/hub run dev
# → http://localhost:3000 で確認する

# 4. ローカルで CI と同じ品質ゲートを再現する
pnpm verify
```

- Worker 実行系（Cloudflare ランタイム）で確認したいときは `pnpm --filter @harness-hub/hub run preview`
- 初回の本番構築は「R2 バケット作成 → 手動 deploy → secret 投入」の順序制約がある。`docs/features/feat-hub-foundation/runbook.md` §1 を正本とする

## 本番運用

運用手順の正本は `docs/features/feat-hub-foundation/runbook.md`。ここでは全体像と入口だけを示します。

| 運用 | 内容 | 正本 |
|---|---|---|
| デプロイ | main への merge で `ci.yml` が全ゲート通過後に自動デプロイ（手動 gate なし）。1 つでもゲートが落ちれば deploy は走らない | runbook §2 |
| ロールバック | `wrangler deployments list` → `wrangler rollback`。post-deploy の `/health` が 200 以外なら即ロールバック | runbook §3 |
| 障害対応 | `/health` の `dependencies[]`（db / r2）で一次切り分けし、縮退マトリクスに従う | runbook §4 |
| 監視・SLO | 可用性 99.5%/月。外形監視は Better Stack（設定正本 `apps/hub/monitoring/better-stack.monitors.json`）、SLO ダッシュボードは Cloudflare dashboard + status page の組（`apps/hub/monitoring/slo-dashboard.json`） | runbook §5 |
| バックアップ | `backup.yml` が日次で Turso dump → R2 へ保存。四半期ごとに restore drill を実施 | runbook §6 |

CI の deploy job / backup job が参照する GitHub Secrets / Variables（未設定だと該当 job が fail-closed で落ちる）:

```bash
gh secret set CLOUDFLARE_API_TOKEN       # Workers deploy 権限の API token
gh secret set CLOUDFLARE_ACCOUNT_ID
gh variable set HUB_HEALTH_URL --body "https://harness-hub.daishimanju.workers.dev/health"
# backup.yml 用:
#   TURSO_AUTH_TOKEN / TURSO_DATABASE_NAME / R2_ACCESS_KEY_ID /
#   R2_SECRET_ACCESS_KEY / R2_ACCOUNT_ID / BACKUP_HEARTBEAT_URL
```
