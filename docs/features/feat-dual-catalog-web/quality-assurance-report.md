---
status: confirmed
layer: feature-quality-assurance
---

# feat-dual-catalog-web 品質・セキュリティ・運用保証レポート (P09)

- graph node: `SYS-DUAL-CATALOG-WEB-P09` / beads: `HarnessHub-dhy.9`
- 判定日: 2026-08-01
- 消費: `apps/hub/src/lib/catalog/`, `refactoring-migration-note.md` (P08), `docs/security-spec-authorization.md`

| # | 確認項目 | 結果 |
|---|---|---|
| 1 | テナント分離 (deny-by-default) の一貫適用 | **確認済** |
| 2 | §6.1 縮退設計の運用確認 | **確認済** |
| 3 | SLO ダッシュボードへの CWV 反映 | **未反映を確認** (是正は本 task の Write scope 外 → follow-up) |
| 4 | WCAG 2.2 AA / axe / CWV 最終確認 | **axe・WCAG は確認済 / CWV 実測は未達 (未計測)** |

---

## 1. テナント分離 (deny-by-default) の一貫適用 — 確認済

`docs/security-spec-authorization.md` §3.2 原則 1 (規則が無ければ拒否) と原則 4 (テナント境界は role より先に見る) を、
本 feature の**消費側**が崩していないことを確認する。認可判定そのものの実装は feat-auth-tenancy 所有で、本 task は変更しない。

### 1.1 client 側 deny-by-default

| 確認 | 実装位置 | 固定するテスト |
|---|---|---|
| scope 欠落時に「全件」と解釈せず拒否する | `http-adapter.ts` `scopeHeaders()` — 空文字・空白のみを `null` にして `forbidden` を返す | DC-TEN-02 |
| 拒否時に**要求を送らない** | 同上。`fetch` 到達前に return | DC-TEN-02 (`fetchSpy` 未呼び出しを assert) |
| 全経路がテナントヘッダを送る | `request()` に集約。5 経路 (list/detail/releases/publish/install) すべて | DC-TEN-03 |
| ヘッダ名が server 側と一致する | テストが `middleware/index.js` の `TENANT_HEADER` / `WORKSPACE_HEADER` と突き合わせる | DC-TEN-03 |
| 配布文書がテナントを跨いで補完しない | `marketplace.ts` — 入力 entry 集合の外を参照しない | DC-TEN-01 |
| 認可判定を client に複製しない | `lib/catalog/` 全 6 ファイルに role 判定トークンが無い (ADR §5 境界 3) | DC-TEN-04 |

### 1.2 P09 で追加した確認 (DC-TEN-05)

DC-TEN-03 が保証するのは「**Port を通れば**必ずヘッダが付く」ことだけで、
画面側が Port を迂回して直接 `fetch` を書いた場合を捕まえられない。付け忘れが 1 経路でもあれば分離は崩れる。
そこで **画面側ソースに生の通信 API が現れないこと**を機械確認するケースを追加した。

- 対象: `components/catalog/` (5 ファイル) + `app/(workspace)/catalog/` (3 ファイル) = **8 ファイル走査**
- 禁止: `fetch(` / `XMLHttpRequest` / `from 'axios'` / `navigator.sendBeacon`
- 結果: 違反 0 件

**Goodhart 回避**: 走査 0 件でも「違反なし」で緑になるため、`checked >= 8` を pass 条件に含めた。
**ゲート発火の確認**: 原本と、Port 迂回の直 `fetch` を 1 行注入した変異版を同じ判定に通し、
原本 pass / 変異 fail (検出トークン `fetch(`) を確認済み。検査が実際に働くことまで見た。

### 1.3 検討したが採らなかった是正

`http-adapter.ts` はヘッダ名を文字列リテラルで定義しており、`middleware/scope.ts` の定数と二重定義になっている。
単一正本へ寄せる案を検討したが**採らない**。

- ズレは DC-TEN-03 が機械的に検知する (片方だけ変えるとテストが落ちる)。実害の経路が既に塞がれている。
- `middleware/` は Edge runtime 側のモジュールであり、client component から取り込むと
  `/catalog/[projectId]` の G13 予算の余裕 1.3 KiB (P08 §3.3) を削るリスクがある。

### 1.4 server 側との責務境界

client 側の deny-by-default は**二重防御の外側**にすぎない。他テナントの行を返さないことの担保は
`security-spec-authorization.md` §3.6 の tenant scope 強制注入 (server 側) が正本であり、本 feature は消費するのみ。
`/api/v1/harnesses*` の実装は feat-publish-pipeline 所有のため、server 側の実適用確認は当該 feature の責務として残る。

