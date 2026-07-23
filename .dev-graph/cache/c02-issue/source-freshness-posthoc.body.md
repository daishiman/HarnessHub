# 概要

C08 出典鮮度監査の low/moderate findings を運用として追跡する。初回監査 (2026-07-22, verdict PASS) の 3 件に加え、completeness evaluator の事後 fork 監査 (同日, verdict FAIL・軽微・安全側検出) で 2 件のドリフトが追加検出された。

## 対象

1. claude-code-plugins (moderate): 記録 anchor v2.1.196・追跡値 v2.1.215 に対し、現行 CLI は v2.1.216 (2026-07-20)。H7 実施直前に code.claude.com/docs/en/changelog を再照合し、marketplace.json 仕様 (source type npm 含む) に変更がないことを再確認する。git-subdir source type で一部クライアント (v2.1.66, v2.1.78) が schema 検証エラーを起こした事例が GitHub issue に報告されており、H7 技術ゲートでクライアント互換性も確認する。
2. nextjs (low): 記録 16.2.10 に対し現行 16.2.11 (patch 1 世代遅れ)。次回 run-system-spec-doc-fetch で更新する。
3. drizzle-orm: v1 系採用時は github.com/drizzle-team/drizzle-orm/releases で最新 rc を都度再確認する。npm の rc dist-tag は rc.3 を指し `drizzle-orm@rc` では rc.4 を取得できない構造に注意。
4. wrangler: 記録は docs 索引の last_updated のみ。CI/CD が version 依存に敏感なら pinned version 記録の追加を検討する (提案)。

## 対応方針

該当 feature/task (H7 は feat-stage0-distribution-gate 系) の手順へ再照合タイミングを組み込む。nextjs / claude-code-plugins の記録更新は次回 spec run の doc-fetch (C02) で行い、本 issue は手動で fetched-references.json を書き換えない (単一 writer 境界の維持)。
