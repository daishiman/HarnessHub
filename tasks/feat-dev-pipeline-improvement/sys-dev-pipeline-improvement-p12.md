---
graph_node_id: "SYS-DEV-PIPELINE-IMPROVEMENT-P12"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-dev-pipeline-improvement"
domain: "operations"
tags: ["feat-dev-pipeline-improvement","macro-feature","dev-pipeline","operations"]
priority: null
start_date: null
target_date: null
iteration: null
title: "運用文書化 — 棚卸し GC と close-loop の sync 運用組込み手順"
owners: ["daishiman"]
created_at: "2026-07-25T16:38:15Z"
updated_at: "2026-07-30T02:46:06Z"
status: "active"
depends_on: ["SYS-DEV-PIPELINE-IMPROVEMENT-P11"]
related_nodes: ["feat-dev-pipeline-improvement","arch-harness-hub-dev-workflow"]
resource_scope: ["docs/features/feat-dev-pipeline-improvement/operations.md"]
purpose: "陳腐化文書の棚卸し GC (解決済み open issue・0-findings handoff の定期整理) と lifecycle close-loop の運用手順を文書化し、sync verb の運用に組み込む。"
goal: "P12 の受入条件と品質ゲートを満たし、再実行可能な検証証跡を残す"
scope_in: ["docs/features/feat-dev-pipeline-improvement/operations.md"]
scope_out: ["Hub プロダクト本体機能 (Web/API/DB) の変更","dev-graph への新 verb 追加","bd CLI 本体の変更","graph.json 分割の実装 (トリガー記録のみ)","本 phase の責務外の成果物生成 (他 phase の write scope への書込)"]
acceptance: ["operations.md に棚卸し GC の周期・対象抽出コマンド・close-loop の 3 表現 (md/graph/beads) 同時クローズ手順が記録されている","手順が choke-point (bd-bridge) と単一 writer (upsert-node) を迂回しないことが明記されている"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: "feat-dev-pipeline-improvement"
feature_package_id: "feature-package/feat-dev-pipeline-improvement"
phase_ref: "P12"
file_path: "tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p12.md"
template_id: "task"
template_version: "1.1.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"af8a73df2d7518c1dcfb972254b44ca993801e7ddac1dd1f98ab60e7d1affda6","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-dev-pipeline-improvement/af8a73df2d7518c1dcfb972254b44ca993801e7ddac1dd1f98ab60e7d1affda6/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-25T16:38:15Z","origin_kind":"system-dev-planner","source_digest":"af8a73df2d7518c1dcfb972254b44ca993801e7ddac1dd1f98ab60e7d1affda6","source_path":".dev-graph/plans/generations/feature-package-feat-dev-pipeline-improvement/af8a73df2d7518c1dcfb972254b44ca993801e7ddac1dd1f98ab60e7d1affda6/task-specs/phase-12-documentation-operations.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.87
classification_reason: "qa-067 の開発管理パイプライン改善 8 要件のうち P12 責務 (運用文書化 — 棚卸し GC と close-loop の sync 運用組込み手順) を実行する task"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p12.md","confidence":0.87}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-21T15:10:00Z","missing_sections":[],"status":"complete"}
---

# System task overlay: 運用文書化 — 棚卸し GC と close-loop の sync 運用組込み手順

## Machine-readable registration fields

