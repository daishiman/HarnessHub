---
status: confirmed
layer: feature-spec-reflection
beads_ids:
  - HarnessHub-4d8
  - HarnessHub-6ib
dev_graph_node_ids:
  - issue-aggregate-completeness-file-split-20260722
  - issue-completeness-report-session-id-migration-20260723
related_feature: feat-dev-pipeline-improvement
spec_impact: none
recorded_at: 2026-08-03
---

# C05 完成度評価器の責務分割と実 fork 再生成 — 仕様反映受領書

## 1. 目的と背景

`HarnessHub-4d8` は、C05 完成度評価器の集約スクリプトとテストが 500 行を超えたため、
公開 CLI を保ったまま責務単位で分ける作業である。`HarnessHub-6ib` は、run/session
束縛を導入した後も旧 `completeness-report.json` に実 fork の `session_id` がなく、
自己申告だけのレポートを拒否する検査を通せなかった問題を、実監査から再生成する作業である。

## 2. 結論

**製品仕様・設計への意味的な影響はない (`spec-impact: none`)。**

- `HarnessHub-4d8`: 公開入口 `aggregate-completeness.py` の CLI、入力、JSON 出力、exit
  code、6 観点の fail-closed 集約は不変である。fork 台帳の読取り・receipt 照合・
  run/session 束縛だけを import 専用 `audit_fork_attribution.py` に移した。
- `HarnessHub-6ib`: C07/C06/C08 を実 fork した監査結果を session_id とともに記録し、
  `completeness-report.json` を再生成した。これは仕様書そのものを変更する処理ではなく、
  現在の仕様書を監査した証跡である。
- 再監査では pnpm、Wrangler、Playwright の公式参照が古いことを検出したため、総合判定は
  `PASS` から `FAIL` へ正しく変化した。これは監査器が機能した結果であり、製品 API、
  データ、認証、UI、デプロイ契約の変更ではない。

## 3. 正規フローで確認した層

| 層 | 確認結果 | 反映判断 |
|---|---|---|
| `docs/` | 本受領書に目的、判断、検証、残課題を記録 | 反映済み |
| `features/` | `feat-dev-pipeline-improvement` の開発品質改善に属する内部 refactor | 本受領書で追跡。feature の目的・受入条件は不変 |
| `system-spec/` | `completeness-report.json` は実監査結果として更新。確定要求・QA・設計判断は不変 | 仕様正本の reopen / import は不要 |
| `specs/` | 外部契約・製品要件に差分なし | 変更不要 |
| `architecture/` | component、依存、データフロー、deploy unit に差分なし | ADR / architecture 更新不要 |
| `tasks/` | 既存 P01–P13 package は内部 issue の分割で変更されない | task spec 本文は変更せず品質ゲートを再実行 |

不必要な製品仕様への追記は、plugin 内部契約を製品仕様へ混在させるため行わない。C05 の
内部構成は `plugins/system-spec-harness/` の SKILL、resource-map、README、hook scope に
正規に記録した。

## 4. 実施内容

1. `aggregate-completeness.py` を集約・CLI・決定論 gate の責務に縮小した。
2. `audit_fork_attribution.py` を追加し、台帳集計、agent 定義確認、receipt 照合、
   session 単一性の fail-closed 検証を移した。
3. 集約テスト、台帳帰属テスト、共通 fixture に分冊し、変更した Python 5 ファイルを
   107–297 行に収めた。
4. SKILL の `script_refs` / Additional Resources、resource-map、plugin README、hook
   protection scope を実際の責務境界へ更新した。
5. 実 fork 3 件の append-only 台帳と `completeness-report.json` を生成し、
   `--session de2ff9f7-a2a6-4207-b62a-e74e6b98dfa8` で宣言と観測を突合した。

## 5. 検証結果

| 検証 | 結果 |
|---|---|
| C05 focused + hook regression | 40 passed |
| system-spec-harness 全体 | 486 passed |
| `aggregate-completeness.py --report --session …` | PASS、VIOLATION 0 |
| `aggregate-completeness.py --knowledge-graph` | PASS、4 profile exit 0 |
| task spec package quality gate | P01–P13、violations 0 |
| `lint-script-naming.py` | VIOLATION 0（既存公開 CLI は PENDING のまま、新 module は exception 適合） |
| `lint-doc-line-limit.py --ratchet-base origin/main` | PASS、524 文書、allowlist 0 |
| `lint-artifact-placement.py` / `git diff --check` | PASS |
| focused content review | PASS。README の旧テスト件数 375 → 486 を low 所見として修正し、elegance / rubric の受領書を更新 |
| plugin package check | blocking failure 0（既存 advisory 23 件のみ） |

## 6. 残課題

既存 Beads `HarnessHub-nq2`（dev-graph node
`issue-c08-audit-primary-get-capability-20260722`）で、C02 の正規フローにより pnpm、
Wrangler、Playwright の 3 件を公式一次情報から再取得し、`fetched-references.json` と
C08 監査を再生成する。現時点の `FAIL` は隠さず維持する。新しい重複課題は作成しない。

## 7. 開発内容の説明

### 中学生向け

大きすぎた「テストの採点係」を、合計点を出す係と「本当に別の先生が確認したか」を
確かめる係に分けた。仕事のやり方は変えず、読みやすく直した。また、別の先生に確認して
もらった記録に今回の日付印を付け直したら、3 つの古い参考資料が見つかった。ごまかさず、
採点結果は不合格にして、資料を更新する次の宿題を作った。

### 技術者向け

公開 CLI の compatibility surface を固定した information-preserving refactor である。
`audit_fork_attribution.py` は `(session_id, subagent_type)` を join key として receipt と
PostToolUse ledger を照合し、空台帳、未宣言、unknown session、複数 run の混在を
fail-closed で拒否する。C05 は report shape、aggregate verdict、matrix / knowledge-graph
subprocess gate に限定され、帰属検証の変更は既存関数の re-export により利用互換性を維持する。
