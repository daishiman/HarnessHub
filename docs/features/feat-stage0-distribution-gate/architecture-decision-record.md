---
status: confirmed
layer: architecture-decision
task: SYS-STAGE0-DISTRIBUTION-GATE-P02
parent_feature: feat-stage0-distribution-gate
feature_package_id: feature-package/feat-stage0-distribution-gate
source: docs/features/feat-stage0-distribution-gate/requirements-baseline.md
feature_context_digest: sha256:6b7340ade5290ee9e3c5bb63d22d3381684b28817303152c6240906ff050fb0a
architecture_refs: [arch-harness-hub-infrastructure]
cli_observed_version: "2.1.215"
cli_observed_at: "2026-07-20T13:05:00Z"
revision: 2
revision_reason: "P03 独立レビュー (design-review-notes.md) の F-1/F-7/F-13/F-15 ほか全 findings を反映"
---

# feat-stage0-distribution-gate アーキテクチャ決定記録 (ADR)

> **位置づけ**: P02 の成果物。[requirements-baseline.md](./requirements-baseline.md) が確定した受入基準 A1-A3 と品質制約 8 件を、**実行可能な検証方式**へ落とす 5 件の architecture decision を記録する。P03 が本文書を独立レビューし、P04 が本文書の方式から test ID を起こし、P05 が artifact を作り、P06 が実行する。
>
> 本文書は baseline を上書きしない。baseline §7 (Normative closure) の fail-closed 契約は本文書にもそのまま作用する。

## 0. 事実基盤 (この ADR が依拠する実測と正本)

| # | 事実 | 出所 | 種別 |
|---|---|---|---|
| F1 | marketplace は `.claude-plugin/marketplace.json` で定義し、GitHub `owner/repo`・git URL・marketplace.json への remote URL・ローカルパスで追加できる (URL はスキーム必須・https) | `system-spec/fetched-references.json` claude-code-plugins entry | 正本 (fact) |
| F2 | remote URL 型では marketplace.json しか取得されないため、**相対パス source の plugin 本体は解決不能**。plugin 本体 source は外部 source が必要 | 同上 | 正本 (fact) |
| F3 | source type は `github`・git URL・`git-subdir` に加え **`npm` も許可**されている | 同上 | 正本 (fact) |
| F4 | 手元 CLI は **v2.1.215**。`claude plugin marketplace {add,list,remove,update}` と `claude plugin {install,list,enable,disable,details}` が実在する (`--help` で実測) | 本 ADR 作成時の実測 (2026-07-20) | 実測 (fact) |
| F5 | 正本の挙動 anchor は v2.1.196 時点の記録。CLI は高頻度リリースのため再照合が必要 | `system-spec/fetched-references.json` 鮮度注意 | 正本 (fact) |
| F6 | 本リポジトリのパッケージマネージャは **pnpm のみ (npm 不使用)**。手元 pnpm は 10.19.0、正本記録は 11.15.0 | `system-spec/fetched-references.json` pnpm entry / 実測 | 正本 + 実測 |

**F5 に対する P02 の判断**: 正本の anchor (v2.1.196) と実行環境 (v2.1.215) に version drift がある。本 ADR は **正本の記述を実測 F4 で裏取りできた範囲のみ確定扱い**とし、裏取りできない挙動 (例: npm source の実解決) は P06 の実行結果を一次証拠とする。この方針により、drift があっても ADR を差し戻さずに済む。

**F6 に対する P02 の判断 (用語の分離)**: 「npm source」は marketplace.json の `source.type` の**スキーマ値**であり、npm レジストリから取得する配布経路の名前である。これはパッケージマネージャ CLI の選択とは別軸であり、`pnpm-only-no-npm` 制約と衝突しない。**本 feature で実行するコマンドは全て pnpm 系に統一**し、`npm` CLI は一度も起動しない (D5 で検証手順として固定)。

---

## D1. URL 型 marketplace 検証方式

**決定**: remote URL 型 marketplace を、**marketplace.json 単体を https で配信し、plugin 本体は外部 source で解決させる**構成で検証する。

**根拠**: F2 により、remote URL 型では marketplace.json しか取得されない。したがって「marketplace.json 内の source を相対パスにする」構成は**原理的に成立しない**ことが正本から既知である。検証の目的は「成立しない構成を再確認すること」ではなく「成立する構成を確定すること」なので、最初から外部 source を前提に置く。

