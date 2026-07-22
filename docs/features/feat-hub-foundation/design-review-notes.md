---
status: confirmed
layer: feature-design
task: SYS-HUB-FOUNDATION-P03
parent_feature: feat-hub-foundation
feature_package_id: feature-package/feat-hub-foundation
feature_context_digest: sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d
package_digest: sha256:8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502
depends_on: [SYS-HUB-FOUNDATION-P02]
reviewed_artifact: docs/features/feat-hub-foundation/architecture-decision-record.md
verdict: 差し戻し
architecture_refs: [arch-harness-hub-infrastructure, arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security, arch-harness-hub-dev-workflow]
---

# feat-hub-foundation 独立設計レビュー記録 (P03)

> **位置づけ**: P03 (独立設計レビュー) の成果物。P02 の [architecture-decision-record.md](architecture-decision-record.md) を、設計者から独立した基準で検証した記録。本文書は設計を追認するためのものではなく、**却下すべき点を能動的に探した結果**を記録する。
>
> **レビュー方法**: P02 の記述を起点にせず、上流確定仕様 (`system-spec/spec-state.json` の qa_log 66 件・`docs/infrastructure-spec.md`・`docs/shared-layers.md`) から独立に要求を再構成し、ADR がそれを満たすかを照合した。特に **ADR が引用していない確定仕様**を優先的に探索した。

---

## 1. 承認可否

### **判定: 差し戻し (P02 再実行)**

ただし差し戻しの範囲は限定される。以下を明記する。

| 区分 | 判定 |
|---|---|
| **pnpm workspace 構成 (案 (b) 採用) そのもの** | **支持する。再評価は不要**。(a)(c) の棄却理由は妥当であり、案 (a) への回帰は A4 (共通層の単一実装 owner) を検証不能にするため誤り |
| **deploy unit = 単一 Worker** | **支持する**。D1 決定・`docs/system-design-overview.md` §1 と整合 |
| **ADR §3 (共通層 → 配置境界の割当)** | **差し戻し**。振り分け基準の不記載と owner 未解消 (R-04・R-06) |
| **ADR §4 (deploy unit とデプロイ経路)** | **差し戻し**。環境戦略が後発の確定仕様と矛盾 (R-01) |
| **ADR §6 (CI 品質ゲート設計)** | **差し戻し**。確定済み required status checks の 6 項目欠落と A1 の構造的非充足 (R-02・R-03) |
| **ADR §7 (監視・SLO 構成)** | **差し戻し**。SLO 算定式が正本と不一致、backup が実装物から文書へ格下げ (R-08・R-11) |

**差し戻しの理由 (重大 5 件)**: R-01 / R-02 / R-03 / R-04 / R-05。いずれも「上流の確定仕様に既に答えがあるのに ADR がそれへ接地していない」種類の欠陥であり、P04 (テスト設計) が本 ADR に依拠すると誤った test ID を定義してしまう。**P04 着手前の是正が必要**。

> 用語補足: 「差し戻し (さしもどし)」= 前の工程へ返して直してもらうこと。ここでは P02 (設計) をやり直す対象にする、という意味。

---

## 2. 確定 QA への適合確認 (4 件を 1 件ずつ)

### 2.1 qa-003 (infrastructure — Hub の実行環境・hosting 構成)

| 項目 | 判定 |
|---|---|
| **総合** | **条件付き適合** |

| 確定要求 (qa-003 原文) | ADR の対応 | 判定 | 根拠 |
|---|---|---|---|
| Cloudflare Workers 一体型 (`@opennextjs/cloudflare` で Next.js を 1 Worker として実行) | §4「deploy unit = 単一 Worker `cloudflare-workers/hub`。UI + API 同居」・D-P02-2 | **適合** | `docs/system-design-overview.md` §1 の構成図と一致 |
| R2 (PackageRegistry) を **native binding** で参照 | 記述なし | **不適合** | ADR は R2 binding に一切言及しない。`docs/infrastructure-spec.md` §2 は `PACKAGES_BUCKET` / `BACKUPS_BUCKET` / `ASSETS` の 3 binding を wrangler.jsonc 正本として確定済み。ADR §3 は `wrangler.jsonc` の実装 owner を本 feature としながら、その**内容正本を参照していない** (R-10) |
| 無料枠 (10 万 req/日) 内で運用・固定費ゼロ | §7「Cloudflare 標準機能。追加費用なし (C2)」 | **条件付き適合** | 常設 staging が無料枠を二重消費する点が未検証 (R-01)。CPU 10ms/呼出の予算 (`infrastructure-spec` §2) にも未言及 |
| デプロイは wrangler CLI | §4「GitHub Actions → `wrangler deploy`」 | **適合** | quality_constraint `wrangler-deploy` と整合。ただし WebApp 出口との同一ツール系統の担保は未言及 (R-27) |
| pnpm は corepack 経由・他パッケージマネージャ禁止 (qa-003 desktop 集約分) | D-P02-4 は `packageManager` pin + CI 検査。corepack への言及なし | **条件付き適合** | 正本 3 箇所 (qa-003 / qa-038 / qa-039) が corepack を強制機構と確定しているが、ADR も `package.json` も corepack を採らず `npx --yes only-allow pnpm` を用いる (R-20) |

### 2.2 qa-019 (infrastructure — SLO・エラーバジェット・監視・ポストモーテム・バックアップ検証)

| 項目 | 判定 |
|---|---|
| **総合** | **条件付き適合 (5 要素中 2 要素が未着地)** |

