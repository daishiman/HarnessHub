---
status: confirmed
layer: design-review
task: SYS-STAGE0-DISTRIBUTION-GATE-P03
parent_feature: feat-stage0-distribution-gate
feature_package_id: feature-package/feat-stage0-distribution-gate
source: docs/features/feat-stage0-distribution-gate/architecture-decision-record.md
feature_context_digest: sha256:6b7340ade5290ee9e3c5bb63d22d3381684b28817303152c6240906ff050fb0a
architecture_refs: [arch-harness-hub-infrastructure]
reviewer_independence: P02 非著者による独立レビュー
cli_observed_version: "2.1.216"
cli_observed_at: "2026-07-20T22:30:41Z"
---

# feat-stage0-distribution-gate 設計レビュー記録 (P03)

> **位置づけ**: P03 の成果物。[architecture-decision-record.md](./architecture-decision-record.md) (以下 ADR) の 5 決定 D1-D5 を、P02 の著者から独立した立場で検証する。判定の正本は [requirements-baseline.md](./requirements-baseline.md) (以下 baseline)、`system-spec/fetched-references.json`、`system-spec/spec-state.json`、および `plugins/system-spec-harness/skills/run-system-spec-elicit/scripts/apply-spec-transition.py` の実装である。
>
> 本文書は ADR も baseline も上書きしない。baseline §7 (Normative closure) の fail-closed 契約は本文書にも作用する。ADR の主張は原則として正本に当たり直して検算した。**ADR の自己申告 (特に §6 の被覆表) は根拠として採用していない。**

## 0. レビュー方法と、本レビューで新たに得た実測

ADR の記述を鵜呑みにせず、以下を本レビュー時点で独立に実測した。以下はすべて **fact (実測)** である。

| # | 実測内容 | 結果 | 影響する決定 |
|---|---|---|---|
| R1 | `claude --version` | **2.1.216** (ADR の pin は 2.1.215 / 2026-07-20T13:05Z)。**約 9.5 時間で 1 リビジョン進行** | 全決定 (F5 の drift 前提を強化) |
| R2 | `claude plugin --help` | ADR F4 が挙げた 8 コマンドに加え **`validate` / `eval` / `tag` / `uninstall` / `update` / `prune` / `init`** が実在。`validate` は「plugin または marketplace manifest を検証」する | D2 (公開なしで検証可能な手段が存在) |
| R3 | `claude plugin install --help` | **`-s, --scope <user\|project\|local>`** が存在 (既定 `user`) | D4 (隔離手段が CLAUDE_CONFIG_DIR 以外にもある) |
| R4 | `CLAUDE_CONFIG_DIR=<tmp> claude plugin marketplace list` | exit 0 / `No marketplaces configured` を返し、実環境の 5 件超の marketplace が見えない。指定ディレクトリに `.claude.json` と `backups/` が生成された | D4 (**隔離は v2.1.216 で実際に効く**) |
| R5 | 実環境 `~/.claude` の中身 | `.credentials.json` は**存在しない** (macOS は Keychain 保管と整合) | D4 (macOS では隔離しても認証が落ちない) |
| R6 | `pnpm --version` / `npm --version` | pnpm 10.19.0 / npm 10.9.4 (npm CLI 自体は環境に存在する) | D2 (ADR F6 の実測値と一致) |
| R7 | `gh repo view daishiman/HarnessHub` | `isPrivate: false` (**PUBLIC**) | D1 (raw/Pages の無償 https 配信が成立する) |
| R8 | `apply-spec-transition.py` の `set_decision` 実装 (L606-L700) と定数 (L82-L102) | 後述 §D5 の入力契約。ADR の記述より**大幅に厳しい必須項目**を持つ | D5 |
| R9 | `.github/workflows/` および全リポジトリ grep | **Windows ランナー・Windows 実機の調達手段はリポジトリ内のどこにも存在しない** | D3 / D4 (§4) |

正本側の注意点として、`fetched-references.json` の claude-code-plugins エントリは末尾に「本再確認は WebFetch 不可環境のため WebSearch による複数ソース照合。**一次 GET 照合は C02 の follow-up**」と自ら記している。すなわち ADR が「正本 (fact)」と分類した F1-F3 は、**正本の中では一次取得未了の二次照合**である。ADR はこの階層差に触れていない (finding F-9)。

## 1. verdict サマリ

| 決定 | verdict | qa-001 整合 | C1 適合 | C2 適合 | 差し戻し要否 |
|---|---|---|---|---|---|
| D1 URL 型 marketplace 検証方式 | **CONDITIONAL** | 適合 | 適合 | 適合 (R7 で裏取り) | **P02 へ差し戻し必須** (反証条件が baseline 違反) |
| D2 npm source 検証方式 | **CONDITIONAL** | 適合 | 条件付き | 条件付き | P04/P05 への申し送りで解消可 |
| D3 Bootstrap Installer 試作方式 | **CONDITIONAL** | 適合 | **要根拠追記** | 適合 | **P02 へ差し戻し必須** (経路独立性が未定義) |
| D4 実機 E2E 手順 | **CONDITIONAL** | 適合 | 適合 | **未確定** (Windows 実機の調達が未定義) | P04/P05 への申し送り + §4 のエスカレーション |
| D5 decision record 登録経路 | **CONDITIONAL** | 適合 | 適合 | 適合 | **P02 へ差し戻し必須** (writer 入力契約と不整合・優先順位に正本外の混入) |

