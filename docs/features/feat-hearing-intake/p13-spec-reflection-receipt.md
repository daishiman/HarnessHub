---
status: recorded
layer: feature-release
task: SYS-HEARING-INTAKE-P13
beads_id: HarnessHub-o2i.13
parent_feature: feat-hearing-intake
feature_package_id: feature-package/feat-hearing-intake
source_digest: sha256:61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5
spec_impact: reflected
reviewed_at: "2026-08-02"
---

# P13 仕様反映受領書

## 判定

最初の差分は既に確定・実装済みの `feat-hearing-intake` に対するリリース証跡だけであり、影響なしと判断した。
しかし PR #623 の docs-only main merge後、`on.push.paths` により CI が発火せず、main の
`workflow_dispatch` でも deploy job が skip されることを実測した。P13 が要求する「CI で本番反映を再実行」を
再現可能にするため、main の明示 dispatch を正規 CI の再実行入口に追加する。この trigger 契約は
インフラ設計への影響があるため、最終判定を **reflected（仕様へ反映あり）** に更新した。

**2026-08-02 追補**: 残っていた受入条件（実データ E2E smoke / SEC8 本番挙動）を実行可能にするため、
post-deploy 検証の末尾へ hearing 本番スモークを追加した。deploy pipeline の順序は仕様正本が固定して
いる契約であり、末尾への追加はその契約の変更にあたるため、同じ **reflected** のまま反映先を広げた。
認可・schema・API・UI は変更していない。追加分は新規 secret を要求しない。

**2026-08-02 追補 2（本番 secret の欠落）**: user 指示で本番設定を実測したところ、`AUTH_ACCESS_TOKEN_SECRET`
が本番 Worker へ未投入で、TOKEN 資格の経路が全滅していた（同日投入して解消）。`wrangler.jsonc` は同名を
`secrets.required` に宣言し既存テストもその**宣言**を検査していたが、実投入は誰も見ていなかった。
GitHub 側の設定台帳ゲートに対する Cloudflare 側の等価物が無いという非対称を埋め、deploy pipeline に
**deploy 前の実投入検査**を追加したため、同じ **reflected** のまま反映先へ `scripts/ci/` を加えた。
認可契約・schema・API・UI は変更していない。

**最終レビュー追補**: fixture の作成途中で失敗すると tenant ID が呼び出し側へ返らず、`finally` の
cleanup 対象へ登録できないため、部分行が本番 DB に残り得る設計不備を検出した。fixture 作成と cleanup を
それぞれ 1 transaction に閉じ、途中失敗の rollback と正常 cleanup の残行数 0 を実 DB driver の結合試験で
固定した。また、`wrangler secret list` の JSON 後方に角括弧付き警告が出る場合の解析不備を修正し、正負例を追加した。
さらに tenant header 詐称の期待値が `403` になっていたため、他 tenant の資源存在を伏せる既存契約へ
合わせて `404 tenant_mismatch` に修正した。これは security 規則の変更ではなく、smoke 側を既存正本へ収束させたものである。

## 確認した正本と理由

