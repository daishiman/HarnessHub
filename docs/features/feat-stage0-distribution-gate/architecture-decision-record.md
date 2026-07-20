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
- 配信: GitHub Pages / raw.githubusercontent.com など **無料枠のみ**で https 配信する (C2 準拠)
- marketplace.json の plugin source: D2 (npm) または `github` 型を指定する
- 実行: `claude plugin marketplace add <https://.../marketplace.json>` → `claude plugin marketplace list` → `claude plugin install <plugin>@<marketplace>` → `claude plugin list`

**canonical path 名**: `url-marketplace`。baseline §4.2 A1 の 2 経路のうち 1 件を担う。

**反証条件 (この決定が誤りだと分かる観測)**: remote URL 型で marketplace.json 取得自体が失敗する、または外部 source 指定でも plugin 本体が解決できない場合。その場合 D1 は不成立となり、A1 の充足は D3 (Bootstrap Installer) と `github` 型直接指定の 2 経路へ組み替える。

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

**検証構成**:
- 形式: POSIX sh スクリプト (macOS) と PowerShell スクリプト (Windows) の 2 本。**同一の登録手順を両 OS で再現**することが目的
- 責務: (a) `claude` CLI の存在確認、(b) `claude plugin marketplace add` の実行、(c) `claude plugin install` の実行、(d) 検証可能な終了コードと標準出力の生成
- 非責務: plugin 本体の同梱、CLI の自動インストール、権限昇格
- 冪等性 (何回実行しても結果が同じになる性質): 既に登録済みの場合も exit 0 で終わる

**canonical path 名**: `bootstrap-installer`。A1 の 2 経路のうち 1 件を担う。

**反証条件**: 両 OS で同一手順が再現できない (例: PowerShell 側で CLI の解決方法が本質的に異なる) 場合。その場合は OS ごとに別 installer とし、保守コスト増を採用判定の減点として D5 の判定表に反映する。

---

## D4. macOS/Windows 実機 E2E 手順

**決定**: 実機 E2E を **「隔離した CLAUDE_CONFIG_DIR 上で、install → 列挙 → 実行 の 3 点を確認する」** 手順に固定する。

**根拠**: baseline §4.2 A3 が「install の exit code 0 のみを pass 根拠にしてはならない」と定めている (「入るが使えない」状態を通過させないため)。また検証が作者の実環境 (`~/.claude`) を汚染すると、検証の再実行性が失われ C1 の運用負荷が上がる。

**手順 (両 OS 共通)**:
1. `CLAUDE_CONFIG_DIR` を検証専用の一時ディレクトリへ向ける
2. `claude plugin marketplace add <source>` — exit code と出力を記録
3. `claude plugin install <plugin>@<marketplace>` — exit code と出力を記録
4. `claude plugin list` で対象 skill/plugin が**列挙される**ことを確認 (A3-b)
5. 当該 skill を実行し**期待出力が得られる**ことを確認 (A3-c)
6. 一時ディレクトリを破棄し、`~/.claude` に変更が無いことを確認

**対象 OS**: macOS + Windows のみ。desktop Linux は baseline §6 `author-environment-macos-windows-linux-out-of-scope-qa001` により対象外。

**未達時の扱い**: いずれかの OS で手順が実行できない場合、その OS の結果は **`blocked` として記録し `pass` にしない**。baseline §7.2 により A3 未達は P07/P10/P13 を fail-closed にする。

**反証条件**: `CLAUDE_CONFIG_DIR` による隔離が効かず実環境を参照してしまう場合。その場合は隔離方式を見直し、手順 6 の確認を強化する。

---

## D5. decision record 登録経路と採用判定基準

**決定**: 採用経路の decision record は **C01 単一 writer (`plugins/system-spec-harness/skills/run-system-spec-elicit/scripts/apply-spec-transition.py set-decision`) 経由でのみ** `system-spec/spec-state.json` の `decisions[]` へ登録する。判定は下表の基準で行う。

**根拠**: baseline §7.1 の単一 writer 契約。`spec-state.json` の直接編集は経路違反として拒否される。

**採用判定基準 (経路が複数成立した場合の優先順位)**:

| 優先 | 基準 | 根拠 |
|---|---|---|
| 1 | **C1 適合** — 提供者 1 名 + AI で保守できるか。手順数・OS 分岐の少なさ | baseline §6 `solo-operator-ai-assisted-verification-c1` (運用負荷と保守性を最優先基準と明記) |
| 2 | **C2 適合** — 無料枠内で完結するか。有償プラン契約を要さないか | baseline §6 `cost-zero-verification-within-free-tier-c2` |
| 3 | **両 OS 再現性** — macOS/Windows で同一手順が通るか | baseline §6 `author-environment-macos-windows-linux-out-of-scope-qa001` |
| 4 | **非エンジニア作者の実行可能性** — CLI 知識をどれだけ要求するか | 本 feature の想定利用者 (作者環境への配布) |

**登録内容の形式**: `decisions[]` の D1-D6 と同形式 (id / question / status / options / 評価軸 / 確定根拠)。実機検証記録への参照を確定根拠に含める。

**登録の前提 (fail-closed)**: baseline §7.2 により、A1-A3 が揃うまで D5 の登録は実行しない。「登録予定」を P07 の pass 根拠にはできない。

**反証条件**: `set-decision` が本 feature の decision 形式を受け付けない場合。その場合は C01 側の入力契約を確認し、writer の内部実装変更が必要なら scope out として dev-graph へ差し戻す (baseline スコープ外規定)。

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

## 7. 検証

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/plans/feature-package-feat-stage0-distribution-gate`
- Required evidence: 本文書に 5 件の architecture decision (D1-D5) が過不足なく記載されていること → §6 の対応表で確認可能
- 本文書の rollback trigger: F5 の再照合で npm source の前提が変化した場合、D2 を修正し P03 以降の着手を保留する
