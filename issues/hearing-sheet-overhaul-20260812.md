---
graph_node_id: "issue-hearing-sheet-overhaul-20260812"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["hearing-intake","user-org-admin","mvp","wizard","ui"]
priority: "high"
start_date: "2026-08-12"
target_date: null
iteration: null
title: "ヒアリングシート作成 UX 刷新 (7画面・enum 拡張・添付ステージング・詳細全項目表示)"
owners: ["daishiman"]
created_at: "2026-08-12T00:00:00Z"
updated_at: "2026-08-12T14:04:00Z"
status: "active"
depends_on: []
related_nodes: ["feat-hearing-intake","feat-user-org-admin"]
resource_scope: ["apps/hub/src/app/(dashboard)/sheets/","apps/hub/src/features/hearing-intake/","apps/hub/src/app/(dashboard)/users/","packages/schemas/hearing-intake/","apps/hub/tests/hearing-intake/"]
purpose: "依頼者要件に沿い、ヒアリングシート新規作成ウィザードの選択肢不足・添付不可・確認画面の重複・詳細画面の入力欠落を解消し、実運用で使える MVP 入力体験にする。"
goal: "7画面ウィザードで用途プロファイル enum を拡張し、作成時添付ステージングと詳細の form_snapshot 全項目表示、ユーザー詳細の email/最終ログイン表示まで一連で動作する。"
scope_in: ["profile enum の加算拡張","S10 ウィザード 8→7 画面統合","作成時添付ステージング","情報源・本当の課題入力欄","S12 form_snapshot 全項目表示","S17 email/最終ログイン表示","関連テストと仕様反映"]
scope_out: ["DB migration 新設","AI キュー契約変更","本番デプロイ","auth/role 体系変更"]
acceptance: ["profile enum が既存値を壊さず加算され UI/export が追従する","ウィザードが 7 画面で完走し添付ステージングを扱える","S12 が form_snapshot 主要グループをすべて表示する","S17 詳細に email と最終ログインが出る","hearing-intake focused tests が PASS する","仕様反映受領書を記録する"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-backend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/hearing-sheet-overhaul-20260812.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"f246463106d6e750af658ebafb56b460ffa49d0e325b4efa444b1024db1056aa","evaluator":"final-review-mvp","evidence_ref":"docs/features/feat-hearing-intake/mvp-sheet-overhaul-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-12T14:03:05Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "既存 feat-hearing-intake / feat-user-org-admin の実装後 UX 欠落を埋める単一の MVP 改善課題。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/hearing-sheet-overhaul-20260812.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-a70b","linked_at":"2026-08-12T14:07:30Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-12T14:03:05Z","missing_sections":[],"status":"complete"}
---

# ヒアリングシート作成 UX 刷新 (7画面・enum 拡張・添付ステージング・詳細全項目表示)

## 概要

`feat-hearing-intake` の MVP 後続改善。選択肢が少なく実運用パターンを覆えず、作成ウィザードでの添付が使えず、「整理・まとめ」と「確認」が重複し、詳細画面では `form_snapshot` の大半が欠落していた。併せてユーザー個別ダッシュボードで取得済みの email / 最終ログインが描画されていなかった。

## 変更内容

1. **profile enum 加算** — 用途・役割・文脈・動機・共有意図・優先度を既存値を壊さず追加。UI オプションと export ラベルを追従。
2. **ウィザード刷新** — 8→7 画面 (整理・まとめ + 確認 → 整理・確認)。Panel/Stack レイアウト。情報源・本当の課題入力。
3. **作成時添付ステージング** — ファイル選択とクリップボード貼り付け。25MB 上限。画像/動画/CSV/Excel。送信後に順次アップロードし一部失敗を許容。
4. **S12 詳細** — 申請時入力を基本情報/現状/用途プロファイル/要望パターン/参考URL/要望/試算のグループで全項目表示。
5. **S17 詳細** — email と最終ログイン日時を表示。

## 検証 (MVP 最小)

- `validate-system-plan.py --feature-package feature-package/feat-hearing-intake` → pass
- `apps/hub` hearing-intake vitest → 21 files / 208 tests pass

## 仕様影響

あり (additive)。詳細は `docs/features/feat-hearing-intake/mvp-sheet-overhaul-spec-reflection-receipt.md`。