| 確定要求 (qa-019 の (1)〜(6)) | ADR の対応 | 判定 | 根拠 |
|---|---|---|---|
| (1) SLI/SLO = 可用性 99.5% と **応答性 (p95 レイテンシを Workers analytics で計測)** | §7 は可用性のみ。p95 レイテンシの SLI 定義なし | **条件付き適合** | qa-019 は SLI を 2 本 (可用性・応答性) と確定している。ADR は 1 本しか設計していない |
| (2) エラーバジェット 0.5% を**消費し切った**場合に新規公開機能の変更凍結 | §7「0.5% 消費でアラート → 新規公開機能の変更凍結」 | **条件付き適合** | アラートと凍結が同一閾値に潰れており、早期警告が存在しない。正本 (`infrastructure-spec` §9) は「消費 100% で凍結」で、算定式も「外形監視 downtime **+ Workers analytics の 5xx 率**」(R-11・R-12) |
| (3) 監視 = logs/analytics + /health + 外部死活 + SLO ダッシュボード + バジェット消費アラート | §7 に 5 要素とも記載 | **適合** | ただし cron heartbeat (`infrastructure-spec` §5、qa-027 接続) が欠落 (R-09 と同根) |
| (4) ポストモーテム = blame-free 振り返りを issue 化 | 記述なし | **不適合 (軽微)** | 運用手順であり P12 委譲は許容余地があるが、ADR §7 も §9 スコープ外にも記載がなく、**どの phase の責務かが宙に浮いている** |
| (5) バックアップ検証 = 日次 export + **四半期 restore drill**。復元できないバックアップを成功と数えない | §3「バックアップ → 運用手順 (P12)。手順のみ」 | **不適合** | 正本 (`infrastructure-spec` §7) では `backup.yml` という **GitHub Actions workflow の実装物**、§10 で RPO≤24h / RTO≤4h。ADR は実装物を文書へ格下げしており、requirements-baseline §9.5「P12/P13 は不足している実装を文書で代替できない」に抵触 (R-08) |
| (6) 接続層隔離による D2 (Turso→D1) 退避経路の維持 | §3「repository 層 → `packages/db` (境界のみ)」 | **適合** | 隔離の意図は満たす。ただし migration 実行主体が未割当 (R-16) |

### 2.3 qa-007 (frontend — フロントエンド構成)

| 項目 | 判定 |
|---|---|
| **総合** | **適合** |

| 確定要求 | ADR の対応 | 判定 |
|---|---|---|
| Next.js + TypeScript | §2.4「apps/hub (Next.js on Workers)」・§5 Frontend | **適合** |
| パッケージマネージャは pnpm (npm 不使用、`packageManager` pin) | D-P02-4・§6 pnpm 混入検査・`package.json` の `packageManager: pnpm@10.9.0` | **適合** (強制機構の選択に指摘 R-20 あり) |
| App Router を Workers 上で SSR (`@opennextjs/cloudflare`) | §2.4「src/app/ = App Router (SSR on Workers)」 | **適合** |
| 作者向けは専用 desktop GUI を作らず Claude Code / Codex plugin | §2.4「plugins/publisher/ ディレクトリ予約のみ」 | **条件付き適合** | 予約先が既存の開発用 plugin 群と名前空間衝突し、workspace member にも未登録 (R-24) |

> qa-007 は本 4 件のうち唯一、実質的な欠落なく設計へ落ちている。

### 2.4 qa-018 (frontend — UI/UX 品質要求)

| 項目 | 判定 |
|---|---|
| **総合** | **不適合 (3 本柱のうち 1 本が未着地)** |

| 確定要求 (qa-018 の (1)〜(3)) | ADR の対応 | 判定 | 根拠 |
|---|---|---|---|
| (1) アクセシビリティ = WCAG 2.2 AA。CI に axe 自動チェック、検出可能違反ゼロをリリース条件 | §6「axe a11y: `packages/ui` 部品単体 + `apps/hub` 画面結合の 2 段。違反 1 件以上で fail」 | **適合** | 部品単体と画面結合の 2 段構成は `shared-layers` §1「戦略」と一致。機械強制可能な設計になっている |
| (2) 速度 = Core Web Vitals 全指標 good (LCP ≤ 2.5s / INP ≤ 200ms / CLS ≤ 0.1)。**bundle 予算管理・R2/edge 配信・不要 JS 削減**で達成 | bundle 予算 (§4・§6) のみ。CWV の語も LCP/INP/CLS の数値も ADR に一度も現れない。R2/edge 配信の設計もなし | **不適合** | 確定仕様が達成手段を 3 つ指定しているうち 1 つしか設計されておらず、**計測・検証経路が皆無**。bundle 予算は CWV の代理指標にすぎず、good 判定の根拠にならない (R-05) |
| (3) 不快にさせない設計 (確認+可逆・進捗表示・平易な日本語 + 次の一手・CLS/点滅回避) | §3 の `packages/ui` 割当 (確認ダイアログ・進捗/状態表示・通知/エラー表示) | **適合** | requirements-baseline §8.1 の共通部品表を境界へ正しく写像している |

---

## 3. D1 決定・C1 / C2 制約への適合

### 3.1 D1 (Cloudflare Workers 一体型 @opennextjs/cloudflare)

| 観点 | 判定 | 根拠 |
|---|---|---|
| 単一 Worker への UI + API 同居 | **適合** | §4。分割しない理由 (D1 + C1) が明示され、`system-design-overview.md` §1 と一致 |
| bundle 3MiB (gzip) 予算 | **適合** | §4・§6。`packages/*` 側で重量依存を持たない設計制約まで踏み込んでいる点は積極的に評価できる |
| **Workers scheduled handler (cron) の同居** | **不適合** | `infrastructure-spec` §5 は同一 Worker に cron 2 系統 (日次・週次) の scheduled handler を確定済み。`@opennextjs/cloudflare` は Next.js の fetch handler を出力するため、scheduled を持つには custom worker entry で包む設計判断が要る。ADR §4 の deploy unit 定義は「UI + API」だけで、この設計含意を扱っていない (R-09) |
| `compatibility_flags: ["nodejs_compat"]` | **未着地** | `infrastructure-spec` §2 の確定事項だが ADR に言及なし (R-10 に含む) |

### 3.2 C1 (提供者 1 名 + AI 運用)

