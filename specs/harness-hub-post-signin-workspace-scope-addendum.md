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
updated_at: "2026-08-13T11:15:00+09:00"
status: "active"
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["spec-harness-hub-requirements","arch-harness-hub-frontend","arch-harness-hub-security"]
resource_scope: ["specs/harness-hub-post-signin-workspace-scope-addendum.md","system-spec/frontend.md","system-spec/ui-ux.md","system-spec/auth.md"]
purpose: "ログイン後に業務画面へ到達できない実装未結線を是正し、CLI 非依存で Web 完結する導線の製品契約を固定する"
goal: "qa-135/qa-136/qa-137 を実装計画が参照できる単一の仕様境界として維持する"
scope_in: ["サインイン後の着地先と戻り先の安全性","ブラウザ通常遷移での tenant/workspace scope 解決","active workspace の選択と切替","CLI 非依存の Web 完結公開導線","Device 承認画面の位置づけと行き止まり回避","scope 不足時の利用者向け表現と回復導線"]
scope_out: ["authorize() の判定順・role 判定の変更","catalog/sheets API 実装と DB schema の変更","PublishRequest 状態機械と検査実装の owner 変更","サイドバー 9 項目の段階表示契約の変更"]
acceptance: ["遷移元が無いサインイン成功で /dashboard へ着地し / に留まらない","絶対 URL・スキーム付き・protocol-relative の戻り先は既定着地へ落ちる (open redirect 防止)","業務画面 6 種が通常のブラウザ操作で 403 missing_tenant_scope にならない","明示ヘッダーと session scope が不一致なら ambiguous_scope で拒否する","両方の scope 入力が無い場合は missing_tenant_scope のまま (deny-by-default 非退行)","所属 workspace 1 件は選択画面を挟まず 2 件以上は選択後に本来の遷移先へ進む","CLI を使わず Hub Web だけで公開→状態確認→導入案内まで到達できる","確認コードを持たない /device 到達者へ S01 公開ウィザードの導線が提示される","Web 公開経路の権限境界が CLI 経路と同一で広い権限を持たない","Device 確認コードの 5 制約 (8 文字/10 分/5 回失敗/再利用不可/期限切れ再開始) が非退行"]
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
implementation_readiness: {"checked_at":"2026-08-02T04:58:10Z","missing_sections":[],"status":"complete"}
---

# Harness Hub サインイン後 Workspace スコープ導線 仕様追補

## 目的

ログイン自体は成功するのに業務画面 (`/sheets` `/catalog` 系) が 403 `missing_tenant_scope` で開けない実装未結線を是正し、あわせて CLI を使わない利用者が Hub Web 単体で公開・状態確認・導入案内まで到達できるようにするための製品契約を固定する。

本書は `system-spec/` の確定質疑 qa-135 (frontend.web) / qa-136 (ui-ux.web) / qa-137 (auth.web) を、実装計画が参照できる単一の仕様境界としてまとめた追補である。既確定の qa-062 / qa-065 / qa-115 / qa-118 は全面維持し、本書はその差分だけを定める。

## 背景 (観測された事象)

本番 URL で以下が確認されている。

| 画面 | URL | 状態 |
|---|---|---|
| サインイン | `/harness-hub/signin` | 表示可能 |
| Device 承認 | `/device` | 表示可能 |
| ヘルス情報 | `/health` | JSON 応答 |
| 業務画面 | `/sheets` `/sheets/new` `/sheets/{id}` `/catalog` `/catalog/releases` `/catalog/{projectId}` | 通常のブラウザ操作で 403 `missing_tenant_scope` |

原因は 4 点の未結線である。

1. サインイン成功後の戻り先が `/` 固定 — `apps/hub/src/app/[tenant_slug]/signin/tenant-oidc-signin-form.tsx:83`
2. `/` は稼働確認だけを表示する — `apps/hub/src/app/page.tsx:1`
3. 当初仕様ではダッシュボード完成前の `/` を `/sheets` へ送ることになっていた（現在は後続の appr-034 により `/dashboard`）— `docs/frontend-spec.md` §10
4. 認可は業務画面にテナント情報を要求するが、通常のブラウザ遷移では該当ヘッダーが付与されない — `apps/hub/src/middleware/authz.ts:68`

利用者の操作誤りではなく実装の未結線である。

## 確定契約

### A'. 未認証ランディングと拒否表現 (2026-08-08 追補 / issue-hub-root-500-signin-20260808)

- 未認証の `/` はテナント ID 入力の入口とする（稼働確認表示は残す）。入力は JS 無し GET で
  `/signin` へ渡り、slug 形のみ検証したうえで `/{tenant_slug}/signin` へ 303 する。
  テナント存在有無は入口で答えない。
- `/` は session cookie を読むため **動的 route でなければならない**。静的 prerender すると
  本番で `DYNAMIC_SERVER_USAGE` により 500 になる。ビルド成果物検査で再発を防ぐ。
