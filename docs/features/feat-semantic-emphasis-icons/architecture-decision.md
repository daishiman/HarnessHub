---
status: recorded
layer: feature-evidence
parent_feature: feat-semantic-emphasis-icons
recorded_at: 2026-08-14
---

# feat-semantic-emphasis-icons アーキテクチャ決定 (P02)

本文書は P01 の要件ベースライン (`requirements-baseline.md`) を受けて、既存実装の再利用範囲・
絵文字 lint の配置と CI 組込み位置・状態表現の監査範囲を決定する。

## 1. 既存実装の再利用範囲 (変更しない部分)

次の 3 実装は本 feature の着手時点で完成している。**変更せず再利用する**。

| 実装 | 位置 | 再利用する契約 |
| --- | --- | --- |
| アイコン供給 | `packages/ui/src/icons/index.tsx` | `iconNames` (公開名の集合) と `Icon({ name, size, label })`。callout 用の `lightbulb` / `alertTriangle` / `alertOctagon` / `infoCircle` を含む |
| callout の描き分け | `packages/ui/src/components/Markdown.tsx` | `CalloutKind` (`point` / `attention` / `warning` / `note`)、`remarkCallouts`、`Callout`、`calloutStyle`、`calloutIcon`、`CALLOUT_KIND_TOKENS` |
| semantic color token | `packages/ui/src/tokens/tokens.ts` | `infoBlue` / `infoBlueSoft` / `dangerSoft` / `warningSoft` / `borderStrong` などの semantic token 名 |

**決定の理由**: これらは既に acceptance 1・5 を満たしており、触ると本 feature の目的 (絵文字の排除)
と無関係な視覚回帰 (VRT の基準画像更新) を招く。変更差分がゼロであることは、既存の
`Markdown.test.tsx` (callout 4 種の描き分けと SVG アイコン描画を固定) と VRT 基準画像が保証する。

## 2. resource_scope の表記と実在パスの対応

feature node の `resource_scope` は概念名で書かれており、実在パスと 1:1 ではない。取り違えると
Write scope 外のファイルを触るため、対応を明示する。

| resource_scope の表記 | 実在パス | 備考 |
| --- | --- | --- |
| `packages/ui/src/icons` | `packages/ui/src/icons/index.tsx` | ディレクトリ配下は index.tsx 1 本 |
| `packages/ui/src/markdown` | `packages/ui/src/components/Markdown.tsx` | **`markdown/` というディレクトリは存在しない**。callout 実装は components 配下の単一ファイル |
| `packages/ui/src/tokens` | `packages/ui/src/tokens/tokens.ts` ほか | `token-names.ts` / `base-css.ts` / `contrast.ts` を含む |
| `scripts/lint` | `scripts/lint-*.py` | **`scripts/lint/` というディレクトリは存在しない**。リポジトリ既存の lint は `scripts/` 直下の flat 構成 (`lint-doc-line-limit.py` など 36 本) |

## 3. 絵文字 lint の配置と命名

**決定**: `scripts/lint-ui-text-emoji.py` (Python 3 / stdlib のみ)。

- 配置: `scripts/` 直下。既存 36 本の lint が全て flat 構成であり、`scripts/lint/` を新設すると
  `lint-script-naming.py` の命名規約 (`lint-<対象>.py`) から外れる
- 言語: Python 3。既存 lint 群が Python で統一されており、CI ランナー (ubuntu-latest) に標準搭載
- 検査対象: `packages/ui/src` (共通 UI 層) と `apps/hub/src` (画面層) 配下の `.ts` / `.tsx`。
  `--root` で上書き・追加できる。画面層を既定へ含めるのは、scope_in 4 の対象である「空状態文言」
  が共通部品ではなく画面ファイルに直接書かれるため。`packages/ui` だけに絞ると素通りする
- 出力: 違反時は行番号・列番号・符号位置つきで stderr へ。`--json` で機械可読出力

**絵文字の判定基準**: Unicode `Emoji_Presentation=Yes` の符号位置と、U+FE0F を伴って絵文字表示へ
切り替わる文字だけを違反とする。矢印・幾何記号 (`→` `←` `▲` `▼` `↕` `■` `▾` `▸`) は既定でテキスト
表示のため違反にしない。

**この線引きの根拠**: 実測で、素朴に「記号ブロックを全部禁止」とすると既存コードの 30 箇所が
引っかかる (日本語コメントの矢印 15 件、DataTable のソート方向 4 件、StageBoard の risk 記号 2 件
ほか)。誤検出だらけの lint は allowlist で骨抜きにされるか無視されるため、ゲートとして機能しない。

