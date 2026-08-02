---
status: confirmed
category: testing-qa
aggregate: 確定
spec_cells: [testing-qa.web, testing-qa.mobile, testing-qa.tablet, testing-qa.desktop-windows, testing-qa.desktop-linux, testing-qa.desktop-macos]
serves_goals: [G1, G2, G5]
---

# テスト戦略・品質保証 (testing-qa)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-132 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリを持たず、モバイル端末を開発者クライアント/テスト実行環境として使わない (dev-workflow の mobile 行と同根拠)。テスト実行は web 行 (CI) と desktop-windows/desktop-macos 行 (作者ローカル) でカバーする |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリを持たず、タブレット端末を開発者クライアント/テスト実行環境として使わない (dev-workflow の tablet 行と同根拠)。テスト実行は web 行と desktop-windows/desktop-macos 行でカバーする |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-095 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop を開発者クライアント環境として使わない (作者環境は macOS + Windows。dev-workflow の desktop-linux 行と同根拠)。GitHub Actions の ubuntu-latest runner 上のテスト実行は CI 実行基盤として web 行の品質ゲート要件でカバーする |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-095 |

## 確定内容 (質疑録)

### qa-132 (対応セル: web)

**質問**: Worker Secret の実投入ゲートと本番 hearing E2E / SEC8 smoke を、既存 testing-qa.web 契約へどのように追加し、何を未完了として残しますか?

**回答**: ユーザーの 2026-08-02 最終レビュー・品質ゲート再実行・仕様反映指示を明示承認として、qa-076 / qa-081 / qa-089 / qa-095 / qa-100 / qa-108 / qa-109 / qa-119 / qa-130 の既存品質契約を全面維持し、HarnessHub-o2i.13 の検証束を次のとおり追補する。

【1. Secret gate の正負例】台帳 required と wrangler 宣言の集合一致を実データで固定し、required 未投入、台帳外の実投入、planned の先行投入、required 未宣言、required でない宣言、台帳に無い宣言をそれぞれ非 0 にする。wrangler のバナーや JSON 前後の角括弧付き警告が混在しても JSON 配列だけを抽出し、空配列は正当な実測として受理しつつ required 欠落で落とす。解釈不能は例外とし未検査を合格にしない。

【2. Smoke の局所回帰】entrypoint が必要な H1〜H6 / SEC5 / SEC8a / SEC8b と finally cleanup を持つことを静的契約で固定する。DB probe は fixture 作成途中の UNIQUE 違反を実 DB driver で起こし、tenant / idp_connection / workspace が transaction rollback で 0 行になること、および正常 fixture の cleanup 後に残行数 0 になることを結合テストで固定する。

【3. Production acceptance】本番では Device Flow token 取得、受付番号発番、同一 transaction の enqueue、SEC5 年収非保存、別 tenant 取得の非露出、tenant header 詐称拒否、workspace header 必須、claim token 束縛、complete 後の review / DB 結果一致、session 専用 API の TOKEN 拒否を実測する。状態変更 HTTP には production origin を必須とし、CSRF 前段で空振りした検査を合格にしない。

【4. CI 到達と証跡】静的 gate は pnpm verify と GitHub Actions、実投入 gate と production smoke は main の deploy job から fail-closed に到達させる。task spec validator、artifact placement、文書行数、graph/source digest、対象 package test/typecheck/lint、build、全体 pnpm verify、diff check を PR 前に再実行し、結果を release notes、仕様反映受領書、Beads notes、PR 本文へ残す。

【5. 未実測境界】repository test の合格を本番 smoke の代替にしない。本変更 commit 時点では本番資格情報を使う deploy run をまだ実行していないため、P13 と親 epic は完了扱いにしない。main merge 後の deploy run で production smoke が成功し、実測 run / 時刻 / 結果を release notes と Beads へ記録するまで残課題として明示する。

### qa-130 (対応セル: web)

**質問**: 顧客持ち込み Google OAuth 管理機能の品質保証を testing-qa.web の現行契約へどう追加しますか?

