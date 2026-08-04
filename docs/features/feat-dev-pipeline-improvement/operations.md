---
status: confirmed
layer: feature-operations
task: SYS-DEV-PIPELINE-IMPROVEMENT-P12
parent_feature: feat-dev-pipeline-improvement
---

# feat-dev-pipeline-improvement 運用手順 (P12)

lifecycle close-loop と陳腐化文書の棚卸し GC を `sync` verb 運用へ組み込む手順。

## 1. close-loop (3 表現同時クローズ)

解決済み事象を md / graph node / beads の 3 表現で閉じる。choke-point (`bd-bridge`) と単一 writer (`upsert-node`) を迂回しない。

```bash
# 1) beads を閉じる (choke-point。bd close を直呼びしない)
python3 plugins/dev-graph/scripts/bd-bridge.py --op close --repo-root . \
  --bd-issue-id <BD-ID> --reason "<完了根拠>"

# 2) graph node と md を単一 writer で done へ収束 (patch は repo 内へ置く)
#    completion_evidence.policy は github.enabled=false の運用では manual を使う
#    (linked_pr_merged_all は PR merge 証跡を schema が強制するため)
python3 plugins/dev-graph/scripts/upsert-node.py --repo-root . \
  --input eval-log/dev-graph/pipeline-improvement/<node>-close.json

# 3) 残置解消を検査 (exit 0 で close-loop 完了)
# Dolt DB の live 状態を bd export 経由で自動取得する
python3 plugins/dev-graph/scripts/lint-open-residue.py --repo-root .
```

## 2. 棚卸し GC (sync 運用に毎回組込み)

`sync` verb 実行時に以下を候補提示する。**自動削除しない** (`digest-immutability` の削除を機械に委ねない)。

| 対象 | 抽出 | 処置 |
|---|---|---|
| 解決済み open 残置 | `lint-open-residue.py` の `OR-003` 違反 | §1 の close-loop |
| 未消化 handoff | `lint-handoff-disposition.py` の違反 (findings/improvements/clusters) | disposition 付与または beads 起票 |
| 参照消滅の凍結 eval-log | `lint-eval-log-layout.py` の `resolved_allowlist_entries` | `_FROZEN_RESIDUE` から該当行を削除 |
| 既知残置 baseline | `lint-open-residue.py` の `resolved_baseline_entries` | `_BASELINE_RESIDUE` から該当行を削除 |

いずれの ratchet リストも **shrink-only** であり、追記は規約再設計を要する。

## 3. CI ゲート

`.github/workflows/dev-pipeline-lint.yml` が push/PR で 3 lint を fail-closed 実行し、`migrate-pipeline-improvement.py --dry-run` の差分 0 収束を検証する。CI checkout は Dolt DB を持たないため open-residue の OR-001/OR-002 を `--no-require-beads` で強制し、Beads 軸の未評価を JSON に残す。ローカル gate は option 無しで live `bd export` を必須化する。`.beads/issues.jsonl` は受動エクスポートであり正本として使わない。

## 4. P13 の仕様書・アーキテクチャ書き戻し

P13 は qa-071 を実装する `system-task-goal-seek/v1` に従い、実行結果・判断・改善点を `system-spec/dev-workflow.md` と `architecture/harness-hub-dev-workflow.md` へ writer/正規生成経路で反映する。rubric verdict が PASS になる前、または commit/push/PR が未実行の時点では release receipt と epic を完了扱いにしない。

## 5. qa-071 の意味被覆は C12 で機械強制される (2026-07-25 以降)

本 feature の frontmatter `tags` にある `qa-071` は、2026-07-25 の契約 version 1.2.0 以降 **宣言だけでは被覆と見なされない**。plan を再生成するときは、確定 QA の内容が goal-spec の `purpose` / `goal` / `scope_in` / `scope_out` / `acceptance` と exact-13 task spec の全件に降りている必要がある。

手順と違反 code (`qa-ref-unregistered` / `qa-semantic-coverage` / `qa-task-trace` / `qa-tags-unparsable`) の正本は `plugins/system-dev-planner/references/feature-execution-package-contract.md` §2.5 で、判定経緯は [docs/plugin-contracts/system-dev-planner-qa-semantic-coverage.md](../../plugin-contracts/system-dev-planner-qa-semantic-coverage.md) に記録した。ここに手順を複写しない (正本が 2 つになる)。

**`tasks/feat-dev-pipeline-improvement/*.md` は手編集しない。** qa-071 の本文伝播は `HarnessHub-8wo` で契約 1.2.0 下の再 plan として完了し、現行 generation は `af8a73df…` である。旧 `9be3809d…` generation は superseded として byte-for-byte 保全する。今後も本文変更は再 plan → promote → C02 再登録で行い、投影だけを書き換えて `published_digest` との束縛を壊さない。

## 6. bd external_ref の orphan 監査と node 削除の fail-closed preflight (2026-07-28 以降)

`HarnessHub-mfh7` / `HarnessHub-ii90` で、C28 choke-point に「作るとき」「消すとき」双方の
参照整合ゲートを追加した。いずれも `plugins/dev-graph/scripts/bd-bridge.py` 経由でのみ実行する。

### 6.1 orphan 棚卸し (`--op orphan-audit`)

`bd list --status all` の全件を走査し、`external_ref: dev-graph:<id>` が canonical graph に
実体を持たない参照を closed も含め全件返す。日常運用では棚卸しのみに使い、書込は行わない。

```bash
python3 plugins/dev-graph/scripts/bd-bridge.py --op orphan-audit --repo-root .

# 未マージブランチの graph にだけ node が実在する系統 (merge_pending) も判定する場合
python3 plugins/dev-graph/scripts/bd-bridge.py --op orphan-audit --repo-root . --scan-refs
```

