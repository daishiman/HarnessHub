# System task overlay: 実装 — scope 解決への session 系統追加・active workspace 束縛・着地先解決関数の新設とサインイン後遷移の結線

## Machine-readable registration fields

- feature_package_id: feature-package/feat-post-signin-scope-routing (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-post-signin-scope-routing", "macro-feature", "frontend", "phase-p05"]
- related_nodes: ["feat-post-signin-scope-routing", "arch-harness-hub-frontend", "arch-harness-hub-security"]
- parent_feature: feat-post-signin-scope-routing
- phase_ref: P05
- classification: confidence=0.92, reason="goal-spec.json を入力に P05 の単一責務 (frontend) を実行する task", candidates=[{artifact_kind: task, confidence: 0.92, candidate_path: tasks/feat-post-signin-scope-routing/sys-post-signin-scope-p05.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

scope 解決へ session 系統を追加し、active workspace の束縛と所属再検証を実装し、サインイン後の着地先解決関数を新設してサインインフォームとトップページの遷移を結線する。この task 完了時点で、業務画面 6 種が通常のブラウザ操作で到達可能になる。

## 背景

HarnessHub の本番環境では、サインイン自体は成功するのに業務画面 (/sheets, /sheets/new, /sheets/{sheetId}, /catalog, /catalog/releases, /catalog/{projectId} の 6 種) を通常のブラウザ操作で開くと 403 missing_tenant_scope になる。これは利用者の操作誤りではなく、既にデプロイ済みのコードどうしの結線欠落である。原因は 4 点ある。第一に、サインインフォームが戻り先を / に固定している (apps/hub/src/app/[tenant_slug]/signin/tenant-oidc-signin-form.tsx の callbackUrl 隠しフィールド)。第二に、/ は認証不要の稼働確認ページであり業務画面ではない (apps/hub/src/app/page.tsx)。第三に、確定仕様ではダッシュボード完成前の / は /sheets へ移動させることになっている (docs/frontend-spec.md)。第四に、authorize() は非 public な要求へ必ずテナントスコープの申告を求めるが (apps/hub/src/middleware/authz.ts)、通常のブラウザ遷移ではその申告経路であるヘッダーが付与されないため、scope が解決されず missing_tenant_scope に落ちる。本 feature はこの 4 点を、authorize() の判定順・role 判定・deny-by-default を変えずに解消する統合修正である。scope の入力系統を 2 系統 (明示ヘッダー = API と機械クライアント / session の active tenant-workspace = ブラウザ通常遷移) に拡張し、両方あって不一致なら ambiguous_scope、両方なしなら従来どおり missing_tenant_scope とする。あわせてサインイン後の着地先を、遷移元 path から既定着地 /sheets の順で解決し、戻り先は同一 origin の相対 path のみ許可して絶対 URL・スキーム付き・protocol-relative は既定着地へ落とす (open redirect 防止)。戻り先の解決結果にも通常の authorize() を適用し、redirect を認可の迂回路にしない。確定出典は specs/harness-hub-post-signin-workspace-scope-addendum.md の A 節と B 節、および system-spec/spec-state.json の qa-121 (サインイン成功後の着地先・/ の扱い・スコープ伝搬) と qa-123 (判定順と既定拒否・scope 解決の入力 2 系統・session への active workspace 束縛・redirect の安全性) である。

実装は既存構造を壊さない形で行う。resolveRequestedScope は現在 path とヘッダーだけを見ているため、ここに session principal 由来の active tenant-workspace を第 2 入力として渡し、両方あって不一致なら ambiguous_scope、片方だけならそれを採用、両方なしなら tenantId を null のまま返す。authorize() 側の分岐 (missing_tenant_scope / tenant_mismatch / workspace_not_member) は変更しない。着地先解決は apps/hub/src/lib/routing/post-signin-landing.ts を新設し、既定着地 /sheets を単一定数として持ち、同一 origin の相対 path のみを許可する検証を 1 箇所に集約する。サインインフォームの callbackUrl 固定値 / は、この解決結果を渡す形へ置き換える。トップページは未認証時の稼働確認表示を維持しつつ、認証済み session がある場合だけ既定着地へ redirect する。本 feature は authorize() の判定規則そのものを所有しない (owner=feat-auth-tenancy)。業務画面本体も所有しない (owner=feat-dual-catalog-web)。Workspace 選択画面の UI は feat-workspace-switch-ux、Web 公開ウィザードの導線は feat-web-only-publish-journey が所有する。本 feature が所有するのは scope 解決の入力系統と着地先解決の結線に限られる。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-post-signin-scope-routing, arch-harness-hub-frontend, arch-harness-hub-security
- Entry gate: 直前 task SYS-POST-SIGNIN-SCOPE-P04 が done または closed であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: apps/hub/src/lib/routing/post-signin-landing.ts の新設、apps/hub/src/app/[tenant_slug]/signin/tenant-oidc-signin-form.tsx の callbackUrl 固定値廃止、apps/hub/src/app/page.tsx の認証済み redirect 追加
- Backend: applicable + change: apps/hub/src/lib/authz/resource.ts の scope 解決へ session 系統を追加し、apps/hub/src/lib/auth/session.ts へ active workspace 束縛と所属再検証を実装する
- API: applicable + change: apps/hub/src/middleware/authz.ts の authorize() が受け取る scope 解決入力を拡張する。判定順・reason・status は変更しない
- Data: N/A: 既存 session と principal の保持情報のみを用い、新規テーブル・列を設けない
- Infrastructure: N/A: デプロイ単位 cloudflare-workers/hub を変更しない
- Security: applicable + change: deny-by-default の非退行、open redirect 防止、所属検証を通らない workspace の束縛拒否を実装で担保する
- Quality: applicable: P04 が定義したテスト ID の実装対象を提供する。テスト実行自体は P06 が行う
- Documentation: N/A: 仕様文書の更新は P12 が扱う
- Operations: N/A: 運用手順は P12 が扱う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-security (features/feat-post-signin-scope-routing.md architecture_refs の正本参照。specs/harness-hub-post-signin-workspace-scope-addendum.md A 節と B 節、qa-121 と qa-123 を含む)
- Deploy unit/environment: cloudflare-workers/hub (apps/hub は Hub Worker にバンドルされる。本 task ではデプロイを行わない)
- Compatibility/migration/backfill: N/A: 本 task は schema 変更と backfill を伴わない (本番反映は P13 が扱う)

## 成果物

- Produced artifacts: apps/hub/src/lib/routing/post-signin-landing.ts (新設)、および apps/hub/src/lib/authz/resource.ts・apps/hub/src/lib/authz/types.ts・apps/hub/src/middleware/authz.ts・apps/hub/src/lib/auth/session.ts・apps/hub/src/app/[tenant_slug]/signin/tenant-oidc-signin-form.tsx・apps/hub/src/app/page.tsx の変更
- Consumed artifacts: goal-spec.json, features/feat-post-signin-scope-routing.md, features/feat-post-signin-scope-routing.context.json, specs/harness-hub-post-signin-workspace-scope-addendum.md, architecture/harness-hub-frontend.md, architecture/harness-hub-security.md, system-spec/spec-state.json
- Write scope/touches: apps/hub/src/lib/authz/resource.ts, apps/hub/src/lib/authz/types.ts, apps/hub/src/middleware/authz.ts, apps/hub/src/lib/auth/session.ts, apps/hub/src/lib/routing/post-signin-landing.ts, apps/hub/src/app/[tenant_slug]/signin/tenant-oidc-signin-form.tsx, apps/hub/src/app/page.tsx

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-post-signin-scope-p05) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-post-signin-scope-p05 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-post-signin-scope-p05) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on (SYS-POST-SIGNIN-SCOPE-P04) の完了後に着手する。resource_scope (apps/hub/src/lib/authz/resource.ts, apps/hub/src/lib/authz/types.ts, apps/hub/src/middleware/authz.ts, apps/hub/src/lib/auth/session.ts, apps/hub/src/lib/routing/post-signin-landing.ts, apps/hub/src/app/[tenant_slug]/signin/tenant-oidc-signin-form.tsx, apps/hub/src/app/page.tsx) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- authorize() の判定順・role 判定・deny-by-default そのものの変更 (owner=feat-auth-tenancy)
- 業務画面本体の実装 (owner=feat-dual-catalog-web)
- Workspace 選択画面の UI 実装 (owner=feat-workspace-switch-ux)
- テストの実行と証跡化 (owner=P06)
- 仕様文書の更新 (owner=P12)

## テスト戦略

- テストレベル選定: 単体・結合・境界値・回帰の 4 レベルを成果物の性質に応じて適用し、適用外のレベルは証跡内で理由を明記する。
- カバレッジ目標: 実行コードを変更する場合は既定 80% 以上を維持し、文書のみの場合も受入条件の全項目を検査する。
- 層別方針: applicable な Frontend は behavior、Backend・API・Data は API 契約と DB 結合、Infrastructure は IaC と smoke を検査する。N/A の層は `Workstream applicability` の理由を維持する。
- 保守性制約: pixel 位置依存と DOM 構造依存のテストを禁止し、公開契約ではなく実装詳細へ密結合する過剰なテストを作らない。

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-post-signin-scope-routing`
- Required evidence: P04 が定義したテスト ID の対象コードが実在し、scope 解決 4 組合せと着地先 5 分類のそれぞれに対応する分岐が実装されていること。既定着地の path 文字列が単一定数から解決されていること

## Inner goal-seek execution loop

- Methodology contract: `system-task-goal-seek/v1`
- Goal: 本 task の「目的」と「成果物」に定義した単一責務を、受入条件を削らず再実行可能な証跡とともに完了する。
- Generic execution prompt: 目的・背景・前提条件・スコープ・成果物を入力に、手段を固定せず最小の変更で実装と検証を行う。
- Rubric: 受入条件を全件満たし、必要なカバレッジが 80% 以上で、既存テストの回帰が 0 件、証跡が再実行可能で、宣言した write scope 外を変更していれば FAIL とする。
- Feedback loop: 実行後に独立評価し、finding を次の prompt へ反映して再実行する。`rubric verdict=PASS` まで反復し、上限到達時は fail-closed で停止する。
- P13 spec/architecture writeback: N/A: P13 が書き戻しを所有する。

## Rollout and rollback

- Rollout: 実装を feature branch 上で完了させ、P06 のテスト実行へ引き継ぐ。本番反映は P13 が行う
- Rollback trigger and steps: 実装が deny-by-default を退行させた場合、変更を revert して P02 の設計へ差し戻す。旧挙動 (missing_tenant_scope) は既定拒否側であるため revert による権限漏れは生じない

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-post-signin-scope-routing.context.json` (`sha256:d2f1b1eafc3773a672b279d784dbe1fec10902d32a31643edd8d0bf8379cfcfb`)
- Phase responsibility: 現行 context の purpose・goal・scope・acceptance のうち P05 の責務に対応する部分を扱う。
- Purpose: ログインは成功するのに業務画面 (/sheets /catalog 系) が 403 missing_tenant_scope で開けない実装未結線を、認可の判定順と deny-by-default を変えずに解消する。原因はサインイン後の戻り先が / 固定であること、/ が稼働確認しか表示しないこと、通常のブラウザ遷移では認可が要求するテナント情報が付与されないことの 3 点であり、利用者の操作誤りではない
- Goal: scope の入力系統 2 系統 (明示ヘッダー / session の active tenant-workspace) とサインイン後の着地先解決が結線され、業務画面 6 種 (/sheets /sheets/new /sheets/{id} /catalog /catalog/releases /catalog/{projectId}) へ通常のブラウザ操作で到達できる状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- scope 解決の 2 系統: 明示ヘッダー (API / 機械クライアント) と session の active tenant/workspace (ブラウザ通常遷移) を server 側で解決する
- 両方が存在して不一致なら ambiguous_scope で拒否し、どちらかを黙って優先しない
- 両方とも存在しない場合は従来どおり missing_tenant_scope とする (deny-by-default 非退行)
- 両経路を同一の authorize() へ収束させ、判定を二重実装しない
- session への active workspace 束縛と、切替のたびの所属再検証
- サインイン後の着地先解決: callbackUrl の固定値 "/" を廃止し、遷移元 path -> 既定着地 /sheets の順で解決する
- 既定着地を単一定数から解決し、画面ごとに散らさない
- 戻り先を同一 origin の相対 path のみに制限し、絶対 URL・スキーム付き・protocol-relative (//) は既定着地へ落とす (open redirect 防止)
- 戻り先の解決結果にも通常の authorize() を適用し、redirect を認可の迂回路にしない
- / の扱い: 未認証時は稼働確認表示を維持し、認証済み session がある場合は既定着地へ redirect する
- Scope out:
- authorize() の判定順・role 判定・deny-by-default そのものの変更
- catalog / sheets API 実装と DB schema の変更
- Workspace 選択画面の UI 実装 (feat-workspace-switch-ux が所有)
- Web 公開ウィザードの導線 (feat-web-only-publish-journey が所有)
- サイドバー 9 項目の段階表示契約の変更 (docs/frontend-spec.md §10)
- Device Flow 確認コード制約の変更 (現行維持)
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- 遷移元が無いサインイン成功で /sheets に着地し、/ に留まらない
- 戻り先に絶対 URL・スキーム付き・protocol-relative を与えても外部へ遷移せず既定着地へ落ちる
- 認証済み session で / を開くと既定着地へ redirect される
- 業務画面 6 種が通常のブラウザ操作で 403 missing_tenant_scope にならない
- 明示ヘッダーと session scope が併存し不一致のとき ambiguous_scope で拒否される
- どちらの scope 入力も無い場合は missing_tenant_scope のままである (deny-by-default 非退行)
- principal の所属検証を通らない workspace は session へ束縛されない
- 戻り先の解決結果に対しても authorize() が適用される
- Architecture/source refs:
- architecture/harness-hub-frontend.md
- architecture/harness-hub-security.md
- specs/harness-hub-post-signin-workspace-scope-addendum.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## 参照情報

- System specification: specs/harness-hub-post-signin-workspace-scope-addendum.md (A 節から G 節), system-spec/spec-state.json qa_log (qa-121, qa-122, qa-123)
- Detailed authoritative source: docs/frontend-spec.md (サインイン後遷移とサイドバー段階表示), docs/user-journeys.md (J1 サインイン後導線), apps/hub/src/middleware/authz.ts (authorize の判定順)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-security (architecture/harness-hub-security.md)
- Feature: feat-post-signin-scope-routing
- Phase doc: N/A: feature-execution-package-contract.md 第 2 節により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-POST-SIGNIN-SCOPE-P04
- Trace rule: P04 が実行可能なテスト ID を定義し、P05 がその対象を実装し、P06 が実行し、P07 と P10 は実行済み証跡のみで判定し、P09 は applicable な検査を fail-closed にし、P11 は source digest と再実行コマンドを保存し、P12 と P13 は不足する実装や証跡を文書や計画で代替しない。
