---
status: confirmed
layer: feature-refactoring
---

# feat-dual-catalog-web 移行整理ノート (P08)

- graph node: `SYS-DUAL-CATALOG-WEB-P08` / beads: `HarnessHub-dhy.8`
- 対象: `apps/hub/src/components/catalog/`
- 判定日: 2026-08-01

P08 の責務は 2 つ。**(a) モック由来の構造を本番向け dynamic import 構成へ移行整理**し、
**(b) CWV バンドル予算への適合を最終確認**する。データ移行 (backfill) は伴わない (新規実装のため)。

---

## 1. モック静的構造からの移行差分

### 1.1 出発点

`docs/mockups/harness-studio-v2-analysis.md` の静的モック (`harness-studio-v2.html`) は
`harnesses` / `harness-detail` を「既存 S01/S02 (I4 Workspace Catalog) と一致」と位置づけている。
モックは 1 枚の HTML に全画面のマークアップを並べた形式で、そのまま写すと以下が起きる。

- 画面ごとに同じカード・テーブル・バッジのマークアップが重複する
- 全画面ぶんのスクリプトが 1 チャンクに入り、開いていない画面の JS まで読む
- モック側の色・余白がコピーされ、design system と二重管理になる

### 1.2 移行後の構成

| モック上の構造 | 本番実装 | 移行の内容 |
|---|---|---|
| 一覧テーブルのマークアップ | `packages/ui` の `DataTable` | 自前テーブルを作らず共通部品へ寄せた (列定義のみ feature 側) |
| 状態バッジ | `packages/ui` の `StatusChip` (`domain="release"` / `"publish"`) | 色・語彙は design system 側の責務 |
| 障害・注意の帯 | `packages/ui` の `DegradedBanner` / `ErrorState` / `Alert` | `role`/`aria-live` の決定を共通部品に集約 |
| 詳細画面のセクション並び | `packages/ui` の `Tabs` (概要 / 公開状態 / リリース履歴) | **分割境界をタブに置いた** (§2) |
| 一覧の「プラグインを公開」モーダル | **実装しない** | 公開操作は feat-publish-pipeline 所有 (scope_out)。DC-SCOPE-01/02 が不在を assert |

**共通部品との重複が無いことの機械確認**: `node scripts/ci/check-shared-layer-duplicates.mjs`
→ 「登録共通層 12 件 + 運用機構 4 件 / 走査 447 ファイル / **違反 0 件**」。

### 1.3 barrel からの取り込み過剰が無いことの確認

`components/catalog/*` は `lib/catalog/index.js` (barrel) 経由で参照する規約にしている。
barrel が未使用モジュールを client チャンクへ持ち込んでいないかを、ビルド成果物の実測で確認した。

- `lib/catalog/marketplace.ts` は Route Handler 専用 (client 未使用)。その識別子 `pending-h7` を
  catalog 3 route の page チャンクから検索 → **0 件**。tree shaking が効いており、barrel 経由の混入は無い。

よって barrel を deep import へ崩す変更は行わない (規約を崩す理由が実測上存在しない)。

---

## 2. dynamic import 構成

分割境界は **タブ** に置く (ADR §4.2)。初期表示に必要なのは「概要」だけで、
ポーリングを持つ公開状態タブや履歴タブの JS を初回バンドルに含めると、閲覧しかしない利用者にも
転送量と実行時間を負担させる。

| 部品 | 読み込み | 理由 |
|---|---|---|
| `CatalogList` | 静的 (route entry) | S01 の本体 |
| `CatalogDetail` | 静的 (route entry) | S02 の本体 |
| `CatalogInstallPanel` | 静的 | 概要タブの初期表示内容。遅延させると主要導線が後から現れ CLS が悪化する |
| `CatalogPublishStatus` | **`next/dynamic`** | 公開状態タブを開くまで不要。ポーリング実装を含み最も重い |
| `CatalogReleaseHistory` | **`next/dynamic`** | リリース履歴タブを開くまで不要 |
| 応答検証スキーマ (zod) | **`import()`** | 初回描画に不要。fetch と並走させて読む (§3.2) |

`next/dynamic` には `loading:` を必ず与え、読み込み中も文言で高さを確保している (CLS 対策)。

---

## 3. CWV バンドル予算への適合確認

### 3.1 予算と実測 (最終)

