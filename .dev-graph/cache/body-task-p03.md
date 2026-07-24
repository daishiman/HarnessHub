# System task overlay: 設計レビュー — 単一 writer (schedule-graph.py)・後方互換・qa-066 非退行との整合検証

## Machine-readable registration fields

- feature_package_id: feature-package/feat-mvp-first-scheduling (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-mvp-first-scheduling", "macro-feature", "mvp-first", "scheduling", "qa-069", "documentation"]
- related_nodes: ["feat-mvp-first-scheduling", "arch-harness-hub-dev-workflow"]
- parent_feature: feat-mvp-first-scheduling
- phase_ref: P03
- classification: confidence=0.87, reason="qa-069 の MVP ファースト化要求のうち P03 責務 (設計レビュー — 単一 writer (schedule-graph.py)・後方互換・qa-066 非退行との整合検証) を実行する task", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-mvp-first-scheduling/sys-mvp-first-scheduling-p03.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 の設計が単一 writer 原則 (schedule-graph.py が着手候補順序の唯一の決定点であること)・既存 node の後方互換 (MVP metadata 未設定時の fallback)・qa-066 品質ゲート要件との非衝突を満たすことを、P02 とは独立した視点で検証し、実装可能と承認する。

## 背景

goal-spec acceptance には『qa-066 由来の既存品質ゲートの検査が非退行である』が明記され、scope_out には『CI/CD・quality gate 要件 (qa-066) 自体の緩和・削除』が明記される。設計レビューは実装着手前にこの両立を確認する最後の関門である。

## 前提条件

- P01 upstream entry gate: N/A: intra-feature depends_on gate
- Required predecessor: SYS-MVP-FIRST-SCHEDULING-P02 が done であること
- Required spec/architecture/phase/task nodes: feat-mvp-first-scheduling, arch-harness-hub-dev-workflow
- Entry gate: goal-spec.json の feature_context_digest が sha256:b0d003254ac6f42d4616dfff30ab605e355c09c9abe642b71559cea6a49e6291 に一致し、features/feat-mvp-first-scheduling.md の frontmatter と goal-spec の purpose/goal/scope_in/scope_out/acceptance が逐語一致すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: frontend 実装物を変更しない
- Backend: N/A: Hub 本体の backend 実装物を変更しない (scope_out)
- API: N/A: Hub 本体の API を変更しない (scope_out)
- Data: N/A: Hub 本体の DB/schema を変更しない (scope_out)
- Infrastructure: N/A: デプロイ基盤を変更しない
- Security: applicable + review: 悪性/欠損 MVP metadata に対する fail-closed 方針をレビューする
- Quality: applicable + change: 単一 writer 原則・qa-066 非衝突をレビュー基準として固定する
- Documentation: applicable + change: docs/features/feat-mvp-first-scheduling/design-review.md を新規作成する
- Operations: N/A: 本 phase は運用手順を変更しない

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-dev-workflow
- Deploy unit/environment: dev-tooling/repository
- Compatibility/migration/backfill: P02 設計の後方互換方針をレビューする。migration/backfill は発生しない前提を検証する

## 成果物

- Produced artifacts:
- docs/features/feat-mvp-first-scheduling/design-review.md
- Consumed artifacts:
- docs/features/feat-mvp-first-scheduling/design.md
- Write scope/touches: docs/features/feat-mvp-first-scheduling/design-review.md

## Tracker publication and completion

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-mvp-first-scheduling-p03) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-mvp-first-scheduling-p03 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-mvp-first-scheduling-p03) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: 直前 predecessor task (SYS-MVP-FIRST-SCHEDULING-P02) が done になるまで着手しない。write scope が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- bd CLI 本体の変更
- CI/CD・quality gate 要件 (qa-066) 自体の緩和・削除
- dev-graph への新 verb 追加
- 既存 task 資産の一括書き換え
- Hub プロダクト本体機能 (Web/API/DB) の変更

## Verification and evidence

