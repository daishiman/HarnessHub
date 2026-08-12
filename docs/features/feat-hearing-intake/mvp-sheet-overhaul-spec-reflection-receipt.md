---
status: recorded
layer: feature-spec-reflection
task: issue-hearing-sheet-overhaul-20260812
beads_id: HarnessHub-a70b
parent_feature: feat-hearing-intake
recorded_at: 2026-08-12
spec_impact: reflected
---

# feat-hearing-intake シート作成 UX 刷新 仕様反映受領書

## 結論

**spec-impact: reflected（仕様へ反映あり）**。

本変更は S10 画面分割数、profile/priority enum、作成時添付の情報設計、S12 の申請時入力表示、
S17 個別ダッシュボードの表示項目を拡張する。API の path 集合・tenant 認可・AI キュー kind は不変。
MVP のため full R4-reopen は行わず、確定済み4大工程枠内の具体化として additive に記録する。

## 反映先

| 層 | 反映先 | 内容 |
|---|---|---|
| docs | `docs/frontend-spec.md` / `docs/backend-spec-api-state.md` / `docs/screen-inventory.md` / information-design S10・S12 / S17-detail / runbook / ADR application | 7 画面、enum 加算、作成時添付、詳細全項目 |
| features | `features/feat-hearing-intake.md` / `features/feat-user-org-admin.md` | MVP 追補節 |
| system-spec | `frontend.md` / `ui-ux.md` / `backend.md` 章末 | 7 画面・enum・添付ステージング |
| architecture | `harness-hub-frontend.md` 章末 | 同上の実装 writeback |
| tasks | `mvp-sheet-overhaul-handoff-amendment-20260812.md` | promoted package を改変せず追補投影 |
| specs | 詳細正本は `docs/`。compiled 全文再生成は行わない | MVP 最小。意味差分は docs + system-spec 章末で追跡 |

## 影響なしと判断した境界

- auth-tenancy の role 階層・session 契約
- D5 AI queue の kind 集合と pull/complete 契約
- 試算エンジン (`packages/estimation`) の計算式
- hearing_share_tokens / 公開 token のセキュリティ境界 (本 PR は作成 UI 側)
- Build pipeline / metrics / docs-cms の契約
- DB schema のテーブル追加 (migration なし)

## 検証 (MVP 最小)

- task package: `validate-system-plan.py --feature-package feature-package/feat-hearing-intake` → pass
- focused tests: `apps/hub` hearing-intake suite 21 files / 208 tests pass
- 実ブラウザ E2E / 本番 smoke は本 PR では未実施 (残課題)

## 機械受領書

commit 後に HEAD へ束縛する。

```bash
python3 scripts/build-spec-reflection-receipt.py --repo-root . --spec-impact reflected
```
