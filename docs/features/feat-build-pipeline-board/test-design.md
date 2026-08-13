---
status: confirmed
layer: feature-test-design
parent_feature: feat-build-pipeline-board
feature_package_id: feature-package/feat-build-pipeline-board
beads_id: HarnessHub-9am
recorded_at: 2026-08-13
---

# test-design: feat-build-pipeline-board (P04)

> SYS-BUILD-PIPELINE-BOARD-P04 の正本成果物。5 テストカテゴリの合否基準と、既存/新規テストへの割当を確定する。
> 実装 (P05) は PR #694 / #701 で先行着地済みのため、本ドキュメントは「これから書く」ではなく「既存実装が満たすべき基準を先に固定し、既存テストがそれを満たしているか検証する」順で作成した。

## 5 テストカテゴリと合否基準

| # | カテゴリ | 合否基準 | 割当テスト |
| --- | --- | --- | --- |
| 1 | `stage-transition-admin-only` | member (workspace-admin 未満) の工程遷移は 403 で拒否され、監査記録も残らない。workspace-admin は隣接遷移のみ 200。 | `apps/hub/src/__tests__/build-pipeline-board/stage-transition-admin-audit.test.ts` (BPB-SEC2-001, BPB-SEC6-001, BPB-SM-001〜005)、`packages/db/__tests__/build-stage-transition.test.ts` (BPB-DB: transitionStage の隣接判定と CAS) |
| 2 | `stage-change-audit-event` | 工程遷移が成功したときのみ `build.stage_change` 監査イベントが 1 件記録され、`from_stage`/`to_stage` が metadata に残る。拒否時 (403/409/422) は記録されない。 | `stage-transition-admin-audit.test.ts` (BPB-SEC6-001, BPB-SEC6-002, BPB-SM-001, BPB-SM-003, BPB-B4-001, BPB-B4-003) |
| 3 | `publish-stage-publishrequest-integrity` | `publish` 工程への遷移は接続済み `PublishRequest` が `published` 状態でなければ 409 で拒否される。二重実装なしに既存 `PublishRequest` 状態機械 (B4/I2/I3) をそのまま参照する。 | `stage-transition-admin-audit.test.ts` (BPB-B4-001〜003)、`packages/db/__tests__/build-stage-transition.test.ts` (BPB-DB: publish 工程と PublishRequest の接続 (B4)) |
| 4 | `build-entity-tenant-scope-isolation` | 他テナントの Build は一覧・詳細・工程遷移のいずれからも 404 (存在を伏せる) で到達できない。`workspace_id` の食い違いは 400。 | `stage-transition-admin-audit.test.ts` (BPB-D4-001〜003, BPB-HTTP-003/004/103)、`packages/db/__tests__/build-stage-transition.test.ts` (BPB-DB: tenant 分離 (D4)) |
| 5 | `shared-authz-table-b9-consistency` | `builds.read` / `builds.stage_change` / `publish.approve` が単一の `ACTION_RULES` 表に同居し、工程操作と公開承認の `minRole` が食い違わない。 | `apps/hub/src/__tests__/build-pipeline-board/authz-shared-table-consistency.test.ts` (BPB-B9-001〜005, P04 で新規作成) |

## Normative closure 追加基準 (axe / CWV)

P04 は上記 5 カテゴリに加え、`axe detectable violations=0` と `CWV LCP/INP/CLS=good` を要求する (task spec acceptance #3)。

| 基準 | 割当テスト |
| --- | --- |
| axe violations = 0 | `apps/hub/src/__tests__/build-pipeline-board/board-a11y-and-page.test.tsx` (BPB-A11Y-001, BPB-A11Y-002) |
| CWV LCP/INP/CLS = good | 本番 URL 実測が前提のため、実装コードでの計測ロジック自体は `board-a11y-and-page.test.tsx` の描画契約と `apps/hub/tests/ci/bundle-budget.test.ts` の client bundle 予算で間接的に担保する。実測 (production smoke) は P13 の責務であり、本 P04 の対象外。 |

## scope_in 未割当チェック

feature context (`sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441`) の scope_in/acceptance に対し、上表の割当で全件を追跡できることを確認した (未割当 0 件)。5 カテゴリのうち 4 カテゴリは既存テストが先行実装 (P05, PR #694/#701) の受入契約として既に成立しており、`shared-authz-table-b9-consistency` のみ専用テストが無かったため新規作成した。

## P05 実装既走との整合

このリポジトリの exact-13 タスク分解は通常 P04 (テスト設計) → P05 (実装) の順だが、本 feature は P05 の MVP 実装コードが PR #694 で先行着地し、P04 は事後的に「実装が満たすべき基準の明文化 + 欠けているテストの補完」という順序になった。実装済みコードを書き換えずに基準側を実装へ合わせた箇所は無い — 5 カテゴリの合否基準は task spec の acceptance からそのまま導出しており、実装の追認のための基準緩和は行っていない。

## 関連ファイル (resource_scope)

- `.github/workflows/ci.yml`
- `apps/hub/src/app/api/v1/builds/`
- `apps/hub/src/__tests__/build-pipeline-board/`
- `packages/schemas/build-pipeline-board/contracts.test.ts`
- `packages/db/__tests__/build-stage-transition.test.ts`
- `packages/db/__tests__/migration-lineage.test.ts`
- `docs/features/feat-build-pipeline-board/test-design.md` (本ファイル)
