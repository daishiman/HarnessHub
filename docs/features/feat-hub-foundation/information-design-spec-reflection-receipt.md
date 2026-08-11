---
status: accepted
layer: feature-spec-reflection
spec_impact: reflected
reviewed_at: 2026-08-11
feature_node_id: feat-hub-foundation
dev_graph_node_id: spec-harness-hub-information-design-addendum
beads_ids:
  - HarnessHub-f6ix
  - HarnessHub-9wdm
---

# 画面情報設計 仕様反映受領書

## 1. 依頼と目的

今回変更中の画面情報設計 (製品規範・frontend 文書・system-spec 生成基盤) を最終レビューし、差分と品質ゲートを確認したうえで、仕様・設計への影響を正規層へ反映し、無関係差分を混ぜずに draft PR へ公開する。目的は、保存項目の直写や装飾の後付けで読みづらい画面が量産されないよう、利用文脈から情報の取捨・強弱・表現を決める契約を固定することである。

## 2. 結論

- **仕様・設計影響: あり (`reflected`)**。
- 製品規範は `specs/harness-hub-information-design-addendum.md`、architecture は `architecture/harness-hub-frontend.md` の依存追加、docs は frontend-spec / UI foundation / screen-inventory / 実装ガイド、system-spec は frontend / ui-ux 章への append-only 追補、features / tasks は post-closeout writeback、生成基盤は knowledge card と required-info を反映済み。
- 公開 API、DB schema、認証認可判定、Cloudflare deploy unit は変更しない。
- 30 思考法の独立レビューで 4 条件 (矛盾なし / 漏れなし / 整合性あり / 依存関係整合) が全 PASS。
- required-info の item 別回答を writer が決定論的に接地検査する実装は **未完了** であり、独立 follow-up `HarnessHub-9wdm` / `issue-system-spec-required-info-answer-gate-20260811` として残す。
- 手書き変更ファイルは repository の Markdown 300 行上限以下。`docs/frontend-spec.md` は §6 を `docs/frontend-responsive-mobile-spec.md` へ分離して適合。生成正本の `.dev-graph/state/graph.json` は行数上限の対象外。

## 3. 仕様影響の判断理由

| 観点 | 判断 |
|---|---|
| 単なる内部リファクタリングか | いいえ。画面横断の情報設計工程・profile・pattern を製品契約にした |
| 数値・語彙契約が変わるか | はい。顕著度を `lead / context / metadata` に統一し、P 番号衝突を解消した |
| 品質ゲートが変わるか | 生成時は `screen-information-priority` が blocking required-info。UI 実装の machine gate は既存 UI 基盤を再利用 |
| 外部データ契約が変わるか | いいえ。API・DB・認可結果は不変 |
| mockup の位置づけ | 見た目の初期 reference であり、画面横断の情報設計 SSOT ではない |

## 4. 正規反映先

| 層 | 反映内容 |
|---|---|
| `system-spec/` | `frontend.md` / `ui-ux.md` に 2026-08-11 追補節 (append-only)。既存 qa-226 / qa-227 を維持し、mockup の情報設計 SSOT 誤解を正す |
| `specs/` | `harness-hub-information-design-addendum.md` (FR-IDS / BR-IDS / pattern registry) |
| `architecture/` | `harness-hub-frontend.md` が情報設計追補へ depends_on |
| `features/` | `feat-hub-foundation.md` の post-closeout 節と related_nodes |
| `tasks/` | feat-hub-foundation P12 / P13 の文書・公開追補 |
| `docs/` | frontend-spec §3.6、UI foundation guide、screen-inventory profile 表、実装ガイド、本受領書 |
| system-spec-harness | knowledge `information-design`、required-info `screen-information-priority`、R2/R3/R5 prompt、contract tests |
| Dev Graph / Beads | `spec-harness-hub-information-design-addendum` + `HarnessHub-f6ix`、follow-up `HarnessHub-9wdm` |

## 5. 最終レビュー結果

### 収束した改善 (elegant-review)

- 固定的なラベル全外し・4 形式上限・件数上限を廃止し、要素別意味契約と open-world pattern 台帳へ変更。
- 顕著度を `lead / context / metadata` に統一。構築 phase と responsive pattern の P 番号衝突を解消。
- profile を `role × task-mode × breakpoint` にし、S01〜S18 と共通シェルの割当を screen-inventory に集約。
- 相対時刻・短縮 ID から、可視または操作可能な正確値へ到達できる契約へ変更。
- current machine gate / manual gate / future machine gate を実装実態に合わせて分離。

### 確認した非影響

- 公開 endpoint、DTO、DB migration、認可の最終判定、Worker deploy unit は差分に含まれない。
- 既存 UI 実装コード (`apps/hub` / `packages/ui`) は本 PR では変更しない。画面改修時に情報設計シートを起こして寄せる。

## 6. 品質ゲート (MVP 最小)

| ゲート | 結果 |
|---|---|
| focused plugin tests (information-design / knowledge cards / compile knowledge) | 19 passed |
| required-info catalog DAG | PASS (`screen-information-priority` が blocking、`frontend-arch` が depends_on) |
| knowledge catalog topo order | PASS (`information-design` は usability-accessibility の後) |
| elegant-review 4 条件 | 全 PASS (`eval-log/elegant-review/harness-hub-information-design-20260811/`) |
| 手書き Markdown 300 行 | PASS (`frontend-spec.md` を responsive 本文分離後 251 行、追補 220 行) |
| whitespace | 変更ファイルに対して `git diff --check` を実施 |

補足: 先行セッション記録では system-spec-harness full suite 566 passed。本最終レビューでは MVP として focused + 決定論 validator を再実行した。UI 実装の browser/VRT は本変更が runtime コードを触らないため対象外。

## 7. 残課題

1. `HarnessHub-9wdm`: required_info_answers の item 別状態を writer で fail-closed 検査する。
2. profile schema / pattern registry / critical parity E2E の将来 machine gate (予定を PASS 証跡にしない)。
3. 既存画面の一括改修はしない。改修対象画面だけ情報設計シートを起こす。
4. draft PR merge 後の default branch reconciliation で graph / Beads を閉じる。

## 8. 説明

### 中学生向け

画面を作るとき、データベースの項目をそのまま並べるのではなく、「誰が何をしたいのか」を先に決めてから、大事な情報を目立たせ、いらない情報を減らすルールを書きました。スマホでもパソコンでも、探す・比べる・直す仕事が途中で消えないようにします。

### 専門向け

UI 基盤の component/token 契約の上位に、adaptive information architecture を置いた。`role × task-mode × breakpoint` の profile、`lead/context/metadata` の salience、open-world pattern registry、要素別意味契約を SSOT 分離し、system-spec elicitation では `screen-information-priority` を `frontend-arch` の前提 blocking item とした。
