---
status: recorded
layer: feature-spec-reflection
feature_id: feat-dev-pipeline-improvement
graph_node_id: issue-guard-graph-schema-inline-python-variable-path-20260726
beads_id: HarnessHub-f84o
updated: 2026-08-03
spec_impact: reflected-internal-dev-workflow
---

# inline Python graph authority guard — 仕様反映受領書

## 1. 目的と背景

`HarnessHub-f84o` は、C19 live-trial 中に inline Python が変数へ保持した
`.dev-graph/state/graph.json` を C02 atomic writer を通さず書き換えられた問題である。
旧 C10 は path と書込み API の字面共起が中心で、`Path('.dev-graph') / 'state' /
'graph.json'` のように字面を分断すると遮断できなかった。

本変更の目的は、PreToolUse の時間契約を緩めず、普通の Python path 構築を静的に解決して
C02 の単一 writer 境界を実効的に守ることである。

## 2. 結論

**仕様・内部設計への影響あり、Harness Hub 製品 runtime への影響なし**と判断した。
`dev-workflow.web` を正規 R4-reopen し、最新 main の `qa-138` / `appr-027` を維持したまま、
`qa-139` / `appr-028` として C10 の AST 静的検出、
fail-closed、性能、意図的な限界を再確定した。製品の外部 API、DB schema、認証認可、
UI、Cloudflare deploy unit は変更していない。

## 3. 中学生向けの説明

学校の大切な名簿は「受付の人」だけが直す決まりだとします。前の見張りは、
「名簿の場所」が一続きで書かれていれば止められましたが、場所を三つの言葉に分け、
最後に組み立てると見逃していました。

今回、見張りが Python の文を実行せずに読み、「この三つをつなぐと名簿になる」と
判断できるようにしました。読むだけなので遅い別プログラムは起動しません。
普通の資料や一時ファイルは止めず、大切な名簿を書き換えるときだけ受付へ案内します。

## 4. 技術設計

- `guard-graph-schema.py`: C10 entrypoint と判定順序、既存字面層を所有する。
- `guard_python_writes.py`: `-c` / heredoc 抽出、AST write API 収集、authority 判定を所有する。
- `guard_python_path_eval.py`: 副作用なしの path 定数伝播を所有する。
- shell 抽出は command 位置と `env` / 環境変数 / `bash -c` を識別し、散文を出力する
  `echo` / `cat` と、標準 library と同名のユーザー定義関数を巻き込まない。
- 解決対象: 変数、Path `/` / `joinpath` / `parent` / tail 置換、join、f-string、
  `%` / `format`、列 join、import 別名、`getattr` の literal 名、identity 包み、bytes path。
- 書込み対象: `open` / `os.open` / pathlib mutation / shutil / os mutation。
  rename / replace / move は source と destination の双方を記録する。
- 未解決式は authority prefix または `state/graph.json` tail が確定すれば遮断する。
  `.dev-graph/tmp/` / `cache/` / `templates/` と読取専用 API は通す。
- 遮断経路は subprocess、network、graph 全件検証を起動しない。

## 5. 正規仕様反映

| 層 | 反映内容 |
|---|---|
| `system-spec/spec-state.json` | 単一 transition writer で `dev-workflow.web` を R4-reopen → `qa-139` / `appr-028` 再確定。最新 main の `qa-138` / `appr-027` は append-only で維持 |
| `system-spec/dev-workflow.md` | compile 正規生成で C10 AST / fail-closed / 性能 / 限界を反映 |
| `specs/harness-hub-system-specification.md` | 集約仕様の実装反映と製品非変更を記録 |
| `architecture/harness-hub-dev-workflow.md` | entrypoint / write collector / path evaluator / PostToolUse の責務境界を記録 |
| `features/feat-dev-pipeline-improvement.md` | feature 履歴と本受領書への導線を追加 |
| `tasks/...-p12.md` / `...-p13.md` | 品質ゲートと PR 引き継ぎを記録 |
| plugin contract | 実行時保証、既知限界、補完監査を同期 |

