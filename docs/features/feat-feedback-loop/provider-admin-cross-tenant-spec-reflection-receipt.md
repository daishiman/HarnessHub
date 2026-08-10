---
title: "provider-admin 越境 edge/route 統一 仕様反映受領書"
layer: "feature-evidence"
feature: "feat-feedback-loop"
graph_node_id: "issue-authz-provider-admin-edge-route-mismatch-20260808"
beads_ids:
  - "HarnessHub-stmx"
  - "HarnessHub-1vb.13"
recorded_at: "2026-08-10"
status: "accepted_with_production_smoke_pending"
---

# provider-admin 越境 edge/route 統一 仕様反映受領書

## 結論

今回の変更は **仕様・設計への影響あり**。案 (a) を採用し、edge middleware が
provider-admin の API 越境を `withAuthz` 付き route へ委譲し、route が最終認可と
`provider.cross_tenant_access` 監査を担う契約へ edge / route / smoke を統一した。

修正前の本番 run（edge 404 / 監査 0）は診断証拠として残し、新契約の成功証拠には
読み替えない。新 SHA の production smoke が通るまで `HarnessHub-stmx` と
`HarnessHub-1vb.13` は完了扱いにしない。

## 正規フローでの反映判定

| 層 | 判定 | 記録または反映内容 |
| --- | --- | --- |
| `system-spec/` | 更新 | `testing-qa.md` / `spec-state.json` の S8 期待値を baseline=0 / delta=1 へ更新。 |
| `specs/` | 更新 | `harness-hub-production-coverage-smoke-addendum.md` の provider-admin 節と残課題。 |
| `architecture/` | 更新 | `harness-hub-testing-qa.md` の越境境界を案(a)へ確定記述。 |
| `features/` | 更新 | `feat-feedback-loop` release notes、issue 本文、本受領書。 |
| `tasks/` | 更新 | `sys-feedback-loop-p13.md` の残課題を新 SHA smoke 待ちへ更新。 |
| `docs/` | 更新 | production-coverage-smoke 受領書、backend 監査 action 列挙（publish.cancel 等）。 |

## 実装の要点

- 共通述語: `apps/hub/src/lib/authz/cross-tenant.ts`（edge 安全な純関数のみ）
- edge: `middleware/authz.ts` が API path かつ provider-admin のとき tenant/workspace 不一致を通す
- route: `decide` / `withAuthz` が同じ述語で監査記録
- smoke S8: 対象 actor/workspace/action の監査 baseline=0 / delta=1、cleanup 残数 0
- 画面 (RSC) への越境委譲はしない（監査の残らない経路を増やさない）

## 品質ゲート受領 (MVP 最小)

| ゲート | 結果 |
| --- | --- |
| provider-admin-cross-tenant-parity / authz matrix | PASS |
| production-coverage-smoke-script 単体 | PASS |
| DB hearing-smoke (cleanup / audit count) | PASS（3 tests） |
| validate-system-plan feat-feedback-loop | PASS（violations 0、baseline exemption） |
| 新 SHA production smoke | **未実施** |

## 残課題

1. 本変更を含む SHA を本番 deploy する
2. `smoke:coverage-production` の S8 が 200/204 + 監査 delta=1 + cleanup 0 であることを記録する
3. 上記を満たしたら `HarnessHub-stmx` を close し、`HarnessHub-1vb.13` のブロックを外す

## 500 行制約

`cross-tenant.ts` 53 行。`smoke-production-coverage.ts` 497 行（500 未満、分割不要）。
