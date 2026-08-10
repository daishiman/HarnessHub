# 要求 brief: ローカル専用 TODO REST API

> **本ファイルは要求 brief (入力) であり、system-spec-harness の状態ファイルではない。**
> `spec-state.json` / 章 Markdown / `fetched-references.json` / `index.md` /
> `completeness-report.json` は、run-system-spec-elicit → run-system-spec-doc-fetch →
> run-system-spec-compile → assign-system-spec-completeness-evaluator が本 brief を
> 入力として生成する。本 brief を state の代替として直接章へ転記しないこと。
> brief 確定日時 (承認基準時刻): 2026-07-21T00:00:00Z

## 0. 一次要求

ローカル専用の TODO REST API を作りたい。認証、TODO の CRUD、SQLite への永続化を持ち、
外部 network への通信は一切行わない。単一プロセスを localhost で起動して使う。

## 1. 上位概念 (U1-U9)

### U1 本質的目的 (essential_purpose)

自分の TODO を、いかなる外部サービスにもデータを渡さずに、手元の 1 プロセスだけで
管理・自動化できる状態にする。

### U2 背景 (background)

既存の SaaS 型 TODO 管理はデータが外部に保管され、オフラインでは使えず、
スクリプトからの自動操作にも制約がある。API として手元に持てれば、
自作クライアントや shell script から自由に組み合わせられる。

### U3 ゴール (goals)

| goal_id | text |
| --- | --- |
| G1 | TODO データが端末外へ出ない (外部 network 送信 0 件) |
| G2 | 認証された利用者だけが自分の TODO を作成・参照・更新・削除できる |
| G3 | プロセス再起動後も TODO が失われない |
| G4 | 追加の常駐ミドルウェアなしに 1 コマンドで起動・停止・バックアップできる |

### U4 目標 (objectives)

- G1: 実装依存の外向き通信を 0 にし、依存パッケージも起動時に network を張らないものだけにする。
- G2: すべての TODO エンドポイントを認証必須にし、未認証要求は 401 を返す。
- G3: 永続化先を単一ファイルにし、再起動後の一覧取得で登録済み TODO が全件戻る。
- G4: 起動は 1 コマンド、バックアップはデータファイル 1 個のコピーで完了する。

### U5 成功基準 (success_criteria)

- 受入テストで、未認証要求が全 TODO エンドポイントで 401 になる。
- 受入テストで、作成 → プロセス再起動 → 一覧取得を行い、作成した TODO が戻る。
- 依存関係と実装に外部 host への送信処理が 0 件であることをレビューで確認する。
- 起動手順が 1 コマンド、バックアップ手順が 1 ファイルコピーで記述できる。

### U6 ステークホルダー (stakeholders)

- 利用者兼開発者 (本人): 唯一の利用者であり、要求の確定権限を持つ。
- 運用者 (本人): 起動・停止・バックアップを行う。第三者運用は想定しない。

### U7 スコープ (scope)

- in: 認証、TODO の CRUD、SQLite 永続化、localhost での HTTP 提供、起動/バックアップ手順。
- out: GUI クライアント実装、複数ユーザー間の共有、外部同期、クラウド配備、通知機能。

### U8 制約 (constraints)

- 外部 network への送信を実装に含めない (実行時の外向き通信 0)。
- 常駐ミドルウェア (別プロセスの DB サーバー等) を増やさない。
- 費用は 0 円 (無料・OSS のみ)。
- 単一プロセス・単一データファイルで完結させる。

### U9 具体的にやりたいこと (concrete_intents)

- TODO の作成・一覧・単体取得・更新・完了・削除。
- 単一利用者向けの token 認証。
- SQLite ファイルへの永続化とスキーマ初期化。
- localhost バインドでの HTTP 提供と OpenAPI 定義の提供。

## 2. プラットフォーム方針 (収集マトリクスの platform 軸)

platform 軸は「本システムが成果物を提供する対象クライアント種別」と解釈する。

| platform | 方針 | 理由 (対象外セルの reason に使う) |
| --- | --- | --- |
| web | **対象** | HTTP/REST クライアント全般へ localhost 上で API を提供するため |
| mobile | 対象外 | 本システムはクライアント実装を含まず、モバイル向け成果物を作らないため |
| tablet | 対象外 | 本システムはクライアント実装を含まず、タブレット向け成果物を作らないため |
| desktop-windows | 対象外 | 本システムはクライアント実装を含まず、デスクトップアプリ成果物を作らないため |
| desktop-linux | 対象外 | 本システムはクライアント実装を含まず、デスクトップアプリ成果物を作らないため |
| desktop-macos | 対象外 | 本システムはクライアント実装を含まず、デスクトップアプリ成果物を作らないため |

したがって 8 カテゴリ × 6 platform = 48 セルのうち、web 列 8 セルが `確定`、
残り 40 セルが理由付きの `対象外` となり、未収集は 0 になる。

