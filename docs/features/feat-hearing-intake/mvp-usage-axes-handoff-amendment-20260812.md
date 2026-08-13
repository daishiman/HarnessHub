---
status: recorded
layer: task-amendment
parent_feature: feat-hearing-intake
beads_id: HarnessHub-370h
graph_node_id: issue-hearing-intake-pr705-elegant-review-20260812
recorded_at: 2026-08-12
---

# feat-hearing-intake MVP 追補 (用途プロファイル / 共有トークン)

## 位置づけ

promoted 済みの exact-13 task package
(`.dev-graph/plans/generations/feature-package-feat-hearing-intake/...`) は
content-addressed のため改変しない。本ファイルは P01〜P13 を上書きせず、
2026-08-12 の MVP 追補範囲だけを task 層へ投影する。

## 追補内容

| 領域 | 変更 |
|---|---|
| FormData | 12 → 21 → 30 項目 (用途プロファイル・依頼パターン・参考 URL。保存 snapshot は salary 除く 29) |
| S10 UI | 上位4大工程を維持したまま 8 画面分割 |
| S12 UI | 引き渡し用テキスト / screenshots / handoff tokens |
| DB | `hearing_screenshots` / `hearing_share_tokens` (migration 0013) |
| 公開境界 | `GET /api/hearing/:token` (+ screenshot 中継) |

## 品質ゲート

- `validate-system-plan.py --feature-package feature-package/feat-hearing-intake` は
  promoted package の不変検証であり、本追補は package 外の実装差分として扱う。
- 実装検証は hub hearing-intake / security / db の focused tests を最小ゲートとする。

## 参照

- issue: `issues/hearing-intake-pr705-elegant-review-20260812.md`
- 仕様受領書: `docs/features/feat-hearing-intake/mvp-usage-axes-spec-reflection-receipt.md`
