---
status: recorded
layer: feature-evidence
parent_feature: feat-semantic-emphasis-icons
recorded_at: 2026-08-14
---

# feat-semantic-emphasis-icons 設計レビュー (P03)

本文書は P02 の `architecture-decision.md` に対する独立レビューである。判定は散文の同意ではなく、
実行した command の出力と grep 実測を根拠とする。

- レビュー対象: `architecture-decision.md` (P02)
- 基準: `requirements-baseline.md` (P01) の scope_in 5 件・acceptance 5 件・quality_constraints 5 件

## 1. 総合判定

**合格 (条件付き是正を反映済み)**。

レビュー中に 1 件の設計上の穴 (lint の検査範囲が scope_in 4 に届いていない) と 2 件の CI 上の
欠陥 (実効性 probe の空振り・ゲート番号の衝突) を検出した。いずれも P02/P05 の Write scope 内で
是正済みであり、是正後の状態で合格とする。検出内容と是正は §3 に記録する。

| 観点 | 判定 | 根拠 |
| --- | --- | --- |
| 既存実装の再利用範囲 (P02 §1) | 合格 | 変更 0 件。callout/icon/token に差分なし |
| resource_scope と実在パスの対応 (P02 §2) | 合格 | `markdown/` と `scripts/lint/` の不在を実測で確認済み |
| lint の配置・命名・判定基準 (P02 §3) | 合格 (是正後) | 検査範囲が scope_in 4 に不足していた → §3.1 で是正 |
| CI 組込み位置 (P02 §4) | 合格 (是正後) | probe 空振りとゲート番号衝突 → §3.2 / §3.3 で是正 |
| 状態表現の監査範囲 (P02 §5) | 合格 | 7 部品すべて token 準拠。是正不要の判断に同意 |

## 2. 受入条件ごとの確認

### 2.1 lint の検査対象範囲が scope_in と過不足なく一致するか

scope_in 4 は「UI 文言・callout ラベル・空状態文言への絵文字混入を検出する lint」である。
判定は「その 3 種の文言が実際に置かれている層をすべて走査しているか」。

| 文言の種類 | 実際の置き場所 | 既定 root に含まれるか |
| --- | --- | --- |
| UI 文言 (部品のラベル) | `packages/ui/src` | 含む |
| callout ラベル | `packages/ui/src/components/Markdown.tsx` | 含む |
| 空状態文言・画面見出し | `apps/hub/src` の各画面 | **是正前は不足** → 含めた |

**過剰でないことの確認**: `.md` / `.css` / `packages/db` などは対象外のままとした。仕様書 Markdown の
絵文字は UI 描画に出ないため scope_in の対象ではなく、含めると誤検出で lint が無視される。

判定根拠 (実測):

- `python3 scripts/lint-ui-text-emoji.py --repo-root .` → exit 0 / 検査 534 file
  (root: `packages/ui/src`, `apps/hub/src`)
- `python3 -m pytest tests/scripts-root/test_root__lint_ui_text_emoji.py -q` → 22 passed

### 2.2 所有境界 (packages/ui を唯一のアイコン供給元とする) の明記と承認

**明記**: P01 §5.3 と P02 §1 で、アイコン定義は `packages/ui/src/icons/index.tsx` の
`iconNames` / `Icon` に限ると書かれている。本レビューでこれを **apps/hub 側で再実装しない制約**
として承認する。

**実測による成立確認** (2026-08-14 時点):

| 検査 | 結果 |
| --- | --- |
| `apps/hub/src` 内の `<svg` | 0 件 |
| `lucide` / `react-icons` / `heroicons` / `@tabler/icons` への依存 | 0 件 |
| `iconNames` の定義箇所 | `packages/ui/src/icons/index.tsx` の 1 箇所のみ (他は re-export と型) |

