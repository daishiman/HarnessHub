---
status: confirmed
layer: feature-spec-reflection
task: HarnessHub-dqca
parent_feature: feat-dev-pipeline-improvement
---

# C02 document layer 仕様反映記録

## 対象

- Beads ID: `HarnessHub-dqca`
- dev-graph node ID: `issue-c02-doc-layer-frontmatter-loss-20260726`
- 対象障害: document node の再 upsert 時に、本文先頭の `layer` frontmatter が失われる
- 判定日: 2026-07-30

## 結論

本変更は製品ランタイムや利用者向け機能には影響しない。一方、開発成果物を管理する
Dev Graph の document 契約には仕様・設計影響があるため、正本の
`system-spec/` を更新し、`specs/`、`architecture/`、`features/`、`tasks/`、
`docs/`、`issues/` へ同じ境界を反映した。

仕様上の結論は次のとおり。

1. document node は小文字 kebab-case の `layer` を必須とする。
2. document 以外の node は `layer` を持ってはならない。
3. 許可値は graph schema の `documentLayer` を唯一の正本とする。
4. 既存 document は正規 writer で一度だけ移行し、以後は graph と frontmatter の
   一致を fail-closed（不正時は安全側で失敗させる）で検査する。
5. 再 upsert は既存本文を保持し、graph の `layer` を frontmatter に復元する。

## 中学生向けの説明

図書館の本には「歴史」「科学」のような棚ラベルが付いています。この変更の
`layer` は、その棚ラベルに相当します。

これまでは本の情報を更新すると、管理台帳には棚ラベルが残っているのに、本の表紙から
ラベルだけが消えることがありました。そこで、台帳を正しい情報として表紙のラベルを
戻すようにしました。また、ラベルがない、同じラベルが二つある、決められていない
ラベルが付いている、といった状態は見逃さず、処理を止めて知らせます。

つまり「どの種類の文書か」が更新のたびに消えず、台帳と文書をいつも同じ状態に
保てるようになった機能である。

## 専門的な説明

### 契約と writer

- `graph-node.schema.json` に document 専用の `layer` discriminator
  （種類を判別する項目）を追加した。
- document では `layer` を required、非 document では prohibited とした。
- `upsert-node.py` は document 本文を生成した後、graph node の `layer` を
  frontmatter に復元する。
- `node_body.py` の復元処理は既存本文を保持し、既存 frontmatter の `layer` だけを
  正規値へ置換する。

### 検査

- artifact placement lint は schema の許可値を再利用し、graph/frontmatter の
  一致を検査する。
- `layer` の欠落、重複、無効値、既定値への暗黙補完を許可しない。
- 最終レビューで、非 document への `layer` 混入を schema が拒否していなかった点と、
  frontmatter の重複キーを lint が上書きして見逃していた点を追加修正した。
- 回帰テストは本文保持、欠落復元、値の正規化、非 document 拒否を含む。

## 正規フローで反映した成果物

| 層 | 反映先 | 反映内容 |
|---|---|---|
| 正本仕様 | `system-spec/spec-state.json`、`system-spec/dev-workflow.md` | main の `qa-097`〜`qa-101` を保持し、`qa-102` と `appr-019` で document layer・live-trial session 隔離契約と承認根拠を記録 |
| システム仕様 | `specs/harness-hub-system-specification.md` | Dev Graph の fail-closed 境界を追記 |
| アーキテクチャ | `architecture/harness-hub-dev-workflow.md` | schema、writer、lint の責務分離を追記 |
| feature | `features/feat-dev-pipeline-improvement.md` | C02 の変更範囲と仕様リンクを追記 |
| task | `tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p13.md` | 最終レビュー結果と品質ゲートを追記 |
| docs | 本書、`final-review-20260726.md` | 利用者向け概要と最終レビュー記録を追記 |
| issue | `issues/sys-c02-doc-layer-frontmatter-loss-20260726.md` | 解決内容と検証先を追記 |
| 内部契約 | `plugins/dev-graph/references/execution-tracker-contract.md` | graph/frontmatter parity 契約を追記 |

`system-spec/spec-state.json` の更新には system-spec harness の transition writer
（正規の状態更新プログラム）を使い、生成文書は compiler で再生成した。
graph-managed document の更新には Dev Graph の C02 writer を使った。

