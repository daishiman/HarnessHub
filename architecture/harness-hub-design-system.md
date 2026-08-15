---
graph_node_id: "arch-harness-hub-design-system"
artifact_kind: "architecture"
artifact_subtypes: ["frontend"]
project_id: "harness-hub"
domain: "frontend"
tags: ["design-system","ui","graphite-amber","accessibility","responsive"]
priority: "high"
start_date: "2026-08-13"
target_date: null
iteration: null
title: "Harness Hub デザインシステム アーキテクチャ"
owners: ["daishiman"]
created_at: "2026-08-13T09:30:00Z"
updated_at: "2026-08-13T09:30:00Z"
status: "active"
depends_on: ["arch-harness-hub-frontend"]
related_nodes: ["spec-harness-hub-ui-foundation-addendum","spec-harness-hub-information-design-addendum","issue-agent-kit-elegant-design-integration-20260813"]
resource_scope: ["architecture/harness-hub-design-system.md"]
purpose: "Graphite × Amber の視覚判断を token・共通部品・画面・品質ゲートの一方向依存へ固定する"
goal: "Light/Dark/auto、レスポンシブ、アクセシビリティ、共通ヘッダーを矛盾なく実装・検査できる設計境界を維持する"
scope_in: ["色・書体・角丸・影・breakpoint の token 契約","共通 shell と画面部品の依存方向","コントラスト・VRT・画面ハードコードの品質ゲート"]
scope_out: ["業務 API と DB schema","認証認可ルール","Cloudflare deploy unit"]
acceptance: ["Graphite × Amber の用途が token・仕様・実装で一致する","641/1025 breakpoint と 44px 操作域が実ブラウザ検査を通る","30思考法の最終判定で4条件が全てPASSする"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "architecture/harness-hub-design-system.md"
template_id: "architecture"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"2cfa9d5999e571ffe278826b09b7c7090bb66ca2f86c41598324efe43bea72fa","evaluator":"run-elegant-review (30 paradigms / strict coverage)","evidence_ref":"eval-log/harness-creator/elegant-review/run-20260813-agent-kit-design-integration/verdict.json"}
source_lineage: {"imported_at":"2026-08-13T09:10:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "製品横断のUI token・共通部品・responsive・品質ゲートの責務境界を所有するため architecture/frontend に分類する"
classification_candidates: [{"artifact_kind":"architecture","candidate_path":"architecture/harness-hub-design-system.md","confidence":0.99},{"artifact_kind":"document","candidate_path":"docs/harness-hub-design-system.md","confidence":0.42}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-13T09:30:00Z","missing_sections":[],"status":"complete"}
---

# Architecture overview

Harness Hub デザインシステム アーキテクチャ（グラファイト × アンバー）。
値の正本は `packages/ui/src/tokens/tokens.ts`、用途の正本は
[docs/frontend-spec.md §2.1](../docs/frontend-spec.md)。本書は「なぜその構造なのか」の境界を持つ。

## Context and drivers

CI/ビルドツールらしい実直さを保ち、AI専用の派手な表現を避ける。同時に、画面ごとの局所的な
色・寸法指定がテーマ、コントラスト、レスポンシブの契約を壊す問題を共通層で防ぐ。

## Goals and non-goals

- 目的: token → 共通部品 → shell → 画面の一方向依存で、最小の複雑性から一貫したUIを作る。
- 非目的: 業務API、DB schema、認証認可、Cloudflare deploy unitの設計を変更しない。

## System context and boundaries

設計判断は `packages/ui`、業務上の並びとroute判断は `apps/hub`、受入条件は `specs` / `system-spec`
が所有する。個別画面は既存の共通部品を組み合わせ、視覚値を新たに定義しない。

## Container and component view

token生成、共通surface、共通shell、route固有画面の4層で構成する。ブラウザ履歴の操作だけは
小さなclient islandに閉じ、ShellHeaderとroute title解決はserver-firstのまま保つ。

## Cross-cutting contracts

Light/Dark/OS自動追従、WCAGコントラスト、44px操作域、641/1025 breakpoint、safe area、
reduced motionを全層に適用する。状態は色だけで示さず、文言・形・配置を併用する。

## Subtype architecture

本ノードはfrontend subtypeを所有する。backend、data、security、infrastructureは既存の各architecture
nodeを参照し、ここへ複製しない。

### Frontend architecture

#### Rendering and application pattern

Next.js App Router の server-first 構成を維持し、ブラウザ履歴のように Web API が必要な操作だけを
小さな client island に閉じる。共通 shell 全体を client component 化しない。

#### Routes, screens and navigation

認証後画面の route title は exact route、静的 route、dynamic route、最長一致 nav の順で解決する。
戻る・進むは共通ヘッダーに1組だけ置き、各 `ScreenHeader` やモバイルタブへ複製しない。

#### Component and design-system boundaries

視覚値は token、表現は `packages/ui`、業務上の構成と route 知識は `apps/hub` が所有する。
画面は公開された共通部品を組み合わせ、生の色・角丸・breakpoint を定義しない。

#### State and data flow

テーマ選択は既存の theme provider、現在 pathname は middleware の `x-hh-pathname`、画面タイトルは
shell resolver の一方向データフローで渡す。履歴移動だけが `window.history` を直接扱う。

#### Backend integration

本設計は API や DB の契約を変更しない。認証・workspace・検索などの既存 server data は server
component で解決し、表示に必要な最小 props だけを共通 shell へ渡す。

#### Performance and observability

client island の追加後も route client bundle の 120KiB gate を守る。navigation、VRT、bundle、
アクセシビリティの失敗は既存 CI の機械証拠として残し、画面固有の計測系を増やさない。

#### Frontend verification

token/unit/axe、360・768・1280px の browser test、Light/Dark VRT、catalog coverage、bundle gate を
組み合わせ、見た目・操作・依存境界の退行を検出する。

## Architecture decisions

Graphiteを構造と主要操作、Amberを動作中状態だけに使う。AI専用色を持たず、狭幅では情報を縮小せず
Workspace文脈と操作列を2段へ分ける。現在地はroute固有titleから最長一致navへ決定論的に解決する。

## Delivery, migration and rollback

token・共通部品・shell・画面・VRTの順で段階反映する。公開APIや永続データを変えないため、問題時は
UI変更コミットのrevertで復旧できる。テーマ選択値など既存の利用者設定は保持する。

## Risks and verification

主なリスクは色コントラスト不足、360pxでのoverflow、client bundle超過、VRTの意図しない変化である。
token/unit/axe/browser/VRT/bundle gateと30思考法の4条件判定を通し、いずれも機械証拠を残す。

## 詳細設計

### 1. 一元管理の原則 (これを崩す変更は受け入れない)

視覚に関する決定は **1 か所でしか行わない**。画面やコンポーネントが独自に色・寸法を決めた瞬間、
テーマ切替もコントラスト保証も破綻するため、次の 4 層に厳密な上下関係を敷く。

| 層 | 実体 | 決めてよいこと | 禁止 |
|---|---|---|---|
| 1. token 値 | `packages/ui/src/tokens/tokens.ts` | 色・余白・角丸・影・書体の**値** | ここ以外での値の定義 |
| 2. token 名 | `packages/ui/src/tokens/token-names.ts` | CSS 変数名の導出 (依存ゼロの葉 module) | 名前の直書き |
| 3. 共通部品 | `packages/ui/src/components` / `shell` | token を**どう組み合わせるか** | 生の色文字列・px 直書き |
| 4. 画面 | `apps/hub/src/app` `src/components` | どの部品を並べるか | 色・角丸・影・breakpoint の指定 |

- 画面 (層 4) が視覚を触りたくなったら、それは**部品 (層 3) の表現力が足りていない**という信号であり、
  画面側で style を書くのではなく部品に variant を足して解決する。
- 生の hex・`rgb()`・px の media query・素の `<button>`・画面側の `borderRadius` / `boxShadow` は
  CI ゲート `check:ui-hardcoding` (G17) が機械的に拒否する。例外は allowlist に**理由つき**で書く。
- 「部品の表現力が足りない」に対する受け皿を層 3 に用意してある。迷ったらこの表から選ぶ。

| 画面がやりたいこと | 使う部品 | 画面で style を書かない理由 |
|---|---|---|
| 面を 1 段置く | `Card` / `Panel` | 角丸・輪郭・背景の段が部品側で決まる |
| カードの内側にもう 1 段 | `Tile` (`dashed` / `tone`) | 入れ子の角丸を 1 段小さく保つ |
| 押せるもの | `Button` (`variant`) | 高さ・余白・色が `actionBaseStyle` 1 か所 |
| 遷移するもの | `ActionLink` (`variant`) | Button と同じ style 定義を共有する |
| 文章に混ぜる小さな操作 | `TextButton` (`tone`) | 見た目はリンク・意味はボタンを型で固定 |
| 画像のサムネイル | `Thumbnail` (`size`) | `alt` 既定と最適化除外の判断を 1 か所に閉じる |
| 状態のラベル | `Badge` / `StatusChip` | 色と状態の対応を画面ごとに再発明させない |

### 2. 配色の考え方

**無彩色で構造を作り、有彩色は状態にだけ使う。**

- 主操作 (CTA) はグラファイト (`primary`)。色で叫ばず、面の濃さと太さで示す。青い CTA は使わない。
- アンバー (`accent`) は「**いま動いている**」専用。生成中・検査中・公開処理中・不定進捗。
  装飾や CTA に流用した時点で、利用者は「動いている」を色で判断できなくなる。
- **唯一のナビ例外**として、640px 以下の下部タブバーは現在地アイコンだけに `accent` を使う。
  これはユーザー仕様で固定された狭幅向けの補助符号であり、`aria-current` と太字を必ず併用する。
  デスクトップ/タブレットのナビ、主要 CTA、リンク、AI 装飾へは拡張しない。
- **AI 専用色を持たない**。旧 `accentAi` (紫) は廃止。利用者から見れば AI 生成中も公開処理中も
  同じ「待っている状態」であり、区別する意味がない。AI の関与はラベルで示す。
- 有彩色の例外はチャート系列とタグのみ (`infoCyan` / `magenta`)。6 系列を明度差だけで
  区別することは不可能なため、用途を限定して許容する。

### 3. 面の 3 段と外枠

`pageBg` (最も奥) → `bg` (本文背景) → `surface` (カード) の 3 段で奥行きを作る。
影に頼らず段差だけで境界が読めるため、影を無効化しても情報が失われない。

md 以上ではアプリ本体を角丸 14px + 1px 輪郭 + `shadow-frame` で外枠として浮かせる。
高さの引き算は変数 `--hh-shell-frame-inset` 1 つに閉じ、本体・body・サイドバーでずれないようにする。
**モバイルでは外枠を付けない** — 狭幅では外周の余白が本文幅を削るだけで、
「浮いている」という情報が可読性の損失に見合わない。

角丸は入れ子の深さと一致させ、形だけで包含関係が読めるようにする。**段は 4 つだけ**で、
どの部品がどの段を使うかは部品側で固定する (画面が選ぶ余地を残さない)。

| 段 | 値 | 使う部品 |
|---|---|---|
| `frame` | 14px | アプリ外枠・Modal・ConfirmDialog・BottomSheet |
| `card` | 10px | Card・Panel・DataCard・FilterBar (`variant="card"`) |
| `md` | 8px | Button・ActionLink・入力欄・Tile・Thumbnail |
| `sm` | 4px | Badge・チップなど文字に付随する小物 |

旧 `lg` (12px) は `card` と `frame` の間に立つ中途半端な段で、同じ役割の面が画面ごとに
10px と 12px に割れる原因だったため、参照だけでなく `radiusTokens` の値と `radiusVar` の型からも
削除した。値を残すと型が通ってしまい、5 段目がいつでも復活するため。

### 4. レスポンシブ 3 区分

`breakpointTokens` = `sm 480 / md 641 / lg 1025` が数値正本 (旧 `480 / 768 / 1120` から改訂)。

| 帯 | サイドバー | 補足 |
|---|---|---|
| 〜640px | 描画しない (下部固定タブバー) | 本文塊の下端に `calc(76px + safe-area)` |
| 641〜1024px | アイコンのみ 68px | ラベル非表示 |
| 1025px〜 | フル 212px | アイコン + ラベル |

640/1024 ではなく 641/1025 を min-width に取るのは、`max-width: 640` と `min-width: 640` が
640px ちょうどで二重に当たる 1px の重なりを避けるため。`sm 480` は narrow 内の layout step。

共通ヘッダーは viewport に関係なく、履歴の戻る/進むと現在 route のタイトルを持つ。
履歴操作は 44px のアイコンボタン 2 個を名前付き navigation にまとめ、各画面の本文や
`ScreenHeader` へ複製しない。タイトルは省略表示できる 1 行にし、検索対象が無い画面では
検索欄自体を出さない。360px ではワークスペース文脈を上段、履歴・タイトル・必要な操作を
下段に分け、履歴を 44px 未満へ縮めずタイトルの可読幅 48px 以上を確保する。

### 5. デザインシステム原案から意図的に外した 3 点

**token の contrast 契約 (文字 4.5:1 / 非文字 3:1) が原案の色値に優先する。**

| 項目 | 原案 | 本システム | 理由 |
|---|---|---|---|
| light `accent` | `#b45309` | `#aa4e09` | 原案は `bg` 上で 4.44:1 と AA 不足 |
| `borderStrong` | light `#c4c4bf` / dark `#52525b` | `#868683` / `#77777e` | 1.75:1 / 2.00:1 で WCAG 1.4.11 (3:1) 不足 |
| 本文サイズ | 13〜14px | 16px | 和文は字形が複雑。WCAG 1.4.4 の 200% 拡大にも耐える必要がある |

密度を上げたい要求は density token (`compact`) 側で受ける。本文サイズを削って解決しない。

### 6. 機械保証

- `contrastRequirements` (tokens.ts) + `tokens.test.ts` — 全 token 組合せの比率を light/dark 両方で検証。
- `tokens.css` の drift test — 生成物と生成関数の一致を固定。
- `shell.test.tsx` — 外枠・サイドバー幅・タブバー余白・現在地の多重符号化に加え、
  **同じ variant の `ActionLink` と `Button` の見た目一致**と**面の角丸が card 段で揃うこと**を固定。
  「並べたときだけ気づくズレ」は目視レビューで最も落ちやすいため、契約として書く。
- `check:ui-hardcoding` (G17) — `apps/*/src` を固定列挙せず自動発見し、画面層に `raw-color` /
  `own-surface` / `px-media` / `bare-button` が現れたら fail。共通 UI 層は token と部品テストで
  有限集合を固定する。ゲート自身は新規 app、複数行 JSX、正常画面の隔離 fixture を毎回実行する。
- `catalog-coverage.test.ts` — 公開部品を足してカタログ (VRT の被写体) へ載せ忘れたら fail。
  載せ忘れた部品だけが視覚回帰の網から静かに外れるのを防ぐ。

## 2026-08-15 意味セグメントとタップ領域 (HarnessHub-s36m)

- ナビ文言の折返しは画面別 CSS やゼロ幅文字でいじらない。Hub が意味の境目を宣言し、共通 CSS は `[data-hh-meaning-segment] { white-space: nowrap }` と `.hh-shell__nav-label--segmented` だけを持つ。
- `touchTargetStyle` は表示密度 token（compact の 36px）と切り分ける。見た目の高さが下がっても、操作域の最小は 44px のままにする。
- 機械保証: `packages/ui` の shell テスト、Hub の nav label 契約、製品所有印刷 0 件、公開シェルの実ブラウザ操作域。