**この制約が破られる将来の経路と現状の防御**: apps/hub 側で `<svg>` を直接書く形の再実装は、
現在の絵文字 lint では検出できない (絵文字ではないため)。本 feature の acceptance 4 を継続的に
守る検査は未整備であり、**フォローアップとして起票する残作業**とする。本 feature の scope_in 5 は
「所有境界の実装」であり、境界そのものは成立しているため合格とするが、退行検知は別途必要である。

### 2.3 P02 の決定に対する独立判断

P02 §5 の「7 部品すべて token 準拠につき是正不要、`Badge.tsx` は Write scope にあるが変更しない」
という判断に同意する。Write scope は「変更してよい範囲」であって「変更する義務」ではなく、
既に条件を満たす部品を触ると視覚回帰の risk だけが増える。

## 3. レビューで検出した問題と是正

### 3.1 lint の検査範囲が画面層に届いていなかった (中)

**問題**: 既定 root が `packages/ui/src` のみで、画面に直接書かれた空状態文言が素通りしていた。
scope_in 4 に対する取りこぼしである。

**是正**: `DEFAULT_ROOTS = ("packages/ui/src", "apps/hub/src")` へ変更。追加時点で
`apps/hub/src` は 446 file すべて絵文字ゼロであり、既存コードへの影響はない
(コストゼロのうちに範囲を広げた)。テストへ `test_default_roots_cover_ui_and_screen_layers` を
追加し、範囲が縮む退行を固定した。

### 3.2 実効性 probe が「設定エラー」で空振りしていた (高)

**問題**: §3.1 の変更後、CI の実効性チェックが使う probe ツリーには `apps/hub/src` が無いため、
lint は **exit 2 (設定エラー)** を返す。判定が `[ "$code" -eq 0 ]` (非ゼロなら合格) だったため、
**絵文字を 1 件も検出できなくてもこのステップは緑になる**状態だった。実効性チェック自体が
無音で失効しており、ゲートの故障を検出するためのゲートが故障している。

**是正**: probe 実行へ `--root packages/ui/src` を明示し、判定を `[ "$code" -ne 1 ]` へ狭めた。
違反検出 (exit 1) ちょうどでなければ落とす。

実測 (probe ツリーでの再現):

| 実行 | exit | 意味 |
| --- | --- | --- |
| `--repo-root <probe> --root packages/ui/src` | 1 | 絵文字を検出 (期待どおり) |
| `--repo-root <probe>` (是正前の形) | 2 | root 不在の設定エラー。旧判定では合格扱い |

### 3.3 CI のゲート番号が衝突していた (低)

**問題**: `static-gates` へ追加した `G16` は、`build` ジョブの既存
`G16 動的必須 route の静的化検査 (prerender-manifest)` と番号が重複していた。ログ上で別ゲートの
緑/赤を取り違える。

**是正**: まず G17 へ改番したが、`test` ジョブの既存
`G17 画面層の視覚ハードコーディング検査` とも衝突した。近傍だけを見ても一意性は決められない。
全ワークフローの G 番号を集計 (`G4×2 / G15×3 / G17×3`、未使用は G1 / G10 / G11 / G19 以降) し、
未使用の **G19** を採った。`static-gates` 内のステップ名重複は 0 件を確認済み。

## 4. 残作業 (本 feature の後続 phase またはフォローアップ)

| # | 内容 | 扱い |
| --- | --- | --- |
| 1 | apps/hub 側での inline SVG 再実装を検出する所有境界 lint | フォローアップ課題として起票 (本 feature の acceptance 4 は現状成立) |
| 2 | P06 以降のテスト実行・リリース判定 | 後続 phase |

## 5. レビュー結論

P02 の設計決定は、§3 の 3 件を是正した状態で **合格**。とくに §3.2 は「lint が緑である」ことと
「lint が働いている」ことが乖離する典型であり、実効性チェックを置いた設計判断そのものは正しい
一方で、その判定条件が緩いと同じ穴が開くことを示した。判定を exit code ちょうどへ狭めた形が
本 feature の fail-closed の正本である。