**FAIL は 1 件もない。** 5 決定はいずれも方向性としては正本に接地しており、決定そのものを差し替える必要はない。ただし D1・D3・D5 には baseline 違反または実行不能に直結する欠落があり、これらは P04 の test 設計に入る前に P02 で補正すべきである。

## 2. 決定別の検証結果

### D1. URL 型 marketplace 検証方式 — CONDITIONAL

**判定根拠 (正本との突き合わせ)**

- **F2 からの導出に飛躍はない。** `fetched-references.json` claude-code-plugins の原文は「remote URL 型では marketplace.json しか取得されないため相対パス source の plugin は解決不能で、**plugin 本体 source は外部 source が必要**」であり、baseline §6 `npm-source-official-support-changelog-recheck-claude-code-plugins` にも同文が転記されている。D1 の「外部 source 前提」はこの原文のほぼ逐語的な帰結であり、推論の追加ステップを含まない。**この点について ADR に飛躍はない (fact)。**
- **qa-001 整合**: D1 は OS 依存の要素を持たない (https 取得 + CLI コマンド)。macOS/Windows 限定と矛盾しない。
- **C1 適合**: 手順は marketplace add → list → install → list の 4 コマンドで、OS 分岐なし。提供者 1 名 + AI で保守可能。
- **C2 適合**: R7 によりリポジトリは PUBLIC。raw.githubusercontent.com / GitHub Pages とも無償で https 配信できるため、C2 は**実測で裏取りできた**。ADR は「無料枠のみ」と書いたが根拠を示していなかった (ADR の記述は結論として正しいが、根拠が欠けていた)。

**F-1 (重大 / 差し戻し必須): D1 の反証条件が baseline §4.2 を単独で改訂している**

ADR D1 の反証条件は「D1 は不成立となり、A1 の充足は D3 (Bootstrap Installer) と **`github` 型直接指定の 2 経路へ組み替える**」と書く。しかし baseline §4.2 A1 は canonical path を `url-marketplace` / `bootstrap-installer` の **2 件に固定**し、さらに §4.2 末尾で「**本表の条件を緩める変更は baseline の改訂を要し、P06 以降の phase 単独では行えない**」と明記している。`github` 型直接指定を canonical path に昇格させる操作は canonical path 集合の変更であり、baseline 改訂に相当する。この反証条件をそのまま P06 が適用すると、baseline が qa-003 に基づいて明示的に塞いだ「経路を数え直して緑化する」抜け道 (ADR 自身が D2 で指摘したのと同型の抜け道) が D1 側から復活する。

**必要な修正**: D1 の反証条件を「D1 不成立の場合、A1 は**充足不能**として fail を記録し、canonical path の再定義は baseline (P01) の改訂として dev-graph へ差し戻す」に書き換える。組み替えを ADR 内で完結させない。

**F-2 (中 / P05 申し送り): 配信先が未確定で、失敗モードが判定条件に落ちていない**

「GitHub Pages / raw.githubusercontent.com など」と選択が開いたままである。この 2 者は Content-Type (raw は `text/plain`)・キャッシュ挙動・反映遅延が異なる。CLI が marketplace.json 取得時に Content-Type を検査するかは正本にも `--help` にも記載がなく、**未確認 (推測、確度: 低〜中)**。P05 が配信先を 1 つに確定し、失敗時に「配信の問題」と「CLI 側の非対応」を切り分けられるよう、取得 URL に対する素の HTTP 取得結果 (status / Content-Type) を証跡に含めることを求める。

### D2. npm source の検証方式 — CONDITIONAL

**F-3 (肯定的所見): 「npm を独立経路に数えない」判断は正本に完全整合しており、かつ A1 を達成不能にしていない**

本レビューで重点的に疑うよう指示された論点だが、独立検算の結果 **問題なし**と判定する。

- baseline §4.2 A1 の原文が「npm source は §6 `stage0-two-path-distribution-technical-gate-h7-qa003` により `url-marketplace` 経路内の source type variant として扱い、**独立経路として数えない**」と明記している。
- qa-003 の転記原文も「npm source (claude-code-plugins 公式サポート確認済み) は **URL 型 marketplace 経路内の source type として扱う**」であり、両者は一致する。
- **厳しすぎて A1 が達成不能になってはいない。** A1 は「`url-marketplace` と `bootstrap-installer` の両方で success 記録 1 件以上」であり、`url-marketplace` の plugin 本体 source は F3 が許す `github` 型で成立させられる。npm source の成否は A1 の分子・分母のどちらにも影響しない。したがって D2 は A1 の達成可能性を一切損なわない (fact)。
- ADR が「これを独立経路に数えると Bootstrap Installer 未検証のまま H7 ゲートが緑化する」と述べた危険の同定も正しい。

**F-4 (重大 / P05 申し送り): `pnpm pack` フォールバックでは npm source の解決を一度も検証できない**

