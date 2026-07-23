# 概要

C08 出典鮮度監査 (2026-07-22) は verdict PASS だが、高頻度リリース系の出典について low findings 3 件の追随運用が示唆された。

## 対象

1. claude-code-plugins: 記録 anchor v2.1.196 と CLI 現行 v2.1.216 の差が拡大。H7 実施直前に code.claude.com/docs/en/changelog を再照合し、marketplace.json 仕様 (source type npm 含む) に変更がないことを再確認する運用を継続する。
2. drizzle-orm: v1 系の rc 番号は情報源で差がある。採用時は github.com/drizzle-team/drizzle-orm/releases で最新 rc を都度再確認する。
3. wrangler: 記録は docs 索引の last_updated のみ。CI/CD が version 依存に敏感なら pinned version 記録の追加を検討する (提案)。

## 対応方針

該当 feature/task (H7 は feat-stage0-distribution-gate 系) の手順へ再照合タイミングを組み込む。