| 反映先 | 確認対象 | 判断 |
|---|---|---|
| `docs/` | `docs/features/feat-hearing-intake/release-notes.md`、`runbook.md`、`docs/infrastructure-spec.md` | P13 実測に加え、main push を通常経路、main dispatch を path-filter 非発火時の再実行経路として §7 へ反映する。2026-08-02 に deploy job の post-deploy 列へ hearing 本番スモークを追記した |
| `system-spec/` | `spec-state.json`、`infrastructure.md`、`testing-qa.md` | `infrastructure.web` と `testing-qa.web` を R4-reopen し、main の `qa-123` / 既存 `qa-119` を保持した上で、`appr-024` を承認証跡として `qa-124` / `qa-125` へ再確定した。API・DB schema・認証認可・UI は不変のため他セルは再オープンしない |
| `specs/` | `specs/harness-hub-system-specification.md` | Secret 三方向突合、transactional fixture/cleanup、本番 SEC5/SEC8 観測、未実測境界を投影し、C02 writer で `spec-harness-hub-requirements` の lineage を現行 spec-state digest へ更新した |
| `architecture/` | `architecture/harness-hub-infrastructure.md` | pipeline 順序、migration 前停止境界、post-deploy rollback 入力、fixture/cleanup transaction を反映し、C02 writer で `arch-harness-hub-infrastructure` を更新した |
| `features/` | `features/feat-hearing-intake.md` | P13 本番受入節を追加し、main 後の deploy run まで未完了であることを機能単位で明記。C02 writer で `feat-hearing-intake` を更新した |
| `tasks/` | `tasks/feat-hearing-intake/sys-hearing-intake-p13.md` と公開 task spec | user 指示による P13 scope 追補と実装・仕様反映対象を projection の `resource_scope` / `scope_in` へ同期した。content-addressed 公開 task spec は改変しない |
| `scripts/ci/` (2026-08-02 追補 2) | `worker-secrets-registry.json` / `check-worker-secrets.mjs` | `docs/infrastructure-spec.md` §2 の Workers Secret 表を機械可読な正本として二重化し、台帳 ↔ `wrangler.jsonc` 宣言 ↔ 実投入を三方向で突合する。散文と台帳が乖離したら台帳側を直す |
| `docs/` (2026-08-02 追補 2) | `docs/infrastructure-spec.md` §2 / `release-notes.md` §7.5 | 未投入だった事実・fail-closed で発覚が遅れた理由・投入手順・新ゲートの配置を記録する。secret 値は記載しない |

deploy pipeline と testing gate の確定契約に意味差分があるため、`system-spec/spec-state.json` は
`infrastructure.web` と `testing-qa.web` を正規の R4-reopen で再ヒアリング対象へ戻した。その後、既存の
qa-034 / qa-038 / qa-106 / qa-116 / qa-123 と qa-076 / qa-108 / qa-119 を全面維持した回答を `qa-124` / `qa-125`
として登録し、`appr-024` を承認証跡に再確定した。`validate-coverage-matrix.py --require-complete` は未収集 0 で
PASS し、system-spec compiler で章を再生成した。SEC8 の規則そのものは変えていないため security cell は維持した。

## 受領条件

- task 仕様の `validate-system-plan.py --feature-package feature-package/feat-hearing-intake` が pass すること。
- `git diff --check`、成果物配置、文書行数、repository の最終品質ゲートが pass すること。
- 全変更の commit 後、`scripts/build-spec-reflection-receipt.py --spec-impact reflected` で HEAD に束縛した
  機械受領書を作成すること。
- main 反映後の実データ E2E smoke と SEC8 本番確認を release notes へ追記し、最終 commit でも
  同じ仕様影響判定を再確認すること。

## 最終レビュー記録（2026-08-02）

- origin/main `7bab5a2f` をローカル main へ取り込み、そのローカル main を本 branch へ merge した。
- `pnpm verify` は 6 パッケージ 143 files / 1804 tests、lint、typecheck、build、tenant 分離、secret scan、
  schema drift、Worker / client bundle 予算をすべて通過した。
- task 仕様 validator、system-spec coverage、dev-graph schema / source digest、成果物配置、文書行数、
  `git diff --check` を最終 commit 前に再確認する。
- 手書きの変更ファイルはすべて 500 行以下である。500 行を超える `.dev-graph/state/graph.json` と
  `system-spec/spec-state.json` は writer が生成し validator が単一 JSON として読む正本のため、分割すると
  正規フローを壊す。この 2 件だけは生成物の構造を維持する。

## 現在の境界

本受領書は main 反映前のレビュー判断である。P13 の完了は、CI 本番反映、実データ E2E smoke、SEC8
本番確認、release notes の最終追補、Beads P13 と親 epic の close がすべて終わった時点で確定する。

2026-08-02 時点の残作業は **1 回の deploy run** である。実データ E2E smoke と SEC8 本番確認は
`smoke:hearing-production` として CI へ常設したが、本番資格情報は CI secret にしか無いため
**手元では実行できず、実測値を回収していない**。main 反映後の deploy run で step
`本番 hearing 実データ E2E / SEC8 スモークテスト (P13 受入条件)` の結果を release notes §7.3 へ
記録した時点で完了とする。なお本受領書の機械束縛（`build-spec-reflection-receipt.py` による
HEAD 束縛）は commit 後に再生成する必要がある。
