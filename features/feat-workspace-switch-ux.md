---
graph_node_id: "feat-workspace-switch-ux"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "ui-ux"
tags: ["macro-feature","stage-1","ui-ux","frontend","workspace"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "Workspace 選択・切替とスコープ不足の回復導線"
owners: ["daishiman"]
created_at: "2026-08-02T05:05:00Z"
updated_at: "2026-08-10T18:00:00+09:00"
status: "active"
depends_on: ["feat-post-signin-scope-routing"]
related_nodes: ["spec-post-signin-workspace-scope","feat-dual-catalog-web","feat-workspace-governance","arch-harness-hub-frontend"]
resource_scope: ["features/feat-workspace-switch-ux.md"]
purpose: "解決済み scope を利用者が認識・変更できるようにし、scope 未解決を行き止まりにしない"
goal: "Workspace 選択/切替 UI と、403 を露出させない回復導線を提供する"
scope_in: ["Workspace 選択画面 (所属 2 件以上)","所属 1 件時の自動選択と切替 UI 非表示","共通シェルへの Workspace 表示と切替の常設","切替時の旧 scope 内容の即時非表示","scope 未解決時の回復導線提示 (403 非露出)"]
scope_out: ["scope 解決規則と authorize() の判定","サインイン後の着地先解決と open redirect 防止","catalog/sheets の画面本体","role 判定と権限境界の変更"]
acceptance: ["所属 1 件の利用者は選択画面を経ずに到達し切替 UI も表示されない","所属 2 件以上の利用者は選択後に本来の遷移先へ進む","共通シェルから常時 Workspace を切り替えられる","切替直後、新 scope の応答が返るまで旧 scope の内容が表示されない","scope 未解決時に 403 の生値ではなく Workspace 選択への回復導線が提示される","401/403 時に旧データが描画されない (qa-118 契約の非退行)"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-workspace-switch-ux.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"25682ae448e2060b835c7ef0800a2aa722176ec6a8a4eb83baf680cb7c41d224","evaluator":"run-dev-graph-decompose (spec-post-signin-workspace-scope 由来。evaluator_gate_waiver 適用)","evidence_ref":"eval-log/run-dev-graph-system-spec-progress.json"}
source_lineage: {"imported_at":"2026-08-02T12:30:00Z","origin_kind":"system-spec-harness","source_digest":"564ffbb11081059fcaa732f66f20a849b57ee5c835a783a385910f8804d3f403","source_path":"specs/harness-hub-post-signin-workspace-scope-addendum.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.96
classification_reason: "qa-135【4】/qa-136【4】【5】の選択・切替と回復導線を担うマクロ feature"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-workspace-switch-ux.md","confidence":0.96}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-f91a","linked_at":"2026-08-02T08:13:24Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-02T05:05:00Z","missing_sections":[],"status":"complete"}
---

# feat-workspace-switch-ux — Workspace 選択・切替とスコープ不足の回復導線

## 目的

解決済み scope を利用者が認識・変更できるようにし、scope が未解決のときに 403 の生値で行き止まりにせず「Workspace を選べば回復する状態」として提示する。

## 位置づけ

feat-post-signin-scope-routing が解決した scope を、利用者に見せ・選ばせ・切り替えさせる表示層を担う。scope の解決規則そのものは所有しない。

## スコープ内

1. **Workspace 選択画面**
   - 所属 workspace が 2 件以上のときに選択画面を挟み、選択後に本来の遷移先へ進む
   - 所属が 1 件のときは自動選択し、選択画面を挟まない

2. **共通シェルの切替 UI**
   - 現在の Workspace 表示と切替を共通シェルに常設する
   - 所属が 1 件のときは切替 UI を出さず現在値の表示のみとし、選択操作を強いない
   - 切替先は安全な同一 origin の `returnTo` とし、現在の Workspace はリンクにしない
   - 切替時は scope 情報を持たない server intermediate 文書を先に表示し、新 scope の応答が返る前に旧 scope の内容を表示対象外にする (qa-118 【1】の scope 変更時契約を継承)
   - WorkspaceSwitcher 本体は server component + `<details>` + 素の `<a>` で構成し、開閉専用の共通 client island だけで外側クリック・Escape・別メニューとの排他制御を行う。切替は client router を使わない

3. **スコープ不足の利用者向け表現**
   - 403 `missing_tenant_scope` をエンドユーザーへ露出させない
   - scope 未解決は失敗ではなく回復可能な状態として扱い、Workspace 選択への回復導線を提示する
   - qa-118 【1】の「401/403 は ErrorState のみ (旧データを描画しない)」契約は維持する。本項は ErrorState の文言と回復導線を定めるものであり、旧 scope データの継続表示を許すものではない

## スコープ外

- scope 解決規則・`authorize()` の判定 (feat-post-signin-scope-routing が所有)
- サインイン後の着地先解決と open redirect 防止 (同上)
- catalog / sheets の画面本体 (feat-dual-catalog-web が所有)
- role 判定と権限境界の変更

## 受入基準

1. 所属 workspace 1 件の利用者は選択画面を経ずに業務画面へ到達し、切替 UI も表示されない
2. 所属 workspace 2 件以上の利用者は選択後に本来の遷移先へ進む
3. 共通シェルから常時 Workspace を切り替えられる
4. 切替直後、新 scope の応答が返るまで旧 scope の内容が表示されない
5. scope 未解決時、利用者には 403 の生値ではなく Workspace 選択への回復導線が提示される
6. 401/403 時に旧データが描画されない (qa-118 契約の非退行)

## 出典

`specs/harness-hub-post-signin-workspace-scope-addendum.md` C 節・F 節 / `system-spec/spec-state.json` qa-135 【4】・qa-136 【4】【5】

## 実装進捗メモ

2026-08-08 に入口側の最小結線を `feat-post-signin-scope-routing` 側で先行し、2026-08-10 に共通シェル切替と回復表現を結線した。Beads の lifecycle 更新と本番反映はこの実装記録とは別に扱う。

| 受入 | 状態 | 備考 |
| --- | --- | --- |
| 所属 1 件は選択画面なし | 実装済み | `resolveSessionScope` の singleton 自動確定 |
| 所属 2 件以上は選択後に進む | 実装済み | `/` の Workspace 選択 + `/signin/workspace` cookie + 安全な `returnTo` |
| 共通シェルから常時切替 | 実装済み | desktop / mobile 共通の server-first `WorkspaceSwitcher` + 開閉専用 client island |
| 切替時の旧 scope 非表示 | 実装済み | cookie 設定後、旧 scope を含まない中間文書を commit してから新 scope へ遷移 |
| 403 生値を出さず回復導線 | 実装済み | edge navigation HTML と RSC ErrorState が同じ回復文言・導線を使用 |
