---
status: draft
layer: system-wide-design
sources: [system-spec/backend.md, system-spec/security.md, system-spec/database.md, system-spec/infrastructure.md, system-spec/ui-ux.md]
---

# 共通化設計 (段階 0 / 横串) — 二重実装を防ぐ層

> 複数 feature が使うものはここに登録し、実装 owner を **feat-hub-foundation** (基盤) に一元化する。各 feature の P02 設計は共通層を「使う」設計に徹し、共通層そのものを再発明しない。
> 過剰な層分割は C1 (個人開発の認知負荷) に反するため採らない (qa-020) — **共通化するのは「2 つ以上の feature が使う」ものだけ**。
> ここでいう owner は、共通 package の境界・公開 contract・横断品質ゲートを一元管理する責任を指す。認証 policy、DB schema、publish 判定、試算式などのドメイン固有ロジックは担当 feature が同じ共通境界へ提供し、`feat-hub-foundation` に業務ロジックを集約しない。

## 1. 共通 UI (design system)

| 共通部品 | 一括担保するもの | 消費する feature | 根拠 |
|---|---|---|---|
| design tokens (色・余白・タイポ) | コントラスト比 4.5:1 以上を token 段階で保証 | 全画面 | qa-018 |
| フォーム部品 (input / select / button) | キーボード操作・フォーカス管理・ラベル/代替テキスト | S01 公開、S04, S05, S07, S10 | qa-018 |
| テーブル / 一覧部品 | ソート・スクリーンリーダー対応・レイアウトシフト防止 | S01, S04, S06, S11, S14, S15, S17 | qa-018 |
| 進捗・状態表示部品 | PublishRequest / AiJob 等のポーリング表示・スケルトン (CLS 抑制) | S01, S03, S05, S10-S12 | qa-018 |
| 確認ダイアログ | 破壊的操作の確認 + 可逆性明示の統一パターン | S02, S04, S05 | qa-018 |
| 通知・エラー表示 | 平易な日本語 + 次の一手の統一フォーマット (§5.4) | 全画面 | qa-018 |

**戦略**: WCAG 2.2 AA は「全画面の検査項目」ではなく「共通部品の設計制約」として守る。axe 自動チェック (CI) は部品単体 + 画面結合の両方に掛ける。

**Studio mockup 反映の追加部品** (2026-07-17。根拠: mockups/harness-studio-v2-analysis.md §4):

| 共通部品 | 一括担保するもの | 消費する feature |
|---|---|---|
| KPI カード / チャート (折れ線・バー・ドーナツ) | **bundle 3MiB 予算内の軽量実装** (重量チャート lib 不可)・配色のコントラスト | metrics-tracking, hearing-intake, user-org-admin |
| ステップウィザード | 進捗表示・戻る/次へ・キーボード操作 | hearing-intake (S10), publisher-plugin (S01 公開ウィザード) |
| ステージボード (かんばん風) | 工程チップ・риスク表示 | build-pipeline-board |
| Markdown レンダラ + エディタ | **XSS sanitize (SEC7)**・プレビュー | docs-cms, feedback-loop, hearing-intake |
| 状態チップ / スコープチップ / トースト / タブ / インライン編集テーブル | 状態語彙の統一 (下書き/生成中/レビュー待ち/完了 等) | 全 Studio 画面 |
| テーマ・表示密度・言語 (ja/en) | design tokens に組込み (ライト/ダーク/自動) | 全画面 |

**部品の実装順** (構築優先順位の帰結。正本: [system-design-overview.md](system-design-overview.md) §3「構築優先順位」): 基本部品 (フォーム/テーブル/ダイアログ/トースト/状態チップ) とテーマは P0 の共通シェルと同時。ステップウィザードと Markdown レンダラ (閲覧) は P1 (S10 ウィザード・S12 の生成ドキュメント表示)。ステージボードと公開ウィザードは P2。Markdown エディタは P3 (S15 編集)。インライン編集テーブルは P4 (S17)。**KPI カード/チャートは P4 の S16 まで不要** — S12 の試算は数値表示で足り、チャート部品の完成を待たない。S09 (P5) でチャートを完成させる。