## 品質ゲート

| ゲート | 結果 |
|---|---|
| C02 回帰テスト | `8 passed` |
| C02 + main 競合対象 focused 回帰 | `49 passed` |
| artifact placement self-test | PASS |
| graph schema validation | valid、implementation readiness complete |
| artifact placement lint | PASS |
| document line limit | PASS、architecture wrapper は上限ちょうどの300行 |
| task 仕様書 Phase 1〜13 検査 | PASS、Phase 1〜13 を各1件確認 |
| root lint / repository CI | `make lint` PASS、`136 PASS / 4 WARN / 0 FAIL` |
| database package | `230 passed`、statement coverage 93.6% |
| system-spec coverage / citation / knowledge graph | PASS |
| system-spec harness tests | `529 passed` |
| live-trial transport / fixture / render focused 回帰 | `82 passed` |
| live-trial harness 全回帰 | `107 passed`（実 tmux の stale global 値上書き・隔離 cleanup を含む） |
| focused content review | 5 criteria PASS、未解決 LOW / MEDIUM / HIGH 0、75 skill の lint PASS |
| Dev Graph plugin manifest validation | PASS |
| fresh live-trial | 9 skill すべて PASS、nudge 0、gate 応答 0 |
| live-trial criteria receipt | `22 passed`、9 verdict の現行 digest・scenario・証拠参照を受領 |
| Dev Graph 全テスト | `730 passed, 2 skipped` |

共有 behavior closure（挙動を決めるファイル集合）の変更で stale になった9件は、
過去 verdict の digest を編集せず、各 skill を fresh tmux session で再実行した。
途中で検出した C04 architecture lineage 欠落と C19 の tmux stale environment 混入は
実装・fixture を修正して再試験し、失敗 run も append-only の反証証拠として保持した。
最終9件は外部 evaluator が `blockers=[]` の PASS と判定している。

## 500 行超ファイルの確認

今回変更した手書きのコードと文書はすべて500行以下である。500行を超える変更対象は
次の機械可読な正本だけで、責務単位の分割対象外と判断した。

- `.dev-graph/state/graph.json`: graph 全体を原子的に検証・digest 計算する正本
- `system-spec/spec-state.json`: transition writer が単一状態として更新する正本
- `plugins/dev-graph/schemas/graph-node.schema.json`: `$ref` で内部分割済みの単一 schema 正本
- `eval-log/dev-graph/**/live-trial/` の transcript / pane / audit JSON:
  実行時刻順と SHA-256 に束縛された機械取得の append-only 証拠であり、分割や再整形を
  行うと verdict の完全性を失うため、`eval-log/README.md` の live-trial 証拠例外を適用

これらを物理分割すると既存 writer、schema validator、digest 契約を同時に変更する
別スコープの移行になる。今回追加した手書きロジックを分離して隠すのではなく、
正本形式を維持することを優先した。

repository の文書ゲートはさらに厳しい300行上限を持つ。main 取込後に319行となった
`architecture/harness-hub-dev-workflow.md` は、architecture 側を契約要約と本書への参照に
圧縮し、詳細責務を本書へ分離した結果、300行へ収束した。

## main 再同期

`origin/main` を local `main` の `02947ebc7532c099da636a88f936874371b326f6`
へ同期した後、local `main` を本ブランチへ merge した。同時進行の変更が
`qa-097`〜`qa-101` / `appr-016`〜`appr-018` を使用していたため、その履歴を保持し、
本変更を次の空き ID `qa-102` / `appr-019` へ正規 transition writer で再適用した。

graph、architecture、feature、spec、system-spec の競合は main 側の新規契約を基準に
解消し、C02 の document 移行、本文保持、completion evidence を正規 writer で
再登録した。compiler が扱わない main の横断追補（qa-100）と実装反映注記
（HarnessHub-ory6 / 35ai / ml57）も意味的競合として検出し、欠落させず保持した。
競合解消後に品質ゲートを再実行している。

## 受領判断

開発ワークフロー仕様への影響を正規フローで反映済みであり、製品ランタイムへの影響は
ない。対象 task の受入条件は満たす。共有 closure の stale 証跡は9件すべて再取得し、
C19 の session 環境混入も caller 値の明示上書きと正規 aggregate gate で解消した。
