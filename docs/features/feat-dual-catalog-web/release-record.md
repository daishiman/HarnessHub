---
status: confirmed
layer: feature-release
---

# feat-dual-catalog-web リリース記録 (P13)

- graph node: `SYS-DUAL-CATALOG-WEB-P13` / beads: `HarnessHub-dhy.13`
- 記録日: 2026-08-01
- 消費: `runbook.md` (P12) / `docs/infrastructure-spec.md`
- deploy unit: `cloudflare-workers/hub` (単一 Worker `harness-hub`)

---

## 0. 本記録の性格 — **初回 P13 では本番デプロイを実施していない**

P13 の目的は「wrangler で本番へロールアウトし、smoke test を実施し、U5 を判定する」ことだが、
**初回 run ではデプロイを実行していない。** その後の最終レビューでは commit・push・draft PR までが
許可されたが、main merge と production deploy は対象外のため、次の記録を履歴として維持する。

| # | 理由 | 内容 |
|---|---|---|
| 1 | **初回 run の指示** | 初回 P13 は commit・push・PR を行わない条件だった。最終レビューでは draft PR まで許可されたが、main push はまだ行わない |
| 2 | **deploy トリガーの構造** | `ci.yml` の deploy job は `github.ref == 'refs/heads/main' && github.event_name == 'push'` でのみ走る。手元から `wrangler deploy` を直接叩く運用は取っていない (§1.2) |
| 3 | **初回時点で未コミット** | 初回 P13 では作業ツリー上だけに存在した。最終レビュー後も draft PR merge 前なので catalog は本番に出ていない |

**未実施を「実施済み」と書かない。** 実測していない smoke 結果を pass として記録すると、
本 feature が守ってきた fail-closed の原則 (未計測を good と見なさない) を最後の phase で破ることになる。
本記録は「**何をどう実行すれば完了するか**」を確定させ、実行者へ引き渡すことを役割とする。

---

## 1. デプロイ経路の実体 (実装済み・変更不要)

### 1.1 構成

| 項目 | 値 | 出所 |
|---|---|---|
| Worker 名 | `harness-hub` | `apps/hub/wrangler.jsonc` |
| entry | `src/worker.ts` (OpenNext の fetch handler + scheduled handler) | 同上 |
| 環境分離 | **top-level 定義そのものが production**。`--env` を使わない | 同上 (qa-038 で常設 staging を持たないため) |
| ビルド | `pnpm --filter @harness-hub/hub run build:worker` (`opennextjs-cloudflare build`) | `apps/hub/package.json` |
| デプロイ | `pnpm --filter @harness-hub/hub exec wrangler deploy` | `.github/workflows/ci.yml` deploy job |

> `--env` を持たない設計は意図的。env を分けると CI の `--env` 指定漏れが
> そのまま「意図しない環境への deploy」になるため、単一定義に揃えている。

### 1.2 実行順序 (`ci.yml` deploy job)

```
static-gates + test が両方 success
  → preflight (必須 secrets / variables の存在検査)
  → production migration 適用 (drizzle: --dry-run → 本適用)
  → opennext build
  → wrangler deploy
  → /health 疎通確認
  → 本番 OIDC start-flow smoke
  → 本番 DB / R2 smoke (6 項目)
  → (いずれか失敗時) 失敗時ロールバック
```

**migration → deploy の順序が固定されている**のは、Worker が先に出ると新コードが未作成の表を参照して落ちるため。
preflight を最初に置くのは、未登録の secret を GitHub Actions が空文字にする仕様のせいで
「本番を前進させた後に失敗する」ことを避けるため。

### 1.3 必須設定の登録状況 (2026-08-01 時点で確認)

`vars` は `gh api repos/daishiman/HarnessHub/actions/variables` で実測。**2 件とも登録済み**。

| 名前 | 種別 | 状態 | 値 |
|---|---|---|---|
| `HUB_HEALTH_URL` | variable | **登録済** | `https://harness-hub.daishimanju.workers.dev/health` |
| `HUB_PUBLIC_URL` | variable | **登録済** | `https://harness-hub.daishimanju.workers.dev` |
| `CLOUDFLARE_API_TOKEN` | secret | 未確認 (値は読めない) | — |
| `CLOUDFLARE_R2_API_TOKEN` | secret | 未確認 | — |
| `CLOUDFLARE_ACCOUNT_ID` | secret | 未確認 | — |
| `TURSO_DATABASE_URL` | secret | 未確認 | — |
| `TURSO_AUTH_TOKEN` | secret | 未確認 | — |