`disposition` は `restore_node` (spec 実体があるのに graph 未登録 → C02 `upsert-node.py` で復元)
と `repoint_or_close` (実体も無い → 中身を読んで人が判断) の exact-set。`--scan-refs` を付けると
これに `merge_pending` (他 ref に node が実在。マージ待ちなので触らない) が加わる。

### 6.2 create 時の実在検証 (P1、`--op create` に組込み済み)

`--op create` は書込前に `--graph-node-id` の実在を canonical graph (`.dev-graph/config.json` の
`local_state.graph`) に対して検証する。未登録なら `ContractError` で拒否し、
「C02 `upsert-node.py` で先に node を登録せよ」と次の一手を返す。feature package 投影
(epic + 13 task) は all-or-nothing で、1 件でも未登録なら書込を始めない。

### 6.3 node 削除の preflight (P2、`--op removal-preflight`)

graph からの物理 node 削除は、sanctioned writer (`upsert-node.py` / `register-package.py` /
`sync-graph.py` / `reconcile-github-lifecycle.py` / `build-graph-store.py`) のいずれも持たない。
唯一の物理削除経路は Git 差分として持ち込まれる手動 GC であり、本 op はその前後の
before/after graph と共有 Beads DB を書込なしで突合する。

```bash
python3 plugins/dev-graph/scripts/bd-bridge.py \
  --op removal-preflight --repo-root . --before-ref HEAD \
  [--after-graph <path> | --after-ref <ref>] \
  [--disposition-manifest <path>]
```

物理削除される node ごとに disposition manifest での指定を必須とする。exact-set:

| disposition | 意味 | preflight が確認する実状態 |
|---|---|---|
| `cancel_deletion` | node を残して削除を中止 | after graph に node が戻っていること |
| `close_issue_first` | 人が内容を確認して bd 側を先に終了 | 宣言した `bd_issue_ids` が実参照と exact match し全件 `closed` |
| `detach_external_ref_first` | graph 管理外と判断し参照を先に外す | 当該 node への Beads external_ref が 0 件 |

bridge 自身は bd issue の close も external_ref の剥離も行わない。manifest は人の判断を記録する
だけで、Beads の現在状態が選択どおり収束していない限り通らない。非クローズ orphan が
before より 1 件でも増えれば disposition の指定内容とは無関係に拒否し、`exit 2 / write_count=0`
で停止する。詳細な契約 (7 項目) は `plugins/dev-graph/tests/test_bd_bridge_orphan_external_ref.py`
と `test_bd_bridge_node_removal_preflight.py` に、発見経緯と実測は
`issues/sys-bd-external-ref-orphan-nodes-20260725.md` と
`issues/sys-devgraph-graph-gc-bd-close-propagation-20260726.md` に記録している。

### 6.4 逆方向の全数検査 (`make orphan-external-ref`)

6.1〜6.3 は choke-point 側のゲートで、いずれも **これから書く操作**を止める。既に宙に浮いた
参照は止められないため、残置の全数検査を独立した品質ゲートとして持つ。

```bash
make orphan-external-ref
```

dev-graph の同期系 (`sync-graph.py::_plan` / `lint-open-residue.py::lint` /
`build-parity-manifest.py::_entries`) は例外なく graph の `nodes[]` を起点に走る。したがって
**node が graph から消えた瞬間、その node を指す bd issue は全ての検査の視界から同時に外れる**。
本 lint だけが bd export を起点に graph を引くため、この盲点を塞ぐ唯一の検査になる。

6.1 の `--op orphan-audit` との違いは役割である。`orphan-audit` は choke-point 内蔵の棚卸し
(「今どうなっているか」を見る道具) で exit code による遮断をしない。本 lint は Makefile の
品質ゲートとして **非クローズの残置を exit 2 で遮断する** (「悪化を止める」ゲート)。

| disposition | 意味 | 違反 | 次の一手 |
|---|---|---|---|
| `true_orphan` | graph node も md 実体も無い | OE-001 | bd 側を閉じるか再起票する |
| `node_restorable` | md 実体は repo にある | OE-002 | C02 `upsert-node.py` で graph へ復元する |
| `merge_pending` | 他 ref に node が実在 | — | マージ待ち。触らない |
| `closed_residue` | bd 側が closed 済み | — | 履歴の残骸。件数のみ残す (silent drop 禁止) |

既知の未処分 orphan は `scripts/dev-graph-orphan-baseline.json` の **shrink-only baseline** に
凍結し、新規発生のみを遮断する。**baseline へ行を足して緑化することは禁止**で、これは本 lint の
目的 (orphan を生み続ける経路を塞ぐ) そのものを無効化する。処分が済んだ行は lint 出力の
`resolved_baseline_entries[]` に現れるので削除する (残すと同じ参照が再発しても違反にならない
穴になる)。**2026-07-28 時点で baseline は空** = 免除ゼロであり、以後は 1 件でも fail-closed で
止まる。

baseline が plugins/ の外にあるのは qa-070 の仕組み/ナレッジ境界による。portable な
`plugins/dev-graph/` は repo 固有の node id を抱えられないため、repo 側データとして入力で
受け渡す (`scripts/lint-mechanism-knowledge-boundary.py` が機械強制)。

本 lint は live な bd (Dolt DB) を要求するため **ローカル専用**で、`make lint` / `make test` には
束ねない。`.beads/issues.jsonl` は gitignore 対象で CI に存在せず、CI へ置くと恒久 no-op になる。
契約の正本は `plugins/dev-graph/references/execution-tracker-contract.md` §10。
