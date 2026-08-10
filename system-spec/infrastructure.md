---
status: confirmed
category: infrastructure
aggregate: 確定
spec_cells: [infrastructure.web, infrastructure.mobile, infrastructure.tablet, infrastructure.desktop-windows, infrastructure.desktop-linux, infrastructure.desktop-macos]
serves_goals: [G1, G4, G5, G2]
---

# インフラ (infrastructure)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-187 |
| モバイル (mobile) | 対象外 | 理由: native モバイル向け配信基盤なし (ブラウザ経由提供) |
| タブレット (tablet) | 対象外 | 理由: native タブレット向け配信基盤なし (ブラウザ経由提供) |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-043 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop 向け Publisher 配布は対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-043 |

## 確定内容 (質疑録)

### qa-187 (対応セル: web)

**質問**: qa-185 で原因の候補を 3 つ残した。そのうち候補 (2)「isolate 寿命 × process.env の lazy populate のタイミング」について C08 独立監査 6 回目が公式一次記述で裏取りを行った。Cloudflare Workers Best Practices が、binding のみを変更する deploy では isolate が 再利用され得ること、および env 由来の値を global scope に保持すると基盤の binding が 変わっても stale な値が持続し得ることを、名指しの anti-pattern として警告している。process の lazy populate は isolate 生存期間内の最初のアクセス時点で行われ、投入有無を毎回再チェックする仕組みではない。この裏取り結果を仕様へ反映せよ。

**回答**: 候補 (2) を『公式記述で機序として成立することが確認された候補』へ格上げする。ただし本番でそれが起きたとは断定しない。qa-183-b の方針 (断定の強さと根拠の強さを揃える) を維持する。

[qa-187-a 公式記述で確認できたこと] C08 が Cloudflare 公式 Workers Best Practices (developers.cloudflare.com/workers/best-practices/workers-best-practices/) から次を確認した: binding だけを変更しコードを変更しない deploy では、Cloudflare は実行中の isolate を**再利用することがある** (コードを再ロードせずに環境変数や binding を差し替えられるため)。その結果、env から取得した値を global scope のインスタンスへ保持していると、基盤の binding が変わっても **stale な値のまま持続し得る**。公式が示す正しい形は『リクエストごとに新しいインスタンスを作る』ことである。あわせて process ドキュメント (developers.cloudflare.com/workers/runtime-apis/nodejs/process/) 側から、lazy populate が **process への最初のアクセス時点**で行われること、すなわち isolate 生存期間内で一度きりであり投入有無を再評価しないことを確認した。

[qa-187-b これは E-2 の直接根拠である] middleware.ts:26-35 は module 最上位で `process.env.AUTH_SESSION_SECRET` を一度だけ読み、その値で `authAdapter` を構築して module scope に保持する。module 最上位は isolate 起動ごとに 1 回しか評価されない (isolate は per-request ではない)。したがってこの形は、**公式が名指しで警告している anti-pattern と構造的に一致する**。ある isolate が secret 未投入の時点で最初に process へ触れて undefined を populate すると、その後 secret を投入しても、その deploy が binding のみの変更であれば同じ isolate が再利用され、deny-all 版の authAdapter が使われ続ける。isolate が evict されるまで解消しない。
E-2 (環境値の読み出しを吸収層へ一本化し、request context 内で解決する) は、これまで『Workers が request context 外の I/O を許可しない』という一般則に接地していたが、本 turn 以降は **binding 変更 deploy と isolate 再利用という具体的な機序**にも接地する。根拠が 1 本増えたのであって、置き換わったのではない。

[qa-187-c それでも原因を断定しない理由] 公式記述が保証するのは『この機序が成立し得る』ところまでである。報告症状が実際にこの経路で起きたと言うには、当該 isolate の生成時刻と secret 投入時刻の前後関係という**本番の実測データ**が要る。本セッションでは本番への観測が許諾されておらず、この前後関係は取得できていない。よって候補 (2) は『機序として確認済み・実際の発生は未確認』の強さで記録し、候補 (1) 未ゲート経路・候補 (3) 認証以外の原因も引き続き残す。

