---
status: recorded
layer: cross-feature-spec-reflection
graph_node_id: issue-production-smoke-coverage-gaps-20260808
beads_ids: [HarnessHub-p0lr, HarnessHub-3sjj.13, HarnessHub-1vb.13, HarnessHub-9wb.13, HarnessHub-pf5o]
dev_graph_node_id: issue-production-smoke-coverage-gaps-20260808
spec_impact: reflected
reviewed_at: "2026-08-08"
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
| `system-spec/` | `testing-qa.web` を qa-205 へ R4-reopen → 再確定し、compiler で `testing-qa.md` を再生成。 |
| `specs/` | `harness-hub-production-coverage-smoke-addendum.md` へ横断契約を分離。総合仕様が 496 行のため追記しない。 |
| `architecture/` | `harness-hub-testing-qa.md` へ runner、credential、cleanup、rollback 境界を追加。 |
| `features/` | post-signin / feedback-loop / docs-cms の各 feature に production acceptance を追加。 |
| `tasks/` | 3 個の P13 projection に runner 利用可能・production 実走待ちを追記。 |
| `docs/` | 3 feature の release record / notes と本受領書へ検証・残課題を記録。 |

## 検証

- Hub focused Vitest: 2 files / 21 tests PASS。
- DB cleanup integration: 1 file / 2 tests PASS。`feedbacks`、`documents`、`builds` の実データを作成して残数 0 を確認した。
- Hub / DB TypeScript typecheck: PASS。
- task specification gate: post-signin / feedback-loop / docs-cms の 3 feature package がすべて PASS。
- system-spec transition / compile / citation gate: PASS。
- system-spec foundation gate: 既存 U1〜U9 source-index 9 件欠落で FAIL。今回の qa-205 追加由来ではなく、元発言を捏造できないため `HarnessHub-iys4` へ分離した。
- full graph schema gate: local main / p0lr branch / o4zi branch の全てが同一の 160 件（frontmatter 44、parity 5、heading 111）で FAIL。今回追加した production coverage / provider-admin / publish follow-up ノードの違反は 0 件で、既存 artifact 移行 debt は `HarnessHub-o4zi` で継続する。
- production runtime: secret を使う外部実走は未実施。PR merge 後の deploy job が最終証拠となる。

## 残課題

- `HarnessHub-stmx`: provider-admin 越境の edge 404 / route 監査契約を統一する。
- `HarnessHub-pf5o`: publish smoke を Device Flow 化・secret 台帳登録・廃止のどれにするか決着し、CI 結線と運用記録を一致させる。
- `HarnessHub-iys4`: system-spec foundation の U1〜U9 source-index を、原発言の真正な根拠から復旧する。
- 3 個の P13 task は production run 成功まで close しない。

## 500 行制約

新 runner は 478 行。総合仕様は 496 行で追記すると 500 行を超えるため、横断契約を `harness-hub-production-coverage-smoke-addendum.md` に分離した。`.dev-graph/state/graph.json` と `system-spec/spec-state.json` は、単一 envelope を前提に writer / compiler が生成する分割不能な SSOT（唯一の正本）なので、手編集による分割対象外とする。それ以外の変更対象ファイルは 500 行以下である。
