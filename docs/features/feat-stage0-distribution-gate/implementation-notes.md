---
status: confirmed
layer: implementation-notes
task: SYS-STAGE0-DISTRIBUTION-GATE-P05
parent_feature: feat-stage0-distribution-gate
feature_package_id: feature-package/feat-stage0-distribution-gate
source: docs/features/feat-stage0-distribution-gate/test-design.md
architecture_refs: [arch-harness-hub-infrastructure]
---

# feat-stage0-distribution-gate 実装ノート (検証用 artifact)

> **位置づけ**: P05 の成果物。[test-design.md](./test-design.md) が定義した test ID の **subject を実装**する。本 feature は検証 feature であり、ここで作るのは本番相当のコードではなく**検証用 artifact** である。

## 1. 作成した artifact

| # | パス | 対応 test ID | 役割 |
|---|---|---|---|
| 1 | `verification-artifacts/minimal-skill-package/.claude-plugin/plugin.json` | T-A1-03, T-A3-01 | 最小 plugin manifest (`h7-probe`) |
| 2 | `verification-artifacts/minimal-skill-package/skills/h7-probe-echo/SKILL.md` | **T-A3-03** | 実行されたら固定トークン `H7-PROBE-OK: skill executed via distributed plugin` を出力するプローブ skill |
| 3 | `verification-artifacts/minimal-skill-package/package.json` | **T-A1-07** | `pnpm pack` で tarball 化するための manifest (npm source variant 検証用) |
| 4 | `verification-artifacts/marketplace.json` | **T-A1-01, T-A1-02** | URL 型 marketplace 定義。plugin source は**外部 source (github 型 + path)** |
| 5 | `verification-artifacts/bootstrap-installer-prototype/bootstrap-install.sh` | **T-A1-04, T-A1-05** | macOS 用 installer (POSIX sh)。**github 型**の marketplace を add |
| 6 | `verification-artifacts/bootstrap-installer-prototype/bootstrap-install.ps1` | **T-A1-04, T-A1-05** | Windows 用 installer (PowerShell)。sh と同一手順 |
| 7 | `.dev-graph/cache/stage0-decision-registration-request.json` | **T-A2-01, T-A2-02** | C01 writer への入力ペイロード骨格 |

## 2. 設計判断とその根拠

### 2.1 プローブ skill が固定トークンを出力する理由

baseline §4.2 A3 は「install の exit code 0 のみを pass 根拠にしてはならない」と定める。`h7-probe-echo` は呼び出されると `H7-PROBE-OK: ...` という**機械照合可能な固定文字列**を返す。T-A3-03 はこの文字列の出現を pass 条件とするため、「plugin は install されたが skill が機能していない」状態を素通しできない。

### 2.2 marketplace.json の source を外部 source にした理由

正本 (F2) により **remote URL 型では marketplace.json しか取得されない**ため、相対パス source の plugin 本体は解決不能である。したがって `source` は `github` 型 + `path` (repo 内サブディレクトリ指定) とした。

**実測による裏取り**: `claude plugin validate marketplace.json --strict` および `claude plugin validate minimal-skill-package --strict` が**いずれも Validation passed** (CLI v2.1.215)。manifest の構文妥当性は実測で確認済みであり、残るリスクは実 install 時の解決可否のみ。これは P06 が判定する。

### 2.3 Bootstrap Installer が github 型を使う理由 (経路独立性)

ADR D3 の**経路独立性の要件**による。installer が D1 と同じ remote URL 型を add するだけなら両経路は同一の取得・解決機構を共有し、**共成立・共倒れ**になる。この構成では `distinct canonical path 数 ≥ 2` が形式的には満たされても qa-003 の 2 経路検証の意図を満たさない。

そのため installer は `claude plugin marketplace add <owner/repo>` (**github 型**) を用い、D1 (remote URL 型) と取得機構を分けた。両スクリプトは source type を標準出力に明示するため、T-A1-05 (経路独立性) が出力から機械判定できる。

### 2.4 sh + PowerShell の 2 本構成

Bootstrap Installer は **`claude` CLI すら未導入の作者環境で最初に走る**ため、その時点で Node/pnpm の存在は保証されない。OS 標準シェルのみに依存する 2 本構成の方が前提が少なく、C1 (保守性最優先) で優位と判断した (ADR D3)。

### 2.5 冪等性の実装

