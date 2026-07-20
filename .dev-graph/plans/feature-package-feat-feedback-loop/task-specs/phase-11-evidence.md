# System task overlay: エビデンス収集 — 再現可能な検証証跡の集約

## Machine-readable registration fields

- feature_package_id: feature-package/feat-feedback-loop (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-feedback-loop", "studio-extension", "feedback-loop", "evidence"]
- related_nodes: ["feat-feedback-loop", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
- parent_feature: feat-feedback-loop
- phase_ref: P11
- classification: confidence=0.84, reason="P06/P07/P09/P10 の検証結果を再現可能な証跡として索引化する P11 タスク", candidates=[{artifact_kind: task, confidence: 0.84, candidate_path: tasks/feat-feedback-loop/sys-feedback-loop-p11.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P06 (テスト実行)・P07 (受入)・P09 (品質保証)・P10 (最終レビュー) の検証結果を、誰でも同一コマンドで再現できる証跡として evidence/index.md に索引化する。

## 背景

feature-execution-package-contract.md は P11 を「reproducible evidence」と定め、後続の運用・監査・障害調査で参照可能な再現可能証跡の集約を求める。本 feature は 2 経路受付・AI pull キュー・監査記録・通知・publish 接続という複数のセキュリティ/データ要件が絡むため、各検証結果への到達経路と再実行コマンドを一箇所から辿れる状態にすることが重要である。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-feedback-loop, arch-harness-hub-backend, arch-harness-hub-frontend
- Entry gate: sys-feedback-loop-p10 の final-review-notes.md で quality_constraints 8 件全件の充足が確認済みであること。かつ .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3 に一致し、features/feat-feedback-loop.md の confirmation_status が confirmed であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は証跡索引化のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は証跡索引化のみで backend 実装物を変更しない
- API: N/A: 本 task は API 契約を変更しない
- Data: N/A: 本 task はデータスキーマを変更しない
- Infrastructure: N/A: 本 feature は追加インフラを新設しない
- Security: applicable + change: 監査 event 記録の証跡 (P09 quality-assurance-report.md への参照) を索引に含める
- Quality: applicable + change: evidence/index.md から P06/P07/P09/P10 の各成果物への参照を整備する
- Documentation: applicable + change: docs/features/feat-feedback-loop/evidence/ を新規作成する
- Operations: N/A: 運用証跡の収集は P12 で扱う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (本 task は証跡索引化のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は証跡索引化のみで実変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-feedback-loop/evidence/ (index.md および参照証跡)
- Consumed artifacts: docs/features/feat-feedback-loop/test-run-report.md, docs/features/feat-feedback-loop/acceptance-report.md, docs/features/feat-feedback-loop/quality-assurance-report.md, docs/features/feat-feedback-loop/final-review-notes.md
- Write scope/touches: docs/features/feat-feedback-loop/evidence/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-feedback-loop-p11) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-feedback-loop-p11 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-feedback-loop-p11) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-feedback-loop-p10 完了後に着手する。write_scope (docs/features/feat-feedback-loop/evidence/) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 新規検証の実施 (P06/P07/P09/P10 の scope。本 task は既存結果の索引化のみ)
- 実装コードの修正

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: evidence/index.md から P06/P07/P09/P10 の各成果物へのリンクと、それぞれの再実行コマンドが辿れる

## Rollout and rollback

- Rollout: evidence/index.md を作成し、P12 ドキュメント/運用へ引き継ぐ
- Rollback trigger and steps: 参照先成果物が未整合 (欠落・矛盾) の場合、evidence/index.md に不整合箇所を記録し、該当する原因 task を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/security.md (qa-025)
- Detailed authoritative source: docs/backend-spec.md (§3.8 監査対象)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-feedback-loop
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-feedback-loop-p10