[qa-187-d 仕様に加えるもの] E-2 の acceptance に「認証に関わる構築物が module scope に保持されず、request ごとに解決される」を明示する。V6 の検査点に「module 最上位での環境値依存構築の検出」を含める (これは既に E-1 の検査だが、isolate 再利用という**失敗の帰結**を検査の説明文へ書き添える。検査が何を防いでいるか読めないと、将来この検査は『厳しすぎる』として緩められる)。

### qa-043 (対応セル: desktop-windows, desktop-macos)

**質問**: 作者デスクトップ環境 (macOS / Windows) の infrastructure (配布・実行基盤・ツールチェーン) は何を正本とするか? (C07 監査指摘への対応: infrastructure.desktop-windows/desktop-macos の qa_ref=qa-003 は Hub web hosting 中心の回答で desktop 固有の裏付けが薄い。既確定内容の集約による専用質疑化であり新規決定は含まない)

**回答**: 既確定の qa-003 / qa-010 / qa-034 / qa-039 / qa-041 の desktop 該当部分を infrastructure.desktop の専用正本として集約確定する。(1) 配布経路 (qa-003): Publisher / Skill の作者環境への配布は URL 型 marketplace (native source) または Bootstrap Installer の 2 経路を Stage 0 technical gate (H7) で検証し、成立した経路を採用する (一般利用者に GitHub アカウントを要求しない = I6)。(2) 実行形態 (qa-010): 専用 desktop GUI は作らず、Publisher core は TypeScript (Node + pnpm) で実装し Claude Code / Codex plugin (slash command /harness-hub:publish + skill + スクリプト) として配布する。target=web_app の出口は作者 local session での wrangler CLI スクリプト実行 (I5。Hub は URL 登録・公開範囲検査・health 確認のみ)。(3) ツールチェーン (qa-039): 作者/提供者環境は macOS 主・Windows 従で、Claude Code + pnpm (corepack 経由・他パッケージマネージャ禁止) + git + wrangler CLI。両 OS で同一の pnpm script が動作すること (パス区切り・改行コード・シェル依存をコマンドへ埋め込まない)。ローカルは preview 用 Turso または local SQLite を binding し production DB を指さない。production への deploy/migration の正本経路は CI (緊急時のみローカル + 事後記録)。(4) 資格情報基盤 (qa-041): Device Flow token は OS 資格情報域 (macOS Keychain / Windows Credential Manager) のみに保存。(5) 環境・binding の詳細正本は docs/infrastructure-spec.md (qa-034)、desktop 側の運用規律は dev-workflow (qa-039) と security (qa-041) の各確定に従属し、本 qa は infrastructure.desktop 行への接地点を提供する。

## 上流指針 (doctrine anchor)

| concern | authority (正本) | 導く上流原則 | 出典 |
|---|---|---|---|
| reliability | Google SRE | SLO/エラーバジェット・冗長性・スケーリング・監視の上流指針 | https://sre.google/books/ |
| operations | Google SRE | 運用手順・障害対応・トイル削減・ポストモーテムの上流指針 | https://sre.google/workbook/ |

- 本章の確定内容 (質疑録) は上記 authority を上流指針として適用する。具体技術の選定はこの指針に従属し、指針との乖離は再オープン (R4-reopen) の根拠になる。

## 適用された設計知識

### Site Reliability Engineering — deep knowledge card

- 出典カード: `ref-system-design-knowledge/references/site-reliability-engineering.md`

#### 目的

実行基盤・環境・リソースの構成を、目標信頼性 (SLO) と運用負荷の観点から選び、稼働中の状態を観測して是正できる形にする。

#### 解決する問題

- 目標信頼性が未定義のまま冗長化・監視を積み、費用と運用負荷だけが増える。
- 環境 (本番/検証/ローカル) の差分が人の記憶に残り、本番でのみ再現する障害が生まれる。
- 稼働中の構成 (環境変数・binding・シークレット) を外から確認できず、障害時に仮説を検証できない。
- 復旧手順が実行されたことのない文書として存在し、実際の障害時に機能しない。
- 手作業の運用 (トイル) が担当者に固定化され、人の交代で運用品質が落ちる。

