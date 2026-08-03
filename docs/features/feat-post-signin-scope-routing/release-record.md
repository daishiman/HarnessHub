---
status: active
layer: feature-operations
task: SYS-POST-SIGNIN-SCOPE-P13
parent_feature: feat-post-signin-scope-routing
feature_package_id: feature-package/feat-post-signin-scope-routing
source: docs/features/feat-post-signin-scope-routing/spec-reflection-receipt.md
---

# P13 リリース記録

対象: `HarnessHub-3sjj.13`。状態: **local review complete / production verification pending**。

## ローカル結果

- コード・ドキュメント・task quality gate を再レビューし、[final-review.md](./final-review.md) の release candidate 判定を得た。
- [仕様反映受領書](./spec-reflection-receipt.md) で、system-spec・spec・architecture に意味変更がないことを照合した。
- Draft PR の作成・CI 結果確認後も、P13 は main へ merge され本番で検証されるまで close しない。

## CI 修復（2026-08-03）

- PR #647 の `hub-ci` と catalog 固有ゲートは、旧契約を期待する `catalog-hard-navigation-scope.test.ts` が browser session の `/catalog` を 403 と判定して失敗した。
- session scope 補完は本 feature で確定した既存契約であり、実装変更は不要だったため、テストを「browser session は 200、query の tenant/workspace は認可入力にしない」へ更新した。
- catalog 固有ゲートは 9 files / 66 tests PASS、Hub 全体の `vitest run --coverage` も PASS。認可 API/Bearer の明示 scope 必須は別テストで継続検証する。

## 残る本番確認

認証済み browser session で次の 6 path を確認する: `/sheets`、`/sheets/new`、`/sheets/{id}`、`/catalog`、`/catalog/releases`、`/catalog/{projectId}`。各 path が 403 `missing_tenant_scope` にならず、別 tenant/workspace の情報を表示しないことを記録する。

本番デプロイ、実 session の操作、Workspace 選択 UI はこの PR の範囲外であり、未実行を PASS と扱わない。

## 文書系統のフォローアップ

`implementation-requirements.md` は現在の feature-package generation (`ecbd1cbf…`) より前の生成履歴を指している。これは今回のルーティング実装による意味変更ではなく、生成物の系統（どの入力から作られたかの記録）の更新漏れである。単一 writer である `run-dev-graph-requirements` を実行して再生成する必要があるため、この PR では手編集しない。P13 の完了前に、再生成後の gate 結果をこの記録へ追記する。
