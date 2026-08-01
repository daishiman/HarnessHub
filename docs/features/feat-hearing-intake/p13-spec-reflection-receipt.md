---
status: recorded
layer: feature-release
task: SYS-HEARING-INTAKE-P13
beads_id: HarnessHub-o2i.13
parent_feature: feat-hearing-intake
feature_package_id: feature-package/feat-hearing-intake
source_digest: sha256:61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5
spec_impact: reflected
reviewed_at: "2026-08-01"
---

# P13 仕様反映受領書

## 判定

最初の差分は既に確定・実装済みの `feat-hearing-intake` に対するリリース証跡だけであり、影響なしと判断した。
しかし PR #623 の docs-only main merge後、`on.push.paths` により CI が発火せず、main の
`workflow_dispatch` でも deploy job が skip されることを実測した。P13 が要求する「CI で本番反映を再実行」を
再現可能にするため、main の明示 dispatch を正規 CI の再実行入口に追加する。この trigger 契約は
インフラ設計への影響があるため、最終判定を **reflected（仕様へ反映あり）** に更新した。

## 確認した正本と理由

| 反映先 | 確認対象 | 判断 |
|---|---|---|
| `docs/` | `docs/features/feat-hearing-intake/release-notes.md`、`runbook.md`、`docs/infrastructure-spec.md` | P13 実測に加え、main push を通常経路、main dispatch を path-filter 非発火時の再実行経路として §7 へ反映する |
| `features/` | `features/feat-hearing-intake.md` と context | purpose、goal、scope、acceptance は本番検証の対象であり、内容変更はない。完了証跡のみ最終追補で更新する |
| `system-spec/` | `system-spec/infrastructure.md`、`system-spec/security.md` | infrastructure に CI 再実行境界を追補する。SEC8 の Device Flow token・tenant 分離契約は変更しない |
| `specs/` | `specs/harness-hub-system-specification.md` | 正本の追補を compiled spec へ投影する。S10-S12、D5 pull 型 AI キュー、tenant 境界は変更しない |
| `architecture/` | `architecture/harness-hub-infrastructure.md` と既存 frontend/backend/data 参照 | trigger と gate の関係を追補する。deploy unit、component、data flow、trust boundary は変更しない |
| `tasks/` | `tasks/feat-hearing-intake/sys-hearing-intake-p13.md` と公開 task spec | user 指示による P13 scope 追補と発見した trigger gap を記録する。content-addressed 公開 task spec は改変しない |

製品仕様の確定 QA は変更しないため `system-spec/spec-state.json` の hearing を再オープンしない。一方、実装で
判明した CI trigger の回復経路は、既存 qa-034 / qa-038 / qa-106 の「GitHub Actions が本番正本」という
決定を具体化する実装追補として、system-spec・compiled spec・architecture・詳細インフラ仕様へ同じ意味で反映する。

## 受領条件

- task 仕様の `validate-system-plan.py --feature-package feature-package/feat-hearing-intake` が pass すること。
- `git diff --check`、成果物配置、文書行数、repository の最終品質ゲートが pass すること。
- 全変更の commit 後、`scripts/build-spec-reflection-receipt.py --spec-impact reflected` で HEAD に束縛した
  機械受領書を作成すること。
- main 反映後の実データ E2E smoke と SEC8 本番確認を release notes へ追記し、最終 commit でも
  同じ仕様影響判定を再確認すること。

## 現在の境界

本受領書は main 反映前のレビュー判断である。P13 の完了は、CI 本番反映、実データ E2E smoke、SEC8
本番確認、release notes の最終追補、Beads P13 と親 epic の close がすべて終わった時点で確定する。
