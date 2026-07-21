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

> **状態**: **部分完了**。Worker のデプロイと `/health` の実疎通（200 / 全依存 ok）まで到達したが、**cron トリガーの登録が未解決**であり、外形監視・CI 経由デプロイも未了のため `status: in_progress` のままにする。

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
| 現行配信 version（2026-07-21 09:07 UTC 再確認） | `d61b1cb4-ae22-44a8-a0a2-5f8750a6fd8c`（100%） |

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
| `CRON_HEARTBEAT_URL` | **未投入** | Better Stack の heartbeat 登録後 |

## 2. 未完了の項目（完了条件を満たしていないもの）

| # | 項目 | 状態 | 影響 |
|---|---|---|---|
| 1 | Worker secret | **3/4 投入済み**（`CRON_HEARTBEAT_URL` のみ未投入） | `/health` は production で HTTP 200・全依存 ok を再確認済み |
| 2 | cron トリガー登録 | **失敗** | 日次・週次バッチが起動しない（§3） |
| ~~3~~ | ~~`/health` の 200 確認~~ → **完了**（2026-07-21 04:45 UTC / HTTP 200・db 365ms・r2 1114ms すべて ok。証跡: `evidence/health-response.json`） | **外形監視を有効化してよい状態になった** |
| 4 | 外部死活監視（Better Stack） | **未設定**（前提は満たしたので登録可能） | A3 が blocked のまま。SLO 算定には 1 ヶ月の時系列が要る |
| 5 | GitHub Secrets / Variables | **未確認**（`gh` token 失効により API 401。以前の記録では未設定） | CI の deploy job 完走証跡が無く、A1 は blocked のまま |
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
| cron 2 本 → 1 本に減らして再試行 | 同じく失敗 |
| `wrangler deploy` / `wrangler triggers deploy` 双方 | **同じく失敗** |
| ローカル wrangler 4.112.0 / グローバル 4.84.1 | どちらでも失敗（バージョン差の問題ではない） |
| デプロイ済み version | `fa8b36af-ab62-4520-ad34-ece1ca940125`（100% 配信中。Worker 自体は稼働） |

> **切り分けの訂正**: 当初「cron を 1 本に減らしても失敗するので件数上限ではない」と結論したが、これは**誤り**である。Cloudflare の cron トリガー上限は **Worker 単位ではなくアカウント単位**（Free プランで 5 本）であり、**本 Worker の本数を減らしても、同一アカウントの他 Worker が枠を消費していれば解消しない**。本アカウントには他プロジェクト（`automationa-tools` 系・`ubm-*` 系）の Worker が存在するため、**アカウント全体の cron 使用数が上限に達している可能性が最有力**。

### 未確認（次の診断手順・優先順）

API のレスポンス本文が wrangler ログに残らないため**エラーコードが取得できていない**。以下の順で切り分ける。

| # | 仮説 | 確認方法 |
|---|---|---|
| 1 | **アカウント全体の cron 上限（Free プラン 5 本）に到達** | ダッシュボード → Workers & Pages で**他 Worker の Cron Triggers を数える**。上限なら不要な cron を削除するか、Hub の cron を 1 本へ統合する（日次と週次を 1 本にまとめ、handler 側で曜日判定する設計変更で回避可能） |
| 2 | OAuth token のスコープ不足 | ダッシュボードで **API token**（`Workers Scripts:Edit`）を発行し `CLOUDFLARE_API_TOKEN` に設定して再試行 |
| 3 | Worker 側の一時障害 | 時間をおいて再試行 |

いずれの場合も、ダッシュボードの Workers → `harness-hub` → Settings → Triggers で Cron が登録されているかを目視確認する。

**この失敗は cron ジョブ（metrics rollup・Turso 使用量監視・週次サマリ）が起動しないことを意味する。** ジョブ本体は現時点で空実装だが、未解決のまま完了扱いにはしない。

## 4. A1 / A3 の状態

- **A1（CI が test→deploy を完走）**: 今回のデプロイは**手動実行**であり CI run 内の deploy job ではない。A1 の判定条件は「単一 workflow run 内で test job → deploy job が success」なので、**blocked のまま**。GitHub Secrets 設定 + main merge で解除される。
- **A3（SLO 99.5% 計測と /health 稼働）**: **`/health` の稼働は再実測で確認済み**（2026-07-21 09:07 UTC、200 / 全依存 ok）。ただし SLO 99.5% の算定には**外形監視による 3 分間隔・1 ヶ月分の時系列**が必要で、これが未取得のため **blocked のまま**。runbook §1 の順序制約は満たしたので、外形監視は有効化してよい。

## 5. 次の手順（runbook §1 の続き）

1. Turso DB を作成し接続情報を取得
2. `wrangler secret put TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` / `AUTH_SECRET` / `CRON_HEARTBEAT_URL`
3. `curl https://harness-hub.daishimanju.workers.dev/health` が **200** を返すことを確認
4. cron トリガーの失敗を §3 の手順で解消
5. Better Stack で `/health` の 3 分間隔監視 + cron heartbeat を登録（**3 の確認後**）
6. GitHub Secrets / Variables を設定し、PR を main へ merge して CI 経由デプロイで A1 を確定