secret は値も存在も本記録から確認していない。`ci.yml` の preflight step が
**deploy 前に名前の存在を検査して落とす**ため、欠落は本番を前進させる前に検出される。

---

## 2. 本 run の状態

### 2.1 変更は未コミット

本 feature の成果物 (実装 6 ファイル + 画面 5 ファイル + route 3 + テスト 7 ファイル + 契約 + 文書 13) は
すべて作業ツリー上にある。`git status` で確認できる。**この状態では deploy しても catalog は本番に出ない。**

### 2.2 本番 URL への疎通確認は行っていない

`HUB_PUBLIC_URL` は登録済みだが、本セッションから当該 URL への HTTP アクセスは実行していない
(コマンド実行が許可されなかった)。したがって **Worker が現在稼働しているかどうかは本記録では未確認**である。
「変数が登録されている」と「Worker が生きている」は別の事実なので、混同しないこと。

### 2.3 **訂正: CWV が測れない理由は「URL が無いから」ではない**

P03〜P11 の各文書は「`vars.HUB_PUBLIC_URL` が未設定のため計測対象が存在しない」と記していたが、
**同変数は既に登録済みであり、この前提は誤りだった。** 実際の阻害要因は次の 2 点である。

1. **本 feature の catalog route がまだ本番に出ていない** (§2.1)。
   今 `cwv.yml` を実行すると、catalog を含まない旧版を測って値が返る。
   その値を acceptance 2 の根拠にすると、**測っていない画面を good と申告する**ことになる。
2. **`cwv.yml` は既定でルート URL しか測らない**。`vars.HUB_PUBLIC_URL` をそのまま Lighthouse に渡す実装であり、
   `/catalog` を測るには `workflow_dispatch` の `target_url` 入力で明示する必要がある。

この取り違えは「変数を設定すれば完了」という誤った作業計画を生む。
該当箇所は `acceptance-record.md` §2.2 / `final-review-record.md` §2・§5 / `quality-assurance-report.md` §4 /
`evidence-summary.md` §8 / `runbook-follow-ups.md` §3 を本 phase で訂正済み。

### 2.4 変更ファイル全件と Write scope の突合 (close-out 検査)

作業ツリー上の全変更 (44 件) を、13 task spec が宣言する Write scope と 1 件ずつ突き合わせた。

| 群 | 件数 | 所有 phase | 判定 |
|---|---|---|---|
| `docs/features/feat-dual-catalog-web/*.md` | 13 | P01–P13 (各 1 件) | **一致** |
| `apps/hub/src/__tests__/dual-catalog-web/` | 7 | P04 / P06 | **一致** |
| `apps/hub/src/app/(workspace)/catalog/` | 3 | P05 | **一致** |
| `apps/hub/src/app/marketplace.json/route.ts` | 1 | P05 | **一致** |
| `apps/hub/src/components/catalog/` | 5 | P05 / P08 | **一致** |
| `apps/hub/src/lib/catalog/` | 7 | P05 / P09 | **一致** |
| `packages/schemas/dual-catalog-web/` | 4 | P05 | **一致** |
| `.github/workflows/hub-web-quality-gate.yml` | 1 | P05 | **一致** |
| `apps/hub/vitest.config.ts` | 1 | **どの phase の宣言にも無い** | **逸脱** (記録済 / 下記 a) |
| `packages/schemas/src/index.ts` | 1 | **どの phase の宣言にも無い** | **逸脱** (記録済 / 下記 b) |
| `apps/hub/.claude/handoff/20260801T170843.md` | 1 | — | **本 feature の成果物ではない** (下記 c) |

**a. `apps/hub/vitest.config.ts`** — `include` に `src/__tests__/**` を追加。
既存設定は `tests/**` しか見ておらず、**追加しなければ新規テスト 7 ファイルが 1 件も収集されないまま緑になる**。
task spec は `apps/hub/src/__tests__/dual-catalog-web/` を Write scope に置きながら、
runner がその位置を見ていないという不整合があり、それを埋める最小変更。追加のみで既存挙動は不変。