**回答**: qa-119 までの単体・結合・境界値・回帰、CI 到達、再現可能 runtime、実測証跡契約を全面維持し、次を追加確定する。【実 DB 結合】libSQL と既存封筒暗号化を使い、pending/tested/active/disabled、無停止 rotation、取消、disabled 再登録、現行再テスト時刻、暗号文 CAS 競合、migration 0004 の旧 writer 互換を検査する。【認可・境界】provider-admin/workspace-admin/member/未認証、CSRF、tenant A/B 越境、Google 以外 issuer の非列挙・操作拒否を route test で固定する。【非露出】応答全文、監査 payload、DOM、エラー経路、repository secret scan に secret 全値が無いことを負例で確認する。【UI】実画面と同じ h1→h2→h3 骨格で axe-core の違反0、password/autocomplete、rotation の現行継続表示、Workspace ドメイン正規化を検査する。【ゲートと残余】pnpm verify、auth/tenant/secret/bundle/client-bundle、task plan/dev-graph/system-spec validator を PR 前に再実行する。Google 実 OAuth client による probe とブラウザ login、Playwright 実操作、production migration は repository test で代替せず残課題に明示する。

### qa-119 (対応セル: web)

**質問**: dual catalog の認可 cache 境界と絞り込み要求数を、既存 testing-qa.web 契約へどう追加しますか?

**回答**: ユーザーの 2026-08-01 最終レビュー・仕様反映指示を明示承認として、qa-109 までの単体・結合・境界値・回帰、CI 到達、再現可能 runtime、実測証跡の契約を全面維持し、dual catalog の検証束を追加確定する。

【1. 認可 cache 回帰】成功応答を描画した後に 403 を返す順序付きテストを一覧・詳細・Release 履歴へ置き、以前の内容と table が消えることを検査する。初期詳細を渡した経路も 403 後に消えることを含める。

【2. scope と縮退の直積】同一 scope の成功→503 では DegradedBanner と以前の内容を維持し、tenant/workspace 切替の成功→503 では旧 tenant の識別可能な内容が 0 件であることを検査する。HTTP adapter の全 request が tenant/workspace header を送る既存検査と組み合わせる。

【3. 配布応答】認証済み `/marketplace.json` が private, max-age=60, stale-while-revalidate=300 と Cookie/tenant/workspace の Vary を返すことを route test で固定し、public cache への退行を拒否する。

【4. 通信回数】一覧のキーワード入力中は request 数が増えず、submit で 1 回だけ増え、適用 query が送られることを component test で固定する。

【5. CI と未実測境界】catalog 固有 Vitest は GitHub Actions から fail-closed に到達させ、axe 違反 0 と bundle 予算を維持する。production URL 上の LCP/INP/CLS と 2 社同時運用は repository test で代替せず P13 の外部実測として未完了を明示する。

### qa-108 (対応セル: web)

**質問**: PublishRequest パイプラインの受入を testing-qa.web の既存品質契約へどう統合しますか?

**回答**: ユーザーの 2026-07-30 最終レビュー・仕様反映指示を明示承認として、qa-076 までの testing-qa.web 契約を全面維持し、公開パイプラインの品質ゲートを追加確定する。

【1. 振る舞い】状態遷移の許可・拒否直積、Green/Yellow/Red 写像、旧 stable 維持、immutable Release、TargetChannel 直列化、idempotency の replay/payload mismatch、tenant/workspace/role matrix を自動テストで固定する。

【2. 結線と境界】共有 inspection が secret scan を含むことだけでなく Hub がその bundle を実際に使うことを静的 gate で検査する。apps/hub から packages/db schema subpath への依存を禁止し、各 detector は意図的な bypass を拒否できる負例テストを持つ。検査対象 0 件を成功にしない。

【3. production acceptance】repository 内の test 合格だけで P13 を完了扱いにせず、production Worker、DB、R2 に対する S1〜S6、channel_busy、R2 hash、audit chain を実測する。自動 smoke の entrypoint と必須 action 集合も静的・単体テストで固定する。

【4. 証跡】system-plan P01〜P13 の validator violations 0、対象 package test/typecheck/lint、boundary/security gate、文書 line limit、artifact placement、diff check を PR 前に再実行し、結果と既知の非 blocker follow-up を受領書、release record、Beads notes へ残す。