---

## 2. §6.1 縮退設計の運用確認 — 確認済

qa-011 / qa-019 が定める「Hub 停止中も導入済み Skill・公開済み Web App が動作継続する」を運用観点で確認する。

### 2.1 停止時の実挙動

| 事象 | 分類 | 画面の状態 |
|---|---|---|
| Worker 500/502/503 | `degraded` | 縮退バナー + 取得済みデータの閲覧継続 |
| API 未実装 (404) | `degraded` | 同上 (**`fatal` にしない**) |
| ネットワーク到達不能 | `degraded` | 同上 |
| 検証器 chunk を取得できない | `degraded` | 同上 (P08 の遅延読込で増えた経路。実質オフラインとして扱う) |
| 401 / 403 | `unauthorized` / `forbidden` | 権限事象として区別。403 で再サインインへ送らない (ループ防止) |

`degradation.ts` の `catalogCapabilities()` が縮退時の能力を「閲覧可 / descriptor コピー可 / 変更不可」に固定する。
**descriptor のコピーを残すことが、Hub 停止中でも導入作業を止めない UI 面の担保**にあたる。

### 2.2 運用面の確認

| 観点 | 確認結果 |
|---|---|
| 配信の継続と分離 | `/marketplace.json` は `private, max-age=60, stale-while-revalidate=300` + scope/session `Vary`。同じ利用者・scope の private cache は最大 5 分 stale を使えるが、shared cache へは保存しない (DC-MKT-07) |
| 監視との整合 | `infrastructure-spec.md` §9 は「Turso 失敗のみ down / R2 失敗は degraded」と区分。本 feature の client 分類もこれに揃い、応答できている時間を down 扱いしない |
| 告知 | 縮退バナーは `role="status"` + `aria-live="polite"`。`role="alert"` で操作に割り込まない (DC-A11Y-07) |
| 文言 | 「導入済みのツールはそのまま使えます」を含む (qa-019。利用者が「全部止まった」と誤解しないため) |
| 実環境相当の確認 | `/api/v1/harnesses*` 未実装の現状がそのまま「Hub API 不在」であり、404 → `degraded` の縮退表示になることを確認済 |

**未確認として残るもの**: Hub Worker を実際に停止させた状態での確認は、デプロイ済み環境が無いため未実施。
本 feature の実装で判定できる範囲 (分類・能力・告知・キャッシュ) はすべて確認済であり、実停止確認は P13 後の smoke に引き継ぐ。

---

## 3. SLO ダッシュボードへの CWV 反映 — 未反映を確認

### 3.1 確認結果

SLO の機械可読な正本は `apps/hub/monitoring/slo-dashboard.json` (infrastructure-spec §9 が「ダッシュボード上の手動設定を正本にしない」と定める)。
現行の `panels` は 2 つのみで、**CWV (LCP/INP/CLS) を提供する panel は存在しない**。

| panel | source | provides |
|---|---|---|
| `availability-timeline` | Better Stack status page | monthly_availability / downtime_timeline / cron_heartbeat_status |
| `workers-analytics` | Cloudflare Workers Analytics | 5xx_rate / p95_latency / request_count |

CWV の計測経路は `.github/workflows/cwv.yml` (週次 Lighthouse) に存在するが、
結果は Actions の artifact (`cwv-evidence`) に留まり、SLO 側へ流れる経路が無い。**よって「未反映」と判定する。**

### 3.2 本 task で是正しない理由

- `apps/hub/monitoring/` は本 task の Write scope (`apps/hub/src/lib/catalog/` + 本レポート) の外。
- 同ファイルは `apps/hub/tests/monitoring/monitoring-config.test.ts` (HF-A3-SLO-001) が回帰を固定しており、
  feat-hub-foundation の受入条件 A3 に紐づく。他 feature の受入判定に触れる変更を本 task で行わない。
- `verdict.status` が現在 `collection_blocked` (Better Stack monitor が paused) であり、
  可用性の観測自体が開始していない。CWV panel だけ先に足しても観測は始まらない。

### 3.3 follow-up (P12 へ引き継ぐ)

反映に必要な作業を、実施可能になる順で記録する。

1. P13 デプロイで `vars.HUB_PUBLIC_URL` を確定し、`cwv.yml` を実行して実測値を得る。
2. Better Stack monitor を `paused:false` へ適用し、`verdict.status` を観測開始へ移す (feat-hub-foundation 所有)。
3. `slo-dashboard.json` に CWV panel (`source: github-actions-artifact:cwv-evidence`、provides: `lcp_p75` / `inp_p75` / `cls_p75`) を追加し、
   `monitoring-config.test.ts` の期待値も同時に更新する。

