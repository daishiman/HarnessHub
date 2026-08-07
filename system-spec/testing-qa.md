---
status: confirmed
category: testing-qa
aggregate: 確定
spec_cells: [testing-qa.web, testing-qa.mobile, testing-qa.tablet, testing-qa.desktop-windows, testing-qa.desktop-linux, testing-qa.desktop-macos]
serves_goals: [G1, G4, G5]
---

# テスト戦略・品質保証 (testing-qa)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-190 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリを持たず、モバイル端末を開発者クライアント/テスト実行環境として使わない (dev-workflow の mobile 行と同根拠)。テスト実行は web 行 (CI) と desktop-windows/desktop-macos 行 (作者ローカル) でカバーする |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリを持たず、タブレット端末を開発者クライアント/テスト実行環境として使わない (dev-workflow の tablet 行と同根拠)。テスト実行は web 行と desktop-windows/desktop-macos 行でカバーする |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-095 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop を開発者クライアント環境として使わない (作者環境は macOS + Windows。dev-workflow の desktop-linux 行と同根拠)。GitHub Actions の ubuntu-latest runner 上のテスト実行は CI 実行基盤として web 行の品質ゲート要件でカバーする |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-095 |

## 確定内容 (質疑録)

### qa-190 (対応セル: web)

**質問**: C07 独立監査ラウンド12 (verdict PASS) が MEDIUM として、qa-188 の論点束ねを指摘した。qa-188 の (a)〜(d) は『tenants.status を段0 語彙へ追加する』という 1 論点として妥当だが、(e)『DeviceAuthorizationStatus の三重定義と V7 の第3情報源化』は独立した別論点である、という判定である。理由は、対象ドメインが異なる (前者=認証の前提状態、後者=検査ツールの網羅範囲) こと、影響先も異なる (前者=段0 マトリクス、後者=V7 acceptance) ことの 2 点。spec-state 契約『qa_log の論点分離』は既登録 entry の逐語改変を禁じ、束ねが後から判明した場合は分離索引を新規 entry として追記せよと定めている。この扱いを決めよ。

**回答**: C07 の判定を受け入れ、**qa-188-e を本 entry へ分離索引として切り出す**。qa-188 の逐語は一切改変しない。matrix.maintenance-ops.web.qa_ref も qa-188 のまま据え置く。

[qa-190-a 束ねであったことを認める] qa-188 は『tenants.status を段0 語彙へ追加する』を主題として書かれ、その末尾に (e) として DeviceAuthorizationStatus の三重定義を付けた。両者に共通していたのは『C07 が継続指摘している未対応項目である』という**由来だけ**であり、内容の関係ではない。由来の共通性で束ねるのは、まさに論点分離契約が禁じている形である。C06 が論点別に中立性を検証できなくなるため、分離する。

[qa-190-b 分離した論点の内容] `DeviceAuthorizationStatus` は同一のリテラル union が 3 箇所に独立して存在する: `packages/schemas/auth-tenancy/src/ports.ts:117` (TypeScript 型宣言)、`packages/schemas/auth-tenancy/src/repository/device-flow.ts:23` (zod の z.enum)、drizzle schema `publish.ts:106` (text(col, {enum: [...]}))。V7 (同一リテラル union の重複定義を検出する検査) が突合すべき情報源は、したがって **型宣言 / zod / ORM schema の 3 経路**である。型宣言と zod の 2 経路だけを実装すると、3 件目 (ORM schema) が検査をすり抜ける。これは検査ツールの網羅範囲の問題であり、認証の前提状態語彙 (qa-188 の主題) とは別の層にある。

[qa-190-c 本 entry を testing-qa/web に束縛する理由] この論点の影響先は V7 の acceptance、すなわち検査ツールが何を情報源とするかである。段0 マトリクス (maintenance-ops) ではなく testing-qa の管轄にあたる。分離索引を主題に近いカテゴリへ置くことで、後から読む者が『V7 の網羅範囲はどこで決まったか』を categoryから辿れる。

[qa-190-d 由来の明示] 本 entry の内容は qa-188 の (e) に由来する。qa-188 側にはこの分離を指す逆参照が無い (未解決事項 6 と同じ構造的欠落である)。本 entry から qa-188 を参照する片方向の索引として記録する。qa-188 の逐語を書き換えて双方向にすることは、契約が禁じているため行わない。

