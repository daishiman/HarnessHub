---
status: confirmed
layer: feature-design
task: SYS-DUAL-CATALOG-WEB-P01
parent_feature: feat-dual-catalog-web
feature_package_id: feature-package/feat-dual-catalog-web
source: .dev-graph/plans/generations/feature-package-feat-dual-catalog-web/7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817/goal-spec.json
feature_context_digest: sha256:a0c5f78ef31fc345184884f4f48f60b0c9b2e5beaae7d9a83c0f789d13a6e9d3
architecture_refs: [arch-harness-hub-frontend, arch-harness-hub-backend]
---

# feat-dual-catalog-web 要件ベースライン

> **位置づけ**: P01 (要件ベースライン確定) の成果物。promoted goal-spec の purpose/goal/scope_in/scope_out/acceptance/quality_constraints を**確定転記**した baseline であり、P02 以降の全 task はこの文書を唯一の合意事項として参照する。転記元との相違が判明した場合は本文書を修正せず goal-spec 側の再確定を dev-graph へ差し戻す (rollback 規約)。

> **構築順オーバーレイ (baseline 外)**: **P2・最優先**。S01/S02/S03/S04 は [screen-inventory.md](../../screen-inventory.md) で優先度 P2 に置かれ、feat-publish-pipeline (公開 API・状態) と feat-stage0-distribution-gate (配布経路判定) の成立を前提に消費する。正本: [system-design-overview.md](../../system-design-overview.md) §3。

## 1. 目的 (purpose)

利用者・管理者が Skill/WebApp を発見・導入できる dual catalog UI と配布出口 (marketplace 出力 / Bootstrap Installer 連携) を、WCAG 2.2 AA + CWV good (qa-018) の品質で提供する

## 2. ゴール (goal)

2 社の顧客 Workspace が同時にカタログを閲覧・導入でき (U5)、a11y/速度の品質ゲートが CI で強制される状態

## 3. スコープ

### 3.1 scope_in

1. dual catalog 閲覧 UI (レスポンシブ)
2. publish 状況表示 (ポーリング)
3. marketplace.json 出力 + 採用配布経路連携
4. axe 自動チェック CI
5. CWV 計測 (LCP/INP/CLS)

### 3.2 scope_out

1. 承認キュー UI (Stage 2)
2. native アプリ

## 4. 受入基準 (acceptance — goal-spec 3 件の確定転記・転記原文)

1. axe 検出可能違反 0 がリリース条件として CI に存在する
2. CWV 全指標 good を実測で満たす
3. 導入済み Skill が Hub 停止中も動作継続する (§6.1 縮退)

## 5. 品質制約 (quality_constraints — 現行 goal-spec 7 件の確定転記)