| 観点 | 判定 | 根拠 |
|---|---|---|
| package 数を 5 に抑制 | **適合** | 案 (c) を qa-020「過剰な層分割は C1 に反する」で棄却した判断は妥当 |
| duplicate detector を決定的手法 (名前と参照経路のみ) に限定 | **適合** | requirements-baseline §4.2 A4-2 の「偽陽性調査コストを負わない」意図を §6 が正しく引き継いでいる |
| **常設 staging の運用導線** | **不適合の疑い** | qa-038 が「Worker / Turso DB / R2 バケット / secret を 2 組常時維持すると運用導線が二重化し **C1・C2 と衝突する**」と明示的に否定した構成を、ADR §4 が採用している (R-01) |
| local と CI の乖離防止 (`pnpm verify`) | **不適合** | qa-039【2】が「PR の required status checks と同一のコマンドを pnpm script として local からも実行可能にする」と確定済み。`package.json` は P02 の write scope でありながら未実装 (R-18) |

### 3.3 C2 (費用ゼロ)

| 観点 | 判定 | 根拠 |
|---|---|---|
| 既存保有ドメイン流用・Cloudflare 標準機能・Better Stack Free | **適合** | §4・§7。いずれも追加費用ゼロの選択 |
| 無料枠の二重消費 | **不適合の疑い** | 同上 (R-01)。Turso Free 100 DB 枠内なので「費用は 0 円」という qa-034 の説明は成立するが、後発の qa-038 は費用面ではなく**無料枠消費と運用導線**を理由に否定している |
| 外部 free tier への SLO 依存 | **未評価 (リスク)** | §7 は SLO ダッシュボードを外形監視サービスの可用性レポートに全面依存させる。`/health` は Turso と R2 の疎通も検査する (`infrastructure-spec` §9) ため、SLO 99.5% の計測対象に第三者 free tier の可用性が全量乗る構造。ADR はこのリスクを扱っていない (R-26) |

---

## 4. 共通層の境界検証 (P03 の Required responsibility)

> 本節は正本タスク仕様 "Current phase closure — Required responsibility: 共通層の単一 owner、package 公開 contract、ドメイン固有ロジックを基盤へ集約しない境界を独立レビューする" に対応する。

### 4.1 単一 owner の検証

| 検証項目 | 結果 |
|---|---|
| `shared-layers` §1〜§3 の登録層が漏れなく配置先へ割り当てられているか | **充足**。ADR §3 の 17 行が requirements-baseline §8.1〜§8.3 の全登録層を被覆している。owner はすべて feat-hub-foundation で単一 |
| owner が複数 feature に分裂している層はないか | **なし**。`packages/db` (境界=本 feature / スキーマ実体=feat-domain-model-db) は責務分割であって owner 分裂ではない |
| **package 化する層と `apps/hub` 内に置く層の振り分け基準** | **未記載 (重大)**。5 層 (`ui`/`schemas`/`inspection`/`estimation`/`db`) が package、6 層 (auth adapter / audit / telemetry / aijob / notification / pii) が `apps/hub/src/shared/` 配下。この振り分けの判断根拠が ADR のどこにも書かれていない (R-06) |

### 4.2 package 公開 contract の検証

| 検証項目 | 結果 |
|---|---|
| package 名・`exports` フィールド・import path の規約 | **未確定 (重大)**。ADR §2.4 はディレクトリ名のみを確定し、npm package name を定めていない。一方 `package.json` の `check:bundle` は `@harness-hub/hub` を前提としており、**ADR に根拠のない命名が既に実装ファイルへ入り込んでいる**。A4-2 の検出単位 2「consumer が package 名 (workspace 参照) ではなく相対 path・deep import で参照している」は、package 名の規約が確定していなければ判定基準を持てない (R-15) |
| 公開 contract の粒度 | **宣言止まり**。§3 は「公開 contract を実装」と繰り返すが、どの関数/型が public API かの定義は none。A4-1 は「その public API を参照する consumer を 2 系統以上」と規定しており、public API の外延が未定義のままでは P04 が contract test を設計できない |
| `apps/hub/src/shared/` 配下 6 層への A4-2 適用可能性 | **構造的に不能**。同一 package 内の参照は必ず相対 path になるため、検出単位 2 (境界迂回参照) が空振りする。登録共通層 17 のうち 6 層 (35%) で detector の検出手段が半分失われる (R-06) |

### 4.3 ドメイン固有ロジックを基盤へ集約していないか (境界侵食の検証)

`shared-layers` 前文は「認証 policy、DB schema、publish 判定、**試算式**などのドメイン固有ロジックは担当 feature が同じ共通境界へ提供し、`feat-hub-foundation` に業務ロジックを集約しない」と 4 つを名指ししている。1 件ずつ照合した。

| ドメイン固有ロジック | ADR の境界宣言 | 判定 |
|---|---|---|
| 認証 policy | §3「認可 MW: 境界と deny-by-default 既定を実装。**テナント固有 policy は feat-auth-tenancy**」「auth adapter: adapter 境界を実装。**OIDC provider 設定は feat-auth-tenancy**」 | **侵食なし**。境界が明示されている |
| DB schema | §3「repository 層: **境界のみ**。スキーマ実体は feat-domain-model-db」・§9 スコープ外 | **侵食なし** |
| publish 判定 | §3「検査 pipeline: 公開 contract を実装。**判定ルール実体は feat-publish-pipeline**」 | **侵食なし** |
| **試算式** | §3「試算エンジン: 公開 contract を実装。**係数はテナント設定**」 | **未解消 (重大)**。ADR が切り分けたのは「係数」だけで、**削減時間・削減額の算出ロジック本体 (=試算式) の owner が宣言されていない**。qa-066 は上流未解決事項として「feat-metrics-tracking の **estimation engine owner** を **P02/follow-up で解消する**」と名指しで P02 に解消を指示しているが、ADR はこれに応答していない (R-04) |

追加で確認した潜在的侵食:

| 対象 | 判定 |
|---|---|
| PII ガード (§3「実装する」) | **要注意**。「どの属性が要保護か」(salary 等) の定義はドメイン知識。ADR は機構と対象定義を切り分けていない。`infrastructure-spec` §2 に `SALARY_ENC_KEY` があり、実体は feat-user-org-admin 側の関心事 |
| 監査 event logger (§3「実装する」) | **要注意**。監査対象イベントの種類定義は消費 feature 側の関心事。切り分け記述なし |
| 通知ディスパッチ・AI キュー・telemetry | **侵食なし**。「公開 contract を実装」「境界を実装」で統一されている |