**検証構成**:
- 配信: **`raw.githubusercontent.com` に確定**する (GitHub Pages は選ばない)。理由: 本リポジトリ `daishiman/HarnessHub` は PUBLIC (実測) であり、追加のビルド・デプロイ手順なしに既存ファイルがそのまま https 配信されるため、C1 (手順数最小) と C2 (費用ゼロ) の両方で優位。GitHub Pages は反映遅延とビルド設定を持ち込む
- **切り分け証跡の必須化**: CLI 実行の前に、対象 URL への素の HTTP 取得結果 (**status code と Content-Type**) を記録する。`raw.githubusercontent.com` は `text/plain` を返すため、CLI が失敗した場合に「配信の問題」なのか「CLI 側の非対応」なのかを切り分けられなければ、失敗の解釈が推測になる。この記録は P06 の必須証跡とする
- marketplace.json の plugin source: D2 (npm) または `github` 型を指定する
- 実行: `claude plugin marketplace add <https://.../marketplace.json>` → `claude plugin marketplace list` → `claude plugin install <plugin>@<marketplace>` → `claude plugin list`

**canonical path 名**: `url-marketplace`。baseline §4.2 A1 の 2 経路のうち 1 件を担う。

**反証条件 (この決定が誤りだと分かる観測)**: remote URL 型で marketplace.json 取得自体が失敗する、または外部 source 指定でも plugin 本体が解決できない場合。

**反証条件が成立した場合の扱い (経路の組み替えを禁じる)**: D1 不成立時は **A1 を「充足不能」として fail を記録**する。`github` 型直接指定などを canonical path へ昇格させる組み替えを本 ADR 内で行ってはならない。baseline §4.2 は canonical path を `url-marketplace` / `bootstrap-installer` の 2 件に固定し、「本表の条件を緩める変更は baseline の改訂を要し、P06 以降の phase 単独では行えない」と明記している。canonical path 集合の変更は baseline (P01) の改訂に相当するため、**dev-graph へ差し戻す**。ADR がここで組み替えを許すと、baseline が qa-003 に基づいて塞いだ「経路を数え直して緑化する」抜け道が D1 側から復活する。

---

## D2. npm source の検証方式 (URL 型 marketplace 経路内の source type として)

**決定**: npm source を **`url-marketplace` 経路の source type variant** として検証し、**独立した canonical path として数えない**。

**根拠**: baseline §6 `stage0-two-path-distribution-technical-gate-h7-qa003` が「npm source は URL 型 marketplace 経路内の source type として扱う」と定めている。これを独立経路に数えると、`url-marketplace` + `npm` の 2 件成功で A1 を満たしてしまい、**Bootstrap Installer 未検証のまま H7 ゲートが緑化する**。baseline §4.2 A1 はこの抜け道を明示的に塞いでいる。

**検証構成**:
- 検証用パッケージを **`pnpm pack`** で tarball 化する (npm CLI は使わない / F6)
- レジストリ公開を伴う検証は C2 (費用ゼロ) の範囲で行う。公開が無料枠で完結しない場合は**公開せず、`pnpm pack` 成果物と marketplace.json の `source.type=npm` 記述の妥当性確認までを検証範囲とし、未到達部分を明示的に fail として記録する** (成功を装わない)
- 実行: marketplace.json に `"source": {"type": "npm", ...}` を記述し、D1 の手順で install を試みる

**記録規約**: npm source の結果は `url-marketplace` 経路の**内訳証跡**として test-run-results に残す。A1 の充足数には加算しない。

**反証条件**: F3 (npm が許可 source type である) が v2.1.215 で成立しない場合。その場合は npm source を検証対象から外し、正本 `fetched-references.json` の該当記述の訂正を C02 へ差し戻す。

---

## D3. Bootstrap Installer 試作方式

**決定**: Bootstrap Installer を **「plugin/marketplace の登録を代行する最小スクリプト」** として試作する。CLI 本体の再実装や独自パッケージ形式は作らない。

**根拠**: 本 feature は検証 feature であり、P05 の成果物は「本番相当のコードではなく検証用 artifact」と正本が定めている。C1 (提供者 1 名 + AI) が保守できる最小構成であることが経路選定の最優先基準 (baseline §6 `solo-operator-ai-assisted-verification-c1`)。

