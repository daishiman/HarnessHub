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
created_at: "2026-08-08T12:56:29Z"
updated_at: "2026-08-08T12:56:29Z"
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
confirmation_evidence: {"evaluated_digest":"50e47124f0fce8fbd9580f228784a6aa3730d60bc7d61e57629eed8eb63e16b5","evaluator":"system-spec-harness/assign-system-spec-completeness-evaluator","evidence_ref":"system-spec/completeness-report.json"}
source_lineage: {"imported_at":"2026-08-08T12:56:29Z","origin_kind":"system-spec-harness","source_digest":"5e144a5de3a2dd6169403bdfb142b9f8ae14ef3a1fe4c3dde49901a2376a179e","source_path":"system-spec/00-requirements-definition.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
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
completion_evidence: {"completed_at":"2026-08-08T12:56:29Z","evidence_refs":["system-spec/completeness-report.json"],"policy":"manual","reconciled_at":"2026-08-08T12:56:29Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-08-08T12:56:29Z","missing_sections":[],"status":"complete"}
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
| O1 | 実装依存の外向き通信を 0 にし、依存パッケージも起動時に network を張らないものだけにする。 | 依存関係と実装に外部 host への送信処理が 0 件であることをレビューで確認する。 |
| O2 | すべての TODO エンドポイントを認証必須にし、未認証要求は 401 を返す。 | 受入テストで、未認証要求が全 TODO エンドポイントで 401 になる。 |
| O3 | 永続化先を単一ファイルにし、再起動後の一覧取得で登録済み TODO が全件戻る。 | 受入テストで、作成 → プロセス再起動 → 一覧取得を行い、作成した TODO が戻る。 |
| O4 | 起動は 1 コマンド、バックアップはデータファイル 1 個のコピーで完了する。 | 起動手順が 1 コマンド、バックアップ手順が 1 ファイルコピーで記述できる。 |

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
| D1 | 永続化先を sqlite と postgresql のどちらにするか (requirements-brief.md §4 D1) | confirmed | sqlite:SQLite (単一ファイル埋め込み DB) / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'ライセンス 0 円。別プロセスの DB サーバーを増やさないため構築・運用・撤退費も追加 0 円で、バックアップはデータファイル 1 個のコピーで完了する。'} / free=無料枠の概念なし (public domain・機能制限なし) / fit=単一ファイル・常駐ミドルウェア不要で G1 (端末外へ出さない)・G3 (再起動後も残る)・G4 (1 コマンド起動/1 ファイルバックアップ) に直接適合する。 / pros=常駐プロセスを増やさない, データがファイル 1 個に閉じるためバックアップ/復旧が 1 コピー, 起動時のスキーマ冪等作成が容易 / cons=高並行の書込には向かない, ネットワーク越しの共有利用ができない / risks=将来的に複数利用者要件が出た場合は移行が必要 / lock-in=低 (標準 SQL に近く、ダンプ移行が容易) / ops=低 / evidence=https://www.sqlite.org/docs.html, https://www.sqlite.org/changes.html<br>postgresql:PostgreSQL (別プロセスの RDBMS サーバー) / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'ライセンス 0 円だが、別プロセスの常駐サーバーの導入・起動管理・バージョン更新・バックアップ運用の工数が加算される。'} / free=無料枠の概念なし (OSS・機能制限なし) / fit=G3 の永続性は満たすが、常駐ミドルウェアを増やすため U8 制約と G4 (1 コマンド起動・1 ファイルバックアップ) に反する。 / pros=高並行・複数クライアントに強い, richer な型・拡張機能 / cons=別プロセスの常駐が必要, バックアップ手順がファイル 1 コピーで完結しない / risks=運用対象が増えることによる復旧手順の複雑化 / lock-in=中 (拡張機能を使うと移行コストが上がる) / ops=高 / evidence=https://www.postgresql.org/docs/ | sqlite — 常駐プロセスを増やさず単一ファイルで完結するため、U8 制約と G1/G4 に最も適合する。実取得した公式資料でも現行版 3.53.4 が保守継続中であることを確認した。 (注意: 高並行書込や複数利用者要件が将来生じた場合は再検討が必要, ファイル権限とバックアップ先の保護は別途 security 章で担保する; confidence=high; checked=2026-08-08T12:42:15Z) | sqlite @ 2026-07-21T00:00:00Z | G1, G3, G4 |
| D2 | API framework を fastapi と flask のどちらにするか (requirements-brief.md §4 D2) | confirmed | fastapi:FastAPI (ASGI・型ヒントベース) / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'OSS でライセンス 0 円。OpenAPI 定義が自動生成されるため契約ドキュメント作成の工数も抑えられる。'} / free=無料枠の概念なし (MIT・機能制限なし) / fit=OpenAPI 自動生成と schema 検証が U9 の OpenAPI 提供と G2 (認証必須・入力検証) に直結する。 / pros=OpenAPI 定義を自動生成できる, リクエスト schema 検証が既定で入る, security utility が公式ドキュメント化されている / cons=ASGI サーバー (uvicorn 等) の起動構成を選ぶ必要がある / risks=0.x 系のため minor 更新で破壊的変更が入りうる / lock-in=低 (ASGI 標準に準拠) / ops=低 / evidence=https://fastapi.tiangolo.com/, https://fastapi.tiangolo.com/release-notes/<br>flask:Flask (WSGI・マイクロフレームワーク) / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'OSS でライセンス 0 円だが、OpenAPI 定義と schema 検証を拡張または自作で補う工数が加算される。'} / free=無料枠の概念なし (BSD-3-Clause・機能制限なし) / fit=REST 提供自体は満たすが、OpenAPI 提供 (U9) と schema 検証を標準で持たないため G2/G4 への寄与が間接的になる。 / pros=最小構成で軽量, 成熟し安定した 3.1.x 系 / cons=OpenAPI 自動生成が標準にない, 入力 schema 検証を拡張で補う必要がある / risks=拡張選定の分だけ依存と保守対象が増える / lock-in=低 / ops=中 / evidence=https://flask.palletsprojects.com/ | fastapi — OpenAPI 自動生成と schema 検証が U9 と G2 に直結し、追加拡張なしで契約境界を単一化できる。実取得した公式リリースノートで現行版 0.141.1 (2026-07-29) を確認した。 (注意: FastAPI は 0.x 系のため更新時は release notes の破壊的変更を確認する, ASGI サーバーの起動を 1 コマンドに収める構成が必要; confidence=high; checked=2026-08-08T12:42:16Z) | fastapi @ 2026-07-21T00:00:00Z | G2, G4 |
| D3 | 認証方式を local-bearer-token と oauth2-password-jwt のどちらにするか (requirements-brief.md §4 D3) | confirmed | local-bearer-token:ローカル生成の bearer token 認証 (単一利用者) / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': '外部 IdP を使わないためライセンス・従量課金ともに 0 円。token 再発行手順のみが運用コスト。'} / free=外部サービスを使わないため無料枠の制約なし / fit=単一利用者で外部 IdP を持たずに G2 (認証必須・未認証は 401) を満たす最小構成。 / pros=外部依存 0 で G1 の外部送信 0 件を保てる, 初回起動時のローカル生成だけで完結, 実装面が小さく検証しやすい / cons=利用者/権限ロールの拡張余地が小さい, token 失効・再発行を自前で用意する必要がある / risks=token 保管を誤ると単一の資格情報が全権限になる / lock-in=低 / ops=低 / evidence=https://fastapi.tiangolo.com/tutorial/security/<br>oauth2-password-jwt:OAuth 2.0 (RFC 6749) の password grant + JWT / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': '規格自体は無償だが、認可サーバー相当の実装と鍵・失効管理の運用工数が加算される。'} / free=規格のため無料枠の概念なし / fit=複数クライアント・複数利用者を前提とする枠組みで、単一利用者の G2 に対しては過剰。 / pros=標準化され相互運用性が高い, スコープによる権限分離ができる / cons=単一利用者には構成要素が過剰, 鍵・失効管理の運用が増える / risks=password grant は後続の OAuth 2.1 系で非推奨扱いのため将来の見直しが要る / lock-in=中 / ops=高 / evidence=https://datatracker.ietf.org/doc/html/rfc6749 | local-bearer-token — 単一利用者・外部 IdP なしで G2 を満たす最小構成であり、外部通信を伴わないため G1 とも整合する。RFC 6749 (Proposed Standard, October 2012) の枠組みは複数当事者を前提としており本スコープには過剰。 (注意: token の保管場所とファイル権限を security 章で明示する, 将来複数利用者要件が生じた場合は標準枠組みへの移行を再検討する; confidence=high; checked=2026-08-08T12:42:19Z) | local-bearer-token @ 2026-07-21T00:00:00Z | G2 |
