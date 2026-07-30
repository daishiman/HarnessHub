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
| 正本仕様 | `system-spec/spec-state.json`、`system-spec/dev-workflow.md` | `qa-097` と `appr-016` で document layer 契約と承認根拠を記録 |
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
| root lint | PASS |
| system-spec coverage / citation / knowledge graph | PASS |
| system-spec harness tests | `529 passed` |
| Dev Graph plugin manifest validation | PASS |
| Dev Graph 全機能テスト（live-trial 証跡検査を除く） | `719 passed, 2 skipped` |
| Dev Graph 全テスト | 機能テストは通過。9 skill の既存 live-trial verdict が変更後 digest に対して stale |

最後の9件は、今回変更した共有スクリプト・内部契約が各 skill の
behavior closure（挙動を決めるファイル集合）に含まれるため、過去の実地試験証跡の
digest が古くなったものである。digest の手編集はせず、対象 task で明示された
scope-out「取得済み live-trial verdict の再取得」に従い、PR の残課題として
`HarnessHub-ntip`、`HarnessHub-r65n`、`HarnessHub-1wo3` に紐づける。

## 500 行超ファイルの確認

今回変更した手書きのコードと文書はすべて500行以下である。500行を超える変更対象は
次の機械可読な正本だけで、責務単位の分割対象外と判断した。

- `.dev-graph/state/graph.json`: graph 全体を原子的に検証・digest 計算する正本
- `system-spec/spec-state.json`: transition writer が単一状態として更新する正本
- `plugins/dev-graph/schemas/graph-node.schema.json`: `$ref` で内部分割済みの単一 schema 正本

これらを物理分割すると既存 writer、schema validator、digest 契約を同時に変更する
別スコープの移行になる。今回追加した手書きロジックを分離して隠すのではなく、
正本形式を維持することを優先した。

repository の文書ゲートはさらに厳しい300行上限を持つ。main 取込後に319行となった
`architecture/harness-hub-dev-workflow.md` は、architecture 側を契約要約と本書への参照に
圧縮し、詳細責務を本書へ分離した結果、300行へ収束した。

## main 再同期

PR 作成直後に `origin/main` が `c122ae4a7876455932fe7787ac85d818ba9c5ed1`
へ更新されたため、local `main` へ fast-forward した後、本ブランチへ merge した。
同時進行していた `HarnessHub-foq6` の workflow 空走査契約が
`qa-096` / `appr-015` を使用していたため、その履歴を保持し、本変更を次の空き ID
`qa-097` / `appr-016` へ正規 transition writer で再適用した。

graph、architecture、feature、spec、system-spec の競合は main 側の新規契約を基準に
解消し、C02 の document 移行、本文保持、completion evidence を正規 writer で
再登録した。競合解消後に品質ゲートを再実行している。

## 受領判断

開発ワークフロー仕様への影響を正規フローで反映済みであり、製品ランタイムへの影響は
ない。対象 task の受入条件は満たす。上記 live-trial 証跡の再取得は、実装不具合では
なく共有 closure の証跡運用課題として既存 Beads で継続管理する。
