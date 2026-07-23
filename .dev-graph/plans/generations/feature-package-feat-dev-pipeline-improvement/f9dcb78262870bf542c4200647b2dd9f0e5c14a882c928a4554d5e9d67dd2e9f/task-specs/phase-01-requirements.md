# System task overlay: 要件ベースライン確定 — 開発管理パイプライン改善 8 要件の baseline 文書化

## Machine-readable registration fields

- feature_package_id: feature-package/feat-dev-pipeline-improvement (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-dev-pipeline-improvement", "macro-feature", "dev-pipeline", "documentation"]
- related_nodes: ["feat-dev-pipeline-improvement", "arch-harness-hub-dev-workflow"]
- parent_feature: feat-dev-pipeline-improvement
- phase_ref: P01
- classification: confidence=0.87, reason="qa-067 の開発管理パイプライン改善 8 要件のうち P01 責務 (要件ベースライン確定 — 開発管理パイプライン改善 8 要件の baseline 文書化) を実行する task", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p01.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

qa-067 で確定した開発管理パイプライン改善 8 要件と goal-spec の purpose/goal/scope_in 8 件/scope_out 4 件/acceptance 7 件/quality_constraints 6 件 (id 単位) を machine-verifiable な要件ベースラインとして固定し、P02 以降の全 task が同一の合意事項を参照できる状態にする。

## 背景

system-spec/dev-workflow.md の qa-067 は、2026-07-21 の運用実態調査 (eval-log 直下 90 ファイル・improvement-handoff 94 findings 中 87 件消化不明・解決済み事象の open 残置) に基づき 8 要件を確定した。本 task はこれを再解釈や欠落なく baseline 化し、P02 で確定すべき事項 (検査 script の入出力契約・handoff schema の後方互換方式・eval-log 再配置の対象一覧) を据置事項として明記する。

## 前提条件

- Macro entry gate: `parent_feature.depends_on all done|closed`。canonical parent feature の現行depends_onを都度評価し、task edgeへ複製しない。
- Required spec/architecture/phase/task nodes: feat-dev-pipeline-improvement, arch-harness-hub-dev-workflow
- Entry gate: goal-spec.json の feature_context_digest が sha256:16d9e07bc878c21e6054ba7f178d2d1fc5e303961a297f9a5949a20f328e5085 に一致し、features/feat-dev-pipeline-improvement.md の frontmatter と goal-spec の purpose/goal/scope_in/scope_out/acceptance が逐語一致すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない
- feature内依存なし。P01の場合はparent featureのmacro entry gateを実行時に評価する。

## Workstream applicability

- Frontend: N/A: 本 feature は開発管理パイプラインの改善であり frontend 実装物を変更しない
- Backend: N/A: Hub 本体の backend 実装物を変更しない (scope_out)
- API: N/A: Hub 本体の API を変更しない (scope_out)
- Data: N/A: Hub 本体の DB/schema を変更しない (scope_out)
- Infrastructure: N/A: デプロイ基盤を変更しない。CI workflow の lint 追加は Quality/Operations で扱う
- Security: N/A: 本 phase は認可・秘密情報の取り扱いを変更しない
- Quality: applicable + change: goal-spec acceptance 7 件と quality_constraints 6 件を machine-verifiable な受入基準として固定する
- Documentation: applicable + change: docs/features/feat-dev-pipeline-improvement/requirements-baseline.md を新規作成する
- Operations: N/A: 本 phase は運用手順を変更しない

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-dev-workflow (features/feat-dev-pipeline-improvement.context.json architecture_refs の正本参照)
- Deploy unit/environment: dev-tooling/repository (plugins/dev-graph の script・schema・規約文書。Cloudflare Workers へのデプロイは伴わない)
- Compatibility/migration/backfill: 既存 promoted package・証跡の digest を失効させない (quality_constraints digest-immutability)。実データ migration は P08 が所有する

## 成果物

- Produced artifacts:
- docs/features/feat-dev-pipeline-improvement/requirements-baseline.md
- Consumed artifacts: goal-spec.json, features/feat-dev-pipeline-improvement.context.json, architecture/harness-hub-dev-workflow.md, system-spec/dev-workflow.md (qa-067)
- Write scope/touches: docs/features/feat-dev-pipeline-improvement/requirements-baseline.md

## Tracker publication and completion

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-dev-pipeline-improvement-p01) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-dev-pipeline-improvement-p01 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-dev-pipeline-improvement-p01) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on が空のため他 task との着手順序制約はない。resource_scope (docs/features/feat-dev-pipeline-improvement/requirements-baseline.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- Hub プロダクト本体機能 (Web/API/DB) の変更
- dev-graph への新 verb 追加
- bd CLI 本体の変更
- graph.json 分割の実装 (トリガー記録のみ)
- 本 phase の責務外の成果物生成 (他 phase の write scope への書込)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: requirements-baseline.md に goal-spec の全項目が過不足なく転記され、qa-067 の 8 要件との対応表が含まれること

## Rollout and rollback

- Rollout: 成果物を write scope の範囲で作成・更新し、acceptance を満たしたことを確認してから次 phase へ引き継ぐ
- Rollback trigger and steps: goal-spec との逐語一致に齟齬が見つかった場合、requirements-baseline.md を修正し本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-dev-pipeline-improvement.context.json` (`sha256:16d9e07bc878c21e6054ba7f178d2d1fc5e303961a297f9a5949a20f328e5085`)
- Phase responsibility: 現行 context の purpose・goal・scope・acceptance のうち本 phase 責務の部分集合を所有する。
- Purpose: 開発管理パイプライン (dev-graph 11 verb・beads・plugin-plans・eval-log・成果物管理) の運用実態調査 (qa-067) で検出された整合性・肥大化・消化状態の課題を解消し、G1/G4/G5 を支える開発基盤の健全性を回復する
- Goal: qa-067 の 8 要件が実装され、解決済み事象の open 残置・eval-log 直下残置・未消化 findings が決定論検査で 0 件に収束し、再実行しても同じ結果になる状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- lifecycle close-loop の機械化 (open 残置検出と md/graph/beads 3 表現の同時 close 導線)
- eval-log/ 配置規約の明文化と CI lint 強制
- improvement-handoff schema への disposition 必須化と未消化 findings の beads 起票
- tasks/ frontmatter status の意味論明記
- graph.json 肥大対策の再検討トリガー記録
- dev-graph 中核 handoff 31 findings の差分監査と disposition 遡及付与
- spec-drift-guardian の verdict close gate 配線
- 陳腐化文書の定期棚卸し GC の sync verb 運用組込み
- Scope out:
- Hub プロダクト本体機能 (Web/API/DB) の変更
- dev-graph への新 verb 追加
- bd CLI 本体の変更
- graph.json 分割の実装 (トリガー記録のみ)
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- 解決済み事象の open 残置を検出する決定論検査が存在し、issue-bd-bridge-notes-passthrough-20260721 が close-loop で閉じている
- eval-log/ 配置規約が README に明文化され、CI lint が直下残置・バイト同一重複・1MB 超の git 追跡を遮断する
- improvement-handoff schema に per-finding disposition と根拠 ref が必須化され、既存 21 ファイル 94 findings に消化状態が付与されている
- task template に status = 文書ライフサイクル (active/superseded) の意味論が明記され、実行状態の二重正本が無い
- graph.json 分割の再検討トリガーが仕様に記録されている
- spec-drift-guardian の C03/C04 verdict が close gate に配線され、proposal のみでの close が遮断される
- 陳腐化文書の棚卸し手順が sync verb 運用に組み込まれている
- Architecture/source refs:
- architecture/harness-hub-dev-workflow.md
- specs/harness-hub-system-specification.md
- system-spec/dev-workflow.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Phase acceptance

- requirements-baseline.md に goal-spec.json の purpose/goal/scope_in 8 件/scope_out 4 件/acceptance 7 件/quality_constraints 6 件 (id 単位) が逐語一致で転記されている
- 現行 feature context sha256:16d9e07bc878c21e6054ba7f178d2d1fc5e303961a297f9a5949a20f328e5085 の scope_in/acceptance 全件が P01 責務として追跡され、未割当 0 件である
- P02 で確定すべき据置事項 (検査 script 入出力契約・handoff schema 後方互換方式・eval-log 再配置対象一覧・close-loop の bd-bridge 経由手順) が明記されている

## 参照情報

- goal-spec: goal-spec.json (parent_feature=feat-dev-pipeline-improvement, feature_context_digest=sha256:16d9e07bc878c21e6054ba7f178d2d1fc5e303961a297f9a5949a20f328e5085)
- 仕様正本: system-spec/dev-workflow.md qa-067 (開発管理パイプライン改善 8 要件)
- trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.
