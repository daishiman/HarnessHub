---
graph_node_id: "doc-post-signin-scope-implementation-requirements"
artifact_kind: "document"
artifact_subtypes: []
layer: "feature-design"
project_id: "harness-hub"
domain: "frontend"
tags: ["requirements","post-signin","tenant-scope","dev-graph"]
priority: null
start_date: null
target_date: null
iteration: null
title: "feat-post-signin-scope-routing 実装要件定義書"
owners: ["daishiman"]
created_at: "2026-08-02T00:00:00Z"
updated_at: "2026-08-02T12:31:28.850562Z"
status: "active"
depends_on: []
related_nodes: ["feat-post-signin-scope-routing","arch-harness-hub-frontend","arch-harness-hub-security"]
resource_scope: ["docs/features/feat-post-signin-scope-routing/implementation-requirements.md"]
purpose: "サインイン後の着地先固定と scope 未解決による業務画面 403 missing_tenant_scope を解消するための実装要件を、P01..P13 の exact-13 task へ責務割付して確定する"
goal: "四 gate (C11 graph schema / source digest / system plan exact-13 / generation lineage) が同一 snapshot digest で PASS し、readiness 13/13 complete の実装要件と task-graph handoff が同一 digest で発行された状態"
scope_in: ["goal-spec の scope_in 10 件を P01..P13 へ責務割付する","acceptance 8 件の ID 定義 (P04) / 実行 (P06) / 判定 (P07) の検証責務を確定する","quality_constraints 6 件の施行 task を確定する","13 task の implementation readiness matrix と missing_sections を導出する","四 gate の実測結果を実行出力から転記する"]
scope_out: ["実装コードの生成 (capability-build / task-graph の責務)","authorize() の判定規則そのものの変更 (feat-auth-tenancy の所有物)","workspace 切替 UX (feat-workspace-switch-ux)","Web 完結の publish 導線 (feat-web-only-publish-journey)","Device 承認画面の確認コード制約の変更"]
acceptance: ["readiness matrix が 13 task 全件を complete として列挙し missing_sections が 0 件である","四 gate の実測が exit 0 で、graph_revision と graph sha256 が handoff package と一致する","handoff package .dev-graph/handoff/task-graph-feat-post-signin-scope-routing.json が実在し entry_task が SYS-POST-SIGNIN-SCOPE-P01 である","本書由来の実装コード生成が 0 件である"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-security"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "docs/features/feat-post-signin-scope-routing/implementation-requirements.md"
template_id: "document"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"ddeaeaf2fea9c113864fece8820d9a4b9e50c11696a1cf7f8dfadd5d66ed4d1a","evaluator":"dev-graph/run-dev-graph-requirements","evidence_ref":"eval-log/run-dev-graph-requirements-progress.json"}
source_lineage: {"imported_at":"2026-08-02T12:31:00Z","origin_kind":"generated","source_digest":"2a0ef14728f0344a6c3e1495bbaa602d6deb43d3d013f269d13a07849533076b","source_path":"features/feat-post-signin-scope-routing.md","source_plugin":"dev-graph/run-dev-graph-requirements","source_version":"0.1.0"}
classification_confidence: 1
classification_reason: "requirements verb の成果物であり document kind が確定している (人手判断を要さない)"
classification_candidates: []
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-02T00:00:00Z","missing_sections":[],"status":"complete"}
---

# feat-post-signin-scope-routing 実装要件定義書

> `/dev-graph requirements`（`run-dev-graph-requirements`）が、確定 graph と system-dev-planner の feature package から導出した実装要件。実装コードは本書では生成しない。実装は `--handoff-target task-graph` の handoff package を経由して P01..P13 の task 実行へ引き渡す。

## 目的

本番 URL `https://harness-hub.daishimanju.workers.dev` でサインインは成功するのに、業務画面 6 種（`/sheets`・`/sheets/new`・`/sheets/{id}`・`/catalog`・`/catalog/releases`・`/catalog/{projectId}`）が通常のブラウザ操作で 403 `missing_tenant_scope` になる実装未結線を、認可の判定順と deny-by-default（既定拒否＝明示的に許可された場合以外は全て拒否する方針）を変えずに解消するための実装要件を確定する。

本書の役割は次の 3 点に限定する。

1. 対象 feature の scope・受入条件・品質制約を、P01..P13 の exact-13 task へ責務割付した実装要件として固定する。
2. 13 task 全件の implementation readiness（実装着手準備の充足度）を機械判定し、不足 section があれば remediation owner（修正責任の所在）とともに surface する。
3. 全 gate PASS のときだけ、graph snapshot digest に固定した handoff package を `task-graph` 向けに発行する。

## 対象読者

