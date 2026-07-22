---
graph_node_id: "issue-live-trial-evidence-provenance-20260721"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["live-trial","evidence-integrity","governance"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "live-trial 証跡の digest 単独書き換えを遮断し、参照解決の fail-closed 停止を解消する"
owners: ["daishiman"]
created_at: "2026-07-21T12:00:00Z"
updated_at: "2026-07-21T12:00:00Z"
status: "draft"
depends_on: []
related_nodes: ["issue-live-trial-digest-rewrite-render-status-20260721","issue-behavior-closure-unresolvable-20260721"]
resource_scope: ["scripts/lint-live-trial-verdict.py","plugins/harness-creator/skills/run-skill-live-trial/scripts/live-trial-verdict.py",".github/workflows/governance-check.yml"]
purpose: "再 trial せずに digest だけを現在の closure へ合わせる緑化経路を塞ぎ、あわせて behavior closure の参照解決が plugin 全体を fail-closed 停止させる欠陥を解消する"
goal: "digest 単独書き換えが CI で遮断され、plan-live-trials が dev-graph plugin 全体で正常終了し、既存の live-trial digest が 1 件も変化していない"
scope_in: ["digest 単独書き換えの検出 (git 履歴ベース)","記録 transcript digest と transcript 実体の突合","path を動かす迂回 (証跡削除・run ディレクトリ改名) の遮断","参照解決の repo root 相対対応","CI/Makefile/ローカル CI スクリプトへの配線","回帰テスト"]
scope_out: ["既に main へ入った書き換え済み証跡の是正 (issue-live-trial-digest-rewrite-render-status-20260721 / HarnessHub-j24 / HarnessHub-82j が担当)","digest 計算不能 4 skill の是正 (issue-behavior-closure-unresolvable-20260721)","live-trial の実走"]
acceptance: ["lint-live-trial-verdict.py --check-provenance が実際の書き換え commit (184acbc) を全件検出し、正当な再 trial を誤検出しない","記録 transcript_sha256 と transcript.jsonl 実体の不一致を検出する","transcript 削除・run ディレクトリ改名による履歴束縛の剥がしを検出する","参照解決の修正前後で既存 skill の skill_dir_tree_sha が 1 件も変化しない"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-live-trial-evidence-provenance-20260721.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-21T12:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "HarnessHub-j24 の着手可否を調査する過程で発見した、証跡の完全性機構そのものの欠陥を追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-live-trial-evidence-provenance-20260721.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-dst","linked_at":"2026-07-21T12:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-21T12:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

live-trial の受け入れ証拠は「実走した事実」を担保するはずだが、`verdict.json` の `skill_dir_tree_sha` だけを現在値へ書き換えれば、実走せずに全ての検査を緑にできる状態だった。あわせて behavior closure の参照解決に欠陥があり、`plan-live-trials.py` が plugin 全体で停止していた。

## 背景と問題

スキルの挙動面ファイルを変更すると closure digest が変わり、過去の live-trial verdict は失効する (stale)。正しい対処は再実走だが、`verdict.json` の 1 行を書き換えるだけでも検査は緑になる。

しかも書き換えると次の 3 つが同時に起きる。

1. `lint-live-trial-verdict --all` の stale-sha 検査が通る
2. `test_skill_criteria_evidence.py` の closure 突合が通る
3. `plan-live-trials.py` が `action=reuse (current-pass)` と判定し、**再 trial を計画しなくなる**

結果として「証拠の失効」が「検証済み」に化け、以後そのスキルは変更されても再検証されない。実際に commit `184acbc` で 9 件がこの経路を通っていた (transcript は 1 件も変更されていない)。

## 現在の挙動

```
$ python3 scripts/lint-live-trial-verdict.py --check-provenance 184acbc^
[FAIL] digest provenance: 9 violation(s) since 184acbc^
```

また参照解決では、repo root 相対の ref (`doc/notion-schema/...`) が skill dir 相対にしか解決されず、11 plugin へ symlink 再輸出されている `run-skill-feedback` が解決できないため、`plan-live-trials.py --plugin-dir plugins/dev-graph` が fail-closed 停止していた。

### path を動かす迂回 (最終レビューで実測・同 PR 内で封鎖)

本検査は path 同一性を鍵に履歴を突き合わせるため、path を動かすと束縛が外れる。合成 repo で 2 経路を再現した。

| 迂回 | 素朴な実装での結果 | 原因 |
| --- | --- | --- |
| `transcript.jsonl` を削除し `transcript_sha256` を `null` に | 検出できず | 削除も `git diff` に現れるため「変化した = 再実行した」と誤認 |
| run ディレクトリを `-r3` → `-r4` に改名 | 検出できず | 旧 path の現物が消えて突合対象から外れ、新 path は比較対象なしの新規 run に見える |

`bd remember` に記録された過去の失敗様式 (「write したファイルを rm で消して write_count=0 と宣言」) のとおり、削除による迂回はこの repo で実際に観測されている行動である。

## 期待する挙動

- digest の更新には同じ run の transcript 更新が伴い、伴わない差分は CI で遮断される
- 記録された `transcript_sha256` が transcript 実体と一致する
- 再実行の証拠は「実体が現存し、かつ変化した」という肯定形でのみ認める (削除・`null` 化を証拠に数えない)
- 証跡は append-only とし、既存 run の消失は `evidence-removed` として報告される
- `plan-live-trials.py` が各 plugin 全体で正常終了する
- 上記の修正で既存の digest が 1 件も変化しない

## 再現手順またはユースケース

1. 任意の skill の挙動面ファイルを 1 行変更する
2. 対応する `verdict.json` の `skill_dir_tree_sha` を現在値へ書き換える
3. `pytest` と `lint-live-trial-verdict --all` が緑になり、`plan-live-trials` が `reuse` と判定する

## 影響と優先度

- 影響範囲: live-trial を受け入れ証拠とする全 skill の検証信頼性
- 深刻度: high
- 緊急度: 高 — 壊れた状態が正常な状態と区別できなくなるため、放置期間に比例して「検証済みだが実は未検証」の skill が蓄積する

## スコープ

- In: 検出機構の実装と CI 配線、path を動かす迂回の遮断、参照解決の修正、回帰テスト
- Out: 既に混入した証跡の是正 (別 issue)、digest 計算不能 4 skill の是正 (別 issue)、live-trial の実走