ADR は「レジストリ公開が無料枠で完結しない場合は公開せず、`pnpm pack` 成果物と marketplace.json の記述の妥当性確認までを検証範囲とする」とする。しかし `source.type=npm` はレジストリからの解決を意味するのに対し、`pnpm pack` はローカル tarball を作るだけで、**レジストリ解決経路を 1 バイトも通らない**。このフォールバックが返す証跡は S2 (npm source 検証) に対して実質ゼロである。ADR が未到達部分を fail として記録する方針にしている点は誠実だが、その結果 **S2 が「fail 記録あり」で形式的に消化される**構造になっている。

**必要な修正 (代替案あり)**: R2 で実在を確認した `claude plugin validate <path>` を使えば、**公開を一切伴わずに** `source.type=npm` を含む marketplace manifest が現行 CLI のスキーマ検証を通るかを機械的に確認できる。ADR の「記述の妥当性確認」という曖昧な語をこの実行可能コマンドに置き換えるべきである。これにより S2 は「公開なしでも判定述語を持つ」状態になる。

**F-5 (中): 公開の不可逆性が C1/C2 のどちらの軸でも評価されていない**

ADR は npm レジストリ公開の可否を **費用 (C2) の問題としてのみ**扱っている。しかし公開レジストリへの publish は外向きかつ不可逆に近い操作 (パッケージ名は恒久予約、unpublish には期限と制約がある) であり、検証用の使い捨てパッケージを公開名前空間に残すことは **C1 (提供者 1 名で保守しつづける負荷)** にも効く。ADR にはこの評価軸がない。F-4 の `claude plugin validate` 経路を既定にし、公開はどうしても必要な場合の明示的オプトインとすべきである。

**F-6 (軽微 / 推測 確度: 中): 「npm CLI を一度も起動しない」という主張は検証手段が示されていない**

ADR §0 の F6 判断は「本 feature で実行するコマンドは全て pnpm 系に統一し、`npm` CLI は一度も起動しない」と断言する。ユーザーが打つコマンドについてはそのとおりだが、`claude plugin install` が `source.type=npm` を解決する際に内部でレジストリ取得や npm 実行系を呼ぶ可能性は排除されていない (CLI 内部実装は未確認)。「起動しない」を検証可能な主張にするなら、対象を「**本 feature が明示的に実行するコマンド**」に限定して書くべきである。なお R6 のとおり npm CLI 自体は環境に存在するため、間接起動を環境側で禁止することはできない。

**qa-001 / C1 / C2**: OS 依存要素なし (qa-001 適合)。C1・C2 は F-4/F-5 の修正を条件に適合。

### D3. Bootstrap Installer 試作方式 — CONDITIONAL

**F-7 (最重大 / 差し戻し必須): `bootstrap-installer` が `url-marketplace` の薄いラッパーになり、A1 の「2 経路」が独立性を持たない**

ADR D3 の責務は (a) CLI 存在確認 (b) `claude plugin marketplace add` (c) `claude plugin install` であり、**(b) が何を source に取るかが書かれていない**。D1 と同じ remote URL 型 marketplace を add するのであれば、bootstrap-installer 経路は url-marketplace 経路と同一の取得・解決機構をシェルスクリプトで包んだだけになる。この構成では、

- url-marketplace が成功すれば bootstrap-installer も必ず成功する (共成立)
- url-marketplace が失敗すれば bootstrap-installer も必ず失敗する (共倒れ)

となり、`distinct canonical path 数 ≥ 2` という A1 の判定は形式的には満たされても、**「配布経路が 2 つ独立に成立する」という H7 の検証意図 (qa-003 の 2 経路検証) を満たさない**。これは ADR が D2 で正しく指摘した「経路の数え方による緑化」と同型の抜け道が、D3 側に残っている状態である。

**必要な修正**: D3 に「bootstrap-installer が add する marketplace source の型を D1 と**別種**にする (例: `github` の `owner/repo` 直接指定、またはローカルパス)」を明記する。もし意図的に同一 source を使うのであれば、「本 feature における 2 経路の独立性は**技術的 source の独立ではなく、利用者の実行手段 (手動コマンド列 vs スクリプト一発) の独立を指す**」と定義を明文化し、その定義で qa-003 の意図を満たすと言える根拠を示す。どちらでもよいが、**未定義のまま P05 に渡してはいけない。**

**F-8 (中 / 差し戻し推奨): sh + PowerShell 2 本という選択の根拠が、ADR 自身の C1 基準と整合していない**

C1 適合の観点では、2 本構成それ自体が違反とは言えない。qa-001 が macOS + Windows の両対応を要求する以上、OS ネイティブなシェルで書けば 2 本になるのは自然である。問題は**別の選択肢を検討した形跡がないこと**である。

- ADR D5 の優先度 1 の基準は「手順数・**OS 分岐の少なさ**」である。この基準を D3 に適用すると、単一ファイルで両 OS を賄える実装 (このリポジトリは pnpm/Node を前提としており Node スクリプト 1 本という選択肢がある) の方が高スコアになる。ADR は自らの判定基準を自らの決定に適用していない。
- 2 本構成を選ぶ合理的な反論は存在する (Bootstrap Installer が動く時点で Node の存在は保証されない、`claude` はネイティブバイナリ配布もあり得る、等)。しかし **ADR にはこの反論が書かれていない**ため、判断が保守性最優先 (C1) の帰結なのか単なる既定なのかが読み取れない。