- 本 feature の P01..P13 を実行する実装担当（人・エージェントを問わない）
- 認可・セッション周りのレビュー担当（P03 設計レビュー / P10 最終レビュー）
- 本 feature の後続となる `feat-workspace-switch-ux` / `feat-web-only-publish-journey` の計画担当

## 要約

- 本 feature は**新機能の追加ではなく統合修正**である。`authorize()` の判定規則そのものは `feat-auth-tenancy` が、業務画面自体は既存 feature が既に所有しており、本 feature は「既にデプロイ済みのコードどうしの結線欠落」だけを埋める。
- 結線対象は 2 系統。(a) scope 解決の入力を明示ヘッダー（API・機械クライアント）と session の active tenant/workspace（ブラウザ通常遷移）の 2 系統に広げ、同一の `authorize()` へ収束させる。(b) サインイン後の着地先を `callbackUrl` 固定値 `/` から「遷移元 path → 既定着地 `/sheets`」の解決へ置き換える。
- 非退行の絶対条件は 3 つ。判定順（public 判定 → 認証 → スコープ一意性 → tenant 一致 → workspace 所属）を変えない、どちらの scope 入力も無いときは従来どおり `missing_tenant_scope` とする、戻り先の解決結果にも通常の `authorize()` を適用して redirect を認可の迂回路にしない。
- readiness は 13/13 complete、missing section 0 件。四 gate（C11 graph schema / source digest / system plan / generation lineage）は同一 snapshot digest で全て exit 0。handoff は発行済み。

## 本文

### 1. 対象 feature と package の同一性

| 項目 | 値 |
|---|---|
| feature id | `feat-post-signin-scope-routing` |
| feature package id | `feature-package/feat-post-signin-scope-routing` |
| package digest | `sha256:f5f2a30f4f6828bf6ccaf1c30d387863f02b79f5f59950036f50784eb73f3cd6` |
| published path | `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/f5f2a30f4f6828bf6ccaf1c30d387863f02b79f5f59950036f50784eb73f3cd6/` |
| current pointer | `.dev-graph/state/current/feature-package-feat-post-signin-scope-routing.json` |
| graph revision | 1114 |
| graph sha256 | `ddeaeaf2fea9c113864fece8820d9a4b9e50c11696a1cf7f8dfadd5d66ed4d1a` |
| node count（repo 全体） | 398 |
| handoff target | `task-graph` |
| handoff package | `.dev-graph/handoff/task-graph-feat-post-signin-scope-routing.json` |

published task spec が正本であり、`tasks/feat-post-signin-scope-routing/*.md` は実行入口だけを保持する projection（投影）である。task spec の SHA-256 または package digest が変わった場合、projection は実行せず current pointer から現行世代を再解決する。

### 2. 実装要件 — scope（scope_in 10 件）の task 割付

| # | 実装要件（scope_in） | 主担当 | 検証担当 |
|---|---|---|---|
| 1 | scope 解決の 2 系統（明示ヘッダー / session の active tenant・workspace）を server 側で解決する | P05 | P06 / P09 |
| 2 | 両方が存在して不一致なら `ambiguous_scope` で拒否し、どちらかを黙って優先しない | P05 | P06 / P09 |
| 3 | 両方とも存在しない場合は従来どおり `missing_tenant_scope` とする（deny-by-default 非退行） | P05 | P06 / P09 |
| 4 | 両経路を同一の `authorize()` へ収束させ、判定を二重実装しない | P02 / P05 | P08 |
| 5 | session への active workspace 束縛と、切替のたびの所属再検証 | P05 | P06 / P09 |
| 6 | サインイン後の着地先解決: `callbackUrl` の固定値 `/` を廃止し、遷移元 path → 既定着地 `/sheets` の順で解決する | P05 | P06 / P07 |
| 7 | 既定着地を単一定数から解決し、画面ごとに散らさない | P05 / P08 | P08 |
| 8 | 戻り先を同一 origin の相対 path のみに制限し、絶対 URL・スキーム付き・protocol-relative（`//`）は既定着地へ落とす（open redirect 防止） | P05 | P06 / P09 |
| 9 | 戻り先の解決結果にも通常の `authorize()` を適用し、redirect を認可の迂回路にしない | P05 | P06 / P09 |
| 10 | `/` の扱い: 未認証時は稼働確認表示を維持し、認証済み session がある場合は既定着地へ redirect する | P05 | P06 / P07 |

### 3. 受入条件（acceptance 8 件）の検証責務

acceptance は P04 で実行可能なテスト ID として定義し、P06 で実行して証跡を収集し、P07 で実測証跡による受入判定を行う。P07 は自ら実行せず、P06 が残した証跡だけを判定材料にする。

