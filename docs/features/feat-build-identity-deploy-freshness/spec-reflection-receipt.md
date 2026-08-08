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
| `tasks/` | 公開 task projection は digest 不変のため本文改変なし。Beads notes で完了証跡を更新 |
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
