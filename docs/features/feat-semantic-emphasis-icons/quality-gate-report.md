---
status: recorded
layer: feature-evidence
parent_feature: feat-semantic-emphasis-icons
recorded_at: 2026-08-14
---

# feat-semantic-emphasis-icons 品質ゲート確認報告 (P09)

goal-spec.json の quality_constraints 5 件が CI の品質ゲートで担保されていることを、
ワークフロー定義の実構造とローカル実測で確認する。確認日: 2026-08-14。

「ゲートが存在すること」ではなく「落ちるべきときに CI 全体が落ちること」を判定基準とする。

## 判定サマリ

| # | quality_constraint | CI ゲート | 判定 |
| --- | --- | --- | --- |
| 1 | `emoji-ban-semantic-token-qa232-5` | G19 (絵文字 lint) + G9 (axe) + G4 (contrast/tokens) | **充足** |
| 2 | `icon-lint-ci-fail-closed-qa233-6` | G19 の 2 ステップ + `needs` 連鎖 | **充足** |
| 3 | `icon-ownership-boundary-qa233-3` | なし (実測のみ) | **条件付き充足** |
| 4 | `design-system-token-and-contrast-gate` | G17 (ハードコード) + G4 (contrast) / VRT は opt-in | **条件付き充足** |
| 5 | `state-value-visible-label-qa232-2` | G9 (axe) + 単体テスト | **条件付き充足** |

**リリースを妨げる不充足はない。** ただし 3・4・5 は「現状が正しいこと」は実測で確認できるが、
**将来の退行を自動検出する CI ゲートが無い**部分を含む。その範囲は §4 に明記する。

## 1. fail-closed の成立 (acceptance a)

### 1.1 ジョブ依存の構造

```
static-gates (needs なし)
   ├─→ test          (needs: static-gates)
   └─→ deploy        (needs: [static-gates, test])
```

G19 は `static-gates` に属する。`test` が `needs: static-gates` を宣言しているため、
**G19 が落ちればビルドもテストも起動せず、deploy にも到達しない**。

### 1.2 迂回経路が無いことの確認

| 検査 | 結果 |
| --- | --- |
| `static-gates` 内ステップの `continue-on-error` | **0 件** (失敗を握り潰す指定なし) |
| `static-gates` 内ステップの `if:` 条件 | **0 件** (条件付き skip の経路なし) |
| `static-gates` ジョブ自体の `if:` | なし (常時実行) |
| `deploy` の `if:` | あり。ただし `needs: [static-gates, test]` は維持 |

`deploy` の `if` は「main への push / 手動実行のときだけ配信する」という配信条件であり、
ゲートを緩めるものではない。`needs` は独立に効く。

### 1.3 lint 本体が壊れても検出できること

lint script の判定ロジックが空になると、違反 0 件として **緑のまま素通り**する
(無音の失効)。これを塞ぐのが 2 ステップ目の detector 実効性チェックである。

| ステップ | 判定 |
| --- | --- |
| `G19 共通 UI 層の絵文字混入検査` | 実リポジトリを検査。違反があれば非ゼロ終了 |
| `G19 detector 実効性` | 意図的に絵文字を置いた probe で **exit 1 ちょうど**でなければ CI を落とす |

`exit 1 ちょうど`に狭めた理由は、probe ツリーに既定 root の `apps/hub/src` が無く、
`--root` を省くと exit 2 (設定エラー) で非ゼロになり「絵文字を検出できたか」を問えなく
なるためである (`design-review.md` §3.2 で検出・是正済み)。

**判定: acceptance a 充足。** lint step が失敗すれば CI 全体が失敗し、lint が判定能力を
失った場合も実効性ステップが CI を落とす。

## 2. a11y・コントラスト・VRT の確認結果 (acceptance b)

### 2.1 a11y (G9)

CI の G9 は 2 段構成で、どちらか一方が落ちれば `&&` で全体が非ゼロになる。

```yaml
run: pnpm --filter @harness-hub/ui run test:a11y && pnpm --filter @harness-hub/hub run test:a11y
```

| 対象 | command | 実測 |
| --- | --- | --- |
| 部品単体 (packages/ui) | `vitest run src/a11y` | **30 passed** |
| 画面結合 (apps/hub) | `vitest run tests/a11y` | **5 passed** (1 file / 230ms) |

callout の `role="note"` / `aria-label` / `data-hh-callout` は `Markdown.test.tsx` (30 件) が
固定しており、axe の自動検出可能な違反はゼロ。

### 2.2 コントラスト (G4 の一部)

`contrast.test.ts` (14 件) が `contrastRequirements` の宣言に対して 5 配色 × light/dark を
検証し、`tokens.test.ts` (394 件) が token 定義を網羅する。いずれも `pnpm -r test` = G4 に
含まれるため、閾値割れは CI で落ちる。

P06 では宣言に依存しない二重確認として、実 hex から WCAG 2.1 相対輝度を手計算した。
ライトモードの callout 4 種は本文 14.77〜15.88 (基準 4.5)、アイコン+枠線 3.15〜5.79
(基準 3.0) で全て基準超過 (`test-run-report.md` §4.1)。

### 2.3 画面層のハードコーディング (G17)

```bash
node scripts/ci/check-ui-hardcoding.mjs
→ check:ui-hardcoding OK — 画面層に視覚のハードコーディングはありません   (exit 0)
```

CI では `pnpm check:ui-hardcoding` が **検査本体の前に `node --test check-ui-hardcoding.test.mjs`
を走らせる**構成になっており、検査ロジック自体のテストが先に落ちる。G19 と同じ
「無音の失効を塞ぐ」思想が既に適用されている。