## 2. 共通バックエンド層

| 共通層 | 責務 | 隔離する変化 | 根拠 |
|---|---|---|---|
| zod schemas (単一ソース) | API 入出力の検証と型・OpenAPI 生成。Publisher と Hub で共有 | API 契約の散逸 | qa-009, qa-020 |
| 認可ミドルウェア (単一層) | 全 API で Tenant/Workspace スコープ強制 (deny-by-default)。認可判定をここ以外に書かない | 認可漏れ (D4 row-level の実装リスク) | qa-006, qa-020, D4 |
| auth adapter | Auth.js への依存を adapter 境界に閉じる | Better Auth 移行 (D3 caveat) | qa-020, D3 |
| repository 層 (Drizzle) | DB アクセスをここに閉じる | Turso→D1 退避 (D2 ヘッジ) をアプリ層へ波及させない | qa-020, D2 |
| 検査 pipeline (純関数・共有 package) | static validation / secret scan / policy 判定。Publisher (ローカル pre-check) と Hub (正式検査) で同一実装 | 検査の二重実装・判定の食い違い | qa-010, qa-020, C3 |
| 監査 event logger | 全変更操作の append-only 記録。Stage 2 の audit log / export の供給元 | 監査の書き漏れ | I8 |

**Studio mockup 反映の追加共通層** (2026-07-17。詳細: mockups/harness-studio-v2-analysis.md §3/§5):

| 共通層 | 責務 | 根拠 |
|---|---|---|
| 試算エンジン (純関数) | 時給/削減時間/削減額/シート試算の単一実装。係数 (annualHours・分/回・削減率) はテナント設定 | B3, SEC5 (クライアント申告値を信じない) |
| 実行ログ ingest + rollup | 短命 token 認証・冪等キー・サーバ時刻。週次/部門別/ユーザー別の事前集計 (Workers cron) | B2/B3 |
| AI 処理キュー (pull 型) | シート生成・FB 対応・doc 下書きの job queue。Claude Code セッションが pull して処理・書戻し (サーバ側 AI 課金なし = **D5 確定**) | B5/B6 |
| 通知ディスパッチ | アプリ内 + メール (生成完了/レビュー結果/週次)。送信手段は D6 候補 | B8 |
| PII ガード | salary 等の要保護属性: admin 限定表示・API 非公開・監査・export マスク | SEC4 |

## 3. 共通インフラ (CI/CD・運用)

| 共通機構 | 内容 | 根拠 |
|---|---|---|
| CI 品質ゲート | 下記「CI 品質ゲート登録簿 (G1〜G14)」に一覧化。qa-038【2】の required status checks 8 種 (G1〜G8。unit / integration と Tenant 分離は G4 に統合) + 横断品質ゲート (G9・G10・G12・G13・G14) + CWV 定期計測 (G11) を一元管理する | qa-018, qa-020, qa-038, qa-039, D1 |
| デプロイ | wrangler CLI (GitHub Actions)。Hub と WebApp 出口で同一ツール系統 | qa-003, D1 |
| 監視 | /health + Workers logs/analytics + 外部死活監視 + SLO ダッシュボード + エラーバジェットアラート。外形監視と SLO の設定正本は `apps/hub/monitoring/` (config as code。外部適用状態は `application_state` で分離し、設定の存在を稼働と読み替えない = infrastructure-spec §9) | qa-011, qa-019 |
| バックアップ | Turso 日次 export → R2。四半期 restore drill (復元できないバックアップは成功と数えない) | qa-019 |

### CI 品質ゲート登録簿 (G1〜G14)

**設計正本**: [feat-hub-foundation/architecture-decision-record.md](features/feat-hub-foundation/architecture-decision-record.md) §6 / **要件正本**: `system-spec/spec-state.json` の qa-038【2】と `system-spec/dev-workflow.md` / **実装**: `.github/workflows/ci.yml`・`.github/workflows/cwv.yml`。旧登録簿の 5 項目 (pnpm 混入検査 / axe / bundle 予算 / Tenant 分離 / 検査 pipeline 挙動同値) は G1/G4/G5/G9 の 4 ゲートに対応し、G2/G3/G6/G7/G8/G10/G11 が欠落していた (ADR §6 改訂 2 / R-03・R-05、申し送り F-2 の解消)。

