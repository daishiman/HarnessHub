---
status: confirmed
layer: test-run-results
task: SYS-STAGE0-DISTRIBUTION-GATE-P06
parent_feature: feat-stage0-distribution-gate
feature_package_id: feature-package/feat-stage0-distribution-gate
source: docs/features/feat-stage0-distribution-gate/test-design.md
cli_version: "2.1.215"
executed_at: "2026-07-21T07:45:00+09:00 〜 2026-07-21T08:05:00+09:00"
executed_os: ["macOS (Darwin x86_64)"]
blocked_os: ["Windows"]
---

# feat-stage0-distribution-gate 実機検証結果 (P06)

> **位置づけ**: P06 の成果物。[test-design.md](./test-design.md) の test ID を実機で実行した結果。判定語彙は `pass` / `fail` / `blocked` の 3 値で、**`blocked` を `pass` へ読み替えていない**。

## 0. 結論 (先に読む)

| acceptance | 判定 | 理由 |
|---|---|---|
| **A1** 2 経路以上の実機検証記録 | **fail** | 成功した canonical path は **1 件のみ** (`bootstrap-installer`)。`url-marketplace` は install が exit 0 でも **skill が読み込まれず** (Skills 0)、配布として成立していない |
| **A2** 採用経路の decision record 登録 | **未実行** | baseline §7.2 の fail-closed により A1/A3 未充足のため実行しない。P13 の責務 |
| **A3** Windows E2E が成功する | **blocked** | Windows 実機が実行環境に存在しない。**`pass` に読み替えない** |

**H7 (Skill 配布の成立経路) は Stage 0 で成立確認できていない。** baseline §6 `h7-unresolved-blocks-stage1-fail-closed-gate` により **Stage 1 (Publisher + Thin Dual Catalog MVP) へは進めない**。

## 1. 最重要の技術的発見

### 1.1 remote URL 型 marketplace はサブディレクトリの plugin を配布できない

正本 (F2) は「remote URL 型では marketplace.json しか取得されないため**相対パス source** の plugin は解決不能で、plugin 本体 source は外部 source が必要」と記す。本 P06 はこれを実測で確認し、**さらに厳しい制約を発見した**。

**外部 source (`github` 型) を指定しても、リポジトリのサブディレクトリへスコープできない。**

- `{"source": "github", "repo": "daishiman/HarnessHub", "path": "docs/.../minimal-skill-package"}` → `path` は**実行時に無視**され、リポジトリ全体がクローンされた (キャッシュ配下に `system-spec/`・`eval-log/`・`tests/`・`plugins/` が展開されることを実測)
- キー名を `subdir` に変えても**同じ結果** (リポジトリ全体をクローン)
- 結果、plugin root がリポジトリルートになり `skills/` が解決されず **component inventory が Skills (0)**

**帰結**: URL 型 marketplace で plugin を配るには、**plugin が自分専用リポジトリのルートに存在する**か、**npm パッケージとして公開されている**必要がある。monorepo のサブディレクトリに置いた plugin は配布できない。これは Publisher の設計 (Stage 1) に直接効く制約である。

### 1.2 「validate 通過」も「exit code 0」も配布成功の証拠にならない

上記の誤設定において、以下がすべて**成功を示していた**。

| 検査 | 結果 |
|---|---|
| `claude plugin validate marketplace.json --strict` | ✔ **Validation passed** |
| `claude plugin marketplace add <URL>` | **exit 0** / `Successfully added marketplace` |
| `claude plugin install h7-probe@h7-url-marketplace` | **exit 0** / `Successfully installed plugin` |
| `claude plugin list` | `h7-probe@h7-url-marketplace` / Status: ✔ **enabled** |
| **`claude plugin details h7-probe`** | **Skills (0)** ← ここで初めて失敗が露見 |

baseline §4.2 A3 が「install の exit code 0 のみを pass 根拠にしてはならない」と定め、P03 の F-12 が「`list` は plugin 単位の列挙であり skill 未読込を素通しし得る」と指摘し、P04 が T-A3-02 に `details` を加えた。**この設計判断が実測で裏付けられた。** `list` だけで判定していれば偽陽性で pass にしていた。

### 1.3 github 型 marketplace は相対パス source を完全に解決する (対照実験)

同一リポジトリを `claude plugin marketplace add daishiman/HarnessHub` (github 型) で追加すると、ルートの `.claude-plugin/marketplace.json` (source が全て `./plugins/...` の**相対パス**) が読まれ、`claude plugin install skill-intake@skills` で **Skills (15) / Agents (4) / Hooks (4)** が正しく解決された。

**この対照により、1.1 の失敗が「リポジトリや manifest の不備」ではなく「remote URL 型固有の制約」であることが確定する。** 同時に、2 経路が**取得・解決機構として実際に独立している**ことの最も強い証拠でもある (共成立・共倒れではなく、片方だけが成立した)。

