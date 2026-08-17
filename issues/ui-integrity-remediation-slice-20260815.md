---
graph_node_id: "issue-ui-integrity-remediation-slice-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["ui-integrity","browser-test","navigation","print","vertical-slice"]
priority: "high"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "UI崩れ監査と意味境界改行を実画面契約へ接続する"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-16T00:20:17.000000Z"
status: "done"
depends_on: []
related_nodes: ["feat-ui-integrity-audit-harness","feat-ui-layout-remediation","feat-demo-coverage-dataset"]
resource_scope: ["apps/hub/tests/browser/","apps/hub/src/components/shell/","apps/hub/src/app/(dashboard)/sheets/[id]/","packages/ui/src/shell/","packages/db/scripts/demo-coverage/coverage-matrix.ts","system-spec/ui-ux.md","system-spec/testing-qa.md"]
purpose: "5つの合成 fixture を 28 実画面と誤認しない fail-closed 監査にし、既知のナビ改行と不要な製品所有印刷導線を最小境界で是正する"
goal: "COVERAGE_MATRIX を route/state 正本とした 28 route・168 実走キー・105 state cell の契約と、意味 segment 改行、製品所有の印刷 action 0 件をテストで固定する"
scope_in: ["COVERAGE_MATRIX と実 Next route の静的 parity および route×width×theme 実走キー契約","横溢れ・44px 未満操作域・意図しない語中改行を検出する実ブラウザランナー契約","Hub 側の完全 label と任意の意味 segment 宣言、packages/ui 側の segment 内 nowrap・segment 間改行","hearing detail の明示的な印刷 action と window.print 起動のみ除去","168 走査軸と 105 state cell を区別した仕様統合"]
scope_out: ["5合成 fixture の 28実routeへの読み替え","全体 nowrap、サイドバー幅増加、画面別 CSS、ゼロ幅文字","legal コンテンツと print stylesheet の削除","PR 作成・commit・push・デプロイ"]
acceptance: ["RED が既知改行・route/軸母数・操作域検出器・印刷 action で意図して失敗し、実装後に PASS する","route 母数 28、実走キー 168、state cell 105 が区別され、0 件は PASS にならない","「使用状況・削減効果」が 1280px のフルサイドバーで意味境界 2 行となり、360px ではモバイル導線から到達できる","hearing detail に製品所有の印刷ボタンと window.print 起動がなく、revision conflict/CAS 処理は保持される","変更範囲で矛盾なし・漏れなし・整合性あり・依存関係整合がすべて PASS する"]
architecture_refs: ["arch-harness-hub-testing-qa","arch-harness-hub-design-system","arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/ui-integrity-remediation-slice-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"b751b1c860899cb14806045b29685825499b5487dff29f6a185cd16d2377cb05","evaluator":"2026-08-15 elegant-review 30思考法分析とワークツリー実測","evidence_ref":"features/feat-ui-integrity-audit-harness.md"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "2つの macro feature を完了偽装せず、今回実装可能な監査・既知改行・印刷導線・仕様整合の縦切りを独立 issue として追跡する"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/ui-integrity-remediation-slice-20260815.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-s36m","linked_at":"2026-08-15T02:41:44Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-16T00:20:17.000000Z","evidence_refs":["apps/hub/tests/browser/real-app-audit.ts","packages/db/scripts/issue-demo-coverage-session.ts","docs/features/feat-ui-integrity-audit-harness/ui-integrity-remediation-slice-spec-reflection-receipt.md"],"policy":"manual","reconciled_at":null,"source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

UI 崩れ監査を 28 実 route の契約に接続し、既知のナビ語中改行と不要な印刷 action を最小境界で是正する。

## 背景と問題

現行の browser test は 5 つの合成 fixture を持つが、28 の実 Next route と route/state 正本 COVERAGE_MATRIX の契約へ未接続である。そのため母数 0 や fixture の成功を「全画面 PASS」と誤認する余地がある。

## 現在の挙動

「使用状況・削減効果」が語中で折れ、hearing detail に製品所有の印刷ボタンと window.print 起動が残る。仕様は 360px でフルサイドバーを要求する一方、実装はモバイル導線を持つ。

## 期待する挙動

28 route ・ 168 route/width/theme キー・ 105 state cell が別物として fail-closed 検査される。ナビは完全 label を保った意味 segment でのみ折れ、印刷 action は 0 件となる。

## 再現手順またはユースケース

1. COVERAGE_MATRIX と実 route を照合する。
2. 360/768/1280 × light/dark の実走キーを生成する。
3. 1280px のフルサイドバーと 360px のモバイル導線を検査する。
4. hearing detail の製品所有印刷 action を検査する。

## 影響と優先度

- 影響範囲: Hub の全実 route に対する UI 回帰保護
- 深刻度: high
- 緊急度: 既知の見え方不具合と偽の全画面 PASS を同時に防ぐ必要がある

## スコープ

- In: route/state 正本の再利用、実ブラウザランナー契約、意味 segment 改行、hearing detail の印刷 action 除去、仕様統合
- Out: 全体 nowrap、幅増加、画面別 CSS、ゼロ幅文字、legal/print stylesheet 削除、commit/push/PR/deploy

## 関連グラフ

- 原因/親ノード: feat-ui-integrity-audit-harness
- 関連仕様: feat-ui-layout-remediation
- 関連アーキテクチャ: arch-harness-hub-testing-qa, arch-harness-hub-design-system, arch-harness-hub-frontend
- 解決タスク: issue-ui-integrity-remediation-slice-20260815

## 受入条件

- [x] RED が既知改行・route/軸母数・操作域検出器・印刷 action で意図して失敗し、実装後に PASS する
- [x] route 28、実走キー 168、state cell 105 を区別し、0 件は PASS にしない
- [x] 意味 segment 改行とモバイル導線を共通 UI 契約で固定する
- [x] hearing detail の印刷ボタン/window.print 起動のみが消え、revision conflict/CAS と legal/print stylesheet は残る

## 検証証跡

- コマンド/テスト: 対象 Vitest、browser contract、lint、typecheck、build
- 証跡 path: apps/hub/tests/browser/ と本 Beads issue の notes