## 3. カテゴリ別の確定回答 (web 列)

各回答は往復ヒアリングの回答済み内容として扱ってよい。`serves_goals` は下表のとおり。

| category | 確定内容 | serves_goals |
| --- | --- | --- |
| database | SQLite ファイル 1 個 (`todo.db`)。テーブルは `todos` と `api_tokens`。起動時にスキーマを冪等作成し、マイグレーションは単調増加の SQL 版数で管理する。 | G1, G3, G4 |
| auth | 単一利用者向けの bearer token 認証。token は初回起動時にローカル生成し、ハッシュ化して保存する。全 TODO エンドポイントで必須、未認証は 401。 | G2 |
| ui-ux | UI は持たない。API の使い勝手として、エラー応答を `{"error": {"code", "message"}}` に統一し、OpenAPI 定義を `/openapi.json` でローカル提供する。 | G2, G4 |
| security | localhost (127.0.0.1) バインド固定、外向き通信なし、token はハッシュ保存、入力は schema 検証、SQL は必ずパラメータバインド。 | G1, G2 |
| infrastructure | 常駐ミドルウェアなし。1 コマンド起動、データはファイル 1 個。バックアップはそのファイルのコピー。 | G1, G4 |
| backend | Python の ASGI/WSGI ベース REST API。`/todos` の CRUD と完了操作、`/health`。層は router / service / repository の 3 層。 | G2, G3 |
| frontend | 専用フロントエンドを実装しない。動作確認は OpenAPI 定義と HTTP クライアント (curl 等) で行う。 | G4 |
| maintenance-ops | 構造化ログを標準出力へ、`/health` で稼働確認、バックアップ/復旧手順を README 化。監視の外部送信は行わない。 | G3, G4 |

## 4. 技術選定の候補と公式出典 (doc-fetch 対象)

各論点について、以下の候補と公式ドキュメントを比較材料とする。
候補はすべて無料 (free) であり、追加費用は発生しない。
**採択欄は利用者が事前に確定済み**であり、再確認は不要 (§6 参照)。

| decision_id | 論点 | 候補 (target_id) | 公式ドキュメント (official_host) | 採択 |
| --- | --- | --- | --- | --- |
| D1 | 永続化先 | `sqlite` / `postgresql` | https://www.sqlite.org/docs.html (www.sqlite.org) / https://www.postgresql.org/docs/ (www.postgresql.org) | `sqlite` (常駐プロセスを増やさない・単一ファイルで G1/G4 に適合) |
| D2 | API framework | `fastapi` / `flask` | https://fastapi.tiangolo.com/ (fastapi.tiangolo.com) / https://flask.palletsprojects.com/ (flask.palletsprojects.com) | `fastapi` (OpenAPI 自動生成と schema 検証が G2/U9 に直結) |
| D3 | 認証方式 | `local-bearer-token` / `oauth2-password-jwt` | https://fastapi.tiangolo.com/tutorial/security/ (fastapi.tiangolo.com) / https://datatracker.ietf.org/doc/html/rfc6749 (datatracker.ietf.org) | `local-bearer-token` (単一利用者・外部 IdP なしで G2 を満たす最小構成) |

serves_goals: D1 → G1, G3, G4 / D2 → G2, G4 / D3 → G2。

## 5. 非対象 (再質問不要)

- 複数ユーザー・組織・権限ロール。
- 外部サービス連携、通知、カレンダー同期。
- クラウド配備、コンテナオーケストレーション、CDN。
- ネイティブ GUI クライアント (mobile / tablet / desktop)。

## 6. ヒアリング運用条件 (この brief の扱い)

- 本 brief に答えがある問いは、brief の記述をユーザー回答とみなす。`AskUserQuestion` で
  人へ聞き返さない (live-trial は非対話で完走する必要がある)。
- 本 brief に答えがない問いが生じた場合は、§1 の U1-U9 と §5 の非対象から導ける
  最小構成を採り、その判断根拠を該当セル/decision の記述に残す。
- `source.kind=written-requirements` の `answer` は、指定 path/section に実在する
  本 brief の逐語 excerpt とする。`source.sha256` はその `answer` の UTF-8 bytes
  から計算し、AI が生成した要約・判断・qa entry 自身の digest を代用しない。
- 本 trial 中に新しい利用者入力は生じない。既存の§7 一括承認を根拠にし、
  AI 自身を承認者とする新規 approval を作らない。

## 7. 一括承認 (approval_log の根拠)

利用者は 2026-07-21T00:00:00Z 時点で、以下をまとめて承認済みである。

- §1 の上位概念 U1-U9 の要約 (requirements_foundation の confirmed 根拠)。
- §2 のプラットフォーム方針と、それに伴う 40 セルの対象外判断。
- §3 のカテゴリ別確定内容。
- §4 の採択 (D1 `sqlite` / D2 `fastapi` / D3 `local-bearer-token`)。
