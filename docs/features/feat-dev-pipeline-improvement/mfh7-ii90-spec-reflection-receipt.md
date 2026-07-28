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
