---
graph_node_id: "issue-visual-system-v2-20260813"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["ui-foundation","design-system","visual-system","tokens","mvp"]
priority: "high"
start_date: "2026-08-13"
target_date: null
iteration: null
title: "配色仕様書 v2 を共通トークンへ反映する"
owners: ["daishiman"]
created_at: "2026-08-13T00:00:00Z"
updated_at: "2026-08-13T10:00:00Z"
status: "active"
depends_on: []
related_nodes: ["feat-hub-foundation","arch-harness-hub-frontend","spec-harness-hub-ui-foundation-addendum"]
resource_scope: ["packages/ui/src/tokens/","packages/ui/src/shell/","packages/ui/src/components/Badge.tsx","packages/ui/src/layout/primitives.tsx","apps/hub/src/app/fonts.ts","apps/hub/src/app/layout.tsx","docs/","specs/","architecture/","features/","tasks/","system-spec/","issues/visual-system-v2-20260813.md"]
purpose: "配色仕様書 v2 の色・書体・幅・角・現在地判定を共通 UI 契約へ揃え、仕様と draft PR を同じ正本にする"
goal: "グラファイト×アンバーの見た目契約が token / shell / 仕様 / Beads / draft PR で一致する"
scope_in: ["design token の色・書体・breakpoint・radius.card","sidebar 幅と nav 最長一致","docs/features/system-spec/architecture/tasks への仕様反映","main 統合と base main の draft PR"]
scope_out: ["公開 API / DB schema / 認可判定の変更","Cloudflare 本番デプロイ","Linux VRT baseline 再取得","qa-226 の R4-reopen"]
acceptance: ["対象差分だけが commit される","task package 品質ゲートが pass","focused UI/Hub tests が pass","仕様反映受領書がある","draft PR が base=main で開いている"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/visual-system-v2-20260813.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"9a715dbe180ca85acf117afa19c0b0a3b94b165d75f358ca9a41ddb61588a538","evaluator":"final-review-mvp","evidence_ref":"docs/features/feat-hub-foundation/visual-system-v2-20260813-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-13T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"packages/ui/src/tokens/tokens.ts","source_plugin":"manual-final-review","source_version":"0.1.0"}
classification_confidence: 1.0
classification_reason: "見た目契約の実装と最終レビュー・仕様反映・draft PR を束ねる独立 issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/visual-system-v2-20260813.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-13T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

画面の色と文字の見た目を、配色仕様書 v2（グラファイト × アンバー）に揃える。

## 背景と問題

いまの画面は青い主色と紫の AI 色、Noto Sans JP だけの書体、768/1120 の折り返し幅を正本にしていた。新しい見た目の指定（無彩色の主色、動作中だけの琥珀色、欧文・日本語・等幅の役割分離、641/1025）とずれていた。

## 現在の挙動

- 主操作は青、AI 関連は紫。
- 書体は Noto Sans JP のみ。root layout が `--font-*` を配っていない。
- sidebar 常設 220px、折りたたみ 64px。`md=768` / `lg=1120`。
- `/metrics` と `/metrics/usage` が同時に現在地になる。

## 期待する挙動

- 主操作はグラファイト。琥珀色は「実行中・ヒアリング中」だけ。
- 英数字 IBM Plex Sans、日本語はシステムフォント、ID/ログは JetBrains Mono。
- `md=641` / `lg=1025`、sidebar 212/68、Card/Panel 角 10px。
- 現在地は最長一致の 1 件だけ。

## 再現手順またはユースケース

1. サインインして業務画面を開く。
2. カード・ボタン・バッジの色が無彩色基調になっている。
3. `/metrics/usage` を開くと「使用状況」だけが現在地になる。

## 影響と優先度

- 影響範囲: 全画面の見た目。API / DB / 認可は非変更。
- 深刻度: medium
- 緊急度: MVP 見た目の正本を揃えるため今回扱う。

## スコープ

- In: token / shell / 書体 / 仕様反映 / draft PR
- Out: 本番デプロイ、Linux VRT 再取得、qa-226 の R4-reopen

## 関連グラフ

- 原因/親ノード: feat-hub-foundation
- 関連仕様: spec-harness-hub-ui-foundation-addendum
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 本 issue（閉じた exact-13 に 14 個目は足さない）

## 受入条件

- [ ] 対象差分だけが commit される
- [ ] task package 品質ゲートが pass
- [ ] focused UI/Hub tests が pass
- [ ] 仕様反映受領書がある
- [ ] draft PR が base=main で開いている

## 検証証跡

- コマンド/テスト: `pnpm --filter @harness-hub/ui test` と focused Hub font mock tests、`validate-system-plan.py --feature-package feature-package/feat-hub-foundation`
- 証跡 path: docs/features/feat-hub-foundation/visual-system-v2-20260813-spec-reflection-receipt.md