---

## 5. 過剰設計の検証 (shared-layers §5 原則との照合)

### 5.1 閾値の誤適用

`docs/shared-layers.md` には**互いに異なる 2 つの閾値**が書かれている。

- 前文 (行 10): 「共通化するのは **2 つ以上の feature が使う**ものだけ」
- §5 (行 88): 「共通層に**第 3 の利用者が現れたときに初めて共通化**する (2 回目までは重複を許す) — 早すぎる抽象化の禁止」

ADR §2.2 は「すべての package が既に **2 feature 以上**の消費者を持つため、**shared-layers §5 の閾値**を満たしている」と書いており、**§5 を引用しながら前文の閾値を適用している**。§5 の基準 (消費者 3) で再計算すると結論が変わる package がある。

### 5.2 package ごとの再計算 (§5 基準 = 消費者 3 以上)

| package | ADR §2.3 の主張 | 独立再計算 (実在 + 計画済み consumer) | §5 基準での判定 |
|---|---|---|---|
| `packages/ui` | 全 Studio 画面 feature | docs-cms / hearing-intake / metrics-tracking / build-pipeline-board / user-org-admin / dual-catalog-web ほか多数 | **充足 (余裕あり)** |
| `packages/schemas` | 3 feature | feat-domain-model-db / feat-auth-tenancy / feat-publisher-plugin + Hub API 本体 | **充足** |
| `packages/inspection` | 2 feature | feat-publish-pipeline / feat-publisher-plugin + **CI の secret scan** (qa-038【2】が「publish pipeline と同一の検査ロジック共有パッケージを CI からも呼ぶ」と確定) | **充足**。ただし ADR はこの第 3 の利用者を認識していない (R-07) |
| `packages/estimation` | 2 feature | feat-metrics-tracking / feat-hearing-intake | **境界線上 (消費者 2)**。qa-066 が owner 未解決と名指ししている層でもあり、切り出し自体は妥当だが根拠を「2 以上」ではなく **B3/SEC5 (クライアント申告値を信じない = サーバ側単一実装が必須)** に置き換えるべき |
| `packages/db` | feat-domain-model-db + Hub 側 repository 利用 | feat-domain-model-db 1 feature + apps/hub。**他の消費 feature は repository 層を直接使わず API 経由** | **不充足**。ADR §2.3 の「すべての package が既に 2 feature 以上の消費者を持つ」は `packages/db` について**不正確** (R-13) |

### 5.3 過剰設計の総合判定

| 結論 | 内容 |
|---|---|
| **案 (b) 5 package 構成そのものは過剰設計ではない** | `ui` / `schemas` / `inspection` は §5 基準でも充足。`estimation` は根拠の置き換えで正当化可能。案 (c) の棄却も妥当 |
| **`packages/db` のみ正当化が成立していない** | 消費者 1 feature。加えて requirements-baseline §9.2 の P05 実装対象列挙 (`ui`/`schemas`/`inspection`/`estimation`) に `packages/db` は**含まれない**ため、P05 完了時点で**空の workspace member** になる。一方 repository 層は §8.2 の登録共通層であり A4-1 の「consumer 2 系統以上の contract test」対象。空 package のまま A4 をどう判定するかの経路が未設計 (R-14)。<br>ただし D2 ヘッジ (Turso→D1 退避のための接続層隔離、qa-017/qa-019(6)) は package 境界を要求する正当な根拠であり、**削除ではなく根拠の書き直しと A4 判定経路の設計**で解決すべき |
| **逆方向 (過小分割) の指摘** | `apps/hub/src/shared/` の 6 層は package 化されておらず、A4-2 の検出手段を構造的に失っている (R-06)。過剰設計より**こちらのほうが実害が大きい** |

---

## 6. acceptance 4 件・quality_constraints 9 件の落とし込み網羅性

### 6.1 acceptance (4 件)

| # | acceptance | ADR の対応箇所 | 落とし込み判定 |
|---|---|---|---|
| A1 | CI が test→deploy を完走する | §6 ゲート順序「静的検査 → build → test → bundle → deploy」 | **不充足**。A1 の合否判定条件「**単一 workflow run 内**で test job → deploy job」に対し、正本 (`infrastructure-spec` §7) は `ci.yml` と `deploy.yml` の **2 workflow = 2 run** 構成。ADR はこの矛盾を検出せず、単一パイプライン前提で記述している (R-02) |
| A2 | Worker bundle 3MiB 以内 + CI に予算チェック | §4 bundle 予算・§6 bundle 予算ゲート | **充足**。gzip 後・非ゼロ終了・実測値要求まで判定条件と一致 |
| A3 | SLO 99.5% の計測と /health が稼働 | §7 全体 | **部分充足**。/health の配置と外形監視は充足。SLO 算定式が正本と不一致 (R-11)、応答性 SLI 欠落、restore drill 未着地 (R-08) |
| A4 | 共通層が単一 package/境界に実装され、消費 feature が同じ実装を参照 | §3 割当表・§6 の contract test / duplicate detector | **部分充足**。割当は網羅的。ただし (a) public API の定義なし、(b) `apps/hub` 内 6 層で detector 検出単位 2 が無効、(c) §6 の inspection contract test は Publisher 不在で実行不能 (R-06・R-07・R-15) |

### 6.2 quality_constraints (9 件)

| id | ADR の対応箇所 | 判定 |
|---|---|---|
| `C2-zero-cost` | §4 既存ドメイン流用・§7「追加費用なし」 | **条件付き** (R-01) |
| `C1-solo-ops` | §2.1/§2.2 の package 数抑制・§6 detector の決定的手法 | **条件付き** (R-01・R-18) |
| `worker-bundle-budget` | §4・§6 | **充足** |
| `pnpm-only-no-npm` | D-P02-4・§6 | **充足** (強制機構に指摘 R-20) |
| `slo-error-budget` | §7 | **条件付き** (R-11・R-12) |
| `cwv-good` | **なし** | **欠落**。9 件中この 1 件のみ、ADR 本文に対応記述が一切存在しない (R-05) |
| `wrangler-deploy` | §4 | **条件付き**。「Hub と WebApp 出口で同一ツール系統」の後半が未言及 (R-27) |
| `github-actions-ci` | §6 | **条件付き**。確定済み required status checks 8 項目中 6 項目が欠落 (R-03) |
| `shared-layers-single-implementation-owner` | §3・§6 | **条件付き** (R-04・R-06・R-07) |