### qa-109 (対応セル: web)

**質問**: 既存のテスト戦略・品質保証契約を維持しながら、plugin-local Chromium を使う slide-report-generator の受入試験を、ローカルだけでなく GitHub Actions から必ず到達可能にするには何を必須としますか?

**回答**: ユーザーの 2026-07-30 最終レビュー・仕様反映指示を明示承認として、qa-076〜qa-081、qa-089、qa-095、qa-100、qa-108 の既存契約を全面維持し、plugin-local browser acceptance の CI 到達契約を追補する。

【1. テスト戦略】task 仕様書は単体・結合・境界値・既存回帰の4レベル、既定80%のカバレッジ目標、層別方針、実装詳細へ密結合しない保守性制約を持つ。実ブラウザを使う処理は、文字列・mock だけの単体試験で代替せず、Chromium 起動と生成物観測を結合／受入証拠に含める。

【2. CI 到達】plugin の EVALS や npm test に受入試験を列挙するだけで完了としない。plugin または専用 workflow の変更を trigger とする GitHub Actions job から、plugin-local runtime 復元、同じ npm test、runtime の read-only check を順番に実行する。install/test/check のいずれかが失敗した場合は job を非0で停止する。

【3. 再現可能な runtime】Node/Playwright 依存と OS/CPU 別 Chromium は plugin 配下へ復元し、利用者や runner の global browser cache を正本にしない。cache は高速化だけに使い、最終 check で Playwright version、実行ファイルの存在、plugin-local path への包含を再検証する。依存が無い clean runner でも install が npm ci と Chromium 復元へ収束する。

【4. 回帰と証拠】Python 契約テストは workflow の path trigger、working-directory、install→npm test→check の配線を検査する。Node 受入試験は plugin-local Chromium を実起動し、16:9 検査と複数 slide screenshot の実在を確認する。EVALS、npm test、workflow の三経路に test-verify-slides を到達させ、宣言だけ・ローカルだけ・CIだけの片肺を許さない。

【5. platform と境界】GitHub Actions は testing-qa.web の CI 実行基盤として扱い、作者の desktop platform と混同しない。本契約は repository 内の slide-report-generator 品質ゲートに限定し、Harness Hub 製品の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

### qa-095 (対応セル: desktop-windows, desktop-macos)

**質問**: 作者のローカル desktop 環境で skill 構造 lint を実行するとき、pytest などが生成した隠し cache を人が設計した skill tree と誤認せず、同じ品質基準を Windows と macOS で再現するには何を必須としますか?

**回答**: ユーザーの 2026-07-29 最終レビュー・仕様反映指示を明示承認として、qa-078 と qa-081 の既存契約を全面維持し、skill 構造 lint の生成物境界を追補する。

【1. テスト戦略】タスク仕様書は単体・結合・境界値・既存回帰の各テストを変更内容から選び、focused test と実際の実行順序を再現する広域回帰の両方を記録する。失敗時は原因分析、修正、同一コマンド再実行の改善ループを回す。

【2. 層別方針】frontend は behavior ベースの component / 操作フロー、backend は API 契約 / ロジック単体 / DB 結合、infrastructure と repository tooling は静的契約 / 実行順序 / fail-closed 境界を検証する。pixel・DOM 内部構造・一時生成物の物理配置など、本来の設計契約ではない実装詳細へ品質判定を密結合させない。

【3. skill tree の生成物境界】skill 構造 lint は人が管理する SKILL.md、許可 directory、命名、深さを検査する。一方、pytest・mypy 等の test tool が skill 配下へ作る dot で始まる directory とその配下、Python の __pycache__ / .pyc は生成物として構造判定から除外する。許可 directory 集合に dot directory は含めず、個別 cache 名の列挙ではなく同じ性質を持つ生成物へ一般化する。

【4. 複製と回帰】repository root の scripts/lint-skill-tree.py と配布 plugin 内の実装は同一バイト列を維持する。回帰テストは .pytest_cache だけでなく .mypy_cache と任意の dot cache を含め、通常の nested directory 違反は引き続き検出する。per-plugin pytest の直後に repository criteria test を実行しても結果が変わらないことを確認する。