## 2. test ID 別の結果

### 2.1 A1 — 2 経路以上の実機検証記録

| test ID | OS | 判定 | 観測 |
|---|---|---|---|
| T-A1-01 配信の到達性 | macOS | **blocked** | 独立した HTTP プローブ (`curl`) が実行環境のツール権限で拒否された。**間接証拠**として CLI が同 URL から `Downloading marketplace` → `Successfully added` を完了しており取得は成立している。ただし Content-Type の直接記録は取れていない |
| T-A1-02 url-marketplace add | macOS | **pass** | `Successfully added marketplace: h7-url-marketplace (declared in user settings)` / exit 0 |
| T-A1-03 url-marketplace install | macOS | **pass (ただし §1.2 参照)** | `Successfully installed plugin: h7-probe@h7-url-marketplace (scope: user)` / exit 0。**この pass は配布成立を意味しない** |
| T-A1-04 bootstrap-installer 実行 | macOS | **pass** | github 型 `daishiman/HarnessHub` を add → `Successfully added marketplace: skills`。install で Skills (15) 解決 |
| T-A1-05 経路独立性 | macOS | **pass** | 2 経路の source 型が異なる (remote URL 型 vs github 型) ことに加え、**実際に挙動が分かれた** (片方のみ skill 解決成功)。共成立・共倒れでないことが実証された |
| T-A1-06 充足数の計算 | — | **fail** | skill が使える状態まで到達した canonical path は **`bootstrap-installer` の 1 件のみ**。`url-marketplace` は §1.1 により不成立。**distinct passing canonical path 数 = 1 < 2** |
| T-A1-07 npm source variant | macOS | **blocked** | `pnpm pack` による tarball 生成は成功 (`h7-probe-0.1.0.tgz`)。しかし **npm registry への公開は外部公開を伴う不可逆操作**であり、本 session では承認を得ていないため実行しない。registry 上に `h7-probe` は未公開 (404 を実測)。**未到達を fail/blocked として記録し、成功を装わない** (ADR D2 の規定どおり) |

> **T-A1-06 の補足**: `url-marketplace` は「plugin が自分専用リポジトリのルートにある」構成なら成立する可能性が高い (推測、確度: 中〜高)。ただし本 P06 ではその構成を用意していないため**未検証**であり、未検証を pass に読み替えることはしない。

### 2.2 A2 — 採用経路の decision record 登録

| test ID | 判定 | 理由 |
|---|---|---|
| T-A2-01 〜 T-A2-06 | **未実行** | baseline §7.2 の fail-closed により、A1/A3 が充足するまで writer を実行しない。入力ペイロード骨格 (`.dev-graph/cache/stage0-decision-registration-request.json`) は P05 で用意済み。実行は P13 の責務 |

### 2.3 A3 — Windows E2E

| test ID | OS | 判定 | 観測 |
|---|---|---|---|
| T-A3-00 隔離下の認証維持 | macOS | **pass** | 隔離した `CLAUDE_CONFIG_DIR` で `No marketplaces configured` を返し、その後の add/install/list/details が全て正常動作。macOS では認証は落ちない |
| T-A3-00 隔離下の認証維持 | **Windows** | **blocked** | 実機不在 |
| T-A3-01 install の成否 | **Windows** | **blocked** | 実機不在 |
| T-A3-02 skill の列挙 | macOS (url 経路) | **fail** | `plugin list` は enabled、`plugin details` は **Skills (0)** (§1.2) |
| T-A3-02 skill の列挙 | macOS (github 経路) | **pass** | `plugin details skill-intake` → Skills (15) / Agents (4) / Hooks (4) |
| T-A3-02 skill の列挙 | **Windows** | **blocked** | 実機不在 |
| T-A3-03 skill の実行 | **Windows** | **blocked** | 実機不在。macOS でも `h7-probe-echo` は読み込まれていないため実行不能 |
| T-A3-04 実環境の非汚染 | macOS | **pass** | 全操作を隔離下で実行。実環境の `claude plugin list` に `h7-probe` は **0 件** (混入なし)。隔離先には `settings.json`・`plugins/`・`backups/` が生成され、対比が取れている |
| T-A3-05 A3 総合判定 | **Windows** | **blocked** | T-A3-01 ∧ T-A3-02 ∧ T-A3-03 が全て blocked |

### 2.4 quality_constraints (T-Q1 〜 T-Q8)

