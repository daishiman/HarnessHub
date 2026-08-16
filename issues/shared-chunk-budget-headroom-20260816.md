---
graph_node_id: "issue-shared-chunk-budget-headroom-20260816"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["performance","client-bundle","frontend","follow-up"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "共有 chunk を削って client JS 予算の余裕を戻す"
owners: ["daishiman"]
created_at: "2026-08-16T00:00:00.000000Z"
updated_at: "2026-08-16T00:00:00.000000Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["apps/hub/scripts/check-client-bundle.mjs","apps/hub/src/app/(dashboard)/","docs/frontend-ui-foundation-spec.md"]
purpose: "G13 予算超過の是正先を「最後に import を足した route」ではなく原因である共有 chunk へ戻し、予算引き上げの再発を防ぐ"
goal: "共有 chunk を削って素の一覧系 route の First Load JS 下限を 113.1 KiB より下げ、check:client-bundle の WARN を 0 件にする"
scope_in: ["共有 chunk (framework/shared) の内訳を実測で分解する","一覧系 route が共通で引き込む重い依存を route-local next/dynamic 境界へ逃がす","警告帯 (126 KiB の 95% = 122.7 KiB) に張り付いた route を帯の外へ戻す"]
scope_out: ["個別 route の見た目や機能の変更","G13 閾値そのものの再引き上げ","PR 作成・commit・push・デプロイ"]
acceptance: ["素の一覧系 route の First Load JS が 113.1 KiB より下がる","pnpm check:client-bundle の WARN が 0 件になる","共有 chunk の内訳と削減結果が正本文書へ実測値つきで残る","barrel 巻き込み級の退行 (+40 KiB 以上) を引き続き検出できることをテストで確認する"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/shared-chunk-budget-headroom-20260816.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"7dd413babb14929a95df0a461c28da20dbfc0c3afc28efae783c97371b518aac","evaluator":"2026-08-16 PR #731 の check-client-bundle 実測 (下限 113.1 KiB / settings-system 122,898 bytes)","evidence_ref":"docs/frontend-ui-foundation-spec.md"}
source_lineage: {"imported_at":"2026-08-16T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.98
classification_reason: "G13 予算の引き上げは下限上昇に対する止血であり、原因である共有 chunk の削減は独立した後続作業として追跡する"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/shared-chunk-budget-headroom-20260816.md","confidence":0.98}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-16T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

client JS 予算 (G13) の余裕が共有 chunk の肥大で 17 KiB から 7 KiB へ縮み、1 画面ぶんの部品追加で誰でも超過する位置になっている。

## 背景と問題

G13 は route ごとの First Load JS を gzip 実測し、予算超過で CI を落とすゲートである。当初 120 KiB は、Next.js 15 の framework baseline がそのまま下限になる前提で、下限 103.0 KiB (2026-07-25 実測) に約 17 KiB の余裕を残す位置に引かれていた。

2026-08-16 の実測では、素の一覧系 route の下限が 113.1 KiB へ上がっていた。route 側が太ったのではなく共有 chunk が太ったことによる下限の上昇で、余裕は 7 KiB まで縮んでいた。実際 `/settings/system` は予算 122,880 bytes を **18 bytes** 超過して PR #731 の CI を落とした。

この幅で止めても是正できるのは「たまたま最後に import を足した人」だけで、原因である共有 chunk の増加には届かない。

## 現在の挙動

- 素の一覧系 route の First Load JS 下限: 113.1 KiB (2026-08-16 実測)
- 予算は 126 KiB へ引き直し済み (PR #731)。当初と同程度の約 13 KiB の余裕を戻した暫定対応
- 警告帯 (126 KiB の 95% = 122.7 KiB) に張り付く route が残っている
  - `/settings/system`: 122,898 bytes
  - `/settings/auth`、`/docs/[id]` も帯に近い

## 期待する挙動

- 共有 chunk が縮み、素の一覧系 route の下限が 113.1 KiB より下がる
- `pnpm check:client-bundle` の WARN が 0 件になる
- 予算 126 KiB を下げ戻せるかどうかを、実測根拠つきで判断できる

## 再現手順またはユースケース

1. `pnpm --filter @harness-hub/hub run build:worker`
2. `pnpm check:client-bundle`
3. WARN 行に警告帯へ張り付いた route が並ぶことを確認する

## 影響と優先度

- 影響範囲: system (CI ゲートの誤帰属)
- 深刻度: medium
- 緊急度: 予算引き上げで当座は止血済み。ただし余裕がまた縮めば同じ誤帰属が再発する

## スコープ

- In: 共有 chunk の内訳分解、一覧系 route が共通で引き込む重い依存の route-local `next/dynamic` 分離、警告帯 route の帯外への復帰
- Out: 個別 route の見た目や機能変更、G13 の閾値そのものの再引き上げ

## 関連グラフ

- 関連仕様: `arch-harness-hub-frontend`
- 関連文書: `docs/frontend-ui-foundation-spec.md`、`docs/frontend-spec.md`、`docs/shared-layers.md`、`docs/infrastructure-spec.md`

## 受入条件

- 素の一覧系 route の First Load JS が 113.1 KiB より下がる
- `pnpm check:client-bundle` の WARN が 0 件
- 共有 chunk の内訳と削減結果が正本文書へ実測値つきで残る
- barrel 巻き込み級の退行 (+40 KiB 以上) を引き続き検出できることをテストで確認する
