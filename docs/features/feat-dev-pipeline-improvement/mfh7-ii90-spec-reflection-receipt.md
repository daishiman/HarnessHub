---
status: confirmed
layer: feature-operations
beads_ids:
  - HarnessHub-mfh7
  - HarnessHub-ii90
  - HarnessHub-eshr
  - HarnessHub-ojh6
  - HarnessHub-31k5
  - HarnessHub-w7n7
dev_graph_node_id: issue-bd-external-ref-orphan-nodes-20260725
feature_node_id: feat-dev-pipeline-improvement
spec_impact: none
reviewed_at: 2026-07-28
---

# bd external_ref orphan 解消の仕様反映受領書

## 1. 受領対象

`HarnessHub-mfh7` は bd issue の `external_ref: dev-graph:<id>` が graph に実体を持たない
orphan 参照を棚卸しし、流入経路 (P1: `--op create` の node 実在未検証) を fail-closed 化した。
派生した `HarnessHub-ii90` は削除経路 (P2: graph node の GC 削除が bd へ伝播しない) を
`--op removal-preflight` で塞いだ。棚卸し中に見つかった副次課題として、系統 C 20 件の
個別処分 (`HarnessHub-eshr`、closed 済み)、C14 live-trial 監査の恒真式解消
(`HarnessHub-ojh6`、closed 済み)、他 scenario への同型棚卸し (`HarnessHub-31k5`、open で
別途対応) がある。

- Beads ID: `HarnessHub-mfh7`, `HarnessHub-ii90`, `HarnessHub-eshr`, `HarnessHub-ojh6`, `HarnessHub-31k5`, `HarnessHub-w7n7`
- dev-graph node ID (親): `issue-bd-external-ref-orphan-nodes-20260725`
- 対象 feature node: `feat-dev-pipeline-improvement` (`bd-bridge.py` は本 feature の
  choke-point 契約下にあるスクリプトだが、mfh7/ii90 自体は `parent_feature: null` の
  スタンドアロン issue node)

## 2. 仕様・設計影響の判定

判定は **none（今回の差分による新しい仕様・設計影響なし）**。

`system-spec/dev-workflow.md`・`system-spec/maintenance-ops.md`・
`docs/plugin-contracts/` を grep 調査した結果、`bd-bridge.py` が「beads mutation の
唯一の choke-point である」という契約自体への言及はあるが、orphan 判定・C28 parity・
`removal-preflight` という個別契約の具体粒度までは踏み込んでいない。今回追加した
`--op orphan-audit` / `--op removal-preflight` と `--op create` の実在検証は、
**既存の choke-point 契約の内部実装** であり、新しい利用者要件・外部 API・データ構造・
セキュリティ境界・配備方式を追加しない。

`.dev-graph/state/graph.json` の差分は、他 ref にのみ存在していた node や
`issues/*.md` 実体はあるが未登録だった node を C02 `upsert-node.py` で正規に復元した
ものであり、graph schema や node 構造そのものは変えていない。

## 3. 確認した正本と設計

| 層 | 確認結果 |
|---|---|
| `system-spec/` | choke-point・単一 writer の既存契約に変更なし。新要件なし |
| `specs/` | Harness Hub 製品の外部契約に変更なし |
| `architecture/` | component・責務境界・データフロー・配備構成に変更なし |
| `features/` | `feat-dev-pipeline-improvement` の purpose/goal/scope に変更なし (bd-bridge の運用手順追記のみ) |
| `tasks/` | 手編集なし。P01〜P13 の task spec に影響する変更を含まない |
| `docs/` | `docs/features/feat-dev-pipeline-improvement/operations.md` §6 に運用手順を追記、本受領書を追加 |

`system-spec/` や `architecture/` を実装状態の写しで更新すると、確定要件と実行状態の
二重正本を作るため編集しない。今回の変更は運用スクリプトの内部ゲート追加であり、
choke-point の外部契約 (「beads mutation は bd-bridge.py 経由のみ」) を変えていない。

## 4. 正規フローによる反映

凍結済み task を手編集せず、次の経路で反映した。

1. `bd-bridge.py` へ `_require_registered_nodes` (P1) / `_removal_preflight` (P2) /
   `_orphan_audit` を追加し、決定論テスト
   (`test_bd_bridge_orphan_external_ref.py`, `test_bd_bridge_node_removal_preflight.py`,
   既存 passthrough/projection テストへの fixture 追随) を先に固定した
