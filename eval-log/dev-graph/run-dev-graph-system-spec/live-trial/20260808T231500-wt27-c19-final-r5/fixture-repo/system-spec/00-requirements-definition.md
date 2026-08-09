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

自分の TODO を、いかなる外部サービスにもデータを渡さずに、手元の 1 プロセスだけで
管理・自動化できる状態にする。

## U2 背景 (background)

既存の SaaS 型 TODO 管理はデータが外部に保管され、オフラインでは使えず、
スクリプトからの自動操作にも制約がある。API として手元に持てれば、
自作クライアントや shell script から自由に組み合わせられる。

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
| O1 | G1: 実装依存の外向き通信を 0 にし、依存パッケージも起動時に network を張らないものだけにする。 | N/A (未収集): requirements-brief.md の U5 成功基準は goal 単位の記述のみで、objective 単位の測定基準は書面に無いため推論で埋めず fail-closed に残す |
| O2 | G2: すべての TODO エンドポイントを認証必須にし、未認証要求は 401 を返す。 | N/A (未収集): requirements-brief.md の U5 成功基準は goal 単位の記述のみで、objective 単位の測定基準は書面に無いため推論で埋めず fail-closed に残す |
| O3 | G3: 永続化先を単一ファイルにし、再起動後の一覧取得で登録済み TODO が全件戻る。 | N/A (未収集): requirements-brief.md の U5 成功基準は goal 単位の記述のみで、objective 単位の測定基準は書面に無いため推論で埋めず fail-closed に残す |
| O4 | G4: 起動は 1 コマンド、バックアップはデータファイル 1 個のコピーで完了する。 | N/A (未収集): requirements-brief.md の U5 成功基準は goal 単位の記述のみで、objective 単位の測定基準は書面に無いため推論で埋めず fail-closed に残す |

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
| I1 | TODO の作成・一覧・単体取得・更新・完了・削除。 | G2, G3 |
| I2 | 単一利用者向けの token 認証。 | G2 |
| I3 | SQLite ファイルへの永続化とスキーマ初期化。 | G1, G3 |
| I4 | localhost バインドでの HTTP 提供と OpenAPI 定義の提供。 | G1, G4 |

## 意思決定支援 (decisions)

| ID | 論点 | 状態 | 選択肢 (費用・適合・注意点) | AI推奨 | ユーザー決定 | 資するゴール |
|---|---|---|---|---|---|---|
| D1 | 永続化先を sqlite と postgresql のどちらにするか | confirmed | sqlite:SQLite 単一ファイル永続化 / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'ライセンス0円。常駐プロセス無しのため運用・撤退費もファイル1個の複製コストに収まる'} / free=制限なし (組込みライブラリ) / fit=単一ファイル・単一プロセスで G1/G3/G4 に適合 / pros=常駐ミドルウェア不要, バックアップがファイル1個の複製 / cons=高並行書込に弱い / risks=単一ファイル破損時の復旧が必要 / lock-in=低 (SQL 標準寄り) / ops=低 / evidence=https://www.sqlite.org/docs.html<br>postgresql:PostgreSQL サーバー永続化 / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'OSS ライセンスは0円だが常駐サーバーの構築・更新・バックアップ運用工数が加算される'} / free=OSS のため機能制限なし / fit=多利用者・高並行には適合するが単一利用者要求には過剰 / pros=高並行・拡張機能が豊富 / cons=常駐プロセスが増える, 起動が1コマンドで完結しない / risks=U8 の常駐ミドルウェア禁止制約に抵触 / lock-in=中 / ops=高 / evidence=https://www.postgresql.org/docs/ | sqlite — 常駐プロセスを増やさず単一ファイルで完結し G1/G4 の制約に適合する (注意: 高並行書込が必要になった場合は再評価が要る; confidence=high; checked=2026-08-08T14:18:30Z) | sqlite @ 2026-07-21T00:00:00Z | G1, G3, G4 |
| D2 | API framework を fastapi と flask のどちらにするか | confirmed | fastapi:FastAPI / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'OSS で0円。OpenAPI 自動生成により契約文書の維持工数も下がる'} / free=制限なし (OSS) / fit=OpenAPI 自動生成と schema 検証が G2/U9 に直結 / pros=OpenAPI 自動生成, 型による入力検証 / cons=依存パッケージが相対的に多い / risks=メジャー更新時の pydantic 互換差分 / lock-in=低 (ASGI 標準) / ops=低 / evidence=https://fastapi.tiangolo.com/<br>flask:Flask / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'OSS で0円だが OpenAPI と schema 検証を拡張で自作する工数が加算'} / free=制限なし (OSS) / fit=最小構成だが OpenAPI 提供を自前実装する必要がある / pros=依存が少ない, 学習コストが低い / cons=OpenAPI 定義を自作, schema 検証が標準でない / risks=契約文書と実装の乖離 / lock-in=低 / ops=中 / evidence=https://flask.palletsprojects.com/ | fastapi — OpenAPI 自動生成と schema 検証が U9 の OpenAPI 提供要求と G2 に直結する (注意: 依存パッケージが起動時に外向き通信をしないことを確認する; confidence=high; checked=2026-08-08T14:18:31Z) | fastapi @ 2026-07-21T00:00:00Z | G2, G4 |
| D3 | 認証方式を local-bearer-token と oauth2-password-jwt のどちらにするか | confirmed | local-bearer-token:ローカル生成 bearer token / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': '外部 IdP 契約なしで0円。token 再生成手順のみが運用費'} / free=外部サービス非依存のため上限なし / fit=単一利用者で G2 を満たす最小構成 / pros=外部 IdP 不要, 外向き通信を増やさない / cons=利用者増加時に権限管理が不足 / risks=token 漏洩時の失効手順が必要 / lock-in=低 / ops=低 / evidence=https://fastapi.tiangolo.com/tutorial/security/<br>oauth2-password-jwt:OAuth 2.0 password grant + JWT / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': '仕様準拠の実装・鍵管理・失効管理の工数が加算'} / free=仕様自体は無料 / fit=多利用者・外部 IdP 連携が要る場合に適合 / pros=標準仕様, 将来の外部 IdP 連携が容易 / cons=単一利用者には過剰, 鍵・失効管理が増える / risks=password grant は仕様上非推奨化の流れ / lock-in=中 / ops=高 / evidence=https://datatracker.ietf.org/doc/html/rfc6749 | local-bearer-token — 単一利用者・外部 IdP なしで G2 を満たす最小構成であり U8 の外向き通信0制約に適合する (注意: 利用者が増える場合は認可モデルごと再評価する; confidence=high; checked=2026-08-08T14:18:31Z) | local-bearer-token @ 2026-07-21T00:00:00Z | G2 |
