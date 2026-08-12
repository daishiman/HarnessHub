---
title: "feat-docs-cms リファクタリング／migration 記録 (P08)"
status: confirmed
layer: feature-migration
graph_node_id: "SYS-DOCS-CMS-P08"
beads_linkage: "HarnessHub-9wb.8"
---

# feat-docs-cms リファクタリング／migration 記録

## migration

- `0005_common_stepford_cuckoos.sql` は `documents` テーブルと 2 本の読取り index を追加する additive（既存データを削除・変換しない）migration である。
- 後続の additive migration は (a) category/tags/thumbnail/excerpt/asset summary、(b) 外部同期自然キー・hash・revisionと一意index、(c) nullable `publish_at` を純増する。2026-08-12統合時点の current journal では最後の追加が ordinal `0014` だが、運用手順と検査は番号・件数でなく journal の pending/appliedAfter/pending=0 を正本にする。
- `publish_at` は既存の `thumbnail_url` や外部同期列をrename/dropせず加える。`scheduled` enumも追加しないため、既存行は `publish_at=NULL` の非予約としてそのまま読める。
- Drizzle journal、snapshot、DDL lineage テスト、backup/restore の migration 数と全列を同じ wave で更新する。
- rollback は migration を逆適用せず、Hub Worker を直前版へ戻して S15 の新規操作を止める。作成済み `documents` と `ai_jobs` は監査・再試行のため保持する。

## 共通 AI キューの整理

`ai_jobs` の claim／lease／CAS は 1 実装に集約し、`doc_draft` 固有の本文書戻しだけを
`docs-cms` repository の writeback 宣言に分離した。これにより `sheet_generation` の既存挙動を複製せず、
kind ごとの入力・出力 zod 契約は `AI_QUEUE_ADAPTERS` で選択する。

`doc_draft` の本文書戻しは `publish_at=NULL`、外部同期文書なら content hash の modified 化とrevision増加を
同じCAS更新へ含める。これによりAI本文だけ新しく予約だけ古い状態で、未レビュー本文が公開される組合せを作らない。

## ページングの是正

最終レビューで `cursor` が repository query に未適用と判明したため、ULID の `id DESC` を安定した順序、
最後の `id` を次ページ cursor として実装した。`updated_at` の変化でページ間の行が揺れないことを優先する。

## 予約公開batch

`publishDueDocuments(now, limit?)` はdefault/max=100、期限到来行を `publish_at ASC, id ASC` の安定順で
`limit+1`件読み、各行CASで処理する。返却は
`{publishedCount,hasMore,publishedDocuments:[{id,tenantId}]}`。
公開済み行は `publish_at=NULL` にするので再実行対象から外れる。文書の状態・更新者/時刻・外部revision・
publish_at clearはrepository transactionで揃える。Hubは返却文書ごとにactor=`system`の
`docs.scheduled_publish`監査eventを順次追記し、失敗時は構造化ログを残してジョブを失敗扱いにする。
監査追記はDB更新と同一transactionではないため、その障害境界を件数だけで完全成功と誤認しない。