**集計: 充足 2 / 条件付き 6 / 欠落 1**

---

## 7. 指摘事項一覧

重大度: **重大 (Blocker)** = P04 着手前に是正必須 / **高** = P04 と並行して是正 / **中** = 該当 phase で是正 / **低** = 記録のみで可。

### 7.1 重大 (Blocker) — 5 件

| ID | 指摘 | 該当箇所 | 是正要否 | 是正先 phase |
|---|---|---|---|---|
| **R-01** | **環境戦略が後発の確定仕様と矛盾したまま採用されている。** ADR §4 は「production + staging の 2 環境 (qa-034)」を採るが、`qa_log` 上でより後に確定した **qa-038【3】は「preview は使い捨て (PR close で破棄)。常設 staging は持たない。理由: Worker / Turso DB / R2 バケット / secret を 2 組常時維持すると無料枠消費と運用導線が二重化し、C1・C2 と衝突するため」**と明示的に否定している。qa-034 の整合性確認リストに qa-038 は含まれない (qa-038 は当時未確定)。ADR は後発仕様を参照しておらず、矛盾の存在自体を検出していない。qa-038【5】も「deploy 前に CI が drizzle migrate を **production Turso** へ自動適用」で staging 経由を採らない | ADR §4・§7 / requirements-baseline §7 | **要** | **P02 で調停記録を作成** + qa-034 と qa-038 のどちらを正とするかを **system-spec へ差し戻して再確定** (`docs/infrastructure-spec.md` §6/§7/§12 の更新を伴う) |
| **R-02** | **A1 の合否判定条件が正本 CI/CD 構成では構造的に満たせない。** requirements-baseline §4.2 は「GitHub Actions の**単一 workflow run 内**で test job → deploy job の順に success 終了」と固定。しかし `infrastructure-spec` §7 は `ci.yml` (PR/main push) と `deploy.yml` (main merge, ci green 後) の 2 workflow に分離しており、別 run になるため A1 は永久に pass しない。ADR §6 は「deploy は全ゲート通過後にのみ実行する (A1 の "test→deploy 完走" の定義)」と単一パイプライン前提で書き、この不整合を扱っていない | ADR §6 末尾・§3 (デプロイ行) | **要** | **P02**。①`ci.yml` に deploy job を統合する / ②A1 判定条件を「同一 commit に対する連鎖 run」へ緩和する、のいずれかを選択。②を採る場合は **P01 の A1 判定条件も同時に改訂**が必要 |
| **R-03** | **確定済み required status checks の 6 項目が CI ゲート設計から欠落。** qa-038【2】は PR の必須 CI を 8 項目 (pnpm 強制 / lint・format / typecheck / unit・integration test / bundle 予算 / **secret scan** / **テナント分離テスト** / **migration 破壊的 DDL 検査** / **OpenAPI・zod drift 検査**) と確定。ADR §6 の表は 6 行で、**lint・format / typecheck / secret scan / 破壊的 DDL 検査 / OpenAPI drift 検査**が欠落。根本原因は ADR が `shared-layers` §3 (5 ゲート) のみを写経し、qa-038 を参照していないこと。CI 品質ゲートの owner は本 feature であり、欠落は他 feature が補えない | ADR §6 | **要** | **P02** (+ `docs/shared-layers.md` §3 の登録簿更新)。OpenAPI drift 検査は `packages/schemas` の、secret scan は `packages/inspection` の公開 contract に直結するため境界設計にも影響する |
| **R-04** | **qa-066 が P02 に名指しで解消を求めた「estimation engine owner」が未解消。** qa-066 は「上流未解決は派生 baseline 側で保持し、特に … **feat-metrics-tracking の estimation engine owner** を **P02/follow-up で解消する**」と確定している。ADR §3 は「試算エンジン: 公開 contract を実装。係数はテナント設定」と書くのみで、**試算式 (削減時間・削減額の算出ロジック) 本体の owner** を宣言していない。`shared-layers` 前文が「試算式」を**ドメイン固有ロジックとして名指し**しているため、宣言不在は基盤への業務ロジック集約リスクを未管理のまま残す | ADR §3 (試算エンジン行)・§2.3 | **要** | **P02**。`packages/estimation` は「計算の骨格 (単位換算・丸め・検証)」を持ち、業務的な算出定義は consumer feature が提供する、といった責務分界を明文化する |
| **R-05** | **quality_constraint `cwv-good` が設計に一切落ちていない。** qa-018(2) は Core Web Vitals 全指標 good を「bundle 予算管理・**R2/edge 配信**・**不要 JS 削減**」の 3 手段で達成すると確定。ADR には CWV / LCP / INP / CLS の語が一度も現れず、R2/edge 配信 (`infrastructure-spec` §2 の `ASSETS` binding) の設計もなく、**計測・検証経路が存在しない**。bundle 予算は代理指標にすぎず good 判定の根拠にならない | ADR §5 (Frontend 行)・§6 | **要** | **P02** で計測手段と配信設計を確定 → **P04** が test ID 化。C2 制約下では Lighthouse CI を PR 単位ではなく main 反映後の定期計測に置く等の設計判断が要る |

### 7.2 高 — 4 件

