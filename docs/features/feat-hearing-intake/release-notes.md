---
status: pending
layer: feature-release
task: SYS-HEARING-INTAKE-P13
feature_package_id: feature-package/feat-hearing-intake
production_deployed_at: null
---

# feat-hearing-intake リリースノート（本番反映待ち）

## 反映予定

- S10 4ステップのヒアリング受付と `HS-xxxx` 発番
- S11 シート一覧（検索・絞り込み・cursorページング）、S12 sanitize済みMarkdown詳細・管理者操作
- `sheet_generation` のpull/complete/fail API
- hearing用3テーブルと汎用 `ai_jobs` のmigration

## リリース前ゲート

| 項目 | 結果 |
|---|---|
| Next.js build | pass |
| OpenNext Cloudflare Worker build | pass |
| Worker bundle | 1.200 MiB / 3 MiB、pass |
| Client bundle | 最大116.3 KiB / 120 KiB、pass |
| Hub / DB / Schemas tests | pass |
| 本番migration | **未実施** |
| 本番deploy | **未実施** |
| 本番smoke / rollout確認 | **未実施** |

今回の依頼はcommit・push・Draft PR作成までを対象とし、本番migration・本番deployの明示権限は
含まないため、既存パイプラインからの本番反映は行わない。したがって本書は準備記録であり、
P13 acceptanceやP01〜P13のdurable doneを示す証跡ではない。

## 本番反映時に追記する項目

- PR / commit / Worker version
- migration適用日時と結果
- 本番反映日時
- テストtenantでの提出→pull→complete→S12表示smoke
- 15分間の5xx、queue滞留、認可拒否率の確認
- rollbackの要否と最終判定
