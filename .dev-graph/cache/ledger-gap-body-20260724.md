# 概要

reconcile-github-lifecycle.py の完全な完了投影経路 (writer-consumer 経由の completion_event 台帳生成) が、該当スクリプト不在のため未実装であることを追跡する。

## 背景と問題

reconcile は `--writer-consumer` に `--operation apply-lifecycle-request --request <path> --receipt <path>` を渡して C02 へ writer_request を適用し、receipt を検証したうえで completion_event / system_release / beads close を実行する設計。しかし writer-consumer スクリプトがリポジトリに存在せず、run-dev-graph-node SKILL にも apply-lifecycle-request ハンドラが無い。

## 現在の挙動

- MVP-first (xjv) / pipeline-improvement (PR #50) の完了投影は「C26 --mode check で PR merge 事実を検証 + C02 upsert-node.py で適用」の手動多段で確定
- completion_event 台帳 / transaction receipt が emit されない (監査証跡が C02 receipt 止まり)

## 期待する挙動

- reconcile の完全経路が単一コマンドで完走し completion_event 台帳を生成
- もしくは already-done node への冪等 bless 経路で台帳を後追い生成

## スコープ

- In: writer-consumer 実装 / reconcile 統合 / already-done 冪等 emission
- Out: 既に done・検証済みの completion_evidence 再投影、別ストリーム OR-003

## 受入条件

- [ ] reconcile が writer-consumer 不在でも完了投影を完走 (completion_event 台帳生成) できる
- [ ] MVP-first P01..P13 に対応する completion_event が events 台帳に存在する
- [ ] 手動 writer-receipt 手書きなしで監査可能な証跡が残る

## 検証証跡

- コマンド/テスト: reconcile-github-lifecycle.py の完全経路実走
- 証跡 path: .git/dev-graph/completion-receipts/ の completion_event / transaction receipt
