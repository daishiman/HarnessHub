---
status: confirmed
layer: feature-acceptance
---

# feat-dual-catalog-web 受入記録 (P07)

- graph node: `SYS-DUAL-CATALOG-WEB-P07` / beads: `HarnessHub-dhy.7`
- 判定日: 2026-08-01
- 入力: `test-run-results.md` (P06)
- 判定対象: goal-spec acceptance **3 件**

---

## 判定サマリ

| # | acceptance | 判定 |
|---|---|---|
| 1 | axe 検出可能違反 0 がリリース条件として CI に存在する | **pass** |
| 2 | CWV 全指標 good を実測で満たす | **未達 (未計測)** — good と見なさない |
| 3 | 導入済み Skill が Hub 停止中も動作継続する (§6.1 縮退) | **pass** |

**総合: 条件付き。** acceptance 2 は P13 デプロイ後の実測をもって確定する。
本 feature の実装側でこれ以上できる作業は無い (計測対象の公開 URL が存在しないため)。

---

## acceptance 1: axe 検出可能違反 0 がリリース条件として CI に存在する — pass

「違反 0」と「リリース条件として存在する」の 2 つを分けて判定する。書いてあるだけの検査は条件にならない。

### 1.1 違反 0 であること

`catalog-a11y.test.tsx` が S01/S02/S03/S04 を **jsdom 上で実際に描画**し `axe.run(document)` を実行。

| ケース | 対象 | 結果 |
|---|---|---|
| DC-A11Y-01 | `/catalog` | violations 0 |
| DC-A11Y-02 | `/catalog/[projectId]` | violations 0 |
| DC-A11Y-03 | 公開状態タブ (S03) | violations 0 / tab は `role`・`aria-selected` を持つ |
| DC-A11Y-04 | `/catalog/releases` | violations 0 |
| DC-A11Y-07 | 縮退バナー | violations 0 / `role="status"` + `aria-live="polite"` |

**Goodhart 回避の確認**: DC-A11Y-05 が「`lang="ja"`・`<main>`・見出し・skip link・**取得結果の行データ**が実在すること」を
別途 assert している。空ページで violations 0 を取って緑にすることはできない。

### 1.2 リリース条件として存在すること

`ci-gate-presence.test.ts` が workflow を機械的に検査。

| ケース | 検査内容 | 結果 |
|---|---|---|
| DC-CI-01 | `.github/workflows/hub-web-quality-gate.yml` が存在し `pull_request` で発火する | pass |
| DC-CI-02 | catalog テストを実行する `run` があり、指し先ディレクトリに実テストが存在する | pass |
| DC-CI-03 | client JS 予算チェックを `pnpm -r build` の後に実行し、呼ぶ script が実在する | pass |
| DC-CI-04 | `continue-on-error` / `\|\| true` / `passWithNoTests` を持たない (落ちたら赤になる) | pass |
| DC-CI-05 | 既存 `ci.yml` の G9 / G13 を再実装しない (同一 script を呼ぶ) | pass |

**証跡**: `pnpm --filter @harness-hub/hub exec vitest run src/__tests__/dual-catalog-web` → 8 files / 63 tests passed。

---

## acceptance 2: CWV 全指標 good を実測で満たす — 未達 (未計測)

### 2.1 判定

**good と判定しない。** 判定根拠となる LCP / INP / CLS の実測値が存在しないため。

P03 指摘 R7 のとおり「未計測」と「good」を同じ緑に落とすと、計測していないことが品質の証明にすり替わる。
本記録では未計測を **未達** として扱う。

### 2.2 計測できない理由

Lighthouse (`.github/workflows/cwv.yml`) は公開 URL に対して実行される。

> **訂正 (P13 で判明)**: 本節は当初「`vars.HUB_PUBLIC_URL` が P13 デプロイ後に確定するため対象が存在しない」と
> 記していたが、**同変数は既に登録済み** (`https://harness-hub.daishimanju.workers.dev`)。
> 実際の阻害要因は URL の不在ではなく、**本 feature の catalog route がまだ本番へ出ていない**こと
> (変更は未コミットで、deploy は `main` への push でのみ走る)。詳細は `release-record.md` §2.3。
> この取り違えを放置すると「変数を設定したから測れる」と判断し、**catalog を含まない旧版を測って good と記録**しうる。

> **再訂正 (2026-08-02 実測)**: 上記の阻害要因 (未デプロイ) は解消した。PR #628 が merge commit `16a6f915` で
> main へ入り、`hub-ci` run `30727984628` の deploy job が success している。**それでも CWV は計測できない。**
> deploy 後に `hub-cwv` を `/catalog` 指定で実行した run `30736055772` は
> `Lighthouse was unable to reliably load the page you requested. (Status code: 401)` で失敗した。
> `/catalog` は deny-by-default により未認証で 401 を返し、`cwv.yml` は認証済みセッションを持たない。
> **真の阻害要因は「未デプロイ」ではなく「認証必須 route に対する計測経路の欠落」**である。
> `cwv.yml` は feat-hub-foundation 所管で本 feature の Write scope 外のため、追跡課題へ引き渡す。

