---
status: confirmed
layer: feature-design
task: SYS-HEARING-INTAKE-P02
parent_feature: feat-hearing-intake
feature_package_id: feature-package/feat-hearing-intake
source: docs/features/feat-hearing-intake/architecture-decision-record.md
---

# feat-hearing-intake 設計レビュー・検証付録

本書は [architecture-decision-record.md](./architecture-decision-record.md) から、
500 行上限を守るために分離したレビュー・検証付録である。

## 1. 解決済み論点

| id | 内容 | 影響 | 判定 |
|---|---|---|---|
| **OPEN-1** | Studio 拡張の物理テーブル owner | P05 のブロッカー | `packages/db/schema/hearing-intake/` に hearing 固有3テーブルと汎用 `ai_jobs` を実装。共通 boundary は `apps/hub/src/shared/aijob/` に維持 |
| **OPEN-2** | `form_json.salary` が暗号化対象外 | SEC4 の一貫性 | salary を保存せず、試算後に破棄する。判定根拠は [design-review-notes.md](./design-review-notes.md) §6 |
| **OPEN-3** | 初版試算写像が `minutesPerRun` 上限を超える | 試算失敗 | 「1 run = 1 人 1 時間」とし、`minutesPerRun=60`、`runsPerYear=hours×people×12` へ確定 |
| **OPEN-4** | backend-spec §3.3 と §4.11 の AI job 権限表現が不一致 | 認可判断 | 新しい qa-048 と §4.11 を採用し workspace-admin の自 tenant 処理を許可。provider-admin の越境は監査 |
| **OPEN-5** | `packages/estimation` に `sheetEstimate` がない | 実装名の差 | 公開 `estimateSavings` の単一呼び出しで同じ機能要件を満たす |

## 2. acceptance 対応表

| P02 acceptance の要素 | 記載箇所 |
|---|---|
| HearingSheet/FormData のカラム一覧 | ADR AD-2 |
| 共通 ai_jobs consumer のカラム一覧 | ADR AD-4 |
| 受付番号採番方式 | ADR AD-3 |
| AI キュー API 契約 | ADR AD-4 + AD-7 |
| 重複 schema 禁止 | ADR AD-4 |
| S10-S12 の画面構成 | ADR AD-8 |

## 3. 最終レビュー追補（2026-07-29）

- S10-S12 の実装 URL を正本どおり `/sheets/new`、`/sheets`、`/sheets/[id]` に統一した。
- S11 に status・department・全文検索と cursor ページングを実装した。
- AI job の claim/complete/fail を tenant と workspace の複合 scope に束縛した。
- repository を sheet と queue に分離した。外部 facade は維持されるため API 互換性は変わらない。
- `display_code_counters` と `tenant_coefficients` は backend-spec §2.3 どおり tenant 単位の補助データであり、
  workspace 所有の業務資源ではない。`hearing_sheets` と `ai_jobs` は tenant/workspace の両方を必須とする。

## 4. 消費した正本

- `docs/backend-spec.md` §2.3/§3.3/§3.5/§4.3/§4.11/§5.2/§5.5/§6.2
- `docs/frontend-spec.md` S10-S12
- `docs/screen-inventory.md`
- `system-spec/00-requirements-definition.md` D4/D5
- `system-spec/security.md` SEC2/SEC5/SEC7/SEC8
- `system-spec/database.md` qa-024
- `architecture/harness-hub-frontend.md`
- `architecture/harness-hub-backend.md`
- `architecture/harness-hub-data.md`
- `specs/harness-hub-system-specification.md`
- `features/feat-hearing-intake.md`
- `tasks/feat-hearing-intake/sys-hearing-intake-p01.md` から `sys-hearing-intake-p13.md`

## 5. 再検証

```bash
python3 plugins/system-dev-planner/scripts/validate-system-plan.py \
  --repo-root . --feature-package feature-package/feat-hearing-intake
```

P03 の独立設計レビューで設計案が却下された場合は ADR に却下理由を追記し、
P02 を再実行して代替設計を評価する。
