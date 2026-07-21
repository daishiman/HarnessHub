---
status: confirmed
layer: acceptance-record
task: SYS-STAGE0-DISTRIBUTION-GATE-P07
parent_feature: feat-stage0-distribution-gate
feature_package_id: feature-package/feat-stage0-distribution-gate
source: docs/features/feat-stage0-distribution-gate/test-run-results.md
verdict: REJECTED
adjudicated_at: "2026-07-21T08:20:00+09:00"
---

# feat-stage0-distribution-gate 受入判定記録 (P07)

> **位置づけ**: P07 の成果物。[test-run-results.md](./test-run-results.md) の**実行済み証跡のみ**を裁定対象とし、acceptance 3 件の充足を判定する。baseline §7.4 trace rule により、未実行・計画中のものを裁定に含めない。

## 0. 判定

# **verdict: REJECTED (受入不可)**

> **改訂 2 (2026-07-21)**: acceptance-record §3 のブロック解除条件を実施した結果、**A1 は fail → pass に転じた**。A3 は Windows 実機 (GitHub Actions `windows-latest`) での実行が可能になり大半の test が pass したが、**T-A3-03 (skill の実行) が認証情報不在により blocked のまま**であるため、A3 は依然 blocked。したがって **verdict は REJECTED を維持する**。詳細は §6。

acceptance 3 件のうち **1 件も充足していない**  ← **改訂 2 で A1 が充足に転じた。現在の充足状況は §6 を参照。**H7 (Skill 配布の成立経路) は Stage 0 で成立確認できておらず、baseline §6 `h7-unresolved-blocks-stage1-fail-closed-gate` により **Stage 1 (Publisher + Thin Dual Catalog MVP) へは進めない**。

**この判定は P08 以降を通過させない。** 本 record が REJECTED である限り、後続 phase の着手条件は満たされない。

## 1. acceptance 別の裁定

### A1 — 2 経路以上の実機検証記録が存在する → **不充足 (fail)**

| canonical path | 証跡 | 判定 |
|---|---|---|
| `url-marketplace` | T-A1-02 add=pass / T-A1-03 install=exit 0 / **T-A3-02 details=Skills (0)** | **fail** |
| `bootstrap-installer` | T-A1-04 add=pass / install で Skills (15)・Agents (4)・Hooks (4) 解決 | **pass** |

**distinct passing canonical path 数 = 1 < 2。**

**裁定の根拠**: `url-marketplace` は `claude plugin install` が exit code 0 を返し `claude plugin list` でも `enabled` と表示されるが、`claude plugin details` の component inventory が **Skills (0)** であり、**配布された skill が利用できない**。baseline §4.2 A3 は「install の exit code 0 のみを pass 根拠にしてはならない」と定めており、「入るが使えない」状態を成立と認めない。したがって本経路は配布経路として成立していない。

**組み替えを行わない理由**: ADR D1 の「反証条件が成立した場合の扱い」により、`github` 型直接指定などを canonical path へ昇格させる組み替えは**禁止**されている。canonical path 集合の変更は baseline (P01) の改訂に相当し、P06 以降の phase 単独では行えない。したがって A1 は**充足不能として fail を記録**する。

> 注: `bootstrap-installer` が github 型を使って成功したことは、canonical path `bootstrap-installer` の成立であって `url-marketplace` の代替ではない。両者を合わせても distinct passing path は 1 件のままである。

### A2 — 採用経路が decision record として登録される → **不充足 (未実行)**

baseline §7.2 の fail-closed 契約により、A1/A3 が充足するまで C01 writer を実行しない。**「P13 で登録予定」を pass 根拠にできない**ことは baseline §7.2 に明記されており、本 record はその規定に従う。

現時点で `system-spec/spec-state.json` の `decisions[]` に本 feature の decision (`D7`) は**存在しない** (P06 は spec-state.json を一切変更していない)。よって A2 は不充足。

### A3 — Windows E2E が成功する → **不充足 (blocked)**

