---
graph_node_id: "issue-root-layout-theme-css-long-task-20260808"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["performance","cwv","tbt","theme","packages-ui","owner-coordination"]
priority: "medium"
start_date: "2026-08-08"
target_date: null
iteration: null
title: "root layout の inline buildThemeCss() による Style & Layout ロングタスクを解消する"
owners: ["daishiman"]
created_at: "2026-08-08T08:00:00Z"
updated_at: "2026-08-08T10:00:00Z"
status: "active"
depends_on: []
related_nodes: ["issue-hub-cwv-tbt-over-budget-20260724"]
resource_scope: ["apps/hub/src/app/layout.tsx","packages/ui"]
purpose: "JS 削減が頭打ちになった後の最大ロングタスク要因である、テーマ CSS の inline 出力によるスタイル再計算コストを取り除く。"
goal: "CPU 12x スロットリング下で document の Style & Layout がロングタスクの主でなくなり、テーマの見た目に退行が無い状態にする。"
scope_in: ["テーマ CSS の静的ファイル切り出し","可変部分だけを inline に残す二段構成の検討","未使用トークンの棚卸し","packages/ui owner との調整"]
scope_out: ["テーマの意匠変更そのもの","packages/ui の owner 調整を経ない先行実装"]
acceptance: ["CPU 12x で document の Style & Layout がロングタスク (50ms 超) に該当しない、または最大ロングタスクの主でなくなっている","変更が packages/ui の owner と調整済みで、他 worktree の進行と衝突していない","テーマの見た目に退行が無いことが視覚回帰または既存テストで示されている"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/root-layout-theme-css-long-task-20260808.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"8285ba24359f4af9f8103e236e42c12f57b5b081685ee7ce59eb58ed4849d189","evaluator":"HarnessHub-aqi の CPU 12x Performance トレース実測 (Style & Layout 219-300ms)","evidence_ref":"docs/frontend-spec.md"}
source_lineage: {"imported_at":"2026-08-08T08:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "HarnessHub-aqi の JS 削減後、最大ロングタスクが JS から document の Style & Layout へ入れ替わった実測に基づく。正本が packages/ui にあり所有権調整が要るため分離。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/root-layout-theme-css-long-task-20260808.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-2fo1","linked_at":"2026-08-08T09:53:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-08T10:00:00Z","missing_sections":[],"status":"complete"}
---

# root layout の inline buildThemeCss() による Style & Layout ロングタスクを解消する

## 概要

CPU 12x スロットリング下の最大ロングタスクが JS ではなく document の Style & Layout（219〜300ms）になった。主因は root layout がテーマ CSS を inline style として毎レンダー吐いていることで、これを解消する。

## 背景と問題

`HarnessHub-aqi` の是正で JS 由来のロングタスクを削った結果、**最大ロングタスクの主が入れ替わった**。これ以上 JS を削っても総 TBT が下がらない位置まで来たことを意味する。

root layout は `buildThemeCss()` の結果を inline style 要素として出力している。テーマ CSS 変数を全量その場で生成するため、次の 3 つが同時に効く。

- HTML 本文が膨らむ（転送量と parse 時間の両方に効く）
- 生成された style が外部 CSS と別枠で入るため、ブラウザの style recalculation が初回に集中する
- inline なのでキャッシュが効かない。2 回目以降の訪問でも毎回同じコストを払う

**所有権の注意**: 正本は `packages/ui` にある。本 worktree (`wt-18-3`) は `packages/ui` を変更対象から外している（`wt-16-2` が同 package を進行中）。着手前に owner 調整が必要で、ここでは実測と選択肢の記録に留める。

## 現在の挙動

| 条件 | 最大ロングタスク |
|---|---|
| CPU 12x スロットリング | document の Style & Layout 219〜300ms |
| 同条件の JS 由来最大 | aqi 是正後は上記を下回る |

12x は下位端末の代理値であり、実機で常に 300ms 出るという意味ではない。ただし順位が入れ替わったという事実は端末性能に依存しない。

## 期待する挙動

CPU 12x で document の Style & Layout がロングタスク（50ms 超）に該当しない、または少なくとも最大ロングタスクの主ではなくなっている。テーマの見た目には退行が無い。

## 再現手順またはユースケース

1. Hub 本番トップを Chrome DevTools の Performance で記録する（CPU throttling を 12x に設定）
2. Main thread の long tasks を確認する
3. 最上位が document の Style & Layout で 219〜300ms であることを確認する
4. Elements で root layout 直下の inline style 要素にテーマ変数が全量入っていることを確認する

## 影響と優先度

初回訪問だけでなく再訪でも毎回コストを払うため、実ユーザーの体感 TBT に継続的に効く。aqi の CWV 是正を仕上げるうえで残された主要因でもある。優先度は medium から high の境目だが、`packages/ui` の所有権調整が前提になるため即着手はできない。owner 調整が済み次第 high 扱いでよい。

## スコープ

**(a) テーマ CSS を静的ファイルへ切り出す（推奨）**

ビルド時に `buildThemeCss()` を評価して css ファイルとして出力し、stylesheet として読む。ブラウザキャッシュが効き、inline 分だけ HTML が縮む。前提はテーマがリクエストごとに変わらないこと。tenant ごとに変わるなら (b) と組み合わせる。効果は 2 回目以降の訪問コストがほぼ消えること。

**(b) 可変部分だけを inline に残す**

固定部分（大半のトークン）は静的 CSS、tenant 固有の上書き変数だけを小さな inline style に残す。inline のサイズがテーマ全量から差分だけへ落ちる。代償は二段構成になるため、どちらに何が入るかの規約が要ること。

**(c) 変数の量そのものを減らす**

未使用トークンの棚卸し。効果は棚卸し結果次第で事前には見積もれないため、(a) または (b) の補助として扱う。

対象外は、テーマの意匠変更そのものと、`packages/ui` の owner 調整を経ない先行実装である。

## 関連グラフ

- `issues/hub-cwv-tbt-over-budget-20260724.md` — 本件を炙り出した CWV 是正課題
- `issues/catalog-detail-bundle-headroom-20260808.md` — 同じ aqi 実測から切り出したもう 1 件

## 受入条件

1. CPU 12x で document の Style & Layout がロングタスク（50ms 超）に該当しない、または最大ロングタスクの主でなくなっている
2. 変更が `packages/ui` の owner と調整済みで、他 worktree の進行と衝突していない
3. テーマの見た目に退行が無いことが視覚回帰または既存テストで示されている

## 検証証跡

- aqi 実測時の CPU 12x Performance トレース（Style & Layout 219〜300ms）
- `docs/frontend-spec.md` §8 — aqi の実測知見の記述
- 是正後の再計測トレース（本課題の完了時に取得する）