| id | summary (転記原文) | source |
|---|---|---|
| a11y-wcag22aa-cwv-good-axe-ci-qa018 | Hub Web の dual catalog UI と公開 WebApp は WCAG 2.2 AA (コントラスト比 4.5:1 以上・全機能キーボード操作可・スクリーンリーダー対応・フォーカス管理・代替テキスト) に準拠し、CI に axe 等の自動アクセシビリティチェックを組み込み検出可能違反ゼロをリリース条件とする。速度は Core Web Vitals 全指標 good (LCP ≤ 2.5s / INP ≤ 200ms / CLS ≤ 0.1) を Worker bundle 3MiB 予算・R2/edge 配信・不要 JS 削減で達成する。破壊的操作は確認+可逆、待ち時間は進捗表示、失敗は平易な日本語+次の一手、レイアウトシフト/点滅回避を Apple HIG 由来の快適性原則として適用する。 | system-spec/spec-state.json qa-018 (「アクセシビリティ = WCAG 2.2 AA 準拠…CI に axe 等の自動チェックを組込み、検出可能違反ゼロをリリース条件にする」「速度 = Core Web Vitals 全指標 good (LCP ≤ 2.5s / INP ≤ 200ms / CLS ≤ 0.1)。Worker 3MiB 制限下の bundle 予算管理・R2/edge 配信・不要 JS 削減で達成する」); features/feat-dual-catalog-web.context.json purpose (「WCAG 2.2 AA + CWV good [qa-018] の品質で提供する」) および acceptance (「axe 検出可能違反 0 がリリース条件として CI に存在する」「CWV 全指標 good を実測で満たす」) |
| hub-outage-degradation-continuity-section6-1-qa011 | Hub 本体 (Workers) の障害・停止時にも、導入済み Skill と公開済み Web App は動作を継続する (新規公開・追加・更新のみ停止)。これを §6.1 として明文化された縮退設計とし、本 feature の acceptance「導入済み Skill が Hub 停止中も動作継続する」の直接根拠とする。復旧は提供者の Platform 運用責任。 | system-spec/spec-state.json qa-011 (「障害縮退 = §6.1 を明文化 (Hub 障害時も導入済み Skill・公開済み Web App は動作継続、新規公開・追加・更新のみ停止。復旧は提供者の Platform 運用責任)」); qa-019 (「§6.1 の縮退設計 (Hub 停止中も導入済み Skill・公開 WebApp は動作継続) が SLO の前提」); features/feat-dual-catalog-web.context.json acceptance (「導入済み Skill が Hub 停止中も動作継続する [§6.1 縮退]」) |
| publish-status-polling-state-machine-qa009-qa062 | publish 状況表示はポーリングで実装する。Hub API は PublishRequest 状態機械 (Draft→Validating→Needs Fix/Ready→Publishing→Failed/Published) の状態を DB に記録し、Publisher/Hub Web はポーリングで進捗を取得する。frontend 実装は S01/S02 のデータ取得へ install descriptor (GET /harnesses/:projectId/install) と publish 中 2s→backoff のポーリング契約を用いる。 | system-spec/spec-state.json qa-009 (「検査は MVP では Worker 内同期実行…状態を DB に記録し Publisher/Hub Web はポーリングで進捗取得」); system-spec/frontend.md qa-062 (「S01/S02 のデータ取得へ install descriptor [GET /harnesses/:projectId/install] と publish 中 2s→backoff polling を追加」); features/feat-dual-catalog-web.context.json scope_in (「publish 状況表示 [ポーリング]」) |
| distribution-channel-url-marketplace-bootstrap-installer-qa003-i6-i9 | 配布・更新経路は URL 型 marketplace (native source) または Bootstrap Installer の 2 経路を Stage 0 technical gate (H3/H6/H7) で検証し、成立した経路を採用する。一般利用者に GitHub アカウントを要求しない Git レス配布・更新。本 feature の marketplace.json 出力・採用配布経路連携は、この Stage 0 判定結果 (feat-stage0-distribution-gate) に従属する。 | system-spec/00-requirements-definition.md I6 (「URL 型 marketplace [native source] または Bootstrap Installer による Git レス配布・更新 [一般利用者に GitHub アカウントを要求しない]」serves G1, G2)・I9 (「Stage 0 technical gate: URL 型 marketplace / Bootstrap Installer / wrangler 公開の成立検証 [H3/H6/H7] と Stage 1 開始条件の判定」serves G1, G3); system-spec/spec-state.json qa-003 (「Publisher / Skill の作者環境への配布は URL 型 marketplace [native source] または Bootstrap Installer の 2 経路を Stage 0 technical gate [H7] で検証し、成立した経路を採用する」); features/feat-dual-catalog-web.context.json scope_in (「marketplace.json 出力 + 採用配布経路連携」) および features/feat-dual-catalog-web.md 機能間依存・frontmatter depends_on (「feat-stage0-distribution-gate」) |
| workspace-catalog-thin-dual-catalog-stage1-mvp-i4-u7 | 本 feature は U7 スコープの Stage 1: Publisher + Thin Dual Catalog MVP の一部 (Workspace Catalog) を担う。業務ツール一覧・詳細・「追加する」「Web アプリを開く」導線・低品質報告導線を提供し、承認キュー UI (Stage 2 Governance) と native アプリは対象外とする。 | system-spec/00-requirements-definition.md U7 スコープ in (「Stage 1: Publisher + Thin Dual Catalog MVP [skills-only package の Green 自動公開・Project / TargetChannel / Release / CatalogEntry・version 自動採番・stable pointer と rollback・Workspace Catalog]」)・I4 (「Workspace Catalog [業務ツール一覧・詳細・「追加する」「Web アプリを開く」導線・低品質報告導線]」serves G2, G3); features/feat-dual-catalog-web.context.json scope_out (「承認キュー UI [Stage 2]」「native アプリ」) |
| multi-tenant-simultaneous-workspaces-success-criteria-u5 | 2 社以上の顧客 Workspace で Hub が同時稼働し、それぞれの Workspace で公開 (G1) と owner 以外の再利用 (G2) が成立していることを二値判定の成功基準とする。本 feature の goal「2 社の顧客 Workspace が同時にカタログを閲覧・導入でき (U5)」の直接根拠。 | system-spec/00-requirements-definition.md U5 成功基準 (「2 社以上の顧客 Workspace で Hub が同時稼働し、それぞれの Workspace で公開 [G1] と owner 以外の再利用 [G2] が成立していること [二値判定]。判定は提供者代表が行い、根拠を記録する」); features/feat-dual-catalog-web.context.json goal (「2 社の顧客 Workspace が同時にカタログを閲覧・導入でき [U5]」) |
| publish-pipeline-server-side-out-of-scope-depends-on-feat-publish-pipeline | Hub 側 API の PublishRequest 状態機械・検査 pipeline サーバ側実装・Catalog pointer atomic 更新は本 feature のスコープ外とし、feat-publish-pipeline の責務とする。本 feature は同 feature の API/状態を消費する catalog 閲覧・publish 状況表示 (読み取り + ポーリング) 側に責務を限定する。 | features/feat-dual-catalog-web.md 機能間依存 (「feat-publish-pipeline」) および frontmatter depends_on: ["feat-publish-pipeline", "feat-stage0-distribution-gate"]; system-spec/spec-state.json qa-009 (PublishRequest 状態機械・検査 pipeline は Hub API 側の確定事項) |

