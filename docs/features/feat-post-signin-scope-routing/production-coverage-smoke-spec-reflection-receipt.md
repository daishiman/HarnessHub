---
status: recorded
layer: cross-feature-spec-reflection
graph_node_id: issue-production-smoke-coverage-gaps-20260808
beads_ids: [HarnessHub-p0lr, HarnessHub-3sjj.13, HarnessHub-1vb.13, HarnessHub-9wb.13, HarnessHub-pf5o, HarnessHub-stmx]
dev_graph_node_id: issue-production-smoke-coverage-gaps-20260808
spec_impact: reflected
reviewed_at: "2026-08-10"
---

# production coverage smoke 仕様反映受領書

## 結論

製品 API・DB schema・認可判断・UI は変更しない。一方で、毎デプロイの本番検査順序、credential 境界、試験データ cleanup、rollback 判断という品質・運用設計へ影響するため、`spec-impact: reflected` と判定した。

## 中学生向けの説明

学校で新しい仕組みを作っても、練習問題だけ合格して本番で動かさなければ安心できません。今回、ログイン後の行き先、意見を AI が処理する流れ、文書を AI が下書きする流れを、本番公開のたびに自動で試す「点検係」を追加したものです。点検用データは終わったら全部片付け、失敗したら前の版へ戻す判断に使います。

## 専門的な説明

`coverage_smoke` は既存 deploy job の version/freshness と OIDC/data/hearing smoke の後段へ追加される。TOKEN/EITHER action は production Device Flow token、SESSION action は route と同じ service/repository + production DB adapter を使い、Bearer 拒否は HTTP で観測する。S1〜S8、F1〜F5、D1〜D6 の結果と cleanup 残数を JSON 証拠にする。

## 反映先

| 層 | 反映 |
|---|---|
| `system-spec/` | 当初 `testing-qa.web` を qa-205 へ確定。2026-08-09 main 取込後は現 qa_ref=qa-217 へ production coverage smoke 節を統合復元し、`testing-qa.md` と `spec-state.json` の双方へ反映。 |
| `specs/` | `harness-hub-production-coverage-smoke-addendum.md` へ横断契約を分離。総合仕様が 496 行のため追記しない。 |
| `architecture/` | `harness-hub-testing-qa.md` へ runner、credential、cleanup、rollback 境界を追加。 |
| `features/` | post-signin / feedback-loop / docs-cms の各 feature に production acceptance と本番実走証拠を追加。 |
| `tasks/` | 3 個の P13 projection に runner と production 実走結果を追記。 |
| `docs/` | 3 feature の release record / notes と本受領書へ検証・残課題を記録。 |

## 検証

- Hub focused Vitest: `production-coverage-smoke-script.test.ts` 9 tests PASS / `production-oidc-smoke.test.ts` 12 tests PASS（合計 21）。
- DB cleanup integration: `hearing-smoke.test.ts` 2 tests PASS。
- task specification gate: post-signin / feedback-loop / docs-cms の 3 feature package がすべて PASS（violations 0）。
- production runtime: main `35a10b87` の hub-ci run `31253674292` で deploy job が SUCCESS。coverage smoke は `status: pass`、S1〜S8 / F1〜F5 / D1〜D6 が成功し、使い捨て 2 tenant は削除済み・残存行 0 を確認した。
- 2026-08-09 最終レビュー: remote `origin/main` を local `main` へ取込済み（local main は origin を包含）のうえで本 branch へ merge。`sys-post-signin-scope-p13.md` の conflict を解消し、main のランディング 500 追補と production smoke 実走証拠を両立した。

## main 取込時の仕様復元 (2026-08-09)

main の verification-tier 統合 (`qa-217`) が testing-qa.web の現 qa_ref を差し替えた結果、章本文から `qa-205` (production coverage smoke) が落ちていた。統合 entry の設計ルール（基礎契約を丸ごと引き継ぐ）に従い、`qa-217` へ production coverage smoke 節を復元し、`system-spec/testing-qa.md` と `system-spec/spec-state.json` の双方へ反映した。`specs/` 追補と `architecture/harness-hub-testing-qa.md` は維持済み。

## マージ後 reconciliation (2026-08-10)

実装 PR #681 (`35a10b87`) と仕様・証拠 PR #682 (`9808ecd1`) が `main` へマージ済みで、production run `31253674292` の S1〜S8 / F1〜F5 / D1〜D6 と cleanup 残存行 0 も正本へ記録済みであることを再確認した。

今回の reconciliation は製品仕様や設計を追加変更しない。`system-spec/testing-qa.md` qa-217、`specs/harness-hub-production-coverage-smoke-addendum.md`、`architecture/harness-hub-testing-qa.md` の既反映契約を維持し、default branch への証拠保存を完了条件としていた `HarnessHub-p0lr`、`HarnessHub-3sjj.13`、`HarnessHub-9wb.13` の durable state だけを同期する。機械証跡は `production-coverage-p13-reconciliation-evidence.json` に記録した。

## 残課題

- `HarnessHub-stmx`: provider-admin 越境の edge 404 / route 監査契約を統一する。
- `HarnessHub-pf5o`: publish smoke を Device Flow 化・secret 台帳登録・廃止のどれにするか決着し、CI 結線と運用記録を一致させる。
- `HarnessHub-1vb.13` は `HarnessHub-stmx` の越境監査契約が残るため in_progress を維持する。

## 500 行制約

新 runner は 478 行。総合仕様は 496 行で追記すると 500 行を超えるため、横断契約を `harness-hub-production-coverage-smoke-addendum.md` に分離した。`.dev-graph/state/graph.json` と `system-spec/spec-state.json` は、単一 envelope を前提に writer / compiler が生成する分割不能な SSOT（唯一の正本）なので、手編集による分割対象外とする。それ以外の変更対象ファイルは 500 行以下である（`testing-qa.md` 137 行）。