**必要な修正**: 「単一スクリプト案を Node 非依存性の理由で退けた」旨を 1〜2 文で明記する。加えて、反証条件が発動して OS 別 installer になった場合の「保守コスト増を D5 の判定表に反映する」という記述は、**減点の量が定義されていない**ため運用不能である。D5 の優先度 1 で bootstrap-installer が url-marketplace に劣後する、という具体的な帰結まで書くべきである。

**qa-001 適合**: macOS + Windows のみを対象とし desktop Linux 向けを作らない点は qa-001 に整合 (POSIX sh は Linux でも動くが、対象環境として宣言していないので逸脱ではない)。
**C2 適合**: スクリプト 2 本に費用は発生しない。適合。

### D4. macOS/Windows 実機 E2E 手順 — CONDITIONAL

**肯定的所見: 隔離の前提は実測で裏が取れており、A3 の 3 点条件の転記も正確である**

- R4 のとおり、`CLAUDE_CONFIG_DIR` を一時ディレクトリに向けると `claude plugin marketplace list` は実環境の marketplace を一切見せず `No marketplaces configured` を返した。**v2.1.216 において隔離は実際に機能する (fact)。** ADR D4 の反証条件「隔離が効かず実環境を参照してしまう場合」は、少なくとも marketplace 列挙については既に否定されている。
- 手順 4・5 が baseline §4.2 A3 の (b)(c) に 1 対 1 対応しており、「install の exit code 0 のみを pass 根拠にしてはならない」という禁止も D4 に引き継がれている。転記の忠実性に問題はない。

**F-9 に関連する忠実性の評価 (重点確認事項への回答): 隔離は忠実性を「下げる」のではなく、モデル化する対象を変える**

隔離環境では user レベルの `~/.claude/settings.json`・`CLAUDE.md`・既存 plugin・既存 marketplace がすべて不在になる。これは、

- **新規作者の素の PC への配布**を模す観点では**忠実性が上がる** (実環境の既存設定に助けられて通ってしまう偽陽性を防ぐ)
- **既存環境への追加**を模す観点では**忠実性が下がる** (既存 plugin との名前衝突・設定競合を検出できない)

ADR は A3 がどちらのシナリオを表すのかを定義していない。H7 の目的 (Publisher/Skill を作者環境へ配布できるか) からすれば前者が主で、隔離の選択自体は妥当である。**したがって「隔離が忠実性を損なう」という懸念は、シナリオを前者と定義する限り成立しない。** ただし ADR にその定義を書き、「既存環境での名前衝突は本 feature の検証範囲外」と明示すべきである (軽微、申し送り)。

**F-10 (重大 / P05 申し送り): 隔離が Windows の認証を落とす可能性があり、A3(c) が実行不能になり得る**

- R5 のとおり macOS の `~/.claude` に `.credentials.json` は存在せず、認証情報は Keychain 側にあると考えられる。**macOS では `CLAUDE_CONFIG_DIR` を切り替えても認証は落ちない (fact に近い実測ベースの推論、確度: 高)。**
- 一方 Windows では認証情報が設定ディレクトリ配下のファイルに置かれる実装が一般的である (**推測、確度: 中。Windows 実機がないため検証不能**)。もしそうなら、隔離した `CLAUDE_CONFIG_DIR` 下では**セッションが認証されず、手順 5 (skill を実行して期待出力を得る) が実行できない**。A3 は Windows での (c) を必須にしているため、これは A3 を直接ブロックする。
- **代替手段が既に存在する**: R3 のとおり `claude plugin install` は `--scope user|project|local` を持つ。`--scope project` / `local` を使えば、設定ディレクトリごと差し替えずにインストール先だけを検証用に閉じ込められ、認証と実環境の忠実性を保ったまま `~/.claude` の汚染を避けられる可能性がある。ADR はこの選択肢を検討していない。

**必要な修正**: D4 に「Windows では `CLAUDE_CONFIG_DIR` 隔離下で認証が維持されるかを**最初に確認する**。維持されない場合は `--scope` による隔離に切り替える」というフォールバックを明記する。この確認は P06 の最初のステップに置くべきで、E2E 本体の失敗と切り分けられるようにする。

**F-11 (軽微): 手順 6 の「変更が無いことを確認」に検証手段がない**

「一時ディレクトリを破棄し `~/.claude` に変更が無いことを確認」とあるが、確認方法 (実行前後のファイル一覧 hash 比較など) が定義されていない。P04 が判定述語を書けないため、具体化を求める。なお R4 で隔離先に `.claude.json` と `backups/` が生成されたことを確認しているので、「隔離先には生成される / 実環境には生成されない」の対比は現実に取得可能である。

**F-12 (軽微): 手順 4 の `claude plugin list` は A3(b) の下限**

A3(b) は「対象 skill が plugin/skill 一覧へ列挙される」ことを求める。`claude plugin list` は plugin 単位の列挙であり、plugin が入っているが skill が読み込まれていない状態を素通しし得る。R2 で確認した `claude plugin details <name>` は「component inventory」を表示するため、skill 単位の列挙証跡としてより強い。P04 は `details` の出力を A3(b) の判定素材に加えるべきである。