| ID | 指摘 | 該当箇所 | 是正要否 | 是正先 phase |
|---|---|---|---|---|
| **R-06** | **package 化する 5 層と `apps/hub/src/shared/` に置く 6 層の振り分け基準が不記載。** かつ後者では A4-2 の検出単位 2「境界迂回参照 (package 名でなく相対 path)」が同一 package 内参照のため構造的に適用不能。登録共通層 17 のうち 6 層で detector の検出手段が半減する。requirements-baseline §9.2 は「audit・AiJob・Notification・PII 共通 adapter の公開 contract 実体」を単一 owner 実装対象に挙げており、境界の弱さは A4 判定の実効性に直結 | ADR §3 | **要** | **P02**。振り分け基準 (例: 「Worker 外部 = Publisher / CI から参照される可能性があるものは package 化」) を明文化し、基準に照らして 6 層の配置を再判定する |
| **R-07** | **§6 の「検査 pipeline 挙動同値」ゲートが P06 時点で実行不能。** 「Hub と Publisher が同一 `packages/inspection` を参照することの contract test」とあるが、Publisher (feat-publisher-plugin) は未実装で `pnpm-workspace.yaml` の member でもない。A4-1 の「実在する consumer のみを対象にする」規則により、このゲートは pass も fail も判定できない。**解は既に上流にある**: qa-038【2】が「secret scan は publish pipeline と同一の検査ロジック共有パッケージを **CI からも呼ぶ**」と確定しており、CI が実在する第 2 consumer になれる。ADR はこの経路を認識していない | ADR §6 (検査 pipeline 挙動同値行) | **要** | **P02** で consumer 構成を確定 → **P04** が test ID 化 |
| **R-08** | **バックアップが実装物から文書へ格下げされている。** ADR §3 は「バックアップ → 運用手順 (P12)。手順のみ」。しかし正本 `infrastructure-spec` §7 は `backup.yml` (GitHub Actions cron workflow)、§10 は RPO≤24h / RTO≤4h / 四半期 restore drill を確定。qa-019(5) は「復元できないバックアップを成功と数えない」と明記。requirements-baseline §9.5「P12/P13 は不足している実装・証跡を文書や計画で代替できない」に抵触する。かつ `backup.yml` の実装 owner がどの feature にも割り当たっていない (**孤児**) | ADR §3 (バックアップ行)・§7 | **要** | **P02** で owner を宣言 (本 feature が持つ / 別 feature へ委譲 / scope 外として dev-graph へ起票、のいずれか)。scope_in 6 件に backup が含まれないため、**scope 拡張か新規 feature 起票かの判断は上位へのエスカレーションを伴う** |
| **R-09** | **Workers scheduled handler (cron) が deploy unit 設計に不在。** `infrastructure-spec` §5 は同一 Worker に cron 2 系統 (日次 `0 15 * * *` / 週次 `0 0 * * 1`) の scheduled handler を確定し、cron heartbeat による失敗検知 (qa-027) も含む。`@opennextjs/cloudflare` は fetch handler を出力するため、scheduled を同居させるには custom entry で包む設計判断が必要。ADR §4 の deploy unit 定義は「UI + API」のみ。shared-layers §2 の「実行ログ ingest + rollup (Workers cron)」の実行主体も未定義 | ADR §4・§7 | **要** | **P02** で deploy unit 定義に scheduled handler を追加 → **P05** が実装。監視面では cron heartbeat を §7 の監視構成へ追加 |

### 7.3 中 — 11 件

| ID | 指摘 | 該当箇所 | 是正要否 | 是正先 phase |
|---|---|---|---|---|
| **R-10** | `wrangler.jsonc` の実装 owner を本 feature としながら、内容正本である `docs/infrastructure-spec.md` §2 (binding 台帳 5 件・secret 台帳 5 件・`nodejs_compat`・Worker 命名・CPU 予算) を参照していない。**二重正本 (同じことを 2 箇所が別々に定義してしまう状態) のリスク**。qa-003 の「R2 native binding」も ADR 未言及 | ADR §3 (デプロイ行)・§4 | 要 | P02 (参照関係の明記) |
| **R-11** | SLO 算定式が正本と不一致。ADR §7「外形監視サービスの可用性レポートを正とする」 vs `infrastructure-spec` §9「外形監視の downtime **+ Workers analytics の 5xx 率**で算定」。5xx を落とすと、応答は返るが機能不全という障害が SLO に反映されない | ADR §7 | 要 | P02 |
| **R-12** | エラーバジェットのアラート閾値と凍結閾値が同一 (§7「0.5% 消費でアラート → 変更凍結」)。正本は「消費 100% で凍結」であり、**早期警告の段が存在しない**。SRE 上流指針 (qa-019) の意図に対して運用上の実効性が乏しい | ADR §7 | 要 | P02 |
| **R-13** | `shared-layers` §5 の閾値誤適用。§5 は「第 3 の利用者が現れたときに初めて共通化」だが ADR §2.2 は「2 feature 以上」で §5 充足を主張。§5 基準では `packages/db` が不充足 (本文書 §5.2) | ADR §2.2・§2.3 | 要 | P02 (根拠の書き直し。構成変更は不要) |
| **R-14** | `packages/db` が requirements-baseline §9.2 の P05 実装対象列挙に含まれず、P05 完了時点で空 workspace member になる。一方 repository 層は §8.2 の登録共通層であり A4-1 の「consumer 2 系統以上の contract test」対象。空 package での A4 判定経路が未設計 | ADR §2.4・§3 | 要 | P02 (判定経路の設計) → P04 |
| **R-15** | package 命名・`exports`・import path の公開 contract 規約が未確定。`package.json` は ADR に根拠のない `@harness-hub/hub` を既に使用。A4-2 の検出単位 2 は package 名規約がないと判定基準を持てない | ADR §2.4・§3 | 要 | P02 |
| **R-16** | migration の実行主体が未割当。qa-038【5】は「deploy 前に CI が drizzle migrate を自動適用」+「expand/contract 3 段階強制」を確定。ADR は `packages/db` を「境界のみ」とし、migration 実行・破壊的 DDL 検査の責務をどこにも置いていない | ADR §3・§5 (Data 行)・§6 | 要 | P02 (owner 宣言。実体が feat-domain-model-db なら明示委譲) |
| **R-17** | rate limiting (SEC8) の数値が正本で明示的に「数値は feature P02」へ委譲されている (`infrastructure-spec` §2) が、ADR は rate limiting に一切言及なし。認可ミドルウェア前段のアプリ層制限は本 feature の境界内 | ADR §5 (Security 行) | 要 | P02 (本 feature で確定するか feat-auth-tenancy へ明示委譲するかを宣言) |
| **R-18** | qa-039【2】が確定した「CI の required status checks と同一コマンドの local 実行 (`pnpm verify`)」が root `package.json` に未実装。`package.json` は P02 の write scope | package.json | 要 | P02 |
| **R-19** | 認可 MW の **deny-by-default 強制メカニズム**が未設計。ADR §5 は「`apps/hub/src/middleware/` の単一層に閉じ、ここ以外に認可判定を書かない」と規約を述べるのみ。Next.js middleware は `matcher` 設定依存で、matcher 漏れの route handler は MW を経由しない。A4-2 detector は名前と参照経路しか見ないため MW 未経由 route を検出できず、§6 の Tenant 分離テストもテストを書いた route しかカバーしない (**fail-open**)。qa-020 の「認可判定を単一ミドルウェア層に集約する (散在させない)」を機械的に担保する手段が必要 | ADR §5 (Security 行)・D-P02-5 | 要 | P02 (強制手段の設計。例: 全 route handler を通す wrapper factory + 未 wrap 検出の静的検査) → P04 |
| **R-20** | pnpm 強制の機構が正本と異なる。正本 3 箇所 (qa-003 desktop / qa-038【2】/ qa-039【1】) は **corepack** を強制機構と確定。ADR も `package.json` も corepack に言及せず、`preinstall: npx --yes only-allow pnpm` を採用。`npx` は npm 由来のコマンドで、毎 install 時にネットワーク取得を伴う | ADR §6・package.json | 要 | P02 (corepack を正とし `only-allow` は補助と位置づける等) → P05 |

