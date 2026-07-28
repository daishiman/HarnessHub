---
graph_node_id: "issue-orphan-external-ref-backlog-disposition-20260726"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","beads","parity","governance"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "真の orphan 21 件を node 化または参照剥がしで処分し非クローズ orphan を 0 にする"
owners: ["daishiman"]
created_at: "2026-07-26T00:00:00Z"
updated_at: "2026-07-28T02:18:00Z"
status: "draft"
depends_on: []
related_nodes: ["issue-bd-external-ref-orphan-nodes-20260725"]
resource_scope: [".dev-graph/state/graph.json","plugins/dev-graph/scripts/bd-bridge.py","issues/"]
purpose: "HarnessHub-mfh7 で流入は止めたが在庫 21 件が残る。unmapped_summary.parity_manifest_missing が 26 件常駐したままでは、本物の manifest 取りこぼしが起きても区別できず警告が摩耗し続ける"
goal: "非クローズの orphan external_ref が 0 件になり、parity_manifest_missing が実際の manifest 取りこぼしだけを指す状態"
mvp_alignment: null
scope_in: ["真の orphan 21 件それぞれの中身を読み、node 化 / 参照剥がし / 失効として終了 を個別に判断する","node 化と判断したものは issues/sys-*.md を作成し C02 upsert-node.py で graph へ登録する","graph 管理外と判断したものは external_ref を落とし external_ref_absent 側へ移す","処分後に --op orphan-audit と --op ready --parity-manifest を再実行し期待値との一致を記録する"]
scope_out: ["マージ待ち 9 件 (系統 B) への介入 (当該ブランチのマージで自然解消するため触ると壊す)","closed 済み 49 件の遡及復元","件数を 0 にするためだけの一括で閉じる操作 (バックログ破棄になるため禁止)"]
acceptance: ["再棚卸しで true orphan と判定した全件に処分区分と判断理由が記録されている","--op orphan-audit の orphan_summary.non_closed が系統 B の残数のみになる","unmapped_summary.parity_manifest_missing が再計算した期待値と一致し根拠が記録されている","node 化したものは C02 経由で登録され frontmatter 検証を通っている"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-orphan-external-ref-backlog-disposition-20260726.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-26T00:00:00Z","origin_kind":"generated","source_digest":"43336931b9d84c400dc5782da751ef86682e031b5169643c25778584c065cd86","source_path":"system-spec/dev-workflow.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "HarnessHub-mfh7 の棚卸しで系統 C に分類した 21 件。21 件分の spec 作成という独立した作業量を持ち、mfh7 の resource_scope では完結しないため切り出した"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-orphan-external-ref-backlog-disposition-20260726.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-eshr","linked_at":"2026-07-26T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-26T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

親 issue `issue-bd-external-ref-orphan-nodes-20260725` (HarnessHub-mfh7) で
orphan の**流入**は止めた (C28 `--op create` に graph node 実在の fail-closed ゲートを追加)。
しかし棚卸し時点の**在庫 21 件**は残っており、本 issue がその処分を担当する。

## 対象 (2026-07-26 実測・系統 C = 真の orphan)

どの ref (`refs/heads` + `refs/remotes`) の `graph.json` にも `issues/*.md` にも実体が無い 21 件。
すべて `issue-*-2026MMDD` 形式の単発 issue、起票日 2026-07-21〜07-26、status は全件 `open`。

| bd issue | graph_node_id |
|---|---|
| `HarnessHub-vns9` | `issue-actions-secrets-provisioning-evidence-20260725` |
| `HarnessHub-4d8` | `issue-aggregate-completeness-file-split-20260722` |
| `HarnessHub-mr3c` | `issue-auth-501-doc-refresh-20260726` |
| `HarnessHub-6ib` | `issue-completeness-report-session-id-migration-20260723` |
| `HarnessHub-rzc` | `issue-contract-s10-unmappable-status-overstated-20260722` |
| `HarnessHub-mb7c` | `issue-db-write-gate-sweep-20260726` |
| `HarnessHub-ifo` | `issue-devgraph-decompose-inline-dag-check-20260721` |
| `HarnessHub-pyb3` | `issue-g4-parallel-rpc-timeout-20260725` |
| `HarnessHub-5u5k` | `issue-governance-notion-steps-always-skipped-20260725` |
| `HarnessHub-7dw` | `issue-guard-hook-block-latency-20260721` |
| `HarnessHub-zrn` | `issue-harness-creator-entry-points-under-declared-20260721` |
| `HarnessHub-njkm` | `issue-libsql-connection-recovery-20260726` |
| `HarnessHub-kkqq` | `issue-make-lint-ci-skill-description-parity-20260726` |
| `HarnessHub-936` | `issue-pkg-contract-skill-dependencies-undefined-20260721` |
| `HarnessHub-v22l` | `issue-refresh-race-observability-20260726` |
| `HarnessHub-ldq` | `issue-resource-map-deep-cards-20260722` |
| `HarnessHub-883` | `issue-run-skill-feedback-ref-format-unify-20260722` |
| `HarnessHub-42g` | `issue-shared-layers-registry-baseline-drift-20260724` |
| `HarnessHub-d15` | `issue-spec-state-writer-implicit-contracts-20260721` |
| `HarnessHub-v1yh` | `issue-upsert-node-body-overwrite-20260725` |
| `HarnessHub-x2x9` | `issue-worker-secret-ledger-conflict-20260725` |

## なぜ一括処理してはいけないか

21 件はいずれも中身が生きている P1/P2 バックログである (guard hook のブロック遅延、
CI ゲート未結線、DB write ゲートの掃き出し、libSQL 接続復旧など)。

参照が壊れていることを理由に未解決課題をまとめて終了させるのは、**受入条件の数値を
満たすためにバックログを破棄する Goodhart 型の対処**であり、親 issue の `scope_out`
「silent drop 禁止」と同じ原則に反する。処分は 1 件ずつ中身を読んで決める。

## 処分の選択肢

1. **node 化** — `issues/sys-*.md` を書き起こし C02 `upsert-node.py` で graph へ登録する。
   graph 管理下に戻すべき課題はこちら。
2. **参照剥がし** — graph 管理外の課題と判断した場合、`external_ref` を落とす。
   これにより C28 の `unmapped` では `external_ref_absent` (対処不要) 側へ移る。

## 触ってはいけないもの (系統 B・9 件)

`feat-task-spec-test-strategy` / `SYS-TASK-SPEC-TEST-STRATEGY-P13` /
`issue-qa-log-id-uniqueness-gate-20260726` /
`issue-qa070-qa-log-entry-missing-20260726` /
`issue-task-spec-validate-command-unrunnable-20260725` /
`issue-governance-lint-local-entry-20260725` / `issue-verify-local-gate-parity-20260725` /
`issue-hub-cwv-tbt-over-budget-20260724` / `issue-qa070-lineage-restoration-20260724`

これらは**未マージブランチの `graph.json` に node が実在**する。参照は正しく、
当該ブランチのマージで自然に解消する。介入すると生きている参照を壊す。

## 検証

```bash
python3 plugins/dev-graph/scripts/bd-bridge.py --op orphan-audit --repo-root .
python3 plugins/dev-graph/scripts/build-parity-manifest.py --repo-root . \
  --out eval-log/dev-graph/run-dev-graph-schedule/parity-manifest.json
python3 plugins/dev-graph/scripts/bd-bridge.py --op ready --repo-root . \
  --parity-manifest eval-log/dev-graph/run-dev-graph-schedule/parity-manifest.json
```

処分後、`orphan_summary.non_closed` が系統 B の残数のみになり、
`unmapped_summary.parity_manifest_missing` が再計算した期待値と一致すること。

## 完了記録 (2026-07-28 再棚卸し)

main 取り込み後に `--scan-refs` を再実行した時点では、非クローズ orphan は 19 件だった。
過去の 21 件一覧から 4 件が別作業で解消され、作業中に
`HarnessHub-cjwm` (`issue-live-trial-reap-unscoped-kill-20260728`) が 1 件追加されたため、
この実行で個別判断した true orphan は合計 **18 件**である。

18 件はいずれも Beads の題名・説明・notes を読み、未解決の実作業を持つことを確認した。
したがって全件を `restore_node` とし、参照剥がし・失効 close は 0 件と判断した。

| bd issue | graph_node_id | 処分 | 判断理由 |
|---|---|---|---|
| `HarnessHub-vns9` | `issue-actions-secrets-provisioning-evidence-20260725` | node 復元 | secrets/variables 投入と CI 実証の残作業がある |
| `HarnessHub-4d8` | `issue-aggregate-completeness-file-split-20260722` | node 復元 | 500 行超過分割と live-trial 再取得の残作業がある |
| `HarnessHub-6ib` | `issue-completeness-report-session-id-migration-20260723` | node 復元 | 実 fork による report 再生成が必要 |
| `HarnessHub-rzc` | `issue-contract-s10-unmappable-status-overstated-20260722` | node 復元 | 契約文と安全な receipt 更新手順の修正が残る |
| `HarnessHub-ifo` | `issue-devgraph-decompose-inline-dag-check-20260721` | node 復元 | 検証ロジックの正準 validator 統合が未解決 |
| `HarnessHub-pyb3` | `issue-g4-parallel-rpc-timeout-20260725` | node 復元 | 並列 CI の偽陽性 timeout 是正が未解決 |
| `HarnessHub-5u5k` | `issue-governance-notion-steps-always-skipped-20260725` | node 復元 | Notion gate が常時 skip される fail-open が未解決 |
| `HarnessHub-f84o` | `issue-guard-graph-schema-inline-python-variable-path-20260726` | node 復元 | inline Python の間接 graph 書換検出が未解決 |
| `HarnessHub-kzth` | `issue-guard-script-file-indirection-20260726` | node 復元 | script file 経由の authority 書換遮断が未解決 |
| `HarnessHub-zrn` | `issue-harness-creator-entry-points-under-declared-20260721` | node 復元 | entry point と所有 skill の被覆差が未解決 |
| `HarnessHub-r65n` | `issue-live-trial-verdict-staleness-hook-closure-20260726` | node 復元 | hook 閉包の過大な再試験コスト設計が未解決 |
| `HarnessHub-936` | `issue-pkg-contract-skill-dependencies-undefined-20260721` | node 復元 | package contract schema の未定義 field が残る |
| `HarnessHub-ldq` | `issue-resource-map-deep-cards-20260722` | node 復元 | deep card 不足と表示順の品質改善が残る |
| `HarnessHub-883` | `issue-run-skill-feedback-ref-format-unify-20260722` | node 復元 | repo root 相対参照への統一が残る |
| `HarnessHub-42g` | `issue-shared-layers-registry-baseline-drift-20260724` | node 復元 | requirements baseline の gate 登録簿追随が残る |
| `HarnessHub-d15` | `issue-spec-state-writer-implicit-contracts-20260721` | node 復元 | writer の暗黙挙動と早期停止契約の再設計が残る |
| `HarnessHub-x2x9` | `issue-worker-secret-ledger-conflict-20260725` | node 復元 | Worker secret 台帳と確定セキュリティ設計が矛盾 |
| `HarnessHub-cjwm` | `issue-live-trial-reap-unscoped-kill-20260728` | node 復元 | 並行 live-trial を無条件 kill する reaper 欠陥が実観測された |

全 18 件を C02 `upsert-node.py` で dry-run 後に適用し、graph revision は
**921 → 939**、各適用 receipt は `operation=added` / `write_count=2` だった。
適用後の `orphan-audit --scan-refs` は次の通り。

```text
orphan_summary.non_closed = 2
by_disposition.merge_pending = 2
by_disposition.restore_node = 0
by_disposition.repoint_or_close = 0
```

残る 2 件は `HarnessHub-5rb` と `HarnessHub-cvli` で、どちらも他 ref に node が実在する
`merge_pending` である。本 issue の scope_out に従い、先回り復元・参照剥がし・close は行わない。

parity manifest 再生成後の `unmapped_summary.parity_manifest_missing` は **3 件**。
内訳は上記 merge-pending 2 件と、graph node は実在するが `beads_linkage` を持たない
`HarnessHub-ji8y` 1 件である。したがって true orphan 由来の
`parity_manifest_missing` は **0 件**になり、観測値 3 は再計算した期待値 3 と一致した。

## 最新 main 反映後の増分処分 (2026-07-28)

`origin/main` を `6e03e8f` まで反映すると、`HarnessHub-cvli` は main から node が入り
自然解消した。同時に共有 Beads DB へ新規登録されていた `HarnessHub-ory6`
(`issue-id-uniqueness-gate-generalization-20260728`) が
`repoint_or_close` の非クローズ orphan として 1 件検出された。

`HarnessHub-ory6` の題名・説明を `bd show` で読み、同種の集合化による ID 重複検査漏れを
複数の `validate-*.py` で点検する、具体的な未解決作業を持つことを確認した。
したがって次のように個別処分した。

| bd issue | graph_node_id | 処分 | 判断理由 |
|---|---|---|---|
| `HarnessHub-ory6` | `issue-id-uniqueness-gate-generalization-20260728` | node 復元 | 他 validator の ID 重複 fail-closed 点検という未解決の実作業があり、参照剥がし・close は不適切 |

C02 `upsert-node.py` の dry-run と apply を順に実行し、graph revision は
**942 → 943**、`operation=added / write_count=2` で node と本文を登録した。
これにより今回の累計個別復元は **19 件** (初回 18 件 + 増分 1 件) となった。

最終の `orphan-audit --scan-refs` は
`non_closed=1 / merge_pending=1 / restore_node=0 / repoint_or_close=0`。
残件は `HarnessHub-5rb` のみで、`refs/heads/wip/p73-worktree-snapshot` に node が実在するため
scope_out どおり介入しない。true orphan 在庫は 0 件である。

parity manifest 再生成後は
`external_ref_absent=13 / parity_manifest_missing=2 / conflict_count=3`。
期待値 2 の内訳は merge-pending の `HarnessHub-5rb` と、graph node はあるが
`beads_linkage` が無い `HarnessHub-ji8y` で、観測値と一致した。

### 最終監査中の追加 1 件

共有 Beads DB へ `HarnessHub-7xi9`
(`issue-worktree-main-ref-desync-20260728`) が追加され、一時的に
`repoint_or_close=1` となった。題名・説明・5 つの受入条件を読み、並列 worktree で main ref と
作業ツリーがずれて巻き戻し commit を生む再発防止という有効な未解決作業を確認した。
参照剥がし・close ではなく node 復元と判断し、C02 dry-run 後に
graph revision **950 → 951**、`operation=added / write_count=2` で登録した。
これで累計個別復元は **20 件** (初回 18 + `ory6` + `7xi9`) となった。

再監査後は `graph_node_count=363 / dev_graph_reference_count=393 /
non_closed=1 / merge_pending=1 / restore_node=0 / repoint_or_close=0`。
true orphan は再び 0 件で、残件は `HarnessHub-5rb` だけである。
