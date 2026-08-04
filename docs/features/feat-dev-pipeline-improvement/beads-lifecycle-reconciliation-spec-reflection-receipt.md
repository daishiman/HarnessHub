---
feature_id: "feat-dev-pipeline-improvement"
layer: "feature-spec-reflection"
graph_node_id: "SYS-DEV-PIPELINE-IMPROVEMENT-P13"
beads_id: "HarnessHub-y7aj.13"
parent_beads_id: "HarnessHub-y7aj"
recorded_at: "2026-08-04"
spec_impact: "none"
status: "recorded"
---

# Beads ライフサイクル再照合 — 仕様反映受領書

## 目的と背景

Beads（課題台帳）、dev-graph、Markdown のライフサイクル記録を同じ実態へ収束させる。今回の
P13 最終レビューでは、過去の親課題 `HarnessHub-k2u` が closed であることを確認し、現行の
親課題 `HarnessHub-y7aj` とその P13 `HarnessHub-y7aj.13` を正しい追跡先として採用した。

## 変更範囲

- 14 feature package の task 仕様書群、関連 feature、issue、graph/snapshot の 192 件を Beads の
  実状態へ再投影した。
- `feat-dev-pipeline-improvement` は main 側で追加された関連ノードを保持しつつ、Beads 親を
  `HarnessHub-y7aj` へ更新した。
- graph は構造マージ（ノード ID をキーに内容を統合する方式）で 417 ノードを保全した。

## 仕様・設計への影響判定

**影響なし。** 本変更は、課題状態・タイトル・時刻・Beads 連携先の投影を揃える記録更新だけである。
Web/API、データベース、認可、UI、外部連携、デプロイ、品質ゲートの振る舞いは変更していない。

そのため、正規フローで次の層を確認したうえで内容更新は行わなかった。

| 層 | 判定 | 理由 |
| --- | --- | --- |
| `system-spec/` | 更新なし | プロダクトの要求・制約に変更がない。 |
| `specs/` | 更新なし | API、データ、振る舞いの契約に変更がない。 |
| `architecture/` | 更新なし | コンポーネント境界、データフロー、運用構成に変更がない。 |
| `features/` | 更新あり | 現行 Beads 親とライフサイクル時刻を同期した。 |
| `tasks/` | 更新あり | 13 フェーズ仕様書の状態・連携情報を同期した。 |
| `docs/` | 更新あり | 本受領書に判断根拠と検証結果を記録した。 |

## 検証

- `validate-system-plan.py` を対象 14 feature package すべてに再実行し、P01–P13 と違反 0 件を確認した。
- `validate-graph-schema.py` で 417 ノードの graph schema を検証した。
- `lint-artifact-placement.py`、`lint-doc-line-limit.py --ratchet-base origin/main`、`git diff --check` を実行する。
- `scripts/run-ci-checks.sh` と `pnpm verify` を、コミット前の最終ゲートとして実行する。

## 中学生向けの説明

この変更は新しい画面を作るものではない。学校の「宿題リスト」「先生の進み具合表」「提出ノート」で、
同じ宿題が終わったのに片方だけ「未提出」と書かれていると困る。今回、その 3 つの記録を同じ状態に
そろえ、古い宿題番号ではなく今使う番号につなぎ直した。

## 技術的な説明

dev-graph の canonical graph（正本の依存・状態グラフ）と Markdown の frontmatter を、Beads の
課題状態へ収束させた。競合した feature ノードは、構造マージで main の新規 related nodes を残し、
closed の旧 epic `HarnessHub-k2u` を現行 epic `HarnessHub-y7aj` に置換した。これは状態投影の
データ整合性修復であり、実行時の状態機械、API、スキーマ、CI 契約は変更しない。

## 残課題

`HarnessHub-y7aj.13` は、この Draft PR のレビュー・main 反映・反映後の再照合が完了するまで
in-progress のままとする。今回のレビューで新規の仕様・設計課題は検出していない。
