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
parent_doc: docs/features/feat-hub-foundation/design-review-notes.md
architecture_refs: [arch-harness-hub-infrastructure, arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security, arch-harness-hub-dev-workflow]
---

# feat-hub-foundation 独立設計レビュー — 指摘・妥当性記録 (P03)

> 親文書: [design-review-notes.md](design-review-notes.md)。P03 の指摘事項一覧と、独立検証で妥当と確認した点の詳細正本。

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