2. 発見した 24 件の orphan 由来 node は、すべて `issues/sys-*.md` を書き起こし
   C02 `upsert-node.py` の dry-run → apply で graph へ復元した (各 node の判断理由は
   `issues/sys-bd-external-ref-orphan-nodes-20260725.md` と
   `issues/sys-orphan-external-ref-backlog-disposition-20260726.md` に記録)
3. `docs/features/feat-dev-pipeline-improvement/operations.md` に運用手順 (§6) を追記し、
   本受領書で仕様影響判定を記録した
4. bd 側は `bd-bridge.py --op update --append-notes` で最終レビュー結果を記録する

## 5. 品質と文書分割

`issues/sys-bd-external-ref-orphan-nodes-20260725.md` はユーザー指定の 500 行上限を
超過 (533 行) している。分割にはグラフ authority の再登録 (C02 再 upsert) を伴い、
かつ本 issue の調査ログは単一の時系列フォレンジック記録であるため分割の自然な境界が
なく、`plugins/dev-graph/scripts/bd-bridge.py` (1124 行、同じく上限超過) と合わせて
今回は分割せず、是正専用の follow-up bd issue を起票した (`HarnessHub-w7n7`、
`issues/sys-doc-line-limit-followup-mfh7-20260728.md`)。理由は
[[HarnessHub-2mor]] (500 行分割が harness coverage の分母を希釈し ratchet を回帰させる
既知の懸念) と同種のリスクを、共有インフラである `bd-bridge.py` および graph authority
下の issue 本文に対して急いで適用すると、テスト coverage や node body の整合を壊しうる
ため。手書き Markdown で 300 行のリポジトリ独自 lint
(`scripts/lint-doc-line-limit.py`) が対象とするのは `system-spec/architecture/features/
tasks/docs` の 5 root のみで `issues/` と `*.py` は対象外であり、CI ゲート上は本 PR の
ブロッカーではない。

## 6. 残課題

- `HarnessHub-31k5`: `HarnessHub-ojh6` で解消した live-trial 恒真観測と同型の欠陥が
  C02/C05/C19 の 3 scenario に残っている。scope_out で本変更からは独立させた
- 500 行超過の是正 (`bd-bridge.py` の責務分割、`issues/sys-bd-external-ref-orphan-nodes-
  20260725.md` の分割) を follow-up issue へ切り出した
- `HarnessHub-mfh7` / `HarnessHub-ii90` は Claude Code の使用上限 (2026-07-31 17:00
  Asia/Tokyo に reset) により C02/C03/C14/C15 の live-trial fresh 再取得が未完了のため、
  実装は完了・決定論テストは PASS だが `in_progress` を維持する

## 7. 第 2 ラウンド (2026-07-28) — 逆方向の全数検査と ratchet 空化

第 1 ラウンド (§1〜§6) は choke-point 側で「これから書く操作」を止めるゲートだった。本
ラウンドは **既に宙に浮いた参照の全数検査**を追加し、あわせて `origin/main` を取り込んだ。

### 7.1 追加した変更

| 変更 | 内容 |
|---|---|
| `plugins/dev-graph/lib/orphan_external_ref.py` (新規) | bd export 起点で graph を引く検査ロジック。OE-001 (true_orphan) / OE-002 (node_restorable) を判定し、`closed_residue` / `merge_pending` は違反にせず可視化する |
| `plugins/dev-graph/scripts/lint-orphan-external-ref.py` (新規) | 上記の CLI。argv 解釈・JSON 出力・exit code のみ |
| `scripts/dev-graph-orphan-baseline.json` (新規) | shrink-only ratchet の repo 側データ。qa-070 境界により plugins/ の外に置く |
| `Makefile` | `orphan-external-ref` ターゲット追加 (ローカル専用。`lint` / `test` には束ねない) |
| `build-parity-manifest.py` / `bd-bridge.py` | manifest に `graph_node_ids[]` を追加 (schema 1.0→1.1) し、C28 の unmapped 理由を `graph_node_missing` (C02 案件) と `parity_manifest_missing` (C03 案件) へ分離 |
| `references/execution-tracker-contract.md` | §10 に上記 2 分類と、逆方向検査が必要な理由・baseline の置き場を追記 |
| `issues/sys-schedule-blocked-exclusion-unreported-20260728.md` (新規) | 棚卸し中に見つかった follow-up (C02 登録済み) |