### qa-095 (対応セル: desktop-windows, desktop-macos)

**質問**: 作者のローカル desktop 環境で skill 構造 lint を実行するとき、pytest などが生成した隠し cache を人が設計した skill tree と誤認せず、同じ品質基準を Windows と macOS で再現するには何を必須としますか?

**回答**: ユーザーの 2026-07-29 最終レビュー・仕様反映指示を明示承認として、qa-078 と qa-081 の既存契約を全面維持し、skill 構造 lint の生成物境界を追補する。

【1. テスト戦略】タスク仕様書は単体・結合・境界値・既存回帰の各テストを変更内容から選び、focused test と実際の実行順序を再現する広域回帰の両方を記録する。失敗時は原因分析、修正、同一コマンド再実行の改善ループを回す。

【2. 層別方針】frontend は behavior ベースの component / 操作フロー、backend は API 契約 / ロジック単体 / DB 結合、infrastructure と repository tooling は静的契約 / 実行順序 / fail-closed 境界を検証する。pixel・DOM 内部構造・一時生成物の物理配置など、本来の設計契約ではない実装詳細へ品質判定を密結合させない。

【3. skill tree の生成物境界】skill 構造 lint は人が管理する SKILL.md、許可 directory、命名、深さを検査する。一方、pytest・mypy 等の test tool が skill 配下へ作る dot で始まる directory とその配下、Python の __pycache__ / .pyc は生成物として構造判定から除外する。許可 directory 集合に dot directory は含めず、個別 cache 名の列挙ではなく同じ性質を持つ生成物へ一般化する。

【4. 複製と回帰】repository root の scripts/lint-skill-tree.py と配布 plugin 内の実装は同一バイト列を維持する。回帰テストは .pytest_cache だけでなく .mypy_cache と任意の dot cache を含め、通常の nested directory 違反は引き続き検出する。per-plugin pytest の直後に repository criteria test を実行しても結果が変わらないことを確認する。

【5. platform と製品境界】同じ Python 実装と同じ pytest コマンドを desktop-windows / desktop-macos で利用する。変更は repository 内の開発品質ゲートに限定し、Harness Hub 製品の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

## 上流指針 (doctrine anchor)

- 本カテゴリは共通シード (categories) 外のプロジェクト固有カテゴリで、approved な pending 例外 (owner: daishiman) として上流指針を確定している。

| concern | authority (正本) | 導く上流原則 | 出典 |
|---|---|---|---|
| reliability | Google SRE | SLO/エラーバジェット・冗長性・スケーリング・監視の上流指針 | https://sre.google/books/ |
| operations | Google SRE | 運用手順・障害対応・トイル削減・ポストモーテムの上流指針 | https://sre.google/workbook/ |

- 本章の確定内容 (質疑録) は上記 authority を上流指針として適用する。具体技術の選定はこの指針に従属し、指針との乖離は再オープン (R4-reopen) の根拠になる。

## 適用された設計知識

- `ref-system-design-knowledge/references/resource-map.yaml` (このカテゴリ専用の deep card は resource-map に未定義。本章の設計判断は「上流指針 (doctrine anchor)」節の authority と「確定内容 (質疑録)」を正本とする)

## 最新ドキュメント出典

| 対象 | バージョン | 公式発行元 | 出典URL | 取得 | 最新確認 |
|---|---|---|---|---|---|
| vitest | 4.1.10 | VoidZero / Vitest team (vitest.dev) | https://vitest.dev/blog/vitest-4-1.html | 2026-08-07T03:26:46Z | 2026-08-07T03:26:46Z |
| playwright | 1.62.1 | Microsoft (playwright.dev) | https://playwright.dev/docs/release-notes | 2026-08-07T03:26:57Z | 2026-08-07T03:26:57Z |
| testing-library | @testing-library/react 16.3.2 | Testing Library (OSS) (testing-library.com) | https://testing-library.com/docs/react-testing-library/intro/ | 2026-08-07T03:27:06Z | 2026-08-07T03:27:06Z |