## 4. CI 組込み位置

**決定**: `.github/workflows/ci.yml` の `static-gates` ジョブへ、G12 (認証・認可静的検査) と
G15 (publish pipeline 境界) の間に **G19** として 2 ステップで組み込む。

1. `G19 共通 UI 層の絵文字混入検査` — lint 本体を実行し、`artifacts/ui-text-emoji.json` へ結果を残す
2. `G19 detector 実効性 (意図的な絵文字を検出できること)` — 一時ツリーへ絵文字を置き、
   **exit 1 (違反検出) 以外なら** CI を落とす

**G19 とする理由**: 当初は未使用の G18 を採ったが、`origin/main` (#725) が先に
G18 を Google Fonts 同梱検査へ使った。番号が衝突するとログ上で別ゲートの緑/赤を
取り違えるため、本 feature は G19 へずらす。

**実効性 probe に `--root packages/ui/src` を明示する理由**: probe の一時ツリーには既定 root の
`apps/hub/src` が無いため、省略すると「root 不在の設定エラー (exit 2)」で非ゼロになる。
「非ゼロなら合格」という判定では、絵文字を検出できたかを問えないまま緑になる。判定は
`exit 1` ちょうどに限定する。

**`static-gates` を選ぶ理由**: 依存インストール不要 (python3 のみ) で最速に落ちる。`test` ジョブは
`needs: static-gates` なので、lint が落ちればビルドもテストも走らない = fail-closed が成立する。

**実効性チェックを併置する理由**: lint 本体だけでは、判定ロジックが空になっても「違反 0 件」で
緑になる。無音の失効を検出する手段がゲート自身の中に必要である。同じ思想の先例が
`detector 実効性の検証 (HF-A4-DUP-002)` と `G15 detector 実効性` として既に CI にある。

## 5. 一覧・カードの状態表現の監査範囲

`tone` / `status` / `risk` など**状態を色で表す部品**を監査対象とする。監査は「色指定が
`colorVar()` の semantic token だけか」と「色以外の識別手段 (形状・可視ラベル) があるか」の 2 点。

| 部品 | 状態表現 | 色の出どころ | 色以外の識別手段 |
| --- | --- | --- | --- |
| `components/Badge.tsx` | `BadgeTone` 4 値 | `colorVar()` のみ (`color-mix` も token を混ぜるだけ) | `children` のテキスト |
| `components/Alert.tsx` | `tone` | `colorVar()` のみ | title / description のテキスト |
| `components/Chip.tsx` | `tone` | `colorVar()` のみ | ラベルテキスト |
| `components/Toast.tsx` | `tone` | `colorVar()` のみ | 本文テキスト |
| `components/StageBoard.tsx` | `StageRisk` 3 値 | `colorVar()` のみ | `riskIcons` の記号 (`▲` / `■`) |
| `charts/KpiCard.tsx` | `KpiTrend` 3 値 | `colorVar()` のみ | `symbol` + `description` (`増加` / `減少` / `変化なし`) |
| `components/Markdown.tsx` (callout) | `CalloutKind` 4 値 | `colorVar()` のみ | SVG アイコン + `CALLOUT_KIND_TOKENS` の可視ラベル |

**監査結果**: 全 7 部品が token 準拠であり、いずれも色以外の識別手段を持つ。したがって P05 で
是正が必要な箇所はない。`Badge.tsx` は Write scope に挙がっているが、**token 外の色指定が無いため
変更しない** (変更が必要な場合にだけ触る、という条件付き scope として解釈する)。

**監査対象外**: `Modal.tsx` / `BottomSheet.tsx` / `ConfirmDialog.tsx` の `rgba(0, 0, 0, 0.45)` は
オーバーレイの遮蔽であり、状態を表す色ではない。token 化は本 feature の scope_out
(配色仕様書 v2 の改訂) に踏み込むため扱わない。

## 6. 決定のまとめ

| 決定事項 | 内容 |
| --- | --- |
| 既存 callout/icon/token | 変更しない (再利用のみ) |
| lint script | `scripts/lint-ui-text-emoji.py` (Python 3 / stdlib) |
| 絵文字の定義 | `Emoji_Presentation=Yes` + U+FE0F 付き。テキスト表示記号は対象外 |
| CI 位置 | `static-gates` ジョブの G19 (lint 本体 + 実効性チェックの 2 ステップ) |
| 状態表現の監査 | 7 部品すべて token 準拠。是正不要 |
