---
graph_node_id: "feat-card-list-shell"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "ui-ux"
tags: ["card-ui","list-shell","tabs","search","rbac","responsive"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "一覧のカード型シェル (カードグリッド既定・表示切替・状態タブ・検索)"
owners: ["daishiman"]
created_at: "2026-08-13T22:39:59Z"
updated_at: "2026-08-16T07:15:30Z"
status: "draft"
depends_on: ["feat-card-mutation-safety","feat-semantic-emphasis-icons"]
related_nodes: ["arch-harness-hub-frontend","arch-harness-hub-design-system","feat-docs-cms","feat-hearing-intake","feat-dual-catalog-web"]
resource_scope: ["packages/ui/src/components/DataTable.tsx","packages/ui/src/components/DataTable.test.tsx","apps/hub/src/app/(dashboard)/docs/page.tsx","apps/hub/src/app/(dashboard)/docs/document-list.tsx","apps/hub/src/app/(dashboard)/docs/[id]/page.tsx","apps/hub/src/app/(dashboard)/docs/[id]/edit/document-edit-page.tsx","apps/hub/src/app/(dashboard)/docs/new/document-create-form.tsx","apps/hub/src/app/(dashboard)/sheets/page.tsx","apps/hub/src/app/(dashboard)/sheets/hearing-sheet-list.tsx","apps/hub/src/app/(dashboard)/sheets/[id]/hearing-sheet-detail.tsx","apps/hub/src/app/(dashboard)/sheets/new/hearing-intake-wizard.tsx","apps/hub/src/app/(workspace)/catalog/page.tsx","apps/hub/src/components/catalog/CatalogList.tsx","apps/hub/src/app/api/v1/docs/route.ts","apps/hub/src/app/api/v1/sheets/route.ts","packages/db/repository/docs-cms.ts","packages/db/repository/hearing-intake.ts","packages/db/schema/docs-cms/schema.ts","packages/db/schema/hearing-intake/schema.ts","apps/hub/src/lib/catalog/marketplace.ts","apps/hub/src/lib/catalog/response-schemas.ts"]
purpose: "現状 (current) の Docs / Sheets / Catalog 一覧は wide table 中心で、q の検索対象・絞込状態の復元・状態別件数がカード一覧の契約を満たさない。テーブルの比較性を残しつつ、3 一覧を中身が見える共通カード shell へ移行する。"
goal: "到達状態 (achieved): Docs / Sheets / Catalog の 3 一覧はカードグリッドを既定とし、同じ DataTable column model からテーブル表示へ切り替えられる。tab / q / filter は URL query から完全に復元でき、認可済み集合の status_counts と cursor page が同じ契約で返る。"
scope_in: ["Docs / Sheets / Catalog の 3 一覧に、カードグリッドを既定とする共通 shell と可視ラベル付き card/table view mode 切替を導入する","カードとテーブルは既存 DataTable column model の列定義・value・ソート語彙を再利用し、同じ行の別表現とする","URL query が tab / q / filter の唯一の正本。共有・再読込・戻る/進むで復元し、sessionStorage は view mode だけを記憶する","状態写像は Docs: published=published, draft=draft, null=unknown、Sheets: received|generating|review=active, completed=completed, null=unknown、Catalog: available=available, suspended|deprecated=suspended, null=unknown。unknown は『すべて』だけに含めて状態不明の可視ラベルを出す","status_counts は認可後、q と非状態 filter 適用後、選択中状態と cursor 適用前の集合から集計し、権限外と別 page の件数を混同しない","既存の q パラメータ名と URL / 認可境界を維持し、server-side 検索を title / body / tags の OR、その他の filter と AND に拡張する","既存の excerpt は保存済みの表示用要約 (手動/自動 source 付き) としてカード lead に再利用し、null 時だけ body から揮発的に補う。別の永続 lead / 検索コピーは作らない","認可を repository query の最初の境界で適用し、権限外の行を items、status_counts、検索対象、cache のどこにも出さない","既存 q と認可契約は不変だが、status_counts と title/body/tags 検索のための additive response / repository behavior は変更可能とする","Docs の一覧 / 詳細 / 編集 / 作成は同じ shell・カード階層・操作位置へ統一し、Sheets / Catalog は実在する面だけに同じ shell / 構造を適用する"]
scope_out: ["DataTable の削除。比較・列ソート・選択・一括操作の到達手段として残す","Sheets / Catalog に存在しない編集・作成・削除面を新設すること","Markdown 本文のカードブロック記法と draft preview (これは feat-card-block-authoring の責務)","POST 再送・PATCH 競合のデータ安全契約 (これは feat-card-mutation-safety の責務)","semantic icon / color token の供給元の実装 (これは feat-semantic-emphasis-icons の責務)","既存の q パラメータ名、画面 URL、認可ルールの置換、および新しい永続 excerpt / lead / 検索 index の追加"]
acceptance: ["Docs / Sheets / Catalog の 3 一覧がカードグリッドを既定で表示し、可視ラベル付き切替でテーブル表示へ移れる","カードとテーブルが同一 DataTable column model から値を取り、テーブル側の比較・絞込・選択・一括操作が保たれる","tab / q / filter を URL query だけから共有・再読込・戻る/進むで復元でき、sessionStorage の filter 値に結果が左右されない","view mode だけは sessionStorage から再訪時に復元され、URL の絞込状態を上書きしない","Docs / Sheets / Catalog の status mapping と null=unknown が単体テストで固定され、unknown が個別状態 tab に誤分類されない","status_counts が認可後かつ cursor 適用前の集合から返り、権限外の行と別 page の件数を含まない","既存の q で title / body / tags のいずれかに一致する行が返り、状態・その他 filter と AND 合成される","既存 excerpt がカード lead として使われ、excerpt=null の場合も永続コピーを増やさずに詳細へ到達できる","Docs の 4 面は共通構造となり、Sheets / Catalog は既存面だけが共通 shell を使い、存在しない CRUD route を追加しない","真の 0 件と絞込後 0 件が異なる空状態で表示され、適用中条件を解除する chip がある"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-design-system"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-card-list-shell.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-13T22:39:59Z","origin_kind":"system-spec-harness","source_digest":"dbbd08788007feb6a8923a47ec8edbf8b20ac6153853d661da13d78140b7cdff","source_path":"system-spec/spec-state.json","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.93
classification_reason: "C14 マクロ分解 (qa-232【1-4,9】・qa-233【3,4】・qa-235・qa-236・qa-239・qa-240 から導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-card-list-shell.md","confidence":0.93}]
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