**経路独立性の要件 (最重要)**: bootstrap-installer が add する marketplace source は、**D1 と別種の source 型でなければならない**。具体的には **`github` 型の `owner/repo` 直接指定**を用いる (D1 は remote URL 型)。

この制約を課す理由: bootstrap-installer が D1 と同じ remote URL 型を add するだけなら、両経路は同一の取得・解決機構を共有するため **url-marketplace が成功すれば必ず成功し、失敗すれば必ず失敗する (共成立・共倒れ)**。この構成では `distinct canonical path 数 ≥ 2` という A1 の判定が形式的には満たされても、**「配布経路が 2 つ独立に成立する」という qa-003 の 2 経路検証の意図を満たさない**。D2 で塞いだ「経路の数え方による緑化」と同型の抜け道が D3 側から復活する。

**検証構成**:
- 形式: POSIX sh スクリプト (macOS) と PowerShell スクリプト (Windows) の 2 本。**同一の登録手順を両 OS で再現**することが目的
- **単一スクリプト案を退けた理由**: D5 の優先度基準「OS 分岐の少なさ」を機械的に適用すれば Node スクリプト 1 本が有利になる。しかし Bootstrap Installer は **`claude` CLI すら未導入の作者環境で最初に走る**ものであり、その時点で Node/pnpm の存在は保証されない。OS 標準シェル (macOS の sh / Windows の PowerShell) のみに依存する 2 本構成の方が前提が少なく、C1 の「前提の少なさ = 保守性」で優位と判断した。この判断は既定の踏襲ではなく、Node 非依存性を理由とする明示的な選択である
- 責務: (a) `claude` CLI の存在確認、(b) `claude plugin marketplace add <owner/repo>` の実行 (github 型)、(c) `claude plugin install` の実行、(d) 検証可能な終了コードと標準出力の生成
- 非責務: plugin 本体の同梱、CLI の自動インストール、権限昇格
- 冪等性 (何回実行しても結果が同じになる性質): 既に登録済みの場合も exit 0 で終わる

**canonical path 名**: `bootstrap-installer`。A1 の 2 経路のうち 1 件を担う。

**反証条件**: 両 OS で同一手順が再現できない (例: PowerShell 側で CLI の解決方法が本質的に異なる) 場合。

**反証条件が成立した場合の扱い (減点の具体化)**: OS ごとに手順が分岐した時点で、D5 の gate 通過後の順位付けにおいて **bootstrap-installer は url-marketplace に対して優先度 1 (C1) で劣後する**ものとして扱う。D1 は OS 分岐ゼロ (同一コマンド列) であるのに対し、分岐した bootstrap-installer は作者環境ごとに別手順の保守が必要になるためである。「保守コスト増を反映する」という定性表現ではこの帰結が運用できないため、順位の結論まで固定する。

---

## D4. macOS/Windows 実機 E2E 手順

**決定**: 実機 E2E を **「隔離した CLAUDE_CONFIG_DIR 上で、install → 列挙 → 実行 の 3 点を確認する」** 手順に固定する。

**根拠**: baseline §4.2 A3 が「install の exit code 0 のみを pass 根拠にしてはならない」と定めている (「入るが使えない」状態を通過させないため)。また検証が作者の実環境 (`~/.claude`) を汚染すると、検証の再実行性が失われ C1 の運用負荷が上がる。

**モデル化するシナリオの定義**: A3 が模すのは **「新規作者の素の PC への配布」** である。隔離環境は user レベルの既存設定・既存 plugin が不在になるため、実環境の既存設定に助けられて通ってしまう偽陽性を防げる。一方で **既存環境への追加時の名前衝突・設定競合は本 feature の検証範囲外**とする。H7 の目的 (Publisher/Skill を作者環境へ配布できるか) からすれば前者が主である。