### 7.2 仕様・設計影響の判定

判定は引き続き **none**。根拠は §2 に加えて `docs/shared-layers.md` §3 の明文規約である。

> メタ層のゲート (配置規約 lint・skill description lint・live-trial 証跡の検査など) を
> qa-038 の 8 種へ数え入れないこと。(中略) 両者はゲートの数を互いに増減させない独立系統で
> あり、**片方の変更はもう片方の仕様反映を要さない**。

`make orphan-external-ref` は `plugins/dev-graph/` を対象とするメタ層ゲートなので、
プロダクト層の登録簿 (G1〜G13)・`system-spec/spec-state.json` qa-038【2】・
`architecture/` の改訂を要さない。**むしろ登録簿へ足すことが上記規約に反する。**
`system-spec/dev-workflow.md` には品質ゲートの列挙自体が無く (grep 0 件)、影響しない。

parity manifest の `schema_version` 1.0→1.1 は dev-graph 内部契約であり、正本の
`references/execution-tracker-contract.md` §10 を同一 PR で改訂済み。消費側 (C28) は
`schema_version` を検査せず `graph_node_ids` の有無で fail-closed するため、旧 manifest は
再生成で回復する (manifest は git 追跡しない揮発 snapshot)。

### 7.3 ratchet を空へ縮小した

`origin/main` 統合後の実測で、baseline 6 行の全件が canonical graph の実在 node を指す
ようになり `resolved_baseline_entries[]` へ移行した。ratchet は縮小のみ許可のため 6 行とも
削除し、**`baselined_external_refs` は空**になった。免除ゼロであり、以後は orphan 1 件でも
violation として止まる。削除の経緯はデータ側の `_comment` に記録した。

### 7.4 500 行分割 (§5 の follow-up を一部実施)

新設した `lint-orphan-external-ref.py` が 537 行に達したため、`lint-live-trial-task-contract.py`
の先例 (lib docstring に「500 行上限と単一責務を維持する」と明記) に倣って分離した。

| ファイル | 行数 | 責務 |
|---|---|---|
| `lib/orphan_external_ref.py` | 474 | 入力解決・突合・分類 |
| `scripts/lint-orphan-external-ref.py` | 100 | CLI |
| `tests/conftest.py` | 118 | 疑似 repo 構築の共有 fixture |
| `tests/test_lint_orphan_external_ref.py` | 358 | 検査ロジックの不変条件 |
| `tests/test_lint_orphan_external_ref_cli.py` | 123 | CLI 契約・repo データ契約・配線 |

`bd-bridge.py` (1124 行) と `issues/sys-bd-external-ref-orphan-nodes-20260725.md` (533 行) の
分割は §5 の理由 (共有インフラの分割は coverage 分母と node body 整合を壊しうる) により
`HarnessHub-w7n7` へ据え置く。既存の 500 行超テスト 6 本は本変更の対象外のため触っていない。

### 7.5 検証結果

| ゲート | 結果 |
|---|---|
| `make orphan-external-ref` | exit 0 (violations 0 / baselined 0 / resolved 0 / closed_residue 13) |
| `make lint` | exit 0 |
| `make plugin-package-check` | exit 0 (advisory 21 件は PKG-002/004 の未採用標準) |
| `pytest plugins/dev-graph/tests/` | 671 passed / 2 skipped / **4 failed** |

4 件の failure は C02/C03/C14/C15 の live-trial verdict が持つ behavior closure digest の
stale で、**本変更が原因ではない**。作業ツリーの変更を含まない HEAD (`ca28434`) を独立
worktree へ切り出して実行し、同一の 4 件が同じ理由で失敗することを確認した。ただし 4 skill は
いずれも `script_refs` に `bd-bridge.py` を宣言しており、本変更はこの digest をさらにずらす。
解消には live-trial の再実行が要る (`HarnessHub-1wo3`)。

### 7.6 本ラウンドの残課題

- `HarnessHub-1wo3` (`issue-cross-plugin-behavior-closure-staleness-20260728`): 上記 4 件の
  stale digest。node は他 branch にのみ実在するため本 lint では `merge_pending` と判定される。
  **本 branch では graph へ登録しない** (重複登録は graph.json のマージ衝突を招く)
- `HarnessHub-31k5` / `HarnessHub-w7n7`: §6 から継続
