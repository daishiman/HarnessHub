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
| O1 | G1: 実装依存の外向き通信を 0 にし、依存パッケージも起動時に network を張らないものだけにする。 | 依存関係と実装のレビューで外部 host への送信処理が 0 件、起動時の外向き通信が 0 件であることを確認する。 |
| O2 | G2: すべての TODO エンドポイントを認証必須にし、未認証要求は 401 を返す。 | 受入テストで未認証要求が全 TODO エンドポイントで 401 になることを確認する。 |
| O3 | G3: 永続化先を単一ファイルにし、再起動後の一覧取得で登録済み TODO が全件戻る。 | 受入テストで作成、プロセス再起動、一覧取得を行い、作成した TODO が全件戻ることを確認する。 |
| O4 | G4: 起動は 1 コマンド、バックアップはデータファイル 1 個のコピーで完了する。 | 運用手順に起動 1 コマンドとバックアップ 1 ファイルコピーが記載され、手順どおり成功することを確認する。 |

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
| I3 | SQLite ファイルへの永続化とスキーマ初期化。 | G1, G3 |
| I4 | localhost バインドでの HTTP 提供と OpenAPI 定義の提供。 | G1, G4 |

## 意思決定支援 (decisions)

| ID | 論点 | 状態 | 選択肢 (費用・適合・注意点) | AI推奨 | ユーザー決定 | 資するゴール |
|---|---|---|---|---|---|---|
| D1 | 永続化先を sqlite と postgresql のどちらにするか | confirmed | sqlite:SQLite 単一ファイル埋込 DB / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'ライセンス 0 円。別プロセス DB を持たないため構築・運用・撤退費も追加 0 円で、バックアップはデータファイル 1 個のコピー。'} / free=無料枠の概念なし (public domain・機能制限なし) / fit=常駐ミドルウェアを増やさず単一ファイルで永続化でき G1/G3/G4 に直接適合 / pros=常駐プロセス 0, データファイル 1 個でバックアップ・復旧が完結, 起動 1 コマンドで初期化できる / cons=高並行の書込には向かない, ネットワーク越し共有ができない / risks=将来多利用者化する場合は移行が必要 / lock-in=低 (SQL 標準寄り・ファイル移送のみ) / ops=低 / evidence=https://www.sqlite.org/changes.html<br>postgresql:PostgreSQL サーバ型 RDBMS / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'ライセンス 0 円だが、常駐 server プロセスの構築・監視・版更新・撤退作業が運用費として恒常的に加算される。'} / free=OSS のため機能制限なし (自前運用の運用コストが実質の負担) / fit=単一利用者・単一プロセス制約に対し過剰で、常駐ミドルウェア不追加 (U8) に反する / pros=高並行・高機能, 厳密な型と拡張が豊富 / cons=別プロセスの常駐が必要, バックアップ手順がファイル 1 個コピーで完結しない / risks=運用対象が増え toil が増加する / lock-in=中 (拡張機能利用時) / ops=高 / evidence=https://www.postgresql.org/docs/ | sqlite — 常駐ミドルウェアを増やさず単一ファイルで G1/G3/G4 を同時に満たせるのは sqlite だけで、postgresql の並行性能は本 scenario の単一利用者要求では利得にならない (注意: 多利用者・高並行要求が生じた時点で再評価が必要, 同時書込を増やす設計変更時は WAL 設定を再検討する; confidence=high; checked=2026-08-08T15:11:29Z) | sqlite @ 2026-07-21T00:00:00Z | G1, G3, G4 |
| D2 | API framework を fastapi と flask のどちらにするか | confirmed | fastapi:FastAPI (ASGI) / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'MIT ライセンスで 0 円。OpenAPI と schema 検証が標準添付のため追加実装・保守費が発生しない。'} / free=OSS・機能制限なし / fit=OpenAPI 自動生成と型による入力検証が U9 の OpenAPI 提供と G2 の認証必須化に直結 / pros=OpenAPI を追加実装なしで /openapi.json 提供できる, 型注釈から入力検証が生成される, 依存性注入で認証を全 endpoint に強制しやすい / cons=ASGI server (uvicorn 等) が別途必要 / risks=0.x 系のためマイナー版間の変更に追随が要る / lock-in=低 (ASGI 標準・OpenAPI 出力) / ops=低 / evidence=https://fastapi.tiangolo.com/release-notes/<br>flask:Flask (WSGI micro framework) / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'BSD-3-Clause で 0 円。ただし OpenAPI 生成と schema 検証を拡張または自前実装する保守費が加算される。'} / free=OSS・機能制限なし / fit=REST 提供自体は可能だが OpenAPI 定義提供 (U9) が標準機能でなく追加実装になる / pros=軽量で学習コストが低い, WSGI で成熟している / cons=OpenAPI 自動生成が標準でない, schema 検証を拡張に依存する / risks=検証・文書生成を自前実装すると仕様と実装が乖離しやすい / lock-in=低 / ops=中 / evidence=https://flask.palletsprojects.com/ | fastapi — OpenAPI 定義のローカル提供と入力 schema 検証が標準機能として揃うため、追加実装なしで U9 と G2 を満たせる (注意: ASGI server (uvicorn 等) の起動コマンドを運用手順に含める, 0.x 系のため更新時は release notes を確認する; confidence=high; checked=2026-08-08T15:12:08Z) | fastapi @ 2026-07-21T00:00:00Z | G2, G4 |
| D3 | 認証方式を local-bearer-token と oauth2-password-jwt のどちらにするか | confirmed | local-bearer-token:ローカル生成 bearer token (ハッシュ保存) / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': '外部 IdP を使わないため 0 円。token 生成とハッシュ保存のみで運用費が発生しない。'} / free=外部サービスを使わないため上限なし / fit=単一利用者で外部 IdP を持たずに全 endpoint を認証必須にでき G2 に適合 / pros=外部 network 通信が 0 のまま認証できる, 初回起動時のローカル生成だけで完結, 実装面が小さく検証しやすい / cons=token 失効・ローテーションを自前で設計する必要がある, 多利用者・権限ロールには向かない / risks=token 保管を誤ると単一の資格情報漏洩が全権限漏洩になる / lock-in=低 / ops=低 / evidence=https://fastapi.tiangolo.com/tutorial/security/<br>oauth2-password-jwt:OAuth 2.0 (password grant) + JWT / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': '仕様自体は 0 円だが、authorization server 相当の実装・鍵管理・失効設計の構築と保守が加算される。'} / free=規格のため上限なし (実装/IdP 側の条件に依存) / fit=第三者アプリへの認可委譲が本質で、単一利用者・外部連携なしの U7 スコープに対し過剰 / pros=標準化された認可フレームワーク, 将来の多クライアント化に拡張しやすい / cons=authorization server 相当の構成が必要, 単一利用者には構成要素が過剰 / risks=password grant の非推奨化に追随する改修が必要 / lock-in=中 (IdP 採用時) / ops=高 / evidence=https://datatracker.ietf.org/doc/html/rfc6749 | local-bearer-token — 外部 IdP と外向き通信を持ち込まずに全 TODO endpoint を認証必須化でき、単一利用者要求に対する最小構成で G2 を満たす (注意: token のローテーション手順を運用手順へ明記する, RFC 6749 は RFC 8252 / 8996 / 9700 で更新済みのため将来外部連携する際は再評価する; confidence=high; checked=2026-08-08T15:12:30Z) | local-bearer-token @ 2026-07-21T00:00:00Z | G2 |
