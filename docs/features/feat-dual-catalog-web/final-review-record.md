---
status: confirmed
layer: feature-final-review
---

# feat-dual-catalog-web 最終レビュー記録 (P10)

- graph node: `SYS-DUAL-CATALOG-WEB-P10` / beads: `HarnessHub-dhy.10`
- 判定日: 2026-08-01
- 消費: `requirements-baseline.md` (P01) / `acceptance-record.md` (P07) / `quality-assurance-report.md` (P09)

---

## 0. レビューの方法

P03 が実装前の設計妥当性を見るのに対し、P10 は全工程完了後のリリース可否を判断する。
本レビューでは **先行 phase の文書の主張をそのまま信じず、原典 (実装コード・workflow・ビルド成果物・上流仕様) に当たり直す**方針を取った。
その結果、初回レビューで 3 件、commit 前の再レビューでさらに 3 件の指摘を発見している (§4)。

**限界の明示**: 本 run は単一の実行主体が P05〜P10 を通しで担当しており、人的な独立性は無い。
代わりに「文書間の突き合わせ」ではなく「文書 → 原典」の再導出を検証手段とした。この点は P11 の証跡でも同じ扱いにする。

---

## 1. quality_constraints 7 件の最終確認

| id | 判定 | 原典で再確認した内容 |
|---|---|---|
| `a11y-wcag22aa-cwv-good-axe-ci-qa018` | **partial** | axe 違反 0 と CI ゲート存在は `catalog-a11y.test.tsx` / `hub-web-quality-gate.yml` を直接確認。CWV は `cwv.yml` が URL 未設定時に `exit 1` する fail-closed 構成であることを確認 (未計測は緑にならない) |
| `hub-outage-degradation-continuity-section6-1-qa011` | **pass** | `degradation.ts` の分類表と `catalogCapabilities()` を読み、404 が `degraded` に落ちること・縮退時も閲覧と descriptor コピーが残ることを確認 |
| `publish-status-polling-state-machine-qa009-qa062` | **pass** | `polling.ts` (2s→backoff / Retry-After 尊重) と `publish-status.ts` を読み、**状態遷移規則を持たず写像のみ**であることを確認 (状態機械の二重実装なし) |
| `distribution-channel-url-marketplace-bootstrap-installer-qa003-i6-i9` | **pass (指摘 1 件是正後)** | `stage0-gate-conclusion.md` の `verdict: H7_NOT_ESTABLISHED` を原典で確認し、実装の `pending-h7` fail-closed と一致することを確認。参照先の誤りを是正 (§4.1) |
| `workspace-catalog-thin-dual-catalog-stage1-mvp-i4-u7` | **partial (指摘 3)** | 承認キュー UI が無いこと・S01–S04 が `packages/ui` の部品で構成されていることは確認。ただし I4 が列挙する **「低品質報告導線」が未実装** (§4.4) |
| `multi-tenant-simultaneous-workspaces-success-criteria-u5` | **pass (実測は P13)** | `http-adapter.ts` の deny-by-default と DC-TEN-01..10 を確認。2 社同時稼働の**二値判定そのもの**は提供者代表が P13 で行う |
| `publish-pipeline-server-side-out-of-scope-depends-on-feat-publish-pipeline` | **pass** | `httpCatalogPort` のキーが 5 つ (読み取り 4 + install descriptor 取得 1)、`POST` は 1 本のみ、`PUT/PATCH/DELETE` 無しを確認 |

**未割当 0 件。** partial は 2 件 (CWV 実測 / 低品質報告導線)。

---

## 2. acceptance 3 件の最終確認

| # | acceptance | 判定 | 備考 |
|---|---|---|---|
| 1 | axe 検出可能違反 0 がリリース条件として CI に存在する | **pass** | 「違反 0」と「条件として存在する」を分けて確認済 (P07 §1)。`continue-on-error` / `\|\| true` / `passWithNoTests` を持たないことを再確認 |
| 2 | CWV 全指標 good を実測で満たす | **未達 (未計測)** | 阻害要因は「本 feature の画面が未デプロイ」(P13 §2.3 で訂正)。`vars.HUB_PUBLIC_URL` は登録済みで、先行 phase の「URL が無い」という前提は誤り。**未計測を good と読み替えない** |
| 3 | 導入済み Skill が Hub 停止中も動作継続する (§6.1 縮退) | **pass** | 導入済み Skill の実行経路に Hub Worker が入らない構造 + 縮退時の能力表 + SWR 配信で確認 |

---

## 3. cross-feature 境界 — 責務越境なし

requirements-baseline §6 の 4 件を、実装側から再確認した。

