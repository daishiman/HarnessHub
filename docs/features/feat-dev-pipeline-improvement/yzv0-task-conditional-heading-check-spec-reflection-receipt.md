---
status: confirmed
layer: feature-spec-reflection
feature_id: feat-dev-pipeline-improvement
graph_node_id: issue-task-conditional-heading-check-resolution-20260807
beads_id: HarnessHub-yzv0
updated: 2026-08-07
spec_impact: reflected-internal-design
---

# task kind の conditional_templates 見出し検査解決 — 仕様反映受領書

## 1. 目的と背景

`HarnessHub-85z0` で C11 readiness (本文の必須見出し欠落検査 `heading_missing`) を
実装した際、`template-contract.json` の `conditional_templates` / `conditional_required_sections`
(生成元テンプレートの世代差を吸収する仕組み) を解決するコードがリポジトリ内に一切存在しない
ことが判明した。応急処置として `HEADING_MISSING_KINDS` (見出し欠落検査を有効化する artifact kind
の集合) を `specification` のみへ限定し、`task` / `issue` は検査対象外のまま着地した。

本変更 (`HarnessHub-yzv0`) は `task` kind についてこの limitation を解消する。実データ調査により、
system-dev-planner (機能横断のタスク生成ツール) 由来の task 260 件は `parent_feature` (親 feature)
単位で本文構成が完全に一貫しており、`source_lineage.origin_kind` (task がどこから来たかを示す
属性) が `"system-dev-planner"` である task だけが、`conditional_required_sections` の複数 variant
(世代) のいずれかに一致すればよい、という条件分岐を安全に実装できることが分かった。

`issue` kind は実測の結果 task とは異なる構造の課題(`conditional_templates` 機構自体が
存在しない・見出し欠落パターンが単一の慣習に還元できない)と判断し、今回のスコープから除外した。

## 2. 対象

