# System task overlay: 実装 — build 時の commit 識別子埋込・認証なし読出経路・鮮度検査 script

> 原因究明の確定出典: `system-spec/spec-state.json` の qa-198 (本番が古いビルドのままだったこと), qa-199 (是正範囲), および `specs/harness-hub-post-signin-landing-observability-addendum.md`。

## Machine-readable registration fields

- feature_package_id: feature-package/feat-build-identity-deploy-freshness (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-build-identity-deploy-freshness", "macro-feature", "infrastructure", "phase-p05"]
- related_nodes: ["feat-build-identity-deploy-freshness", "arch-harness-hub-infrastructure", "arch-harness-hub-testing-qa"]
- parent_feature: feat-build-identity-deploy-freshness
- phase_ref: P05
- classification: confidence=0.92, reason="goal-spec.json を入力に P05 の単一責務 (infrastructure) を実行する task", candidates=[{artifact_kind: task, confidence: 0.92, candidate_path: tasks/feat-build-identity-deploy-freshness/sys-build-identity-p05.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 の決定と P04 のテスト ID に従い、埋込・読出・鮮度検査の 3 点を実装する。これが利用者の当初の困りごと (本番が古いビルドのままだった) の再発検出の本体である。

## 背景

利用者が本番 https://harness-hub.daishimanju.workers.dev/harness-hub/signin から サインインしても業務画面へ到達しない、という申告を起点に原因究明を行った結果、認証そのものは成功しており、本番の signin ページが戻り先 (callbackUrl) に / を送っていたことが確定原因であった。着地先を /sheets へ直した変更は 2026-08-03 に repository へ入っているが、2026-08-07 時点の本番へ反映されていない。すなわち利用者が見ていた不具合は、コードの欠陥ではなく『修正済みのコードが稼働していない』状態であり、その状態を誰も検出できなかったことが本質的な問題である。本 feature は、稼働中の成果物がどの commit に対応するかを認証なしで確認でき、既定 branch の HEAD より古い状態が続いていることを機械的に検出する仕組みを立てる。確定出典は specs/harness-hub-post-signin-landing-observability-addendum.md、および system-spec/spec-state.json の qa-198 (原因の確定) と qa-199 (是正範囲) である。なお本 feature は着地先そのもの (callbackUrl の解決規則) を所有しない。それは feat-post-signin-scope-routing と feat-post-signin-transition-observability の担当であり、本 feature が所有するのは『稼働ビルドの素性が見えること』と『古いまま放置されないこと』に限られる。

## 前提条件

- Macro entry gate: `parent_feature.depends_on all done|closed`。canonical parent feature の現行 depends_on を都度評価し、task edge へ複製しない。

- Required spec/architecture/phase/task nodes: feat-build-identity-deploy-freshness, arch-harness-hub-infrastructure, arch-harness-hub-testing-qa
- Entry gate: goal-spec.json の feature_context_digest が sha256:7bf56a6a0dc09acc304489580452da003fe975d74de8d299906c48364e5c0a3c に一致し、features/feat-build-identity-deploy-freshness.md が dev-graph へ登録済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature は画面の見た目と遷移規則を変更しない (着地先の解決は別 feature が所有する)
- Backend: applicable + change: 認証なし読出経路を追加する
- API: N/A: 公開する読出経路の契約は P02 が定義し、本 task では変更しない
- Data: N/A: 本 feature は新規テーブルと永続データを設けない
- Infrastructure: applicable + change: CI の build 時に commit 識別子を埋め込み、鮮度検査を実行する
- Security: applicable + change: 露出 field を commit 識別子と build 時刻に限定する
- Quality: applicable + change: 鮮度検査 script を既存 check-*.mjs 系列へ追加する
- Documentation: N/A: 本 task では文書を新規作成しない
- Operations: N/A: 運用手順の具体化は P12 が行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure, arch-harness-hub-testing-qa (features/feat-build-identity-deploy-freshness.md architecture_refs の正本参照)
- Deploy unit/environment: cloudflare-workers/hub (apps/hub は Hub Worker にバンドルされる。本 feature は deploy の実行を scope_out とするため、いずれの task もデプロイを行わない)
- Compatibility/migration/backfill: N/A: 本 feature は schema 変更と backfill を伴わない

## 成果物

- Produced artifacts: commit 識別子の build 時埋込 (CI)、認証を要求しない読出経路 (apps/hub/src/app/api/health 配下)、鮮度検査 script (apps/hub/scripts/check-deploy-freshness.mjs)
- Consumed artifacts: goal-spec.json, features/feat-build-identity-deploy-freshness.md, features/feat-build-identity-deploy-freshness.context.json, specs/harness-hub-post-signin-landing-observability-addendum.md, architecture/harness-hub-infrastructure.md, architecture/harness-hub-testing-qa.md, system-spec/spec-state.json
- Write scope/touches: apps/hub/src/app/api/health, apps/hub/scripts/check-deploy-freshness.mjs, .github/workflows/ci.yml

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-build-identity-p05) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-build-identity-p05 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-build-identity-p05) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on は SYS-BUILD-IDENTITY-P04 であり、直前 phase の完了後にのみ着手する。resource_scope (apps/hub/src/app/api/health, apps/hub/scripts/check-deploy-freshness.mjs, .github/workflows/ci.yml) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- サインイン後の着地先の解決規則そのものの変更 (owner=feat-post-signin-scope-routing)
- 遷移経路の観測と継続検証の仕組み (owner=feat-post-signin-transition-observability)
- 実行時環境変数の解決規律 (owner=feat-runtime-env-resolution-discipline)
- 本番への deploy 実行 (P13 が所有)
- テストの実行 (P06 が所有)

## テスト戦略

- テストレベル選定: 単体・結合・境界値・回帰の 4 レベルを成果物の性質に応じて適用し、適用外のレベルは証跡内で理由を明記する。
- カバレッジ目標: 実行コードを変更する場合は既定 80% 以上を維持し、文書のみの場合も受入条件の全項目を検査する。
- 層別方針: applicable な Frontend は behavior、Backend・API・Data は API 契約と DB 結合、Infrastructure は IaC と smoke を検査する。N/A の層は `Workstream applicability` の理由を維持する。
- 保守性制約: pixel 位置依存と DOM 構造依存のテストを禁止し、公開契約ではなく実装詳細へ密結合する過剰なテストを作らない。

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-build-identity-deploy-freshness`
- Required evidence: 本 task の受入条件 (下記全件) を満たす証跡。inventory の acceptance と本節は同一内容であり、片方だけを見て判定しない。
- 稼働中の成果物から、それが repository のどの commit に対応するかを認証なしで確認できる
- commit 識別子の埋込が CI の build 時に自動で行われ、手動更新に依存しない
- 稼働ビルドが既定 branch の HEAD より古い状態が続いていることを検出できる
- commit 識別子の露出が、内部 path・secret・個人データを含まない

## Inner goal-seek execution loop

- Methodology contract: `system-task-goal-seek/v1`
- Goal: 本 task の「目的」と「成果物」に定義した単一責務を、受入条件を削らず再実行可能な証跡とともに完了する。
- Generic execution prompt: 目的・背景・前提条件・スコープ・成果物を入力に、手段を固定せず最小の変更で実装と検証を行う。
- Rubric: 受入条件を全件満たし、必要なカバレッジが 80% 以上で、既存テストの回帰が 0 件、証跡が再実行可能で、宣言した write scope 外を変更していれば FAIL とする。
- Feedback loop: 実行後に独立評価し、finding を次の prompt へ反映して再実行する。`rubric verdict=PASS` まで反復し、上限到達時は fail-closed で停止する。
- P13 spec/architecture writeback: N/A: P13 が書き戻しを所有する。

## Rollout and rollback

- Rollout: 実装を write scope 内に限定して行い、P04 のテスト ID がローカルで通ることを確認して P06 へ引き継ぐ
- Rollback trigger and steps: 実装が既存 CI を壊す場合、write scope の 3 path を変更前へ戻し、P03 の制約事項へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-build-identity-deploy-freshness.context.json` (`sha256:7bf56a6a0dc09acc304489580452da003fe975d74de8d299906c48364e5c0a3c`)
- Phase responsibility: 現行 context の purpose・goal・scope・acceptance のうち P05 の責務に対応する部分を扱う。
- Purpose: 本番で動いているビルドが repository のどの commit に対応するかを知る手段が無いため、『コードは直っている』と『本番が直っている』を区別できず、1 回の GET で決まる事実の確定に 10 ラウンド以上を要した。この観測不能状態を解消する。
- Goal: 稼働中の成果物から対応 commit を認証なしで確認でき、稼働ビルドが既定 branch の HEAD より古い状態が続くことを CI が検出する状態にする。
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- 稼働成果物へ commit 識別子を埋め込み、認証なしで読み出せる経路を用意する (V6)
- 稼働ビルドの commit と既定 branch HEAD の乖離が続くことを検出する仕組み (V7)
- 乖離検出の閾値と通知先の決定
- 検出が実際に発火することを test で固定する
- Scope out:
- deploy そのものの実行 (運用操作であり本 feature の成果物ではない)
- deploy pipeline の構成変更 (GitHub Actions 経由という既存経路を維持する)
- 認証を要する管理画面での表示 (認証なしで読めることが要件のため)
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- 稼働中の成果物から、それが repository のどの commit に対応するかを認証なしで確認できる
- commit 識別子の埋め込みが CI の build 時に自動で行われ、手動更新に依存しない
- 稼働ビルドが既定 branch の HEAD より古い状態が続いていることを検出できる
- 検出のしきい値を超えた状態を再現する fixture で、検査が実際に落ちることが test で固定されている
- commit 識別子の露出が、内部 path・secret・個人データを含まない
- Architecture/source refs:
- architecture/harness-hub-infrastructure.md
- architecture/harness-hub-testing-qa.md
- specs/harness-hub-post-signin-landing-observability-addendum.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## 参照情報

- System specification: specs/harness-hub-post-signin-landing-observability-addendum.md, system-spec/spec-state.json qa_log (qa-198, qa-199)
- Detailed authoritative source: apps/hub/scripts (既存 check-*.mjs 系列の呼出し規約), .github/workflows/ci.yml (build と検査の実行位置)
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md), arch-harness-hub-testing-qa (architecture/harness-hub-testing-qa.md)
- Feature: feat-build-identity-deploy-freshness
- Phase doc: N/A: feature-execution-package-contract.md 第 2 節により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-BUILD-IDENTITY-P04
- Trace rule: P04 が実行可能なテスト ID を定義し、P05 がその対象を実装し、P06 が実行し、P07 と P10 は実行済み証跡のみで判定し、P09 は applicable な検査を fail-closed にし、P11 は source digest と再実行コマンドを保存し、P12 と P13 は不足する実装や証跡を文書や計画で代替しない。