**qa-001 適合**: 対象 OS を macOS + Windows に限定し、desktop Linux を明示的に対象外としており、qa-001 と完全に整合。
**C1 適合**: 6 ステップ・両 OS 共通で、1 名 + AI で回せる。適合。
**C2 適合**: **未確定**。§4 を参照。

### D5. decision record 登録経路と採用判定基準 — CONDITIONAL

**肯定的所見**: 「C01 単一 writer 経由でのみ登録する / `spec-state.json` の直接編集は経路違反」という決定そのものは baseline §7.1 の逐語的帰結であり、正しい。

**F-13 (最重大 / 差し戻し必須): ADR が書いた「登録内容の形式」では writer が実際に受け付けない**

ADR は登録形式を「`decisions[]` の D1-D6 と同形式 (id / question / status / options / 評価軸 / 確定根拠)」とだけ書く。これは baseline §6 の記述をそのまま引き写したものだが、**writer の実装 (`apply-spec-transition.py` L606-L700) を実際に読むと、必須制約はこれより大幅に厳しい**。以下はすべて実装からの fact である。

| # | writer の必須制約 (実装 L) | ADR の記述 | 影響 |
|---|---|---|---|
| 1 | `serves_goals` が非空かつ **G1-G5 の実在 goal を指す**こと (L618-L626) | 記述なし | 未指定なら `TransitionError` |
| 2 | `options` が **2 件以上 3 件以下** (L628-L630) | 記述なし | 経路が 1 つしか成立しなかった場合、単独 option では登録不能 |
| 3 | 各 option に `id/label/cost_model/free_tier_limits/goal_fit/security_fit/pros/cons/risks/lock_in/ops_burden/evidence_refs` が全て必須 (L87-L100, L635-L637) | 記述なし | 配布経路の decision に `cost_model`・`free_tier_limits`・`security_fit` を書く必要がある |
| 4 | `option.evidence_refs` は **公式 https URL 必須** (`_is_https_url`, L645-L647) | 「**実機検証記録への参照を確定根拠に含める**」 | **実機検証記録はローカルパスなので `evidence_refs` に入れられない** |
| 5 | options に `free` または `low-cost` の cost_model が最低 1 件 (L650-L651) | 記述なし | 全 option を `unknown` にはできない |
| 6 | `recommendation` に `option_id/rationale/caveats/confidence/latest_checked_at` + `comparison_basis` の 5 軸 (`goal_fit/tco/security/operations/lock_in`) が必須、`latest_checked_at` は RFC3339 (L653-L670) | 記述なし | 未指定なら登録不能 |
| 7 | `status=confirmed` には **`user_decision` (option_id + RFC3339 の confirmed_at) が必須**。AI 推奨だけで confirmed にすると明示的に拒否される (L672-L684) | 記述なし | **A2 は `status==confirmed` を要求するため、作者本人の確認ステップが P13 に必要** |

**必要な修正**: D5 の「登録内容の形式」を、上表 1-7 を満たす具体的な JSON スケルトン (少なくとも必須キーの列挙) に置き換える。特に #4 は ADR の記述と writer の契約が**正面から衝突**しており、実機検証記録は `evidence_refs` ではなく `recommendation.rationale` / `caveats` (自由文) に置くほかない。#7 は「P13 は作者の確認を取る対話ステップを含む」という手順上の追加要件であり、これが抜けたまま P13 が走ると `TransitionError` で止まる。

なお ADR の反証条件は「`set-decision` が本 feature の decision 形式を受け付けない場合、writer の内部実装変更が必要なら scope out として差し戻す」としているが、上表の 1-7 は**いずれも writer を変更せずに入力側で満たせる**。したがって差し戻しではなく入力形式の具体化で解決すべきであり、反証条件の発動条件としても不正確である。

**F-14 (重大 / P04・P13 申し送り): A2 の 3 条件のうち 2 条件について、生成方式が誰の責務か決まっていない**

baseline §4.2 A2 は (i) receipt の `status==applied` (ii) decision id の完全一致 + `status==confirmed` (iii) receipt の spec-state after digest が現行 `spec-state.json` の実測 sha256 と一致、の AND を要求する。しかし **`apply-spec-transition.py` は receipt を出力しない**。実装は `_emit(state, args.out or args.state)` で更新後の state を書くだけである (fact)。したがって `.dev-graph/cache/stage0-decision-registration-receipt.json` は P13 が自作することになり、**receipt は自己申告 (self-attestation) になる**。

D5 はこの点に一切触れていない。救いは (iii) が「receipt の digest と実ファイルの実測 sha256 の一致」を要求しているため、receipt を手書きで捏造しても digest 照合で落ちる設計になっていることである。**必要な修正**: D5 に「receipt は writer 実行直後に `spec-state.json` を再読込して sha256 を実測する決定論的な手順で生成し、値を手入力しない」ことを明記する。P04 はこの生成手順自体を test ID の対象にすべきである。

**F-15 (重大 / 差し戻し必須): 採用判定基準の優先順位に、正本にない格下げが混入している**

