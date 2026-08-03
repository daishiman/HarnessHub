---
title: "feat-docs-cms リリース記録 (P13)"
status: pending_pr_and_production_deploy
graph_node_id: "SYS-DOCS-CMS-P13"
beads_linkage: "HarnessHub-9wb.13"
---

# feat-docs-cms リリース記録

## リリース対象

- S15 の common／tenant ドキュメント一覧・閲覧・作成・編集 API と画面
- `documents` migration (`0005_common_stepford_cuckoos.sql`)
- `doc_draft` の pull／complete／fail を既存 `ai_jobs` に統合する consumer adapter

## 状態

PR 作成前のローカル実装・自動テストまでを対象とする。production migration、Hub Worker deploy、
実環境の S15 到達・API 疎通・AI job round-trip smoke は **未実行**であり、PR merge 後の
P13 残課題として実行日時と結果をここへ追記する。

## 実施順序

1. backup と migration dry-run を確認する。
2. `0005` を適用する。
3. Hub Worker を deploy する。
4. テスト tenant で create → read → update → draft enqueue → pull → complete → 本文反映を確認する。
5. 失敗時は Worker を直前版へ戻し、DB の新規行・AI job は削除せず原因調査と再試行に使う。
