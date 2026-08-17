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
updated_at: "2026-08-14T01:01:06Z"
status: "closed"
depends_on: ["issue-ui-vrt-navigation-baseline-drift-20260810"]
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

root layout は `buildThemeCss()` の結果を inline style 要素として出力している。テーマ CSS 変数を全量その場で生成するため、次の負荷候補がある。

- HTML 本文が膨らむ（転送量と parse 時間の両方に効く）
- inline なので文書をまたぐ再訪で stylesheet としてキャッシュできず、同じ CSS を HTML と一緒に再転送する
- CSS parse / CSSOM / layout は inline と外部 stylesheet のどちらでも初回に必要であり、外部化だけでロングタスクが消えるとは限らない

**所有権の注意**: 正本は `packages/ui` にある。2026-08-10 時点では課題 owner と実装 owner が同一で、現存する他 worktree に `packages/ui` の未反映変更がないことを確認した。以後に並行作業が始まった場合は再確認する。

## 起票時の挙動

| 条件 | 最大ロングタスク |
|---|---|
| CPU 12x スロットリング | document の Style & Layout 219〜300ms |
| 同条件の JS 由来最大 | aqi 是正後は上記を下回る |

12x は下位端末の代理値であり、実機で常に 300ms 出るという意味ではない。ただし順位が入れ替わったという事実は端末性能に依存しない。

## 期待する挙動

CPU 12x で document の Style & Layout がロングタスク（50ms 超）に該当しない、または少なくとも最大ロングタスクの主ではなくなっている。テーマの見た目には退行が無い。

## 起票時の再現手順

1. Hub 本番トップを Chrome DevTools の Performance で記録する（CPU throttling を 12x に設定）
2. Main thread の long tasks を確認する
3. 最上位が document の Style & Layout で 219〜300ms であることを確認する
4. Elements で root layout 直下の inline style 要素にテーマ変数が全量入っていることを確認する

## 影響と優先度

HTML 転送量と再訪時のキャッシュ可否には直接効く。一方、aqi で観測した初回 Style & Layout への効果は仮説であり、再計測まで確定しない。優先度は medium のままとし、静的成果物化と再計測を分けて進める。

## スコープ

**(a) テーマ CSS を静的ファイルへ切り出す（推奨）**

`buildThemeCss()` を評価して CSS ファイルとして出力し、stylesheet として読む。ブラウザキャッシュの対象になり、inline 分だけ HTML が縮む。前提はテーマがリクエストごとに変わらないこと。tenant ごとに変わるなら (b) と組み合わせる。初回の parse / CSSOM / layout は残るため、効果量は再計測する。

**(b) 可変部分だけを inline に残す**

固定部分（大半のトークン）は静的 CSS、tenant 固有の上書き変数だけを小さな inline style に残す。inline のサイズがテーマ全量から差分だけへ落ちる。代償は二段構成になるため、どちらに何が入るかの規約が要ること。

**(c) 変数の量そのものを減らす**

未使用トークンの棚卸し。効果は棚卸し結果次第で事前には見積もれないため、(a) または (b) の補助として扱う。

対象外は、テーマの意匠変更そのものと、`packages/ui` の owner 調整を経ない先行実装である。

## 関連グラフ

- `issues/hub-cwv-tbt-over-budget-20260724.md` — 本件を炙り出した CWV 是正課題
- `issues/catalog-detail-bundle-headroom-20260808.md` — 同じ aqi 実測から切り出したもう 1 件
- `HarnessHub-preq` — navigation light/dark の 197px 差を判定する blocking dependency

## 受入条件

1. CPU 12x で document の Style & Layout がロングタスク（50ms 超）に該当しない、または最大ロングタスクの主でなくなっている
2. 変更が `packages/ui` の owner と調整済みで、他 worktree の進行と衝突していない
3. テーマの見た目に退行が無いことが視覚回帰または既存テストで示されている

## 検証証跡

- aqi 実測時の CPU 12x Performance トレース（Style & Layout 219〜300ms）
- `docs/frontend-spec.md` §8 — aqi の実測知見の記述
- 是正後の再計測トレース（本課題の完了時に取得する）

## 実装状況（2026-08-10）

- `@harness-hub/ui/tokens.css` を公開 subpath とし、root layout の inline style を静的 import へ置換した。
- `buildTokenCssArtifact()` を生成とブラウザ fixture の共通正本にし、コミット済み CSS との完全一致検査を追加した。
- focused Vitest 4件で生成物の一致・theme/base の包含と順序・生成物サイズ下限を確認した。
- **未完了**: CPU 12x Performance 再計測。静的化だけで受入1を満たしたとは判定しない。
- browser test は 31 PASS / 2 FAIL。navigation light/dark だけが基準 1024x1739 に対して実際 1024x1936（高さ +197px）で、actual には `WorkspaceSwitcher` が含まれる。原因未確定のため baseline は更新せず、`HarnessHub-preq` を阻害課題として登録した。受入3も未達扱いを維持する。