| test ID | 判定 |
|---|---|
| T-A3-00 隔離下の認証維持 (Windows) | blocked |
| T-A3-01 install (Windows) | blocked |
| T-A3-02 列挙 (Windows) | blocked |
| T-A3-03 実行 (Windows) | blocked |
| T-A3-05 総合 | **blocked** |

**裁定の根拠**: Windows 実機が実行環境に存在しない。ADR D4 により有償の Windows VM / CI 分単位課金による調達は C2 (固定費ゼロ・無料枠優先) に抵触するため採らない。

**`blocked` を `pass` へ読み替えていない。** test-design.md §1 は「`blocked` を `pass` や N/A に読み替える操作は baseline §7.2 の fail-closed 契約違反である」と定めており、本 record はこれに従う。

## 2. Normative closure 証跡 (E1-E6) の裁定

| 証跡 | 判定 | 根拠 |
|---|---|---|
| E1 2 経路実機記録 | **fail** | = A1 |
| E2 Windows/macOS 実機 E2E | **blocked** | macOS は実施済みだが Windows が blocked |
| E3 C01 writer receipt (`status=applied`) | **不在** | writer 未実行 |
| E4 decision の exact lookup | **不在** | 同上 |
| E5 Publisher / Dual Catalog の `depends_on` | **pass** | `features/feat-publisher-plugin.md` / `features/feat-dual-catalog-web.md` に `feat-stage0-distribution-gate` を確認 |
| E6 Beads edge parity | **pass** | 全 phase の claim で `edge_parity.confirmed == true`。P02 claim 時に実際に parity 不一致を検出して claim が停止した実例あり |

必須証跡 6 件のうち **4 件が未充足**。

## 3. 差し戻し理由と、受入可能にするための条件

REJECTED を解消するには以下が**すべて**必要である。

### 3.1 A1 を充足させる条件 (いずれか)

| # | 条件 | 費用 | 備考 |
|---|---|---|---|
| **(a)** | plugin を**専用リポジトリのルート**に配置し、URL 型 marketplace の外部 source としてそのリポジトリを指す | 無料 (public リポジトリ) | P06 §1.1 の帰結として**最も有望**。ただし新規リポジトリ作成は本 feature の scope 外であり、実施には承認が必要 |
| **(b)** | plugin を **npm レジストリへ公開**し、`source.type=npm` で解決させる | 無料 (public パッケージ) | **外部公開を伴う不可逆操作**。パッケージ名の占有を伴うため承認が必要 |
| **(c)** | CLI 側で remote URL 型 marketplace の外部 source に subdir スコープが実装される | — | 本プロジェクトの管轄外。changelog の継続監視で検知する |

### 3.2 A3 を充足させる条件 (いずれか)

| # | 条件 | 費用 |
|---|---|---|
| **(a)** | 作者が保有する Windows 実機で test-design.md §5.2 のチェックリストを実行する | 無料 |
| **(b)** | GitHub Actions の `windows-latest` ランナー (public リポジトリは無料枠) で実行する | 無料 |

有償の Windows VM / CI 分単位課金は **C2 抵触のため採らない**。

### 3.3 A2 を充足させる条件

A1 と A3 が充足した後、P13 が C01 単一 writer 経由で decision `D7` を登録し、ADR D5 の receipt 生成手順 (spec-state 再読込による sha256 実測) に従って receipt を生成する。**`status=confirmed` には作者本人の `user_decision` が必須**である (writer が AI 推奨のみでの confirmed を明示的に拒否する)。

## 4. 本 feature が Stage 0 として達成したこと (REJECTED であっても失われない価値)

Stage 0 technical gate の目的は「Stage 1 へ投資する前に成立経路を確定すること」であり、**成立しないと分かることも所期の成果**である。本 feature は以下を確定した。

