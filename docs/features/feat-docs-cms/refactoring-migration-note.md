---
title: "feat-docs-cms リファクタリング／migration 記録 (P08)"
status: confirmed
graph_node_id: "SYS-DOCS-CMS-P08"
beads_linkage: "HarnessHub-9wb.8"
---

# feat-docs-cms リファクタリング／migration 記録

## migration

- `0005_common_stepford_cuckoos.sql` は `documents` テーブルと 2 本の読取り index を追加する additive（既存データを削除・変換しない）migration である。
- Drizzle journal、snapshot、DDL lineage テスト、backup/restore の migration 件数を同じ wave で更新する。
- rollback は migration を逆適用せず、Hub Worker を直前版へ戻して S15 の新規操作を止める。作成済み `documents` と `ai_jobs` は監査・再試行のため保持する。

## 共通 AI キューの整理

`ai_jobs` の claim／lease／CAS は 1 実装に集約し、`doc_draft` 固有の本文書戻しだけを
`docs-cms` repository の writeback 宣言に分離した。これにより `sheet_generation` の既存挙動を複製せず、
kind ごとの入力・出力 zod 契約は `AI_QUEUE_ADAPTERS` で選択する。

## ページングの是正

最終レビューで `cursor` が repository query に未適用と判明したため、ULID の `id DESC` を安定した順序、
最後の `id` を次ページ cursor として実装した。`updated_at` の変化でページ間の行が揺れないことを優先する。
