---
graph_node_id: "spec-post-signin-workspace-scope"
artifact_kind: "specification"
artifact_subtypes: []
project_id: "harness-hub"
domain: "platform"
tags: ["post-signin","workspace-scope","web-only","auth","frontend","ui-ux"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "Harness Hub サインイン後 Workspace スコープ導線 仕様追補"
owners: ["daishiman"]
created_at: "2026-08-02T04:58:10Z"
updated_at: "2026-08-04T00:00:00Z"
status: "active"
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["spec-harness-hub-requirements","arch-harness-hub-frontend","arch-harness-hub-security"]
resource_scope: ["specs/harness-hub-post-signin-workspace-scope-addendum.md","system-spec/frontend.md","system-spec/ui-ux.md","system-spec/auth.md"]
purpose: "ログイン後に業務画面へ到達できない実装未結線を是正し、CLI 非依存で Web 完結する導線の製品契約を固定する"
goal: "qa-135/qa-136/qa-137 を実装計画が参照できる単一の仕様境界として維持する"
scope_in: ["サインイン後の着地先と戻り先の安全性","ブラウザ通常遷移での tenant/workspace scope 解決","active workspace の選択と切替","CLI 非依存の Web 完結公開導線","Device 承認画面の位置づけと行き止まり回避","scope 不足時の利用者向け表現と回復導線"]
scope_out: ["authorize() の判定順・role 判定の変更","catalog/sheets API 実装と DB schema の変更","PublishRequest 状態機械と検査実装の owner 変更","サイドバー 9 項目の段階表示契約の変更"]
acceptance: ["遷移元が無いサインイン成功で /sheets へ着地し / に留まらない","絶対 URL・スキーム付き・protocol-relative の戻り先は既定着地へ落ちる (open redirect 防止)","業務画面 6 種が通常のブラウザ操作で 403 missing_tenant_scope にならない","明示ヘッダーと session scope が不一致なら ambiguous_scope で拒否する","両方の scope 入力が無い場合は missing_tenant_scope のまま (deny-by-default 非退行)","所属 workspace 1 件は選択画面を挟まず 2 件以上は選択後に本来の遷移先へ進む","CLI を使わず Hub Web だけで公開→状態確認→導入案内まで到達できる","確認コードを持たない /device 到達者へ S01 公開ウィザードの導線が提示される","Web 公開経路の権限境界が CLI 経路と同一で広い権限を持たない","Device 確認コードの 5 制約 (8 文字/10 分/5 回失敗/再利用不可/期限切れ再開始) が非退行"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-security"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "specs/harness-hub-post-signin-workspace-scope-addendum.md"
template_id: "specification"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"2a35957889e76d12a186bfa7217ea6fa9013168c5e668710a1144e971f1e6962","evaluator":"assign-system-spec-completeness-evaluator (evaluator_gate_waiver 適用: design_knowledge_reflection / doc_freshness を既存資産由来として waive)","evidence_ref":"eval-log/run-dev-graph-system-spec-progress.json"}
source_lineage: {"imported_at":"2026-08-02T04:58:10Z","origin_kind":"system-spec-harness","source_digest":"54fa89c8249033fd7d2d6ba104f397108ee5d33331834ae743ecaccb4542de45","source_path":"system-spec/spec-state.json","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.99
classification_reason: "qa-135/qa-136/qa-137 の確定契約を横断参照する製品仕様追補"
classification_candidates: [{"artifact_kind":"specification","candidate_path":"specs/harness-hub-post-signin-workspace-scope-addendum.md","confidence":0.99},{"artifact_kind":"architecture","candidate_path":"architecture/harness-hub-frontend.md","confidence":0.48}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-04T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 目的と成功状態

ログイン自体は成功するのに業務画面 (`/sheets` `/catalog` 系) が 403 `missing_tenant_scope` で開けない実装未結線を是正し、あわせて CLI を使わない利用者が Hub Web 単体で公開・状態確認・導入案内まで到達できるようにするための製品契約を固定する。

本書は `system-spec/` の確定質疑 qa-135 (frontend.web) / qa-136 (ui-ux.web) / qa-137 (auth.web) を、実装計画が参照できる単一の仕様境界としてまとめた追補である。既確定の qa-062 / qa-065 / qa-115 / qa-118 は全面維持し、本書はその差分だけを定める。

成功状態: サインイン直後に業務画面へ到達でき、所属 workspace 数に応じた適切な導線 (自動選択 or 選択画面) を経て、CLI を使わない利用者も Hub Web だけで公開まで完了できる。

## スコープ

- In: サインイン後の着地先と戻り先の安全性、ブラウザ通常遷移での tenant/workspace scope 解決、active workspace の選択と切替、CLI 非依存の Web 完結公開導線、Device 承認画面の位置づけと行き止まり回避、scope 不足時の利用者向け表現と回復導線
- Out: `authorize()` の判定順・role 判定の変更、catalog/sheets API 実装と DB schema の変更、PublishRequest 状態機械と検査実装の owner 変更、サイドバー 9 項目の段階表示契約の変更

## 用語と主体

| Term/Actor | Definition/Responsibility |
|---|---|
| 既定着地 (default landing) | 遷移元が無いサインイン成功時に送る先。単一定数から解決する `/sheets` |
| active workspace | session に束縛された、principal が所属検証を通過した workspace |
| 明示ヘッダー scope | API / 機械クライアント (Publisher・CLI・Device Flow token 保持クライアント) が渡す tenant/workspace 指定 |
| session scope | ブラウザ通常遷移で server 側が session principal から解決する tenant/workspace |
| ambiguous_scope | 明示ヘッダーと session scope が両方存在し値が不一致のときの拒否理由 |
| missing_tenant_scope | 両方の scope 入力が無いときの拒否理由 (deny-by-default) |
| S01 公開ウィザード | ZIP アップロードで CLI 取込経路と同一検査に収束する Web 完結公開経路 |
| Device Flow 利用者 | CLI / Publisher から確認コードを発行し `/device` で承認する利用者 |

## ユースケースとユーザーフロー

1. 利用者がサインインし、遷移元が無い場合は既定着地 `/sheets` へ着地する。
2. 所属 workspace が 1 件の利用者は選択画面を経ずに業務画面へ直接到達する。
3. 所属 workspace が 2 件以上の利用者は Workspace 選択画面を経て、選択後に本来の遷移先へ進む。
4. CLI を使わない利用者は共通シェルから S01 公開ウィザードを開き、ZIP をアップロードして検査結果 (Green/Yellow/Red) を確認し、必要なら差し戻しに従って再投入する。
5. 確認コードを持たずに `/device` へ到達した利用者は、この画面が CLI/Publisher 専用であることと S01 への導線を提示され、行き止まりにならない。
6. scope 未解決 (missing_tenant_scope) の利用者は、403 の生値ではなく Workspace 選択への回復導線を提示され、選択すれば回復する。

## 機能要件

- `FR-001`: サインイン成功後の戻り先は (a) サインイン開始時に保存した遷移元 path、(b) 無ければ既定着地 `/sheets` の順で解決する。`callbackUrl` の固定値 `"/"` は廃止する。
- `FR-002`: 戻り先は同一 origin の相対 path のみ許可し、絶対 URL・スキーム付き・protocol-relative (`//`) は既定着地へ落とす。
- `FR-003`: `/` は未認証時のみ稼働確認表示を維持し、認証済み session がある場合は既定着地へ redirect する。稼働確認の正本は `/health` とする。
- `FR-004`: scope 解決の正規入力を明示ヘッダー (API/機械クライアント専用) と session の active tenant/workspace (ブラウザ通常遷移) の 2 系統とし、両方が存在して不一致なら `ambiguous_scope`、両方無ければ `missing_tenant_scope` とする。
- `FR-005`: 所属 workspace が 1 件のときは自動選択し選択画面を挟まない。2 件以上のときは Workspace 選択画面を挟み、選択後に本来の遷移先へ進む。
- `FR-006`: S01 に ZIP アップロード経路を置き、CLI 取込経路と同一の Hub 側検査 (static validation / secret scan / policy) へ収束させる。
- `FR-007`: 確認コードを持たずに `/device` へ到達した利用者へ、この画面が CLI/Publisher 専用であることと S01 への導線を画面上で明示する。

## 非機能要件

- Performance: scope 解決は既存の `authorize()` 呼び出し 1 回に収め、追加の同期外部呼び出しを増やさない。
- Availability/Reliability: scope 未解決時も業務画面のクラッシュではなく回復導線付きの ErrorState を返す。
- Accessibility/Usability: Workspace 選択画面・回復導線の文言は 403 の生値を露出しない利用者向け表現とする。
- Security/Privacy: deny-by-default を維持し、`ambiguous_scope` と `missing_tenant_scope` を明確に分離する (どちらかを黙って優先しない)。
- Maintainability/Operability: scope 解決ロジックはブラウザ経路・API 経路で単一の `authorize()` に収束させ、判定の二重実装を作らない。

## UI・状態遷移

- 画面/CLI/API状態: 未選択 (workspace 未確定) → 自動選択 (1件) or 選択画面表示 (2件以上) → 業務画面到達。S01 は検査中 → Green (自動公開) / Yellow・Red (Needs Fix 差し戻し)。
- 遷移条件: サインイン成功イベントで着地先解決、Workspace 選択イベントで active workspace 確定、切替イベントで active workspace 再検証。
- Loading/Empty/Error: scope 未解決中は業務画面本体を描画しない。切替時は新 scope の応答が返る前に旧 scope の内容を表示対象外にする (qa-118 【1】継承)。401/403 は ErrorState のみを表示し旧データを描画しない。

## ビジネスルールと検証

- `BR-001`: `authorize()` の判定順 (public → 認証 → scope 一意性 → tenant 一致 → workspace 所属) と deny-by-default は変更しない。本追補は判定へ渡す scope の入力系統の定義のみを行う。
- `BR-002`: session に active workspace を束縛できるのは principal の所属検証を通過した workspace だけとし、切替のたびに所属を再検証する。session 保持値を所属検証の代替に使わない。
- `BR-003`: S01 Web 公開ウィザード経由の公開は Device Flow token を用いず、通常の session 認可で行う。CLI 経路と Web 経路の権限境界 (作成者を owner に固定・現在の tenant/workspace scope 内に限定) は同一とし、Web 経路が CLI 経路より広い権限を持たない。
- `BR-004`: 自分で開始していない確認コードは承認しない旨を `/device` 画面で警告する。approve 時に選択した Workspace の範囲を超える権限を付与しない。

## API契約

新規 API エンドポイントの追加・変更はない。本追補は既存 `authorize()` (`apps/hub/src/middleware/authz.ts`) が受け取る scope 入力の解決経路を定義するものであり、エンドポイント契約自体は `system-spec/auth.md` の既存確定 (qa-115) を継承する。

## データモデル

- Entity/Value: 新規永続 Entity の追加はない。既存 session に `active_workspace_id` を保持する (追加フィールド、DB schema 変更を伴わない session store 上の値)。
- Fields/Types/Nullability: `active_workspace_id` は所属検証を通過した workspace id のみを許容し、未確定時は null。
- Relations/Constraints/Indexes: `active_workspace_id` は principal の所属 workspace 集合の部分集合でなければならない (切替時に再検証)。
- Ownership/Retention/Migration: session store のライフサイクルに従い、session 破棄時に消える。永続 DB migration は不要。

## 認証・認可

- Authentication: 既存のテナント別 OIDC (Auth.js) を継続利用し、本追補で変更しない。
- Authorization: `authorize()` の判定順は不変。本追補は判定へ渡す scope 入力 (明示ヘッダー / session scope) の解決規則のみを追加する。
- Tenant/data boundary: 明示ヘッダーと session scope が不一致なら `ambiguous_scope` で拒否し、tenant/workspace 境界を跨いだ暗黙のフォールバックを行わない。

## エラー・例外・回復

- Error taxonomy: `ambiguous_scope` (両 scope 入力が不一致)、`missing_tenant_scope` (両方とも入力無し、deny-by-default 非退行)。
- Retry/Timeout/Fallback: scope 未解決は失敗ではなく「Workspace を選べば回復する状態」として扱い、Workspace 選択への回復導線を提示する。403 の生値はエンドユーザーへ露出しない。
- Idempotency/Concurrency: Workspace 切替は冪等 (同じ workspace への再切替は無操作)。切替中の旧 scope 応答は破棄し新 scope 確定後にのみ描画する。

## イベント・非同期処理

N/A: 本追補はリクエスト同期経路内の scope 解決のみを扱い、非同期メッセージング/イベント基盤の追加を伴わない。

## 可観測性

- Logs/Metrics/Traces/Audit: `ambiguous_scope` / `missing_tenant_scope` の発生を既存 authz ログ経路に記録する (機微情報である tenant/workspace 実値は既存の redaction 方針に従う)。
- Alert/SLO dashboard: 追加の専用ダッシュボードは設けない。既存 authz エラー率監視の対象に含める。

## 互換性・移行・リリース

- Compatibility/versioning: 既存 API 契約・DB schema を変更しないため後方互換。既存 session を持つ利用者は次回リクエストから新しい scope 解決規則が適用される。
- Migration/backfill: データ移行は不要 (`active_workspace_id` は既存 session store 上の追加値で、初回アクセス時に所属検証から自動導出)。
- Rollout/rollback: 既存の `callbackUrl` 固定値ロジックへ戻すことで即時ロールバック可能。段階的リリースは不要 (単一 tenant 内で完結する変更)。

## テストと受入条件

- [ ] `AC-001`: サインイン成功後、遷移元がなければ `/sheets` に着地する。`/` には留まらない。
- [ ] `AC-002`: 戻り先に絶対 URL・スキーム付き・protocol-relative を与えても外部へ遷移せず、既定着地へ落ちる。
- [ ] `AC-003`: 所属 workspace 1 件の利用者は選択画面を経ずに業務画面へ到達する。
- [ ] `AC-004`: 所属 workspace 2 件以上の利用者は Workspace 選択後に本来の遷移先へ進む。
- [ ] `AC-005`: 業務画面 6 種 (`/sheets` `/sheets/new` `/sheets/{id}` `/catalog` `/catalog/releases` `/catalog/{projectId}`) が通常のブラウザ操作で 403 にならない。
- [ ] `AC-006`: 明示ヘッダーと session scope が併存し不一致のとき `ambiguous_scope` で拒否される。
- [ ] `AC-007`: どちらの scope 入力も無いとき `missing_tenant_scope` のままである (deny-by-default の非退行)。
- [ ] `AC-008`: scope 未解決時、利用者には 403 の生値ではなく Workspace 選択への回復導線が提示される。
- [ ] `AC-009`: CLI を一度も使わずに Hub Web だけで公開 → 状態確認 → 導入案内まで到達できる。
- [ ] `AC-010`: 確認コードを持たずに `/device` へ到達した利用者に、S01 への導線が提示される。
- [ ] `AC-011`: Web 公開経路で作成した成果物の権限境界が CLI 経路と一致し、広い権限を持たない。
- [ ] `AC-012`: Device 確認コードの 5 制約 (8 文字 / 10 分 / 5 回失敗 / 再利用不可 / 期限切れ再開始) が非退行である。
- Contract/integration/e2e/security/performance: `authorize()` の判定順回帰は既存 unit test で継続。着地先解決・Workspace 選択・S01 検査収束は frontend e2e で被覆。open redirect 防止はセキュリティ観点の contract test で固定する。

## 未決事項

- なし (2026-08-02 時点で qa-135/qa-136/qa-137 は確定済み。新規未決は未検出)。

## 境界 (本追補が変更しないもの)

- `authorize()` の判定順・role 判定・catalog / sheets API 実装は既存 owner のまま。frontend は解決済み scope の描画適用と回復導線の提示だけを担う。
- PublishRequest 状態機械・検査実装は既存 owner のまま。ui-ux は経路差を吸収した単一の表現と回復導線の提示だけを担う。
- サイドバー 9 項目の段階表示契約 (`docs/frontend-spec.md` §10) は変更しない。本件で新設するのは Workspace 選択 / 切替と既定着地であり、未実装 phase の前倒し表示ではない。
- テナント別 OIDC・role 4 種・単一認可ミドルウェア・Device Flow の既確定 (qa-115) は全面維持。

## 出典

| 種別 | 参照 |
|---|---|
| 確定質疑 | `system-spec/spec-state.json` qa-135 / qa-136 / qa-137 |
| 章 | `system-spec/frontend.md` / `system-spec/ui-ux.md` / `system-spec/auth.md` |
| 既存仕様 | `docs/frontend-spec.md` §10 / `docs/user-journeys.md` J1 |
| 実装現況 | `apps/hub/src/app/[tenant_slug]/signin/tenant-oidc-signin-form.tsx:83` / `apps/hub/src/app/page.tsx:1` / `apps/hub/src/middleware/authz.ts:68` / `apps/hub/src/app/device/device-approval-form.tsx:65` |

## 評価ゲート waiver

本追補の登録時点で、`assign-system-spec-completeness-evaluator` の総合 verdict は FAIL である。内訳は PASS 4 観点 (foundation_trace / decision_guidance / matrix_coverage / prompt_quality)、FAIL 2 観点 (design_knowledge_reflection / doc_freshness) で、high severity finding は 0 件。

FAIL 2 観点はいずれも本追補の内容品質ではなく既存資産に由来する。

- `design_knowledge_reflection` — `compile-spec-doc.py` が全 12 章の設計知識節を出典カードの逐語コピーのみで生成する構造的欠陥。本追補を取り下げても解消しない。
- `doc_freshness` — 指摘 3 件のうち内容起因の 2 件は評価レポート生成後に一次 GET で解消済み (report 側 evidence が成果物より古い)。残り 1 件は監査 fork の WebFetch 不在という方法論問題で、既存課題 HarnessHub-nq2 と同一。

ユーザー判断によりこの 2 観点を waive して本追補を confirmed として登録した。waiver の全文と残存リスクは `eval-log/run-dev-graph-system-spec-progress.json` の `evaluator_gate_waiver` を正本とする。
