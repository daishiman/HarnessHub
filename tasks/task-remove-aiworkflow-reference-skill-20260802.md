---
graph_node_id: "task-remove-aiworkflow-reference-skill-20260802"
artifact_kind: "task"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["documentation","portability","reference-cleanup","aiworkflow"]
priority: "medium"
start_date: "2026-08-02"
target_date: null
iteration: null
title: "aiworkflow 依存の外部参考 Skill を削除し有効な CLI 契約を移設する"
owners: ["daishiman"]
created_at: "2026-08-02T03:57:41Z"
updated_at: "2026-08-08T05:03:24Z"
status: "closed"
depends_on: []
related_nodes: ["feat-doc-governance-portability","arch-harness-hub-dev-workflow","spec-harness-hub-requirements"]
resource_scope: ["doc/参考Skill/skill-creator/","plugins/harness-creator/skills/delegate-codex-skill-review/references/","plugins/plugin-dev-planner/skills/run-plugin-dev-plan/references/phase-lifecycle.md","doc/マルチ企業展開/クリーンアップ計画.md","doc/マルチ企業展開/移管計画.md","doc/ClaudeCodeスキルの設計書/23a-prefix-driven-internal-structure.md","scripts/lint-legacy-plugin-name.py","system-spec/dev-workflow.md","specs/harness-hub-system-specification.md","architecture/harness-hub-dev-workflow.md","features/feat-doc-governance-portability.md","tasks/task-remove-aiworkflow-reference-skill-20260802.md","docs/features/feat-doc-governance-portability/aiworkflow-reference-cleanup-spec-reflection-receipt.md"]
purpose: "UBM 由来の aiworkflow-requirements を前提にした外部参考コピーを除去し、現在も利用する外部 CLI 契約だけを consumer plugin の所有 path へ移して、能動コードから凍結参考層への依存をなくす"
goal: "doc/参考Skill/skill-creator の追跡ファイル 0、有効な dangling reference 0、consumer plugin から外部 CLI 契約へ到達可能、全仕様層と Beads の判断一致を同時に成立させる"
scope_in: ["doc/参考Skill/skill-creator のディレクトリ単位削除","external-cli-agents-guide.md の delegate-codex-skill-review 配下への移設","cleanup/transfer 計画と legacy name allowlist の整合","dev-workflow の system-spec/spec/architecture/feature/task/docs 反映と受領書","task spec、dev-graph、plugin、document、repository 品質ゲート再実行"]
scope_out: ["Harness Hub の UI/API/DB/auth/deploy runtime 変更","eval-log の凍結履歴削除","xl-skills 原本の変更","外部 CLI 実行方式そのものの再設計"]
acceptance: ["doc/参考Skill/skill-creator の追跡ファイルが 0 件になる","active code/plugin/docs から削除 path と aiworkflow-requirements への実行依存が 0 件になる","external-cli-agents-guide.md が consumer plugin 配下に存在し codex-connection.md と resource-map.yaml から到達できる","system-spec/specs/architecture/features/tasks/docs と仕様反映受領書が同じ影響境界を記録する","対象品質ゲートと repository CI が blocking failure 0 で完了する","手書き変更ファイルが 500 行以下で repository Markdown の 300 行制約を満たす"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "tasks/task-remove-aiworkflow-reference-skill-20260802.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"b901921ef649ea9ef2e36b838e56bfb7ffa68835ce17be4465468b9480a5cdee","evaluator":"codex-task-intake","evidence_ref":"tasks/task-remove-aiworkflow-reference-skill-20260802.md"}
source_lineage: {"imported_at":"2026-08-02T03:57:41Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "外部参考コピーの削除と唯一の有効参照移設を一つの rollback 単位で完了する repository maintenance task"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/task-remove-aiworkflow-reference-skill-20260802.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-ym9h","linked_at":"2026-08-02T04:09:29Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-08-02T03:57:41Z","missing_sections":[],"status":"complete"}
---

# 目的

UBM 由来の `aiworkflow-requirements` を前提にした外部参考コピーを repository から除去し、現在も利用する外部 CLI エージェント契約だけを所有 plugin 配下へ移して、能動コードから凍結参考層への依存を 0 件にする。

## 背景

`doc/参考Skill/skill-creator/` は `xl-skills` から取り込まれた 275 ファイルの参考コピーで、HarnessHub の runtime や plugin 正本ではない。一方、その配下の `external-cli-agents-guide.md` だけは `delegate-codex-skill-review` から参照されていた。ディレクトリをそのまま削除すると有効な参照も壊れるため、利用中の 1 文書を consumer-owned path へ移し、参照元と resource map を同時に更新する。

## 入力と前提条件

- 入力: `doc/参考Skill/skill-creator/` の追跡ファイル、repository 全体の参照検索、既存 cleanup / transfer 計画。
- 前提: 削除対象は外部由来の参考コピーで、原本は `xl-skills` と git 履歴から復元できる。

## 出力と成果物

- 生成物: `plugins/harness-creator/skills/delegate-codex-skill-review/references/external-cli-agents-guide.md`。
- 更新対象: cleanup / transfer 計画、dev-workflow の正本仕様、compiled spec、architecture wrapper、feature、task、仕様反映受領書、Beads / dev-graph linkage。

## 依存関係

- `depends_on`: なし。
- 関連: `feat-doc-governance-portability`、`arch-harness-hub-dev-workflow`、`spec-harness-hub-requirements`。
- ブロッカー: 有効な参照が削除対象に残る場合は commit しない。

## 実装対象

- Frontend: N/A。画面と client bundle は変更しない。
- Backend/API: N/A。API と runtime behavior は変更しない。
- Database/Data: N/A。schema と永続データは変更しない。
- Infrastructure: N/A。Cloudflare / GitHub Actions / secret は変更しない。
- Security/Privacy: 外部 CLI ガイドの credential 非保持・`execFileSync` 境界を移設後も保持する。
- Documentation: 参考コピー削除、consumer-owned reference への移設、正本境界と復元経路の記録を行う。

## Write scope と競合制約

- `touches`: `doc/参考Skill/skill-creator/`、`doc/ClaudeCodeスキルの設計書/`、`doc/マルチ企業展開/`、`plugins/harness-creator/skills/delegate-codex-skill-review/references/`、`plugins/plugin-dev-planner/skills/run-plugin-dev-plan/references/phase-lifecycle.md`、`scripts/lint-legacy-plugin-name.py`、`system-spec/`、`specs/`、`architecture/`、`features/`、`tasks/`、`docs/features/feat-doc-governance-portability/`、`.dev-graph/state/graph.json`。
- 排他資源: `system-spec/spec-state.json` は transition writer、`.dev-graph/state/graph.json` は C02 writer だけが更新する。
- 並列実行条件: 上記共有正本の main 取込差分を先に統合し、writer 実行後に fresh gate を再実行する。
- branch: `devgraph/task-remove-aiworkflow-reference-skill-20260802`。
- worktree lease: 現 worktree `wt-34` で実行し、別 worktree の差分を取り込まない。
- completion projection: draft PR 作成までは in_progress、merge 後の default branch reconciliation で done にする。

## GitHub publication

- Mode: `local_only`。
- Project aliases: N/A。Beads を tracker 正本とする。
- Issue labels/milestone: N/A。GitHub Issue は作成せず draft PR で公開する。
- Initial Project fields: N/A。
- Publication gate: task / spec / architecture / feature / receipt の整合、対象品質ゲート、Beads linkage、main 同期が成功していること。
- Failure policy: push / PR 作成失敗は Beads notes に記録し、ローカル成果物を巻き戻さない。
- Completion policy: manual。draft PR merge 後に Beads と dev-graph を default branch から reconcile する。
- PR linkage requirement: PR 本文に Beads ID と `dev-graph: task-remove-aiworkflow-reference-skill-20260802` を記載し、base `main` を対象にする。
- Closed without merge: task を open / in_progress に維持し、実装証拠を保持する。
- Local reconciliation: PR URL、検証結果、仕様影響を Beads notes へ追記する。

## status の意味論

本文の `status` は文書ライフサイクル、実行状態は `completion_evidence` と Beads を正本とする。draft PR 作成だけで merge 済みとは扱わない。

## 実行手順

1. remote main を local main へ反映し、local main を本 branch へ merge する。
2. 参考コピーをディレクトリ単位で削除し、有効な外部 CLI 契約だけを consumer-owned path へ移す。
3. 全参照を再走査し、active path の dangling reference を 0 件にする。
4. dev-workflow の正本を R4-reopen →再確定し、compiled spec、architecture、feature、docs、task へ同一 wave で反映する。
5. task 仕様書、system-spec、dev-graph、plugin、document、repository CI の品質ゲートを再実行する。
6. 対象差分だけを commit・pushし、`main` 向け draft PR を作成して Beads を更新する。

## 受入条件

- [x] `doc/参考Skill/skill-creator/` の追跡ファイルが 0 件になる。
- [x] active code / plugin / docs から削除 path と `aiworkflow-requirements` への実行依存が 0 件になる。
- [x] `external-cli-agents-guide.md` が consumer plugin 配下に存在し、`codex-connection.md` と `resource-map.yaml` から到達できる。
- [x] system-spec / specs / architecture / feature / task / docs / 仕様反映受領書が同じ判断を記録する。
- [x] task spec と repository quality gate が blocking failure 0 で完了する。
- [x] 変更対象の手書きファイルは 500 行以下、repository 管理 Markdown は 300 行制約を満たす。

## 検証方法

- 自動検証: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-doc-governance-portability`。
- 自動検証: `python3 plugins/dev-graph/scripts/validate-graph-schema.py --repo-root .`。
- 自動検証: system-spec coverage / source citation / compile tests。
- 自動検証: `python3 scripts/lint-legacy-plugin-name.py`、artifact placement、document line limit、repository CI。
- 手動検証: `git diff --check`、削除対象と移設先の参照検索、PR base/head/body、対象 stage の確認。
- 証跡: `docs/features/feat-doc-governance-portability/aiworkflow-reference-cleanup-spec-reflection-receipt.md`。

## リスクとロールバック

- リスク: 削除対象にだけ存在する有効情報を失う。
- ロールバック: git revert でディレクトリと参照を同時に戻す。単独ファイルの場当たり的復元は行わない。
- リスク: 移設後の resource map が新 path を公開せず、必要時に読まれない。
- ロールバック: guide、codex connection、resource map の 3 点を同一 commit で旧状態へ戻す。

## Handoff

- 実装 route: human / Codex による repository maintenance。
- 次に利用するノード: `feat-doc-governance-portability`、`arch-harness-hub-dev-workflow`。
