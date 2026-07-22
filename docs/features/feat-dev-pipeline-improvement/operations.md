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
python3 plugins/dev-graph/scripts/lint-open-residue.py --repo-root . \
  --beads-export .beads/issues.jsonl
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

`.github/workflows/dev-pipeline-lint.yml` が push/PR で 3 lint を fail-closed 実行し、`migrate-pipeline-improvement.py --dry-run` の差分 0 収束を検証する。`--no-require-beads` の使用は yaml の可視 diff としてのみ許され、握り潰しにはならない。
