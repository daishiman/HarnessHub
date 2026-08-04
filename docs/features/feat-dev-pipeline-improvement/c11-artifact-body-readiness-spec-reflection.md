---
status: confirmed
layer: feature-spec-reflection
beads_ids:
  - HarnessHub-4t9g
dev_graph_node_id: issue-implementation-readiness-body-validation-20260728
feature_node_id: feat-dev-pipeline-improvement
spec_impact: reflected
reviewed_at: 2026-07-29
approval_id: appr-013
qa_id: qa-092
---

# C11 artifact 本文 readiness — 仕様反映受領書

## 依頼と目的

変更中の Beads タスクを最終レビューし、main 統合後に task 仕様書と repository の
品質ゲートを再実行した。目的は、frontmatter と見出しだけがある未記入 artifact を
実装可能と誤判定せず、tracker 投影と system build handoff を安全側で止めることである。

## 仕様影響の結論

**反映あり。ただし Harness Hub 製品契約は非変更。**

変更は repository 内の Dev Graph C11 readiness、C02 upsert、tracker 投影、
system build handoff に影響する。製品の外部 API、DB schema、認証認可、UI、
Cloudflare deploy unit は変更しない。

## 正規フローでの反映先

| 層 | 反映内容 |
|---|---|
| `system-spec/spec-state.json` | 単一 transition writer で `appr-013`、R4 reopen、`qa-092` の再確定を記録 |
| `system-spec/dev-workflow.md` | C03 compiler で `qa-092` の本文 readiness 契約を再生成 |
| `specs/harness-hub-system-specification.md` | 製品境界と repository 開発品質差分を追記 |
| `architecture/harness-hub-dev-workflow.md` | C11 判定境界と C02 transaction rollback を反映 |
| `features/feat-dev-pipeline-improvement.md` | Beads 実装結果、互換移行、影響境界を履歴化 |
| `tasks/feat-dev-pipeline-improvement/*-p11.md` | 全 artifact kind の正例・負例と再実行コマンドを追補 |
| `tasks/feat-dev-pipeline-improvement/*-p12.md` | 新規作成・本文再生成・復旧時の運用を追補 |
| `plugins/dev-graph/templates/README.md` | template と required section の plugin 内部契約を追補 |
| 本文書 | 仕様反映、検証結果、影響境界の受領記録 |

## 実装と互換移行

- YAML frontmatter、fenced code block、見出し自体を本文量から除外する。
- 空本文、canonical angle-bracket placeholder、`TBD` / `TODO` / `未定` だけの節を
  `placeholder_only_section` として拒否する。
- 構造 container は、実内容を持つ child section がある場合だけ充足とする。
- 違反節を `missing_sections` に集約し、
  `implementation_readiness=incomplete` とする。
- C02 の template-only 作成と placeholder 再生成は graph と artifact を rollback する。
  metadata-only update の本文保持と substantive body による作成・復旧は維持する。
- 現行正本で新契約に抵触した既存 issue artifact 10 件は、C02 の正規 upsert 経路で
  具体的な本文へ互換移行した。graph revision は 983 から 992 へ進み、
  移行後の C11 は `valid=true`、`missing_sections=[]` となった。

## 500 行上限

本文判定ロジックは import 専用 module
`plugins/dev-graph/scripts/graph_artifact_readiness.py` へ分離した。
CLI ではないため、repository の script naming lint では明示的な module 例外としている。
変更した手書き実装・テスト・説明文書はすべて 500 行未満である。

`.dev-graph/state/graph.json` と `system-spec/spec-state.json` は writer/compiler が
単一ファイルを前提に扱う機械生成の正本であり、schema と atomic update を壊すため
分割しない。500 行を超える一部の `pane.txt` / `transcript.jsonl` も、verdict の
SHA-256 が実走 transcript の完全な byte 列を束縛する機械証跡なので分割しない。
人が確認する監査結果は責務別 evidence file と本受領書へ分離した。

## 品質ゲート

- main 統合: local `main` は `origin/main` と同一の `bcb683f`。
  feature branch への最終 merge commit は `09d2955` (第 2 parent=`bcb683f`)。
- focused pytest: 実装 3 suite は `23 passed`、命名回帰を含む再検証は `55 passed`。
- Dev Graph 全体: `720 passed / 2 skipped / 5 subtests passed`。
- repository 全体: `make test` は `7620 passed / 5 skipped`、
  LLM coverage 100%、Phase 0 PASS。
- live trial: `bcb683f` 統合後に挙動が変わった node / sync / decompose を
  fresh session で再実走し、残る6 skill は現行 digest 一致の証跡を再利用した。
  decompose 初回は2回目 Skill 後の digest 補正を検出して明示 FAIL とし、新規 fixture の
  retry で4 Skill 呼出し、10 noop、後追い mutation 0、独立 evaluator PASS へ収束した。
  incremental planner は `reuse=9 / run=0 / defer=0`、
  Dev Graph lint は `9 verdicts verified / 0 missing`。
- task package: exact P01〜P13、digest `af8a73…da6`、violations 0。
- system-spec coverage: final 未収集 0、foundation trace PASS。
- repository lint、300 行文書上限、plugin package check、script naming、graph schema、
  `git diff --check` はすべて PASS。

## Beads / dev-graph

- Beads: `HarnessHub-4t9g`
- dev-graph node: `issue-implementation-readiness-body-validation-20260728`
- 承認記録: `appr-013`
- system-spec 確定質疑: `qa-092`

## 残課題

今回の受入範囲では「必須見出しが存在するが本文が placeholder」の拒否を完成した。
必須見出し名そのものが欠落した既存 artifact の一括移行と、新規登録時の専用エラー表現は
後続 Beads `HarnessHub-85z0`
（dev-graph `issue-required-heading-presence-validation-20260729`）として起票した。
無関係な既存差分と試験準備用 cache は commit 対象外とする。