**b. `packages/schemas/src/index.ts`** — `dual-catalog-web` を再輸出。
同ファイルの規約コメントが「この単一入口から再エクスポートする以外に経路が無い」と定めており、
`auth-tenancy` / `publish-pipeline` と同じ形。追加輸出のみ。

上 2 件は `refactoring-migration-note.md` §4 に記録済み。

**c. `apps/hub/.claude/handoff/20260801T170843.md`** — 本セッションの PreCompact hook が生成した作業記録で、
**feature の成果物ではない**。commit 対象に含めないこと (必要なら `.gitignore` へ)。

**phase 単位で見た場合の内訳逸脱** (package の Write scope 和集合内には収まる):

| 変更 | 実施 phase | その phase の宣言 scope | 理由 |
|---|---|---|---|
| `tenant-isolation.test.ts` に DC-TEN-05 追加 | P09 | `lib/catalog/` + 報告書 | Port 迂回の構造ゲート。検査対象がテストである以上テスト側にしか書けない |
| `marketplace-document.test.ts` に DC-MKT-10 追加 | P10 | 報告書のみ | 逆 Goodhart の是正 (P10 §4.2)。指摘を出すだけで直さない選択は取らなかった |
| `lib/catalog/marketplace.ts` のコメント是正 | P10 | 報告書のみ | 誤った decision ID 参照の是正 (P10 §4.1)。コメントのみで挙動不変 |

---

## 3. smoke test 項目 — 定義と現在の状態

P13 の required evidence が求める 5 種を、**実行可能な形**に落とす。
現時点の状態は全項目 **未実行 (デプロイ未実施のため)**。

### 3.1 catalog 一覧表示 (S01)

```bash
curl -sS -o /dev/null -w '%{http_code}\n' \
  "$HUB_PUBLIC_URL/catalog?tenant=$TENANT&workspace=$WORKSPACE" -b "$SESSION_COOKIE"
```

- **pass 条件**: 200 が返り、HTML に表の見出し「業務ツール一覧」が含まれること。
- **注意**: 一覧データ自体は `/api/v1/harnesses` に依存し、同 API は feat-publish-pipeline 側で**未実装**。
  したがって**縮退バナーが出るのが期待どおり**であり、これを fail としない (runbook §4.2)。
  ここで確認するのは「画面が配信され、縮退表示に落ちること」まで。

### 3.2 catalog 詳細表示 (S02)

```bash
curl -sS -o /dev/null -w '%{http_code}\n' \
  "$HUB_PUBLIC_URL/catalog/$PROJECT_ID?tenant=$TENANT&workspace=$WORKSPACE" -b "$SESSION_COOKIE"
```

- **pass 条件**: 200。タブ「概要 / リリース履歴」が描画されること。
- `tenant` / `workspace` を**外した**要求も 1 回行い、「Workspace が特定できないため表示できません。」が出ること
  (deny-by-default の実挙動確認 / DC-TEN-01..05 の本番側裏取り)。

### 3.3 publish 状況ポーリング (S03)

- **pass 条件**: `?publish=<publishId>` 付きで詳細を開くと「公開状態」タブが現れ、
  自動更新が走り、停止条件に達すると「自動更新を停止しました」と再試行ボタンが出ること。
- **前提**: 実在する `publishId` が必要。feat-publish-pipeline 未実装のため、
  **本番で実 publishId を用意できない可能性が高い**。その場合は
  「タブが出ること」「取得失敗時に縮退表示になること」までを確認範囲とし、**未確認部分を明記する**。

### 3.4 `marketplace.json` 配信

```bash
curl -sSI "$HUB_PUBLIC_URL/marketplace.json" -b "$SESSION_COOKIE" \
  -H "x-harness-tenant-id: $TENANT" -H "x-harness-workspace-id: $WORKSPACE"
```

- **pass 条件** (3 つすべて):
  1. `cache-control: private, max-age=60, stale-while-revalidate=300`
  2. `vary: Cookie, x-harness-tenant-id, x-harness-workspace-id`
  3. `x-catalog-source-status: pending-h7` (現在の gate 状態と一致)
  4. body の `source_status` が header と同値で、`plugins` が `[]`
