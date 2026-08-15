---
status: recorded
layer: feature-evidence
parent_feature: feat-semantic-emphasis-icons
recorded_at: 2026-08-14
---

# feat-semantic-emphasis-icons テスト実行報告 (P06)

P04 のテストと P05 の実装に対して、単体・lint・a11y・コントラストの各検証を実行した結果を、
再実行できる形 (command と実測出力) で記録する。実行日: 2026-08-14。

判定は自己申告ではなく、下記 command の exit code と出力を根拠とする。

## 1. 単体テスト

### 1.1 lint script の単体テスト (Python)

```bash
python3 -m pytest tests/scripts-root/test_root__lint_ui_text_emoji.py -q
```

| 項目 | 実測 |
| --- | --- |
| 結果 | **22 passed / 0 failed** |
| 所要 | 6.55s |

内訳の主眼は「ゲートの実効性」である。MUST_DETECT (絵文字を置いたら必ず落ちる) を先に固定し、
判定ロジックが空になっても緑になる無音の失効を排除している。

| 群 | 件数 | 内容 |
| --- | --- | --- |
| MUST_DETECT | 7 | Emoji_Presentation 5 種 (parametrize) / U+FE0F 付き警告絵文字 / CLI 非ゼロ終了 |
| MUST_PASS | 9 | テキスト表示記号 8 種 (parametrize) / 日本語コメント込みソース |
| 位置報告・対象限定・設定エラー | 4 | 行:列の報告 / .md,.css 非対象 / exit 2 / JSON 出力形状 |
| 実リポジトリ契約 | 2 | 既定 root が UI 層と画面層の 2 件 / 実 repo が絵文字ゼロ |

### 1.2 共通 UI 層の単体テスト (vitest)

```bash
cd packages/ui && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run
```

> 既定の `node` は x64 スライスで起動し `@rollup/rollup-darwin-x64` を要求して落ちるため、
> arm64 の `/opt/homebrew/bin/node` から `vitest.mjs` を直接起動する。

| 項目 | 実測 |
| --- | --- |
| 結果 | **811 passed / 0 failed** (26 test file すべて pass) |
| 所要 | 4.58s |

本 feature の acceptance に直接対応するファイル:

| test file | 件数 | 対応 acceptance |
| --- | --- | --- |
| `src/components/Markdown.test.tsx` | 30 | 1 (callout 4 種の描き分け) / 2 (可視ラベル併置) |
| `src/icons/icons.test.tsx` | 29 | 4 (アイコン供給元) |
| `src/tokens/contrast.test.ts` | 14 | 5 (ライトモード背景のコントラスト) |
| `src/tokens/tokens.test.ts` | 394 | 3・5 (token 定義の網羅) |
| `src/a11y/axe.test.tsx` | 30 | 2 (a11y 違反ゼロ) |
| `src/components/visual-contract.test.tsx` | 2 | 5 (視覚契約) |

## 2. 絵文字 lint の実行結果

### 2.1 混入なしサンプル (本リポジトリ) — pass すること

```bash
python3 scripts/lint-ui-text-emoji.py --repo-root .
```

```
OK: ui-text-emoji 適合 (検査 534 file, root packages/ui/src, apps/hub/src)
```

**exit 0**。検査対象は共通 UI 層 (`packages/ui/src`) と画面層 (`apps/hub/src`) の `.ts` / `.tsx`。
画面層を含めるのは、scope_in 4 の「空状態文言」が共通部品ではなく画面ファイルに直接書かれるため。

### 2.2 意図的な絵文字混入サンプル — fail すること

一時ツリーへ packages/ui/src/probe.ts (probe 専用の実在しないパス) を置き、本文を `export const label = '🎉 done';` とした。

```bash
python3 scripts/lint-ui-text-emoji.py --repo-root "$probe" --root packages/ui/src
```

```
VIOLATION: ui-text-emoji: packages/ui/src/probe.ts:1:23 に絵文字 '🎉' (U+1F389) がある。
強調・状態表現は packages/ui/src/icons の inline SVG アイコンと tokens.ts の semantic color token で表す
FAIL: ui-text-emoji 違反 1 件 (検査 1 file)
```

**exit 1**。行・列・符号位置つきで報告され、直す場所が特定できる。

### 2.3 exit code の 3 値分離が効いていることの確認

同じ probe ツリーで `--root` を省くと、既定 root の `apps/hub/src` が無いため設定エラーになる。

| 実行 | exit | 意味 |
| --- | --- | --- |
| `--repo-root <probe> --root packages/ui/src` | 1 | 絵文字を検出 |
| `--repo-root <probe>` | 2 | root 不在の設定エラー (違反 0 件の成功ではない) |

この分離があるため、CI の実効性チェックは「非ゼロなら合格」ではなく **exit 1 ちょうど**を
合格条件にできる。P03 のレビューで、旧判定 (`-eq 0`) が exit 2 を合格と誤読していた欠陥を
検出・是正した経緯は `design-review.md` §3.2 に記録している。