#### 適用条件

- 利用者に対する可用性・遅延の期待があり、逸脱を検知して是正する責任を負う。
- 環境が複数あり (本番・検証・ローカル)、差分が事故要因になり得る。
- 観測・デプロイ・復旧を自動化する余地があり、運用担当が継続的に関与する。

#### 非適用条件

- 利用者も稼働期間も限定された使い捨て環境に、SLO 運用とエラーバジェット会計を先行適用しない。
- 実測データが無い段階で SLO を数値確定しない (暫定値であることを明示して観測から始める)。
- マネージド基盤が既に保証している性質を、自前の冗長化で二重化しない (責任分界点を先に確認する)。

#### トレードオフ・失敗モード

- SLO を高く置きすぎ、変更速度と費用を不必要に犠牲にする。
- 監視項目を増やすこと自体を目的化し、誰も見ないダッシュボードとアラート疲れを生む。
- Infrastructure as Code を導入しても本番へ手作業変更を許し、宣言と実体が乖離する (drift)。
- 復旧手順を一度も実行せず、実際の障害時に前提条件の欠落が判明する。
- 稼働中ビルドの素性を確認する手段を用意せず、「コードは直っている」と「本番が直っている」を区別できなくなる。

#### goalへの寄与

- 基盤選定の判断を、製品名の比較ではなく目標指標への寄与として記述でき、後から根拠を検証できる。
- エラーバジェットにより、機能追加と安定化の優先順位を都度の力関係でなく事前合意で決められる。
- 稼働実体の観測手段を要件に含めることで、障害の切り分け時間を短縮し、原因究明のラウンド数を減らす。

---

#### 本章での適用

##### 確定内容 qa-187 (対応セル: web)

- 確定要件: 候補 (2) を『公式記述で機序として成立することが確認された候補』へ格上げする。ただし本番でそれが起きたとは断定しない。qa-183-b の方針 (断定の強さと根拠の強さを揃える) を維持する。

[qa-187-a 公式記述で確認できたこと] C08 が Cloudflare 公式 Workers Best Practices (developers.cloudflare.com/workers/best-practices/workers-best-practices/) から次を確認した: binding だけを変更しコードを変更しない deploy では、Cloudflare は実行中の isolate を**再利用することがある** (コードを再ロードせずに環境変数や binding を差し替えられるため)。その結果、env から取得した値を global scope のインスタンスへ保持していると、基盤の binding が変わっても **stale な値のまま持続し得る**。公式が示す正しい形は『リクエストごとに新しいインスタンスを作る』ことである。あわせて process ドキュメント (developers.cloudflare.com/workers/runtime-apis/nodejs/process/) 側から、lazy populate が **process への最初のアクセス時点**で行われること、すなわち isolate 生存期間内で一度きりであり投入有無を再評価しないことを確認した。

[qa-187-b これは E-2 の直接根拠である] middleware.ts:26-35 は module 最上位で `process.env.AUTH_SESSION_SECRET` を一度だけ読み、その値で `authAdapter` を構築して module scope に保持する。module 最上位は isolate 起動ごとに 1 回しか評価されない (isolate は per-request ではない)。したがってこの形は、**公式が名指しで警告している anti-pattern と構造的に一致する**。ある isolate が secret 未投入の時点で最初に process へ触れて undefined を populate すると、その後 secret を投入しても、その deploy が binding のみの変更であれば同じ isolate が再利用され、deny-all 版の authAdapter が使われ続ける。isolate が evict されるまで解消しない。
E-2 (環境値の読み出しを吸収層へ一本化し、request context 内で解決する) は、これまで『Workers が request context 外の I/O を許可しない』という一般則に接地していたが、本 turn 以降は **binding 変更 deploy と isolate 再利用という具体的な機序**にも接地する。根拠が 1 本増えたのであって、置き換わったのではない。