| # | ゲート | 一括担保するもの | fail 条件 | 実行段 | 根拠 |
|---|---|---|---|---|---|
| G1 | pnpm 強制 | corepack pin (正本機構) + `packageManager` 検証 + `package-lock.json` / `npm-shrinkwrap.json` / `yarn.lock` / `bun.lockb` の混入検出 | 検出で非ゼロ終了 | 静的ゲート | qa-038【2】, qa-039, A1 |
| G2 | lint / format | リポジトリ規約に沿った静的整形検査 (Biome) | 違反で fail | build & test | qa-038【2】 |
| G3 | typecheck | `pnpm -r typecheck` (TypeScript strict) | 型エラーで fail | build & test | qa-038【2】 |
| G4 | unit / integration / contract test | `pnpm -r test` (Tenant 分離・検査 pipeline 挙動同値・contract を含む)。各 package が独自の Vitest worker pool を持つため、`pnpm-workspace.yaml` の `workspaceConcurrency: 1` で package 間を直列化する。うち Tenant 分離は下記「G4 の名指し部分」で対象実在・ケース無効化を検査したうえで名指し実行する | 失敗で fail | build & test | A1, A4, qa-006, qa-010, qa-038【2】 |
| G5 | bundle 予算 | OpenNext build 出力の gzip 後サイズ ≤ 3 MiB (Worker) | 超過で非ゼロ終了 | build & test | A2, qa-018, qa-038【2】 |
| G6 | secret scan | `packages/inspection` の secret scan を CI からも呼ぶ (publish pipeline と同一実装) | 検出で fail | build & test | A4, SEC, qa-038【2】 |
| G7 | 破壊的 DDL 検査 | drizzle migration の expand/contract 3 段階違反を検出 | 違反で fail | build & test | qa-038【2】【5】 |
| G8 | OpenAPI / zod drift 検査 | `packages/schemas` 生成 OpenAPI と実装の乖離を検出 | 乖離で fail | build & test | qa-009, qa-038【2】 |
| G9 | axe a11y | `packages/ui` 部品単体 + `apps/hub` 画面結合の 2 段 | 違反 1 件以上で fail | build & test | qa-018 |
| G10 | duplicate implementation detector | 登録共通層 (§1〜§2) の owner package 外の同名 export / 境界迂回 import を検出 | 1 件以上で fail | 静的ゲート | A4 |
| G11 | Core Web Vitals 計測 | main 反映後の定期 Lighthouse 計測で LCP ≤ 2.5s / CLS ≤ 0.1 / TBT ≤ 200ms (INP ≤ 200ms の lab 代理指標) を確認 | good を外れたら是正起票 | main 反映後 定期 | qa-018, R-05 |
| G12 | 認証・認可 静的検査 | `apps/hub/scripts/check-auth-gates.mjs` が束ねる 3 検査 — Auth.js 境界隔離 (D3 / T-BND-01・02) / 認可判定の単一集約 + route 例外の厳密一致 (SEC2 / AD-4) / dev 専用 provider の非存在 (I7 / T-BND-03・04) | 1 本でも違反で非ゼロ終了 | 静的ゲート | qa-020, SEC2, D3, I7 |
| G13 | client JS 予算 | `next build` 出力から route ごとの First Load JS (page entry + route 固有 client reference manifest の和集合) を gzip 実測。運用値 126 KiB / route (frontend-spec §8 の上限 250KB の内側) | 超過で非ゼロ終了 | build & test | qa-018, R-05 |
| G14 | OIDC / owner 認可 release contract | `apps/hub` の `test:auth-release-contract` を名指し実行 — Auth.js handler・tenant 別 OIDC start-flow (CSRF form)・`owner` を含む全 action × role 認可表・tenant 分離・本番 OIDC smoke。`owner` を DB role として持たず tenant 境界確認後に資源との関係から合成する契約を、G4 の `pnpm -r test` に含まれるだけの状態から名指しへ引き上げる (test の移動・skip で契約が無言で消えるのを防ぐ) | 1 本でも失敗で fail | build & test | qa-020, SEC2, D3, [infrastructure-spec.md §7](infrastructure-spec.md) |
| G19 | 共通 UI 層の絵文字混入検査 | `scripts/lint-ui-text-emoji.py` が `packages/ui/src` と `apps/hub/src` の UI 文言・callout ラベル・空状態文言への絵文字混入を検出する。同じジョブに detector 実効性ステップを置き、意図的な絵文字 probe が exit 1 ちょうどでなければ落とす | 違反または detector 失効で fail | 静的ゲート | qa-232【5】, qa-233【6】 |

