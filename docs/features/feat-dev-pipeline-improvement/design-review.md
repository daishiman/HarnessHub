---
status: confirmed
layer: feature-design-review
task: SYS-DEV-PIPELINE-IMPROVEMENT-P03
parent_feature: feat-dev-pipeline-improvement
---

# feat-dev-pipeline-improvement 独立設計レビュー (P03)

## 目的

P02 設計が qa-067/qa-070/qa-071、Beads の Dolt 正本、単一 writer、fail-closed、digest 不変条件を満たすかを、実装ファイルとテストから再評価する。

## findings と反映結果

| id | finding | 反映 | 根拠 |
|---|---|---|---|
| R-01 | status と実行状態の二重正本 | 文書 lifecycle と completion evidence を分離 | `design.md` §2/§7 |
| R-02 | Beads close が C07 を迂回 | 4 close 形式を捕捉し C10 を string key 化 | `guard-spec-drift-close.py` / `check-triage-complete.py` |
| R-03 | hook が repo settings に未登録 | settings generator で PreToolUse/Bash へ登録 | `.claude/settings.json` |
| R-04 | handoff の improvements/clusters が未監査 | 3配列・20ファイル・123項目を同一 lint 対象化 | `lint-handoff-disposition.py` |
| R-05 | handoff schema の二重 authority | planner 正本 schema 1.1.0 だけを拡張 | `improvement-handoff.schema.json` |
| R-06 | task template の status enum 不整合 | graph schema の lifecycle enum に統一 | `plugins/dev-graph/templates/task.md` |
| R-07 | passive JSONL を Beads 正本扱い | live `bd export` を既定、JSONL は明示 snapshot のみ | `lint-open-residue.py` / CI workflow |
| R-08 | stage0 baseline が別 rule も隠す | baseline 適用を OR-003 のみに限定 | `lint-open-residue.py` |
| R-09 | 中核31 findings が umbrella deferred | 全31件を実在 path と個別 rationale へ差分監査 | `migration-receipt.json` |
| R-10 | emitter が lint 不合格の1.0.0を新規生成 | 1.1.0既定・disposition必須・旧形式拒否 | `emit-improvement-handoff.py` |
| R-11 | qa-071 の内側反復ループが task spec に無い | template/validator/P01-P13へ15節目を追加 | `system-task-spec-template.md` |
| R-12 | P13 の正本書き戻しが機械契約でない | P13 marker と validator negative test を追加 | `validate-system-plan.py` |

## 独立判定

- 受け入れ条件: 7/7 PASS。
- quality constraints: 6/6 適合。
- 未解決 high/medium finding: 0。
- P13: commit/push/PR と main merge はユーザー指示により未実施。実装品質の未達ではなく外部 publication gate として保持する。

結論: **PASS**。P04 以降の検証と、権限が与えられた後の P13 へ進める。
