---
status: confirmed
layer: feature-spec-reflection
feature_id: feat-dev-pipeline-improvement
graph_node_id: issue-register-package-projection-idempotency-drift-20260728
beads_id: HarnessHub-cvli
updated: 2026-08-02
spec_impact: reflected-internal-design
---

# exact-13 registration と task projection の冪等性 — 仕様反映受領書

## 1. 目的と背景

同じ exact-13 generation を登録した直後に C02 `upsert-node.py` が task Markdown の
必須 frontmatter を投影すると、保存済み node だけに六項目が増えた。次の
`register-package.py --dry-run` は同じ source digest なのに内容差として止まり、
再実行可能であるべき登録が冪等（べきとう＝何度実行しても同じ結果になる性質）ではなかった。

この変更の目的は、registration manifest と task projection の責務を混ぜずに、同一 generation
の再登録を安全な no-op に戻すことである。

## 2. 対象

| 項目 | 値 |
|---|---|
| Beads ID | `HarnessHub-cvli` |
| dev-graph node ID | `issue-register-package-projection-idempotency-drift-20260728` |
| branch | `devgraph/issue-register-package-projection-idempotency-drift-20260728` |
| base branch | `main` |
| 対象 | repository development tooling / NON_VISUAL |

## 3. 中学生向けの説明

13 枚の作業カードを登録する係と、カードに「何のための作業か」などの説明を後から書く係が
います。前は、後の係が説明を書いたカードを前の係が「最初と違う」と誤って止めていました。

今回は、後の係だけが書く六つの説明は残したまま確認するようにしました。ただし、日付が昔へ
戻っている、説明以外が変わっている、といった本当に怪しい違いは今までどおり止めます。

## 4. 技術者向けの説明

- `registration_projection.py` は C02 projection 所有の `purpose`、`goal`、`scope_in`、
  `scope_out`、`acceptance`、`architecture_refs` だけを copy する小さな helper である。
- `register-package.py` は existing exact-13 node の比較前・supersede 時の置換前に helper を
  適用する。manifest が値を明示した場合は copy しないため、意図した変更は drift として検出する。
- `updated_at` は保存済み時刻が登録時刻と同じか新しければ projection による前進として受理する。
  欠落・解析不能・後退は、文字列が完全一致する場合を除いて fail-closed とする。
- exact-13 数、graph schema、source digest、immutable registration receipt、公開 CLI の
  operation は変更しない。既存の Python / unittest fixture は support module へ分離し、
  変更対象の手書きファイルを 500 行以下にした。

## 5. 仕様・設計への影響判定と反映

**開発管理の内部設計には影響あり、Harness Hub 製品仕様には影響なし**と判断した。

| 層 | 判断・反映 |
|---|---|
| `system-spec/` | `dev-workflow.md` に registration / projection の責務、時刻単調性、製品非影響を追記した。 |
| `specs/` | 非変更。新しい利用者要件、API、DB、認証認可、UI、deploy unit、確定 QA は増えず、496 行の集約仕様へ下流実装を重複させない。 |
| `architecture/` | wrapper の source lineage を正規 C02 writer で同期し、詳細な component 境界は architecture changelog に記録した。 |
| `features/` | feature node に follow-up issue を関連付け、実装履歴は feature changelog に追加する。 |
| `tasks/` | P13 の post-completion write-back として判断・受領書への導線を追記する。promoted package digest は不変。 |
| `docs/` | 本受領書、issue 実装状況、execution tracker contract、二つの changelog を更新する。 |

`system-spec/spec-state.json` は変更しない。これは既存の C02 単一 writer と registration
receipt 不変条件の実装不足を直すもので、requirements / approval の再決定ではない。

## 6. 正規フロー

1. `system-spec/dev-workflow.md` と execution tracker contract を正本として更新する。
2. `upsert-node.py` で issue、feature、architecture、P13 artifact を graph と frontmatter の
   同じ値へ同期する。本文は C02 の既定どおり保持し、`--regenerate-body` は使わない。
3. graph schema、document placement、task package、focused / full test、fresh live trial、
   repository CI を現在 branch で再実行する。
4. Beads `HarnessHub-cvli` に結果を記録する。PR merge が completion authority のため、merge 前は
   close しない。

## 7. 500 行判定

変更対象の手書きファイルは `register-package.py` 496 行、projection helper 52 行、既存 test
342 行、test support 218 行、追加 test 140 行で、すべて 500 行以下である。生成 live-trial
証跡が必要になった場合だけは verifier が一体で読む JSON / JSONL を分割せず、生成物である理由を
検証結果とともに記録する。

## 8. 最終検証

`origin/main` を local `main` へ fast-forward し、その `main` を本 branch へ merge した tree で
次を再実行した。

- `python3 -m unittest ...test_register_package.py ...test_register_package_projection_idempotency.py`: 39 passed
- `python3 -m pytest plugins/dev-graph/tests/test_register_package_completion_policy.py -q`: 5 passed
- `python3 -m pytest plugins/dev-graph/tests/test_skill_criteria_evidence.py -q`: 22 passed
- `python3 -m pytest plugins/dev-graph/tests -q`: 760 tests collected、失敗記録なし
- `python3 -m pytest plugins/system-spec-harness/tests -q`: 218 passed
- graph schema、registered source digest、exact-13 P01–P13、system-spec coverage matrix、
  artifact placement、300 行制限、plugin package、content review: PASS
- C14 fresh live trial `20260802T101500Z-cvli-decompose-r7`: beads / none の両系列で PASS、
  behavior closure `5bfe6072…f06f069f`。C02/C03 の fresh live trial も現行 closure として保持した。
- `git diff --check`: PASS（対象を stage し直した最終確認で実行する）。

`specs/` には製品仕様変更がないため反映しない判断を再確認した。これは「未反映」ではなく、
第 5 節のスコープ判定どおりの正規反映である。

## 9. 残課題

実装・仕様反映の残課題はない。draft PR の review / main merge は repository の承認フローであり、
merge 前に Beads issue を close しない。