- **G11 を PR 単位に置かない理由**: PR ごとの Lighthouse は GitHub Actions 無料枠 (2,000 分/月) を圧迫し C2 に反するため、main 反映後の定期計測で確保する (ADR §6 R-05)。よって G11 は merge ブロック対象の「8 種」に数えない。
- **G6 の第 2 consumer は CI 自身** (ADR §6 R-07): Publisher が未実装で workspace member でもないため、A4-1「実在 consumer のみ対象」規則により CI を実在 consumer として成立させる。
- **G12 を install 前の静的ゲート段に置く理由** (2026-07-25 追記): 3 検査はいずれも「名前と参照経路」から決定的に判定でき、next-auth のインストール有無にも実行環境にも依存しない。依存インストール前に落とせるため、G1・G10 と同じ段に置く。local 側の同一入口は root の `pnpm check:auth` (ADR §6 R-18)。
- **G5 と G13 を分けている理由** (2026-07-25 追記, qa-018): 両者は名前が似ているが**測る対象が別物**である。G5 は wrangler が Cloudflare へ上げる Worker (サーバー側実行コード) を 3 MiB で測り、G13 はブラウザへ配る client JS を測る。TBT / INP を悪化させるのは後者であり、G5 では原理的に検知できない。実測 (2026-07-24 の本番初回 CWV): `/` の First Load JS が 159 kB へ膨らみ TBT 926ms (予算 200ms) を出したとき、G5 は 0.96 MiB / 3 MiB で緑のままだった。G11 は main 反映後の定期計測なので PR 段階では止められない。よって PR 段階で client 側の退行を止める G13 を独立に置く。
- **G13 を PR 単位に置く理由**: Lighthouse 実行を伴わず既存の `next build` 出力を読むだけなので Actions 時間をほぼ消費せず、C2 と衝突しない。G11 (実測・事後) と G13 (静的予算・事前) は代替関係ではなく、事前の退行遮断と事後の実測確認という二段構えである。
- **G4 の名指し部分** (2026-07-25 追記): qa-038【2】は Tenant 分離テストを必須ゲートとして名指しするが、`pnpm -r test` に含まれているだけでは、ファイル分割や `it.skip` で 1 件も実行されなくなっても緑のまま通る。そこで `scripts/ci/check-tenant-isolation-gate.mjs` が (1) 対象ファイル `apps/hub/tests/auth-tenancy/tenant-isolation.test.ts` の実在、(2) T-ISO-01〜07 の ID 網羅、(3) skip / todo / only による無効化の不在 を検査したうえで、`apps/hub` の `test:tenant-isolation` を名指し実行する。**これは G4 の内訳を明示するものでゲート数を増やさない** (qa-038【2】の「8 種」の数え方は変わらない)。`packages/db` 側の schema 駆動な網羅検査 (G7b `check:tenant-isolation-coverage`) が「どのテーブルを覆うか」を守るのに対し、こちらは「そのテストが実際に走り続けるか」を守る。
- **G4 の workspace 実行資源** (2026-07-30 追記 / `HarnessHub-pyb3`): package 内の file / worker 並列性は Vitest に委ねる一方、複数 package の worker pool を同時に起動しない。`pnpm -r test` という CI / local 共通入口は維持し、project 設定の `workspaceConcurrency: 1` と `pnpm check:pnpm` の正負テストで直列化を固定する。これにより test assertion が全件成功した後の worker RPC `onTaskUpdate` timeout を G4 の失敗と誤認する偽陽性を防ぐ。