**手順 (両 OS 共通)**:
0. **(Windows で最初に実行) 認証維持の確認** — 隔離した `CLAUDE_CONFIG_DIR` 下でセッションが認証されるかを先に確認する。macOS は認証情報が Keychain 側にあり隔離しても認証が落ちない (実測ベース、確度: 高) が、**Windows は設定ディレクトリ配下のファイルに置かれる可能性がある (推測、確度: 中)**。落ちる場合、手順 5 が実行不能になり A3(c) を直接ブロックする
1. `CLAUDE_CONFIG_DIR` を検証専用の一時ディレクトリへ向ける
2. 対象 URL への素の HTTP 取得 (status / Content-Type) を記録する (D1 の切り分け証跡)
3. `claude plugin marketplace add <source>` — exit code と出力を記録
4. `claude plugin install <plugin>@<marketplace>` — exit code と出力を記録
5. `claude plugin list` **および `claude plugin details <plugin>`** で対象 skill が**列挙される**ことを確認 (A3-b)。`list` は plugin 単位の列挙であり「plugin は入ったが skill が読み込まれていない」状態を素通しし得るため、component inventory を出す `details` の出力を判定素材に含める
6. 当該 skill を実行し**期待出力が得られる**ことを確認 (A3-c)
7. 一時ディレクトリを破棄し、`~/.claude` に変更が無いことを確認する。**確認方法**: 実行前後で `~/.claude` 直下のファイル一覧とサイズを取得して比較し、差分ゼロを判定条件とする。あわせて「隔離先には `.claude.json` 等が生成される / 実環境には生成されない」の対比を証跡に残す

**認証が落ちた場合のフォールバック (手順 0 の結果に応じて発動)**: `CLAUDE_CONFIG_DIR` による設定ディレクトリごとの差し替えをやめ、**`claude plugin install --scope project|local`** によるインストール先の限定へ切り替える。これにより認証と実環境の忠実性を保ったまま `~/.claude` の汚染を避けられる。切り替えた場合は手順 7 の確認対象も `--scope` の作用範囲に合わせて読み替える。

**対象 OS**: macOS + Windows のみ。desktop Linux は baseline §6 `author-environment-macos-windows-linux-out-of-scope-qa001` により対象外。

**Windows 実機の調達 (C2 との関係)**: 本 ADR 作成時点の実行環境に Windows 実機は存在しない。**有償の Windows VM / CI 分単位課金を購入して調達することは C2 (固定費ゼロ・無料枠優先) に抵触するため採らない**。調達手段は (a) 作者が保有する Windows 実機、(b) GitHub Actions の `windows-latest` ランナー (public リポジトリは無料枠) のいずれかに限る。いずれも用意できない場合、A3 は **`blocked`** となり baseline §7.2 により P07/P10/P13 が fail-closed になる。**この blocked を pass に読み替えてはならない。**

**未達時の扱い**: いずれかの OS で手順が実行できない場合、その OS の結果は **`blocked` として記録し `pass` にしない**。baseline §7.2 により A3 未達は P07/P10/P13 を fail-closed にする。

**反証条件**: `CLAUDE_CONFIG_DIR` による隔離が効かず実環境を参照してしまう場合。なお macOS における marketplace 列挙の隔離は実測で確認済み (隔離下 `No marketplaces configured` / 実環境 3 件) であり、この反証条件は少なくとも macOS の marketplace 列挙については既に否定されている。

---

## D5. decision record 登録経路と採用判定基準

**決定**: 採用経路の decision record は **C01 単一 writer (`plugins/system-spec-harness/skills/run-system-spec-elicit/scripts/apply-spec-transition.py set-decision`) 経由でのみ** `system-spec/spec-state.json` の `decisions[]` へ登録する。判定は下表の基準で行う。

**根拠**: baseline §7.1 の単一 writer 契約。`spec-state.json` の直接編集は経路違反として拒否される。

**採用判定基準 (2 段構造: gate を通った経路だけを順位付ける)**:

**第 1 段 — gate (満たさない経路は採用候補から除外する。順位付けの対象にしない)**

| gate | 内容 | 根拠 |
|---|---|---|
| G-OS | macOS **および** Windows の両方で D4 の 3 点 (install / 列挙 / 実行) が成立すること | baseline §4.2 A3 が Windows での 3 点成立を必須とし、§6 `author-environment-macos-windows-linux-out-of-scope-qa001` が対象環境を macOS + Windows と定める |

> qa-001 は「対象環境の足切り条件」であって経路同士を比較する重み付き評価軸ではない。これを順位 3 の評価軸として扱うと「C1・C2 が高得点なので Windows で動かない経路を採用する」という A3 と正面から矛盾する判定が形式上可能になるため、gate として分離する。

**第 2 段 — 順位付け (gate 通過経路が複数ある場合)**