- **優先 1 (C1)** は正本に接地している。baseline §6 `solo-operator-ai-assisted-verification-c1` が「運用負荷の低さ・保守性を経路選定の**最優先基準**とする」と明記しており、これは妥当 (fact)。
- **優先 3 (両 OS 再現性) の位置づけが誤り。** 根拠として挙げられた qa-001 は「実機 E2E の対象作者環境は macOS + Windows のみ」という**対象範囲の制約 (足切り条件)** であり、経路同士を比較する重み付き評価軸ではない。加えて baseline §4.2 A3 は Windows での 3 点成立を**必須**にしている。したがって両 OS 再現性は「優先度 3 の評価軸」ではなく **gate (満たさない経路は採用候補から除外)** として扱うのが正本の構造である。現在の表のままだと、「C1 と C2 で高得点なので Windows で動かない経路を採用する」という、A3 と真っ向から矛盾する判定が形式上可能になる。
- **優先 4 (非エンジニア作者の実行可能性) の根拠が self-declared。** 根拠欄は「本 feature の想定利用者 (作者環境への配布)」であり、baseline §6 の 8 制約のどれも指していない。qa-001 の理由部分に「非エンジニアの業務 PC」という語はあるが、それは desktop Linux を外す理由の説明であって、評価基準として宣言されたものではない。**正本にない基準を優先順位表に入れている (推測ではなく、正本を全文突き合わせた上での fact)。**

**必要な修正**: 表を「**gate (必須充足): 両 OS 再現性 (qa-001 + A3)** → **順位 1: C1** → **順位 2: C2**」の 2 段構造に組み替える。優先 4 は残してよいが、根拠欄を「正本の制約ではなく本 ADR が追加した補助基準」と明記し、上位 2 基準が同点の場合のタイブレークに限定する。

**qa-001 / C1 / C2**: D5 自体は文書登録操作であり OS 非依存 (qa-001 適合)、コマンド 1 回で完結 (C1 適合)、費用ゼロ (C2 適合)。CONDITIONAL の理由は上記 3 件の内容欠落・不整合による。

## 3. 被覆の独立検算 (ADR §6 の自己申告を採用せず再計算)

### 3.1 acceptance / scope_in

ADR §6 の対応表を独立に検算した結果、**A1-A3 と S1-S5 の対応付け自体は正しい**。

| 正本項目 | 対応する決定 | 検算結果 |
|---|---|---|
| A1 (2 経路以上の実機検証記録) | D1 (url-marketplace) + D3 (bootstrap-installer) | 対応あり。ただし **F-7 により 2 経路の独立性が未定義**で、形式的充足と実質的充足が乖離し得る |
| A2 (decision record 登録) | D5 | 対応あり。ただし **F-13/F-14 により実行可能性に欠落** |
| A3 (Windows E2E 成功) | D4 | 対応あり。ただし **F-10 と §4 により実行可能性が未確保** |
| S1 URL 型 marketplace 検証 | D1 | 被覆 |
| S2 npm source 検証 | D2 | **形式的には被覆だが、F-4 により「検証した」と言える下限が定義されていない** |
| S3 Bootstrap Installer 試作 | D3 | 被覆 |
| S4 Windows/macOS 実機 E2E | D4 | 被覆 |
| S5 採用経路の決定記録 | D5 | 被覆 |

### 3.2 baseline §7.3 必須証跡 6 件との突き合わせ (ADR §6 が扱っていない軸)

ADR §6 は「未対応の acceptance / scope_in: **なし**」と結んでいる。この主張は acceptance/scope_in の軸では真である。しかし baseline §7.3 は**必須証跡を 6 件 (E1-E6)** 定めており、§7.2 はそれらが揃うまで feature 完了を fail-closed にする。この軸で検算すると欠落がある。

| 証跡 | 対応する決定 | 検算結果 |
|---|---|---|
| E1 2 経路実機記録 | D1 + D3 + D4 | 被覆 |
| E2 Windows/macOS 実機 E2E | D4 | 被覆 |
| E3 C01 writer receipt (`status=applied`) | D5 | 部分的 (F-14: 生成方式が未決定) |
| E4 decision の exact lookup (id / digest / after digest) | D5 | 部分的 (F-14) |
| E5 Publisher / Dual Catalog の `depends_on` への本 feature 登録 | **なし** | **未対応** |
| E6 Beads edge parity | **なし** | **未対応** |

**F-16 (中): ADR に E5/E6 の方式決定が存在しない。** 実行は P13 の責務だが、baseline §7.2 の fail-closed は feature 完了そのものを閉じており、E5/E6 が欠ければ本 feature は完了できない。P02 が「5 件の architecture decision」という数の枠に収めた結果、normative closure 側の 2 証跡が設計対象から落ちている。**必要な対応**: D5 の scope に E5/E6 の確認手順 (両 parent feature の `depends_on` 実測と Beads edge の突き合わせ) を追記するか、P04 が独立した test ID として起こす。後者でも解消できるため、差し戻しではなく P04 への申し送りとする。

## 4. Windows 実機がこの環境に存在しないことの帰結

これは重点確認事項であり、独立に検証した結果 **本 feature 全体の最大のブロッカー**である。

**事実**: 実行環境は darwin である。R9 のとおり、`.github/workflows/` に Windows ランナーの定義はなく、リポジトリ全体を grep しても Windows 実機・Windows VM・windows-latest の調達手段への言及は**一切存在しない** (feature の要件文が「Windows E2E」と書いている箇所を除く)。

**各決定への効き方**:

