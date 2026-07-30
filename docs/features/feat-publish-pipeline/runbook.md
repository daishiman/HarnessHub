---
status: confirmed
layer: feature-operations
task: SYS-PUBLISH-PIPELINE-P12
parent_feature: feat-publish-pipeline
feature_package_id: feature-package/feat-publish-pipeline
source: docs/features/feat-publish-pipeline/evidence-summary.md
feature_context_digest: sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security]
---

# feat-publish-pipeline 運用 runbook

> **位置づけ**: P12 の成果物。運用担当者向け。公開パイプラインが期待どおりに進まないときの検知と一次対応をまとめる。

対象読者: Hub の運用担当者 / オンコール担当者

## 0. 前提となる状態遷移

PublishRequest は 9 状態を持つ。

```
draft ──package upload/submit──> validating ──検査 red/yellow──> needs_fix
                                     │
                                     └──検査 green──> ready ──approve──> approved
                                                                            │
                                                       publishing <─────────┘
                                                          │  │
                                    publish_succeeded ────┘  └──── publish_failed
                                            │                          │
                                        published                   failed
```

- **終端**: `published` / `failed`。ここからはどのイベントでも遷移しない。
- **channel を占有する状態**: `published` / `failed` / `draft` **以外**。同一 TargetChannel に対し、占有状態の request は同時に 1 件しか存在できない (DB の partial UNIQUE index)。

## 1. orphan_candidate — `publishing` で止まった request

### 1-1. 何が起きているか

`publishing` は「R2 への配置と Release 作成を実行中」を意味する。この状態のまま長時間動かない request を **orphan_candidate** と呼ぶ。原因は主に次の 3 つ。

| 原因 | 見分け方 |
|---|---|
| Worker が処理途中で落ちた (CPU 時間超過・例外) | 監査 event に `publish.submit` はあるが後続が無い |
| R2 への書き込みが失敗し、例外が握り潰された | Worker ログに R2 のエラー |
| DB 更新は成功したが応答が client に届かなかった | Release 行は存在するが request が `publishing` のまま |

**重要**: `publishing` の request は channel を占有している。放置すると**そのチャネルへの新しい公開が一切できなくなる** (409 が返り続ける)。

### 1-2. 検知

```sql
-- 15 分以上 publishing のまま動いていない request
SELECT id, tenant_id, workspace_id, project_id, channel_id, created_at
FROM publish_requests
WHERE status = 'publishing'
  AND created_at < (unixepoch() - 900) * 1000
ORDER BY created_at;
```

利用者側からの申告は「公開ボタンを押したまま進まない」「別の版を公開しようとすると `channel_busy` が返る」という形で来ることが多い。

### 1-3. 一次対応 (判断の順序)

**判断の分岐点は「Release 行が既に作られているか」である。**

```sql
-- 該当 request が Release を作り終えているか
SELECT r.id, r.status, r.created_at
FROM releases r
JOIN publish_requests pr ON pr.release_id = r.id
WHERE pr.id = '<request_id>';
```

| 状況 | 対応 |
|---|---|
| **Release 行がある** (= 実質完了していた) | request を `published` へ進める。channel の stable ポインタが当該 Release を指しているかも確認する |
| **Release 行が無い** (= 途中で落ちた) | request を `failed` へ落とす。channel は解放される。利用者には**再度公開要求を出してもらう** |

いずれの場合も、状態を直接 UPDATE するのではなく **`publish_succeeded` / `publish_failed` イベントを通す**こと。直接 UPDATE すると監査 event が残らず、A3 (全操作が append-only 監査 event に記録される) が破れる。

> **やってはいけないこと**: `publishing` の request を `draft` へ戻す。`draft` は channel を占有しない状態なので、戻した瞬間に別の request が同じ channel へ入れるようになる。片付いていない R2 オブジェクトと新しい公開が競合する。

### 1-4. 再発防止

現状、orphan_candidate の自動回収機構は無い。検知は手動 SQL に依存している。定期ジョブ化は follow-up。

## 2. TargetChannel の rollback

### 2-1. 制約: 2 版目以降限定

rollback は「stable ポインタを 1 つ前の Release へ戻す」操作である。したがって **Release が 1 版しか無いチャネルでは実行できない** (戻す先が無い)。この場合 API は失敗を返す。

1 版目を取り下げたい場合は rollback ではなく **`POST /api/v1/releases/:id/suspend`** を使う。suspend は Release の `status` を `suspended` へ変える唯一の更新で、Release の内容 (不変部分) は変えない。

### 2-2. 手順