【5. platform と製品境界】同じ Python 実装と同じ pytest コマンドを desktop-windows / desktop-macos で利用する。変更は repository 内の開発品質ゲートに限定し、Harness Hub 製品の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

### qa-100 (横断追補: web, desktop-windows, desktop-macos)

**質問**: qa-089 の live-trial 証拠契約を受領する criteria-test は、scenario_contract が欠落した旧形式の PASS をどう扱い、何を照合して初めて合格にしますか?

**回答**: `verify_by=live-trial` は正準 positive scenario と非省略の `scenario_contract` を必須とし、legacy schema 上で field が optional でも欠落を不合格にする。scenario ID、required observations と observed の同数・同順、`unobserved=[]`、実行引数、宣言済み task 契約、run 内に包含された evidence ref の実在を受領側で再照合する。旧受領書は field や digest の手編集で追認せず、現行 scenario と挙動閉包で fresh live-trial を実走して更新する。影響は repository の開発品質ゲートに限定し、schedule skill 本体と製品 API・DB・認証認可・UI・deploy unit は変更しない。判断と検証は `docs/features/feat-dev-pipeline-improvement/live-trial-scenario-contract-required-spec-reflection.md` を正とする。

## 実装フィードバック (2026-07-30 / HarnessHub-ory6)

qa-076 / qa-081 の「境界値・異常系を task spec と機械ゲートで再現可能にする」
確定要件を、repository 内 validator の ID 一意性へ具体化した。入力要素を
`set` / `dict`（集合・辞書）へ変換する validator は、変換前に同一 ID の
重複を検査し、重複した別要素が 1 件へ畳み込まれる偽陽性を許可しない。

- task graph は task node ID と component ID を別々に検査する。
- consult transcript は user solution の provenance（根拠となる発話）を
  照合する前に turn ID の重複を検査する。
- route build handoff は route/complete の両モードで route ID の重複を
  検査する。
- 各経路は正常な入力を exit 0 のまま維持し、重複 ID の負例 fixture では
  CLI を非 0 終了させる。検査件数 0 を合格根拠にせず、違反を実際に投入して
  gate の反転を確認する。

この追記は既存 QA の実装フィードバックであり、確定回答、製品 API、DB schema、
認証認可、UI、Cloudflare deploy unit は変更しない。内部 validation contract
（検証契約＝不正な入力をどこで拒否するか）の設計影響だけを反映する。

## 実装フィードバック (2026-07-30 / HarnessHub-35ai)

qa-076 / qa-089 の「異常系を機械ゲートで再現し、証拠の由来を束縛する」
確定要件を、Dev Graph renderer の登録検証表示へ具体化した。

- `--registration-receipt` があり、件数・node ID・graph digest・source digest の
  検証を通過した場合だけ `registration_verification.status=verified` とする。
- receipt が無い探索表示は `not_performed` とし、子 task が偶然 13 件でも
  登録成功の証拠として扱わない。
- 判定は CLI receipt、HTML の可視 banner、埋込み `render-metadata` の
  3 箇所で同じ状態を返し、正例と receipt 無しの負例を回帰テストで固定する。

この追記は確定回答を変えず、repository 内の開発品質ゲートを具体化する
実装フィードバックである。製品 API、DB schema、認証認可、UI、
Cloudflare deploy unit は変更しない。

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
| vitest | 4.1.10 | VoidZero / Vitest team (vitest.dev) | https://vitest.dev/blog/vitest-4-1.html | 2026-07-24T11:48:06Z | 2026-07-24T11:48:06Z |
| playwright | 1.61.1 | Microsoft (playwright.dev) | https://playwright.dev/docs/release-notes | 2026-07-24T11:48:06Z | 2026-07-24T11:48:06Z |
| testing-library | @testing-library/react 16.3.2 | Testing Library (OSS) (testing-library.com) | https://testing-library.com/docs/react-testing-library/intro/ | 2026-07-24T11:48:06Z | 2026-07-24T11:48:06Z |