| 決定 | 効き方 |
|---|---|
| D4 | **直撃**。A3 は Windows での install / 列挙 / 実行の 3 点成立を必須にする。実機がなければ手順 5 (skill の実行) は原理的に実施できない。D4 の「実行できない場合は `blocked` として記録し `pass` にしない」という規定により、**A3 は fail、baseline §7.2 により P07/P10/P13 と feature 完了はすべて fail-closed** になる |
| D3 | PowerShell スクリプトが**一度も実行検証されないまま P05 の成果物になる**。sh 側だけが検証済みという非対称が生じ、F-8 の「2 本構成の保守コスト」が実測されないまま D5 の判定に入る |
| D1 / D2 | 影響は小さい (macOS だけでも成立/不成立の判定は可能)。ただし A1 の canonical path 成功記録を macOS のみで取った場合、それが Windows でも成立するかは未検証のまま残る |
| D5 | 上記により A2 の前提 (A1-A3 が揃うまで登録しない、ADR D5 の「登録の前提」) が満たされず、**登録自体が実行できない** |

**評価**: D4 が fail-closed を正しく機能させている点は設計として正しい。**しかし ADR は「Windows 実機をどう調達するか」を一言も扱っておらず、その結果、現在の計画は決定論的に完了不能である。** これは ADR の誤りというより、feature 計画レベルで未解決の前提である。

**C2 (費用ゼロ) との関係 (推測、確度: 中)**: Windows 実機の調達候補は (a) 作者所有の Windows PC (b) GitHub Actions の windows ランナー (public リポジトリなので無償、R7) (c) クラウド Windows VM (有償 → C2 違反) である。(b) は費用面では C2 を満たすが、A3(c) が要求する「skill を実行して期待出力を得る」には認証済みの Claude Code セッションが必要で、CI 上での認証情報の取り扱いは新たな security 論点 (P09 の対象) を生む。**したがって (a) が唯一 C2 と C1 の双方に無理なく収まる選択肢である可能性が高い。**

**エスカレーション (P03 からの申し送り)**: 「作者が Windows 実機にアクセスできるか」を P04 着手前に確認すべきである。アクセスできない場合、本 feature は A3 未達で確定するため、P05 以降に工数を投じる前に dev-graph へ計画差し戻しを行うのが合理的である。

## 5. 事実と推測の区分

本文書の主張の種別を明示する。

**fact (正本または実測で裏が取れているもの)**

- R1-R9 の実測すべて
- F-1 (baseline §4.2 の原文との矛盾)、F-3 (A1/qa-003 の原文一致と A1 達成可能性)、F-13 (writer 実装の必須制約)、F-14 (writer が receipt を出力しないこと)、F-15 のうち「優先 4 が baseline §6 の 8 制約のいずれも指していないこと」、F-16 (§7.3 E5/E6 に対応する決定が ADR に存在しないこと)
- §4 の「リポジトリ内に Windows 実機の調達手段が存在しない」

**inference (正本から導いた解釈。確度付き)**

- F-7 の「共倒れ/共成立になる」: 確度 **高**。D3 の責務記述が D1 と同じ CLI 呼び出しである以上、source を変えない限り機構は同一になる
- F-10 の「Windows では認証情報が設定ディレクトリ配下にある」: 確度 **中**。macOS 側 (R5) からの外挿であり、Windows 実機で未検証
- F-2 の「Content-Type が取得可否に影響し得る」: 確度 **低〜中**。CLI の取得実装は未確認
- F-6 の「`claude plugin install` が npm source 解決時に内部で npm 実行系を呼ぶ可能性」: 確度 **低〜中**。CLI 内部実装は未確認
- §4 の「(a) 作者所有 Windows PC が唯一現実的」: 確度 **中**。CI 上の認証実現性を実測していない

**未検証 (本 P03 では判定を保留したもの)**

- F1-F3 (marketplace / source type の仕様) の一次 GET 照合。正本自身が C02 の follow-up と記しており、P03 の権限外である (F-9)。**P06 は実行直前に code.claude.com の changelog 再照合を行うこと** (baseline §6 `npm-source-official-support-changelog-recheck-claude-code-plugins` の要求そのもの)。R1 が示す約 9.5 時間で 1 リビジョンという進行速度は、この再照合が形式ではなく実質的に必要であることを裏付けている

## 6. 結論と引き継ぎ

**総合判定**: D1-D5 のすべてが CONDITIONAL。決定の方向性はいずれも正本に接地しており、方式の全面再設計は不要である。ただし以下 3 件は baseline 違反または実行不能に直結するため、**P04 のテストファースト設計に入る前に P02 へ差し戻して補正する**ことを求める。

1. **F-7 (D3)**: bootstrap-installer が add する source を url-marketplace と別種にする (または 2 経路の独立性の定義を明文化する)。これを放置すると A1 が形式的にしか満たされない
2. **F-13 (D5)**: 登録形式を writer の実入力契約 (options 2-3 件 / `serves_goals` は G1-G5 / option 12 必須フィールド / `evidence_refs` は https のみ / `user_decision` 必須) に合わせて具体化する。特に「実機検証記録を確定根拠に含める」は `evidence_refs` では実現できない
3. **F-1 (D1) と F-15 (D5)**: D1 の反証条件から canonical path 組み替えを削除する。D5 の優先順位表で両 OS 再現性を評価軸から gate へ格上げする