### 7.4 低 — 7 件

| ID | 指摘 | 是正要否 | 是正先 phase |
|---|---|---|---|
| **R-21** | pnpm 10 は依存パッケージの lifecycle script を既定でブロックするため、`pnpm-workspace.yaml` に `onlyBuiltDependencies` の明示が必要になる可能性が高い (esbuild / sharp 等)。未規定のまま P05 に入ると build が通らない可能性 | 要 (実装時) | P05 |
| **R-22** | §6 の pnpm 混入検査が `package-lock.json` / `npm-shrinkwrap.json` のみを対象とし、`yarn.lock` / `bun.lockb` を見ていない。qa-039 は「他パッケージマネージャ禁止」 | 要 | P05 |
| **R-23** | `package.json` の `engines.npm: "please-use-pnpm"` は `engine-strict` 設定なしでは効力を持たない (意図表明として残すのは可) | 否 (記録のみ) | — |
| **R-24** | `plugins/publisher/` の予約先が、本リポジトリ既存の**開発用 Claude Code plugin 群** (`plugins/` 配下に company-master / dev-graph / system-dev-planner 等 22 個) と名前空間衝突する。かつ `pnpm-workspace.yaml` に未登録のため、Publisher が `packages/inspection` を workspace 参照する経路が存在しない (R-07 と連動) | 要 | P02 |
| **R-25** | 正本タスク仕様の目的節が挙げる member 集合 (`ui, schemas, inspection, db`) と ADR の 5 package (`estimation` 追加) が不一致。ADR は Normative implementation closure を優先しており**判断は妥当**だが、調停の記録が §2.3 の脚注 1 行のみ | 要 (記録の明示化) | P02 |
| **R-26** | `/health` が Turso と R2 の疎通を検査する (`infrastructure-spec` §9、失敗時 503) ため、SLO 99.5% の計測対象に第三者 free tier の可用性が全量乗る。ADR §7 はこのリスクを扱っていない | 否 (リスク記録) | P02/P12 |
| **R-27** | quality_constraint `wrangler-deploy` の「Hub と **WebApp 出口**で同一ツール系統」の後半が ADR 未言及。I5 (作者 local session の wrangler 実行) は本 feature の scope 外の可能性が高いが、明示がない | 要 (scope 外なら明記) | P02 |

### 7.5 集計

| 重大度 | 件数 | 是正要 |
|---|---|---|
| 重大 (Blocker) | 5 | 5 |
| 高 | 4 | 4 |
| 中 | 11 | 11 |
| 低 | 7 | 5 |
| **合計** | **27** | **25** |

---

## 8. 積極的に妥当と判断した点 (追認ではなく検証の結果)

差し戻し判定だが、以下は独立検証の結果として**妥当**と確認した。P02 再実行時に維持すべき。

1. **案 (b) の採用判断と (a)(c) の棄却理由**。特に「(a) では A4-2 duplicate detector が判定不能になる」という論証は、requirements-baseline §4.2 A4-2 が「owner package 外の同名 export」を検出単位としていることから正しい。案 (a) への回帰は A4 を検証不能にするため誤り。
2. **detector を確率的手法 (AST 類似度・コードクローン検出) から明示的に除外**し、名前と参照経路のみの決定的判定に限定した設計。C1 (偽陽性の調査コストを個人運用が負えない) と正しく接続している。
3. **axe を「部品単体 + 画面結合」の 2 段に分けた設計**。`shared-layers` §1 の戦略と一致し、共通部品側で違反を潰す方針が機械強制されている。
4. **bundle 予算を `packages/*` 側の依存制約にまで下ろした点** (§4 末尾)。3MiB という結果指標を、package 設計時の入力制約へ変換できている。
5. **ドメイン固有ロジック 4 件のうち 3 件 (認証 policy / DB schema / publish 判定) の境界宣言**。§3 の「〜は consumer」「実体は feat-XXX」という書式が一貫している。
6. **digest の一致**。`features/feat-hub-foundation.context.json` の実測 sha256 = `938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d` は ADR / requirements-baseline / 正本タスク仕様の `feature_context_digest` と一致。世代ずれはない。

---

## 9. レビュー観点の網羅性の限界 (何を見ていないか)

