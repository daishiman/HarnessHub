---
status: confirmed
category: requirements-definition
---

# 要件定義書 (上位概念)

> 本章は spec-state.json の requirements_foundation を正本とする、システム構築の憲法。
> 以降の各技術章は frontmatter の serves_goals でここ (ゴール) へトレース (anchor) する。
> 上位概念がブレなければ、仕様が整った後もブレない。

- 確定マーカー: `status: confirmed`

## U1 本質的目的 (essential_purpose)

自分の TODO を、いかなる外部サービスにもデータを渡さずに、手元の 1 プロセスだけで管理・自動化できる状態にする。

## U2 背景 (background)

既存の SaaS 型 TODO 管理はデータが外部に保管され、オフラインでは使えず、スクリプトからの自動操作にも制約がある。API として手元に持てれば、自作クライアントや shell script から自由に組み合わせられる。

## U3 ゴール (goals)

| ID | ゴール |
|---|---|
| G1 | TODO データが端末外へ出ない (外部 network 送信 0 件) |
| G2 | 認証された利用者だけが自分の TODO を作成・参照・更新・削除できる |
| G3 | プロセス再起動後も TODO が失われない |
| G4 | 追加の常駐ミドルウェアなしに 1 コマンドで起動・停止・バックアップできる |

## U4 目標 (objectives)

| ID | 目標 | 測定基準 |
|---|---|---|
| O1 | 実装依存の外向き通信を 0 にし、依存パッケージも起動時に network を張らないものだけにする。 | 外向き通信処理 0 件 (レビューで確認) |
| O2 | すべての TODO エンドポイントを認証必須にし、未認証要求は 401 を返す。 | 全 TODO エンドポイントで未認証要求が 401 |
| O3 | 永続化先を単一ファイルにし、再起動後の一覧取得で登録済み TODO が全件戻る。 | 再起動後の一覧取得で全件復元 |
| O4 | 起動は 1 コマンド、バックアップはデータファイル 1 個のコピーで完了する。 | 起動 1 コマンド・バックアップ 1 ファイルコピー |

## U5 成功基準 (success_criteria)

- 受入テストで、未認証要求が全 TODO エンドポイントで 401 になる。
- 受入テストで、作成 → プロセス再起動 → 一覧取得を行い、作成した TODO が戻る。
- 依存関係と実装に外部 host への送信処理が 0 件であることをレビューで確認する。
- 起動手順が 1 コマンド、バックアップ手順が 1 ファイルコピーで記述できる。

## U6 ステークホルダー (stakeholders)

- 利用者兼開発者 (本人): 唯一の利用者であり、要求の確定権限を持つ。
- 運用者 (本人): 起動・停止・バックアップを行う。第三者運用は想定しない。

## U7 スコープ (scope)

- **対象 (in)**: 認証, TODO の CRUD, SQLite 永続化, localhost での HTTP 提供, 起動/バックアップ手順
- **対象外 (out)**: GUI クライアント実装, 複数ユーザー間の共有, 外部同期, クラウド配備, 通知機能

## U8 制約 (constraints)

- 外部 network への送信を実装に含めない (実行時の外向き通信 0)。
- 常駐ミドルウェア (別プロセスの DB サーバー等) を増やさない。
- 費用は 0 円 (無料・OSS のみ)。
- 単一プロセス・単一データファイルで完結させる。

## U9 具体的にやりたいこと (concrete_intents)

| ID | やりたいこと | 資するゴール |
|---|---|---|
| I1 | TODO の作成・一覧・単体取得・更新・完了・削除。 | G2 |
| I2 | 単一利用者向けの token 認証。 | G2 |
| I3 | SQLite ファイルへの永続化とスキーマ初期化。 | G3 |
| I4 | localhost バインドでの HTTP 提供と OpenAPI 定義の提供。 | G1, G4 |

## 意思決定支援 (decisions)