- 認証済みで active workspace が未確定（所属 2 件以上で未選択、または所属 0 件）のとき、
  `/` 上で Workspace 選択または案内を出し、業務画面の JSON 403 行き止まりにしない。
  選択の受理と cookie 書き込みは専用 route が fail-closed で行う。
- ブラウザの画面遷移に対する認可拒否は、生の JSON ではなく人間可読な HTML で回復導線を示す。
  API・Bearer・機械クライアントの JSON 契約は変えない。
- public path の「入口 1 枚だけ」は完全一致 allowlist に置き、前方一致で子 route を巻き込まない。

### A. サインイン後の着地先 (qa-135 【1】【2】)

- `callbackUrl` の固定値 `"/"` を廃止し、(a) サインイン開始時に保存した遷移元 path、(b) 無ければ既定着地 `/dashboard` の順で解決する。
- 既定着地は単一の定数から解決し、画面ごとに散らさない。着地内容は後続の正規 contract `harness-hub-post-signin-landing-observability-contract.md` に従う。
- 戻り先は **同一 origin の相対 path のみ許可**する。絶対 URL・スキーム付き・protocol-relative (`//`) は既定着地へ落とす (open redirect 防止)。
- `/` は未認証時のみ稼働確認表示を維持する。認証済み session がある場合は既定着地へ redirect し、`/` を認証済み利用者の終着点にしない。稼働確認の正本は `/health` とする。

### B. ブラウザ通常遷移でのスコープ解決 (qa-135 【3】 / qa-137 【1】【2】【3】)

- `authorize()` の判定順 (public → 認証 → scope 一意性 → tenant 一致 → workspace 所属) と deny-by-default は **変更しない**。本追補は判定の緩和ではなく、判定へ渡す scope の入力系統の定義である。
- scope 解決の正規入力を 2 系統とする。
  - (a) **明示ヘッダー** — API / 機械クライアント (Publisher・CLI・Device Flow token 保持クライアント) 専用。
  - (b) **session の active tenant/workspace** — ブラウザ通常遷移。server 側で session principal から解決する。
- 両方が存在して値が一致しない場合は `ambiguous_scope` として拒否する。どちらかを黙って優先しない。
- 両方とも存在しない場合は従来どおり `missing_tenant_scope` とする。
- 両経路は同一の `authorize()` に収束させ、判定の二重実装を作らない。
- scope 未解決のまま業務画面本体を描画しない。
- session に active workspace を束縛できるのは principal の所属検証を通過した workspace だけとし、切替のたびに所属を再検証する。session 保持値を所属検証の代替に使わない。

### C. active workspace の選択と切替 (qa-135 【4】 / qa-136 【4】)

- session に active workspace を保持する。
- 所属 workspace が **1 件**のときは自動選択し、選択画面を挟まない。切替 UI も出さず現在値の表示のみとする。
- 所属 workspace が **2 件以上**のときは Workspace 選択画面を挟み、選択後に本来の遷移先へ進む。
- 切替は共通シェルから常時可能とする。切替時は新 scope の応答が返る前に旧 scope の内容を表示対象外にする (qa-118 【1】の scope 変更時契約を継承)。
- 共通シェルの切替は desktop / mobile で同じ server-first UI を使い、現在の Workspace は状態表示としてリンクにしない。`details` の外側クリック・Escape・別メニューとの排他開閉だけを共通の小さな client island が担い、切替リンク自体は素の `<a>` による document 遷移を維持する。
- 切替後は、既存の安全な相対着地先解決を通した `returnTo` へ戻る。絶対 URL・スキーム付き・protocol-relative は既定着地へ落とす。
- cookie を設定する受け口は即時 redirect で最終画面へ直行せず、scope 固有情報を含まない server intermediate 文書を先に返す。中間文書を commit した後に新 scope の画面へ進めることで、最終応答待ちの間に旧 scope の業務内容を残さない。

### D. CLI 非依存の Web 完結導線 (qa-136 【1】【2】)

- 主対象利用者は CLI を使わない前提とし、**Hub Web 単体で「公開 → 状態確認 → 導入案内」まで到達できること**を ui-ux.web の受入条件に加える。
- `docs/user-journeys.md` J1 step 3b の「Web 代替: S01 公開ウィザード」を、Stage 1 の任意代替ではなく **必須経路へ格上げ**する。
- S01 に ZIP アップロード経路を置き、CLI 取込経路と同一の Hub 側検査 (static validation / secret scan / policy) へ収束させる。
- 検査結果 (Green 自動公開 / Yellow・Red は Needs Fix 差し戻し) の表示・文言・再投入導線は CLI 経路と同一 UI を使い、経路ごとに別の状態表現を作らない。

### E. Device 承認の位置づけ (qa-136 【3】 / qa-137 【4】)

- OAuth Device Flow は CLI / Publisher 利用者専用の経路として維持し、Web 単独利用者の主導線からは分離する。
- 確認コードを持たずに `/device` へ到達した利用者に対し、次の 2 点を画面上で明示して行き止まりにしない。
  - この画面は CLI / Publisher から開始した場合だけ使うこと
  - Web だけで公開したい場合は S01 公開ウィザードへ進むこと