予算: **120.0 KiB/route (gzip, First Load JS)** — `apps/hub/scripts/check-client-bundle.mjs` の既定値。
task spec 記載の「250KB/route 以下」より、リポジトリ共通ゲートの方が厳しいため後者を採用する。

| route | 是正前 | **最終** | 余裕 |
|---|---|---|---|
| `/catalog` | 135.4 KiB | **112.9 KiB** | 7.1 KiB |
| `/catalog/[projectId]` | 139.6 KiB | **119.0 KiB** | 1.0 KiB |
| `/catalog/releases` | 137.4 KiB | **116.9 KiB** | 3.1 KiB |
| `/marketplace.json` | 100.4 KiB | 100.4 KiB | (route handler / 対象外) |

`pnpm --filter @harness-hub/hub run check:client-bundle` → **exit 0 (全 route pass)**。

### 3.2 適合させた 2 つの是正

いずれも P05/P06 の実測を受けて実施済み (詳細は `test-run-results.md` §4)。

1. **応答検証スキーマの遅延読込** (`lib/catalog/http-adapter.ts`, −18.3 KiB)
   静的 import では zod + 契約一式が catalog 3 route すべての初回チャンクに載っていた。
   検証を外すのではなく、`import('@harness-hub/schemas')` を fetch の直前に開始して並走させる形に変更。
   検証の強さは不変で、往復も増えない。
2. **`next/link` の撤去** (`components/catalog/CatalogList.tsx`, −3.3 KiB)
   apps/hub で `next/link` を使っていたのは `CatalogList` のみ (既存画面は素の `<a href>`)。
   1 本のリンクのために router runtime を初回チャンクへ積んでいた。

### 3.3 残る薄さと監視

`/catalog/[projectId]` の余裕は **1.3 KiB** と薄い。この route の計測値には、
client-reference manifest の和集合として兄弟 route `/catalog` のチャンクも算入される構造になっている
(実測: `app/(workspace)/catalog/page` チャンク 5.0 KiB が detail 側の合計にも入る)。
そのため **`CatalogList` を太らせると `/catalog/[projectId]` が先に予算を割る**。

- 監視は `check:client-bundle` (CI: `ci.yml` G13 + `hub-web-quality-gate.yml`) が担う。閾値は変更していない。
- さらに削る場合の候補 (現時点では不要と判断):
  - `CatalogInstallPanel` の `next/dynamic` 化 — 初期表示内容のため CLS と引き換えになる。採らない。
  - 一覧の絞り込みを URL ナビゲーション化して `CatalogList` をサーバ側へ寄せる — 効果は大きいが、
    `/api/v1/harnesses*` が未実装で RSC からの絶対 URL 取得経路が確立していない。API 実装後に再検討する。

---

## 4. Write scope からの逸脱記録

P05〜P08 を通じて、宣言済み Write scope の外に出た変更は以下 2 件。いずれも「追加のみ・既存挙動不変」。

| ファイル | 変更 | 理由 | 影響 |
|---|---|---|---|
| `apps/hub/vitest.config.ts` | `include` に `src/__tests__/**` を追加 | 既存設定は `tests/**` のみを見ており、新規テストが 1 件も実行されないまま緑になる | 実行対象の追加のみ |
| `packages/schemas/src/index.ts` | `dual-catalog-web` を再輸出 | 契約を `@harness-hub/schemas` から解決させるため (相対パス直参照は package 境界を崩す) | 追加輸出のみ |

P08 自体の Write scope (`apps/hub/src/components/catalog/`) 内の変更は `CatalogList.tsx` の `next/link` 撤去のみ。
`lib/catalog/http-adapter.ts` の遅延読込は **P05 の Write scope 内**で実施した (P05 が同ディレクトリを所有するため)。

---

## 5. 命名の追補 (test-design)

`test-design.md` の DC-MKT-04/05 は `sourceStatus` と表記しているが、実装・契約は **`source_status`** (snake_case)。
`.claude-plugin/marketplace.json` と `packages/schemas` の既存契約が snake_case で統一されているため、
**契約側を正とし test-design の表記を追補**する。テストは `source_status` で assert しており、実装との齟齬は無い。

---

## 6. 判定

- モック由来の重複コード: **無し** (共通層重複検知 0 件)
- 過剰な静的インポート: **解消済み** (zod 遅延読込 / `next/link` 撤去 / タブの dynamic 分割)
- CWV バンドル予算: **適合** (全 catalog route が 120.0 KiB 未満、ゲート exit 0)
- データ移行: **N/A** (新規実装)
