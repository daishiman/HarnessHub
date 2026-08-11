---
graph_node_id: "issue-production-publish-smoke-cwd-paths-20260811"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "infrastructure"
tags: ["github-actions","production-smoke","wrangler","path-resolution"]
priority: "high"
start_date: "2026-08-11"
target_date: null
iteration: null
title: "本番 publish smoke の作業ディレクトリ依存パスを修正する"
owners: ["daishiman"]
created_at: "2026-08-11T04:05:00Z"
updated_at: "2026-08-11T04:29:30Z"
status: "closed"
closed_at: "2026-08-11T04:26:24Z"
depends_on: []
related_nodes: ["SYS-HUB-FOUNDATION-P13"]
resource_scope: [".github/workflows/ci.yml",".github/workflows/smoke-fixture-sweeper.yml","apps/hub/scripts/smoke-production-publish-support.ts","apps/hub/tests/publish-pipeline/production-smoke-paths.test.ts","docs/features/feat-hub-foundation/production-publish-smoke-cwd-paths-spec-reflection-receipt.md","issues/production-publish-smoke-cwd-paths-20260811.md",".dev-graph/state/graph.json"]
purpose: "pnpm filter が子プロセスの cwd を Hub package へ変える場合でも、本番 publish smoke が正しい Wrangler 設定と成果物出力先を選べるようにする。"
goal: "GitHub Actions と定期 sweeper が cwd に依存せず R2 取得と回収レポート保存を完走する。"
scope_in: ["Wrangler config の絶対パス化","sweep report の GitHub workspace 絶対パス化","回帰テスト"]
scope_out: ["本番データモデル変更","publish状態遷移変更","既存の無関係な未コミット差分"]
acceptance: ["R2 get が apps/hub/apps/hub/wrangler.jsonc を参照しない","CI と定期 sweeper が repository artifacts 配下へレポートを保存する","focused test と Hub typecheck がPASSする"]
architecture_refs: ["arch-harness-hub-infrastructure-operations-addenda"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/production-publish-smoke-cwd-paths-20260811.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"f47eec9f6fe8c96595a825845da60826f3fcbd94ece61daf1d4a05650651bc4a","evaluator":"GitHub Actions run 31453028279 log inspection","evidence_ref":"docs/features/feat-hub-foundation/production-publish-smoke-cwd-paths-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-11T04:05:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "CIログでpnpm filter後のcwdとrepository相対パスの二重解決を直接確認した。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/production-publish-smoke-cwd-paths-20260811.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-f04p","linked_at":"2026-08-11T04:10:45Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-11T04:26:24Z","evidence_refs":["https://github.com/daishiman/HarnessHub/actions/runs/31457967635","docs/features/feat-hub-foundation/production-publish-smoke-cwd-paths-spec-reflection-receipt.md","apps/hub/tests/publish-pipeline/production-smoke-paths.test.ts"],"policy":"manual","reconciled_at":"2026-08-11T04:26:24Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-08-11T04:05:00Z","missing_sections":[],"status":"complete"}
---

# 概要

GitHub Actions run #419 の本番 publish smoke が、pnpm filter 後の作業ディレクトリを考慮しない相対パスで失敗した。

## 背景と問題

R2取得は `apps/hub/wrangler.jsonc` をHub package cwdから再解決して `apps/hub/apps/hub/wrangler.jsonc` を参照した。回収処理もrepository直下で作成した `artifacts/` ではなくHub package cwdから `artifacts/` を解決した。

## 現在の挙動

- R2 get: Wrangler configの二重pathでENOENT。
- fixture sweep: report出力先の親directory不一致でENOENT。

## 期待する挙動

実行cwdに関係なく、Wrangler configとGitHub Actions artifactをrepository内の正しい絶対pathへ解決する。

## 再現手順またはユースケース

1. repository rootから `pnpm --filter @harness-hub/hub ...` を実行する。
2. pnpmがHub packageをcwdにして子processを起動する。
3. repository相対pathをそのまま渡すと二重pathまたは出力先不一致になる。

## 影響と優先度

本番Workerのdeploy自体は成功するが、post-deploy publish smokeとbest-effort回収が失敗し、hub-ci全体が赤になるため優先度はhigh。

## スコープ

- In: Wrangler config、sweep report、focused regression test。
- Out: publish状態遷移、本番DB schema、未関連のchannel-slot検証差分。

## 関連グラフ

- 関連task: `SYS-HUB-FOUNDATION-P13`
- GitHub Actions: run `31453028279`, job `93661957826`

## 受入条件

- [x] R2 getが実在する`apps/hub/wrangler.jsonc`を絶対pathで使う。
- [x] 2つのworkflowが`$GITHUB_WORKSPACE/artifacts/`へreportを書く。
- [x] focused test、typecheck、workflow lintがPASSする。

## 検証証跡

- GitHub Actions failure: `https://github.com/daishiman/HarnessHub/actions/runs/31453028279/job/93661957826`
- focused Vitest: 16 tests PASS
- Hub typecheck / Biome: PASS
- workflow step guard: 14 workflows / violation 0
- Dev Graph schema: PASS
- branch `hub-ci` run #421: PASS（static gate、build & test）
- production deploy: branchでは設計どおりSKIP。`main`統合後にのみ実R2 smokeを再実行可能
- 仕様非影響受領書: `docs/features/feat-hub-foundation/production-publish-smoke-cwd-paths-spec-reflection-receipt.md`
