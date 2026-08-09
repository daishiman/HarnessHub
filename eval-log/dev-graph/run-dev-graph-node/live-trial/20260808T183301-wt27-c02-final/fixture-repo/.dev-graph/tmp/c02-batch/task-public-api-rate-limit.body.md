## 目的

公開 API にレートリミットを導入し、過剰なリクエストによる劣化を防ぐ。

## 背景

現在は公開エンドポイントに上限がなく、単一クライアントの連続呼び出しで
他利用者のレイテンシが悪化する。

## 入力と前提条件

- 入力: HTTP リクエスト (送信元 IP と API key)
- 前提: 共有キャッシュストアが利用できる

## 出力と成果物

- レートリミット middleware
- 上限超過時の 429 レスポンスと Retry-After ヘッダ

## 依存関係

- 認証済み主体の識別が必要なため、認証ヘッダ移行 (`spec-rest-api-v2-migration`) の契約に従う
- 配置先は `arch-order-processing-backend` の API gateway 直後の層とする

## 実装対象

- 公開ルートに適用する middleware 本体と token bucket カウンタ
- 上限値・バースト値の設定読み込みと既定値
- 429 応答の生成と Retry-After ヘッダ付与

## Write scope と競合制約

- 触るのは公開 API のルーティング定義と middleware 層、および設定ファイルに限る
- 認証サービス本体と注文ドメインのコードは触らないため、それらを触るタスクと同時実行できる

## GitHub publication

`github.enabled=false` の caller repository のため mode は local_only とし、Issue/PR へは投影しない。
tracker_binding=beads の完了ループで手動 evidence を記録する。

## 実行手順

1. token bucket のカウンタ実装を追加する
2. middleware として公開ルートへ組み込む
3. 上限値を設定値として外部化する

## 受入条件

- [ ] 上限を超えた呼び出しが 429 を返す
- [ ] API key ごとにカウンタが独立している

## 検証方法

- 上限直下・直上の連続呼び出しで 200 と 429 の境界を統合テストで確認する
- 2 つの API key を並行に呼び、カウンタが相互に干渉しないことを確認する
- Retry-After の値が残り待機時間と一致することをレスポンスヘッダで確認する

## リスクとロールバック

- リスク: 上限値が実利用より低いと正当なクライアントが遮断される
- 緩和: 初回は観測のみのしきい値超過ログを併用し、設定値で段階的に強制へ切り替える
- ロールバック: 設定値で middleware を無効化し、ルーティング定義から外す

## Handoff

実装完了後、上限値の運用手順を `doc-dev-environment-setup` と同じ docs 系運用文書へ追記し、
残課題は本ノードの completion_evidence へ evidence_refs として記録する。