**CI が 2 系統ある境界** (2026-07-21 追記): 本リポジトリは Hub 本体 (プロダクト) と Claude Code スキルハーネス (`plugins/`) の 2 つを同居させており、CI も 2 系統に分かれる。この登録簿 (G1〜G14) と qa-038【2】の required status checks 8 種が対象とするのは **プロダクト層 (`.github/workflows/ci.yml` / `.github/workflows/cwv.yml`)** のみである。

| 層 | workflow | 宣言の正本 | 対象 |
|---|---|---|---|
| プロダクト | `ci.yml` / `cwv.yml` | `system-spec/spec-state.json` / `system-spec/dev-workflow.md` (qa-018/qa-038/qa-039) | `apps/hub` / `packages/*` |
| メタ (スキルハーネス) | `governance-check.yml` | `plugins/harness-creator/plugin-composition.yaml` の `contract` | `plugins/*` / `scripts/*` / スキル証跡 |

メタ層のゲート (配置規約 lint・skill description lint・live-trial 証跡の検査など) を qa-038 の 8 種へ数え入れないこと。**逆に「8 種に無いから未配線だ」と判断しないこと** — 別の正本が別の workflow で機械強制している。両者はゲートの数を互いに増減させない独立系統であり、片方の変更はもう片方の仕様反映を要さない。

**登録簿 G1〜G14 と「8 種」の対応** (2026-07-24 追記, F-2 / 2026-07-25 に G12・G13 を追記 / 2026-08-04 に G14 を追記): qa-038【2】は pnpm 強制 / lint・format / typecheck / unit・integration / bundle 予算 / secret scan / Tenant 分離 / 破壊的 DDL / OpenAPI・zod drift の 9 項目を列挙する。このうち unit・integration と Tenant 分離を同じテスト段 (G4) で実行するため、ゲートとしては **G1〜G8 の 8 種**になる。G9 (axe a11y)・G10 (duplicate detector)・G11 (CWV)・G12 (認証・認可 静的検査)・G13 (client JS 予算)・G14 (OIDC / owner 認可 release contract) は qa-018・A4・R-05・qa-020 から加わる横断品質ゲートであり、**8 種には数えない**。したがって G12・G13・G14 の追加は qa-038【2】が列挙する 9 項目を増減させず、`system-spec/spec-state.json` の改訂を要さない (G9・G10 を追加したときと同じ扱い)。G14 は G4 の内訳を名指しへ引き上げるものなので、この点でも「8 種」の数え方を変えない (G4 の名指し tenant 分離と同じ位置づけ)。なお qa-038【2】が列挙する「bundle size 予算」は Worker 3MiB (G5) を指し、G13 はそれとは別軸で frontend-spec §8 の First Load JS 予算を機械強制するものである。

**実行段との対応**: `.github/workflows/ci.yml` では G1・G10・G12 を install 前の `static-gates` job、G2〜G9 と G13・G14 を `build & test (G2-G9 required status checks)` job で実行し、G11 は `.github/workflows/cwv.yml` で main 反映後に定期実行する。したがって `G2-G9` という job ラベルは**実行段のまとまり**であり、qa-038【2】の要件番号との一対一対応を意味しない (G13・G14 も同 job 内で走る)。G13 が静的ゲート段ではなく build & test 段にあるのは、`next build` の出力を読む必要があり install 前には判定できないためである。