- Automated commands:
  - `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: design-review.md に単一 writer 原則・後方互換・qa-066 非衝突の 3 観点の判定結果 (承認/差し戻し) が記録されていること

## Inner goal-seek execution loop

- Methodology contract: `system-task-goal-seek/v1`
- Goal: P03 の Phase acceptance と Verification and evidence をすべて満たす
- Generic execution prompt: 目的・背景・前提条件・write scope・成果物・受け入れ条件を入力に、実装手段を固定せず最小の安全な変更を行う
- Rubric: acceptance 全件、回帰テスト、必須証跡、write scope、依存整合がすべて PASS
- Feedback loop: 実装→独立評価→finding を次の prompt へ反映→再実行し、`rubric verdict=PASS` まで反復する。上限到達時は fail-closed
- P13 spec/architecture writeback: N/A: P13 owns writeback

## Rollout and rollback

- Rollout: design-review.md に判定結果を記録し、承認の場合のみ P04 へ引き継ぐ。差し戻しの場合は P02 を再実行する
- Rollback trigger and steps: 承認できない設計事項が見つかった場合、承認しないまま P02 へ差し戻し理由を記録する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature: `features/feat-mvp-first-scheduling.md` (feature_context_digest `sha256:b0d003254ac6f42d4616dfff30ab605e355c09c9abe642b71559cea6a49e6291`)
- Phase responsibility: 現行 feature の purpose・goal・scope・acceptance のうち本 phase 責務の部分集合を所有する。
- Purpose: dev-graph/beads (bd) のタスク優先度選定が品質・本質・再現性を先回りする基準に寄り、いちばん作りたい機能 (MVP) から離れて同じ基盤タスクを繰り返す停滞が起きている (qa-069)。判断軸を「目的=何のために作るか / 背景=どういう経緯か / MVP=今必要な動くもの」の3軸へ組み替え、まず作って使って課題をあぶり出す build-use-learn の回転を取り戻す
- Goal: next/schedule と bd ready の着手候補選定が MVP 適合 (今必要な動くものへの直結度) を第一ソートキーとして動作し、品質・再現性強化系タスクは MVP 成立後へ繰り延べられ、同一入力での選定結果が冪等に再現される状態 (既確定 CI/CD・quality gate 要件 qa-066 は維持)
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
  - feature/task metadata への MVP 判断軸 (目的・背景・MVP 適合度) の表現追加と登録経路
  - schedule/next の着手候補算出への MVP 適合第一ソートキー導入
  - bd-bridge ready 候補順序の MVP-first 整合
  - 品質・再現性強化系タスクの MVP 成立後繰り延べ規則
  - 選定理由 (なぜこのタスクが先か) の receipt 出力
- Scope out:
  - bd CLI 本体の変更
  - CI/CD・quality gate 要件 (qa-066) 自体の緩和・削除
  - dev-graph への新 verb 追加
  - 既存 task 資産の一括書き換え
  - Hub プロダクト本体機能 (Web/API/DB) の変更
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
  - MVP 適合度を持つ task と品質先行 task が混在する入力で、next が MVP 適合 task を先に選定する
  - 同一入力で next を再実行しても選定 batch と順序が一致する (冪等)
  - MVP 判断軸 metadata を持つ node が validate-graph-schema.py PASS で登録できる
  - 選定 receipt に 目的・背景・MVP 適合の判断根拠が記録される
  - qa-066 由来の既存品質ゲートの検査が非退行である
- Architecture/source refs:
  - architecture/harness-hub-dev-workflow.md
  - system-spec/dev-workflow.md (qa-069)

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Phase acceptance

- MVP 適合度を持つ task と品質先行 task が混在する入力で、next が MVP 適合 task を先に選定する
- 同一入力で next を再実行しても選定 batch と順序が一致する (冪等)
- MVP 判断軸 metadata を持つ node が validate-graph-schema.py PASS で登録できる
- 選定 receipt に 目的・背景・MVP 適合の判断根拠が記録される
- qa-066 由来の既存品質ゲートの検査が非退行である

## 参照情報

- goal-spec: goal-spec.json (parent_feature=feat-mvp-first-scheduling, feature_context_digest=sha256:b0d003254ac6f42d4616dfff30ab605e355c09c9abe642b71559cea6a49e6291)
- 仕様正本: system-spec/dev-workflow.md qa-069 (dev-graph/beads タスク優先度選定の MVP ファースト化)
- trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 依存

- `SYS-MVP-FIRST-SCHEDULING-P02`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