| ID | 論点 | 状態 | 選択肢 (費用・適合・注意点) | AI推奨 | ユーザー決定 | 資するゴール |
|---|---|---|---|---|---|---|
| D1 | 永続化先を SQLite と PostgreSQL のどちらにするか | confirmed | sqlite:SQLite (単一ファイル埋め込み DB) / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'ライセンス費 0 円。追加プロセスが無いため運用工数も最小で、撤退はデータファイル 1 個の削除で完了する'} / free=パブリックドメインで機能制限なし / fit=単一プロセス・単一ファイルという U8 制約と G4 に完全適合し、G3 の永続化も満たす / pros=常駐ミドルウェアを増やさない, バックアップがファイル 1 個のコピーで済む, 起動が 1 コマンドで完結する / cons=高並行の書込みには向かない, ネットワーク越しの共有利用ができない / risks=将来の多利用者化では移行が必要になる / lock-in=低 (SQL 標準の範囲で移行可能) / ops=低 / evidence=https://www.sqlite.org/docs.html<br>postgresql:PostgreSQL (サーバー型 RDBMS) / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'OSS ライセンス費 0 円だが、常駐サーバーの導入・更新・バックアップ運用の工数が加算される'} / free=OSS で機能制限なし / fit=多利用者・高並行には適合するが、常駐ミドルウェアを増やさない U8 制約と G4 に反する / pros=高い並行性能, 豊富な拡張機能 / cons=別プロセスの常駐が必要, バックアップ手順がファイルコピーで完結しない / risks=単一利用者用途に対して運用負荷が過大になる / lock-in=低 (OSS・標準 SQL) / ops=高 / evidence=https://www.postgresql.org/docs/ | sqlite — 常駐プロセスを増やさず単一ファイルで完結するため U8 制約下で G1/G3/G4 を同時に満たす唯一の候補である (注意: 将来多利用者化する場合はサーバー型 RDBMS への移行を再検討する, 採択時点の現行 version は doc-fetch の fetched-references.json で裏取りする; confidence=high; checked=2026-07-21T00:00:00Z) | sqlite @ 2026-07-21T00:00:00Z | G1, G3, G4 |
| D2 | API framework を FastAPI と Flask のどちらにするか | confirmed | fastapi:FastAPI (ASGI・型注釈ベース) / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'MIT ライセンスで 0 円。OpenAPI 自動生成により定義の手書き保守工数が発生しない'} / free=OSS で機能制限なし / fit=OpenAPI 定義の提供という U9 の要求と、schema 検証による G2 の入力健全性へ直結する / pros=OpenAPI 定義を自動生成する, 型注釈から入力検証が導出される, 依存性注入で認証を全経路へ強制しやすい / cons=型注釈の記述量が増える / risks=メジャー更新時に型まわりの破壊的変更が入りうる / lock-in=中 (ルーティングと依存性注入が framework 固有) / ops=低 / evidence=https://fastapi.tiangolo.com/<br>flask:Flask (WSGI・最小構成) / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'BSD ライセンスで 0 円。ただし OpenAPI 定義と入力検証は追加実装・追加保守が必要'} / free=OSS で機能制限なし / fit=REST 提供自体は満たすが、OpenAPI 定義提供 (U9) は拡張実装が前提になる / pros=最小の依存で軽量, 学習コストが低い / cons=OpenAPI 定義を自動生成しない, 入力 schema 検証を別途導入する必要がある / risks=検証実装の自作により入力健全性の抜けが生じうる / lock-in=低 / ops=中 / evidence=https://flask.palletsprojects.com/ | fastapi — OpenAPI 自動生成と schema 検証が U9 の成果物要求と G2 の入力健全性を追加実装なしで満たす (注意: framework 固有 API を router 層に閉じ込めて lock-in を局所化する, 採択時点の現行 version は doc-fetch の fetched-references.json で裏取りする; confidence=high; checked=2026-07-21T00:00:00Z) | fastapi @ 2026-07-21T00:00:00Z | G2, G4 |
| D3 | 認証方式をローカル bearer token と OAuth2 password/JWT のどちらにするか | confirmed | local-bearer-token:ローカル生成 bearer token (単一利用者) / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': '外部 IdP を持たないため利用料 0 円。token 再生成手順のみが運用作業になる'} / free=外部サービスに依存しないため上限なし / fit=単一利用者で G2 を満たす最小構成であり、外部 IdP 通信が無いため G1 とも両立する / pros=外部依存が 0 で G1 に適合する, 実装と運用が最小 / cons=利用者間の権限分離には拡張が必要 / risks=token 漏洩時は再生成が必要になる / lock-in=低 (自前実装) / ops=低 / evidence=https://fastapi.tiangolo.com/tutorial/security/<br>oauth2-password-jwt:OAuth2 password grant + JWT / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': '自前実装なら 0 円だが、鍵管理・失効・有効期限運用の工数が継続的に加算される'} / free=自前実装のため上限なし / fit=多利用者・多クライアントには適合するが、単一利用者の G2 に対しては過剰である / pros=標準化された枠組み, 将来の多クライアント化に拡張しやすい / cons=鍵管理と失効の設計が必要, 単一利用者に対して構成が過剰 / risks=鍵運用の誤りによる認証迂回 / lock-in=低 (標準仕様) / ops=高 / evidence=https://datatracker.ietf.org/doc/html/rfc6749 | local-bearer-token — 利用者が 1 名で外部 IdP を持たない前提では、G2 を満たす最小かつ外向き通信 0 の構成である (注意: token は平文保存せずハッシュ保存する, 多利用者化する場合は認証方式を再検討する, 採択時点の現行 version は doc-fetch の fetched-references.json で裏取りする; confidence=high; checked=2026-07-21T00:00:00Z) | local-bearer-token @ 2026-07-21T00:00:00Z | G2 |