**local からの実行 (ADR §6 R-18 / qa-039【2】)**: required status checks と同一の実装を root の `pnpm verify` から呼べる状態を保つ。現在の対応は G1=`check:pnpm` / G10=`check:duplicates` / G12=`check:auth` / G2=`lint` / G3=`typecheck` / G4=`test` + `check:tenant-isolation` / G6=`check:secrets` / G7=`check:ddl` / G7b=`check:tenant-isolation-coverage` + `check:connection-isolation` / G8=`check:drift` / G9=`check:a11y` / G14=`check:auth-release-contract` / G5=`check:bundle` / G13=`check:client-bundle`。**2026-08-04 (`HarnessHub-yhc3`) に G7 / G7b / G9 を、あわせて登録簿へ未掲載のまま CI にのみ存在した G14 を結線し、登録簿 G1〜G14 の未結線は 0 になった**。ゲートを追加するときは CI と同時に local 入口も用意すること (CI にしか無いゲートは着手前に気づけず、PR で初めて落ちる)。

- **root script は CI の呼び先 script 名と一字一句揃える** (`check:ddl` / `check:tenant-isolation-coverage` / `check:connection-isolation`)。名前が一致していると「ci.yml のこの step = root のこの入口」を grep で追跡でき、片側だけ改名したときに突き合わせが壊れることに気づける。
- **G7 の migrations 存在条件は local 側には置かない**: `ci.yml` の G7 は `if [ -d packages/db/migrations ]` で「feat-domain-model-db 未着手なら対象なし」とする暫定措置を持つが、migrations は既に実在するため local 入口は無条件に実行する。理由は 2 つある。(1) qa-038【1】は「macOS 主・Windows 従の両者で同一の pnpm script が動作すること (パス区切り・改行コード・**シェル依存のコマンドを pnpm script に埋め込まない**)」を求めており、`[ -d ... ]` の条件分岐を root script へ持ち込むと Windows 側で挙動が割れる。(2) 差は local が CI より厳しい方向にのみ開くので、R-18 が防ごうとしている「CI に出して初めて落ちる」逆転は生じない。
- **G9 は `check:a11y` として root に 1 本で置く**: `ci.yml` の G9 と同じく `packages/ui` の部品単体と `apps/hub` の画面結合を直列実行する。

**不変条件 (数え違いとドリフトの防止)**: ゲートを 1 つでも増減するときは、(1) `.github/workflows/ci.yml` / `.github/workflows/cwv.yml` の対象 job・step、(2) この登録簿の G 番号表と実行段、(3) `system-spec/spec-state.json` qa-038【2】および `system-spec/dev-workflow.md` の CI / local 同値要件、(4) ADR §6 — の 4 者を**必ず同一 PR で揃えて改訂する** (どれか 1 つだけを直すと、この F-2 と同じ「登録簿だけ取り残される」劣化コピーが再発する)。この対応はプロダクト層だけを対象とし、上の「2 系統ある境界」で述べたメタ層 (`governance-check.yml`) のゲート数とは独立である。

## 4. リポジトリ構成の提案 (pnpm workspace) — 要ユーザー確認

共通層をパッケージ境界で強制するためのモノレポ構成案。**確定は feat-hub-foundation の P02/P03 で行う**。

```
apps/hub/            # Hub 本体 (Next.js on Workers)。UI + API + 認可 MW
packages/ui/         # 共通 UI (design system)。§1 の正本
packages/schemas/    # zod schemas 単一ソース。§2 の正本
packages/inspection/ # 検査 pipeline 共有 package (純関数)
packages/db/         # Drizzle schema + repository 層
plugins/publisher/   # Publisher plugin (Claude Code / Codex 配布物)
```

- 判断理由: 「Publisher と Hub の検査ロジック共有 (qa-010)」「zod 単一ソース (qa-009)」がパッケージ分離を要求する。それ以外の分割はしない (C1)。

## 5. 変更管理 (共通層を安全に変える仕組み)

- 本書 §1-§3 の表が共通層の登録簿。**共通層の変更 = 消費 feature 全部への影響**として扱い、消費列の feature の再テストを変更の完了条件にする
- 確定後は architecture ノード (dev-graph) に反映し、source_digest により下流 feature が影響を機械検出できるようにする
- 共通層に第 3 の利用者が現れたときに初めて共通化する (2 回目までは重複を許す) — 早すぎる抽象化の禁止