- **これが `ready` を返したら止めること。** Stage 0 gate H7 が未成立のまま配布経路が解決されている状態であり、
  リリースを継続してはならない (`stage0-gate-conclusion.md` の `verdict` を確認する)。

### 3.5 axe ゲート通過

- **CI で完結する**ため本番デプロイに依存しない。既に pass 済み。
  - `pnpm --filter @harness-hub/hub run test:a11y` (3 tests pass)
  - `hub-web-quality-gate.yml` の catalog 契約テスト (a11y 含む 8 files / 63 tests pass)
- **pass 条件**: 違反 0 かつ `continue-on-error` / `|| true` / `passWithNoTests` を持たないこと (DC-CI-04)。

### 3.6 CWV ゲート通過

- **本番デプロイ後にのみ実行できる。** 手順は §5.2 の 3 の通り。
- **pass 条件**: LCP ≤ 2500ms / CLS ≤ 0.1 / TBT ≤ 200ms (INP の lab 代理指標)。
- **現状: 未計測 = 未達。** acceptance 2 はこの実測をもってのみ pass にできる。

### 3.7 現在の状態まとめ

| # | 項目 | 状態 | 根拠 |
|---|---|---|---|
| 1 | catalog 一覧表示 | **未実行** | デプロイ未実施 |
| 2 | catalog 詳細表示 | **未実行** | 同上 |
| 3 | publish 状況ポーリング | **未実行** | 同上 (加えて実 publishId の入手性に依存) |
| 4 | `marketplace.json` 配信 | **未実行** | 同上 |
| 5 | axe ゲート | **pass** | ローカル実測 (test:a11y 3 tests / 契約テスト 63 tests) |
| 6 | CWV ゲート | **未実行 (未達)** | デプロイ未実施 (§2.3) |

---

## 4. rollback 手順

### 4.1 自動 (CI が実行する)

`ci.yml` deploy job の「失敗時ロールバック」step が担う。方針は 3 点:

1. **DB は自動で戻さない。** migration は expand-only (CREATE TABLE のみ) で、巻き戻すと実データを失う。
   旧 Worker は新規テーブルを参照しないため、DB を前進させたままでも本番は整合する。
2. **Worker は「壊れた新 version が本番に出ている」ときだけ**直前 version へ戻す。
   `wrangler deploy` 自体が失敗した場合は新 version が出ていないので、戻す対象が無い。
3. この step の exit code は**ロールバックの成否**を表す。元の失敗は前段 step が既に赤にしている。

### 4.2 手動

自動ロールバックが失敗した場合 (「壊れた version が本番に残っている」と error が出る)。

```bash
# 直前 version へ戻す
pnpm --filter @harness-hub/hub exec wrangler rollback \
  --message "手動復帰: <理由>" -y

# 戻った版の確認。/health の version フィールドは CF_VERSION_METADATA 由来で、
# build 時注入と違い rollback 後も嘘をつかない
curl -sS "$HUB_HEALTH_URL"
```

### 4.3 ロールバックの判定基準 (本 feature 由来)

| 事象 | 判定 | 対応 |
|---|---|---|
| `/marketplace.json` が `source_status: ready` を返す (gate 未成立なのに) | **即ロールバック** | 配布経路が未確定のまま配布が始まる。`stage0-gate-conclusion.md` の verdict を確認し原因を特定 |
| catalog 画面が 5xx を返す | ロールバック | §4.1 の自動処理に委ねる |
| catalog 画面に縮退バナーが出る | **ロールバックしない** | `/api/v1/harnesses*` 未実装による期待どおりの縮退 (runbook §4.2) |
| CWV が good 圏外 | ロールバックしない | 品質課題として P05/P09 へ差し戻す (deploy の巻き戻しでは解決しない) |

### 4.4 差し戻し先

smoke fail の原因別に、`ci.yml` の rollback とは別に feature 側の差し戻し先を定める。

- 画面・縮退・ポーリングの挙動不良 → **P05 (実装)**
- テナント分離・a11y・CWV の品質不良 → **P09 (品質保証)**
- 配布経路 (`source_status`) の不整合 → **feat-stage0-distribution-gate** へエスカレーション (本 feature では解決しない)

---

## 5. U5・リリース完了判定・引き継ぎ

300 行の文書上限に合わせ、外部実測を要する完了判定は
[release-completion-checklist.md](./release-completion-checklist.md) へ責務分離した。
