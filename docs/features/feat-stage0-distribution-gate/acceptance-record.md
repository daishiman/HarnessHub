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

acceptance 3 件のうち **1 件も充足していない**。H7 (Skill 配布の成立経路) は Stage 0 で成立確認できておらず、baseline §6 `h7-unresolved-blocks-stage1-fail-closed-gate` により **Stage 1 (Publisher + Thin Dual Catalog MVP) へは進めない**。

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

## 5. 検証

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/plans/feature-package-feat-stage0-distribution-gate`
- Required evidence: acceptance 3 件の確認結果と証跡へのリンク → §1・§2 で確認可能
- 裁定対象: [test-run-results.md](./test-run-results.md) の**実行済み証跡のみ**。未実行・計画中のものを裁定に含めていない (baseline §7.4 trace rule)
