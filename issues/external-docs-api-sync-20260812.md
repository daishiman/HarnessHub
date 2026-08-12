---
graph_node_id: "issue-external-docs-api-sync-20260812"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "backend"
tags: ["docs","api","device-flow","external-sync","publisher"]
priority: "high"
start_date: "2026-08-12"
target_date: null
iteration: null
title: "Claude Code等の外部環境からDocs CMSへ安全に同期する"
owners: ["daishiman"]
created_at: "2026-08-12T06:02:20Z"
updated_at: "2026-08-12T06:51:18Z"
status: "active"
depends_on: []
related_nodes: []
resource_scope: ["apps/hub/src/app/api/v1/docs","apps/hub/src/lib/authz","packages/db/schema","packages/schemas","apps/publisher","plugins/harness-hub-publisher"]
purpose: "Claude CodeやCodexで作成したMarkdownを、ブラウザのCookieや長命APIキーを配らずHarness HubのDocsへ安全かつ再実行可能に反映する"
goal: "Device Flowで得た最小権限トークンを使い、外部文書をtenant内の下書きへ冪等同期できるAPIとCLIを提供する"
scope_in: ["Device Flowへdocs:write scopeを追加する","tenant下書き限定の外部文書upsert APIを追加する","external sourceとexternal document idの一意制約で再送重複を防ぐ","revisionとETag/If-Matchで同時編集の上書きを防ぐ","Publisher CLIへMarkdown同期コマンドを追加する","Claude Code/Codexから同CLIを呼べる薄いadapterと利用手順を追加する","認可・tenant分離・監査・冪等性・競合の回帰テストを追加する"]
scope_out: ["common文書への書き込みと自動公開","v1での画像アップロード同期","ブラウザsession Cookieの外部利用","長命な固定APIキーの新設","documentsへのworkspace_id追加"]
acceptance: ["同じ外部キーと本文を何度送っても文書が重複せずunchangedになる","同じ外部キーの更新は正しいIf-Matchがある場合だけ成功し古いrevisionは412になる","docs:writeを持たないtoken・別tenant・member roleからの同期を拒否する","同期APIはtenant scopeかつdraftで作成し自動公開しない。Hub側の手動編集・公開後はmodifiedになりCLIが既定で停止する","CLIがリポジトリ相対パス由来の安定IDを使い絶対パスや利用者名を送信しない","作成・更新・変更なしの監査イベントと、拒否の回帰テストが揃う","外部作成したMarkdownがDocs一覧・詳細で確認できる"]
architecture_refs: ["arch-harness-hub-backend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/external-docs-api-sync-20260812.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"ab9258aff29a06c12ef23961ae7a12121ff31d214c14173218e4bfede8bdbd25","evaluator":"elegant-review 30思考法レビュー","evidence_ref":"issues/external-docs-api-sync-20260812.md"}
source_lineage: {"imported_at":"2026-08-12T06:02:20Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 1.0
classification_reason: "ユーザーが外部作成ドキュメントをAPIでHarness Hub Docsへ反映する仕組みを明示的に依頼した"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/external-docs-api-sync-20260812.md","confidence":1.0}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-2h14","linked_at":"2026-08-12T06:05:41.888487Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-12T06:02:20Z","missing_sections":[],"status":"complete"}
---

# 目的

Claude CodeやCodexで作成したMarkdownを、Harness HubのDocsへ安全に反映できるようにする。

## 背景

現行のDocs APIはブラウザsession専用で、POST再送は毎回新規文書を作る。外部ツールからそのまま利用すると、認証情報の扱い、重複文書、同時編集の上書きが問題になる。

## 実装方針

既存Device Flowを再利用して `docs:write` の最小権限を追加する。外部正本を `source + external_document_id` で識別し、tenant内のdraft文書へupsertする。本文更新はrevisionとETag/If-Matchで競合を検出する。Publisher CLIの `harness-publisher docs` を正規クライアントとし、Claude Code/Codex側はそのCLIを呼ぶ薄いadapterに留める。

v1はMarkdown本文・タイトルだけに絞る。画像同期はDocs CMS画像の認証・所有権・削除ライフサイクルが安定した後の別段階とする。
