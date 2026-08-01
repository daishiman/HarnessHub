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

Harness Hub **製品**の仕様・設計への影響は **なし** と判定した。一方、
repository 内の**開発管理仕様・設計**には影響があるため、C02 再試行の安全境界を
`system-spec/`、`specs/`、`architecture/`、`tasks/` の正規書き戻し先へ反映した。
製品 API、DB、認証認可、UI、Cloudflare deploy unit、運用 SLO は変更しない。

plugin の実行契約は
`plugins/dev-graph/references/execution-tracker-contract.md` を正本とする。
上位文書にはアルゴリズムを複製せず、開発フローの安全境界、architecture 上の責務、
P13 書き戻し、製品仕様非変更の trace だけを記録した。

## 層別確認

| 層 | 反映 | 判断 |
|---|---|---|
| `plugins/dev-graph/` | あり | C02 stale before-image 拒否の実装・契約・回帰テストの正本 |
| `docs/` | あり | 本受領書と最終レビューに変更理由・検証・運用上の区別を記録 |
| `features/` | あり | 親 feature に follow-up の解消と正本リンクを C02 writer 経由で追記 |
| `issues/` | あり | standalone issue に受入条件・実装結果・品質証跡を記録 |
| `tasks/` | あり | P13 の仕様・architecture 書き戻し記録へ本修正の完了 trace と製品非影響を追記 |
| `system-spec/` | あり | `dev-workflow.md` に C02 lifecycle 単調前進ガードを実装反映注記として記録 |
| `specs/` | あり | 集約仕様に開発管理整合性の反映と製品 runtime 非変更を記録 |
| `architecture/` | あり | C14 の最新 persisted node 再読込と C02 の stale before-image 拒否という二層境界を記録 |

## 技術的な判断根拠

`node` envelope または bare canonical node は C14 の full snapshot 再試行として扱う。
既存 feature が前進済みなのに、入力が `draft`、`pending`、`incomplete` へ戻す場合は
書込み前に拒否する。意図的な再評価だけは、変更フィールドを列挙した `patch` で実行できる。

この区別は C02 の既存単一 writer 境界を変えず、古い before-image（更新前の写し）を
fail-closed（安全側に停止）にする。feature 以外の artifact kind は従来挙動を維持する。

## 品質ゲート

- focused pytest: lifecycle 単独 4 フィールド × 2 入力形式、正の対照、
  feature 以外、明示 patch を含め PASS
- Dev Graph plugin pytest: main 統合・競合解消後 713 passed / 2 skipped /
  5 subtests passed
- task 仕様書: `feature-package/feat-dev-pipeline-improvement` の P01〜P13 exact set、
  digest `af8a73df…`、violations 0
- graph schema: valid、violations 0
- live-trial: main 統合後の current behavior closure で C02 / C03 / C14 を再実走。
  C02 / C03 は fresh evaluator PASS。C14 は
  `20260729T101543Z-pr601-decompose-paired-r4` で beads / none を同一 closure 上に
  paired 実走し、各 binding 2 回、合計 4 回の Skill 呼出し、全 5 node の最終
  `operation=noop` / `write_count=0`、nudge=0 / gate=0、fresh evaluator PASS を確認
- repository CI: PASS 123 / WARN 4 / FAIL 0。4 warning は段階導入中の既存 plugin
  completeness / rubric reference 検査で、本変更の blocking failure ではない

停止・介入・古い closure などで不採用になった先行 trial は失敗証跡として残し、最終受入参照は
介入なしで完走した fresh run だけへ更新した。

## 500 行確認

変更した手書き実装・テスト・契約・文書は全て 500 行以下である。500 行を超える
`.dev-graph/state/graph.json` は構造化された単一正本、live-trial transcript は機械生成の
一次証拠であり、意味単位に分割すると参照 digest と原記録の完全性を壊すため分割対象外とした。

PR 更新直前に `scripts/build-spec-reflection-receipt.py --spec-impact reflected` を実行し、
仕様 path の実差分とこの判断を最終 branch / HEAD に束縛する。

## 2026-07-30 重複報告 j66m の再検証

- `HarnessHub-j66m` は本件と同じ不具合を指し、依存・下流 task を持たない重複報告である。
- 実装を二重化せず、Beads `HarnessHub-bk8v` と dev-graph node
  `issue-c02-upsert-lifecycle-regression-20260729` を実装・完了証拠の正本として維持する。
- 新しい製品 runtime 契約はない。既存の C02 開発管理契約が現行 `main` でも有効であることを
  focused / plugin 全体 / live-trial freshness / repository CI の各ゲートで再検証する。
- `system-spec/dev-workflow.md` の C02 契約は確定済み `qa-096` に含まれるため、
  重複報告だけを理由とする新規 QA や C03 再コンパイルは行わず、二重正本を作らない。
- 本追記は重複報告と既存正本の対応を失わないための trace であり、API、DB schema、
  認証認可、UI、Cloudflare deploy unit、運用 SLO は変更しない。
- 再検証結果は focused pytest 22 passed、Dev Graph plugin pytest 720 passed / 2 skipped、
  graph schema valid / violations 0、live-trial planner reuse 3 / run 0 / defer 0、
  verdict lint 9 verified、P01〜P13 exact 13 / digest `af8a73df...` である。
- repository CI parity は PASS 123 / WARN 4 / FAIL 0。4 WARN は段階導入中の既存
  advisory であり、本差分の blocking failure ではない。`py_compile`、文書行数・配置、
  generation lineage、task projection、`git diff --check` も通過した。

## 2026-08-01 main 競合解消の再受領

- 最新 `main` `c793f9c` の `qa-102`、CI-local parity、lineage を保持し、C02 の既存項目へ
  `HarnessHub-j66m` の統合 trace を重ねた。製品 runtime 契約の変更はない。
- focused pytest 22 passed、Dev Graph plugin pytest 730 passed / 2 skipped、graph schema
  violations 0、live-trial planner reuse 3 / run 0 / defer 0 を確認した。
- repository CI parity は PASS 136 / WARN 4 / FAIL 0。文書は全件300行以内、artifact 配置、
  exact P01〜P13、generation lineage、task projection、Python compile、差分検査も通過した。
