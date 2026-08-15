---
graph_node_id: "feat-semantic-emphasis-icons"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "ui-ux"
tags: ["card-ui","design-system","iconography","accessibility","lint"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "強調表現の絵文字廃止と semantic アイコン・配色への一本化"
owners: ["daishiman"]
created_at: "2026-08-13T22:39:59Z"
updated_at: "2026-08-14T11:31:21Z"
status: "closed"
depends_on: []
related_nodes: ["arch-harness-hub-design-system","arch-harness-hub-frontend","feat-docs-cms"]
resource_scope: ["packages/ui/src/icons","packages/ui/src/markdown","packages/ui/src/tokens","scripts/lint"]
purpose: "強調したい箇所が絵文字で表現されていると、意味が字形の見た目に依存し、配色仕様書 v2 の semantic color token とも結びつかない。強調の意味を、色・形・可視ラベルの 3 つで一貫して担わせる。"
goal: "callout と一覧・カードの状態表現が packages/ui 所有の inline SVG アイコンと semantic color token だけで表され、絵文字の混入が lint で検出されて入らない状態にする。"
scope_in: ["callout 4 種 ([!POINT] / [!ATTENTION] / [!WARNING] / [!NOTE]) の種別表現を inline SVG アイコン + semantic color token で表す","一覧・カードの状態表現を同じ token 体系へ揃える","色だけで意味を区別せず、アイコン形状か可視ラベルを必ず併置する規則の実装","UI 文言・callout ラベル・空状態文言への絵文字混入を検出する lint と、その CI 組込 (fail-closed)","packages/ui のアイコンモジュールを唯一の供給元とする所有境界"]
scope_out: ["配色仕様書 v2 そのものの改訂","各画面の情報構造・機能追加 (feat-card-list-shell の担当)","Markdown のカードブロック記法 (feat-card-block-authoring の担当)","公開 API・DB schema・認可判定・Cloudflare deploy unit の変更"]
acceptance: ["callout 4 種が絵文字を用いず、種別ごとに異なる inline SVG アイコンと semantic color token で描き分けられる","状態・日時・金額・PII・略語の表現でアイコンだけに意味を担わせず、可視ラベルが併置される","UI 文言・callout ラベル・空状態文言に絵文字を入れた変更が lint で検出され CI が落ちる","アイコンが packages/ui のアイコンモジュール以外から供給されていない","ライトモードで強調ブロックの背景がグレー系ではなく semantic token 由来の配色になっている"]
architecture_refs: ["arch-harness-hub-design-system","arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-semantic-emphasis-icons.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"b10daedf4d24a112c73943e2cecac213a193042aaa0e6e43518a2314a64cfbdf","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-semantic-emphasis-icons/b10daedf4d24a112c73943e2cecac213a193042aaa0e6e43518a2314a64cfbdf/plan-findings.json"}
source_lineage: {"imported_at":"2026-08-13T22:39:59Z","origin_kind":"system-spec-harness","source_digest":"dbbd08788007feb6a8923a47ec8edbf8b20ac6153853d661da13d78140b7cdff","source_path":"system-spec/spec-state.json","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.92
classification_reason: "C14 マクロ分解 (qa-232【5】・qa-233【6】から導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-semantic-emphasis-icons.md","confidence":0.92}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-xo7n","linked_at":"2026-08-14T03:40:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-14T00:20:00Z","missing_sections":[],"status":"complete"}
---

# 強調表現の絵文字廃止と semantic アイコン・配色への一本化

## 0. なぜこの feature があるのか

利用者の要望は「強調したいポイントは絵文字ではなく、今回の構成に合った色合いや形のアイコンを使って表示する」だった。

絵文字は、意味を字形の見た目に委ねる。同じ絵文字でも環境によって字形が変わり、色は semantic color token の体系の外にあるため、配色仕様書 v2 と結びつかない。強調は「何が重要か」を伝える意味の装置なので、色・形・可視ラベルの 3 つで一貫して担わせる。

本 feature は他の 3 feature の土台になる。カード一覧もカードブロック本文も、状態や強調をこの体系の上に描くためである。

## 1. 目的

強調したい箇所が絵文字で表現されていると、意味が字形の見た目に依存し、配色仕様書 v2 の semantic color token とも結びつかない。強調の意味を、色・形・可視ラベルの 3 つで一貫して担わせる。

## 2. ゴール

callout と一覧・カードの状態表現が packages/ui 所有の inline SVG アイコンと semantic color token だけで表され、絵文字の混入が lint で検出されて入らない状態にする。

## 3. 含むもの

- callout 4 種 (`[!POINT]` / `[!ATTENTION]` / `[!WARNING]` / `[!NOTE]`) の種別表現を inline SVG アイコン + semantic color token で表す
- 一覧・カードの状態表現を同じ token 体系へ揃える
- 色だけで意味を区別せず、アイコン形状か可視ラベルを必ず併置する規則の実装
- UI 文言・callout ラベル・空状態文言への絵文字混入を検出する lint と、その CI 組込 (fail-closed)
- packages/ui のアイコンモジュールを唯一の供給元とする所有境界

## 4. 含まないもの

- 配色仕様書 v2 そのものの改訂
- 各画面の情報構造・機能追加 (`feat-card-list-shell` の担当)
- Markdown のカードブロック記法 (`feat-card-block-authoring` の担当)
- 公開 API・DB schema・認可判定・Cloudflare deploy unit の変更

## 5. 受入基準

- callout 4 種が絵文字を用いず、種別ごとに異なる inline SVG アイコンと semantic color token で描き分けられる
- 状態・日時・金額・PII・略語の表現でアイコンだけに意味を担わせず、可視ラベルが併置される
- UI 文言・callout ラベル・空状態文言に絵文字を入れた変更が lint で検出され CI が落ちる
- アイコンが packages/ui のアイコンモジュール以外から供給されていない
- ライトモードで強調ブロックの背景がグレー系ではなく semantic token 由来の配色になっている

## 6. 前提となる feature

なし (本 feature が `feat-card-list-shell` と `feat-card-block-authoring` の前提になる)

## 7. 参照するアーキテクチャ

- `arch-harness-hub-design-system`
- `arch-harness-hub-frontend`

## 8. 補足

> **色だけで意味を区別しない**は既存の「色だけで系列を区別しない」契約と同型である。色覚特性や表示環境によって色差が失われても、形か文字が残れば意味は伝わる。

> **lint がこの feature の要である。** callout のアイコン化そのものは一度直せば済むが、絵文字は次の変更でまた入る。検出を CI へ fail-closed で組み込まない限り、この feature は完了後に劣化する。

## 9. 出所

`system-spec/spec-state.json` の qa-232【5】および qa-233【6】を macro 分解したもの (digest `dbbd08788007feb6…`)。
本 feature は仕様本文を複製せず、`architecture_refs` と source lineage で参照する。

## 10. 実装結果 (P13 書き戻し)

**リリース可否: 可。** P01〜P12 を完了し、受入基準 5 件と quality_constraints 5 件を
すべて充足した (P10 `final-review.md` の最終判定は合格、差し戻しなし)。実行時コードの変更は
なく、DB schema・公開 API・認可判定・既存部品の props はいずれも不変であるため、
反映のタイミングに制約はない。deploy の実行自体は本 feature の scope_out。

| 受入基準 | 実装 |
| --- | --- |
| callout 4 種のアイコン + token | `lightbulb` / `alertTriangle` / `alertOctagon` / `infoCircle` を追加し、形で種別・色で強さを表す |
| 可視ラベルの併置 | 7 部品監査で全て色以外の識別手段あり。axe 35 件 pass |
| 絵文字混入で CI が落ちる | `scripts/lint-ui-text-emoji.py` を CI の `static-gates` へ **G19** として結線 |
| アイコン供給元の一本化 | `packages/ui/src/icons/index.tsx` のみ。`apps/hub/src` の `<svg>` は 0 件 |
| ライトモードの強調ブロック背景 | `infoBlueSoft` / `dangerSoft` / `warningSoft`。グレー系の `primarySoft` / `neutralSoft` は使わない |

判定の要点は 3 つ。

1. **lint 自身の失効を塞いだ。** G19 は 2 ステップ構成で、2 ステップ目が意図的に絵文字を置いた
   probe に対し **exit 1 ちょうど**を要求する。lint の判定ロジックが空になると違反 0 件として
   緑で素通りするため、「落ちたこと」ではなく「意図した理由で落ちたこと」を測る。
2. **VRT は常時ゲートではない。** `ui-visual.yml` は `workflow_dispatch` か PR ラベル `ui-visual` の
   opt-in で、`update_baseline` モードの run は比較を行わない。加えて catalog の `MarkdownView`
   entry に callout 記法が無く、現状 VRT を回しても callout の視覚回帰は検出できない。
3. **所有境界を守らせる CI ゲートは無い。** 現状は実測で成立しているだけで、`apps/hub` 側での
   inline SVG 再実装は既存のどのゲートにも掛からない。

`architecture/harness-hub-design-system.md` へは §2 (強調ブロックの面 = semantic token 由来・
グレー系を使わない) と §6 (G19 と 3 値 exit の根拠) を書き戻した。

自動検出できない退行 3 件 — (a) `apps/hub` 側の inline SVG 再実装、(b) callout の VRT 未被覆、
(c) 新規部品の色単独表現 — はフォローアップ課題として起票する。

成果物: [`docs/features/feat-semantic-emphasis-icons/`](../docs/features/feat-semantic-emphasis-icons/final-review.md)
(P09 品質ゲート / P10 最終レビュー / P11 証跡バンドル / P12 運用手引き)。