| 順位 | 基準 | 根拠 |
|---|---|---|
| 1 | **C1 適合** — 提供者 1 名 + AI で保守できるか。手順数・OS 分岐の少なさ | baseline §6 `solo-operator-ai-assisted-verification-c1` (運用負荷と保守性を最優先基準と明記) |
| 2 | **C2 適合** — 無料枠内で完結するか。有償プラン契約を要さないか | baseline §6 `cost-zero-verification-within-free-tier-c2` |
| T | **(タイブレークのみ)** 非エンジニア作者の実行可能性 — CLI 知識をどれだけ要求するか | **正本の制約ではなく本 ADR が追加した補助基準**。順位 1・2 が同点の場合に限り適用する |

**登録内容の形式 (C01 writer の実入力契約に準拠)**: `apply-spec-transition.py set-decision` (L606-L700) の実装を読んで確認した必須制約は以下であり、「D1-D6 と同形式」という記述だけでは登録できない。

| # | writer の必須制約 | 本 feature での充足方法 |
|---|---|---|
| 1 | **decision id は既存と衝突しないこと** | `decisions[]` は D1-D6 が使用済み (実測)。本 feature の decision id は **`D7`** とする |
| 2 | `serves_goals` 非空かつ実在 goal (G1-G5) を指す | 配布経路の成立は「非エンジニア作者が代理作業なしで公開できる」ことの前提なので **G1** を指す。同僚が追加・利用する経路でもあるため **G2** を併記する |
| 3 | `options` は **2 件以上 3 件以下** | canonical path 2 件 (`url-marketplace` / `bootstrap-installer`) を option とする。**1 経路しか成立しなかった場合でも 2 件必要**なため、不成立経路も option として cons/risks に不成立事実を書いて含める |
| 4 | 各 option に `id/label/cost_model/free_tier_limits/goal_fit/security_fit/pros/cons/risks/lock_in/ops_burden/evidence_refs` が全件必須 | P06 の実機結果から機械的に埋める |
| 5 | `option.evidence_refs` は **公式 https URL 必須** | **実機検証記録はローカルパスなので `evidence_refs` に入れられない**。ここには公式ドキュメント URL (`https://code.claude.com/docs/en/plugin-marketplaces` 等) を置き、**実機検証記録は `recommendation.rationale` / `caveats` (自由文) に記載する** |
| 6 | options に `free` または `low-cost` の `cost_model` が最低 1 件 | 両経路とも無料枠内 (C2) なので `free` を指定できる |
| 7 | `recommendation` に `option_id/rationale/caveats/confidence/latest_checked_at` + `comparison_basis` の 5 軸 (`goal_fit/tco/security/operations/lock_in`) 必須。`latest_checked_at` は RFC3339 | P13 が実行時刻を実測して埋める |
| 8 | `status=confirmed` には **`user_decision` (option_id + RFC3339 の confirmed_at) が必須**。AI 推奨だけで confirmed にすると明示的に拒否される | **P13 は作者本人の確認を取る対話ステップを含む**。これが抜けると `TransitionError` で止まる。A2 は `status==confirmed` を要求するため回避不可 |

**receipt の生成手順 (自己申告を検証可能にする)**: `apply-spec-transition.py` は receipt を出力せず、更新後の state を書くだけである (実装確認済み)。したがって `.dev-graph/cache/stage0-decision-registration-receipt.json` は P13 が生成する。**値を手入力してはならない**。writer 実行の直後に `system-spec/spec-state.json` を再読込して sha256 を**実測**し、その値を after digest として書き込む決定論的手順で生成する。baseline §4.2 A2 の (iii) が「receipt の digest と実ファイルの実測 sha256 の一致」を要求しているため、手書きで捏造しても照合で落ちる。P04 はこの生成手順自体を test ID の対象とする。

**登録の前提 (fail-closed)**: baseline §7.2 により、A1-A3 が揃うまで D5 の登録は実行しない。「登録予定」を P07 の pass 根拠にはできない。

**反証条件**: 上表 1-8 を満たしてなお `set-decision` が拒否する場合に限り、C01 側の入力契約を再確認する。**上表 1-8 はいずれも writer を変更せず入力側で充足できる**ため、これらの不足を理由に writer の内部実装変更や dev-graph への差し戻しを行ってはならない。

---

## 6. 決定と受入基準の対応

