---
graph_node_id: "feat-feedback-image-attachment"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "ui-ux"
tags: ["macro-feature","ui-ux","feedback","attachment","S4"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "改善要望への画像添付 (スクリーンショットを含む・動画は対象外)"
owners: ["daishiman"]
created_at: "2026-08-14T00:00:00Z"
updated_at: "2026-08-15T13:37:01Z"
status: "draft"
depends_on: ["feat-feedback-loop"]
related_nodes: ["feat-tenant-data-retention","feat-workspace-governance"]
resource_scope: ["apps/hub/src/app","apps/hub/src/components","apps/hub/src/db"]
purpose: "改善要望が文章だけで届くため、UI の崩れのように「見れば一目で分かる」問題を文章で再現する負担が報告者にかかり、受け手も再現に時間を要している。画面の状態をそのまま添えられるようにして、報告と再現の間にある翻訳を無くす。動画は容量を理由に利用者が明示的に対象外とした。"
goal: "改善要望の投稿時に画像 (スクリーンショットを含む) を添付でき、添付された画像が要望の閲覧時に表示され、テナント境界を越えて参照されない状態。"
scope_in: ["改善要望投稿時の画像添付 (選択・貼り付け・ドラッグ&ドロップの受入方式の決定)","受け入れる画像形式とサイズ上限の決定","添付画像の保存先と、要望本体との関連付け","要望閲覧時の添付画像の表示","テナント境界を越えた添付画像の参照を拒否する認可","添付画像のデータ保持期間の既存方針への接続","添付失敗時 (形式違反・容量超過・保存失敗) の利用者への提示"]
scope_out: ["動画の添付 (利用者が容量を理由に明示的に対象外とした)","画像内の個人情報の自動マスキング","画像の編集・注釈付与","改善要望の起票・一覧・状態遷移そのもの (feat-feedback-loop の担当)","アプリ内からの画面キャプチャ機能の実装 (利用者が撮った画像の添付を範囲とする)","添付画像の全文検索・類似画像検索"]
acceptance: ["改善要望の投稿時に画像を添付でき、投稿後に要望と関連付いて保存される","要望の閲覧時に添付画像が表示される","許可外の形式または上限超過のファイルが拒否され、理由が利用者に提示される","他テナントの添付画像への参照が認可で拒否される","動画ファイルが受け付けられず、対象外である旨が利用者に提示される","添付画像がテナントのデータ保持方針の対象として扱われる","添付なしの改善要望が従来どおり投稿でき非退行である"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-backend","arch-harness-hub-security"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-feedback-image-attachment.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-15T13:37:01Z","origin_kind":"generated","source_digest":"df3a55215acaabb543e3dd5288f893470f928e2fb44622fef177ac540880e39f","source_path":"system-spec/ui-ux.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "C14 マクロ分解 (確定 system-spec と 2026-08-14 の利用者要望 S1-S8 から導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-feedback-image-attachment.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-14T00:00:00Z","missing_sections":[],"status":"incomplete"}
---

# 改善要望への画像添付 (スクリーンショットを含む・動画は対象外)

## 0. なぜこの feature があるのか

利用者は「改善要望に画像やスクリーンショット、動画などを入れられるようにしてほしい」と述べたあと、**その場で「動画はやめとこうか、容量多くなっちゃうんで、画像が入れれるように」と自ら撤回した**。

したがって動画は「未実装」ではなく**明示的に対象外**である。容量を理由に利用者自身が外した判断なので、後から善意で動画対応を足すのは決定の巻き戻しにあたる。

## 1. 目的

改善要望が文章だけで届くため、UI の崩れのように「見れば一目で分かる」問題を文章で再現する負担が報告者にかかり、受け手も再現に時間を要している。画面の状態をそのまま添えられるようにして、報告と再現の間にある翻訳を無くす。動画は容量を理由に利用者が明示的に対象外とした。

## 2. ゴール

改善要望の投稿時に画像 (スクリーンショットを含む) を添付でき、添付された画像が要望の閲覧時に表示され、テナント境界を越えて参照されない状態。

## 3. 含むもの

- 改善要望投稿時の画像添付 (選択・貼り付け・ドラッグ&ドロップの受入方式の決定)
- 受け入れる画像形式とサイズ上限の決定
- 添付画像の保存先と、要望本体との関連付け
- 要望閲覧時の添付画像の表示
- テナント境界を越えた添付画像の参照を拒否する認可
- 添付画像のデータ保持期間の既存方針への接続
- 添付失敗時 (形式違反・容量超過・保存失敗) の利用者への提示

## 4. 含まないもの

- 動画の添付 (利用者が容量を理由に明示的に対象外とした)
- 画像内の個人情報の自動マスキング
- 画像の編集・注釈付与
- 改善要望の起票・一覧・状態遷移そのもの (feat-feedback-loop の担当)
- アプリ内からの画面キャプチャ機能の実装 (利用者が撮った画像の添付を範囲とする)
- 添付画像の全文検索・類似画像検索

## 5. 受入基準

- 改善要望の投稿時に画像を添付でき、投稿後に要望と関連付いて保存される
- 要望の閲覧時に添付画像が表示される
- 許可外の形式または上限超過のファイルが拒否され、理由が利用者に提示される
- 他テナントの添付画像への参照が認可で拒否される
- 動画ファイルが受け付けられず、対象外である旨が利用者に提示される
- 添付画像がテナントのデータ保持方針の対象として扱われる
- 添付なしの改善要望が従来どおり投稿でき非退行である

## 6. 前提となる feature

- `feat-feedback-loop`

## 7. 参照するアーキテクチャ

- `arch-harness-hub-frontend`
- `arch-harness-hub-backend`
- `arch-harness-hub-security`

## 8. 出所

確定仕様 `spec-harness-hub-requirements` および `system-spec/ui-ux.md` を macro 分解したもの。
正本は `system-spec/spec-state.json` (完成度 evaluator 総合 PASS / `system-spec/resume-receipt.json`)。
本 feature は仕様本文を複製せず、`architecture_refs` と source lineage で参照する。
P01..P13 の phase task は本 feature からは生成せず、`run-system-dev-plan` (ミクロ層) が所有する。