- 確認コードの制約は現行のまま変更しない。
  - 英数 8 文字
  - 有効期限 10 分
  - 5 回失敗で無効
  - 使用済みコードは再利用不可
  - 期限切れは Publisher / CLI 側で最初からやり直す
- 自分で開始していない確認コードは承認しない旨を画面で警告する。approve 時に選択した Workspace の範囲を超える権限を付与しない。

### F. スコープ不足の利用者向け表現 (qa-136 【5】)

- 403 `missing_tenant_scope` をエンドユーザーへ露出させない。
- scope 未解決は失敗ではなく「Workspace を選べば回復する状態」として扱い、Workspace 選択への回復導線を提示する。
- qa-118 【1】の「401/403 は ErrorState のみ (旧データを描画しない)」契約は維持する。本項は ErrorState の文言と回復導線を定めるものであり、旧 scope データの継続表示を許すものではない。

### G. Web 公開経路の権限境界 (qa-137 【5】【6】)

- S01 Web 公開ウィザード経由の公開は Device Flow token を用いず、通常の session 認可で行う。
- CLI 経路と Web 経路で権限境界 (作成者を owner に固定・現在の tenant/workspace scope 内に限定) を同一にし、**Web 経路が CLI 経路より広い権限を持たない**。
- サインイン後の戻り先の解決結果に対しても通常の `authorize()` を適用し、redirect を認可の迂回路にしない。

## 受入基準

1. サインイン成功後、遷移元がなければ `/dashboard` に着地する。`/` には留まらない。
2. 戻り先に絶対 URL・スキーム付き・protocol-relative を与えても外部へ遷移せず、既定着地へ落ちる。
3. 所属 workspace 1 件の利用者は選択画面を経ずに業務画面へ到達する。
4. 所属 workspace 2 件以上の利用者は Workspace 選択後に本来の遷移先へ進む。
5. 業務画面 6 種 (`/sheets` `/sheets/new` `/sheets/{id}` `/catalog` `/catalog/releases` `/catalog/{projectId}`) が通常のブラウザ操作で 403 にならない。
6. 明示ヘッダーと session scope が併存し不一致のとき `ambiguous_scope` で拒否される。
7. どちらの scope 入力も無いとき `missing_tenant_scope` のままである (deny-by-default の非退行)。
8. scope 未解決時、利用者には 403 の生値ではなく Workspace 選択への回復導線が提示される。
9. CLI を一度も使わずに Hub Web だけで公開 → 状態確認 → 導入案内まで到達できる。
10. 確認コードを持たずに `/device` へ到達した利用者に、S01 への導線が提示される。
11. Web 公開経路で作成した成果物の権限境界が CLI 経路と一致し、広い権限を持たない。
12. Device 確認コードの 5 制約 (8 文字 / 10 分 / 5 回失敗 / 再利用不可 / 期限切れ再開始) が非退行である。

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

## 目的と成功状態

利用者がサインイン後に有効な Workspace を選択・保持でき、権限外または未選択の状態を安全に解消できることを成功状態とする。

## 用語と主体

active workspace は現在の操作対象、provider-admin / workspace-admin / member は session role、利用者と管理者が主要主体である。

## スコープ

未認証入口、サインイン後着地、Workspace 選択・切替、権限不足の表現を対象とする。

## ユースケースとユーザーフロー

未認証者はサインインへ進み、認証済み利用者は active workspace を解決または選択して業務画面へ遷移する。

## 機能要件

既定着地、通常ブラウザ遷移、Workspace 選択、CLI 非依存導線、device 承認、権限不足表示を既存 A'〜G の契約どおり提供する。

## ビジネスルールと検証

tenant / workspace scope と role を server 側で検証し、UI の非表示だけを認可根拠にしない。

## データモデル

既存 tenant、workspace membership、active workspace、session role を利用し、新しい DB schema は追加しない。

## API契約

既存 route と server action の契約を維持し、新しい公開 API は追加しない。

## イベント・非同期処理

Workspace 選択と redirect は request 内で確定する。新しい queue や background job は追加しない。

## UI・状態遷移

signin、workspace 選択、dashboard、権限不足の状態を区別し、循環 redirect を作らない。

## 認証・認可

署名済み session と server-side authorization を正本とし、scope 不足は deny-by-default で扱う。

## 非機能要件

server-first、tenant 分離、直接 URL でも同じ認可、利用者が復旧行動を理解できる表示を維持する。

## エラー・例外・回復

未認証は signin、Workspace 未選択は選択画面、権限不足は再サインイン loop を起こさない拒否画面へ分ける。

## 可観測性

拒否理由と scope 解決段階を secret を含めず記録し、同一 HTTP status に原因を潰さない。

## 互換性・移行・リリース

既存 route、session claim、DB schema を維持し、段階的に導線を置換する。

## テストと受入条件

受入基準に加え、未認証・scope 未選択・role 別・直接 URL・redirect loop の回帰 test を必須とする。

## 未決事項

本追補の確定範囲に blocking な未決事項はない。将来の role 追加は別契約で扱う。