| decision | 対応 acceptance | 対応 scope_in | 実行 phase |
|---|---|---|---|
| D1 URL 型 marketplace 検証方式 | A1 | S1 | P05 → P06 |
| D2 npm source 検証方式 | A1 (内訳証跡) | S2 | P05 → P06 |
| D3 Bootstrap Installer 試作方式 | A1 | S3 | P05 → P06 |
| D4 実機 E2E 手順 | A1, A3 | S4 | P06 |
| D5 decision record 登録経路 | A2 | S5 | P13 |

未対応の acceptance / scope_in: **なし** (A1-A3・S1-S5 を全件被覆)。

## 7. P03 独立レビューへの対応 (改訂 2026-07-21)

P03 (`design-review-notes.md`) は D1-D5 を全件 CONDITIONAL と判定し、うち 3 件を差し戻し必須とした。**指摘は全件、正本または実装で裏付けが取れたため受け入れ、本 ADR を改訂した。** 対応は下表のとおり。

| finding | 指摘の要旨 | 本 ADR での対応 |
|---|---|---|
| F-1 (差し戻し必須) | D1 の反証条件が `github` 型を canonical path へ昇格させており、baseline §4.2 を ADR が単独改訂している | D1 に「反証条件が成立した場合の扱い」節を追加。組み替えを禁じ、A1 充足不能として fail 記録 + dev-graph 差し戻しに変更 |
| F-2 | 配信先が未確定で失敗モードを切り分けられない | D1 で `raw.githubusercontent.com` に確定。HTTP status / Content-Type の記録を P06 必須証跡に追加 |
| F-7 (差し戻し必須) | bootstrap-installer が D1 と同 source なら共成立・共倒れで 2 経路の独立性がない | D3 冒頭に「経路独立性の要件」を新設。bootstrap-installer は `github` 型 (`owner/repo` 直接指定) と明記し D1 の remote URL 型と別種にした |
| F-8 | sh + PowerShell 2 本の選択根拠が ADR 自身の C1 基準と整合していない。減点量が未定義 | D3 に「単一スクリプト案を退けた理由」(Node 非依存性) を明記。減点を「優先度 1 で url-marketplace に劣後」と結論まで固定 |
| F-9 | 隔離が模すシナリオが未定義 | D4 に「モデル化するシナリオの定義」を新設。新規作者の素の PC を主とし、既存環境の名前衝突は範囲外と明示 |
| F-10 | Windows で隔離すると認証が落ち A3(c) が実行不能になり得る。`--scope` の選択肢が未検討 | D4 に手順 0 (認証維持の先行確認) と `--scope project\|local` フォールバックを追加 |
| F-11 | 手順「変更が無いことを確認」に検証手段がない | D4 手順 7 にファイル一覧 + サイズの前後比較という判定方法を明記 |
| F-12 | `claude plugin list` は skill 単位の列挙証跡として弱い | D4 手順 5 に `claude plugin details` を追加 |
| F-13 (差し戻し必須) | 「D1-D6 と同形式」では writer が受け付けない。実装の必須制約は大幅に厳しい | D5 の「登録内容の形式」を writer 実装準拠の 8 項目表へ全面置換。特に `evidence_refs` は https URL 必須のため実機検証記録は `recommendation.rationale`/`caveats` へ置くと明記 |
| F-14 | writer は receipt を出力しないため receipt が自己申告になる | D5 に「receipt の生成手順」を新設。writer 実行直後に spec-state を再読込して sha256 を実測する決定論的手順を規定し、手入力を禁止 |
| F-15 (差し戻し必須) | 両 OS 再現性は評価軸でなく gate。優先 4 は正本にない基準 | D5 の判定表を gate (G-OS) + 順位 (C1 → C2) + タイブレーク の 2 段構造へ組み替え。補助基準であることを明記 |

**本 ADR が P03 の指摘に加えて自ら発見した事項**: `system-spec/spec-state.json` の `decisions[]` は **D1-D6 が使用済み**であり、本 feature の decision id を D1-D6 のいずれかにすると既存 decision を上書きしてしまう (`set-decision` は id 単位 upsert)。D5 の表 #1 に **id は `D7`** と固定した。

## 8. 検証

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/plans/feature-package-feat-stage0-distribution-gate`
- Required evidence: 本文書に 5 件の architecture decision (D1-D5) が過不足なく記載されていること → §6 の対応表で確認可能
- 本文書の rollback trigger: F5 の再照合で npm source の前提が変化した場合、D2 を修正し P03 以降の着手を保留する
