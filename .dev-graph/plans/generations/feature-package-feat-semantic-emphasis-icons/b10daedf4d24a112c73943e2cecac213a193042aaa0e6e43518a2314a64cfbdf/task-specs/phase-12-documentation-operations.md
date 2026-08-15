# System task overlay: ドキュメント/運用 — アイコン追加手順・絵文字 lint 運用・所有境界の runbook 作成

> 原因究明の確定出典: `system-spec/spec-state.json` の qa-232 (ui-ux/web, state=確定)【5 強調表示とアイコン】/【2 カードの情報顕著度】, qa-233 (frontend/web, state=確定)【6 アイコン】/【3 一覧部品の共通化】, および `architecture/harness-hub-design-system.md`。

## Machine-readable registration fields

- feature_package_id: feature-package/feat-semantic-emphasis-icons (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-semantic-emphasis-icons", "macro-feature", "documentation", "phase-p12"]
- related_nodes: ["feat-semantic-emphasis-icons", "arch-harness-hub-design-system", "arch-harness-hub-frontend"]
- parent_feature: feat-semantic-emphasis-icons
- phase_ref: P12
- classification: confidence=0.9, reason="goal-spec.json を入力に P12 の単一責務 (documentation) を実行する task", candidates=[{artifact_kind: task, confidence: 0.9, candidate_path: tasks/feat-semantic-emphasis-icons/sys-emphasis-icons-p12.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

新しい callout 種別・アイコンの追加手順、絵文字 lint の運用手順、packages/ui を唯一の供給元とする所有境界を runbook として運用へ引き渡す。

## 背景

system-spec/spec-state.json の qa-232 (ui-ux/web, state=確定)【5 強調表示とアイコン】は、callout 4 種 ([!POINT]/[!ATTENTION]/[!WARNING]/[!NOTE]) を絵文字で描き分けている状態を問題視し、絵文字はフォント依存で字形も色も端末任せになるため、packages/ui 所有の inline SVG アイコンと配色仕様書 v2 の semantic color token で置き換えることを要求している。同じ qa-232【2 カードの情報顕著度】は、状態・日時・金額・PII・略語の表現でアイコンだけに意味を担わせず可視ラベルを既定とすることも求めている。qa-233 (frontend/web, state=確定)【6 アイコン】は、UI 文言・callout ラベル・空状態文言への絵文字混入を lint で検出し CI へ fail-closed で組み込むこと、および packages/ui のアイコンモジュールを唯一の供給元とする所有境界 (【3 一覧部品の共通化】の同型適用) を求めている。調査の結果、packages/ui/src/icons/index.tsx には callout 用の lightbulb/alertTriangle/alertOctagon/infoCircle の 4 アイコンが既に追加され、packages/ui/src/components/Markdown.tsx の remarkCallouts と Callout コンポーネントが callout 4 種を絵文字を使わず描き分けており、packages/ui/src/tokens/tokens.ts には infoBlue/infoBlueSoft がライトモードでの primarySoft/neutralSoft 混同 (グレー系での判別不能) を解消するために既に追加されている。本 feature の残作業は、この既存実装を破壊せず、(1) 絵文字混入を検出する lint と CI への fail-closed 組込み、(2) 一覧・カードの状態表現 (Badge 等) を同じ token 体系へ揃える監査と実装、(3) 色だけで意味を区別せず必ずアイコン形状か可視ラベルを併置する規則の確認、の 3 点に限定される。

## 前提条件

- Macro entry gate: `parent_feature.depends_on all done|closed`。canonical parent feature の現行 depends_on を都度評価し、task edge へ複製しない。

- Required spec/architecture/phase/task nodes: feat-semantic-emphasis-icons, arch-harness-hub-design-system, arch-harness-hub-frontend
- Entry gate: goal-spec.json の feature_context_digest が sha256:61a528100c82ccf593dd1ba3a0303374aba208a2dedace4df7126cfae4f9bab9 に一致し、features/feat-semantic-emphasis-icons.md が dev-graph へ登録済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は運用文書の作成のみでコードを変更しない
- Backend: N/A: 本 feature は backend 実装物を変更しない
- API: N/A: 本 feature は公開 API を変更しない
- Data: N/A: 本 feature は新規テーブルと永続データを設けない
- Infrastructure: N/A: 本 task は運用文書の作成のみで CI 構成を変更しない
- Security: N/A: 本 task では露出範囲に影響する変更を行わない
- Quality: N/A: 品質ゲートの確認は P09/P10 が所有する
- Documentation: applicable + change: runbook.md を新規作成する
- Operations: applicable + change: アイコン追加手順・lint 運用・所有境界の運用ルールを確定する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-design-system, arch-harness-hub-frontend (features/feat-semantic-emphasis-icons.md architecture_refs の正本参照)
- Deploy unit/environment: cloudflare-workers/hub (apps/hub は Hub Worker にバンドルされ packages/ui を利用する。本 feature は deploy の実行を scope_out とするため、いずれの task もデプロイを行わない)
- Compatibility/migration/backfill: N/A: 本 feature は schema 変更と backfill を伴わない

## 成果物

- Produced artifacts: docs/features/feat-semantic-emphasis-icons/runbook.md (アイコン追加手順・絵文字 lint 運用手順・所有境界の運用ルール)
- Consumed artifacts: goal-spec.json, features/feat-semantic-emphasis-icons.context.json, architecture/harness-hub-design-system.md, architecture/harness-hub-frontend.md, system-spec/spec-state.json, packages/ui/src/icons/index.tsx, packages/ui/src/components/Markdown.tsx, packages/ui/src/tokens/tokens.ts
- Write scope/touches: docs/features/feat-semantic-emphasis-icons/runbook.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-emphasis-icons-p12) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-emphasis-icons-p12 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-emphasis-icons-p12) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on は SYS-EMPHASIS-ICONS-P11 であり、直前 phase の完了後にのみ着手する。resource_scope (docs/features/feat-semantic-emphasis-icons/runbook.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 配色仕様書 v2 そのものの改訂 (architecture/harness-hub-design-system.md の所有)
- 各画面の情報構造・機能追加 (feat-card-list-shell の担当)
- Markdown のカードブロック記法 (feat-card-block-authoring の担当)
- 公開 API・DB schema・認可判定・Cloudflare deploy unit の変更
- 実装コードの変更 (本 task は運用文書の作成のみ)

## テスト戦略

- テストレベル選定: 単体・結合・境界値・回帰の 4 レベルを成果物の性質に応じて適用し、適用外のレベルは証跡内で理由を明記する。
- カバレッジ目標: 実行コードを変更する場合は既定 80% 以上を維持し、文書のみの場合も受入条件の全項目を検査する。
- 層別方針: applicable な Frontend は behavior、Infrastructure は IaC と smoke を検査する。N/A の層は `Workstream applicability` の理由を維持する。
- 保守性制約: pixel 位置依存と DOM 構造依存のテストを禁止し、公開契約 (Icon name / calloutStyle / semantic token 名) ではなく実装詳細へ密結合する過剰なテストを作らない。

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-semantic-emphasis-icons`
- Required evidence: 本 task の受入条件 (下記全件) を満たす証跡。inventory の acceptance と本節は同一内容であり、片方だけを見て判定しない。
- runbook.md に、新しい callout 種別やアイコンを packages/ui/src/icons/index.tsx へ追加する際の手順 (iconNames への追加・iconPaths への SVG 追加・aria-label 方針) が記載されている
- 絵文字 lint (scripts/lint-ui-text-emoji.py) が誤検知した場合の対処手順と、CI で fail した場合の切り分け手順が記載されている
- packages/ui を唯一のアイコン供給元とする所有境界 (apps/hub 側で新規アイコンライブラリを追加しない旨) が運用ルールとして明記されている

## Inner goal-seek execution loop

- Methodology contract: `system-task-goal-seek/v1`
- Goal: 本 task の「目的」と「成果物」に定義した単一責務を、受入条件を削らず再実行可能な証跡とともに完了する。
- Generic execution prompt: 目的・背景・前提条件・スコープ・成果物を入力に、手段を固定せず最小の変更で実装と検証を行う。
- Rubric: 受入条件を全件満たし、必要なカバレッジが 80% 以上で、既存テストの回帰が 0 件、証跡が再実行可能で、宣言した write scope 外を変更していれば FAIL とする。
- Feedback loop: 実行後に独立評価し、finding を次の prompt へ反映して再実行する。`rubric verdict=PASS` まで反復し、上限到達時は fail-closed で停止する。
- P13 spec/architecture writeback: N/A: P13 が書き戻しを所有する。

## Rollout and rollback

- Rollout: runbook.md を write scope 内に限定して作成/実装し、次フェーズへ引き継ぐ
- Rollback trigger and steps: runbook.md を作成前状態へ戻す (実装済みコードへの影響はない)

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-semantic-emphasis-icons.context.json` (`sha256:61a528100c82ccf593dd1ba3a0303374aba208a2dedace4df7126cfae4f9bab9`)
- Phase responsibility: 現行 context の purpose・goal・scope・acceptance のうち P12 の責務に対応する部分を扱う。
- Purpose: 強調したい箇所が絵文字で表現されていると、意味が字形の見た目に依存し、配色仕様書 v2 の semantic color token とも結びつかない。強調の意味を、色・形・可視ラベルの 3 つで一貫して担わせる。
- Goal: callout と一覧・カードの状態表現が packages/ui 所有の inline SVG アイコンと semantic color token だけで表され、絵文字の混入が lint で検出されて入らない状態にする。
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- callout 4 種 ([!POINT] / [!ATTENTION] / [!WARNING] / [!NOTE]) の種別表現を inline SVG アイコン + semantic color token で表す
- 一覧・カードの状態表現を同じ token 体系へ揃える
- 色だけで意味を区別せず、アイコン形状か可視ラベルを必ず併置する規則の実装
- UI 文言・callout ラベル・空状態文言への絵文字混入を検出する lint と、その CI 組込 (fail-closed)
- packages/ui のアイコンモジュールを唯一の供給元とする所有境界
- Scope out:
- 配色仕様書 v2 そのものの改訂
- 各画面の情報構造・機能追加 (feat-card-list-shell の担当)
- Markdown のカードブロック記法 (feat-card-block-authoring の担当)
- 公開 API・DB schema・認可判定・Cloudflare deploy unit の変更
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- callout 4 種が絵文字を用いず、種別ごとに異なる inline SVG アイコンと semantic color token で描き分けられる
- 状態・日時・金額・PII・略語の表現でアイコンだけに意味を担わせず、可視ラベルが併置される
- UI 文言・callout ラベル・空状態文言に絵文字を入れた変更が lint で検出され CI が落ちる
- アイコンが packages/ui のアイコンモジュール以外から供給されていない
- ライトモードで強調ブロックの背景がグレー系ではなく semantic token 由来の配色になっている
- Architecture/source refs:
- architecture/harness-hub-design-system.md
- architecture/harness-hub-frontend.md
- system-spec/spec-state.json

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## 参照情報

- System specification: system-spec/spec-state.json qa_log (qa-232, qa-233)
- Detailed authoritative source: packages/ui/src/icons/index.tsx (Icon コンポーネント・iconNames), packages/ui/src/components/Markdown.tsx (CalloutKind/remarkCallouts/Callout/calloutStyle/calloutIcon), packages/ui/src/tokens/tokens.ts (infoBlue/infoBlueSoft), packages/ui/src/components/Badge.tsx, scripts/lint-*.py (既存 flat 命名規約), .github/workflows/ci.yml (static-gates ジョブ)
- Architecture: arch-harness-hub-design-system (architecture/harness-hub-design-system.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-semantic-emphasis-icons
- Phase doc: N/A: feature-execution-package-contract.md 第 2 節により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-EMPHASIS-ICONS-P11
- Trace rule: P04 が実行可能なテスト ID を定義し、P05 がその対象を実装し、P06 が実行し、P07 と P10 は実行済み証跡のみで判定し、P09 は applicable な検査を fail-closed にし、P11 は source digest と再実行コマンドを保存し、P12 と P13 は不足する実装や証跡を文書や計画で代替しない。