**「設定を書いた」を「計測できている」と読み替えない** (infrastructure-spec §9 の fail-closed 原則) ため、
本レポートでは 3 を未実施のまま未反映と記録する。

---

## 4. WCAG 2.2 AA / axe / CWV 最終確認

| 対象 | 結果 | 根拠 |
|---|---|---|
| axe 検出可能違反 | **0 件** | DC-A11Y-01..04, 07 で S01–S04 と縮退バナーを jsdom 実描画 → `axe.run(document)` |
| 検査の実効性 | **確認済** | DC-A11Y-05 が `lang="ja"` / `<main>` / 見出し / skip link / **取得結果の行データ**の実在を assert。空ページで 0 件を取れない |
| WCAG 2.2 AA (自動検査で届く範囲) | **確認済** | 上記 axe ルールセット |
| WCAG 2.2 AA (自動検査で届かない範囲) | **部分的** | キーボード操作順序・フォーカス可視性は `Tabs` / `DataTable` (packages/ui) 側の担保に依存。実機のスクリーンリーダー確認は未実施 |
| レスポンシブ | 確認済 | DC-RESP-01 |
| CWV (LCP/INP/CLS) 実測 | **未達 (計測不能)** | deploy 済だが `/catalog` が未認証で 401 を返し Lighthouse が読めない (2026-08-02 / run `30736055772`)。P07 acceptance 2 と同一判定 |
| CWV 代理指標 (client JS 予算) | **pass** | 全 catalog route が 120.0 KiB 未満 (最大 119.0 KiB / P08 §3.1) |
| リリース条件としての CI 存在 | **pass** | DC-CI-01..05。`continue-on-error` / `\|\| true` / `passWithNoTests` を持たない |

**CWV を good と判定しない。** `cwv.yml` は URL 未設定時に意図的に失敗する fail-closed 構成であり、
未計測は緑にならない。この判定は P07 と一致しており、P13 後の実測で確定する。

---

## 5. feature context scope_in / acceptance の追跡 (未割当 0 件)

現行 feature context `sha256:a0c5f78e...` の全項目を、P09 の品質保証観点でどこが担保するかに対応づける。

| 区分 | 項目 | P09 での担保 |
|---|---|---|
| scope_in | dual catalog 閲覧 UI (レスポンシブ) | §1.2 (Port 迂回なし) / §4 (axe 0・DC-RESP-01)。**I4 の低品質報告導線は未実装** — P10 §4.3 で指摘・follow-up 化 |
| scope_in | publish 状況表示 (ポーリング) | §2.1 (縮退分類) / DC-POLL-01..14 / DC-POLL-LC-01..06 + 03B |
| scope_in | marketplace.json 出力 + 採用配布経路連携 | §1.1 (テナント跨ぎ補完なし) / §2.2 (SWR による配信継続) |
| scope_in | axe 自動チェック CI | §4 (違反 0 + ゲート存在 + 検査の実効性) |
| scope_in | CWV 計測 (LCP/INP/CLS) | §3 (SLO 未反映を確認) / §4 (未計測を good としない) |
| acceptance | axe 違反 0 がリリース条件として CI に存在 | §4 |
| acceptance | CWV 全指標 good を実測で満たす | §4 — **未達 (未計測)** |
| acceptance | 導入済み Skill が Hub 停止中も動作継続 | §2 |

**未割当 0 件。**

---

## 6. 総合判定

- テナント分離 (deny-by-default): **合格**。加えて構造的な退行防止 (DC-TEN-05) を追加した。
- §6.1 縮退設計: **合格**。実停止での確認のみ P13 後へ残る。
- SLO への CWV 反映: **未反映**。是正は Write scope 外のため follow-up として記録 (§3.3)。
- WCAG 2.2 AA / axe: **合格**。CWV 実測は **未達 (未計測)**。

**P10 (独立最終レビュー) への申し送り**: 未達 2 件 (CWV 実測 / SLO への CWV 反映) はいずれも
「実装の不足」ではなく「デプロイ前で計測対象が存在しない」ことに起因する。緑に見せる代わりに未達として明示している。

### 検証コマンド

```bash
pnpm --filter @harness-hub/hub exec vitest run src/__tests__/dual-catalog-web
```

→ 8 files / **63 tests passed** (DC-TEN-06..10 / DC-LIST-01 追加後)。
