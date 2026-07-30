---
status: confirmed
layer: feature-spec-reflection
beads_ids:
  - HarnessHub-pyb3
dev_graph_node_id: issue-g4-parallel-rpc-timeout-20260725
feature_node_id: feat-hub-foundation
spec_impact: reflected
reviewed_at: 2026-07-30
---

# G4 workspace test 直列化 仕様反映受領書

## 1. 依頼と目的

`HarnessHub-pyb3` (`issue-g4-parallel-rpc-timeout-20260725`) の最終レビューとして、
`pnpm -r test` の assertion が全件成功しても Vitest worker RPC timeout で exit 1 になる
偽陽性を解消し、CI / local 共通の G4 を安定した判定入口にする。

## 2. 結論

- **開発ワークフローの仕様・設計影響: あり (`reflected`)**。pnpm の再帰 workspace script
  の同時実行数を project 設定で `1` に固定するため、G4 の実行資源設計を正本へ反映した。
- **製品仕様への影響: なし**。製品 API、DB schema、認証認可、UI、Cloudflare deploy unit、
  runtime の振る舞いは変えない。
- **確定済み QA の再回答: 不要**。本変更は qa-038 の G4 と qa-088 / qa-096 の
  CI-local 同値・fail-closed 契約を実装具体化するもので、要件の意味を変更しない。
- **実装と回帰防止: 完了**。`workspaceConcurrency: 1`、設定 drift の正負テスト、
  4 回の全 workspace test、task / system-spec / Dev Graph の品質ゲートを確認した。

## 3. 中学生向けの説明

大勢の人が同時に細い廊下を走ると、全員が正しい答えを出していても、結果を先生へ届ける
途中で混雑して「時間切れ」になることがあります。今までのテストは、その時間切れを
「答えが間違っている」と扱っていました。

そこで、教室ごとのテストを 1 教室ずつ順番に始めるようにしました。1 教室の中では今まで
どおり複数人が同時に動けます。さらに、順番に動かす設定が消されたり変更されたりしたら、
検査がすぐに止めるので、同じ混雑事故が戻りにくくなっています。

## 4. 専門的な説明

複数 workspace がそれぞれ Vitest worker pool と child process を同時に起動すると、
CPU / process 資源の競合により worker-main RPC の `onTaskUpdate` が timeout した。
失敗時も対象 test の 86 assertions は全て成功しており、
`--workspace-concurrency=1` では同一 test set が完走したため、test timeout の緩和ではなく
pnpm project 設定の `workspaceConcurrency: 1` を採用した。

この設定は `test` 専用ではなく `pnpm -r` で動く workspace script 全体に適用される。
そのため typecheck / build も workspace 間では直列になるが、G4 の既定入口
`pnpm -r test` を追加引数なしで安定させることを優先し、この実行時間上の
トレードオフを受容した。各 package 内の Vitest 並列性は変更しない。

`scripts/ci/check-pnpm-only.mjs` は project 設定の欠落と `1` 以外を fail-closed
（異常時は安全側に止める方式）で拒否する。HF-A1-CI-004 は正例、設定ファイル欠落、
値 `2` の負例を検証する。

## 5. 仕様反映の正規フロー

1. `system-spec/dev-workflow.md` に既存 QA を具体化する実装注記を反映した。
2. `specs/harness-hub-system-specification.md` へ製品契約不変と G4 実行契約を反映した。
3. C02 writer の `upsert-node.py --dry-run` と apply を通し、source lineage と
   confirmation evidence を更新した。
4. `architecture/`、`features/`、`tasks/`、`docs/`、`issues/` を同一変更単位で同期した。
5. 各 C02 write 後に schema validator と最終 idempotent dry-run を通し、
   violations 0 / write count 0 を確認した。

反映先:

- `system-spec/dev-workflow.md`
- `specs/harness-hub-system-specification.md`
- `architecture/harness-hub-dev-workflow.md`
- `features/feat-hub-foundation.md`
- `tasks/feat-hub-foundation/sys-hub-foundation-p04.md`
- `docs/shared-layers.md`
- `docs/features/feat-hub-foundation/architecture-decision-record.md`
- `docs/features/feat-hub-foundation/test-design.md`
- `issues/sys-g4-parallel-rpc-timeout-20260725.md`
- `.dev-graph/state/graph.json`

`system-spec/spec-state.json` は変更していない。確定済み QA の回答内容を変えず、
既存契約の実行方法だけを具体化したため、新規 QA や reopen transition は不要と判断した。

## 6. 最終品質ゲート

| ゲート | 結果 |
| --- | --- |
| main 同期 | `origin/main` = local `main` = `d99cd326` を確認し、local `main` を本 branch へ merge |
| 設定検査 | `pnpm config get workspace-concurrency` = `1`、`pnpm check:pnpm` PASS |
| 対象 Vitest | `pnpm-only.test.ts`: 11/11 PASS。設定欠落と値 `2` の負例を含む |
| 全 workspace test | 通常実行、`CI=1`、main 取込前後の `pnpm verify` 内の計 4 回が PASS。各回 6 package / 1310 tests、RPC timeout なし |
| workspace 全体 | main 取込前後の `pnpm verify` がともに exit 0。lint、型検査、build、Worker build、全 test、tenant 分離、secret scan、contract drift、bundle 予算を含む |
| task 仕様 | `feature-package/feat-hub-foundation`: Phase 1-13、violations 0 |
| system-spec | coverage complete、foundation、source citation が全て PASS |
| Dev Graph | schema valid、implementation readiness complete、violations 0 |
| 文書 | artifact placement PASS、300 行 ratchet は 439 文書 PASS |
| patch | `git diff --check` PASS |

## 7. ファイル分割

変更した人間向け文書とコードは全て 500 行以下であり、本変更による分割対象はない。
repository のより厳しい 300 行ゲートも対象 439 文書で PASS した。
`specs/harness-hub-system-specification.md` は 300 行を超えるが、同ゲートの正規管理対象外かつ
500 行以下であるため、今回の実装差分では分割しない。

## 8. 残課題

repository 内の実装・仕様反映・local 検証に残課題はない。draft PR 上の remote CI 結果と
レビュー指摘があれば、その変更単位で追随する。
