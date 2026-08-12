---
status: recorded
layer: tasks-amendment
task: issue-ui-disclosure-empty-state-20260813
parent_feature: feat-docs-cms
recorded_at: 2026-08-13
---

# tasks 投影: S15 一覧 empty 導線 (promoted package 非改変)

promoted 済み `tasks/feat-docs-cms/` の sys-docs-cms-p01〜p13 は content-addressed のため改変しない。
本ファイルは empty state CTA の tasks 層投影である。

## 対応 phase

| phase | 追補内容 |
|---|---|
| P05/P07 | DocumentList empty の権限別 CTA / 絞込解除 |
| P06 | DOCS-UI-030..032 と DOCS-A11Y-009 |
| P12 | S15 情報設計シートの machine gate 追記 |

## 検証 (MVP 最小)

- `validate-system-plan.py --feature-package feature-package/feat-docs-cms`
- focused: `document-screens-interaction` / `a11y-screens`
