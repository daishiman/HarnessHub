---
status: recorded
layer: feature-spec-reflection
spec_impact: reflected
reviewed_at: 2026-08-13
feature_node_ids:
  - feat-hearing-intake
dev_graph_node_id: issue-hearing-intake-pr709-remediation-20260813
beads_ids:
  - HarnessHub-hodi
recorded_at: 2026-08-13
---

# PR #709 後始末 — 仕様反映受領書

## 1. 依頼と目的

マージ済み PR #709 のあとで、仕様と実装が食い違っていた点を揃える。
目的は、公開共有リンクの回数制限を token 解決より前に置き、添付と FormData と
migration 番号の正本を実装と同じ値にすること。

## 2. 結論

- **仕様・設計影響: あり (`reflected`)**。
- 認可 role 階層・session 契約・token の undifferentiated 404 は不変。
- 変わったのは次の 3 点:
  1. 公開経路に token 非依存の pre-DB rate limit (IP 240 req/min)
  2. 添付を画像 50 MiB から allowlist 8 種・25 MiB へ正本化
  3. FormData 30 / snapshot 29、migration `0013` への表記揃え

## 3. 正規反映先

| 層 | 反映 |
|---|---|
| `system-spec/` | `backend.md` / `database.md` / `frontend.md` / `security.md` 章末追記。R4-reopen なし |
| `specs/` | compiled system specification へ 2026-08-13 追記 |
| `architecture/` | `harness-hub-{backend,data,security}.md` |
| `features/` | `feat-hearing-intake.md` 追補 |
| `tasks/` | promoted package 非改変。task 層の追補は `docs/features/feat-hearing-intake/pr709-remediation-handoff-amendment-20260813.md` |
| `docs/` | backend-spec / api-state / security-spec-request-controls / frontend-spec / 本受領書 |

## 4. R4-reopen 不要の理由

1. role / `ACTION_RULES` / session claim の判定集合は変えない。
2. 公開経路は既存の exact path 例外のまま。新しい公開 prefix は足さない。
3. 添付 allowlist と 25 MiB は実装が既に持っていた値を正本へ写しただけである。
4. pre-DB limiter は既存 429 契約の前段であり、404 の畳み方は変えない。

## 5. 品質ゲート (MVP 最小)

| ゲート | 結果 |
|---|---|
| `validate-system-plan.py` feat-hearing-intake | PASS（baseline exemption、digest 61fac79f、violations 0） |
| hearing share focused tests | 24 PASS（pre-resolve 12 + public route 12） |

## 6. 残課題

- 本番 URL での公開共有 429 実測
- 実ブラウザ / Linux VRT (`HarnessHub-7mc6`)
- `/legal` の scope 分離は本 PR では触っていない