| # | 境界 | 越境の有無 | 確認方法 |
|---|---|---|---|
| 1 | publish pipeline (feat-publish-pipeline) | **なし** | `publish-status.ts` は状態 → 表示語彙の**写像のみ**で遷移規則を持たない。`/promote` `/rollback` `/approve` 等の呼び出しが画面側に存在しない (DC-SCOPE-01) |
| 2 | 配布経路判定 (feat-stage0-distribution-gate) | **なし** | 成立判定を再実装せず、gate の `verdict` を正本として消費する形に是正済 (§4.1)。判定結果と実装の一致を DC-MKT-10 が固定 |
| 3 | 単一認可ミドルウェア (feat-auth-tenancy) | **なし** | `lib/catalog/` 6 ファイルに role 判定トークンが存在しない (DC-TEN-04)。client 側は scope 欠落の拒否のみを行う |
| 4 | 共通部品・共通シェル (feat-hub-foundation) | **なし** | `components/catalog/` 5 ファイルすべてが `@harness-hub/ui` から部品を import。`<table>` `<dialog>` の自作なし。共通層重複検知 448 ファイル / 違反 0 件 |

---

## 4. 本レビューで発見した指摘と是正

### 4.1 指摘 1: 配布経路の判定条件が誤った decision ID を指していた (**是正済**)

- **発見**: `marketplace.ts` の `resolveAdoptedSourceResolver()` に「`spec-state.json` の `decisions[]` に **D7** が登録され、採用経路が確定した時点で resolver を実装する」と書かれていた。
- **原典確認**: `spec-state.json` の `decisions[]` には **D7 が既に存在する**。ただしその内容は
  「環境構成: 常設 staging 環境を持つか」(2026-07-21 確定) であり、**配布経路とは無関係**。
  一方 `stage0-gate-conclusion.md` は「`decisions[]` に `D7` は不在 / D1-D6 のまま」と書いており、執筆時点の状態のまま残っていた。
- **危険性**: このコメントの条件は「既に (別の意味で) 成立している」。記述どおりに確認した人が
  「D7 がある = 経路が確定した」と誤読すると、**gate 未成立のまま配布が始まる**。fail-closed が言葉の上だけになる。
- **是正**: 判定条件を decision ID から外し、`stage0-gate-conclusion.md` の frontmatter `verdict` を正本とする形に書き換えた。
  ID の再利用に依存しない参照にしている。

### 4.2 指摘 2: fail-closed のテストが逆向きに固着していた (**是正済**)

- **発見**: DC-MKT-09 は `resolveAdoptedSourceResolver()` が `null` であることを assert していたが、
  これは**実装の現状を写しているだけ**で、なぜ null であるべきか (gate 未成立) と結びついていなかった。
- **危険性**: gate が成立へ変わったとき、このテストは「null であること」を要求し続け、**正しい実装を妨げる**。
  未成立を守るためのテストが、成立後は前進を止める側に回る。
- **是正**: DC-MKT-10 を追加し、gate 終結記録の `verdict` を読んで分岐させた。
  `H7_NOT_ESTABLISHED` のうちは null を要求し、それ以外に変われば「resolver を実装すること」を要求して落ちる。
- **発火確認**: 原本 (`H7_NOT_ESTABLISHED`) と変異版 (`H7_ESTABLISHED`) を同じ判定に通し、要求が反転することを確認済。

### 4.3 指摘 3: 低品質報告導線が未実装 (**未是正 — follow-up**)

- **発見**: quality_constraint `workspace-catalog-thin-...-i4-u7` の summary は
  「業務ツール一覧・詳細・『追加する』『Web アプリを開く』導線・**低品質報告導線**を提供し」と定める。
  `screen-inventory.md` の S02 も「低品質報告」を機能に含む。
- **原典確認**: `system-spec/00-requirements-definition.md` I4 が「Workspace Catalog (…**低品質報告導線**)」と列挙しており、
  **本 feature の責務**である (feat-feedback-loop の責務は受け口 S14 側)。
- **実測**: `components/catalog/` と `app/(workspace)/catalog/` に「報告 / feedback」に該当する導線が**存在しない**。
  ADR にも設計判断の記述が無く、**設計段階から落ちていた**ものと判断する。
- **今 実装しない理由**: リンク先の S14 (`/feedback`) は `frontend-spec.md` で route が確定しているが、
  feat-feedback-loop は優先度 P3 で**未実装**。今リンクを置くと利用者が 404 に到達する。
  「導線がある」ように見えて機能しない状態は、無い状態より悪い。
- **follow-up**: S14 実装後に S02 詳細へ `/feedback?harness=<projectId>` 相当の導線を追加する (`runbook-follow-ups.md` §3 に記録)。
  本 feature の判定は **partial** とし、pass に繰り上げない。

### 4.4 P09 で追加済みの構造ゲート (再掲)

- DC-TEN-05: 画面側に生の通信 API が現れないこと (Port 迂回によるテナントヘッダ欠落の予防)。走査 8 ファイル / 違反 0 件。変異版で発火を確認済。

### 4.5 指摘 4: 認証済み marketplace を共有 cache できた (**是正済**)

