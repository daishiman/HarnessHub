---
graph_node_id: "issue-g4-parallel-rpc-timeout-20260725"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","beads","orphan-recovery"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "pnpm -r test の並列実行で vitest worker RPC が timeout し G4 が偽陽性で落ちる"
owners: ["daishiman"]
created_at: "2026-07-25T11:02:02Z"
updated_at: "2026-07-30T13:37:07Z"
status: "active"
depends_on: []
related_nodes: ["issue-bd-external-ref-orphan-nodes-20260725","issue-orphan-external-ref-backlog-disposition-20260726"]
resource_scope: ["pnpm-workspace.yaml","scripts/ci/check-pnpm-only.mjs","apps/hub/tests/ci/pnpm-only.test.ts","docs/shared-layers.md","docs/features/feat-hub-foundation/architecture-decision-record.md","docs/features/feat-hub-foundation/test-design.md","docs/features/feat-hub-foundation/g4-workspace-test-concurrency-spec-reflection-receipt.md","features/feat-hub-foundation.md","system-spec/dev-workflow.md","specs/harness-hub-system-specification.md","architecture/harness-hub-dev-workflow.md","tasks/feat-hub-foundation/sys-hub-foundation-p04.md","issues/sys-g4-parallel-rpc-timeout-20260725.md"]
purpose: "G4 の CI/local 共通入口を維持しつつ package 間の Vitest worker pool 競合を除き、test assertion と無関係な RPC timeout 偽陽性を防ぐ"
goal: "pnpm -r test が複数回安定して完走し、workspace 直列化設定の欠落・値変更を品質ゲートが fail-closed に拒否する状態"
mvp_alignment: null
scope_in: ["pnpm workspace 間直列化","設定 drift の正負テスト","G4 設計・仕様反映","Beads と Dev Graph の完了同期"]
scope_out: ["package 内の Vitest 並列性変更","個別 test timeout の緩和","製品 API・DB schema・認証認可・UI・deploy unit の変更"]
acceptance: ["workspaceConcurrency: 1 で package 間を直列化し、pnpm -r test の exit code が test 内容を反映する","pnpm -r test を複数回実行し、全 package の完走と worker RPC timeout 非再現を確認する","設定欠落・1 以外を専用負例が非ゼロ終了で拒否し、C02 writer・品質ゲート・仕様反映受領を通す"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-g4-parallel-rpc-timeout-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"e79a3416bcc35b3a1f649fe2051d3a97e93344b419d7228403c10a0164893dd1","evaluator":"codex-final-review + merge-reconciliation","evidence_ref":"docs/features/feat-hub-foundation/g4-workspace-test-concurrency-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-07-28T00:24:44.678Z","origin_kind":"generated","source_digest":"b817beb8db8fd1c31c0e58087e6ed48a0bdf8e3c5a102f85c11ca72857f94422","source_path":"issues/sys-orphan-external-ref-backlog-disposition-20260726.md#HarnessHub-pyb3","source_plugin":"dev-graph","source_version":null}
classification_confidence: 1
classification_reason: "2026-07-28 orphan 再棚卸しで HarnessHub-pyb3 の本文と notes を確認し、未解決で実作業を持つため参照剥がし・close ではなく node 復元と判断"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-g4-parallel-rpc-timeout-20260725.md","confidence":1}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-pyb3","linked_at":"2026-07-28T00:24:44.678Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":["docs/features/feat-hub-foundation/g4-workspace-test-concurrency-spec-reflection-receipt.md"],"policy":"manual","reconciled_at":"2026-07-30T13:37:07Z","source":"manual","status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-28T00:24:44.678Z","missing_sections":[],"status":"complete"}
---

# 概要

pnpm -r test の並列実行で vitest worker RPC が timeout し G4 が偽陽性で落ちる

## 背景と問題

Beads の未解決 issue `HarnessHub-pyb3` は `dev-graph:issue-g4-parallel-rpc-timeout-20260725` を参照しているが、
canonical graph に node が無く、課題本文が ready/parity の対象から外れていた。
課題自体は未解決で内容も有効なため、参照を剥がしたり close したりせず node として復元する。