**P04 への申し送り (差し戻しを待たずに着手できるもの)**

- F-4: `claude plugin validate` を S2 の判定述語に採用する
- F-10: Windows における `CLAUDE_CONFIG_DIR` 隔離下の認証維持確認を、E2E 本体より前段の独立 test ID にする
- F-11: 手順 6 の「実環境に変更なし」を before/after 比較として述語化する
- F-12: A3(b) の判定素材に `claude plugin details` の component inventory を加える
- F-14: receipt を決定論的に生成する手順自体を test ID の対象にする
- F-16: E5 (両 parent feature の `depends_on`) と E6 (Beads edge parity) を独立した test ID として起こす

**エスカレーション (P04 着手前)**: §4 のとおり、Windows 実機へのアクセス可否を確認する。不可の場合、本 feature は A3 未達で確定するため P05 以降の着手前に計画を差し戻す。

## 6.1 差し戻しの解決状況 (再判定 2026-07-21)

§7 の rollback trigger のとおり、P02 が補正を行ったため該当 findings を再判定した。補正後の ADR は `architecture-decision-record.md` revision 2 (PR #5 merged, `e2b033f`)。

| finding | 要求した補正 | 補正後 ADR の該当箇所 | 再判定 |
|---|---|---|---|
| F-1 | D1 の反証条件から canonical path 組み替えを削除 | D1「反証条件が成立した場合の扱い」— 組み替えを明示的に禁止し、A1 充足不能 → fail 記録 + dev-graph 差し戻しに変更 | **解決 (PASS)** |
| F-7 | bootstrap-installer の source を url-marketplace と別種にする | D3「経路独立性の要件」— `github` 型 `owner/repo` 直接指定と明記。共成立・共倒れの理由も併記 | **解決 (PASS)** |
| F-13 | 登録形式を writer の実入力契約に合わせて具体化 | D5「登録内容の形式」— 必須制約 8 項目表へ置換。`evidence_refs` は https のみ / 実機検証記録は `recommendation.rationale`・`caveats` へ、と明記 | **解決 (PASS)** |
| F-15 | 両 OS 再現性を評価軸から gate へ格上げ | D5「採用判定基準」— gate (G-OS) + 順位 (C1 → C2) + タイブレークの 2 段構造へ組替。優先 4 は補助基準と明記 | **解決 (PASS)** |
| F-2 | 配信先を 1 つに確定し切り分け証跡を定義 | D1 検証構成 — `raw.githubusercontent.com` に確定。HTTP status / Content-Type の記録を必須化 | **解決 (PASS)** |
| F-8 | 単一スクリプト案を退けた理由と減点量を明記 | D3 — Node 非依存性を理由として明記。減点は「優先度 1 で url-marketplace に劣後」と結論まで固定 | **解決 (PASS)** |
| F-9 | 隔離が模すシナリオを定義 | D4「モデル化するシナリオの定義」— 新規作者の素の PC を主とし、既存環境の名前衝突は範囲外と明示 | **解決 (PASS)** |
| F-10 | Windows の認証維持確認と `--scope` フォールバック | D4 手順 0 + フォールバック節 | **解決 (PASS)** |
| F-11 | 「実環境に変更なし」の検証手段を定義 | D4 手順 7 — ファイル一覧 + サイズの前後比較 | **解決 (PASS)** |
| F-12 | A3(b) に `claude plugin details` を加える | D4 手順 5 | **解決 (PASS)** |
| F-14 | receipt の決定論的生成手順を規定 | D5「receipt の生成手順」— spec-state 再読込による sha256 実測。手入力を禁止 | **解決 (PASS)** |

**P02 が本レビューの指摘に加えて自ら発見し補正した事項** (本レビューの見落とし): `system-spec/spec-state.json` の `decisions[]` は **D1-D6 が使用済み**であり、`set-decision` は id 単位 upsert のため、decision id を D1-D6 のいずれかにすると既存 decision を破壊する。ADR D5 表 #1 で id を **D7** に固定して解決済み。本レビューは writer の入力契約を精査しながら id 空間の衝突を見落としていた。

**再判定後の総合**: 差し戻し必須 3 件を含む全 findings が解決。**D1-D5 の verdict を CONDITIONAL → PASS へ更新する。** P04 の着手を承認する。

ただし §4 のエスカレーション (Windows 実機へのアクセス可否) は**未解決のまま残る**。これは ADR の記述で解決できる種類の問題ではなく、実機の有無という環境事実である。ADR D4 は未調達時を `blocked` (pass 読替禁止) と定義することで fail-closed を保っており、**設計としては正しく処理されている**。A3 の充足自体は Windows 実機が用意されるまで達成不能である。

## 7. 検証

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-stage0-distribution-gate`（世代非依存形式。current pointer から現行世代を解決する。`--staging .` は repository root から解決できないため使わない。contract §2.3）
- Required evidence: 本文書に D1-D5 の 5 決定すべてについて verdict・qa-001 整合・C1 適合・C2 適合・根拠が記載されていること → §1 のサマリ表と §2 の各節で確認可能
- 本文書の rollback trigger: P02 が §6 の差し戻し 3 件を補正した場合、補正後の ADR に対して本文書の該当節 (F-1 / F-7 / F-13 / F-15) を再判定する
