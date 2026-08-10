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
updated_at: "2026-08-10T08:58:00Z"
status: "active"
depends_on: ["feat-post-signin-scope-routing","feat-stage0-distribution-gate"]
related_nodes: ["spec-post-signin-workspace-scope","feat-publish-pipeline","feat-publisher-plugin","feat-stage0-distribution-gate","arch-harness-hub-frontend"]
resource_scope: ["features/feat-web-only-publish-journey.md","apps/hub/src/app/(workspace)/catalog/publish/page.tsx","apps/hub/src/app/api/v1/projects/route.ts","apps/hub/src/components/publish/PublishWizard.tsx","apps/hub/src/lib/publish-journey/","apps/hub/src/app/device/device-approval-form.tsx","packages/schemas/publish-pipeline/"]
purpose: "CLI を使わない利用者が Hub Web 単体で公開・状態確認・導入案内まで到達できるようにする"
goal: "S01 公開ウィザードの Web 経路を必須経路へ格上げし、Device 承認画面を行き止まりにしない"
scope_in: ["S01 での Project 作成・既存 Project 指定と Skill ZIP アップロード","CLI 取込経路と同一の Hub 側検査への収束","PublishRequest の全状態確認と同一 request への検査結果表示・再投入","Device 承認画面の CLI 専用としての位置づけ明示と S01 への導線","Web 公開経路の権限境界を CLI 経路と同一化","H7 未成立時の fail-closed な導入案内"]
scope_out: ["PublishRequest 状態機械と検査実装そのもの","scope 解決規則と authorize() の判定","Device Flow 確認コード制約の変更 (現行維持)","role 判定 owner の変更","H7 成立前の Skill 実導入・利用不能な catalog/install 導線","wrangler を必要とする web_app の Web 公開"]
acceptance: ["CLI を使わず Hub Web だけで Project 準備→Skill 公開→状態確認→導入案内まで到達でき、H7 未成立中は実導入不可を明示する","ZIP アップロード経路が CLI 取込経路と同一の Hub 側検査を通る","検査結果の表示・文言・同一 PublishRequest への再投入導線が両経路で同一である","確認コードを持たない /device 到達者に S01 への導線が提示される","/device に自分で開始していない確認コードは承認しない旨の警告が表示される","Web 公開経路の権限境界が CLI 経路と一致し広い権限を持たない","Device 確認コードの 5 制約が非退行である","web_app は Web で選択できず Publisher CLI と Device 承認が必要だと分かる","公開済みでも H7 未成立中は利用不能な catalog/install リンクを成功終端として表示しない"]
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

CLI (Claude Code / Codex / Publisher) を使わない利用者が、Hub Web 単体で「Project 準備 → Skill 公開 → 状態確認 → 導入案内」まで到達できるようにする。導入案内は、H7 が未成立の間は実導入できない事実と後続条件を示す fail-closed な終端とする。あわせて Device 承認画面を CLI 利用者専用の経路として位置づけ直し、Web 単独利用者にとって行き止まりにしない。

## 位置づけ

主対象利用者は CLI を使わない前提とする。`docs/user-journeys.md` J1 step 3b の「Web 代替: S01 公開ウィザード」を、Stage 1 の任意代替ではなく **必須経路へ格上げ**する。

## スコープ内

1. **S01 公開ウィザードの Web 経路**
   - S01 で Project を新規作成するか、現在の Workspace で自分が owner の既存 Project を指定して Skill ZIP を投入する
   - CLI 取込経路と同一の Hub 側検査 (static validation / secret scan / policy) へ収束させる
   - 作成・upload・submit は段階別の Idempotency-Key と PublishRequest ID を checkpoint として保持し、途中失敗の再試行で Project や request を重複作成しない
   - 検査結果 (Green 自動公開 / Yellow・Red は Needs Fix 差し戻し) の表示・文言を CLI 経路と共通化し、Needs Fix は `cancel` で同じ request を Draft に戻して修正版 ZIP を再投入する
   - Draft から Published / Failed までの全 status を表示し、自動進行中だけ既存の polling 規約で状態確認する。公開要求 ID を URL に残し、再読込後も状態確認を再開できる
   - `web_app` は wrangler による作者 local session からの deployment と疎通確認が必須のため選択肢に出さず、Publisher CLI と Device 承認へ案内する

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

4. **H7 未成立時の導入案内**
   - [Stage 0 technical gate 終結記録](../docs/features/feat-stage0-distribution-gate/stage0-gate-conclusion.md) の `H7_NOT_ESTABLISHED` を前提とする
   - Published は「Hub の公開記録が完了した」状態として表示するが、「実際に導入できる」とは表現しない
   - 利用可能な descriptor が確定するまで、catalog/install の成功リンクや推測した導入コマンドを表示しない

## スコープ外

- PublishRequest 状態機械と検査実装そのもの (feat-publish-pipeline が所有)
- scope 解決規則・`authorize()` の判定 (feat-post-signin-scope-routing が所有)
- Device Flow の確認コード制約の変更 (現行維持であり本 feature では変更しない)
- role 判定 owner の変更
- H7 の再検証・配布方式の確定・Skill の実導入
- wrangler 実行を必要とする `web_app` の Web 公開

## 受入基準

1. CLI を一度も使わずに Hub Web だけで Project 準備 → Skill 公開 → 状態確認 → 導入案内まで到達できる。H7 未成立中の導入案内は実導入不可を正直に伝え、利用不能なリンクを成功終端にしない
2. ZIP アップロード経路が CLI 取込経路と同一の Hub 側検査を通る
3. 検査結果の表示・文言・再投入導線が CLI 経路と Web 経路で同一である
4. 確認コードを持たずに `/device` へ到達した利用者に S01 公開ウィザードへの導線が提示される
5. `/device` に「自分で開始していない確認コードは承認しない」旨の警告が表示される
6. Web 公開経路で作成した成果物の権限境界が CLI 経路と一致し、より広い権限を持たない
7. Device 確認コードの 5 制約 (8 文字 / 10 分 / 5 回失敗 / 再利用不可 / 期限切れ再開始) が非退行である
8. `web_app` は Web ウィザードで選択できず、Publisher CLI と Device 承認が必要だと分かる
9. Project 作成または publish の途中失敗を同じ checkpoint で再試行しても Project / PublishRequest を重複作成せず、Needs Fix は同一 request を Draft へ戻して再投入できる

## 出典

`specs/harness-hub-post-signin-workspace-scope-addendum.md` D 節・E 節・G 節 / `system-spec/spec-state.json` qa-136 【1】【2】【3】・qa-137 【4】【5】
