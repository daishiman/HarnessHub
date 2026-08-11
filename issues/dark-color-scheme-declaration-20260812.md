---
graph_node_id: "issue-dark-color-scheme-declaration-20260812"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["design-system","accessibility","dark-mode"]
priority: "medium"
start_date: "2026-08-12"
target_date: null
iteration: null
title: "暗い配色のとき、ブラウザ標準の部品が明るいまま出る"
owners: ["daishiman"]
created_at: "2026-08-12T00:00:00Z"
updated_at: "2026-08-11T15:52:39.243560Z"
status: "active"
depends_on: []
related_nodes: []
resource_scope: ["packages/ui/src/tokens/tokens.ts","packages/ui/src/tokens/base-css.ts"]
purpose: "暗い配色のときに、こちらで作っていない部品まで含めて配色を揃える。"
goal: "暗い配色のとき CSS の color-scheme を dark として宣言する。"
scope_in: ["color-scheme の宣言","tokens.css の再生成","VRT baseline の更新"]
scope_out: ["個々の部品の配色の作り直し"]
acceptance: ["暗い配色のとき素の入力欄が暗い背景で出る","tokens.css が再生成された状態で commit される","宣言の有無をテストで固定する"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/dark-color-scheme-declaration-20260812.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"1b8a07aace78f9b359fa66ae10a264e712566f55534c9629e19e0b70425da0ec","evaluator":"2026-08-12 の VRT 目視で catalog-form-dark を確認","evidence_ref":"issues/dark-color-scheme-declaration-20260812.md"}
source_lineage: {"imported_at":"2026-08-12T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"docs/product/backlog.md","source_plugin":null,"source_version":null}
classification_confidence: 0.97
classification_reason: "design token 層の欠落に起因する表示不具合であり、実装単位の課題に該当する。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/dark-color-scheme-declaration-20260812.md","confidence":0.97}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-ck3d","linked_at":"2026-08-12T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-12T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 暗い配色のとき、ブラウザ標準の部品が明るいまま出る

## 概要

暗い配色 (dark) のとき、こちらで作っていない**ブラウザ標準の部品**が明るいままで出る。
`color-scheme` という CSS の宣言がリポジトリのどこにも無いのが原因。

## 背景と問題

`base-css.ts:116` は `button, input, select, textarea` に
`font: inherit; color: inherit;` を与えているが、**背景色は与えていない**。背景は
ブラウザ任せで、`color-scheme` を宣言しない限りブラウザは明るい配色を前提に描く。
結果、暗い配色のときだけ「明るい背景に明るい文字」になって読めなくなる。

`prefers-color-scheme` のメディアクエリは `tokens.ts:269` にあるが、これは
「利用者の OS 設定を読む」ための条件式で、「この画面は暗い配色です」とブラウザへ
伝える `color-scheme` プロパティとは別物。後者はリポジトリ全体で 0 件。

## 現在の挙動

VRT の `catalog-form-dark` で、FormField の中の素の入力欄だけが白背景で出ている
(周囲の TextInput / Textarea は自前で背景を指定しているため暗い)。

**いまの業務画面への影響はない。** 製品コードにある素の入力欄は
`apps/hub/src/app/[tenant_slug]/signin/tenant-oidc-signin-form.tsx:93,94` の
hidden 2 つだけで、目に見えない。FormField に素のコントロールを渡している箇所も
製品コードには無く、出ているのはカタログのデモだけ。

**ただし影響は素の入力欄に限らない。** `color-scheme` は以下にも効くため、いまも
暗い配色で明るいまま出ているはず。

- ネイティブの `<select>` を押したときに開く選択肢のリスト
- スクロールバー
- 日付・時刻の入力欄のカレンダー
- ブラウザの自動入力が付ける黄色い背景

## 期待する挙動

暗い配色のとき、上記がすべて暗い側で描かれる。

## 再現手順またはユースケース

暗い配色にして、ネイティブの `<select>` を開く。選択肢のリストだけが明るいまま出る。

## 影響と優先度

いま読めなくなっている業務画面は無いが、素の部品を 1 つ足した瞬間に踏む。
また `<select>` の選択肢は現時点で影響している。medium。

## スコープ

`tokens.ts` の配色ブロックへ `color-scheme` を宣言し、`tokens.css` を再生成する。
生成コマンドは `pnpm --filter @harness-hub/ui run gen:tokens-css`。あわせて VRT の
baseline を撮り直す (素の入力欄の背景が変わるため差分が出る)。個々の部品の配色は
既に token 経由で揃っているので、この課題では触らない。

## 関連グラフ

`packages/ui/src/tokens/base-css.test.ts` (token 層の契約を固定しているテスト)。

## 受入条件

上記 acceptance のとおり。

## 検証証跡

2026-08-12 の VRT 目視で `catalog-form-dark.png` の FormField を確認。
`grep -rn "color-scheme" packages/ui/src apps/hub/src` の結果に
`color-scheme` プロパティの宣言が 0 件であることを確認。