### 2.4 VRT (**必須ゲートではない**)

`ui-visual.yml` は通常 CI から分離されており、起動条件は次のいずれかに限られる。

| 起動条件 | 内容 |
| --- | --- |
| `workflow_dispatch` | 手動実行 |
| PR ラベル `ui-visual` | ラベルが付いた PR のみ |

つまり **VRT はラベルなし PR では実行されない opt-in ジョブ**であり、
「CI が常時 VRT で視覚回帰を止めている」とは言えない。加えて `update_baseline` モードの
run は比較を一切行わないため、緑を「差分なし」と読んではならない (ワークフロー自身が
コメントで警告している)。

**さらに被覆ギャップがある**: `apps/hub/tests/browser/catalog/entries-data.tsx` の
`MarkdownView` entry は見出しと箇条書きだけで、callout 記法 (`[!POINT]` 等) を含まない。
したがって callout の視覚回帰は、VRT を実行しても現状では検出できない。

**判定: acceptance b は「a11y・コントラストは充足、VRT は範囲を明示した上で条件付き」。**
callout の視覚は `Markdown.test.tsx` の DOM 契約 (`data-hh-callout` と token 名) と
`visual-contract.test.tsx` (2 件) が担保しており、リリース可否を妨げる欠落ではない。

## 3. quality_constraints 5 件の個別判定 (acceptance c)

### 3.1 `emoji-ban-semantic-token-qa232-5` — 充足

| 要求 | 担保 |
| --- | --- |
| 絵文字を使わない | G19 の lint (534 file / exit 0) |
| semantic token と inline SVG だけで表す | G17 のハードコード検査 (exit 0) + `calloutStyle` が全て `colorVar()` |
| 色だけで意味を区別しない | callout 4 種のアイコン形状が全て異なる + `aria-label` |

### 3.2 `icon-lint-ci-fail-closed-qa233-6` — 充足

§1 の fail-closed 構造がそのまま根拠。lint 単体ではなく `needs` 連鎖と detector 実効性の
2 枚で成立している。

### 3.3 `icon-ownership-boundary-qa233-3` — 条件付き充足

現状は実測で成立している。

| 検査 | 結果 |
| --- | --- |
| `apps/hub/src` 内の `<svg` | 0 件 |
| `lucide` / `react-icons` / `heroicons` / `@tabler/icons` 依存 | 0 件 |
| `iconNames` の定義箇所 | `packages/ui/src/icons/index.tsx` の 1 箇所 |

**ただし所有境界を守らせる CI ゲートは存在しない。** apps/hub 側で inline SVG を書き直す
退行は現状のどのゲートにも掛からない (G17 は色・サイズ等の視覚値を見るもので、
SVG の実装元は見ない)。フォローアップ課題として §4 に記録する。

### 3.4 `design-system-token-and-contrast-gate` — 条件付き充足

| 要求 | 担保 | 常時実行 |
| --- | --- | --- |
| token 契約 | G17 ハードコード検査 | はい (test ジョブ) |
| コントラスト | G4 の `contrast.test.ts` / `tokens.test.ts` | はい |
| VRT | `ui-visual.yml` | **いいえ (opt-in)** |
| ライトモード強調ブロックが semantic token 由来 | G4 + P06 §4.1 の実測 | はい |

VRT が常時ゲートでない点だけが条件付きの理由。これは本 feature が持ち込んだ制約ではなく、
リポジトリ既存の運用方針 (Chromium 取得コストを避けるための分離) である。

### 3.5 `state-value-visible-label-qa232-2` — 条件付き充足

P02 §5 の 7 部品監査で、Badge / Alert / Chip / Toast / StageBoard / KpiCard / callout の
すべてが色以外の識別手段 (テキスト・記号・アイコン形状) を持つことを確認済み。
G9 の axe (30 + 5 件) が pass している。

**ただし「色だけに意味を担わせていないこと」は axe が検出できる違反ではない。**
新規部品が色単独表現を持ち込む退行は自動検出できない。

## 4. ゲートで検出できない範囲 (フォローアップ)

本 feature の受入を妨げないが、退行を自動で止められない範囲を明示する。

| # | 検出できない退行 | 対応候補 |
| --- | --- | --- |
| 1 | `apps/hub` 側での inline SVG によるアイコン再実装 | 所有境界 lint (apps/hub の `<svg` とアイコンライブラリ import を禁止) |
| 2 | callout の視覚回帰 | catalog の `MarkdownView` entry へ callout 記法 4 種を追加し VRT 被覆へ入れる |
| 3 | 新規部品の色単独表現 | axe では不可。部品追加時のレビュー観点として design-system.md へ明文化 |

いずれも本 feature の Write scope 外 (P09 の scope は本報告書のみ) のため、
別 issue として起票する。

## 5. 判定

| acceptance | 判定 | 根拠 |
| --- | --- | --- |
| a lint が CI 上で fail-closed に機能する | **pass** | §1 (needs 連鎖 / continue-on-error 0 件 / detector 実効性) |
| b a11y・コントラスト・VRT 相当の確認結果 | **pass** | §2 (a11y 35 件 / コントラスト実測 / VRT の適用範囲を明示) |
| c quality_constraints 5 件の CI ゲート充足 | **pass** | §3 (5 件すべて充足。うち 3 件は §4 の範囲を明示した条件付き) |

**P09 合格。P05 / P06 への差し戻しはない。**