- feature_package_id: feature-package/feat-dev-pipeline-improvement (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-dev-pipeline-improvement", "macro-feature", "dev-pipeline", "operations"]
- related_nodes: ["feat-dev-pipeline-improvement", "arch-harness-hub-dev-workflow"]
- parent_feature: feat-dev-pipeline-improvement
- phase_ref: P12
- classification: confidence=0.87, reason="qa-067 の開発管理パイプライン改善 8 要件のうち P12 責務 (運用文書化 — 棚卸し GC と close-loop の sync 運用組込み手順) を実行する task", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p12.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

陳腐化文書の棚卸し GC (解決済み open issue・0-findings handoff の定期整理) と lifecycle close-loop の運用手順を文書化し、sync verb の運用に組み込む。

## 背景

qa-067 要件 1 と 8 の運用面の恒久化である。検査 (lint-open-residue) が検出した残置をどの経路で閉じるか (bd-bridge 経由・md/graph は upsert-node 経由) を、choke-point-preservation を守る形で手順化する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-dev-pipeline-improvement, arch-harness-hub-dev-workflow
- Entry gate: goal-spec.json の feature_context_digest が sha256:0dcdff8e099067cabb0810cbd7df5a0c90dcdd068c0f6f4b29c19bcf3745df89 に一致し、features/feat-dev-pipeline-improvement.md の frontmatter と goal-spec の purpose/goal/scope_in/scope_out/acceptance が逐語一致すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない
- 直前 phase (SYS-DEV-PIPELINE-IMPROVEMENT-P11) の完了に依存する (直列 DAG)。

## Workstream applicability

- Frontend: N/A: 本 feature は開発管理パイプラインの改善であり frontend 実装物を変更しない
- Backend: N/A: Hub 本体の backend 実装物を変更しない (scope_out)
- API: N/A: Hub 本体の API を変更しない (scope_out)
- Data: N/A: Hub 本体の DB/schema を変更しない (scope_out)
- Infrastructure: N/A: デプロイ基盤を変更しない。CI workflow の lint 追加は Quality/Operations で扱う
- Security: N/A: 本 phase は認可・秘密情報の取り扱いを変更しない
- Quality: N/A: 本 phase は検査・テストの変更を行わない
- Documentation: applicable + change: docs/features/feat-dev-pipeline-improvement/operations.md を新規作成する
- Operations: applicable + change: GC と close-loop の運用手順を確定する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-dev-workflow (features/feat-dev-pipeline-improvement.context.json architecture_refs の正本参照)
- Deploy unit/environment: dev-tooling/repository (plugins/dev-graph の script・schema・規約文書。Cloudflare Workers へのデプロイは伴わない)
- Compatibility/migration/backfill: 既存 promoted package・証跡の digest を失効させない (quality_constraints digest-immutability)。実データ migration は P08 が所有する

## 成果物

- Produced artifacts:
- docs/features/feat-dev-pipeline-improvement/operations.md
- Consumed artifacts: goal-spec.json, features/feat-dev-pipeline-improvement.context.json, architecture/harness-hub-dev-workflow.md, system-spec/dev-workflow.md (qa-067)
- Write scope/touches: docs/features/feat-dev-pipeline-improvement/operations.md

## Tracker publication and completion

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-dev-pipeline-improvement-p12) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-dev-pipeline-improvement-p12 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-dev-pipeline-improvement-p12) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: 直前 phase 完了後にのみ着手する (直列 DAG)。resource_scope (docs/features/feat-dev-pipeline-improvement/operations.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- Hub プロダクト本体機能 (Web/API/DB) の変更
- dev-graph への新 verb 追加
- bd CLI 本体の変更
- graph.json 分割の実装 (トリガー記録のみ)
- 本 phase の責務外の成果物生成 (他 phase の write scope への書込)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: operations.md の手順どおりに issue-bd-bridge-notes-passthrough-20260721 を閉じられることの机上検証記録

### 2026-07-29 横断品質ゲート追補

`HarnessHub-9ndl` / `HarnessHub-dyxr` の最終レビューは、P12 の「運用手順を再現可能な証拠へする」責務へ次を追補した。live-trial verdict の observation は run directory 内の実在ファイルへ解決し、scenario 更新・削除で旧証拠を失効させる。scenario が必須・禁止手順を持つ場合は task.md も照合し、別 operation への読み替えを許さない。監査値は pre/post state と永続 graph から導出し、起動引数や dry-run echo を代理値にしない。昇格証跡は最終 persisted node の正準 digest と突合し、同じ graph の gate 違反を正準 validator が拒否することを負の検体で確認する。実測コマンドと受領結果は `docs/features/feat-dev-pipeline-improvement/live-trial-acceptance-hardening-spec-reflection.md` に記録する。

再実行結果は PR #598 の最新 `main` (`bb95580`) 統合後ツリーで広域 pytest 9308 passed / 7 skipped、repository CI 123 PASS / 4 既存 WARN / 0 FAIL、現行 task package P01〜P13 violations 0、fresh r7 live-trial beads/none 2 系列 PASS である。live-trial は統合後も有効な behavior closure `c0d843d7…4801` へ束縛し、旧 reaper による別 worktree session 回収は main の ownership 契約で解消した。

## Inner goal-seek execution loop

- Methodology contract: `system-task-goal-seek/v1`
- Goal: P12 の Phase acceptance と Verification and evidence をすべて満たす
- Generic execution prompt: 目的・背景・前提条件・write scope・成果物・受け入れ条件を入力に、実装手段を固定せず最小の安全な変更を行う
- Rubric: acceptance 全件、回帰テスト、必須証跡、write scope、依存整合がすべて PASS
- Feedback loop: 実装→独立評価→finding を次の prompt へ反映→再実行し、`rubric verdict=PASS` まで反復する。上限到達時は fail-closed
- P13 spec/architecture writeback: N/A: P13 owns writeback

## Rollout and rollback

- Rollout: 成果物を write scope の範囲で作成・更新し、acceptance を満たしたことを確認してから次 phase へ引き継ぐ
- Rollback trigger and steps: 手順が実態と乖離した場合、operations.md を修正し P09 の実測と再整合させる

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-dev-pipeline-improvement.context.json` (`sha256:0dcdff8e099067cabb0810cbd7df5a0c90dcdd068c0f6f4b29c19bcf3745df89`)
- Phase responsibility: 現行 context の purpose・goal・scope・acceptance のうち本 phase 責務の部分集合を所有する。
- Purpose: 開発管理パイプライン (dev-graph 11 verb・beads・plugin-plans・eval-log・成果物管理) の運用実態調査 (qa-067) で検出された整合性・肥大化・消化状態の課題を解消し、G1/G4/G5 を支える開発基盤の健全性を回復する。あわせて qa-071 で確定した開発管理の方法論 (マクロ構造・exact-13・外側/内側ループ・スコープ分離・情報配置・書き戻し・既存保全と更新統制) を本 feature の 13 フェーズ実行契約として明示的に採用し、feature context から task spec まで意味的に伝播する
- Goal: qa-067 の 8 要件が実装され、解決済み事象の open 残置・eval-log 直下残置・未消化 findings が決定論検査で 0 件に収束し、再実行しても同じ結果になる状態。加えて qa-071 の方法論要件が goal-spec と P01..P13 task spec の実行契約 (外側ループの目的/背景/ゴール固定・内側ループの goal-seek 反復・スコープ分離・情報配置=正本参照と lineage のみ・P13 書き戻し) として trace され、tag/lineage 一致だけでは PASS しない semantic coverage 検査で保証された状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- lifecycle close-loop の機械化 (open 残置検出と md/graph/beads 3 表現の同時 close 導線)
- eval-log/ 配置規約の明文化と CI lint 強制
- improvement-handoff schema への disposition 必須化と未消化 findings の beads 起票
- tasks/ frontmatter status の意味論明記
- graph.json 肥大対策の再検討トリガー記録
- dev-graph 中核 handoff 31 findings の差分監査と disposition 遡及付与
- spec-drift-guardian の verdict close gate 配線
- 陳腐化文書の定期棚卸し GC の sync verb 運用組込み
- qa-071 方法論要件 (外側/内側ループ・スコープ分離・情報配置・P13 書き戻し) の feature context・goal-spec・P01..P13 task spec への意味的伝播と semantic coverage 検査の恒常化
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
- feature の purpose/goal/scope_in/acceptance と context JSON・goal-spec が qa-071 の方法論要件 (マクロ構造・exact-13・外側/内側ループ・スコープ分離・情報配置・書き戻し・既存保全と更新統制) を明示的に保持している
- P01..P13 の task spec が外側ループの目的/背景/ゴール固定・内側ループの goal-seek 反復契約・スコープ分離・情報配置 (正本への参照と lineage のみ)・P13 の仕様/architecture への書き戻しを実行可能な形で trace している
- validate-system-plan.py と system-dev-plan-evaluator が、feature 宣言 qa 要件の spec-state qa_log 登録と goal-spec/task spec への semantic coverage を tag/lineage 一致だけで PASS にせず fail-closed 検証している
- Architecture/source refs:
- architecture/harness-hub-dev-workflow.md
- specs/harness-hub-system-specification.md
- system-spec/dev-workflow.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.
## Phase acceptance

- operations.md に棚卸し GC の周期・対象抽出コマンド・close-loop の 3 表現 (md/graph/beads) 同時クローズ手順が記録されている
- 手順が choke-point (bd-bridge) と単一 writer (upsert-node) を迂回しないことが明記されている

## 参照情報

- goal-spec: goal-spec.json (parent_feature=feat-dev-pipeline-improvement, feature_context_digest=sha256:0dcdff8e099067cabb0810cbd7df5a0c90dcdd068c0f6f4b29c19bcf3745df89)
- 仕様正本: system-spec/dev-workflow.md qa-067 (開発管理パイプライン改善 8 要件) / qa-071 (開発管理方法論 8 要件: マクロ構造・exact-13・外側/内側ループ・スコープ分離・情報配置・書き戻し・既存保全と更新統制。spec-state qa_log 登録済み・appr-009 承認)
- trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-dev-pipeline-improvement` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。

## 2026-07-28 実装後の運用追補

本 P12 の promoted task spec と完了判定は変更しない。後続の repository 横断課題
`HarnessHub-7xi9` で、並列 worktree の ref ずれを予防・検知・復旧する runbook を
`docs/worktree-parallel-operations-runbook.md` へ追加した。仕様正本は
`system-spec/dev-workflow.md` `qa-088`、設計正本は
`architecture/harness-hub-dev-workflow.md` とする。

再検証は `python3 scripts/validate-git-hooks-wiring.py --check-local-config` と、
対象 3 test file の pytest を使う。stash は `stash@{N}` でなく固有メッセージから得た
commit SHA で参照し、古い branch でも git common dir の共有 hook bundle を使う。

## 2026-07-29 実装後の live-trial 運用追補

本 P12 の promoted task spec と完了判定は変更しない。live-trial の通常終了では、
boot READY 行の `OWNER_PID` と同じ値を
`reap --run-id "$RUN_ID" --owner-pid "$OWNER_PID"` へ渡す。
現在の shell の `$$` で代用しない。

引数なし `reap` と、通常フローでの `reap --all` は禁止する。
`--all` は tmux server 上の全 live-trial session を管理者が明示回収する場合だけ使う。
障害調査で metadata 無し session を見つけても通常 reaper は削除しないため、
必要性と対象を確認してから個別 `kill-session` または管理者 `--all` を選ぶ。
詳細は `docs/worktree-parallel-operations-runbook.md` と system-spec `qa-090` を正とする。

## 2026-07-29 C11 artifact 本文の運用追補

本 P12 の promoted task spec と完了判定は変更しない。Dev Graph node を新規作成または
本文再生成するときは、template の placeholder を残したまま C02 を完了扱いにしない。

本文を用意できない場合は node を投影せず、必須節名を `missing_sections` として返して
停止する。既存本文を残す metadata-only update は `--body-file` を省略してよい。
壊れた本文を復旧する場合は、required section に具体的内容を持つ body file を
repository 内の一時領域から明示的に渡す。`--regenerate-body` だけで placeholder template
へ戻す操作は C11 が rollback する。

仕様正本は `system-spec/dev-workflow.md` `qa-092`、設計正本は
`architecture/harness-hub-dev-workflow.md`、plugin 内部契約は
`plugins/dev-graph/templates/README.md` とする。

## 2026-07-29 skill tree lint 品質ゲート追補

`HarnessHub-xswf` の最終レビューでは、focused test だけでなく
per-plugin pytest の直後に repository criteria test を実行する順序回帰を必須にした。
test tool が生成する dot cache は skill tree の設計物ではないため除外し、
通常の nested directory 違反は引き続き fail-closed で拒否する。

仕様反映は `system-spec/testing-qa.md` qa-095、
`architecture/harness-hub-testing-qa.md`、
`specs/harness-hub-system-specification.md`、
`features/feat-dev-pipeline-improvement.md` に同一 wave で記録する。
検証コマンドと結果の受領書は
`docs/features/feat-dev-pipeline-improvement/skill-tree-cache-spec-reflection-receipt.md`
を正とする。

## 2026-07-30 `HarnessHub-ml57` 仕様反映記録

CI-local parity は qa-088、集約仕様、architecture、feature、P09/P12/P13 へ反映し、製品非変更とした。
`docs/features/feat-dev-pipeline-improvement/local-ci-parity-spec-reflection-receipt.md` を正とする。

## 2026-07-30 HarnessHub-foq6 仕様反映追補

promoted task spec は変えず、空走査を `appr-015` で R4 reopen して qa-096 へ再確定し、旧 ID は履歴に保つ。
各仕様層を同一 wave で同期し、製品非変更の判断と検証は
`docs/features/feat-dev-pipeline-improvement/foq6-workflow-step-guard-spec-reflection.md` を正とする。
pre-merge 評価済みの旧 ID は意味を変えず、競合解消時にのみ移した。

## 2026-07-30 ID 一意性 gate の write-back

本 P12 の promoted task spec と完了判定は変更しない。後続の standalone issue
`HarnessHub-ory6` で、task graph、consult transcript、route build handoff の
ID が `set` / `dict` 化される前に一意であることを検査する横断 gate を実装した。

負例 fixture は同じ ID の別内容を投入し、公開 CLI の非 0 終了と正常系の exit 0 維持を確認する。
500 行超の validator / test は report contract、graph shape、shape regression に責務分離し、
公開 CLI path と JSON 出力契約を変えない。

仕様正本への実装フィードバックは `system-spec/testing-qa.md`、集約仕様は
`specs/harness-hub-system-specification.md`、設計は
`architecture/harness-hub-testing-qa.md`、実装・検証・残課題の対応は
`docs/features/feat-dev-pipeline-improvement/qa33ho-spec-reflection-receipt.md`
を正とする。