| # | 受入条件 | ID 定義 | 実行 | 判定 |
|---|---|---|---|---|
| 1 | 遷移元が無いサインイン成功で `/sheets` に着地し、`/` に留まらない | P04 | P06 | P07 |
| 2 | 戻り先に絶対 URL・スキーム付き・protocol-relative を与えても外部へ遷移せず既定着地へ落ちる | P04 | P06 | P07 |
| 3 | 認証済み session で `/` を開くと既定着地へ redirect される | P04 | P06 | P07 |
| 4 | 業務画面 6 種が通常のブラウザ操作で 403 `missing_tenant_scope` にならない | P04 | P06 | P07 |
| 5 | 明示ヘッダーと session scope が併存し不一致のとき `ambiguous_scope` で拒否される | P04 | P06 | P07 |
| 6 | どちらの scope 入力も無い場合は `missing_tenant_scope` のままである（deny-by-default 非退行） | P04 | P06 | P07 |
| 7 | principal の所属検証を通らない workspace は session へ束縛されない | P04 | P06 | P07 |
| 8 | 戻り先の解決結果に対しても `authorize()` が適用される | P04 | P06 | P07 |

### 4. 品質制約（quality_constraints 6 件）

| id | 制約 | 施行 task |
|---|---|---|
| `authz-decision-order-and-deny-by-default-non-regression` | `authorize()` の判定順（public 判定 → 認証 → スコープ一意性 → tenant 一致 → workspace 所属）と deny-by-default を変更しない | P03 / P09 |
| `scope-resolution-two-inputs-ambiguous-rejection` | scope 解決の入力は 2 系統とし、両方が存在して不一致なら `ambiguous_scope` で拒否する | P02 / P09 |
| `session-active-workspace-binding-membership-revalidation` | session へ束縛できる active workspace は所属検証を通過したものだけ。session 保持値を所属検証の代替に使わない | P02 / P09 |
| `post-signin-landing-resolution-single-default-constant` | 既定着地は単一定数から解決し、画面ごとに散らさない | P05 / P08 |
| `open-redirect-prevention-same-origin-relative-only` | 戻り先は同一 origin の相対 path のみ。解決結果にも `authorize()` を適用する | P03 / P09 |
| `integration-fix-not-new-capability-cross-feature-boundary` | 本 feature は結線欠落を埋める統合修正であり、`authorize()` の判定規則自体は `feat-auth-tenancy` の所有物として侵さない | P03 / P10 |

### 5. readiness matrix（13 task）

`implementation_readiness` は 13/13 が complete、`missing_sections` は 0 件、incomplete/pending/fail/stale は 0 件。したがって remediation owner の surface 対象はない。

| task | フェーズ責務 | 依存 | readiness |
|---|---|---|---|
| `SYS-POST-SIGNIN-SCOPE-P01` | 要件ベースライン確定 | （feature の macro entry gate） | complete |
| `SYS-POST-SIGNIN-SCOPE-P02` | アーキテクチャ決定（scope 解決の単一合流点・session 束縛・着地先解決関数の配置と契約） | P01 | complete |
| `SYS-POST-SIGNIN-SCOPE-P03` | 設計レビュー（認可迂回路・open redirect・deny-by-default 退行の 3 リスク審査） | P02 | complete |
| `SYS-POST-SIGNIN-SCOPE-P04` | テスト設計（scope 解決の真理値表・着地先解決の入力分類・非退行テスト ID 定義） | P03 | complete |
| `SYS-POST-SIGNIN-SCOPE-P05` | 実装（session 系統追加・active workspace 束縛・着地先解決関数新設・サインイン後遷移の結線） | P04 | complete |
| `SYS-POST-SIGNIN-SCOPE-P06` | テスト実行と証跡収集 | P05 | complete |
| `SYS-POST-SIGNIN-SCOPE-P07` | 受入判定（acceptance 8 件の実測証跡による判定） | P06 | complete |
| `SYS-POST-SIGNIN-SCOPE-P08` | リファクタリングと移行（scope 解決の二重実装排除・既定着地定数の集約） | P07 | complete |
| `SYS-POST-SIGNIN-SCOPE-P09` | 品質保証（deny-by-default 非退行・open redirect 防止・所属検証の fail-closed 検査） | P08 | complete |
| `SYS-POST-SIGNIN-SCOPE-P10` | 最終レビュー（実行済み証跡のみによるリリース可否判定） | P09 | complete |
| `SYS-POST-SIGNIN-SCOPE-P11` | 証跡固定（source digest と再実行コマンドの保存） | P10 | complete |
| `SYS-POST-SIGNIN-SCOPE-P12` | ドキュメントと運用（画面遷移仕様の更新・scope 未解決時の運用手順） | P11 | complete |
| `SYS-POST-SIGNIN-SCOPE-P13` | リリースとデプロイ（本番反映・確定仕様とアーキテクチャへの書き戻し） | P12 | complete |

