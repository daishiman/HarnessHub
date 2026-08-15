# feat-semantic-emphasis-icons 要件ベースライン (P01)

本文書は feature `feat-semantic-emphasis-icons` の要件ベースラインである。P02 以降の全 task は
同一の合意事項 (絵文字禁止の対象範囲・既存実装の再利用範囲・quality_constraints 5 件の充足条件)
を本文書から参照する。

- 正本: `.dev-graph/plans/generations/feature-package-feat-semantic-emphasis-icons/b10daedf.../goal-spec.json`
- feature node: `features/feat-semantic-emphasis-icons.md`
- architecture: `architecture/harness-hub-design-system.md`, `architecture/harness-hub-frontend.md`

## 1. purpose / goal (goal-spec.json 逐語)

**purpose**

> 強調したい箇所が絵文字で表現されていると、意味が字形の見た目に依存し、配色仕様書 v2 の semantic color token とも結びつかない。強調の意味を、色・形・可視ラベルの 3 つで一貫して担わせる。

**goal**

> callout と一覧・カードの状態表現が packages/ui 所有の inline SVG アイコンと semantic color token だけで表され、絵文字の混入が lint で検出されて入らない状態にする。

## 2. scope_in 5 件 (逐語)

1. callout 4 種 ([!POINT] / [!ATTENTION] / [!WARNING] / [!NOTE]) の種別表現を inline SVG アイコン + semantic color token で表す
2. 一覧・カードの状態表現を同じ token 体系へ揃える
3. 色だけで意味を区別せず、アイコン形状か可視ラベルを必ず併置する規則の実装
4. UI 文言・callout ラベル・空状態文言への絵文字混入を検出する lint と、その CI 組込 (fail-closed)
5. packages/ui のアイコンモジュールを唯一の供給元とする所有境界

## 3. scope_out 4 件 (逐語)

1. 配色仕様書 v2 そのものの改訂
2. 各画面の情報構造・機能追加 (feat-card-list-shell の担当)
3. Markdown のカードブロック記法 (feat-card-block-authoring の担当)
4. 公開 API・DB schema・認可判定・Cloudflare deploy unit の変更

## 4. acceptance 5 件 (逐語)

1. callout 4 種が絵文字を用いず、種別ごとに異なる inline SVG アイコンと semantic color token で描き分けられる
2. 状態・日時・金額・PII・略語の表現でアイコンだけに意味を担わせず、可視ラベルが併置される
3. UI 文言・callout ラベル・空状態文言に絵文字を入れた変更が lint で検出され CI が落ちる
4. アイコンが packages/ui のアイコンモジュール以外から供給されていない
5. ライトモードで強調ブロックの背景がグレー系ではなく semantic token 由来の配色になっている

## 5. quality_constraints 5 件の充足条件

各制約は「何が満たされていれば合格か」を機械検証可能な形へ書き下す。判定は散文の自己申告では
なく、列挙した command の exit code とテストの結果を根拠とする。

### 5.1 emoji-ban-semantic-token-qa232-5

出典: `system-spec/spec-state.json` qa-232【5 強調表示とアイコン】

強調表現 (callout 4 種・一覧/カードの状態表現) は絵文字を使わず、semantic color token と
packages/ui 所有の inline SVG アイコンだけで行う。色だけで意味を区別せず、アイコン形状か
可視ラベルを併置する。

**充足条件**

- `packages/ui/src/components/Markdown.tsx` の callout 4 種が、種別ごとに異なる `IconName` と
  `ColorTokenName` の組で描かれ、種別文字列を絵文字へ写像する経路が存在しない
- callout 4 種が `data-hh-callout` 属性で種別を DOM へ出し、色以外の識別手段を持つ
- 判定: `packages/ui/src/components/Markdown.test.tsx` の callout 描き分けテストが green

### 5.2 icon-lint-ci-fail-closed-qa233-6

出典: `system-spec/spec-state.json` qa-233【6 アイコン】

UI 文言・callout ラベル・空状態文言への絵文字混入を lint で検出し、CI へ fail-closed で
組み込む。

**充足条件**

- `scripts/lint-ui-text-emoji.py` が `packages/ui/src` と `apps/hub/src` 配下の `.ts` / `.tsx` を走査し、
  絵文字検出時に非ゼロ終了する。画面側 (`apps/hub/src`) を含めるのは、scope_in 4 の「UI 文言・
  空状態文言」が共通 UI 部品ではなく画面に直接書かれるため