## 6. 行数と責務分割

変更前に `guard_python_writes.py` は 615 行、包括 test は 703 行だった。
path 評価、write API 収集、core case、性能・既知限界を意味単位で分け、変更した手書き
実装・テスト・仕様文書をすべて 500 行以下にした。生成済み live-trial transcript / snapshot は
hash で全体へ束縛される監査証拠なので、手書き実装と同じ基準では分割しない。

## 7. 検証結果

| ゲート | 実測結果 |
|---|---|
| Python compile + focused test | **PASS**: 257 passed |
| task package | **PASS**: `validate-system-plan.py` / package digest `sha256:af8a73…` |
| Dev Graph schema | **PASS**: revision 1184 / valid=true / readiness=complete |
| system-spec coverage | **PASS**: complete + foundation |
| fresh live-trial | **PASS 9/9**: C01/C02/C03/C04/C05/C14/C15/C18/C19、nudge=0 / gate=0 |
| criteria | **PASS**: 22 passed / target 9 verdict verified / missing 0 |
| dev-graph plugin 全体 | **PASS**: 952 passed / 5 subtests passed |
| repository CI | **PASS**: PASS 139 / WARN 5 / FAIL 0 |

fresh evidence は `20260806T010000Z-f84o-postmain-*` を正とし、C01 だけは完了 marker を
満たした `20260806T011000Z-f84o-postmain-c01-r2` を採用した。behavior closure は順に
C01 `9fa4b678…`、C02 `8e203f48…`、C03 `f618d4ba…`、C04 `d5033c34…`、
C05 `d426c9f6…`、C14 `79649629…`、C15 `74c9955c…`、C18 `64a9eac9…`、
C19 `3b536069…`。最新 main `1c60a47d` は Dev Graph behavior tree を変更しないため、
統合後の criteria でも 22/22 PASS を維持した。

C19 は 4 個の system-spec harness skill を正規呼出しし、3 件の genuine hook ledger、
aggregate gate 0、6 項目の lineage/digest を独立 evaluator が照合した。C14 は graph source の
一意選択、draft 除外、negative control を含む 7/7 を独立 evaluator が確認した。

`lint-live-trial-verdict.py --all --enforce` だけは、`origin/main` にも同じ状態で存在する
別 plugin 6 skill の verdict 不在を報告する。対象 9 skill の `--plugin dev-graph --enforce` は
9 verified / missing 0 であり、本変更起因ではないため別 Beads へ分離する。

**最終判定: PASS**。task 仕様の focused / full / live-trial / criteria / task package /
system-spec / repository CI を満たし、今回対象の変更は draft PR 公開可能である。

## 8. main 同期と公開境界

- `origin/main` → local `main`: `1c60a47d` で一致を確認済み。
- local `main` → branch: `6ac56644` を経て、最終再統合 `5bdf3c25`。
- branch: `devgraph/issue-guard-graph-schema-inline-python-variable-path-20260726`
- base: repository default branch `main`
- commit / push / draft PR は本受領書を含む対象 file だけで実行し、URL は Beads と
  Dev Graph linkage に記録する。
- 既存 draft PR #642 の f84o 正規表現層より AST 層の実測 coverage が広いため、本 PR は
  f84o 部分の後継として関係を明記する。別 Beads の変更は混在させない。

## 9. 残る限界

- `exec` / `eval` の source を再帰的に解析しない。
- `replace` / slice / base64 等、任意の文字列難読化を実行しない。
- 別 script file の本文を PreToolUse で読まない。

これらは入力長や repository file 数に遮断時間を依存させないための境界であり、
PostToolUse authority drift audit と C02 writer 規約で補完する。将来塞ぐ場合は、既知限界 test と
contract 文書を同じ変更で更新する。
