---
status: confirmed
layer: feature-spec-reflection
task: HarnessHub-bk8v
parent_feature: feat-dev-pipeline-improvement
---

# C02 stale feature lifecycle 拒否 — 仕様反映確認

## 対象

- Beads ID: `HarnessHub-bk8v`
- dev-graph node ID:
  `issue-c02-upsert-lifecycle-regression-20260729`
- 目的: C14 が生成した古い feature snapshot の再送で、確認・評価・実装準備の
  前進済み状態を暗黙に失わないようにする。

## 結論

Harness Hub 製品の仕様・設計への影響は **なし** と判定した。変更は dev-graph plugin
内部の C02 再試行契約を強化する不具合修正であり、製品 API、DB、認証認可、UI、
Cloudflare deploy unit、運用 SLO を変更しない。

plugin 契約への影響はあり、正本
`plugins/dev-graph/references/execution-tracker-contract.md` へ反映した。製品仕様層へ同じ契約を
複製すると二重正本になるため、下表の層は理由を記録したうえで非変更とした。

## 層別確認

| 層 | 反映 | 判断 |
|---|---|---|
| `plugins/dev-graph/` | あり | C02 stale before-image 拒否の実装・契約・回帰テストの正本 |
| `docs/` | あり | 本受領書と最終レビューに変更理由・検証・運用上の区別を記録 |
| `features/` | あり | 親 feature に follow-up の解消と正本リンクを C02 writer 経由で追記 |
| `issues/` | あり | standalone issue に受入条件・実装結果・品質証跡を記録 |
| `tasks/` | なし | exact-13 phase の goal・acceptance・実行順は不変。promoted task spec の手編集は source integrity を壊すため行わない |
| `system-spec/` | なし | 製品要求、外部から観測できる振る舞い、運用 SLO の追加・変更なし |
| `specs/` | なし | Harness Hub 製品仕様へ追加する外部契約なし |
| `architecture/` | なし | C02 単一 writer、C14→C02 データフロー、component 境界、deploy unit は不変 |

## 技術的な判断根拠

`node` envelope または bare canonical node は C14 の full snapshot 再試行として扱う。
既存 feature が前進済みなのに、入力が `draft`、`pending`、`incomplete` へ戻す場合は
書込み前に拒否する。意図的な再評価だけは、変更フィールドを列挙した `patch` で実行できる。

この区別は C02 の既存単一 writer 境界を変えず、古い before-image（更新前の写し）を
fail-closed（安全側に停止）にする。feature 以外の artifact kind は従来挙動を維持する。

## 品質ゲート

- focused pytest: lifecycle 単独 4 フィールド × 2 入力形式、正の対照、
  feature 以外、明示 patch を含め PASS
- Dev Graph plugin pytest: main 統合後の current criteria receipt で PASS
- task 仕様書: `feature-package/feat-dev-pipeline-improvement` の P01〜P13 exact set、
  digest `af8a73df…`、violations 0
- graph schema: valid、violations 0
- live-trial planner: C02 node / C03 sync は既存 current PASS を再利用し、C14 だけを再実走
- C14 fresh live-trial:
  `20260729T054655Z-bk8v-final-r5-none` が launch / completion / goal_fit 全て PASS、
  required observations 7/7、nudge 0、gate 0

先行 r4 は tool result 後の transcript 無進行が延長上限へ達したため FAIL として採用せず、
新 fixture・新 session の r5 を取得した。

## 500 行確認

変更した手書き実装・テスト・契約・文書は全て 500 行以下である。500 行を超える
`.dev-graph/state/graph.json` は構造化された単一正本、live-trial transcript は機械生成の
一次証拠であり、意味単位に分割すると参照 digest と原記録の完全性を壊すため分割対象外とした。

PR 作成直前に `scripts/build-spec-reflection-receipt.py --spec-impact none` を実行し、
この判断を最終 branch と HEAD に束縛する。