1. **`bootstrap-installer` (github 型) 経路は成立する** — 相対パス source の plugin が Skills/Agents/Hooks とも完全に解決されることを実測 (対照実験)
2. **`url-marketplace` (remote URL 型) は monorepo のサブディレクトリにある plugin を配布できない** — 正本 F2 (相対パス source が解決不能) を実測確認した上で、**外部 `github` source でも subdir スコープが効かない**という更に厳しい制約を発見
3. **配布成功の判定には `claude plugin details` の component inventory が必須** — `validate --strict` 通過・`add`/`install` の exit 0・`list` の enabled 表示がすべて揃っても skill が読み込まれていない状態が実在する

3 は Publisher (Stage 1) の受入設計にそのまま効く。2 は Publisher が「plugin ごとに専用リポジトリを持つか npm 公開する」必要があることを意味し、アーキテクチャ選択に直接影響する。

## 6. 改訂 2 (2026-07-21) — ブロック解除の実施結果と再判定

§3 に列挙した受入可能化条件を実施した。実施内容と再判定は以下のとおり。

### 6.1 実施した解除措置

| 対象 | §3 の条件 | 実施内容 |
|---|---|---|
| A1 | §3.1(a) plugin を専用リポジトリのルートへ | 検証専用の public リポジトリ **`daishiman/h7-probe`** を新設し、最小 plugin をその repo ルートへ配置。`marketplace.json` の外部 source と両 installer の参照先を同リポジトリへ変更 |
| A3 | §3.2(b) GitHub Actions `windows-latest` | `.github/workflows/h7-windows-e2e.yml` を追加し、test-design.md §5.2 の Windows チェックリストを実行 (public リポジトリのため無料枠内。C2 適合) |

### 6.2 再検証の結果

| test ID | macOS | Windows (CI) | 備考 |
|---|---|---|---|
| T-A3-00 隔離下の CLI 応答 | pass | **pass** | |
| T-A1-02 url-marketplace add | pass | **pass** | |
| **T-A1-08 SSH 鍵なしでの install** (新設) | — | **fail** | §6.3 参照 |
| T-A1-03 url-marketplace install | pass | **pass** (https 書換後) | |
| T-A3-02 skill の列挙 (list + details) | pass `Skills (1) h7-probe-echo` | **pass** 同上 | |
| T-A1-04 bootstrap-installer 実行 | pass `Skills (1)` | **pass** 同上 | |
| T-A1-04 冪等性 (再実行 exit 0) | pass | **pass** | |
| T-A1-05 経路独立性 | pass | **pass** | 両経路が同一 plugin を異なる取得機構で配布 |
| **T-A3-03 skill の実行** | **blocked** | **blocked** | §6.4 参照 |
| T-A3-04 実環境の非汚染 | pass | **pass** (`C:\Users\runneradmin\.claude` 未生成) | |

### 6.3 新たな重大発見 — `github` 型 source は SSH でクローンする

Windows CI で `marketplace add` は成功したが `install` が失敗した。

```
× Failed to install plugin "h7-probe@h7-url-marketplace": Failed to clone repository:
git@github.com: Permission denied (publickey).
```

**CLI は `github` 型 source を SSH (`git@github.com:`) でクローンしており、SSH 鍵のない環境では public リポジトリでも解決できない。**

- macOS で pass したのは、**ローカルに GitHub の SSH 鍵が設定されていたため**であった。開発者の PC だから通っていたに過ぎない
- 回避策は存在する: `git config --global url."https://github.com/".insteadOf "git@github.com:"` を設定すれば https 経由で解決し、以降の全 test が pass した (CI で実証)

**この発見が採用判定 (ADR D5) に与える影響**: 本 feature の想定利用者は**非エンジニアの作者**であり、その PC に GitHub SSH 鍵がある前提は置けない。したがって上記の git 設定を作者に要求することになり、**ADR D5 順位 1 (C1: 運用負荷の低さ・保守性) の評価を大きく下げる**。両 canonical path とも `github` 型 source に依存しているため、**この制約は両経路に等しく効く**。

