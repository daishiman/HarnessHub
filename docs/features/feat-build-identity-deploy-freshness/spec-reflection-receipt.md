---
status: accepted
layer: feature-spec-reflection
spec_impact: reflected
reviewed_at: 2026-08-08
feature_node_id: feat-build-identity-deploy-freshness
dev_graph_node_ids:
  - feat-build-identity-deploy-freshness
  - SYS-BUILD-IDENTITY-P01
  - SYS-BUILD-IDENTITY-P02
  - SYS-BUILD-IDENTITY-P03
  - SYS-BUILD-IDENTITY-P04
  - SYS-BUILD-IDENTITY-P05
  - SYS-BUILD-IDENTITY-P06
  - SYS-BUILD-IDENTITY-P07
  - SYS-BUILD-IDENTITY-P08
  - SYS-BUILD-IDENTITY-P09
  - SYS-BUILD-IDENTITY-P10
  - SYS-BUILD-IDENTITY-P11
  - SYS-BUILD-IDENTITY-P12
  - SYS-BUILD-IDENTITY-P13
beads_ids:
  - HarnessHub-hf9y
  - HarnessHub-7sac
  - HarnessHub-bod6
  - HarnessHub-8x08
  - HarnessHub-ivao
  - HarnessHub-8u3p
  - HarnessHub-8djt
  - HarnessHub-oekv
  - HarnessHub-dgkk
  - HarnessHub-j05t
  - HarnessHub-vdhi
  - HarnessHub-gchm
  - HarnessHub-rtcd
  - HarnessHub-gvg3
---

# feat-build-identity-deploy-freshness 仕様反映受領書

## 1. 依頼と目的

`HarnessHub-hf9y`（P01〜P13 全枝）の最終レビューとして、git status / diff を確認し、task 仕様書の品質ゲートを再実行したうえで、本変更が仕様・設計へ与える影響を正規フローで反映し、commit・main 取込・draft PR まで閉じる。

## 2. 結論

- **仕様・設計影響: あり (`reflected`)**。`/health` 応答への optional `commit`、deploy 時の `HUB_COMMIT_SHA` 注入、鮮度検査 step、rollback 除外境界が確定契約になった。
- **system-spec elicitation セルの再オープン: なし**。V6/V7 要求は既に `qa-198-f` で確定済み。新規 qa_log は起票せず、実装契約のみ `specs/` と `architecture/` へ書いた。
- **外部 API 破壊的変更: なし**。`commit` は optional。埋込前の稼働版は schema 違反にならない。
- **秘密情報への影響: なし**。commit sha は公開情報。Secret にしない。
- **本番実測: 未取得**。merge → deploy 後に `release-record.md` へ追記する。未取得を確認済みとは扱わない。

## 3. 判断理由（system-spec を再ヒアリングしなかった理由）

| 観点 | 判断 |
|---|---|
| 新規の製品判断が必要か | 不要。聞き取り済み要求（qa-198-f）の実装である |
| マトリクスセルの状態変更が必要か | 不要。`dev-workflow.web` は confirmed のまま |
| 実装詳細の正本はどこか | `specs/harness-hub-build-identity-deploy-freshness-addendum.md` と `architecture/harness-hub-infrastructure.md` |
| 索引だけ system-spec に置くか | 置く。`system-spec/dev-workflow.md` の qa-198-h と `system-spec/index.md` の writeback 索引 |

## 4. 反映先

| 層 | 反映内容 |
|---|---|
| `system-spec/` | qa-198-h 実装 writeback 索引、`index.md` 実装索引（セル再オープンなし） |
| `specs/` | 実装追補を新ファイルへ分離。親 addendum §8 は索引のみ |
| `architecture/` | `harness-hub-infrastructure.md` 2026-08-08 節（実装確定） |
| `features/` | 実装状態 §10 と参照表 |
| `tasks/` | 公開 task spec の digest は不変のまま、P13 projection に `HarnessHub-u9zq` を独立 follow-up として参照追加 |
| `docs/` | `infrastructure-spec.md`（health/commit・鮮度検査・rollback）、feature 配下の P01-P13 成果物と本受領書 |
| `apps/hub/` / `packages/schemas/` / CI | 実装・テスト・workflow 配線 |

## 5. 品質ゲート（最終レビュー再実行）

| ゲート | 結果 |
|---|---|
| `validate-system-plan.py --feature-package feature-package/feat-build-identity-deploy-freshness` | `status=pass`、violations `[]`、digest `9a7908d1…`、contract `1.3.0` |
| hub: deploy-freshness / production-auth-gates / version-gate-behavior / health.route | 4 files / 57 tests PASS |
| schemas: health + openapi | 2 files / 38 tests PASS |
| hub / schemas `tsc --noEmit` | exit 0 |
| `check:auth-gates` | 3 ゲート pass |
| 文書行数 | 実装追補分離後、親 addendum は 500 行以下へ戻した。新規追補・infrastructure-spec は 500 行以下 |

## 6. 残課題

1. 本番 deploy 後の `/health` から `commit` が返ることの実測
2. deploy job の「稼働ビルドの鮮度検査」step が緑で通ることの実測
3. 親追補内の検査 ID（V6/V7）二重定義の整理は独立判断として保留（本 PR では再割当てしない）

## 7. 伝播安定性 follow-up の受領 (2026-08-08 / `HarnessHub-u9zq`)

### 判断

**仕様・設計影響: あり (`reflected`)。** 既存 V7 の要件値、外部 API、DB schema、認証認可、秘密管理、Cloudflare deploy unit は変更しない。一方で CI が smoke を開始してよい条件に「deployment version と `/health.version` の連続一致」を追加し、再確認失敗時の rollback 非実行境界を定めた。これは `version_gate`（新版の到達）・鮮度検査（HEAD からの長期乖離）では捕捉できない colo 間伝播ムラを防ぐ設計変更である。

### 正規反映先

| 層 | 反映内容 |
|---|---|
| `system-spec/` | `dev-workflow.md` qa-198-h と `index.md` の実装 writeback 索引へ、既確定 V7 の実装追補として記録。新規 qa_log は不要 |
| `specs/` | `harness-hub-build-identity-deploy-freshness-addendum.md` に再確認の連続一致・fail-closed・rollback 境界を追記 |
| `architecture/` | `harness-hub-infrastructure.md` に 3 検査の責務分離と rollback 境界を追記 |
| `features/` | feature §11 と architecture decision AD-9 に follow-up の目的・採用理由を追記 |
| `tasks/` | P13 projection に、immutable（不変）な公開 task spec を変えず独立 issue として追補する根拠を追記 |
| `docs/` | `infrastructure-spec.md`、release record、本受領書に CI 順序・実測手順・最終判断を反映 |

### 検証と残課題

- 実装は `scripts/ci/assert-served-version.mjs`、CI 配線は `.github/workflows/ci.yml`、実挙動と順序の検証は `apps/hub/tests/ci/smoke-version-recheck.test.ts` と `production-auth-gates.test.ts` が担う。
- 最終再実行: task specification contract `1.3.0 / violations: []`、実挙動・CI 順序 22 tests PASS、対象 `biome check` PASS、hub typecheck PASS、graph schema / `git diff --check` PASS。無応答の `/health` も overall deadline 内に exit 1 へ倒れる実挙動を 1 ケース追加して固定した。詳細は `quality-report.md` の `HarnessHub-u9zq` 節を正本とする。
- 本番の Cloudflare 伝播を再現する実測は merge 後の deploy で取得する。未取得を確認済みと扱わず、再確認 failure 時は smoke / rollback を実行しないことを run log で確認する。