### Beads に記録された内容

pnpm -r test (既定の並列度) で packages/schemas が 'Error: [vitest-worker]: Timeout calling onTaskUpdate' を unhandled error として出し、86 tests 全通過にもかかわらず exit 1 になる。--workspace-concurrency=1 では 6 パッケージ 648 tests が exit 0 で完走するため、テスト内容の欠陥ではなくマシン飽和による worker-main RPC の heartbeat timeout。

観測値: src/contract-drift-gate.test.ts が単体 17s に対し並列下では 65.7s。同テストは子プロセスを spawn する実効性検査で、他パッケージの spawn 系テスト (packages/db の CLI round-trip、apps/hub の CI ゲート検査) と競合する。

CI の ubuntu-latest でも同じ条件が揃えば G4 が内容と無関係に落ちうる。落ちたときに『テストが壊れた』と読めてしまうのが本当の害で、fail-closed ゲートの信頼性を損なう。

受け入れ条件:
- 並列実行でも exit code が内容を正しく反映する (workspace-concurrency の固定、vitest の pool/RPC timeout 設定、または spawn 系テストの直列化のいずれか)
- 是正後に pnpm -r test を既定並列度で複数回まわし、再現しないことを確認する

### Beads notes

追加 notes は未記録。

## 現在の挙動

canonical graph と Beads の参照は復旧済みだが、`pnpm -r test` は package を既定で
並列実行する。各 package が独自の Vitest worker pool と child process を起動するため、
マシン飽和時に assertion 全成功後の `onTaskUpdate` RPC が timeout し、G4 が exit 1 になる。

## 期待する挙動

CI / local の共通入口 `pnpm -r test` を変えず、package 間の同時実行だけを止める。
個々の test failure は従来どおり exit 1、全 test success は exit 0 になり、設定の欠落や
値変更は品質ゲート自身が fail-closed に検出する。

## 再現手順またはユースケース

1. `pnpm config get workspace-concurrency` が `1` を返すことを確認する。
2. `pnpm check:pnpm` で実 repository 設定が通ることを確認する。
3. `pnpm --filter @harness-hub/hub exec vitest run tests/ci/pnpm-only.test.ts --coverage=false`
   で設定欠落・`1` 以外の負例が非ゼロ終了になることを確認する。
4. `pnpm -r test` を複数回実行し、全 package が exit 0 で完走することを確認する。

## 影響と優先度

- 影響範囲: repository の G4 test 実行順序と品質ゲート。製品 runtime には影響しない
- 深刻度: medium
- 緊急度: 内容と無関係な CI failure を防ぎ、G4 の判定への信頼を回復する必要がある

## スコープ

- In: pnpm workspace 間直列化、設定 drift の正負テスト、G4 設計・仕様反映、Beads 更新
- Out: package 内の Vitest 並列性変更、個別 test timeout の緩和、製品 API・DB・UI の変更

## 関連グラフ

- 原因/親ノード: `issue-bd-external-ref-orphan-nodes-20260725`
- 関連仕様: `issue-orphan-external-ref-backlog-disposition-20260726`
- 関連アーキテクチャ: `arch-harness-hub-dev-workflow`
- 解決タスク: `issue-g4-parallel-rpc-timeout-20260725`

## 受入条件

- [x] `workspaceConcurrency: 1` で package 間を直列化し、exit code が test 内容を反映する
- [x] `pnpm -r test` を 3 回実行し、全 package の完走と RPC timeout 非再現を確認する
- [x] C02 writer の frontmatter/schema 検証、最終品質ゲート、仕様反映受領を通す

## 検証証跡

- コマンド/テスト: `pnpm check:pnpm`、HF-A1-CI-004 11/11、`pnpm -r test` 3 回、
  `upsert-node.py --dry-run` / apply、`pnpm verify`
- 仕様反映: `docs/features/feat-hub-foundation/g4-workspace-test-concurrency-spec-reflection-receipt.md`