**現状 (current):** 3 一覧は wide table 中心で、Docs 検索は title に限定され、絞込条件の一部が sessionStorage にも残る。レスポンスは cursor page の items 中心で、認可済み全体の状態別件数を表せない。この feature はこれらを製品コードへ反映する。

責務は「同じ行集合をカードとテーブルで表す一覧 shell」に限定する。本文記法と更新衝突は他 feature の所有である。

## 到達状態

**到達状態 (achieved):** 実装済み (2026-08-16 / `HarnessHub-ma7t`)。Docs / Sheets / Catalog の 3 一覧はカード既定で、同じ column model のテーブルへ切り替えられる。検索と絞込は URL から復元でき、認可境界の内側で状態別件数と page を一貫して算出する。

## スコープ

frontmatter / context の契約を正本とし、UI は DataTable の列語彙、API は既存 `q` と認可境界を継承する。必要な変更は additive な検索対象と件数 response であり、「API / DB は一切変えない」とはしない。Docs だけが 4 面統一の対象で、Sheets / Catalog に未存在 CRUD は作らない。

## 受入

- [x] 契約テストが state mapping、URL 復元、認可後カウント、複数列検索を API / repository の観測可能な結果で固定する。
- [x] 画面テストがカード既定、table 切替、URL 戻る/進む、0 件の種類、実在面だけの適用を固定する。
- [x] 永続 excerpt の責務を変えず、追加の lead / search コピーが作られていない。

## アーキテクチャ参照

frontend と design-system を参照し、認可は既存 backend 境界を変更せず取得段階で実行する。具体的な node ID は `architecture_refs` の管理投影を正本とする。

## 機能間依存

作成・編集導線を含む Docs 4 面は、二重作成と後勝ち上書きを増やさないため mutation safety を release gate として待つ。semantic icons はカードの見た目を供給するが、データ安全性の前提ではない。

## Handoff

実装は DataTable への `viewMode` / `onViewModeChange` 純増 (既定はカード、sessionStorage は view mode だけ)、Docs / Sheets / Catalog を同一 column model からカードと表で描く一覧、および `status_counts` と title / body / tags の OR 検索の repository 応答への純増へ接地した。認可は query の最初の境界に置き、権限外の行を items・件数・検索対象のいずれにも出さない。詳細・検証・残課題は [仕様反映受領書](../docs/features/feat-card-list-shell/spec-reflection-receipt.md) を正本とする。

PR #731 は 2026-08-16 に main へ merge 済み（`fc2dc9c2`）。運用手順は [operations](../docs/features/feat-card-list-shell/operations.md)、実装接地は [implementation-notes](../docs/features/feat-card-list-shell/implementation-notes.md)、最終レビューは [final-review-20260816](../docs/features/feat-card-list-shell/final-review-20260816.md)。