- **発見**: `/marketplace.json` は tenant/workspace で内容が変わる一方、`Cache-Control: public` を返していた。
- **危険性**: CDN などの shared cache（複数利用者で共有される一時保存）が、別 scope の応答を再利用しうる。
- **是正**: `private, max-age=60, stale-while-revalidate=300` とし、Cookie/tenant/workspace を `Vary` に固定した。DC-MKT-07 で回帰を防ぐ。

### 4.6 指摘 5: 認可失敗後に以前の catalog を描画できた (**是正済**)

- **発見**: 成功後の再取得が 401/403/契約不正になっても、list/detail/history の state に以前のデータが残った。
- **危険性**: role 変更や scope 切替後に、現在は閲覧できない情報を画面上へ残す窓になる。
- **是正**: 非 browse failure では旧データを描画せず、cache key を tenant/workspace/project に束縛した。同一 scope の 503 だけ stale を維持する。DC-TEN-06..10 で直積を検証する。

### 4.7 指摘 6: 絞り込み送信で重複取得できた (**是正済**)

- **発見**: 入力 state の effect と form submit が同時に fetch を起動し、1 操作で 2 要求になる経路があった。
- **是正**: draft 入力と適用 query を分離し、入力中は通信せず submit 1 回につき 1 回だけ取得する。DC-LIST-01 で要求数を固定した。

### 4.8 GitHub CI 追補: AI queue 検査との記法衝突 (**是正済・追加仕様影響なし**)

- **発見**: PR #628 の Hub 全体テストで、catalog failure fixture の `kind` を AI queue の feature-local kind と誤認した。
- **是正**: fixture の property を computed key で表し、実行時の型・値・検証意図を変えず静的検査の対象から分離した。
- **検証**: 直接関係する 2 files / 22 tests と Hub 全体 76 files / 908 passed / 1 skipped が PASS。
- **仕様判断**: production code、schema、cache・認可契約に変更はない。main 統合時の QA ID 衝突を解消し、同じ dual catalog 契約を qa-117..119 として再登録し、共有 Google OAuth との両立を qa-120 で正本化した。

---

## 5. 未達事項の扱い

| 項目 | 状態 | 判断 |
|---|---|---|
| CWV 実測 (LCP/INP/CLS) | 未計測 | **リリース阻害としない**。計測経路 (`cwv.yml`) は fail-closed で用意済み。**阻害要因は URL 未設定ではなく catalog route の未デプロイ** (P13 §2.3)。未計測のまま good と記録しないことで担保する |
| SLO ダッシュボードへの CWV 反映 | 未反映 | **リリース阻害としない**。`apps/hub/monitoring/` は本 feature の Write scope 外で、feat-hub-foundation の受入条件 A3 に紐づく。follow-up として P12 へ引き継ぐ |
| `/api/v1/harnesses*` の実装 | 未実装 | **リリース阻害としない**。feat-publish-pipeline 所有 (ADR §0 A2)。未実装状態でも縮退表示で画面は成立する |
| E2E (Playwright) | 未導入 | **リリース阻害としない**。導入は Write scope 外。follow-up として P12 へ引き継ぐ |
| 実機スクリーンリーダー確認 | 未実施 | **リリース阻害としない**。自動検査で届かない範囲であり、共通部品側 (feat-hub-foundation) の担保に依存する |
| 低品質報告導線 (I4) | 未実装 | **リリース阻害としない**が、**責務の欠落として記録する** (§4.3)。リンク先 S14 が未実装のため今置くと 404 になる。S14 実装後に追加する |

---

## 6. リリース可否判定

**条件付き可。**

- 本 feature の Write scope 内で実施すべき実装・テスト・品質確認は、**低品質報告導線を除いて**完了している。
- 未達 5 件のうち 4 件は「デプロイ前で計測・疎通の対象が存在しない」または「他 feature 所有」に起因する。
  残る 1 件 (低品質報告導線) は**本 feature の責務の欠落**だが、リンク先が未実装である以上、
  今実装しても壊れた導線にしかならない。S14 実装と同時に入れるのが正しい順序と判断する。
- **acceptance 2 (CWV good) は未達のままである。** P13 の release-record を、この 1 件を pass にしないまま
  「完了」と記録してはならない。実測後に P07 / 本記録の該当行を更新して確定する。

### 差し戻し

無し。§4.1 / §4.2 は本 phase 内で是正済み。§4.3 は依存先の実装待ちであり、
本 feature を差し戻しても解消しないため follow-up として P12 へ引き継ぐ。

### 検証コマンド

```bash
pnpm --filter @harness-hub/hub exec vitest run src/__tests__/dual-catalog-web  # 8 files / 63 tests passed
pnpm --filter @harness-hub/hub test                                            # 76 files / 908 passed / 1 skipped
pnpm --filter @harness-hub/hub run typecheck                                   # pass
pnpm exec biome check <catalog changed scope>                              # 30 files / No fixes applied
```