entry task は `SYS-POST-SIGNIN-SCOPE-P01`。DAG は feature 内の一本鎖で、cross-feature edge は 0 件。

### 6. gate 実測（同一 snapshot digest）

| gate | コマンド | 結果 |
|---|---|---|
| C11 graph schema | `validate-graph-schema.py --graph .dev-graph/state/graph.json --repo-root .` | exit 0 / `valid: true` / errors 0（repo 全体 398 node） |
| source digest | `validate-source-digest.py --repo-root . --registered <scope 内 14 node>` | exit 0 / checked 14 / `registered_mismatch` 0 |
| system plan（exact-13） | `validate-system-plan.py --repo-root . --feature-package feature-package/feat-post-signin-scope-routing` | exit 0 / `status: pass` / phase_refs 13 / contract 1.2.0 / violations 0 |
| generation lineage | `validate-generation-lineage.py --package feature-package-feat-post-signin-scope-routing` | exit 0 / checked 1 / violations 0 |
| task projection rerun | `build-task-projection-rerun.py --feature-package feature-package/feat-post-signin-scope-routing --check` | exit 0 / checked 13 / missing 0 |

### 7. scope 外（本 feature では扱わない）

- `authorize()` の判定規則そのものの変更（`feat-auth-tenancy` の所有物）
- 業務画面自体の機能追加・UI 改修（既存 feature の所有物）
- workspace 切替 UI の体験設計 → 後続 feature `feat-workspace-switch-ux`
- CLI を使わずに Web だけで publish を完結させる導線 → 後続 feature `feat-web-only-publish-journey`
- Device 承認画面（`/device`）の確認コード制約（英数字 8 文字 / 有効期限 10 分 / 5 回間違えると無効 / 使用済みコードは再利用不可）そのものの変更。本 feature は当該画面の挙動を変えない。

## 決定事項

1. **要件定義書の出力先を `docs/features/<feature-id>/implementation-requirements.md` とする。** `requirements-baseline.md` は P01 task の成果物（`task: SYS-*-P01` を frontmatter に持つ）であり、requirements verb の成果物ではないため流用しない。
2. **本書は C02 単一 writer（`upsert-node.py`）経由で document node として登録する。** content root への直接書込は単一 writer 契約に反するため行わない。
3. **handoff package は graph 外の内部データとして `.dev-graph/handoff/` に置く。** graph node 化はしない。
4. **qa semantic coverage を有効化する。** 最新 main で `qa-121`〜`qa-123` が別決定に使われていたため、本 feature の確定契約は `qa-134` / `qa-135` / `qa-136` として再採番した。parent feature の frontmatter tags に3件を明示し、goal-spec と P01〜P13 の全 task spec に同じ参照を再生成して、`validate-qa-semantic-coverage.py` の機械検証を通す。`C13` lock と content-addressed package は新世代へ正規再生成し、古い世代本文を手編集しない。
5. **evaluator は fork（別 context の subagent）で実行した。** `plan-findings.schema.json` が `evaluator.context: const "fork"` を要求しており、自分が書いた package を自分で PASS 宣言する receipt は proposer≠approver の原則に反するため。

## 運用・更新方法

- 本書は requirements verb の成果物であり、内容の正本は published task spec 側にある。package digest が変わった場合は本書を更新前に current pointer から再解決する。
- readiness matrix が incomplete へ変わった場合、本書ではなく該当 task node の frontmatter を C02 経由で修正し、requirements を再実行して matrix を再導出する。本書の表を手で書き換えて緑化しない。
- gate 実測の表は「実行出力の転記」であり、再実行せずに値だけを更新しない。

## 関連資料

- feature: `features/feat-post-signin-scope-routing.md` / context: `features/feat-post-signin-scope-routing.context.json`
- published package: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/bd8cda0e.../`
- handoff package: `.dev-graph/handoff/task-graph-feat-post-signin-scope-routing.json`
- task projection: `tasks/feat-post-signin-scope-routing/sys-post-signin-scope-p01.md` .. `p13.md`
- architecture: `arch-harness-hub-frontend` / `arch-harness-hub-security`
- 後続 feature: `feat-workspace-switch-ux` / `feat-web-only-publish-journey`
- 実行ログ: `eval-log/run-dev-graph-requirements-progress.json` / `eval-log/run-dev-graph-requirements-intermediate.jsonl`

## 変更履歴

| 日付 | 内容 |
|---|---|
| 2026-08-02 | 初版。四 gate PASS（graph_revision 1114 / graph sha256 `ddeaeaf2...`）で handoff を `task-graph` へ発行。 |
