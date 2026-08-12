---
status: recorded
layer: feature-spec-reflection
task: issue-hearing-intake-pr705-elegant-review-20260812
beads_id: HarnessHub-370h
parent_feature: feat-hearing-intake
recorded_at: 2026-08-12
spec_impact: reflected
---

# feat-hearing-intake 用途プロファイル / 共有トークン 仕様反映受領書

## 結論

**spec-impact: reflected（仕様へ反映あり）**。

本変更は製品の FormData 契約、REST 子資源、公開 token 境界、DB テーブル、
S10/S12 の情報設計を拡張する。実装詳細の正本は `docs/` に置き、
`system-spec/`・`architecture/`・`features/`・`tasks/` へ additive に投影した。
MVP のため full R4-reopen + 再ヒアリングは行わず、確定済み4大工程・認可単一入口・
tenant 分離の枠内での具体化として記録する。

## 反映先

| 層 | 反映先 | 内容 |
|---|---|---|
| docs | `docs/backend-spec.md` / `docs/backend-spec-api-state.md` / `docs/frontend-spec.md` / information-design S10・S12 / runbook / ADR | FormData 28、screenshots/handoff API、8 画面、運用手順 |
| features | `features/feat-hearing-intake.md` | purpose/scope/acceptance と MVP 追補節 |
| system-spec | `frontend.md` / `backend.md` / `database.md` 章末追記 | 8 画面・公開 token・0010 migration |
| architecture | `harness-hub-{frontend,backend,data}.md` 章末追記 | 同上の実装 writeback |
| tasks | `tasks/feat-hearing-intake/mvp-usage-axes-handoff-amendment-20260812.md` | promoted package を改変せず追補投影 |
| specs | 本 PR では詳細正本を `docs/` に置き、compiled system specification の全文再生成は行わない | MVP 最小方針。意味差分は docs + system-spec 章末で追跡可能 |

## 影響なしと判断した境界

- auth-tenancy の role 階層・session 契約そのもの (公開経路は exact path 例外として既存 device flow と同型)
- D5 AI queue の kind 集合と pull 契約
- 試算エンジン (`packages/estimation`) の計算式
- Build pipeline / metrics / docs-cms の契約

## 検証 (MVP 最小)

- task package: `validate-system-plan.py --feature-package feature-package/feat-hearing-intake`
- focused tests: hub hearing-intake / security の関連 suite、db migration lineage / share repositories
- typecheck: schemas / hub / db (可能な範囲)

## 機械受領書

commit 後に次で HEAD へ束縛する。

```bash
python3 scripts/build-spec-reflection-receipt.py --repo-root . --spec-impact reflected
```
