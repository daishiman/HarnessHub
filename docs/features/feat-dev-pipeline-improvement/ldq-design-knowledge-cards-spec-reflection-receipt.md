---
status: recorded
layer: feature-spec-reflection
feature_id: feat-dev-pipeline-improvement
graph_node_id: issue-resource-map-deep-cards-20260722
beads_id: HarnessHub-ldq
spec_impact: reflected-internal-design
reviewed_at: "2026-08-10"
---

# System design deep knowledge cards — 仕様反映受領書

## 結論

system-spec compiler の知識入力と章対応に内部設計影響がある。4 枚の deep card、resource map、catalog 順序、検査、compile 結果を `system-spec/`・`specs/`・`architecture/`・`features/`・`tasks/`・`docs/` へ反映した。Harness Hub の製品 runtime は変更しない。

## 中学生向けの説明

教科書の「使いやすさ」「テスト」「作り続ける方法」「止まりにくい運用」の章に、詳しい参考カードを 1 枚ずつ追加しました。目次と読む順番も機械が確認するので、カードを足したのに教科書へ載らない事故を防げます。

## 専門的な説明

`resource-map.yaml` が chapter-to-card topology、`knowledge-catalog.json` が dependency order を所有する。C04 validator は未知参照・欠落・順序 drift を拒否し、canonical compiler は Usability & Accessibility / Test Strategy / Continuous Delivery / Site Reliability Engineering を対応する 4 章へ決定論的に投影する。

## 反映先

| 層 | 内容 |
|---|---|
| `system-spec/` | `ui-ux` / `testing-qa` / `dev-workflow` / `infrastructure` を canonical compiler で更新。 |
| `specs/` | C04 writeback、SSOT、runtime 非変更を追補。 |
| `architecture/` | resource map・catalog・compiler・validator の責務境界を追補。 |
| `features/` | dev pipeline の deep knowledge 改善を追補。 |
| `tasks/` | P13 handoff へ検証と PR 境界を追補。 |
| `docs/` | 本受領書と content review 証拠を記録。 |

## 検証と残課題

- card validator、compile test、coverage/source-citation/knowledge graph gate を draft PR 前に再実行する。
- content review は rubric / elegance とも PASS。low observation は将来の文言改善で、MVP の blocker ではない。
- `HarnessHub-ldq` は本 PR の review/merge 後に close する。
