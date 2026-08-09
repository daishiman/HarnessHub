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
| O1 | G1: 実装依存の外向き通信を 0 にし、依存パッケージも起動時に network を張らないものだけにする。 | 依存関係と実装に外部 host への送信処理が 0 件であることをレビューで確認する。 |
| O2 | G2: すべての TODO エンドポイントを認証必須にし、未認証要求は 401 を返す。 | 受入テストで、未認証要求が全 TODO エンドポイントで 401 になる。 |
| O3 | G3: 永続化先を単一ファイルにし、再起動後の一覧取得で登録済み TODO が全件戻る。 | 受入テストで、作成 → プロセス再起動 → 一覧取得を行い、作成した TODO が戻る。 |
| O4 | G4: 起動は 1 コマンド、バックアップはデータファイル 1 個のコピーで完了する。 | 起動手順が 1 コマンド、バックアップ手順が 1 ファイルコピーで記述できる。 |

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
| I1 | TODO の作成・一覧・単体取得・更新・完了・削除。 | G1, G2, G3 |
| I2 | 単一利用者向けの token 認証。 | G2 |
| I3 | SQLite ファイルへの永続化とスキーマ初期化。 | G1, G3 |
| I4 | localhost バインドでの HTTP 提供と OpenAPI 定義の提供。 | G1, G4 |

## 意思決定支援 (decisions)

| ID | 論点 | 状態 | 選択肢 (費用・適合・注意点) | AI推奨 | ユーザー決定 | 資するゴール |
|---|---|---|---|---|---|---|
| D1 | 永続化先を sqlite と postgresql のどちらにするか | confirmed | sqlite:SQLite 単一ファイル / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'ライセンス 0 円。構築・運用・移行・撤退費とも自作 script の工数のみで、追加課金は発生しない'} / free=OSS (public domain) で利用上限なし / fit=単一プロセス・単一ファイルで G1/G3/G4 を同時に満たす / pros=常駐ミドルウェアを増やさない, バックアップがファイル 1 個のコピーで済む, 現行版 3.53.4 が公式に明示されている / cons=同時書込みの並行度が低い, ユーザー管理やネットワーク認証を DB 側に持てない / risks=将来マルチユーザー化する場合は移行が必要 / lock-in=低 (SQL 標準の範囲で移行可能) / ops=低 / evidence=https://www.sqlite.org/index.html<br>postgresql:PostgreSQL サーバ / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'ライセンス 0 円。構築・運用・移行・撤退費とも自作 script の工数のみで、追加課金は発生しない'} / free=OSS (PostgreSQL License) で利用上限なし / fit=単一利用者・単一プロセス制約に対して機能が過剰で G4 に反する / pros=並行書込みと権限管理が強い, 現行安定版 18 が保守されている / cons=常駐サーバプロセスが必要, バックアップ手順が dump 運用になり 1 ファイルコピーで完結しない / risks=運用対象が 1 個増え U8 の常駐ミドルウェア禁止に抵触する / lock-in=中 (拡張機能を使うと移行コストが上がる) / ops=高 / evidence=https://www.postgresql.org/docs/ | sqlite — U8 の常駐ミドルウェア禁止と U4 の 1 ファイルバックアップを同時に満たすのは SQLite だけである (注意: 同時書込みが増える将来要件が出た場合は再評価が要る, SQLite の版は公式トップページの Latest Release を都度再確認する; confidence=high; checked=2026-08-08T08:45:43.824Z) | sqlite @ 2026-07-21T00:00:00Z | G1, G3, G4 |
| D2 | API framework を fastapi と flask のどちらにするか | confirmed | fastapi:FastAPI (ASGI) / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'ライセンス 0 円。構築・運用・移行・撤退費とも自作 script の工数のみで、追加課金は発生しない'} / free=OSS (MIT) で利用上限なし / fit=OpenAPI 自動生成と schema 検証が U9 の /openapi.json 提供と G2 に直結する / pros=OpenAPI 定義を追加実装なしで提供できる, 型注釈ベースの入力検証が標準, 現行版 0.141.1 (2026-07-29) が公式 release notes に明示 / cons=0.x 系のため minor 更新で破壊的変更が入り得る, ASGI server (uvicorn 等) の同梱が要る / risks=版更新時に依存の追随が必要 / lock-in=低 (ASGI/OpenAPI の標準に乗る) / ops=低 / evidence=https://fastapi.tiangolo.com/release-notes/<br>flask:Flask (WSGI) / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'ライセンス 0 円。構築・運用・移行・撤退費とも自作 script の工数のみで、追加課金は発生しない'} / free=OSS (BSD-3-Clause) で利用上限なし / fit=最小構成では動くが OpenAPI 提供に拡張が必要で U9 を素で満たさない / pros=安定版 3.1.x (stable; Changes 先頭は 3.1.3) で API が枯れている, 依存が小さい / cons=OpenAPI 生成が標準にない, schema 検証を別途実装する必要がある / risks=拡張選定と保守が増え G4 の運用簡素化に反する / lock-in=低 / ops=中 / evidence=https://flask.palletsprojects.com/ | fastapi — OpenAPI 定義提供 (U9) と schema 検証 (G2) を追加実装なしで満たせる (注意: 0.x 系のため更新時に release notes の破壊的変更を確認する, 外部 network 送信 0 の制約上、docs UI の CDN 依存を使わない構成にする; confidence=high; checked=2026-08-08T08:45:43.824Z) | fastapi @ 2026-07-21T00:00:00Z | G2, G4 |
| D3 | 認証方式を local-bearer-token と oauth2-password-jwt のどちらにするか | confirmed | local-bearer-token:ローカル生成 bearer token / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'ライセンス 0 円。構築・運用・移行・撤退費とも自作 script の工数のみで、追加課金は発生しない'} / free=外部 IdP を使わないため利用上限なし / fit=単一利用者で G2 (認証必須・未認証 401) を最小構成で満たす / pros=外部 IdP も外向き通信も不要, 初回起動時のローカル生成だけで完結する / cons=token 失効・ローテーションを自前で設計する必要がある, 多要素認証は別途 / risks=token 平文流出時の被害。ハッシュ保存と localhost バインドで緩和する / lock-in=低 / ops=低 / evidence=https://fastapi.tiangolo.com/tutorial/security/<br>oauth2-password-jwt:OAuth2 password grant + JWT / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'ライセンス 0 円。構築・運用・移行・撤退費とも自作 script の工数のみで、追加課金は発生しない'} / free=仕様自体は無償だが認可サーバの運用が要る / fit=複数クライアント・第三者委譲が無い本要件では過剰で G1 の外部通信 0 とも整合しにくい / pros=標準仕様で相互運用性が高い, スコープ委譲を表現できる / cons=認可サーバ相当の実装/運用が増える, 単一利用者には不要な役割分離を持ち込む / risks=実装を誤ると token 露出などの既知リスクを取り込む (implicit grant の注意点) / lock-in=中 / ops=高 / evidence=https://datatracker.ietf.org/doc/html/rfc6749 | local-bearer-token — 単一利用者・外部 IdP なしで G2 を満たす最小構成であり、U8 の外部通信 0 と両立する (注意: token ローテーションと失効の手順を運用章に残す, 将来第三者クライアントを許すなら RFC 6749 系へ再評価する; confidence=high; checked=2026-08-08T08:45:43.824Z) | local-bearer-token @ 2026-07-21T00:00:00Z | G2 |
