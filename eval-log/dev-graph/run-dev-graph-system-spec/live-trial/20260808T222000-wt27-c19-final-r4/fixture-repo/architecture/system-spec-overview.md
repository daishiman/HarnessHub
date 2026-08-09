---
graph_node_id: "arch-system-spec-overview"
artifact_kind: "architecture"
artifact_subtypes: ["backend","data","security"]
project_id: "system-spec-import"
domain: "system-spec"
tags: ["system-spec","source-lineage","imported"]
priority: null
start_date: null
target_date: null
iteration: null
title: "system-spec architecture overview"
owners: ["system-spec-harness"]
created_at: "2026-08-08T13:48:53Z"
updated_at: "2026-08-08T13:48:53Z"
status: "active"
depends_on: []
related_nodes: []
resource_scope: ["system-spec/00-requirements-definition.md","system-spec/completeness-report.json"]
purpose: "確定済み system-spec の architecture context を参照可能にする。"
goal: "仕様由来の architecture context を feature から参照できる状態。"
scope_in: ["confirmed system-spec requirements artifact"]
scope_out: ["confirmed artifacts are not rewritten by this adapter"]
acceptance: ["source lineage と evaluator evidence を保持する","C02 でのみ登録する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "architecture/system-spec-overview.md"
template_id: "architecture"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"6f5f1812820ab23a710efc7d1548585b62a7e8fe50f409b4ac2bf81bdfd8d38a","evaluator":"system-spec-harness/assign-system-spec-completeness-evaluator","evidence_ref":"system-spec/completeness-report.json"}
source_lineage: {"imported_at":"2026-08-08T13:48:53Z","origin_kind":"system-spec-harness","source_digest":"e35bda383b88490c0b0cfa65ee53924f0d14d7c8a42aa4688d70175e85d217eb","source_path":"system-spec/00-requirements-definition.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 1.0
classification_reason: "system-spec-harness が確定した architecture context の import。"
classification_candidates: [{"artifact_kind":"architecture","candidate_path":"architecture/system-spec-overview.md","confidence":1.0}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-08T13:48:53Z","evidence_refs":["system-spec/completeness-report.json"],"policy":"manual","reconciled_at":"2026-08-08T13:48:53Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-08-08T13:48:53Z","missing_sections":[],"status":"complete"}
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
| I1 | TODO の作成・一覧・単体取得・更新・完了・削除。 | - |
| I2 | 単一利用者向けの token 認証。 | - |
| I3 | SQLite ファイルへの永続化とスキーマ初期化。 | - |
| I4 | localhost バインドでの HTTP 提供と OpenAPI 定義の提供。 | - |

## 意思決定支援 (decisions)

| ID | 論点 | 状態 | 選択肢 (費用・適合・注意点) | AI推奨 | ユーザー決定 | 資するゴール |
|---|---|---|---|---|---|---|
| D1 | 永続化先を sqlite と postgresql のどちらにするか | confirmed | sqlite:SQLite (単一ファイル・組込み) / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'ライセンス費 0 円。常駐 DB プロセスが無く運用工数は起動時スキーマ作成とファイル 1 個のバックアップのみ。移行/撤退はファイルコピーで完了する'} / free=制限なし (public domain の組込みライブラリで利用上限が無い) / fit=単一ファイル永続化で G3 (再起動後も消えない) と G4 (1 コマンド起動・1 ファイルバックアップ) を同時に満たし、常駐プロセスを増やさない U8 制約に適合する / pros=常駐ミドルウェア不要で単一プロセスに収まる, データファイル 1 個のコピーでバックアップ/復旧が完了する, 公式 change log で現行版 3.53.4 (2026-07-24) が確認でき保守が継続している / cons=高並行の書込みには向かない, ネットワーク越しの共有利用ができない / risks=将来的に複数利用者・複数プロセスへ拡張する場合は再選定が要る / lock-in=低 (SQL 標準サブセットで移行しやすい) / ops=低 / evidence=https://www.sqlite.org/changes.html, https://www.sqlite.org/docs.html<br>postgresql:PostgreSQL (常駐サーバー型 RDBMS) / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'ライセンス費 0 円だが常駐サーバープロセスの導入・起動管理・バージョン更新・dump/restore 運用の工数が恒常的に加わる'} / free=制限なし (OSS・自ホスト) / fit=G3 は満たすが、常駐ミドルウェアを増やさない U8 制約と G4 (1 コマンド起動・1 ファイルバックアップ) に反する / pros=高い並行性と豊富な機能を持つ, 現行 supported release 18 が公式ドキュメント索引で確認できる / cons=別プロセスの DB サーバーが常駐する, 起動・停止・バックアップが 1 コマンド/1 ファイルに収まらない / risks=単一利用者の用途に対して運用負荷が過剰になる / lock-in=中 (拡張機能を使うと移行コストが上がる) / ops=高 / evidence=https://www.postgresql.org/docs/ | sqlite — 常駐ミドルウェアを増やさない U8 制約と、1 コマンド起動・1 ファイルバックアップという G4 を同時に満たせるのは SQLite だけであるため (注意: 複数利用者・複数プロセスへ拡張する場合は再選定が必要, 書込み並行度が上がる用途では WAL 設定など追加検討が要る; confidence=high; checked=2026-08-08T13:26:41Z) | sqlite @ 2026-07-21T00:00:00Z | G1, G3, G4 |
| D2 | API framework を fastapi と flask のどちらにするか | confirmed | fastapi:FastAPI (ASGI・OpenAPI 自動生成) / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'ライセンス費 0 円。OpenAPI 定義と入力検証が framework 標準のため追加実装・保守工数が小さい'} / free=制限なし (OSS) / fit=OpenAPI 定義の自動生成が U9 の `/openapi.json` 提供に、Pydantic による入力検証が G2 の認証・検証要件に直結する / pros=OpenAPI と JSON Schema に準拠した対話ドキュメントを自動生成する, Pydantic による入力検証が標準で付く, 公式 release notes で現行版 0.141.1 (2026-07-29) を確認できる / cons=ASGI 実行環境 (uvicorn 等) の理解が要る / risks=0.x 系のため minor 更新で API 変更が入りうる / lock-in=低 (ASGI 標準に沿う) / ops=低 / evidence=https://fastapi.tiangolo.com/, https://fastapi.tiangolo.com/release-notes/<br>flask:Flask (WSGI micro framework) / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'ライセンス費 0 円だが OpenAPI 定義と入力検証を拡張または自作で用意する工数が加わる'} / free=制限なし (OSS) / fit=REST API は実装できるが、U9 の OpenAPI 定義提供が標準では得られず追加実装が要る / pros=軽量で学習コストが低い, 公式ドキュメント (3.1.x / 最新 Version 3.1.3) が整備されている / cons=OpenAPI 自動生成を標準で持たない, 入力 schema 検証を拡張に依存する / risks=OpenAPI 生成を拡張に頼ると契約境界の維持コストが上がる / lock-in=低 (WSGI 標準に沿う) / ops=中 / evidence=https://flask.palletsprojects.com/ | fastapi — OpenAPI 自動生成と schema 検証が標準で付き、U9 の `/openapi.json` 提供と G2 の検証要件を追加実装なしで満たせるため (注意: FastAPI は 0.x 系のため更新時の変更点を release notes で確認する必要がある; confidence=high; checked=2026-08-08T13:27:14Z) | fastapi @ 2026-07-21T00:00:00Z | G2, G4 |
| D3 | 認証方式を local-bearer-token と oauth2-password-jwt のどちらにするか | confirmed | local-bearer-token:ローカル生成の bearer token 認証 (単一利用者) / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'ライセンス費 0 円。外部 IdP を持たないため契約・鍵ローテーション運用が不要で、token の初回生成とハッシュ保存だけで済む'} / free=制限なし (外部サービスを使わない) / fit=単一利用者の全 TODO エンドポイントを認証必須にし未認証を 401 にするという G2 を、外部 IdP なしの最小構成で満たす / pros=外部 network 通信を一切増やさない, 初回起動時のローカル生成だけで完結する, 公式 Security tutorial が Authorization: Bearer の scheme を定義している / cons=利用者・権限ロールの拡張には向かない / risks=token 漏洩時は再生成が必要 / lock-in=低 / ops=低 / evidence=https://fastapi.tiangolo.com/tutorial/security/<br>oauth2-password-jwt:OAuth 2.0 (RFC 6749) ベースの password grant + JWT / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': '仕様自体は無償だが、認可サーバー相当の実装・鍵管理・token 失効運用の工数が恒常的に加わる'} / free=制限なし (仕様は公開標準) / fit=G2 は満たせるが、単一利用者・外部 IdP なしという前提に対して構成要素が過剰になる / pros=公開標準で相互運用性が高い, 複数クライアント・複数利用者へ拡張しやすい / cons=単一利用者の用途には構成要素が多すぎる, 鍵管理と token 失効の運用が増える / risks=更新 RFC (8252/8996/9700) への追随を怠ると安全性が劣化する / lock-in=低 (標準仕様) / ops=高 / evidence=https://datatracker.ietf.org/doc/html/rfc6749 | local-bearer-token — 利用者が本人 1 名で外部 IdP を持たない前提では、全エンドポイント認証必須と 401 応答という G2 を最小構成で満たせるため (注意: 複数利用者・第三者クライアントへ拡張する場合は OAuth 2.0 系へ再選定する, token 漏洩時の再生成手順を運用手順に含める; confidence=high; checked=2026-08-08T13:27:43Z) | local-bearer-token @ 2026-07-21T00:00:00Z | G2 |