本レビューの結論は以下の範囲でのみ有効である。**これらは「問題がない」ことを意味しない**。

### 9.1 原理的に検証していないもの

| # | 未検証事項 | 理由 |
|---|---|---|
| L-1 | **実装コードの検証** | `apps/` `packages/` は未作成 (P05 スコープ)。本レビューは文書と `pnpm-workspace.yaml` / `package.json` の 2 ファイルのみを対象とした |
| L-2 | **bundle 3MiB の実現可能性** | Next.js App Router + `@opennextjs/cloudflare` + `packages/ui` (チャート/Markdown エディタ含む) が実測で 3MiB に収まるかは未検証。ADR §4 の設計制約が十分かは P06 の実測でしか判定できない |
| L-3 | **Better Stack Free のデータ保持期間** | 月次可用性 99.5% の算定に必要な時系列が Free プランの保持期間で足りるかを公式ドキュメントで確認していない。A3 の証跡取得可能性に直結するリスク |
| L-4 | **`@opennextjs/cloudflare` の現行バージョン挙動** | scheduled handler の同居可否 (R-09)、Next.js middleware のサポート範囲 (R-19)、nodejs_compat 要件を公式ドキュメントで一次確認していない。いずれも「設計上の論点として未処理」であることのみを指摘しており、技術的可否そのものは判定していない |
| L-5 | **pnpm 10.9.0 の lifecycle script 挙動** | R-21 は一般的な pnpm 10 の既定動作に基づく推定であり、当該バージョンでの実挙動は未確認 |

### 9.2 意図的にレビュー対象から外したもの

| # | 対象外 | 理由 |
|---|---|---|
| L-6 | **P04 以降の成果物** | 正本タスク仕様 "Dependency rule: this phase consumes only earlier P01..P02 outputs; later phase documentation or evidence is never an entry prerequisite"。レビュー実施中に `docs/features/feat-hub-foundation/test-design.md` が同ディレクトリに出現したが、依存規則により**参照していない**。同ファイルが本文書の指摘 (特に R-02 / R-05 / R-07) と整合するかは別途確認が必要 |
| L-7 | **P01 要件ベースラインそのものの妥当性** | P01 は確定済み (`status: confirmed`) で本 phase の対象外。ただし R-02 の是正には P01 の A1 判定条件改訂が必要になる可能性があり、その場合は上位へのエスカレーションを伴う |
| L-8 | **他 feature の P02 設計との整合** | feat-domain-model-db / feat-auth-tenancy / feat-publish-pipeline 等の設計文書との相互整合は本 phase の scope 外。共通層の consumer 側から見た contract の妥当性は未検証 |
| L-9 | **上流 system-spec の内部整合性の全数点検** | qa_log 66 件のうち、本 feature に関係する 12 件 (qa-003/006/007/009/010/011/017/018/019/020/034/038/039/066) のみを精読した。R-01 のような qa 間矛盾が他にも存在する可能性は排除できていない |

### 9.3 レビュー手法上の限界

- **単一レビュアによる文書照合**であり、実行可能な検証 (ビルド・デプロイ・計測) は一切行っていない。
- 指摘の多くは「上流確定仕様への未接地」であり、**上流仕様自体が誤っている可能性**は検証範囲外。特に R-01 は上流 (qa-034 と qa-038) の矛盾であって、P02 単独では解消できない。
- **指摘 0 件ではない**が、逆に「見落としが 0 件である」ことも保証しない。

---

## 10. 差し戻し後の推奨手順

1. **R-01 を最優先で上位へエスカレーション**。qa-034 (staging 2 環境) と qa-038 (preview + production、常設 staging なし) のどちらを正とするかをユーザー判断で確定する。ここが決まらないと §4・§6・§7 と `docs/infrastructure-spec.md` §6/§7/§12 が確定できない。
2. **R-02 の選択肢をユーザーへ提示**。`ci.yml` への deploy job 統合 (A1 をそのまま維持) か、A1 判定条件の緩和 (P01 改訂を伴う) か。
3. R-03 / R-04 / R-05 は P02 内で完結する。`docs/shared-layers.md` §3 の登録簿更新 (R-03) を伴う。
4. 高・中の指摘を ADR へ反映し、P03 を再実行して再レビューする。
5. 承認後に P04 (test-first design) へ引き継ぐ。

---

## 11. 参照元と検証

- **レビュー対象**: `docs/features/feat-hub-foundation/architecture-decision-record.md` (P02)
- **照合した上流**:
  - `docs/features/feat-hub-foundation/requirements-baseline.md` (P01)
  - `docs/shared-layers.md` §1〜§5 / `docs/system-design-overview.md` §1〜§3
  - `docs/infrastructure-spec.md` §2/§5/§6/§7/§9/§10/§11/§12/§13 (qa-034 の詳細正本)
  - `system-spec/spec-state.json` の qa_log: qa-003, qa-006, qa-007, qa-009, qa-010, qa-011, qa-017, qa-018, qa-019, qa-020, qa-034, qa-038, qa-039, qa-066
  - `architecture/harness-hub-infrastructure.md`, `architecture/harness-hub-dev-workflow.md` (参照型 wrapper)
  - `pnpm-workspace.yaml`, `package.json` (P02 が確定した実ファイル)
- **正本タスク仕様**: `.dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502/task-specs/phase-03-design-review.md`
- **digest 検証**: `shasum -a 256 features/feat-hub-foundation.context.json` → `938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d` (ADR / baseline / task spec の宣言値と一致)
- **検証コマンド**: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-hub-foundation`（世代非依存形式。current pointer から現行世代を解決する。`--staging .` は repository root から解決できないため使わない。contract §2.3）
- **P03 acceptance との対応**: 「design-review-notes.md に承認可否 (承認 / 差し戻し) と、qa-003/qa-019/qa-007/qa-018 それぞれへの適合確認結果が明記されていること」→ §1 (差し戻し) および §2.1〜§2.4 (4 件を 1 件ずつ) で充足。
- **Rollback trigger 発動**: 本文書の判定により `sys-hub-foundation-p02` を再実行対象として dev-graph へ差し戻す。