| test ID | 判定 | 観測 |
|---|---|---|
| T-Q1 経路の数え方 | **pass** | T-A1-06 の計算で npm variant を独立経路に加算していない。canonical path は 2 件固定のまま |
| T-Q2 Stage 1 判定材料 | **未実行** | `stage0-stage1-gate-receipt.json` は P13 が判定確定後に生成する (P05 §3 の規定) |
| T-Q3 対象 OS | **pass** | 実行 OS は macOS のみ、未実行は Windows。**desktop Linux 向けの検証は一切行っていない** |
| T-Q4 changelog 再照合 | **blocked (代替観測あり)** | 本 session では WebFetch/WebSearch が利用できず `code.claude.com` の changelog を直接再照合できなかった。**代替**として実行環境の CLI **v2.1.215** の挙動を直接実測した (`--help` によるサブコマンド確認、source 型の受理/拒否の実測、install 時の解決挙動)。これは changelog 読解より強い一次証拠だが、**「将来の変更予告」は取得できていない**ため制約の完全充足とはしない |
| T-Q5 費用ゼロ | **pass** | 使用したのは public リポジトリの raw 配信と GitHub clone、ローカル CLI のみ。**有償プラン契約・従量課金・Windows 実機の有償調達はいずれも発生していない** |
| T-Q6 単独運用 | **pass** | 全手順を提供者 1 名 + AI で完結。第三者への作業依頼なし。手順数: url-marketplace 経路 4 コマンド (OS 分岐 0)、bootstrap-installer 経路 1 スクリプト (OS 分岐 2 本) |
| T-Q7 fail-closed | **pass** | A1 を `fail`、A3 を `blocked` として記録し、**いずれも `pass` へ読み替えていない**。§0 で Stage 1 へ進めないと明記している |
| T-Q8 登録経路の正当性 | **未実行** | writer 未実行のため。`spec-state.json` への直接編集も**行っていない** (P06 は spec-state.json を一切変更していない) |

### 2.5 Normative closure (T-E1 〜 T-E6)

| test ID | 判定 | 観測 |
|---|---|---|
| T-E1 2 経路実機記録 | **fail** | = T-A1-06 (成立 1 件) |
| T-E2 Windows/macOS 実機 E2E | **blocked** | macOS は実施済みだが Windows が blocked のため総合 blocked |
| T-E3 C01 writer receipt | **未実行** | P13 の責務 |
| T-E4 decision の exact lookup | **未実行** | P13 の責務 |
| T-E5 両 parent feature の depends_on | **pass** | `features/feat-publisher-plugin.md` と `features/feat-dual-catalog-web.md` の `depends_on` に `feat-stage0-distribution-gate` が含まれることを確認 |
| T-E6 Beads edge parity | **pass** | 本 feature の全 phase の claim で `edge_parity.confirmed == true` を確認。**P02 claim 時に期待値未指定で parity 不一致を実際に検出し claim が停止した実例があり、形式確認ではなく実効性のある検査であることが実証された** |

## 3. P06 実行中に発見した P05 の欠陥と対応

| # | 欠陥 | 対応 |
|---|---|---|
| 1 | `marketplace.json` の github source に `path` キーを使っていたが、サブディレクトリ指定として機能しない | `subdir` へ訂正して再実行 → **同じく機能しないことを確認**。§1.1 のとおり CLI 側の制約であり manifest の書き方では解決できない |

この欠陥は P05 の artifact 側の問題として訂正済み (commit `a20a249`) だが、**訂正後も結果は変わらなかった**ため、A1 の fail は artifact の不備ではなく **CLI の仕様上の制約**に起因する。

## 4. 未実施・制約による限界 (silent truncation を避けるための明示)

| 項目 | 状態 | 理由 |
|---|---|---|
| Windows 実機 E2E 一式 | **未実施** | 実行環境に Windows 実機なし。ADR D4 により有償調達は C2 抵触のため採らない |
| npm registry への公開と install | **未実施** | 外部公開を伴う不可逆操作であり承認を得ていない |
| `curl` による HTTP status/Content-Type の直接記録 | **未実施** | ツール権限で拒否 |
| `code.claude.com` changelog の直接再照合 | **未実施** | WebFetch/WebSearch が利用不可 |
| plugin を専用リポジトリのルートに置く構成での url-marketplace 検証 | **未実施** | 新規リポジトリ作成は本 phase の scope 外。§1.1 の帰結として**次に試すべき構成**である |

## 5. 検証

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/plans/feature-package-feat-stage0-distribution-gate`
- Required evidence: macOS/Windows 実機での各経路の検証結果と Windows E2E の pass/fail が記録されていること (fail が残る場合は差し戻し理由が明記されていること) → §0・§2・§4 で確認可能
- 差し戻し理由: **A1 は canonical path 1 件のみ成立で不充足。A3 は Windows 実機不在で blocked。** §1.1 の CLI 制約が解消されるか、plugin を専用リポジトリのルートに置く構成が検証されるまで、H7 は成立しない