[qa-187-c それでも原因を断定しない理由] 公式記述が保証するのは『この機序が成立し得る』ところまでである。報告症状が実際にこの経路で起きたと言うには、当該 isolate の生成時刻と secret 投入時刻の前後関係という**本番の実測データ**が要る。本セッションでは本番への観測が許諾されておらず、この前後関係は取得できていない。よって候補 (2) は『機序として確認済み・実際の発生は未確認』の強さで記録し、候補 (1) 未ゲート経路・候補 (3) 認証以外の原因も引き続き残す。

[qa-187-d 仕様に加えるもの] E-2 の acceptance に「認証に関わる構築物が module scope に保持されず、request ごとに解決される」を明示する。V6 の検査点に「module 最上位での環境値依存構築の検出」を含める (これは既に E-1 の検査だが、isolate 再利用という**失敗の帰結**を検査の説明文へ書き添える。検査が何を防いでいるか読めないと、将来この検査は『厳しすぎる』として緩められる)。
- 設計原則の採否根拠: (legacy_exempt — design-app contract 制定前の 確定であり遡及記録は不能。免除の根拠は spec-state.legacy_migration。理由: モック harness-studio-v2 の UI/UX 反映に伴い ui-ux/frontend/backend/database の web セルを再確定する必要があるが、legacy 1.0 + 確定セルで全 writer 経路が到達不能だったため。既存 225 qa entry は design-app contract 制定前の記録であり遡及適用不能なので legacy_exempt として明示記録する (schema 1.0 時代に validator が暗黙免除していた範囲と同一)。)
##### 確定内容 qa-043 (対応セル: desktop-windows, desktop-macos)

- 確定要件: 既確定の qa-003 / qa-010 / qa-034 / qa-039 / qa-041 の desktop 該当部分を infrastructure.desktop の専用正本として集約確定する。(1) 配布経路 (qa-003): Publisher / Skill の作者環境への配布は URL 型 marketplace (native source) または Bootstrap Installer の 2 経路を Stage 0 technical gate (H7) で検証し、成立した経路を採用する (一般利用者に GitHub アカウントを要求しない = I6)。(2) 実行形態 (qa-010): 専用 desktop GUI は作らず、Publisher core は TypeScript (Node + pnpm) で実装し Claude Code / Codex plugin (slash command /harness-hub:publish + skill + スクリプト) として配布する。target=web_app の出口は作者 local session での wrangler CLI スクリプト実行 (I5。Hub は URL 登録・公開範囲検査・health 確認のみ)。(3) ツールチェーン (qa-039): 作者/提供者環境は macOS 主・Windows 従で、Claude Code + pnpm (corepack 経由・他パッケージマネージャ禁止) + git + wrangler CLI。両 OS で同一の pnpm script が動作すること (パス区切り・改行コード・シェル依存をコマンドへ埋め込まない)。ローカルは preview 用 Turso または local SQLite を binding し production DB を指さない。production への deploy/migration の正本経路は CI (緊急時のみローカル + 事後記録)。(4) 資格情報基盤 (qa-041): Device Flow token は OS 資格情報域 (macOS Keychain / Windows Credential Manager) のみに保存。(5) 環境・binding の詳細正本は docs/infrastructure-spec.md (qa-034)、desktop 側の運用規律は dev-workflow (qa-039) と security (qa-041) の各確定に従属し、本 qa は infrastructure.desktop 行への接地点を提供する。
- 設計原則の採否根拠: (legacy_exempt — design-app contract 制定前の 確定であり遡及記録は不能。免除の根拠は spec-state.legacy_migration。理由: モック harness-studio-v2 の UI/UX 反映に伴い ui-ux/frontend/backend/database の web セルを再確定する必要があるが、legacy 1.0 + 確定セルで全 writer 経路が到達不能だったため。既存 225 qa entry は design-app contract 制定前の記録であり遡及適用不能なので legacy_exempt として明示記録する (schema 1.0 時代に validator が暗黙免除していた範囲と同一)。)
- 資するゴール: G1, G4, G5, G2

## 最新ドキュメント出典

- (このカテゴリに割り当てた取得済みドキュメントなし。全体出典は index.md 参照)
