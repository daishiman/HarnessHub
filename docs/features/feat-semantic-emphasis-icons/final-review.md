---
status: recorded
layer: feature-evidence
parent_feature: feat-semantic-emphasis-icons
recorded_at: 2026-08-14
---

# feat-semantic-emphasis-icons 最終レビュー (P10)

P01〜P09 の全成果物を突き合わせ、quality_constraints 5 件の合格可否を最終判定する。
判定日: 2026-08-14。

本 feature の目的は「強調・状態表現から絵文字を排除し、`packages/ui` 所有の inline SVG
アイコンと semantic color token だけで表す」ことであり、その退行を CI で止められる状態に
することまでを含む。

## 1. 総合判定

**合格。リリース可否は P13 で判断できる状態にある。**

| 判定軸 | 結果 |
| --- | --- |
| acceptance 5 項目 | 全項目充足 (P07) |
| quality_constraints 5 件 | 全件充足 (うち 3 件は範囲明示つき条件付き / P09) |
| 差し戻し | なし |
| 実行時コードへの影響 | なし (変更は lint script / テスト / CI 定義の 3 ファイル) |
| 未解決の blocker | なし |

## 2. quality_constraints 5 件の最終判定

| # | id | 判定 | 一次根拠 |
| --- | --- | --- | --- |
| 1 | `emoji-ban-semantic-token-qa232-5` | **合格** | lint exit 0 (534 file) / G17 ハードコード検査 exit 0 / callout 4 種のアイコン形状差 |
| 2 | `icon-lint-ci-fail-closed-qa233-6` | **合格** | `needs: static-gates` 連鎖 + detector 実効性 (probe exit 1) |
| 3 | `icon-ownership-boundary-qa233-3` | **合格 (範囲明示)** | inline SVG 0 件 / icon 依存 0 件 / `iconNames` 定義 1 箇所。退行検出ゲートは未整備 |
| 4 | `design-system-token-and-contrast-gate` | **合格 (範囲明示)** | contrast 実測が全項目基準超過 / G17 exit 0。VRT は opt-in |
| 5 | `state-value-visible-label-qa232-2` | **合格 (範囲明示)** | 7 部品監査で全て色以外の識別手段あり / axe 35 件 pass |

「範囲明示」は、**現状が要求を満たしていることは実測で確認済みだが、将来の退行を自動で
止める仕組みが無い**部分を含む、という意味である。不充足ではない。該当範囲は §4 に集約する。

## 3. P01〜P09 成果物の参照

| phase | 成果物 | 内容 |
| --- | --- | --- |
| P01 | [`requirements-baseline.md`](./requirements-baseline.md) | 要件ベースライン。scope_in 4 / scope_out 4 と充足条件 |
| P02 | [`architecture-decision.md`](./architecture-decision.md) | lint の配置・絵文字の判定基準・CI 組込位置 (G19)・7 部品監査 |
| P03 | [`design-review.md`](./design-review.md) | 設計レビュー。検出 3 件と是正 (検査範囲 / probe 空振り / ゲート番号) |
| P04 | `tests/scripts-root/test_root__lint_ui_text_emoji.py` | lint の単体テスト 22 件 (MUST_DETECT 先行) |
| P05 | `scripts/lint-ui-text-emoji.py` / `.github/workflows/ci.yml` | lint 実装と CI 結線 (G19 の 2 ステップ) |
| P06 | [`test-run-report.md`](./test-run-report.md) | テスト実行報告。pytest 22 / vitest 811 / lint 3 値分離 / コントラスト実測 |
| P07 | [`acceptance-review.md`](./acceptance-review.md) | acceptance 5 項目の受入判定。全項目充足・差し戻しなし |
| P08 | [`refactor-migration-note.md`](./refactor-migration-note.md) | リファクタ/マイグレーション N/A 判定と非破壊性の確認 |
| P09 | [`quality-gate-report.md`](./quality-gate-report.md) | quality_constraints 5 件の CI ゲート充足確認と fail-closed の成立 |

## 4. 本 feature で確立した防御と、その外側

### 4.1 確立した防御

| 防御 | 実体 | 常時実行 |
| --- | --- | --- |
| 絵文字の混入検出 | `scripts/lint-ui-text-emoji.py` (2 root / 534 file) | はい (G19) |
| lint 自身の失効検出 | probe で exit 1 ちょうどを要求 | はい (G19) |
| 検査結果の記録 | `artifacts/ui-text-emoji.json` | はい |
| 色ハードコードの検出 | `check-ui-hardcoding.mjs` (+ 自己テスト) | はい (G17) |
| コントラスト閾値 | `contrast.test.ts` / `tokens.test.ts` | はい (G4) |
| a11y 違反 | axe 30 + 5 件 | はい (G9) |

### 4.2 外側 (退行を自動検出できない範囲)

| # | 退行 | 現状の防御 | 起票対象 |
| --- | --- | --- | --- |
| 1 | `apps/hub` 側で inline SVG によりアイコンを再実装 | 目視・レビュー | 所有境界 lint の追加 |
| 2 | callout の視覚回帰 | `Markdown.test.tsx` の DOM 契約のみ | VRT catalog へ callout entry 追加 |
| 3 | 新規部品が色だけで状態を表す | axe は色単独表現を検出しない | design-system.md へレビュー観点を明文化 |

いずれも本 feature の Write scope 外であり、別 issue として扱う。

## 5. 設計判断で残す価値のある知見

### 5.1 「落ちたこと」ではなく「意図した理由で落ちたこと」を測る

detector 実効性 probe は当初 `[ "$code" -eq 0 ]` で「非ゼロなら合格」と判定していた。
lint の既定 root に `apps/hub/src` を追加した結果、probe ツリーには存在しない root を
参照して exit 2 (設定エラー) を返すようになり、**絵文字を 1 文字も検出しないまま
「実効性チェック合格」と報告する**状態になっていた (P03 §3.2)。

lint 側が exit code を 0 / 1 / 2 の 3 値に分離していたため、判定を `exit 1 ちょうど`へ
狭めるだけで是正できた。「違反あり」と「検査できなかった」を同じ非ゼロに潰していたら、
この誤りは検出できない。

### 5.2 誤検出する lint はゲートとして機能しない

絵文字判定を「記号ブロックを全部禁止」にすると既存コード 30 箇所が引っかかる
(日本語コメント中の矢印 15 件など)。誤検出だらけの lint は allowlist で骨抜きにされるか
無視されるため、判定基準を Unicode `Emoji_Presentation=Yes` と U+FE0F 付きに限定した
(P02 §3)。矢印・幾何記号はテキスト表示が既定であり、絵文字フォントの影響を受けない。

### 5.3 CI のゲート番号は全体を集計してから採る

`static-gates` の近傍だけを見て G16 を選んだところ `build` ジョブの G16 と衝突し、
G17 へ改番したところ `test` ジョブの G17 とも衝突した。全ワークフローを集計して
未使用の G19 を採った。局所観察では一意性を決められない。

## 6. リリース前提条件

| 項目 | 状態 |
| --- | --- |
| 実行時コードの変更 | なし (ロールバック手順は CI ステップの一時除去のみ) |
| DB schema / 公開 API / 認可判定 | 変更なし (P08 §2) |
| 既存部品の props | 変更なし (`BadgeProps` / `BadgeTone` とも不変) |
| VRT 基準画像の更新 | 不要 (視覚差分なし) |
| P13 での書き戻し対象 | feature node / context.json / `architecture/harness-hub-design-system.md` |

**P10 判定: 合格。P11 (証跡集約) へ進む。**
