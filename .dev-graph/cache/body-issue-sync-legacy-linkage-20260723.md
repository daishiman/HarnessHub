# 概要

2026-07-23 の `/dev-graph sync` で検出した `external_linkage_missing` 20件を、既存 Beads 課題へ一意に対応付けて収束した。

## 背景と問題

`SYS-DEV-PIPELINE-IMPROVEMENT-P01..P13` と既存 issue 7件は `tracker_binding=beads` だったが、`beads_linkage` が未設定だった。そのため同期のたびに20件が `pending_retry` へ残り、依存グラフの完了状態を Beads から取り込めなかった。

あわせて、Beads の issue 応答が `dependencies: null` を返す場合に `sync-graph.py` が反復処理で停止する不具合が判明した。

## 修正後の挙動

- 20 node すべてを既存 Beads ID へ一意にリンクした。
- `dependencies: null` を「依存なし」として正規化し、非 list 値は fail-closed（不正入力として停止）にした。
- Beads で完了済みの13 nodeを graphへ取り込み、completion evidence（完了証跡）を補完した。
- 進行中の `SYS-DEV-PIPELINE-IMPROVEMENT-P13` / `HarnessHub-k2u.13` は変更していない。
- 最終 sync dry-run は imports / exports / conflicts / pending_retry がすべて0、`converged=true`、write count 0となった。

## 再現・検証手順

1. C02 upsert を20件すべて dry-runし、write count 0を確認する。
2. 同じ入力を本実行して linkage を登録する。
3. `/dev-graph sync` の dry-run → apply → 確認 dry-runを実行する。
4. 完了済み13 nodeの completion evidence を C02で補完する。
5. `lint-open-residue.py` と graph schema validatorを実行する。
6. 現行挙動閉包で `run-dev-graph-sync` の live trialを再実行する。

## 影響と優先度

- 影響範囲: dev-graph と Beads の同期、ready 判定、完了状態の可視化
- 深刻度: medium
- 緊急度: `pending_retry` の常時残留が正しい着手候補計算を妨げるため、今回の運用内で収束

## スコープ

- In: P01〜P13とissue 7件の linkage、null dependenciesの正規化、完了済み13件の close-loop証跡
- Out: 進行中 `HarnessHub-k2u.13` の状態変更、無関係な Beads 課題の変更

## 関連グラフ

- 原因/親ノード: `feat-dev-pipeline-improvement`
- 解決課題: `issue-sync-legacy-linkage-20260723`
- 関連実装: `plugins/dev-graph/scripts/sync-graph.py`

## 受入条件

- [x] `external_linkage_missing` 20件が既存 Beads 課題へ一意に対応付いた
- [x] 進行中 `HarnessHub-k2u.13` の状態を変更していない
- [x] sync確認 dry-runで `pending_retry=[]`、`changes=0`、`converged=true`
- [x] close-loop residueが13件から0件へ減少した
- [x] graph schema violations 0
- [x] dev-graph全テスト 393件 PASS
- [x] sync live trialとfresh evaluator PASS

## 検証証跡

- 同期 receipt: `eval-log/run-dev-graph-sync-execution.json`
- close-loop lint: `eval-log/dev-graph/sync-legacy-linkage-open-residue.json`
- live verdict: `eval-log/dev-graph/run-dev-graph-sync/live-trial/20260723T114338Z-wt1r1/verdict.json`
- 回帰テスト: `plugins/dev-graph/tests/test_sync_render_schedule_v2.py`
- linkage入力: `.dev-graph/cache/c02-linkage/`
- completion入力: `.dev-graph/cache/c02-completion/`
