---
status: recorded
layer: task-amendment
parent_feature: feat-hearing-intake
beads_id: HarnessHub-hodi
graph_node_id: issue-hearing-intake-pr709-remediation-20260813
recorded_at: 2026-08-13
---

# feat-hearing-intake MVP 追補 (PR #709 後始末)

## 位置づけ

promoted 済みの exact-13 task package は content-addressed のため改変しない。
本ファイルは P01〜P13 を上書きせず、2026-08-13 の後始末だけを task 層へ投影する。

## 追補内容

| 領域 | 変更 |
|---|---|
| FormData | 30 項目。保存 snapshot は salary 除く 29 |
| 添付 | 画像限定 50 MiB ではなく allowlist 8 種・25 MiB |
| DB | migration 番号を `0013` に統一 |
| 公開境界 | token 解決前に IP 単位 240 req/min。解決後は payload 120 / screenshot 60 |

## 品質ゲート

- `validate-system-plan.py --feature-package feature-package/feat-hearing-intake` は
  promoted package の不変検証であり、本追補は package 外の実装差分として扱う。
- 実装検証は hub hearing-intake の focused tests を最小ゲートとする。

## 参照

- issue: `issues/hearing-intake-pr709-remediation-20260813.md`
- 仕様受領書: `docs/features/feat-hearing-intake/pr709-remediation-spec-reflection-receipt.md`
