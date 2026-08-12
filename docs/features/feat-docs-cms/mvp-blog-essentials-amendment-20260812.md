---
status: recorded
layer: tasks-amendment
task: issue-docs-cms-blog-essentials-integrate-20260812
beads_id: HarnessHub-zkcl
parent_feature: feat-docs-cms
recorded_at: 2026-08-12
---

# tasks 投影: Docs CMS ブログ運用 4 項目 (promoted package 非改変)

promoted 済み `tasks/feat-docs-cms/` 配下の sys-docs-cms-p01 〜 p13 は content-addressed のため改変しない。
本ファイルは MVP 追補の tasks 層投影である。

## 対応する既存 phase への意味付け

| phase | 追補内容 |
|---|---|
| P02/P05 | category/tags/thumbnail/excerpt/publish_at の schema・API・UI |
| P08 | migration `0014_docs-cms-scheduled-publishing` (publish_at + due index のみ) |
| P09/P12 | 予約公開 cron・監査・runbook |
| P13 | main 統合後の production migration / deploy (未完了なら残課題) |

## 検証 (MVP 最小)

- `validate-system-plan.py --feature-package feature-package/feat-docs-cms`
- focused hub docs-cms / db docs-cms tests