| 項目 | 値 |
|---|---|
| Beads | `HarnessHub-yzv0` |
| dev-graph node | 未登録 (pure beads issue、`external_ref` なし) |
| branch | `devgraph/issue-task-conditional-heading-check-resolution-20260807` |
| base | `main` |
| task type | implementation / NON_VISUAL |
| deploy unit | repository development tooling (dev-graph plugin) |
| 依存 | `HarnessHub-85z0` (完了済み、PR #664 で main へ統合済み) |

## 3. 中学生向けの説明

学校の「提出物チェック係」を思い浮かべてください。レポートには「目的」「方法」「結果」など
必ず書くべき見出しが決まっています。でも、先生によって配る用紙のフォーマットが違うことが
あります。ある先生は3つの見出しだけの簡易用紙を配り、別の先生は19個の見出しがある詳しい用紙を
配ります。チェック係がどちらか一方の用紙だけを「正解」だと決めつけてチェックすると、
もう一方の用紙で出した人は全員「見出しが足りない」と怒られてしまいます。

今回の変更は、チェック係に「この生徒がどの先生から用紙をもらったか」を先に確認させ、
その先生の用紙フォーマットに合わせて正しくチェックできるようにしたものです。260件の
提出物を実際に調べたところ、先生ごとに配る用紙が完全に決まっていることが分かったので、
安心してこの仕組みを入れられました。

## 4. 技術者向けの説明

### 4.1 不変条件

- `graph_artifact_readiness.py` の `heading_missing` 判定は、artifact kind が
  `conditional_templates` を持つ場合、実体の見出し集合と完全一致する
  (missing 数最小の) variant を1つ採用する「緩い方に倒す」設計を維持する
  (fail-closed ではなく、正当なテンプレート世代差を許容する)。
- `HEADING_MISSING_KINDS` (検査有効化 kind 集合) への追加は、条件分岐トリガーとなる
  ノード属性 (今回は `source_lineage.origin_kind`) が実データで完全に一貫している
  ことを事前に実測確認してから行う。

### 4.2 実装

- `plugins/dev-graph/scripts/graph_artifact_readiness.py`: `_conditional_trigger()` /
  `_required_section_variants()` を追加し、`missing_required_headings()` に `node` 引数を
  追加。`source_lineage.origin_kind == "system-dev-planner"` の task は
  `conditional_required_sections` の `system_development` (フル19見出し) /
  `system_development_baseline` (軽量3見出し) のいずれか一致する variant で判定する。
- `plugins/dev-graph/scripts/validate-graph-schema.py`: `HEADING_MISSING_KINDS` へ
  `task` を追加。
- `template-contract.json` (実装正本 `plugins/dev-graph/templates/`、導入先コピー
  `.dev-graph/templates/`、計画ドキュメント `plugin-plans/dev-graph/templates/` の3箇所を同期):
  task エントリの `conditional_required_sections` に `system_development` /
  `system_development_baseline` の2 variant を追加。

### 4.3 テスト契約

- `graph_artifact_readiness.py` の variant 解決ロジックを focused test で固定。
- `validate-graph-schema.py` の `HEADING_MISSING_KINDS` に task が入り、
  system-dev-planner 由来 task の2 variant いずれでも heading_missing が出ないこと、
  manual origin task は従来通り base required_sections で検査されることを固定
  (`test_validate_graph_schema_c11_heading_readiness.py`、500 行超過解消のため
  `test_validate_graph_schema_c11_coverage.py` から分離)。
- 既存 fixture (`test_graph_node_mvp_schema_registration.py`、
  `register_package_test_support.py`、`test_semantic_c26_completion.py`、
  `live_trial_shapes/base_shape.py`) の task 本文を、各ノードの `origin_kind` に応じた
  正しい variant (base 13見出し、または system-dev-planner baseline 3見出し) へ追従修正。

## 5. 仕様・設計への影響判定

**内部設計への影響あり、製品仕様への影響なし**と判断した。

- `system-spec/dev-workflow.md` の C11 本文 readiness に関する既存記述 (「template-contract.json
  が artifact kind ごとに定める required section を検査する」) は、今回の task kind 対応を
  変更せずに包含できる一般的な表現になっているため、本文の変更は行わない。
- `architecture/harness-hub-dev-workflow.md` も同様に C11 readiness の責務境界を一般論として
  記述しており、kind 別の内部解決ロジック追加は既存記述と矛盾しない。
- `docs/features/feat-dev-pipeline-improvement/feat-dev-pipeline-improvement-changelog.md` と
  `harness-hub-dev-workflow-changelog.md` へ追記し、実装履歴と本受領書への導線を残す。
- `plugin-plans/dev-graph/references/execution-tracker-contract.md` は
  `conditional_templates` の解決仕様そのものを記述していないため非変更 (正本は
  `template-contract.json` と `graph_artifact_readiness.py` のコード)。
- `system-spec/spec-state.json` は変更しない。新しい利用者要件や QA 判断を追加するのではなく、
  85z0 で発覚した「conditional_templates 解決コード不在」という実装欠落を task kind について
  修復するものであるため。
- 製品 API、DB schema、認証認可、UI、Cloudflare deploy unit、確定済み QA 回答は変更しない。
- `issue` kind の同種対応は別課題としてスコープ外 (本受領書 §1 参照、beads への追加起票は見送り、
  yzv0 notes に調査結果を記録済み)。

## 6. 500 行判定

- 変更対象ファイルのうち `plugins/dev-graph/tests/test_validate_graph_schema_c11_coverage.py`
  は本変更前 427 行、変更後 601 行となり閾値を超過したため、heading_missing / placeholder 系
  テスト3件を `test_validate_graph_schema_c11_heading_readiness.py` (236行) へ分離し、
  元ファイルを393行へ縮小した。
- `plugins/dev-graph/tests/test_semantic_c26_completion.py` は変更前から771行 (既存の
  500行超過ファイル) であり、本変更による純増分は +41/-10 行に留まる。本ファイルの大半
  (700行超) は本課題と無関係な既存テスト構造であり、全面分割は影響範囲・リスクともに
  本課題のスコープを超えるため、今回は分割を見送る。別途リファクタリング課題として
  切り出す余地があることを残課題 (§8) に記録する。

## 7. 最終検証

| gate | 結果 |
|---|---|
| yzv0 スコープ focused tests (6ファイル) | PASS: 86 passed |
| C11 heading readiness 分割後2ファイル | PASS: 18 passed |
| dev-graph test suite 全体 | PASS: 957 passed / 9 failed (既知の stale live-trial digest、本課題スコープ外) |

## 8. 残課題

- `issue` kind の見出し欠落検査対応は別課題として残る。着手時はまず issue の見出し慣習を
  広く実測調査した上で、`template-contract.json` の issue エントリ自体を再設計するところから
  始める必要がある (本受領書 §1 参照)。
- `test_semantic_c26_completion.py` (771行、既存) の分割は本課題のスコープ外として残る。
- 残る9件のテスト失敗 (`test_skill_criteria_evidence.py`) は fresh live-trial の再実施が
  必要な既知の stale digest であり、本課題の受入条件には含まれない。
