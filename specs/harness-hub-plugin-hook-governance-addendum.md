---
graph_node_id: "spec-harness-hub-plugin-hook-governance-20260804"
artifact_kind: "specification"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["plugin-governance","hooks","qa-143"]
priority: "high"
start_date: "2026-08-04"
target_date: null
iteration: null
title: "全 plugin hook entry point governance 追補"
owners: ["daishiman"]
created_at: "2026-08-04T00:00:00Z"
updated_at: "2026-08-04T00:00:00Z"
status: "active"
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["issue-hooks-entry-point-parity-generalization-20260728","arch-harness-hub-dev-workflow"]
resource_scope: ["specs/harness-hub-plugin-hook-governance-addendum.md","system-spec/dev-workflow.md","architecture/harness-hub-dev-workflow.md"]
purpose: "全 plugin の hook 台帳・登録・実体を fail-closed で一致させ、手動 script との責務混同を防ぐ。"
goal: "qa-143 の hook parity 契約を仕様として参照可能にし、500 行上限を守る。"
scope_in: ["plugin 配布・CI・開発品質ゲート","hook entry point の宣言・登録・実体 parity"]
scope_out: ["Harness Hub の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit"]
acceptance: ["HK-001..003 の検査境界を明記する","手動 script の置場を hooks/ と区別する","qa-143 と architecture/receipt を参照する"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "specs/harness-hub-plugin-hook-governance-addendum.md"
template_id: "specification"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"a36840d65a7e675352d6d28bb8c778662252814ad4c05b8958dcf0a769ba5760","evaluator":"system-spec-harness compile + coverage validation (qa-143)","evidence_ref":"system-spec/dev-workflow.md"}
source_lineage: {"imported_at":"2026-08-04T00:00:00Z","origin_kind":"system-spec-harness","source_digest":"a36840d65a7e675352d6d28bb8c778662252814ad4c05b8958dcf0a769ba5760","source_path":"system-spec/dev-workflow.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.97
classification_reason: "qa-143 の開発品質契約を既存仕様 wrapper の行数上限を超えずに参照する追補。"
classification_candidates: [{"artifact_kind":"specification","candidate_path":"specs/harness-hub-plugin-hook-governance-addendum.md","confidence":0.97}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-04T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 全 plugin hook entry point governance 追補

## 目的

自動処理を起動する hook が、配布時の台帳、Claude Code の登録、実際のファイルで食い違うと、意図しない処理が動いたり、必要な処理が動かなかったりする。`qa-143` はこの食い違いを repository 全体で止めるための開発品質契約である。

## 契約

- `package-contract.json` の `entry_points.hooks` を宣言台帳とし、`hooks/hooks.json` と manifest inline hooks の和を登録実態として照合する。
- HK-001 は登録済み・未宣言を、HK-002 は登録構成を持つ plugin の宣言済み・未登録を非 0 終了で拒否する。相対 command は `hooks/foo.py` と `./hooks/foo.py` を同じ実体として読む。
- HK-003 は `hooks/` の残余を import 専用 Python support module だけに限定する。shebang や `__main__` block を持つ実行可能なファイル、shell script、手動運用 script は自動 hook と混同しない。
- 手動操作は `scripts/` に置く。`plugins/skill-intake/scripts/post-keychain-add.sh` はその適用例であり、台帳・登録・実体の 3 者一致の対象ではない。
- 検査本体が 500 行を超える場合は責務で分離する。本件では CLI/全体走査を `validate-plugin-completeness.py`、hook 判定を `validate-plugin-hooks.py` が所有する。

## 影響境界

これは repository の plugin 配布・CI・開発品質ゲートの変更であり、Harness Hub の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。正本は `system-spec/dev-workflow.md` の `qa-143`、設計参照は `architecture/harness-hub-dev-workflow.md`、確認結果は `docs/features/feat-dev-pipeline-improvement/hooks-entry-point-parity-spec-reflection-receipt.md` とする。