## 6. 上流未解決事項 — cross-feature 境界 (P02 必須解消)

1. **publish pipeline 消費境界**: PublishRequest 状態機械 (§7.2)・検査 pipeline・Catalog pointer atomic 更新・`GET/POST /api/v1/harnesses*` の**サーバ側実装**は feat-publish-pipeline が所有する。本 feature は同 API を**読み取り + ポーリングで消費する側**に責務を限定し、状態機械や検査ロジックを再実装しない。P02 で consumer 境界 (どの endpoint をどの画面がどう消費するか) を確定する。
2. **配布経路判定の消費境界**: URL 型 marketplace / Bootstrap Installer の**技術的成立判定そのもの**は feat-stage0-distribution-gate が Stage 0 technical gate (H7) で行う既存確定であり、本 feature はその判定結果を消費して marketplace.json を生成・出力する。P02 で「採用経路をどの成果物から読むか」の参照点を確定する。
3. **単一認可ミドルウェア消費境界**: `apps/hub/src/lib/authz/` は feat-auth-tenancy が所有する既存確定であり、本 feature はこれを消費して deny-by-default の Tenant/Workspace スコープ判定を catalog 閲覧・install descriptor 取得経路へ適用するのみで、認可判定ロジック自体を再実装しない。
4. **共通部品・共通シェルの owner 境界**: `packages/ui` の共通部品 (DataTable/StatusChip/DegradedBanner/ConfirmDialog ほか) と共通シェル (§3.0) は feat-hub-foundation が所有する。本 feature は消費側であり、a11y 一括担保 (qa-018) は部品側の責務に依存する。本 feature 固有部品のみ `apps/hub/src/components/catalog/` に置く。

## 7. 転記元と検証

- 転記元: `.dev-graph/plans/generations/feature-package-feat-dual-catalog-web/7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817/goal-spec.json` (promoted。feature_context_digest = sha256:a0c5f78ef31fc345184884f4f48f60b0c9b2e5beaae7d9a83c0f789d13a6e9d3)
- 本文書の受入条件 (P01 acceptance): 現行 goal-spec の acceptance 3 件 (§4) と quality_constraints 7 件 (§5) が過不足なく転記され、cross-feature 境界 (§6) が P02 必須解消事項として明記されていること
- **補完経緯 (2026-08-01)**: 本文書は当初 HarnessHub-dhy.1 のクローズ理由で「commit b0b4a27 で origin/main へマージ済み」と記録されていたが、`git log --all -- docs/features/feat-dual-catalog-web/` が空であり、当該 commit の対象は別 8 feature (DOMAIN-MODEL-DB / AUTH-TENANCY / BUILD-PIPELINE-BOARD / DOCS-CMS / FEEDBACK-LOOP / HEARING-INTAKE / METRICS-TRACKING / USER-ORG-ADMIN) であることを実測で確認した。P01 成果物は未作成のままクローズされていたため、P02 entry gate を満たす目的で本文書を補完した。
