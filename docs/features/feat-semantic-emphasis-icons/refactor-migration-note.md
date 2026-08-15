---
status: recorded
layer: feature-evidence
parent_feature: feat-semantic-emphasis-icons
recorded_at: 2026-08-14
---

# feat-semantic-emphasis-icons リファクタリング/マイグレーション判定 (P08)

本 feature にリファクタリングおよびマイグレーション作業が不要であることの根拠を記録する。
判定日: 2026-08-14。

## 1. 結論

**リファクタリング / マイグレーション作業は不要 (N/A)**。

理由は 2 つある。(a) 変更対象が scope_out で明示された領域に一切かかっていない、
(b) 実施した変更が既存の呼び出し側インターフェースを変えない非破壊的変更である。

## 2. scope_out 対象に触れていないことの確認

goal-spec.json の scope_out 4 件に対して、本 feature の実変更を突き合わせた。

| scope_out 項目 | 本 feature の変更 | 確認方法 |
| --- | --- | --- |
| 配色仕様書 v2 そのものの改訂 | なし (token の**利用**のみ。token 定義の追加・改訂はしていない) | `tokens.ts` への本 feature 由来の差分なし |
| 各画面の情報構造・機能追加 | なし | `apps/hub/src` への本 feature 由来の差分なし |
| Markdown のカードブロック記法 | なし | `remarkCallouts` は既存のまま |
| 公開 API・DB schema・認可判定・Cloudflare deploy unit | なし | 下表 |

**公開 API・DB schema・認可判定・deploy unit の非変更**:

| 領域 | 判定根拠 |
| --- | --- |
| 公開 API | `apps/hub/src/app/api` 配下への本 feature 由来の変更 0 件 |
| DB schema | `packages/db` への変更 0 件。migration ファイルの追加なし |
| 認可判定 | `apps/hub/src/lib/authz` への本 feature 由来の変更 0 件 |
| Cloudflare deploy unit | `wrangler` 設定・Worker 境界への変更 0 件 |

したがって、データ移行・後方互換の維持措置・段階的ロールアウトのいずれも発生しない。

> **注記**: 判定時点の作業ツリーには、本 feature とは別の作業 (配色パターン追加) 由来の差分が
> `tokens.ts` / `UiProvider.tsx` / `authz/rules.ts` などに存在する。上表の「変更なし」は
> **本 feature が加えた変更**についての判定であり、作業ツリー全体の差分がゼロという意味ではない。
> 本 feature の変更は §3 の 3 ファイルに限られる。

## 3. 非破壊的変更であることの確認

本 feature が加えた変更は次の 3 つだけである。

| # | 変更 | 種別 | 呼び出し側への影響 |
| --- | --- | --- | --- |
| 1 | `scripts/lint-ui-text-emoji.py` の新規追加 | 新規ファイル | なし (CI から呼ばれる検査であり、実行時コードではない) |
| 2 | `tests/scripts-root/test_root__lint_ui_text_emoji.py` の新規追加 | 新規テスト | なし |
| 3 | `.github/workflows/ci.yml` へ G19 の 2 ステップ追加 | CI 定義 | なし (既存ステップの削除・改変なし) |

### 3.1 `Badge.tsx` 等の token 置換について

P05 の Write scope には `packages/ui/src/components/Badge.tsx` が含まれていたが、
**実際には変更していない**。P02 §5 の監査で、Badge がすでに `colorVar()` の semantic token
だけで色付けされていることを確認したためである。

| 検査 | 結果 |
| --- | --- |
| `Badge.tsx` への本 feature 由来の差分 | 0 行 |
| `BadgeProps` の形 | `children` / `tone?: BadgeTone` / `style?: CSSProperties` (変更なし) |
| `BadgeTone` の値 | `neutral` / `primary` / `info` / `warning` (変更なし) |
| 色リテラルの直書き | なし。`toneBorder()` の `color-mix()` も token を混ぜるのみ |

**判定**: props は変わっていないため、Badge の呼び出し側は一切書き換え不要である。
Write scope は「変更してよい範囲」であって「変更する義務」ではない。すでに条件を満たす部品を
触れば、視覚回帰 (VRT 基準画像の更新) の risk だけが増える。

### 3.2 その他 UI 部品

P02 §5 で監査した 7 部品 (Badge / Alert / Chip / Toast / StageBoard / KpiCard /
Markdown callout) はいずれも token 準拠であり、本 feature ではどれも変更していない。
`Markdown.test.tsx` 30 件を含む packages/ui の 811 件が pass しており、
既存インターフェースの破壊は起きていない。

## 4. ロールバック手順

作業が不要なため専用のロールバック手順もないが、万一 lint が誤検出で開発を止めた場合の
即時退避は次のとおり (恒久対処は `runbook.md` の誤検知手順を参照)。

| 状況 | 退避 |
| --- | --- |
| lint が誤検出で CI を止める | `.github/workflows/ci.yml` の G19 の 2 ステップを一時的に除去する。lint script 自体の削除は不要 |
| 実行時コードへの影響 | なし (本 feature は実行時コードを一切変更していない) |
