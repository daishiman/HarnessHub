---
graph_node_id: "feat-card-block-authoring"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "ui-ux"
tags: ["card-ui","markdown","remark","sanitize","editor","preview"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "カードブロック本文記法と編集/プレビュー 2 ペイン"
owners: ["daishiman"]
created_at: "2026-08-13T22:39:59Z"
updated_at: "2026-08-15T23:38:37.521089Z"
status: "draft"
depends_on: ["feat-card-mutation-safety","feat-semantic-emphasis-icons"]
related_nodes: ["arch-harness-hub-frontend","arch-harness-hub-security","arch-harness-hub-design-system","feat-docs-cms"]
resource_scope: ["packages/ui/src/components/Markdown.tsx","packages/ui/src/components/Markdown.test.tsx","packages/ui/src/components/Tabs.tsx","apps/hub/src/components/docs/markdown-view.ts","apps/hub/src/components/docs/markdown-editor.ts","apps/hub/src/app/(dashboard)/docs/[id]/document-detail-content.tsx","apps/hub/src/app/(dashboard)/docs/[id]/edit/document-edit-page.tsx","apps/hub/src/app/(dashboard)/docs/new/document-create-form.tsx","apps/hub/src/app/api/v1/docs/[id]/images/route.ts","apps/hub/src/app/api/v1/docs/[id]/images/[imageId]/route.ts","apps/hub/src/features/docs-cms/image-service.ts","apps/hub/tests/browser"]
purpose: "現状 (current) の MarkdownEditor は edit/preview Tabs を持ち、編集画面には別途、保存済み本文の preview がある。しかし 2 列・3 列の意味あるカード container、大画面の同時編集、不正記法の警告契約は未実装である。既存の安全な Markdown 経路を広げ、本文をカード単位で構成できるようにする。"
goal: "到達状態 (achieved): 既存 Markdown.tsx の MarkdownView / ImageGroup / MarkdownEditor / Tabs を拡張し、:::cards container を同一 sanitize 経路で描画する。編集中は大画面は 2 ペイン、狭幅は Tabs とし、記法ミスで本文全体を壊さない。"
scope_in: ["packages/ui/src/components/Markdown.tsx の既存 MarkdownView / ImageGroup / MarkdownEditor / Tabs を拡張し、別 renderer を作らない",":::cards cols=2|3 の内側に :::card を並べる container 記法、DOM 記述順、大画面 2/3 列・中幅最大 2 列・狭幅 1 列のレスポンシブ描画を実装する","hh-cards / hh-card と data-cols=2|3 だけを sanitize allowlist に加え、script / iframe / style / class / id / on* は引き続き除去する","未知 cols、未閉じ、不正な嵌套は例外を投げず通常 Markdown へ safe degradation し、編集中だけ保存を妨げない非 blocking 警告を表示する","draft の編集/preview は大画面は 2 ペインで同時表示し、狭幅は Tabs で同じ 2 面を切り替える。両方の preview は同一 MarkdownView を使う","既存の保存済み preview は『現在保存され、他の利用者が見る内容』の baseline、MarkdownEditor preview は未保存 draft の結果とする。同じ draft を表す第 3 の preview は追加しない","2 列 / 3 列の雛形挿入と、invalid syntax の場所・修正方法を示す非 blocking 警告を MarkdownEditor の既存 toolbar / status 領域に加える","カード内画像は既存 Docs image API / R2 と ImageGroup のアップロード・参照契約だけを使い、新しい保存先を作らない","VRT baseline は test-only の比較証跡とし、runtime の画像カタログ・Docs image API / R2 object・Markdown 本文へ混在させない","markdown-view / markdown-editor の dynamic import 境界、見出し/TOC 際層、sanitize 回帰、未保存面の離脱抑止を維持する"]
scope_out: ["Markdown 以外の新しい本文保存形式、任意 HTML、class / style の allowlist 開放","画像の新しい保存先・暗号化・削除契約、および VRT baseline の runtime asset 転用","一覧カードと status_counts (これは feat-card-list-shell の責務)","Idempotency-Key、entity revision、412 競合応答 (これは feat-card-mutation-safety の責務)","semantic icon / color token の供給元の実装 (これは feat-semantic-emphasis-icons の責務)","保存済み baseline と draft preview 以外の第 3 の preview renderer"]
acceptance: [":::cards cols=2 / cols=3 と :::card で作った行を縦に積め、大画面・中幅・狭幅の列数が契約どおりに変わる","列数が変わっても DOM 順は記述順を保ち、読上げ順と視覚順が一致する","未知 cols、未閉じ、不正嵌套は safe degradation してドキュメント全体を描画でき、編集時は非 blocking 警告から修正場所が分かる","sanitize 後に hh-cards / hh-card と正規化済み data-cols だけが残り、script / iframe / style / class / id / on* は除去される","カードが見出しレベルと TOC を壊さず、複数画像は既存 ImageGroup の操作と読上げ契約を維持する","大画面の 2 ペインと狭幅の Tabs が同じ MarkdownView / sanitize 経路を使い、同じ draft の出力が一致する","保存済み preview が baseline、editor preview が draft とラベルで区別され、第 3 の preview と別 renderer が存在しない","toolbar から 2 列 / 3 列の雛形を挿入し、その後は通常 Markdown として編集・外部 Docs 同期できる","カード内画像が既存 Docs image API / R2 を通り、VRT baseline の path / bytes が runtime 本文や object に混入しない","docs 以外の初期 client chunk が増えず、markdown-view / markdown-editor の dynamic import 境界が保たれる"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-security","arch-harness-hub-design-system"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-card-block-authoring.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-13T22:39:59Z","origin_kind":"system-spec-harness","source_digest":"dbbd08788007feb6a8923a47ec8edbf8b20ac6153853d661da13d78140b7cdff","source_path":"system-spec/spec-state.json","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.93
classification_reason: "C14 マクロ分解 (qa-232【6,7,8】・qa-233【1,2,5】・qa-234 から導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-card-block-authoring.md","confidence":0.93}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 目的

**現状 (current):** 共通 `Markdown.tsx` は sanitize された `MarkdownView`、画像並びの `ImageGroup`、`Tabs` 型の `MarkdownEditor` を持つ。Docs 編集には editor 内 draft preview と保存済み本文の preview がある。この feature は、意味あるカード container・大画面 2 ペイン・不正記法の編集警告をこの既存スタックへ接地する。

責務は本文ブロックの authoring / rendering / degradation に限定し、一覧カードや保存衝突は所有しない。

## 到達状態

**到達状態 (achieved):** 実装済み (2026-08-16 / `HarnessHub-iz3n`)。既存 Markdown スタック 1 本で 2/3 列カードを表示し、大画面で draft を編集しながら確認でき、狭幅では同じ 2 面を tab で切り替える。記法ミスは本文を壊さず、修正可能な警告として返す。

## スコープ

frontmatter / context の範囲どおり、新規 renderer や画像保存基盤を追加せず既存部品を拡張する。保存済み baseline と未保存 draft を意味で分け、同じ draft の第 3 preview は認めない。VRT は検証証跡であり runtime image ではない。

## 受入

- [x] パーサ・sanitize・React 描画の同じ fixture で、正常 2/3 列、不正記法、危険 HTML、DOM 順序を固定する。
- [x] desktop / mobile の操作テストが 2 ペインと tabs を通して同じ draft 出力、非 blocking 警告、保存済み baseline の区別を証明する。
- [x] Docs image API / R2 の結合テストと VRT の静的検査が、test asset と runtime object の混入を防ぐ。

## アーキテクチャ参照

frontend、security、design-system の制約を参照する。とくに sanitize allowlist は 2 要素 + 1 属性の差分に限定し、詳細 node ID は `architecture_refs` を正本とする。

## 機能間依存

編集面を公開する前に mutation safety の CAS / idempotency 契約を release gate として満たす。semantic icons はカード内の強調表現を供給するが、保存の安全性を成立させる依存ではない。

## Handoff

実装は `packages/ui` の remark plugin による `:::cards cols=2|3` → `hh-cards` / `hh-card` 変換 (未知 cols は 2 列へ寄せ、未閉じは素の Markdown へ縮退)、`hh-cards` / `hh-card` と正規化済み `data-cols` だけに限った sanitize allowlist 差分、大画面 2 ペイン / 狭幅 Tabs と toolbar からの 2/3 列雛形挿入へ接地した。詳細・検証・残課題は [仕様反映受領書](../docs/features/feat-card-block-authoring/spec-reflection-receipt.md) を正本とする。