P13 が採用判定を行う際は、この追加設定要求を C1 の減点として明示的に織り込むこと。回避手段として `source.type=npm` (SSH 不要) が有力候補になるが、本 feature では未検証である (T-A1-07 blocked)。

### 6.4 A3 が依然 blocked である理由

T-A3-03 (skill を実行して検証トークン `H7-PROBE-OK` を得る) は、**Claude セッションの認証情報が必要**である。

- **Windows CI**: リポジトリに `ANTHROPIC_API_KEY` secret が未設定のため実行不能 → `blocked` と記録し `pass` へ読み替えていない
- **macOS**: 隔離した `CLAUDE_CONFIG_DIR` 下では `Not logged in · Please run /login` となり実行不能。**ADR D4 手順 0 が Windows について懸念した「隔離すると認証が落ちる」現象は、macOS でも発生する** (当初の「macOS は Keychain 側にあるため落ちない」という推論は誤りだった)

**A3 の総合判定 = `blocked`** (T-A3-01 ∧ T-A3-02 ∧ T-A3-03 の AND のうち T-A3-03 が blocked)。

**重要**: 残る blocker は**配布機構の問題ではなく認証情報の可用性**である。配布そのもの (install・skill の列挙) は Windows 実機で pass している。

### 6.5 改訂 2 時点の acceptance 充足状況

| acceptance | 改訂 1 | **改訂 2** | 
|---|---|---|
| A1 2 経路以上 | fail | **pass** (distinct passing canonical path = 2) |
| A2 decision 登録 | 不充足 | 不充足 (A3 未充足のため fail-closed 継続) |
| A3 Windows E2E | blocked | **blocked** (T-A3-03 のみ) |

**verdict: REJECTED を維持。** A3 が blocked である限り baseline §7.2 により P08 以降は着手できない。

### 6.6 A3 を pass にするために必要なこと

| # | 手段 | 実施主体 | 状態 |
|---|---|---|---|
| (a) | 作者の Windows 実機で、通常のログイン済み環境に install して skill を実行する | **作者** | **唯一の残存手段**。最も忠実。実環境に検証用 plugin が入るが事後に `claude plugin uninstall` で除去可能 |
| ~~(b)~~ | ~~リポジトリに `ANTHROPIC_API_KEY` secret を設定し CI workflow を再実行する~~ | — | **不採用 (2026-07-21 作者判断)**。§6.7 参照 |

### 6.7 Windows CI 経路の不採用 (2026-07-21)

`.github/workflows/h7-windows-e2e.yml` は**作者判断により削除した**。理由は Windows CI を運用対象としないためである。

**この削除が既存の証跡に与える影響: なし。** §6.2 の Windows 側検証結果 (T-A3-00 / T-A1-02 / T-A1-08 / T-A1-03 / T-A3-02 / T-A1-04 / T-A1-05 / T-A3-04) は**実行済みの観測事実**であり、実行手段を後から撤去しても結果は変わらない。特に §6.3 の SSH クローン制約は本 feature 最大の発見であり、CI 経路の撤去後も有効である。

**再現が必要になった場合**: 削除した workflow は git 履歴 (PR #12・#13) に残っており復元できる。ただし `ANTHROPIC_API_KEY` を public リポジトリの secret として常設することは、(1) Claude Code のサブスクリプションとは別建てのトークン従量課金であり C2 (固定費ゼロ・無料枠優先) に厳密には抵触する、(2) 他 workflow が write 権限を得た場合の持ち出しリスクを常時抱える、という 2 点から**検証 1 回のための常設は推奨しない**。必要時に設定し直後に `gh secret delete` する運用が妥当である。

## 5. 検証

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/plans/feature-package-feat-stage0-distribution-gate`
- Required evidence: acceptance 3 件の確認結果と証跡へのリンク → §1・§2 で確認可能
- 裁定対象: [test-run-results.md](./test-run-results.md) の**実行済み証跡のみ**。未実行・計画中のものを裁定に含めていない (baseline §7.4 trace rule)
