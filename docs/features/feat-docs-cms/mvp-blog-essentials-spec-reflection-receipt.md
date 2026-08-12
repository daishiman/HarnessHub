---
status: recorded
layer: feature-spec-reflection
task: issue-docs-cms-blog-essentials-integrate-20260812
beads_id: HarnessHub-zkcl
parent_feature: feat-docs-cms
recorded_at: 2026-08-12
spec_impact: reflected
---

# feat-docs-cms ブログ運用 / 予約公開 仕様反映受領書

## 結論

**spec-impact: reflected（仕様へ反映あり）**。

本変更は documents のデータ契約、S15 情報設計、予約公開 cron、監査 action を拡張する。
実装詳細の正本は `docs/` に置き、`system-spec/`・`architecture/`・`features/`・`tasks/` へ additive に投影した。
MVP のため full R4-reopen + 再ヒアリングは行わず、確定済み docs CMS 枠内での具体化として記録する。

## 反映先

| 層 | 反映先 | 内容 |
|---|---|---|
| docs | ADR / information-design S15* / runbook / backend-spec / backlog | 分類・予約公開・cron・clear 規則 |
| features | `features/feat-docs-cms.md` | MVP 追補節 |
| system-spec | `frontend.md` / `backend.md` / `database.md` 章末追記 | publish_at 導出状態と cron |
| architecture | `harness-hub-{frontend,backend,data}.md` 章末追記 | 同上の実装 writeback |
| tasks | `mvp-blog-essentials-amendment-20260812.md` | promoted package を改変せず追補投影 |
| specs | 本 PR では詳細正本を `docs/` に置き、compiled system specification の全文再生成は行わない | MVP 最小方針 |

## 影響なしと判断した境界

- auth-tenancy の role 階層・session 契約
- external docs sync の Device Flow / ETag CAS 契約 (本 PR は保持・退行させない)
- hearing-intake / feedback / build pipeline の API 契約

## 検証 (MVP 最小)

- task package: `validate-system-plan.py --feature-package feature-package/feat-docs-cms`
- focused tests: docs-cms / migration lineage / scheduled publish
- main 統合: origin/main HEAD を取り込み済み

## 機械受領書

commit 後に次で HEAD へ束縛する。

```bash
python3 scripts/build-spec-reflection-receipt.py --repo-root . --spec-impact reflected
```
