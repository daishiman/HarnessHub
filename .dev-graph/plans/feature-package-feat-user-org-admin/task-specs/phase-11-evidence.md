# System task overlay: エビデンス収集 — acceptance根拠・監査ログ・分離テスト結果の証跡集約

## Machine-readable registration fields

- feature_package_id: feature-package/feat-user-org-admin (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-user-org-admin", "studio-extension", "security", "evidence"]
- related_nodes: ["feat-user-org-admin", "arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
- parent_feature: feat-user-org-admin
- phase_ref: P11
- classification: confidence=0.86, reason="P06〜P10の実行結果・判定記録を再現可能な証跡として収集・保存するP11タスク", candidates=[{artifact_kind: task, confidence: 0.86, candidate_path: tasks/feat-user-org-admin/sys-user-org-admin-p11.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P06〜P10 の実行結果・判定記録を再現可能な証跡として収集・保存し、feature acceptanceの根拠を機械的に再検証可能な状態にする。

## 背景

feature-execution-package-contract.md §7 は feature acceptance が P07/P10/P11 の evidence から満たされることを求めており、本 task はその evidence 集約を担う。salary PII ガードと監査 event 記録は特に再現可能な証跡が要求される (SEC4/SEC6)。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-user-org-admin, sys-user-org-admin-p10
- Entry gate: docs/features/feat-user-org-admin/final-review-notes.md が P10 で作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は証跡収集のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は証跡収集のみで backend 実装物を変更しない
- API: N/A: 本 task は証跡収集のみでAPI契約を変更しない
- Data: N/A: 本 task は証跡収集のみでスキーマを変更しない
- Infrastructure: N/A: 本 feature はデプロイ単位を新設しない
- Security: applicable + change: salary の読取監査ログと係数変更の監査 event ログを一次証跡として収集する (SEC4/SEC6)
- Quality: applicable + change: P06/P07/P09/P10 の一次証跡への参照を evidence/index.md にまとめる
- Documentation: applicable + change: docs/features/feat-user-org-admin/evidence/ を新規作成する
- Operations: N/A: 運用中の証跡収集はP12で定める手順に従う。本taskはfeature構築時点の証跡集約のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (証跡収集のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は証跡収集のみで対象物への変更を行わない

## 成果物

- Produced artifacts: docs/features/feat-user-org-admin/evidence/index.md (P06/P07/P09/P10 の一次証跡への参照、salary読取監査ログ・係数変更監査eventログの一次証跡)
- Consumed artifacts: apps/hub/src/features/user-org-admin/__tests__/, docs/features/feat-user-org-admin/acceptance-report.md, docs/features/feat-user-org-admin/quality-assurance-report.md, docs/features/feat-user-org-admin/final-review-notes.md
- Write scope/touches: docs/features/feat-user-org-admin/evidence/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-user-org-admin-p11) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-user-org-admin-p11 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-user-org-admin-p11) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-user-org-admin-p10] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 証跡不足を補うための再テスト実施そのもの (該当 task を再実行対象として差し戻す)
- 監査 event ロガー自体の実装変更 (feat-hub-foundation の共通層 write_scope)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-user-org-admin/evidence/index.md に P06/P07/P09/P10 の一次証跡への参照が明記されている

## Rollout and rollback

- Rollout: evidence/index.md を作成し、P12 (documentation-operations) へ引き継ぐ
- Rollback trigger and steps: 証跡不足で判定根拠が再現できない場合、不足している証跡の生成元 task を evidence/index.md に記録し、該当 task を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/security.md (qa-025 SEC4/SEC6)
- Architecture: arch-harness-hub-security (architecture/harness-hub-security.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-user-org-admin
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-user-org-admin-p10
