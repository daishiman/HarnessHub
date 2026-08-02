---
graph_node_id: "issue-prompt-only-line-budget-20260802"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","prompt-governance","line-limit","developer-experience"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "500行制限をプロンプト系成果物へ限定し一般コードから撤廃する"
owners: ["daishiman"]
created_at: "2026-08-02T09:05:17Z"
updated_at: "2026-08-02T12:07:52.775449Z"
status: "closed"
depends_on: []
related_nodes: ["issue-500-line-split-dilutes-harness-coverage-20260728"]
resource_scope: ["system-spec/dev-workflow.md","system-spec/spec-state.json","specs/harness-hub-system-specification.md","architecture/harness-hub-dev-workflow.md","architecture/harness-hub-testing-qa.md","plugins/skill-governance-lint/scripts/lint-skill-tree.py","tests/scripts-plugins/test_skill_governance_lint__lint_skill_tree.py","docs/features/feat-dev-pipeline-improvement/prompt-line-budget-spec-reflection-receipt.md"]
purpose: "一般コードの保守性判断とプロンプトのコンテキスト量管理に同じ500行制限が使われ、責務分割・追加ゲート・再検証を不要に発生させている混同を解消する"
goal: "ソースコードとテストは一律の数値行数ゲート対象外となり、SKILL.mdとprompts配下のプロンプト成果物だけが各契約の行数上限で機械検査される"
scope_in: ["一般コードとテストに対する一律500行上限の現行仕様・設計記述の撤廃","SKILL.md本文300行ゲートの維持","skills配下のprompts Markdown/YAMLに対する500行ゲートの追加","500行のprompt通過・501行のprompt拒否・501行のcode非対象を示す回帰テスト","旧500行コード分割課題の扱いの整理"]
scope_out: ["責務分離そのものの禁止","qa-070の正規ドキュメント300行ゲートの変更","履歴文書や過去の検証証跡の改変","製品API・DB・認証・UI・Cloudflare構成の変更"]
acceptance: ["現行仕様と設計がソースコード・テストへ一律の数値行数上限を課していない","SKILL.md本文300行上限が維持される","skills配下のprompts Markdown/YAMLは500行ちょうどで通り501行で失敗する","501行を超える一般コードはプロンプト行数ゲートの検査対象外である","focused testと実repository scanが成功する"]
architecture_refs: ["arch-harness-hub-dev-workflow","arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-prompt-only-line-budget-20260802.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"ae4599ca101bdaee0dae63053965ce5b170e66ae425b797bc5f2895a7c7874de","evaluator":"final-review: task-spec packages + focused regression + system-spec gates","evidence_ref":"docs/features/feat-dev-pipeline-improvement/prompt-line-budget-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-02T09:05:17Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "ユーザーが一般コードの500行確認を不要、プロンプト系成果物の行数確認を必要と明示した品質契約の是正"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-prompt-only-line-budget-20260802.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-hls0","linked_at":"2026-08-02T09:09:17Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-02T09:22:00Z","evidence_refs":["tests/scripts-plugins/test_skill_governance_lint__lint_skill_tree.py","plugins/skill-governance-lint/scripts/lint-skill-tree.py","system-spec/spec-state.json","system-spec/dev-workflow.md","issues/sys-prompt-only-line-budget-20260802.md"],"policy":"manual","reconciled_at":"2026-08-02T09:22:00Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-08-02T09:05:17Z","missing_sections":[],"status":"complete"}
---

# 概要

一般コードとテストへ一律に適用されていた「500行以下」の運用を撤廃し、行数制限を
`SKILL.md` と `prompts/` 配下のプロンプト成果物へ限定する。

## 背景と問題

一般コードの責務分離は、変更理由、凝集度、公開契約、テスト容易性から判断すべきであり、
ファイル行数だけでは品質を判定できない。ところが現行の仕様・設計・実装コメントでは、
プロンプトのコンテキスト量を抑える行数制限と一般コードの保守性判断に、同じ500行という
数値が使われている。

この混同により、コードを機械的に分割した結果、import専用moduleの追加、entry point判定の
偽陽性、harness coverageの分母増加、関連証跡の再検証が発生した。既存課題
`HarnessHub-2mor` は、実質的な品質低下がないまま coverage が64.1%から63.1%へ低下した
実測を記録している。

## 期待する挙動

- ソースコードとテストには、一律の数値行数上限を設けない。
- コードの分割は責務境界や保守性の根拠がある場合に行い、行数だけを理由にしない。
- `SKILL.md` は既存の本文300行上限を維持する。
- skill内の `prompts/*.md` と `prompts/*.yaml` は500行上限を機械検査する。
- qa-070の正規ドキュメント300行ゲートは別契約として維持する。

## スコープ

- In: 現行仕様・設計・能動コードコメントの是正、既存skill lintへのprompt行数検査追加、回帰テスト
- Out: 過去の履歴文書の改変、責務分離そのものの禁止、製品機能やCloudflare構成の変更

## 受入条件

- [x] 現行仕様と設計に、一般コード・テストの一律500行上限が残っていない
- [x] `SKILL.md` 本文300行ゲートが維持されている
- [x] skill内promptは500行で通り、501行で失敗する
- [x] 501行超の一般コードがprompt行数ゲートに影響しない
- [x] focused testと実repository scanが成功する

## 検証証跡

- `pytest` focused suite: 186 passed
- 全22 pluginのpackage check / completeness: blocking failure 0
- 全plugin skill tree実走査: exit 0
- `lint-doc-line-limit.py`: 490文書、違反0
- system-spec coverage matrix: 未収集0、foundation trace適合
- dev-graph schema: valid、violation 0
- `lint-script-naming.py`: VIOLATION 0
- `git diff --check`: exit 0

## 旧課題の整理

- `HarnessHub-cza`: 一般コードを500行以下へ分割する受入条件が失効したためclose
- `HarnessHub-2mor`: 将来の機械的分割という発生源は除去。既存support moduleと
  `--update-floor` のnote保全は別論点としてopenのまま記録
