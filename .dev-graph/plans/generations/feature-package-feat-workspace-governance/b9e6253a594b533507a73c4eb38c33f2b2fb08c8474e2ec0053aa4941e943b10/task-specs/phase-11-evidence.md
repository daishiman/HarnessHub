# System task overlay: エビデンス集約 — P04〜P10成果物の証跡パッケージ化

## Machine-readable registration fields

- feature_package_id: feature-package/feat-workspace-governance (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-workspace-governance", "macro-feature", "quality", "evidence"]
- related_nodes: ["feat-workspace-governance"]
- parent_feature: feat-workspace-governance
- phase_ref: P11
- classification: confidence=0.82, reason="P04テスト設計・P06テスト実行・P07受入・P09品質保証・P10最終レビューの各成果物を単一の証跡パッケージへ集約するP11タスク", candidates=[{artifact_kind: task, confidence: 0.82, candidate_path: tasks/feat-workspace-governance/sys-workspace-governance-p11.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P04 (test-design.md)・P06 (test-run-results.md)・P07 (acceptance-record.md)・P09 (quality-assurance-report.md)・P10 (final-review-decision.md) の各成果物を参照リンクとして単一の証跡パッケージ evidence-package.md に集約し、監査・追跡可能性を確保する。

## 背景

feature 全体の完了判定根拠は複数 phase の成果物に分散しているため、後続の運用・監査担当者が個別ファイルを辿らなくても全体像を把握できるよう、証跡へのポインタと結論のサマリを一箇所にまとめる。evidence-package.md は新たな判定を行わず、既存成果物への参照と既存結論の転記のみを行う。転記の際は各 phase の pass/fail 結論をそのまま引用し、独自の再判定は行わない。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-workspace-governance
- Entry gate: P10 (final-review-decision.md) が完了し、feature 全体の最終合否が pass と判定された状態であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は証跡集約文書化のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は証跡集約文書化のみで backend 実装物を変更しない
- API: N/A: 本 task は証跡集約文書化のみ
- Data: N/A: 本 task は証跡集約文書化のみ
- Infrastructure: N/A: 本feature は追加インフラを新設しない
- Security: N/A: 本 task はセキュリティ判定の再実施を行わず、既存判定結果の集約のみ
- Quality: applicable + change: P04/P06/P07/P09/P10 の成果物への参照と結論を evidence-package.md に集約する
- Documentation: applicable + change: docs/features/feat-workspace-governance/evidence-package.md を新規作成する
- Operations: N/A: 運用証跡は P13 で扱う

## Architecture and deploy unit

- Architecture decisions: N/A: 本 task は既存成果物の集約のみで新規決定を行わない
- Deploy unit/environment: cloudflare-workers/hub (本 task は証跡集約のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は証跡集約のみで実コード・実 migration への変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-workspace-governance/evidence-package.md (P04/P06/P07/P09/P10 の成果物への参照リンクと結論サマリを含む)
- Consumed artifacts: docs/features/feat-workspace-governance/test-design.md, docs/features/feat-workspace-governance/test-run-results.md, docs/features/feat-workspace-governance/acceptance-record.md, docs/features/feat-workspace-governance/quality-assurance-report.md, docs/features/feat-workspace-governance/final-review-decision.md
- Write scope/touches: docs/features/feat-workspace-governance/evidence-package.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue番号 + dev-graph graph_node_id (sys-workspace-governance-p11) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-workspace-governance-p11 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-workspace-governance-p11) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-WORKSPACE-GOVERNANCE-P10] のため P10 完了後に着手する。resource_scope (docs/features/feat-workspace-governance/evidence-package.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 各 phase 成果物の再判定・再実行 (集約と転記のみ)
- 新規テスト・新規実装の追加

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: evidence-package.md に P04/P06/P07/P09/P10 の成果物への参照リンクと各成果物の pass 結論が漏れなく集約されていること. Normative evidence: tenant-scoped export、PII/secret redaction、hash-chain、policy block/approval route、共通state-machine consumer wiring、RBAC/audit testsをP04/P06/P07/P12/P13まで追跡する。

## Rollout and rollback

- Rollout: evidence-package.md を作成し、P04〜P10 の全成果物への参照漏れがないことを確認してから P12 へ引き継ぐ
- Rollback trigger and steps: 参照先成果物に矛盾・欠落が判明した場合、evidence-package.md の集約内容を修正し不足参照を補う

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-workspace-governance.context.json` (`sha256:66ebc79498bfe05d63e1f9203250e575b87934b5d7a4bc6e5ad4fbd0d3ee72a1`)
- Phase responsibility: P06・P07・P09・P10 の証跡を source digest 付きで集約する。
- Purpose: 顧客管理者が統制と安全性 (G2) を自律運用できるよう、承認キュー・RBAC 拡張・監査ログ閲覧を提供する
- Goal: workspace-admin が承認/差し戻し/監査を Hub Web で完結でき、統制作業の提供者依存が解消された状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- approval queue (Approval Pending 状態の有効化)
- RBAC の細分化と管理 UI
- 監査 event の閲覧・検索 UI
- 統制ポリシー設定
- Scope out:
- 課金
- Stage 3 以降の拡張
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- 承認フローを経ない publish が policy で遮断される
- 監査ログが Tenant スコープで検索できる
- RBAC 変更が監査 event に記録される
- Architecture/source refs:
- architecture/harness-hub-security.md
- architecture/harness-hub-frontend.md
- architecture/harness-hub-backend.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Normative implementation closure (2026-07-19)

This section is normative for P11 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-workspace-governance.context.json; docs/backend-spec.md audit/publish contracts; workspace-governance goal quality constraints
- Effective phase contract: P02で監査exportをGET /api/v1/audit-events/export（workspace-admin、自tenant、filter共通、streaming CSV、salary/secret/token値禁止、hash-chain検証結果付き）として設計し、P05でroute/schema/UI export actionを実装する。governance policyは共通PublishRequest engineの注入可能なpolicy evaluator seamを通じてReady→Approval Pending/Approvedを決定し、feat-publish-pipeline本体を複製せず実consumer wiringを同feature write scopeに含める。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `apps/hub/src/app/api/v1/audit-events/export/`
- `packages/schemas/governance/audit-export.ts`
- `apps/hub/src/app/(dashboard)/audit-log/`
- `apps/hub/src/lib/publish/policy-adapters/governance.ts`
- Mandatory evidence: tenant-scoped export、PII/secret redaction、hash-chain、policy block/approval route、共通state-machine consumer wiring、RBAC/audit testsをP04/P06/P07/P12/P13まで追跡する。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/00-requirements-definition.md U9 (I8)
- Detailed authoritative source: docs/features/feat-workspace-governance/final-review-decision.md
- Architecture: N/A: 本 task は既存成果物の集約のみ
- Feature: feat-workspace-governance
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-WORKSPACE-GOVERNANCE-P10 (最終レビュー)
