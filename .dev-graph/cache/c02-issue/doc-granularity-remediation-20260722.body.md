# 概要

qa-070 (2026-07-22 確定・appr-008) により markdown 正本文書は 1 文書 300 行上限・fail-closed CI lint となった。実測 (2026-07-22) で対象 root の md 291 件中 300 行超は 6 件。

## 対象 (実測行数)

- docs/security-spec.md (910)
- docs/backend-spec.md (434)
- docs/features/feat-hub-foundation/design-review-notes.md (366)
- docs/features/feat-dev-pipeline-improvement/design.md (365)
- docs/features/feat-stage0-distribution-gate/design-review-notes.md (320)
- docs/features/feat-hub-foundation/final-review-notes.md (303)

## 対応方針

縮小のみ許す初期 remediation 一覧として管理し、責務単位で分割して index/一覧表から参照で辿れる形を維持する (情報は複製せず参照)。分割完了までは新規違反のみ遮断し、一覧 0 件で lint を全面適用する (qa-067 の冪等 migration・beads 起票パターンを踏襲)。