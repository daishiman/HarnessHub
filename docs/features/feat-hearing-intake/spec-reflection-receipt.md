---
status: recorded
layer: feature-spec-reflection
task: SYS-HEARING-INTAKE-P10
parent_feature: feat-hearing-intake
feature_package_id: feature-package/feat-hearing-intake
recorded_at: 2026-07-29
spec_impact: none
---

# feat-hearing-intake 仕様反映受領書

## 結論

今回の変更に、製品仕様・外部 API 契約・データモデルの新しい意味変更はない。
実装を既存の正本へ一致させる修正であるため、`system-spec/`・`specs/`・
`architecture/` の再コンパイル（仕様を作り直して確定し直す処理）は不要と判定した。

機械可読受領書は、対象変更の commit 後に
`scripts/build-spec-reflection-receipt.py --spec-impact none` で HEAD へ束縛して記録する。

## 確認した正本

| 層 | 確認先 | 照合結果 |
|---|---|---|
| system spec | `system-spec/frontend.md` qa-062 | S10-S12、`/sheets` 系 URL、S11 filter/search/cursor と一致 |
| system spec | `system-spec/spec-state.json` qa-024/qa-032/qa-048 | D4 の詳細化、Studio 11テーブル、workspace-admin の自tenant queue処理と一致 |
| detailed spec | `docs/backend-spec.md` §2.3/§3.5/§4.3/§4.11 | hearing_sheets、ai_jobs、tenant補助テーブル、cursor・queue契約と一致 |
| detailed spec | `docs/frontend-spec.md` S10-S12 | `/sheets/new`・`/sheets`・`/sheets/[id]` と画面要件に一致 |
| compiled spec | `specs/harness-hub-system-specification.md` | feature目的・D4/D5境界に変更なし |
| architecture | `architecture/harness-hub-frontend.md` | 既存route・共通UI部品の消費に変更なし |
| architecture | `architecture/harness-hub-backend.md` | REST・zod・認可単一入口に変更なし |
| architecture | `architecture/harness-hub-data.md` | tenant/workspace repository scope・共通migration lineageに変更なし |
| feature | `features/feat-hearing-intake.md` | purpose/goal/scope/acceptanceに変更なし |
| tasks | `tasks/feat-hearing-intake/sys-hearing-intake-p01.md`〜`p13.md` | P02/P04/P05の実体pathだけをC02正規writerで現行配置へ更新 |

## 実装側で解消した drift

1. 画面 URL を旧 `/hearing-*` から正本の `/sheets/new`・`/sheets`・`/sheets/[id]` へ修正。
2. S11 に status・department・全文検索と cursor ページングを追加。
3. sheet の読取・更新と AI job の claim/complete/fail を tenant と workspace の両方へ束縛。
4. 500 行を超えた repository・test・ADR を単一責務ごとに分割。

これらは既存契約の不足実装を埋めたものであり、新しい route、status、payload、
権限、テーブル、デプロイ単位は追加していない。

## 補助テーブルの scope 判断

古い qa-024 は「全新規テーブルに tenant_id/workspace_id」と表現する一方、
後発の qa-032 と `docs/backend-spec.md` §2.1/§2.3 は
「tenant_id 必須、workspace_id は必要に応じて」と詳細化している。

- `hearing_sheets` と `ai_jobs`: workspace所有の業務資源なので両列を必須化。
- `display_code_counters`: tenant全体の HS/FR/DOC 表示番号を直列採番する補助データ。
- `tenant_coefficients`: tenant全体の試算係数。

後者2つへworkspaceを追加すると、テナント別連番とテナント係数という既存契約を
変更するため採用しない。これは新しい例外ではなく、後発詳細正本の列定義を維持する判断である。

## 残る境界

- P13 の本番migration・本番deploy・本番smokeは未実施。
- Draft PRのmergeとdefault branch reconciliationまではP01〜P13をdurable doneにしない。
