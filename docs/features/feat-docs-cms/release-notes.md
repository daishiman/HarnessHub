---
title: "feat-docs-cms リリース記録 (P13)"
status: deployed_pending_docs_cms_production_smoke
layer: feature-release
graph_node_id: "SYS-DOCS-CMS-P13"
beads_linkage: "HarnessHub-9wb.13"
---

# feat-docs-cms リリース記録

## リリース対象

- S15 の common／tenant ドキュメント一覧・閲覧・作成・編集 API と画面
- `documents` migration (`0005_common_stepford_cuckoos.sql`)
- `doc_draft` の pull／complete／fail を既存 `ai_jobs` に統合する consumer adapter

## 状態

当初この節は「PR 作成前のローカル実装・自動テストまでを対象とする」と書かれていたが、**現在の本番状態とは食い違う**ため 2026-08-08 の実測で是正する。

PR [#649](https://github.com/daishiman/HarnessHub/pull/649) は 2026-08-03 に main へ merge 済み。`packages/db/migrations/0005_common_stepford_cuckoos.sql` は main に存在する。main `44109782` の hub-ci run [31240466397](https://github.com/daishiman/HarnessHub/actions/runs/31240466397) は deploy job の全 step が success (production migration / wrangler deploy / `/health` 疎通 / 配信版一致ゲート / 稼働ビルド鮮度検査 / OIDC smoke / DB・R2 smoke / hearing smoke)、`失敗時ロールバック` は skipped。したがって **production migration と Hub Worker deploy は完了している**。

未実行として残るのは **Docs CMS 固有の round-trip smoke (create → read → update → AI draft の enqueue → pull → complete → 本文反映) のみ**である。その未測定の理由は「デプロイされていないから」ではなく **「測る手段が実装されていないから」**である。`apps/hub/scripts/` にある本番 smoke は hearing / publish / oidc の 3 系統のみで、Docs CMS 用は存在しない。人手確認で済ませると次のデプロイで壊れても気付けないため、`smoke-production-hearing.ts` と同型の `smoke-production-docs-cms.ts` を実装し `ci.yml` の smoke 群へ結線するのが正しい塞ぎ方である。

## 実施順序

1. ~~backup と migration dry-run を確認する。~~ **完了**
2. ~~`0005` を適用する。~~ **完了 (run 31240466397 の production migration step success)**
3. ~~Hub Worker を deploy する。~~ **完了 (同 run の wrangler deploy step success)**
4. テスト tenant で create → read → update → draft enqueue → pull → complete → 本文反映を確認する。**← 未実施。上記のとおり smoke script の新規実装が前提**
5. 失敗時は Worker を直前版へ戻し、DB の新規行・AI job は削除せず原因調査と再試行に使う。