### 2.4 CI ゲートの結線

`.github/workflows/ci.yml` の `static-gates` ジョブに 2 ステップで組み込み済み。

| ステップ | 内容 |
| --- | --- |
| `G19 共通 UI 層の絵文字混入検査` | lint 本体。結果を `artifacts/ui-text-emoji.json` へ保存 |
| `G19 detector 実効性` | probe へ絵文字を置き、exit 1 でなければ CI を落とす |

`test` ジョブは `needs: static-gates` のため、lint が落ちればビルドもテストも走らない
(fail-closed が成立する)。

## 3. callout の a11y 属性

`packages/ui/src/components/Markdown.tsx` の `Callout` が出力する属性 (実装 227-229 行):

| 属性 | 値 | 役割 |
| --- | --- | --- |
| `role` | `note` | 補足情報のランドマークとして支援技術へ伝える |
| `aria-label` | 種別ラベル (`editor.insertPoint` 等の i18n 文言) | 色・アイコンに依存せず種別を読み上げる |
| `data-hh-callout` | `point` / `attention` / `warning` / `note` | DOM へ種別を出し、テストと VRT が色以外で識別できる |

**色以外の識別手段**: 4 種はアイコンの形 (`lightbulb` / `alertTriangle` / `alertOctagon` /
`infoCircle`) が全て異なり、単色印刷や色覚特性で色が落ちても種別が残る。
`src/a11y/axe.test.tsx` (30 件) が pass しており、自動検出可能な a11y 違反はゼロ。

## 4. ライトモード背景のコントラスト測定

`packages/ui/src/tokens/contrast.ts` の `contrastRatio` と同じ式 (WCAG 2.1 相対輝度) で、
既定 palette の各 callout について実測した。基準は本文 4.5、アイコン・枠線 (非テキスト) 3.0。

### 4.1 ライトモード

| 種別 | 面 (背景 token) | 本文 (text) | 判定 | アイコン+枠線 | 判定 |
| --- | --- | --- | --- | --- | --- |
| point | `infoBlueSoft` (#e7effb) | 15.88 | OK | 5.79 (`infoBlue`) | OK |
| attention | `dangerSoft` (#f6e2e0) | 14.77 | OK | 5.20 (`danger`) | OK |
| warning | `warningSoft` (#f3e8d3) | 15.14 | OK | 4.77 (`warning`) | OK |
| note | `infoBlueSoft` (#e7effb) | 15.88 | OK | 3.15 (`borderStrong`) | OK |

**acceptance 5 の確認**: ライトモードの強調ブロック背景は `infoBlueSoft` (#e7effb) など
semantic token 由来の**青系・赤系・黄系**であり、グレー系ではない。以前 `point` / `note` が
使っていた `primarySoft` / `neutralSoft` は無彩色グラファイト由来でほぼ同じグレー
(#e5e5e2 / #e6e6e3) になり、「要点」と「補足」が見分けられなかった。
現在は面を青系に統一し、従属関係 (point = 主 / note = 副) を枠線の濃さとアイコン形状で表す。

### 4.2 ダークモード (参考)

| 種別 | 面 | 本文 | 判定 | アイコン+枠線 | 判定 |
| --- | --- | --- | --- | --- | --- |
| point | `infoBlueSoft` (#152845) | 14.16 | OK | 8.19 | OK |
| attention | `dangerSoft` (#3b201f) | 14.25 | OK | 7.81 | OK |
| warning | `warningSoft` (#362a15) | 13.42 | OK | 8.58 | OK |
| note | `infoBlueSoft` (#152845) | 14.16 | OK | 3.32 | OK |

### 4.3 全 palette の網羅

上表は既定 (グレー) palette の実測である。5 配色 × light/dark の全組み合わせは
`src/tokens/contrast.test.ts` (14 件) と `tokens.test.ts` (394 件) が
`contrastRequirements` の宣言に対して検証しており、いずれも pass している。
本報告の手計算は「宣言が実際の hex で成立していること」を独立に確かめる二重確認である。

## 5. 判定

| acceptance | 判定 | 根拠 |
| --- | --- | --- |
| 1 callout 4 種が絵文字なしで SVG + token 描き分け | pass | Markdown.test.tsx 30 件 / lint exit 0 |
| 2 アイコンだけに意味を担わせず可視ラベル併置 | pass | `aria-label` + アイコン形状 4 種 / axe.test.tsx 30 件 |
| 3 絵文字混入が lint で検出され CI が落ちる | pass | probe で exit 1 / G19 2 ステップ結線 |
| 4 アイコン供給元が packages/ui のみ | pass | apps/hub の inline SVG 0 件・icon 依存 0 件 |
| 5 ライトモード背景が semantic token 由来 | pass | §4.1 の実測 (面は青系/赤系/黄系・全て基準超過) |

**全項目 pass。P05 への差し戻しは不要。**
