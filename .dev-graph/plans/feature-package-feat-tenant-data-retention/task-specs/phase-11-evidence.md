# System task overlay: 再現可能な証跡 — P06/P07/P09/P10の証跡集約と再現手順確立

## Machine-readable registration fields

- feature_package_id: feature-package/feat-tenant-data-retention (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-tenant-data-retention", "macro-feature", "quality", "evidence"]
- related_nodes: ["feat-tenant-data-retention"]
- parent_feature: feat-tenant-data-retention
- phase_ref: P11
- classification: confidence=0.82, reason="P06(テスト実行)/P07(受入)/P09(品質保証)/P10(最終レビュー)の証跡を集約し、再現コマンド列を確立するP11証跡タスク", candidates=[{artifact_kind: task, confidence: 0.82, candidate_path: tasks/feat-tenant-data-retention/sys-tenant-data-retention-p11.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P06 (テスト実行)・P07 (受入)・P09 (品質保証)・P10 (最終レビュー) の各証跡を集約し、第三者が同一手順で再現できる証跡パッケージを確立する。この task 完了時点で、quality_constraints 6 件それぞれについて再現コマンド列と結果が evidence-summary.md に記録される。

## 背景

Feature Execution Package の固定責務マッピングでは、P11 は「再現可能な証跡」を担い、それまでの task が個別に生成した証跡 (テストログ、受入記録、品質保証レポート、最終レビュー記録) を単一の再現可能な証跡パッケージへ統合するゲートである。本 feature はテナント越境読取 (T14) と削除不完全 (T15) という機微な脅威モデル項目を扱うため、再現手順は監査・第三者検証の観点からも重要である。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-tenant-data-retention
- Entry gate: P10 (docs/features/feat-tenant-data-retention/final-review-record.md) が作成済みであり最終レビューに問題がないことが確認されていること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature は host UI を持たず frontend 証跡対象がない
- Backend: N/A: 本 task は証跡集約のみで backend 実装物を変更しない
- API: N/A: 本 task は証跡集約のみで API 契約を変更しない
- Data: N/A: 本 task は証跡集約のみでデータ移行を伴わない
- Infrastructure: N/A: 本 task は証跡集約のみでデプロイ単位の変更を伴わない
- Security: applicable + control: T14/T15 対策確認証跡と暗号化検証証跡の再現コマンド列を確立する
- Quality: applicable + tests/gates: quality_constraints 6 件それぞれの再現コマンド列と結果を evidence-summary.md へ集約する
- Documentation: applicable + change: docs/features/feat-tenant-data-retention/evidence-summary.md を新規作成する
- Operations: N/A: 運用証跡の集約は P12/P13 で扱う

## Architecture and deploy unit

- Architecture decisions: N/A: 本 task は証跡集約のみで新たな architecture decision を伴わない
- Deploy unit/environment: cloudflare-workers/hub (本 task は証跡集約のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は証跡集約のみで互換性移行を伴わない

## 成果物

- Produced artifacts: docs/features/feat-tenant-data-retention/evidence-summary.md (quality_constraints 6件の再現コマンド列と結果)
- Consumed artifacts: docs/features/feat-tenant-data-retention/test-run-results.md, docs/features/feat-tenant-data-retention/acceptance-record.md, docs/features/feat-tenant-data-retention/quality-assurance-report.md, docs/features/feat-tenant-data-retention/final-review-record.md
- Write scope/touches: docs/features/feat-tenant-data-retention/evidence-summary.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-tenant-data-retention-p11) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-tenant-data-retention-p11 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-tenant-data-retention-p11) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-TENANT-DATA-RETENTION-P10] であり P10 完了後に着手する。resource_scope (docs/features/feat-tenant-data-retention/evidence-summary.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 新たなテストの実行 (owner=P06。本 task は既存証跡の集約のみ)
- 実装コードの作成・修正 (owner=P05)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-tenant-data-retention`
- Required evidence: evidence-summary.md に quality_constraints 6 件それぞれの再現コマンド列と対応する結果が記載されていること

## Rollout and rollback

- Rollout: evidence-summary.md を作成し、6 件全ての再現コマンド列と結果を確認してから P12 (文書化・runbook・引き継ぎ) へ引き継ぐ
- Rollback trigger and steps: 集約対象の証跡に欠落・矛盾が見つかった場合、該当するP06/P07/P09/P10へ差し戻し再取得を依頼する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/spec-state.json qa_log (qa-045)
- Detailed authoritative source: docs/security-spec.md (§8.3, §8.4)
- Architecture: N/A: 本 task は証跡集約のみで architecture 参照を新たに追加しない
- Feature: feat-tenant-data-retention
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-TENANT-DATA-RETENTION-P10
