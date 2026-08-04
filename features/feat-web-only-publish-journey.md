---
graph_node_id: "feat-web-only-publish-journey"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "ui-ux"
tags: ["macro-feature","stage-1","ui-ux","publish","web-only"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "CLI 非依存の Web 完結公開導線"
owners: ["daishiman"]
created_at: "2026-08-02T05:05:00Z"
updated_at: "2026-08-02T12:40:34.629164Z"
status: "active"
depends_on: ["feat-post-signin-scope-routing"]
related_nodes: ["spec-post-signin-workspace-scope","feat-publish-pipeline","feat-publisher-plugin","arch-harness-hub-frontend"]
resource_scope: ["features/feat-web-only-publish-journey.md","apps/hub/src/app/device/device-approval-form.tsx"]
purpose: "CLI を使わない利用者が Hub Web 単体で公開・状態確認・導入案内まで到達できるようにする"
goal: "S01 公開ウィザードの Web 経路を必須経路へ格上げし、Device 承認画面を行き止まりにしない"
scope_in: ["S01 への ZIP アップロード経路","CLI 取込経路と同一の Hub 側検査への収束","検査結果表示・文言・再投入導線の経路間統一","Device 承認画面の CLI 専用としての位置づけ明示と S01 への導線","Web 公開経路の権限境界を CLI 経路と同一化"]
scope_out: ["PublishRequest 状態機械と検査実装そのもの","scope 解決規則と authorize() の判定","Device Flow 確認コード制約の変更 (現行維持)","role 判定 owner の変更"]
acceptance: ["CLI を使わず Hub Web だけで公開→状態確認→導入案内まで到達できる","ZIP アップロード経路が CLI 取込経路と同一の Hub 側検査を通る","検査結果の表示・文言・再投入導線が両経路で同一である","確認コードを持たない /device 到達者に S01 への導線が提示される","/device に自分で開始していない確認コードは承認しない旨の警告が表示される","Web 公開経路の権限境界が CLI 経路と一致し広い権限を持たない","Device 確認コードの 5 制約が非退行である"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-security"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-web-only-publish-journey.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"25682ae448e2060b835c7ef0800a2aa722176ec6a8a4eb83baf680cb7c41d224","evaluator":"run-dev-graph-decompose (spec-post-signin-workspace-scope 由来。evaluator_gate_waiver 適用)","evidence_ref":"eval-log/run-dev-graph-system-spec-progress.json"}
source_lineage: {"imported_at":"2026-08-02T12:30:00Z","origin_kind":"system-spec-harness","source_digest":"564ffbb11081059fcaa732f66f20a849b57ee5c835a783a385910f8804d3f403","source_path":"specs/harness-hub-post-signin-workspace-scope-addendum.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.96
classification_reason: "qa-136【1】【2】【3】/qa-137【4】【5】の Web 完結導線を担うマクロ feature"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-web-only-publish-journey.md","confidence":0.96}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-jgj2","linked_at":"2026-08-02T08:13:27Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-02T05:05:00Z","missing_sections":[],"status":"complete"}
---

# feat-web-only-publish-journey — CLI 非依存の Web 完結公開導線

## 目的

CLI (Claude Code / Codex / Publisher) を使わない利用者が、Hub Web 単体で「公開 → 状態確認 → 導入案内」まで到達できるようにする。あわせて Device 承認画面を CLI 利用者専用の経路として位置づけ直し、Web 単独利用者にとって行き止まりにしない。

## 位置づけ

主対象利用者は CLI を使わない前提とする。`docs/user-journeys.md` J1 step 3b の「Web 代替: S01 公開ウィザード」を、Stage 1 の任意代替ではなく **必須経路へ格上げ**する。

## スコープ内

1. **S01 公開ウィザードの Web 経路**
   - S01 に ZIP アップロード経路を置く
   - CLI 取込経路と同一の Hub 側検査 (static validation / secret scan / policy) へ収束させる
   - 検査結果 (Green 自動公開 / Yellow・Red は Needs Fix 差し戻し) の表示・文言・再投入導線は CLI 経路と同一 UI を使い、経路ごとに別の状態表現を作らない

2. **Device 承認 (S08) の位置づけ**
   - OAuth Device Flow は CLI / Publisher 利用者専用の経路として維持し、Web 単独利用者の主導線からは分離する
   - 確認コードを持たずに `/device` へ到達した利用者へ次を明示し、行き止まりにしない
     - この画面は CLI / Publisher から開始した場合だけ使うこと
     - Web だけで公開したい場合は S01 公開ウィザードへ進むこと
   - 自分で開始していない確認コードは承認しない旨を画面で警告する
   - 確認コードの制約は現行維持: 英数 8 文字 / 有効期限 10 分 / 5 回失敗で無効 / 使用済み再利用不可 / 期限切れは Publisher・CLI 側で最初からやり直す

3. **Web 公開経路の権限境界**
   - S01 経由の公開は Device Flow token を用いず、通常の session 認可で行う
   - CLI 経路と Web 経路で権限境界 (作成者を owner に固定・現在の tenant/workspace scope 内に限定) を同一にする
   - Web 経路が CLI 経路より広い権限を持たない

## スコープ外

- PublishRequest 状態機械と検査実装そのもの (feat-publish-pipeline が所有)
- scope 解決規則・`authorize()` の判定 (feat-post-signin-scope-routing が所有)
- Device Flow の確認コード制約の変更 (現行維持であり本 feature では変更しない)
- role 判定 owner の変更

## 受入基準

1. CLI を一度も使わずに Hub Web だけで公開 → 状態確認 → 導入案内まで到達できる
2. ZIP アップロード経路が CLI 取込経路と同一の Hub 側検査を通る
3. 検査結果の表示・文言・再投入導線が CLI 経路と Web 経路で同一である
4. 確認コードを持たずに `/device` へ到達した利用者に S01 公開ウィザードへの導線が提示される
5. `/device` に「自分で開始していない確認コードは承認しない」旨の警告が表示される
6. Web 公開経路で作成した成果物の権限境界が CLI 経路と一致し、より広い権限を持たない
7. Device 確認コードの 5 制約 (8 文字 / 10 分 / 5 回失敗 / 再利用不可 / 期限切れ再開始) が非退行である

## 出典

`specs/harness-hub-post-signin-workspace-scope-addendum.md` D 節・E 節・G 節 / `system-spec/spec-state.json` qa-136 【1】【2】【3】・qa-137 【4】【5】
