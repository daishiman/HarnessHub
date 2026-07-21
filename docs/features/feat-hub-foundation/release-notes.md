---
status: in_progress
layer: feature-design
task: SYS-HUB-FOUNDATION-P13
parent_feature: feat-hub-foundation
feature_package_id: feature-package/feat-hub-foundation
feature_context_digest: sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d
deployed_at: "2026-07-21T03:46:26Z"
---

# feat-hub-foundation 本番リリース記録 (P13)

> **状態**: **部分完了**。Worker のデプロイは成功したが、cron トリガーの登録に失敗しており、secret 未投入のため `/health` は設計どおり 503 を返す想定。完了条件を満たしていないため `status: in_progress` のままにする。

## 1. デプロイ結果

| 項目 | 値 |
|---|---|
| Worker 名 | `harness-hub` |
| 公開 URL | https://harness-hub.daishimanju.workers.dev |
| Cloudflare アカウント ID | `b3dde7be1cd856788fc47595ac455475` |
| デプロイ日時 | 2026-07-21 03:46 UTC |
| 実行者 | ローカル `wrangler deploy`（初回 bootstrap のため CI ではなく手動。runbook §1） |
| bundle | 0.952 MiB（gzip、予算 3 MiB） |
| アップロード | **成功** |
| cron トリガー登録 | **失敗**（§3） |

### 事前に作成したリソース

| リソース | 名前 | 状態 |
|---|---|---|
| R2 バケット | `harness-hub-packages` | 作成済み |
| R2 バケット | `harness-hub-backups` | 作成済み |

## 2. 未完了の項目（完了条件を満たしていないもの）

| # | 項目 | 状態 | 影響 |
|---|---|---|---|
| 1 | Worker secret 4 件の投入 | **未実施** | `/health` は `db` probe が失敗し **503**（設計どおりの挙動）。SLO 計測を開始できない |
| 2 | cron トリガー登録 | **失敗** | 日次・週次バッチが起動しない（§3） |
| 3 | `/health` の 200 確認 | **未実施** | 外形監視を有効化してはいけない段階 |
| 4 | 外部死活監視（Better Stack） | **未設定** | A3 が blocked のまま |
| 5 | GitHub Secrets / Variables | **未設定** | CI の deploy job が動かない（A1 が blocked のまま） |
| 6 | 独自ドメイン（`hub.<domain>`） | **未設定** | 現状は workers.dev サブドメイン |

## 3. cron トリガー登録の失敗（未解決）

```
PUT /accounts/b3dde7be1cd856788fc47595ac455475/workers/scripts/harness-hub/schedules
→ A request to the Cloudflare API failed.
```

### 切り分け済みの事実

| 検証 | 結果 |
|---|---|
| Worker 本体のアップロード | **成功**（同じ token で通っている） |
| cron 2 本 → 1 本に減らして再試行 | **同じく失敗**（件数上限ではない） |
| `wrangler deploy` / `wrangler triggers deploy` 双方 | **同じく失敗** |
| ローカル wrangler 4.112.0 / グローバル 4.84.1 | どちらでも失敗（バージョン差の問題ではない） |

### 未確認（次の診断手順）

- API のレスポンス本文が wrangler ログに残らないため**エラーコードが取得できていない**
- 有力な仮説: **OAuth token のスコープ不足**。`wrangler login` の OAuth token ではなく、**Cloudflare ダッシュボードで発行した API token**（`Workers Scripts:Edit` を含む）を `CLOUDFLARE_API_TOKEN` に設定して再試行すると切り分けできる
- 併せてダッシュボードの Workers → `harness-hub` → Settings → Triggers で Cron が登録されているかを目視確認する

**この失敗は cron ジョブ（metrics rollup・Turso 使用量監視・週次サマリ）が起動しないことを意味する。** ジョブ本体は現時点で空実装だが、未解決のまま完了扱いにはしない。

## 4. A1 / A3 の状態

- **A1（CI が test→deploy を完走）**: 今回のデプロイは**手動実行**であり CI run 内の deploy job ではない。A1 の判定条件は「単一 workflow run 内で test job → deploy job が success」なので、**blocked のまま**。GitHub Secrets 設定 + main merge で解除される。
- **A3（SLO 99.5% 計測と /health 稼働）**: secret 未投入のため `/health` は 503 想定。**外形監視を有効化してはいけない**（初期の 503 が可用性へ算入されるため。runbook §1 の順序制約）。**blocked のまま**。

## 5. 次の手順（runbook §1 の続き）

1. Turso DB を作成し接続情報を取得
2. `wrangler secret put TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` / `AUTH_SECRET` / `CRON_HEARTBEAT_URL`
3. `curl https://harness-hub.daishimanju.workers.dev/health` が **200** を返すことを確認
4. cron トリガーの失敗を §3 の手順で解消
5. Better Stack で `/health` の 3 分間隔監視 + cron heartbeat を登録（**3 の確認後**）
6. GitHub Secrets / Variables を設定し、PR を main へ merge して CI 経由デプロイで A1 を確定
