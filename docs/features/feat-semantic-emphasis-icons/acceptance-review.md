---
status: recorded
layer: feature-evidence
parent_feature: feat-semantic-emphasis-icons
recorded_at: 2026-08-14
---

# feat-semantic-emphasis-icons 受入判定 (P07)

goal-spec.json の acceptance 5 項目について、充足の根拠 (対応する実装ファイルとテスト結果) を
項目ごとに記録する。判定日: 2026-08-14。

判定は P06 の `test-run-report.md` の実測を一次資料とし、実装ファイルの該当箇所を突き合わせる。

## 判定サマリ

| # | acceptance (逐語要約) | 判定 |
| --- | --- | --- |
| 1 | callout 4 種が絵文字なしで種別ごとに異なる SVG アイコン + semantic token で描き分け | **充足** |
| 2 | 状態・日時・金額・PII・略語でアイコンだけに意味を担わせず可視ラベルを併置 | **充足** |
| 3 | UI 文言・callout ラベル・空状態文言への絵文字混入が lint で検出され CI が落ちる | **充足** |
| 4 | アイコンが packages/ui のアイコンモジュール以外から供給されていない | **充足** |
| 5 | ライトモードで強調ブロック背景がグレー系でなく semantic token 由来の配色 | **充足** |

**5 項目すべて充足。未充足項目なし。P05 / P06 への差し戻しはない。**

## 1. callout 4 種の絵文字なし描き分け

**実装**

| 要素 | 位置 | 内容 |
| --- | --- | --- |
| 種別定義 | `packages/ui/src/components/Markdown.tsx` `CalloutKind` | `point` / `attention` / `warning` / `note` |
| 記法の解釈 | 同 `remarkCallouts` | `[!POINT]` / `[!ATTENTION]` / `[!WARNING]` / `[!NOTE]` |
| 面と枠線 | 同 `calloutStyle` | `infoBlueSoft` / `dangerSoft` / `warningSoft` / `infoBlueSoft` |
| アイコン | 同 `calloutIcon` | `lightbulb` / `alertTriangle` / `alertOctagon` / `infoCircle` |
| アイコン実体 | `packages/ui/src/icons/index.tsx` | inline SVG (`iconNames` に登録) |

種別文字列を絵文字へ写像する経路は存在しない。色は全て `colorVar()` の semantic token 経由で、
hex / rgb の直書きはない。

**テスト結果**: `packages/ui/src/components/Markdown.test.tsx` 30 件 pass
(4 種の描き分けと SVG アイコン描画を固定)。lint も `exit 0` (検査 534 file、絵文字ゼロ)。

## 2. 可視ラベルの併置

**実装**

| 対象 | 可視ラベル / 色以外の識別手段 |
| --- | --- |
| callout 4 種 | `aria-label` に種別ラベル + 形状の異なるアイコン 4 種 + `data-hh-callout` 属性 |
| Badge | `children` のテキスト (tone は色のみを担当) |
| Alert / Chip / Toast | title・description・ラベルテキスト |
| StageBoard | `riskIcons` の記号 (▲ / ■) |
| KpiCard | `symbol` + `description` (`増加` / `減少` / `変化なし`) |

**テスト結果**: `src/a11y/axe.test.tsx` 30 件 pass (自動検出可能な a11y 違反ゼロ)。
`Markdown.test.tsx` が callout ラベルの描画を固定。

**判定の限界 (明記)**: 「色だけに意味を担わせていないこと」の全網羅は自動検査では判定できない。
本項目は P02 §5 の 7 部品監査 (全て色以外の識別手段あり) と axe の結果を根拠とする。
新規部品が色単独表現を持ち込む退行は、現状の CI では検出できない (§5 の残課題)。

## 3. 絵文字 lint による検出と CI 失敗

**実装**

| 要素 | 位置 |
| --- | --- |
| lint 本体 | `scripts/lint-ui-text-emoji.py` (Python 3 / stdlib のみ) |
| 検査対象 | `packages/ui/src` (UI 部品・callout ラベル) と `apps/hub/src` (空状態文言) の `.ts` / `.tsx` |
| CI 結線 | `.github/workflows/ci.yml` `static-gates` の G19 (lint 本体 + detector 実効性の 2 ステップ) |

**テスト結果**

| 検証 | 実測 |
| --- | --- |
| 混入なし (本 repo) | exit 0 / 534 file |
| 混入あり (probe) | exit 1 / 行・列・符号位置つきで報告 |
| root 不在 | exit 2 (違反 0 件の成功と区別) |
| 単体テスト | 22 passed |

**fail-closed の成立**: `test` ジョブは `needs: static-gates` のため、lint が落ちればビルドも
テストも走らない。加えて detector 実効性ステップが「意図的な絵文字で exit 1 にならなければ
CI を落とす」ので、判定ロジックが空になる無音の失効も遮断される。

## 4. アイコン供給元の単一性

**実測** (2026-08-14 時点)

| 検査 | 結果 |
| --- | --- |
| `apps/hub/src` 内の `<svg` | 0 件 |
| `lucide` / `react-icons` / `heroicons` / `@tabler/icons` への依存 | 0 件 |
| `iconNames` の定義箇所 | `packages/ui/src/icons/index.tsx` の 1 箇所のみ |

`packages/ui/src/index.ts` は `Icon` / `iconNames` を re-export するのみで、別定義を持たない。

**テスト結果**: `src/icons/icons.test.tsx` 29 件 pass。

## 5. ライトモード強調ブロックの配色

**実装**: `calloutStyle` の面は `infoBlueSoft` (#e7effb) / `dangerSoft` (#f6e2e0) /
`warningSoft` (#f3e8d3)。いずれも `tokens.ts` の semantic token であり、
かつてグレー系だった `primarySoft` (#e5e5e2) / `neutralSoft` (#e6e6e3) は使っていない。

**実測 (ライトモード / WCAG 2.1 相対輝度)**

| 種別 | 面 | 本文 (基準 4.5) | アイコン+枠線 (基準 3.0) |
| --- | --- | --- | --- |
| point | `infoBlueSoft` | 15.88 | 5.79 |
| attention | `dangerSoft` | 14.77 | 5.20 |
| warning | `warningSoft` | 15.14 | 4.77 |
| note | `infoBlueSoft` | 15.88 | 3.15 |

**テスト結果**: `src/tokens/contrast.test.ts` 14 件、`src/tokens/tokens.test.ts` 394 件、
`src/components/visual-contract.test.tsx` 2 件がすべて pass。

## 6. 差し戻し判定と残課題

**差し戻し: なし**。5 項目すべて充足しており、P05 (実装) / P06 (テスト実行) へ戻す事由はない。

acceptance の充足とは別に、**将来の退行を検出できない範囲**を 2 点記録する。これらは本 feature の
受入を妨げないが、フォローアップ課題として扱う。

| # | 検出できない退行 | 現状の防御 |
| --- | --- | --- |
| 1 | apps/hub 側で inline SVG によりアイコンを再実装する (acceptance 4 の退行) | なし。目視・レビュー依存 |
| 2 | 新規部品が色だけで状態を表す (acceptance 2 の退行) | axe は色単独表現を検出しない |