両スクリプトとも、`marketplace add` / `plugin install` が非ゼロ終了した場合に **`list` で既存登録を確認し、登録済みなら継続**する。これにより再実行しても結果が変わらない (冪等)。既存登録も確認できない場合のみ `fail` として非ゼロ終了する。

### 2.6 pnpm のみを使う (npm CLI を起動しない)

`package.json` に `"packageManager": "pnpm@10.19.0"` を pin した。T-A1-07 の tarball 化は **`pnpm pack`** で行い、`npm` CLI は一度も起動しない。`marketplace.json` の `source.type` に現れる `npm` は**配布経路のスキーマ値**であり、パッケージマネージャ CLI の選択とは別軸である (ADR §0 F6)。

## 3. 意図的に作成しなかった artifact とその理由

published task spec は P05 の produced artifacts に以下 2 件も挙げているが、**本 phase では作成しない**。

| パス | 作成しない理由 |
|---|---|
| `.dev-graph/cache/stage0-decision-registration-receipt.json` | ADR D5「receipt の生成手順」により、receipt は **writer 実行の直後に `spec-state.json` を再読込して sha256 を実測する決定論的手順で生成し、値を手入力してはならない**。P05 が骨格を置くと手入力値が残留し、baseline §4.2 A2(iii) の digest 照合を無意味化する危険がある。**P13 が writer 実行と同時に生成する。** |
| `.dev-graph/cache/stage0-stage1-gate-receipt.json` | Stage 1 開始条件の判定結果を格納するもので、A1-A3 の判定が確定して初めて意味を持つ。現時点で作成すると未確定の判定値を含むことになり、baseline §7.2 の fail-closed 契約に反する。**P13 が判定確定後に生成する。** |

この 2 件を空ファイルやプレースホルダで先に置くことは、「不足している証跡を文書や計画で代替する」ことに当たり、baseline §7.4 の trace rule が明示的に禁じている。

## 4. test-design.md の検証ケースとの対応 (被覆確認)

| test ID | subject が存在するか | 実装先 |
|---|---|---|
| T-A1-01 配信の到達性 | ✔ | `marketplace.json` を raw.githubusercontent.com から配信 (P06 が URL を組み立てて GET) |
| T-A1-02 url-marketplace add | ✔ | `marketplace.json` |
| T-A1-03 url-marketplace install | ✔ | `minimal-skill-package` (外部 source として参照される) |
| T-A1-04 bootstrap-installer 実行 | ✔ | `bootstrap-install.sh` / `.ps1` |
| T-A1-05 経路独立性 | ✔ | 両 installer が source type を標準出力に明示 |
| T-A1-06 充足数の計算 | ✔ | P06 が T-A1-02/03 と T-A1-04 の結果から算出 (実装物不要) |
| T-A1-07 npm source variant | ✔ | `package.json` (`pnpm pack` 対象) |
| T-A2-01/02 writer 入力の妥当性・作者確認 | ✔ | `stage0-decision-registration-request.json` |
| T-A2-03/04/05/06 | — | **P13 の実行時に生成** (§3 の理由により P05 では作らない) |
| T-A3-00 隔離下の認証維持 | ✔ | 実装物不要 (P06 の手順) |
| T-A3-01/02/03 install・列挙・実行 | ✔ | `minimal-skill-package` + プローブ skill |
| T-A3-04 実環境の非汚染 | ✔ | 実装物不要 (P06 の前後比較手順) |
| T-Q1..T-Q8 | ✔ | 判定手順であり実装物不要。T-Q4 (changelog 再照合) は P06 が実行直前に行う |
| T-E1..T-E6 | ✔ | T-E5/T-E6 は `features/*.md` と Beads の既存状態を検査するもので実装物不要 |

**subject が未実装の test ID: 0 件** (P13 実行時生成のものを除く)。

## 5. 検証

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/plans/feature-package-feat-stage0-distribution-gate`
- 実測: `claude plugin validate marketplace.json --strict` → **Validation passed**、`claude plugin validate minimal-skill-package --strict` → **Validation passed** (CLI v2.1.215)
- Required evidence: `verification-artifacts/` 配下に最小 skill package・marketplace.json・Bootstrap Installer 試作が作成され、test-design.md の全検証ケースに対応する検証対象一式が揃っていること → §1 と §4 で確認可能