### 2.3 現時点で満たしている前提条件

実測はできないが、good を取りにいくための設計上の条件は満たしている。

| 指標 | 効く設計 | 状態 |
|---|---|---|
| LCP | 初期表示は概要タブのみ。公開状態・履歴タブは `next/dynamic` で初回バンドルから除外 | 実装済 |
| INP | client JS 予算 120 KiB/route を全 catalog route が充足 (最大 119.0 KiB)。検証器 zod は遅延読込 | **実測済 (G13 pass)** |
| CLS | `dynamic` の `loading:` に文言を置き、読み込み中も高さを確保。Skeleton は `aria-hidden` の装飾 | 実装済 |

client JS 予算は CWV 本体ではないが、**唯一この段階で実測できる CWV 関連の代理指標**であり、
是正前 139.6 KiB → 是正後 119.0 KiB の実測値を持つ (test-run-results.md §4)。

### 2.4 確定手順 (2026-08-02 更新)

1. ~~catalog route を含む版を本番へ deploy する~~ → **完了** (merge `16a6f915` / `hub-ci` run `30727984628`)。
2. ~~`cwv.yml` を実行し LCP ≤ 2.5s / INP ≤ 200ms / CLS ≤ 0.1 を確認する~~ → **実行したが 401 で計測不能** (§2.2 再訂正)。
3. **先に計測経路を用意する。** `cwv.yml` に認証済みセッション (または計測可能な到達経路) を与える。
   feat-hub-foundation 所管のため本 feature では実施せず、追跡課題として引き渡す。
4. 計測後に本記録の acceptance 2 を pass へ更新する (未達のまま release-record を closed にしない)。

---

## acceptance 3: 導入済み Skill が Hub 停止中も動作継続する (§6.1 縮退) — pass

### 3.1 構造上の根拠

導入済み Skill の実行経路に Hub Worker が**入っていない**ことが本質。
Hub が担うのは「発見・導入・公開状態の表示」であり、導入後の Skill 実行は利用者環境で完結する。
本 feature の実装 (catalog 閲覧・publish 状況表示) は Hub 稼働中にのみ必要な機能であり、
停止しても既に導入済みのものには影響しない。

### 3.2 停止時に「止まるもの / 続くもの」

| | 状態 |
|---|---|
| **続く** | 導入済み Skill の実行、公開済み Web App の動作、直近の `/marketplace.json` の配信 (`stale-while-revalidate=300`) |
| **続く (縮退表示)** | catalog 一覧・詳細の閲覧 (取得済みデータを保持)、install descriptor のコピー |
| **止まる** | 新規公開、追加 (導入数の加算を伴う操作)、更新、公開状態の最新化 |

### 3.3 テストによる確認

| ケース | 確認内容 | 結果 |
|---|---|---|
| DC-DEG-01 | 500/502/503 → `degraded` | pass |
| DC-DEG-02 | 404 (API 未実装) → `degraded` (`fatal` にしない) | pass |
| DC-DEG-03/04 | 401 → `unauthorized` / 403 → `forbidden` (サインイン画面へ飛ばさない) | pass |
| DC-DEG-05 | ネットワーク例外 → `degraded` | pass |
| DC-DEG-06 | 縮退時の能力表: 閲覧・descriptor コピーは可、公開/追加/更新は不可 | pass |
| DC-DEG-07 | 文言に「導入済みのツールはそのまま使えます」の主旨を含む (qa-019) | pass |
| DC-DEG-08 | 4 値への全射 (未知 status も必ずいずれかに落ちる) | pass |
| DC-MKT-07 | `Cache-Control: private, max-age=60, stale-while-revalidate=300` + scope/session `Vary` | pass |
| DC-A11Y-07 | 縮退バナーが読み上げ可能で、`role="alert"` で割り込まない | pass |

### 3.4 実挙動としての確認

`/api/v1/harnesses*` が未実装 (feat-publish-pipeline 所有) の現状は、そのまま **Hub API 不在時の実挙動**にあたる。
この状態で catalog 画面を開くと 404 → `degraded` と分類され、「Hub が一時的に応答していません。導入済みのツールは
そのまま使えます。」の縮退バナーが出る。画面は白紙にならず、閲覧導線も残る。設計どおりの挙動を実環境相当で確認できている。

---

## 差し戻し事項

無し。acceptance 2 は「実装の不足」ではなく「計測対象の不在」による未確定であり、P13 後の実測で確定する。