- `.github/workflows/ci.yml` の `static-gates` ジョブが上記 lint を実行し、lint 未実行では CI が
  成功しない
- lint の判定が空になっても緑になる無音の失効を防ぐため、意図的に絵文字を置いた一時ツリーで
  非ゼロ終了しなければ CI を落とす実効性チェックを併置する
- 判定: `python3 scripts/lint-ui-text-emoji.py --repo-root .` が exit 0、かつ
  `tests/scripts-root/test_root__lint_ui_text_emoji.py` が green

**絵文字の定義 (誤検出を避けるための線引き)**

Unicode の `Emoji_Presentation=Yes` (既定で絵文字として描画される符号位置) と、異体字セレクタ
U+FE0F を伴って絵文字表示へ切り替わる文字だけを違反とする。`→` `←` `▲` `▼` `↕` `■` `▾` `▸` の
ような既定でテキスト表示される記号は違反にしない。これらは日本語コメントの矢印やソート方向の
印として既に多数使われており、一律禁止にすると違反が数十件出て lint そのものが無視される
(ゲートの実効性を殺す)。

### 5.3 icon-ownership-boundary-qa233-3

出典: `system-spec/spec-state.json` qa-233【3 一覧部品の共通化】(所有境界の同型適用)

アイコンモジュールは packages/ui が単一で所有し、apps/hub 側で再実装しない。

**充足条件**

- アイコンの定義は `packages/ui/src/icons/index.tsx` の `iconNames` / `Icon` に限られる
- apps/hub 側に別のアイコンライブラリ依存や inline SVG のアイコン定義が入らない
- 判定: `packages/ui` 以外に `iconNames` 相当の定義が存在しないこと (P10 の独立レビューで確認)

### 5.4 design-system-token-and-contrast-gate

出典: `architecture/harness-hub-design-system.md` scope_in

ライトモードの強調ブロック背景は semantic token 由来の配色とし、token 外のグレー系配色を
用いない。

**充足条件**

- callout 背景が `infoBlueSoft` / `dangerSoft` / `warningSoft` の semantic token で指定され、
  hex/rgb などの色リテラル直書きがない
- 一覧・カードの状態表現 (`Badge.tsx` 等) が `colorVar()` の token だけで色付けされる
- 判定: `packages/ui/src/tokens/contrast.test.ts` と `visual-contract.test.tsx` が green

### 5.5 state-value-visible-label-qa232-2

出典: `system-spec/spec-state.json` qa-232【2 カードの情報顕著度】

状態・日時・金額・PII・略語は可視ラベルを既定とし、アイコンだけに意味を担わせない。

**充足条件**

- callout はアイコンと併せて種別ラベル (`POINT` / `ATTENTION` / `WARNING` / `NOTE`) を持つ
- 状態バッジは tone (色) だけでなく `children` のテキストで意味を伝える
- 判定: callout ラベルの描画テストが green

## 6. 既存実装の棚卸し (すでに存在する部分)

本 feature の着手時点で、次の 3 つは**すでに実装済み**である。P05 はこれらを変更しない。

| 実装 | 位置 | 内容 |
| --- | --- | --- |
| callout 用アイコン 4 種 | `packages/ui/src/icons/index.tsx` | `lightbulb` / `alertTriangle` / `alertOctagon` / `infoCircle` を `iconNames` へ追加済み |
| callout の描き分け | `packages/ui/src/components/Markdown.tsx` | `remarkCallouts` と `Callout` が 4 種を絵文字なしで描き分け、`calloutIcon` が種別→アイコン+color token を写像 |
| ライトモード用 token | `packages/ui/src/tokens/tokens.ts` | `infoBlue` / `infoBlueSoft` を追加済み。ライトモードで `primarySoft` / `neutralSoft` がグレー系で判別不能になる問題を解消する |

## 7. 本 feature の残作業 (要件としての確定)

上記 6 の棚卸しから、残作業は次の 3 点に限定される。これを要件ベースラインとして確定する。

1. **絵文字 lint が未整備** — 検出 script と CI への fail-closed 組込みがない
2. **一覧/カード状態表現の token 監査** — `Badge.tsx` 等が semantic token だけで色付けされているかの確認と、
   token 外の色指定が残っていれば是正
3. **可視ラベル併置の監査** — アイコンだけに意味を担わせていないかの確認

既存の callout / icon / token 実装の変更は scope_out とする。動いているものを触ると、本 feature の
目的 (絵文字の排除) と無関係な視覚回帰の原因になる。
