---
graph_node_id: "issue-cloudflare-free-tier-runtime-limits-20260814"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "infrastructure"
tags: ["cloudflare","workers","free-tier","observability","performance"]
priority: "medium"
start_date: "2026-08-14"
target_date: null
iteration: null
title: "Cloudflare 無料枠の CPU 10ms/req とサブリクエスト 50/req をデプロイ後に実測する"
owners: ["daishiman"]
created_at: "2026-08-14T00:04:43.238090Z"
updated_at: "2026-08-14T00:09:31.341484Z"
status: "draft"
depends_on: []
related_nodes: ["feat-hub-foundation"]
resource_scope: ["issues/cloudflare-free-tier-runtime-limits-20260814.md"]
purpose: "Cloudflare 無料枠で本番運用できるかを、設定では決まらない実行時上限の実測で確かめる。"
goal: "主要 route ごとの CPU time とサブリクエスト数を観測し、無料枠上限に対する余裕を記録した状態にする。"
scope_in: ["デプロイ後の observability からの CPU time 分布取得","主要 route のサブリクエスト数計測","上限に対する余裕の記録"]
scope_out: ["超過が判明した route の最適化実装","有料プランへの移行判断","wrangler.jsonc の設定変更"]
acceptance: ["主要 route の CPU time (p50/p95/max) が観測値として記録されている","主要 route の 1 request あたりサブリクエスト数が記録されている","10ms / 50 件の上限に対する余裕が route ごとに判定されている","超過する route があれば対策課題が別途起票されている"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/cloudflare-free-tier-runtime-limits-20260814.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"25336301a446ef12a6256d6d31dda89a814edb96a8c211eacddd1e349b678e65","evaluator":"PR #724 CI 対応時の wrangler dry-run 実測と Cloudflare 公式上限の突合","evidence_ref":"apps/hub/wrangler.jsonc"}
source_lineage: {"imported_at":"2026-08-14T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "無料枠の実行時上限に収まるかを実測で確かめる、運用基盤の調査課題。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/cloudflare-free-tier-runtime-limits-20260814.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-qjf6","linked_at":"2026-08-14T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-14T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

Cloudflare Workers の無料枠で本番運用できるかを、設定では決まらない 2 つの実行時上限
(CPU time 10 ms/request、サブリクエスト 50/request) について実測で確かめる。

## 背景と問題

PR #724 の CI 対応 (2026-08-14) の一環で無料枠への適合を診断した。設定で決まる項目は
すべて余裕があり、変更は不要と確認できた。

| 項目 | 無料枠上限 | 実測・現状 | 判定 |
| --- | --- | --- | --- |
| Worker サイズ | 3 MiB | 1.967 MiB (wrangler dry-run) | 余裕 1.03 MiB |
| Cron Triggers | 5 / アカウント | 2 | 余裕あり |
| 静的アセット | 無料・無制限 | `.open-next/assets` 2.6 MB | 制限なし |
| R2 バケット | 個数制限なし | 4 | 制限なし |
| リクエスト数 | 10 万 / 日 | 未計測 | MVP 想定では余裕 |

残る 2 つは設定では直せず、実トラフィックでの観測が要る。

1. **CPU time 10 ms/request** — Cloudflare の公式資料は SSR + 認証を伴う処理が
   10〜20 ms を使うと述べており、超過すると無料枠では request が打ち切られる。
2. **サブリクエスト 50/request** — Turso をリモート libSQL で使っているため
   1 クエリが 1 サブリクエストを消費する。一覧系の画面に N+1 が残っていると上限に近づく。

## 期待する挙動

主要 route のいずれも CPU time が 10 ms、サブリクエスト数が 50 件を下回り、
その余裕が観測値として記録されている。

## 再現手順またはユースケース

1. Cloudflare Workers へデプロイする。
2. observability (`wrangler.jsonc` で有効化済み) から CPU time 分布を取得する。
3. 主要 route を実際に叩き、1 request あたりのサブリクエスト数を数える。
4. 上限に対する余裕を route ごとに記録する。

## 影響と優先度

- 影響範囲: 本番運用時の全利用者 (上限超過は request 打ち切りとして現れる)
- 深刻度: medium
- 緊急度: デプロイ前には測れないため、デプロイ直後の確認項目として扱う

## スコープ

- In: CPU time 分布の取得、サブリクエスト数の計測、余裕の記録
- Out: 超過 route の最適化実装、有料プランへの移行判断、`wrangler.jsonc` の設定変更

## 関連グラフ

- 関連ノード: `feat-hub-foundation`
- 関連アーキテクチャ: `arch-harness-hub-frontend`

## 受入条件

- [ ] 主要 route の CPU time (p50 / p95 / max) が観測値として記録されている。
- [ ] 主要 route の 1 request あたりサブリクエスト数が記録されている。
- [ ] 10 ms / 50 件の上限に対する余裕が route ごとに判定されている。
- [ ] 超過する route があれば、その対策が別課題として起票されている。

## 検証証跡

- コマンド/テスト: 未実施 (デプロイ後に実施する)
- 証跡 path: `apps/hub/wrangler.jsonc`