```bash
# 1. 現在の stable と履歴を確認する
curl -sS "$HUB/api/v1/projects/$PROJECT_ID/releases" \
  -H "authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" -H "x-workspace-id: $WORKSPACE_ID"

# 2. rollback を実行する (冪等鍵は必須)
curl -sS -X POST "$HUB/api/v1/channels/$CHANNEL_ID/rollback" \
  -H "authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" -H "x-workspace-id: $WORKSPACE_ID" \
  -H "origin: $ALLOWED_ORIGIN" \
  -H "idempotency-key: $(uuidgen)" \
  -H "content-type: application/json" \
  -d '{"release_id":"<戻す先の release id>"}'
```

**冪等鍵は必須**。付けないと 400 (`idempotency_key_required`) が返る。同じ鍵で再送すると先着の応答がそのまま返る (24 時間以内)。

### 2-3. 確認

rollback は**原子的**である。成功応答が返った時点で stable ポインタは切り替わっている。中間状態は観測されない。

```
監査 event: channel.rollback (entity_type=target_channel)
```

が 1 件記録されていることを確認する。記録が無い場合は rollback が実行されていない。

## 3. 公開の進行監視 (ポーリング)

### 3-1. client 側の想定挙動

公開要求は非同期に進む。client は `GET /api/v1/publish/:id` を **2 秒間隔から始めて exponential backoff (指数的に間隔を延ばす)** でポーリングする。

### 3-2. 運用上の監視ポイント

| 観点 | 見るもの | 異常のサイン |
|---|---|---|
| 進行の停滞 | `status` が同じまま | `validating` が 5 分以上 → 検査が重すぎる or 落ちている |
| ポーリング過多 | `429 rate_limited` の発生率 | GET は上限対象外だが、client が変更系を叩き直していると 429 が出る |
| 検査の失敗率 | `verdict` の分布 | `red` が急増 → 検査ルールの変更か、共通の依存が壊れた |
| 冪等の再生率 | `idempotency-replay: true` の割合 | 急増 → client が再送ループに入っている |

### 3-3. レート制限に当たったとき

```
HTTP 429
retry-after: <秒>
ratelimit-limit: 10
ratelimit-remaining: 0
ratelimit-reset: <秒>
```

上限は `(テナント, 利用者, endpoint)` ごとに 10 回/分。**`retry-after` の秒数だけ待ってから再送する**こと。待たずに再送しても拒否は消費されない (窓は延びない) が、無駄な往復になる。

> **既知の限界**: カウンタは Worker isolate 内のメモリにある。isolate をまたぐと実効上限が緩む。「上限のはずなのに通った」という観測はバグではなくこの限界である。

## 4. 監査 hash chain の異常

### 4-1. 検知

cron ジョブ `verify-audit-chain` が定期的に連鎖を検証する。異常時は `seq` / `prev_hash` / `event_hash` の不整合として報告される。

### 4-2. 一次対応

**監査 event を修正してはならない。** append-only の台帳であり、修正した瞬間に台帳としての価値が消える。

| 状況 | 対応 |
|---|---|
| 連鎖が途切れている (`prev_hash` 不一致) | **書き込みを止める判断が要る**。改竄か、並行書き込みの競合かを切り分ける。切り分けが付くまで publish endpoint を止めることを検討する |
| `seq` に欠番がある | 書き込み失敗の可能性。ログで該当時刻の例外を確認する |
| `event_hash` が再計算値と合わない | 改竄の可能性が高い。エスカレーション対象 |

いずれの場合も、**不整合の発見そのものを記録に残す** (別の台帳・インシデントチケット) こと。

## 5. よくある問い合わせと切り分け

| 症状 | 最初に見るもの |
|---|---|
| 「公開できない」 | request の `status`。`needs_fix` なら findings を見せる (利用者が自分で直せる情報) |
| 「409 channel_busy が返る」 | 同じ channel に占有状態の request が無いか → §1 |
| 「400 idempotency_key_required」 | client が `idempotency-key` header を付けていない |
| 「422 が返る」 | 同じ冪等鍵で**違う** payload を送っている。鍵を変えるか payload を戻す |
| 「403 が返る」 | `origin` header が無い (CSRF 対策) か、ロールが足りない |
| 「404 が返るが資源はあるはず」 | 他テナントの資源を指している。403 ではなく 404 を返す仕様 (存在を漏らさないため) |

## 6. エスカレーション基準

| 条件 | 対応 |
|---|---|
| 監査 hash chain の `event_hash` 不一致 | 即エスカレーション (改竄の可能性) |
| orphan_candidate が同時に 5 件以上 | Worker 側の障害を疑う。個別対応ではなく原因調査へ |
| rollback が失敗する | stable ポインタの整合を DB で直接確認。手で書き換えず、状況を記録してエスカレーション |
