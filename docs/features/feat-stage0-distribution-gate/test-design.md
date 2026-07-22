---
status: confirmed
layer: test-design
task: SYS-STAGE0-DISTRIBUTION-GATE-P04
parent_feature: feat-stage0-distribution-gate
feature_package_id: feature-package/feat-stage0-distribution-gate
source: docs/features/feat-stage0-distribution-gate/architecture-decision-record.md
feature_context_digest: sha256:6b7340ade5290ee9e3c5bb63d22d3381684b28817303152c6240906ff050fb0a
architecture_refs: [arch-harness-hub-infrastructure]
---

# feat-stage0-distribution-gate テスト設計 (実機検証ケース)

> **位置づけ**: P04 の成果物。[requirements-baseline.md](./requirements-baseline.md) の acceptance 3 件・quality_constraints 8 件と、[architecture-decision-record.md](./architecture-decision-record.md) の D1-D5、[design-review-notes.md](./design-review-notes.md) の申し送りを、**実行可能な test ID** へ落とす。
>
> baseline §7.4 の trace rule により、**本文書が定義した test ID の subject を P05 が実装し、P06 が実行し、P07/P10 は実行済み証跡のみを裁定する**。ここに無い test を P06 が追加実行しても、P07 の pass 根拠にはならない。

## 1. 判定語彙 (この 3 値以外を使わない)

| 値 | 意味 | P07/P10 での扱い |
|---|---|---|
| `pass` | 判定条件をすべて満たした | 充足根拠になる |
| `fail` | 実行したが判定条件を満たさなかった | 不充足として扱う |
| `blocked` | **実行できなかった** (環境不在・前提未達) | 不充足として扱う。**`pass` に読み替えてはならない** |

`blocked` を `pass` や「N/A」に読み替える操作は baseline §7.2 の fail-closed 契約違反である。

## 2. acceptance 対応テスト

### 2.1 A1 — 2 経路以上の実機検証記録が存在する

canonical path は `url-marketplace` / `bootstrap-installer` の **2 件固定** (baseline §4.2)。npm source は前者の variant であり充足数に加算しない。

| test ID | 対象 | 判定条件 (exact lookup 可能な形) | OS |
|---|---|---|---|
| **T-A1-01** | 配信の到達性 (D1 F-2 対応) | 対象 marketplace.json URL への素の HTTP GET が **status 200** を返し、**Content-Type を記録**していること。CLI 失敗時に「配信の問題」と「CLI 側の非対応」を切り分けるための前提証跡 | macOS, Windows |
| **T-A1-02** | `url-marketplace` の add | `claude plugin marketplace add <https URL>` の **exit code 0** かつ `claude plugin marketplace list` に当該 marketplace 名が現れる | macOS, Windows |
| **T-A1-03** | `url-marketplace` の install | `claude plugin install <plugin>@<marketplace>` の **exit code 0** | macOS, Windows |
| **T-A1-04** | `bootstrap-installer` の実行 | installer スクリプトの **exit code 0** かつ、その内部で **`github` 型 (`owner/repo`) の marketplace が add される**こと (D1 の remote URL 型と source 型が異なることを出力で確認) | macOS, Windows |
| **T-A1-05** | 経路独立性 (D3 / F-7 対応) | T-A1-02 と T-A1-04 が **異なる source 型**で成立していること。同一 source 型なら共成立・共倒れのため `fail` とする | macOS, Windows |
| **T-A1-06** | 充足数の計算 | `pass` した canonical path 数 ≥ 2。**npm source variant (T-A1-07) の結果を加算しないこと**を計算過程で確認 | — |
| **T-A1-07** | npm source variant (内訳証跡) | `pnpm pack` で tarball が生成され、marketplace.json に `"source": {"type": "npm", ...}` を記述した状態で install を試行。**結果は A1 の充足数に加算しない**。レジストリ公開が無料枠で完結しない場合は未到達部分を `fail` として記録し、成功を装わない | macOS |

> **T-A1-06 の注意**: T-A1-02/03 (url-marketplace) と T-A1-04 (bootstrap-installer) の両方が `pass` して初めて A1 が充足する。片方でも `fail`/`blocked` なら A1 は不充足。canonical path の再定義は baseline 改訂を要し P06 以降の phase 単独では行えない (ADR D1 反証条件の扱い)。

### 2.2 A2 — 採用経路が decision record として登録される

| test ID | 対象 | 判定条件 | 実行 phase |
|---|---|---|---|
| **T-A2-01** | writer 入力の妥当性 (事前) | 登録ペイロードが writer の必須制約を満たすこと: decision id = **`D7`** (既存 D1-D6 と非衝突) / `serves_goals` ⊆ {G1..G5} かつ非空 / `options` が 2-3 件 / 各 option に 12 必須フィールド / `option.evidence_refs` が**全て https URL** / `cost_model` に `free` または `low-cost` が最低 1 件 / `recommendation` の 5 フィールド + `comparison_basis` 5 軸 / `latest_checked_at` が RFC3339 | P13 |
| **T-A2-02** | 作者確認の存在 | `status=confirmed` に必要な **`user_decision` (option_id + RFC3339 の confirmed_at)** が存在すること。AI 推奨だけで confirmed にする経路は writer が明示的に拒否する | P13 |
| **T-A2-03** | writer 実行と applied | C01 writer (`apply-spec-transition.py set-decision`) を実行し、receipt の **`status` == `applied`** | P13 |
| **T-A2-04** | decision の完全一致 | receipt の decision `id` が `system-spec/spec-state.json` の `decisions[]` に**完全一致で存在**し、当該 decision の `status` == `confirmed` | P13 |
| **T-A2-05** | after digest の実測一致 (F-14 対応) | receipt の spec-state after digest が現行 `system-spec/spec-state.json` の**実測 sha256 と一致**。**receipt は writer 実行直後に spec-state を再読込して sha256 を実測する決定論的手順で生成し、値を手入力しないこと**。この生成手順自体が本 test の対象である | P13 |
| **T-A2-06** | A2 の総合判定 | T-A2-03 ∧ T-A2-04 ∧ T-A2-05 の **AND**。1 つでも欠ければ A2 は `fail` | P13 |

### 2.3 A3 — Windows E2E が成功する

**install の exit code 0 のみを pass 根拠にしてはならない** (baseline §4.2 A3)。

| test ID | 対象 | 判定条件 | OS |
|---|---|---|---|
| **T-A3-00** | 隔離下の認証維持 (F-10 対応・**E2E 本体より前段**) | 隔離した `CLAUDE_CONFIG_DIR` 下でセッションが認証されること。**認証が落ちる場合は `claude plugin install --scope project\|local` によるインストール先限定へ切り替える**。本 test は E2E 本体の失敗と認証起因の失敗を切り分けるために独立した test ID とする | **Windows** (macOS でも実施) |
| **T-A3-01** | install の成否 (A3-a) | 採用経路の install コマンドが **exit code 0** | Windows |
| **T-A3-02** | skill の列挙 (A3-b) | `claude plugin list` に当該 plugin が現れ、**かつ `claude plugin details <plugin>` の component inventory に対象 skill が現れる**こと。`list` は plugin 単位の列挙であり「plugin は入ったが skill が読み込まれていない」状態を素通しし得るため、`details` を判定素材に含める (F-12 対応) | Windows |
| **T-A3-03** | skill の実行 (A3-c) | 当該 skill を実行し**期待出力が得られる**こと | Windows |
| **T-A3-04** | 実環境の非汚染 (F-11 対応) | 実行前後で `~/.claude` (Windows は対応する実環境設定ディレクトリ) 直下の**ファイル一覧とサイズを取得して比較し差分ゼロ**。あわせて「隔離先には `.claude.json` 等が生成される / 実環境には生成されない」の対比を証跡に残す | macOS, Windows |
| **T-A3-05** | A3 の総合判定 | T-A3-01 ∧ T-A3-02 ∧ T-A3-03 の **AND**。Windows 実機が用意できない場合は全件 `blocked` とし、**`pass` に読み替えない** | Windows |

> **Windows 実機の調達制約 (ADR D4)**: 有償の Windows VM / CI 分単位課金は **C2 抵触のため採らない**。(a) 作者が保有する Windows 実機、(b) GitHub Actions `windows-latest` ランナー (public リポジトリは無料枠) のいずれかに限る。

## 3. quality_constraints 対応テスト (8 件全件)

| # | constraint id | test ID | 判定条件 |
|---|---|---|---|
| 1 | `stage0-two-path-distribution-technical-gate-h7-qa003` | **T-Q1** | canonical path の数え方が baseline §4.2 に一致していること。すなわち npm source を独立経路に**数えていない**ことを T-A1-06 の計算過程で確認 |
| 2 | `stage0-technical-gate-h3-h6-h7-stage1-entry-condition-i9` | **T-Q2** | 本 feature の検証結果が Stage 1 開始条件の判定材料として参照可能な形で記録されていること (`.dev-graph/cache/stage0-stage1-gate-receipt.json` の存在と、A1-A3 の判定値を含むこと) |
| 3 | `author-environment-macos-windows-linux-out-of-scope-qa001` | **T-Q3** | 実行した検証の対象 OS が **macOS と Windows のみ**であること。desktop Linux 向けの検証結果が混入していないこと |
| 4 | `npm-source-official-support-changelog-recheck-claude-code-plugins` | **T-Q4** | **P06 実行直前に `code.claude.com` の changelog / plugin-marketplaces ページを再照合**し、再照合の日時と結果 (仕様変更の有無) を証跡に記録していること。正本 anchor は v2.1.196、実行環境は v2.1.215 で drift があるため形式ではなく実質的に必要 |
| 5 | `cost-zero-verification-within-free-tier-c2` | **T-Q5** | 検証全体で**有償プラン契約・従量課金の発生がゼロ**であること。使用したサービスと無料枠の根拠を列挙。Windows 実機を有償調達していないことを含む |
| 6 | `solo-operator-ai-assisted-verification-c1` | **T-Q6** | 検証手順が提供者 1 名 + AI で完結し、**第三者の作業依頼を含まない**こと。手順数と OS 分岐数を記録し、採用判定 (ADR D5 順位 1) の入力にできる形にすること |
| 7 | `h7-unresolved-blocks-stage1-fail-closed-gate` | **T-Q7** | A1-A3 のいずれかが `fail`/`blocked` の場合に、**Stage 1 開始条件が「不成立」と記録される**こと。`blocked` を `pass` へ読み替える経路が存在しないことを判定手順上で確認 |
| 8 | `adopted-path-decision-record-registration-spec-state-decisions` | **T-Q8** | decision の登録先が `system-spec/spec-state.json` の `decisions[]` であり、**C01 単一 writer 経由**であること。`spec-state.json` の直接編集による登録が行われていないこと (T-A2-03 と重複するが、経路の正当性という別観点で判定する) |

## 4. Normative closure 対応テスト (baseline §7.3 の E1-E6)

| 証跡 | test ID | 判定条件 |
|---|---|---|
| E1 2 経路実機記録 | T-E1 | = T-A1-06 |
| E2 Windows/macOS 実機 E2E | T-E2 | = T-A3-05 かつ macOS 側の同等結果 |
| E3 C01 writer receipt (`status=applied`) | T-E3 | = T-A2-03 |
| E4 decision の exact lookup | T-E4 | = T-A2-04 ∧ T-A2-05 |
| E5 Publisher / Dual Catalog の `depends_on` 登録 | **T-E5** | `features/feat-publisher-plugin.md` と `features/feat-dual-catalog-web.md` の `depends_on` に **`feat-stage0-distribution-gate` が含まれる**こと (P01 時点で登録済みを確認済み。P13 は維持を確認する) |
| E6 Beads edge parity | **T-E6** | E5 の依存が Beads 側の edge と一致すること。`bd-bridge.py` の `edge_parity.confirmed == true` で判定する。**本 feature の実行中に実際に parity 不一致で claim が停止した実例があるため、形式確認ではなく実効性のある検査である** |

## 5. OS 別チェックリスト

### 5.1 macOS

- [ ] T-Q4 changelog 再照合 (P06 実行直前)
- [ ] T-A3-00 隔離下の認証維持
- [ ] T-A1-01 配信の到達性 (status / Content-Type)
- [ ] T-A1-02 `url-marketplace` add
- [ ] T-A1-03 `url-marketplace` install
- [ ] T-A1-04 `bootstrap-installer` 実行 (github 型)
- [ ] T-A1-05 経路独立性
- [ ] T-A1-07 npm source variant (内訳証跡)
- [ ] T-A3-04 実環境の非汚染
- [ ] T-Q3 対象 OS の確認 / T-Q5 費用ゼロ / T-Q6 単独運用

### 5.2 Windows

- [ ] **T-A3-00 隔離下の認証維持 (最初に実行)** — 落ちる場合は `--scope` へ切替
- [ ] T-A1-01 配信の到達性
- [ ] T-A1-02 / T-A1-03 `url-marketplace`
- [ ] T-A1-04 / T-A1-05 `bootstrap-installer` と独立性
- [ ] **T-A3-01 install / T-A3-02 列挙 (list + details) / T-A3-03 実行** ← A3 の本体
- [ ] T-A3-04 実環境の非汚染
- [ ] T-A3-05 A3 総合判定

### 5.3 対象外

desktop Linux 向けのチェックリストは**作成しない** (baseline §6 `author-environment-macos-windows-linux-out-of-scope-qa001`)。

## 6. 被覆の確認

| 対象 | 件数 | 対応 test ID | 未対応 |
|---|---|---|---|
| acceptance | 3 (A1/A2/A3) | T-A1-01..07 / T-A2-01..06 / T-A3-00..05 | **0** |
| quality_constraints | 8 | T-Q1..T-Q8 | **0** |
| Normative closure 証跡 | 6 (E1-E6) | T-E1..T-E6 | **0** |
| scope_in | 5 (S1-S5) | S1→T-A1-02/03, S2→T-A1-07, S3→T-A1-04, S4→T-A3-*, S5→T-A2-* | **0** |

## 7. 検証

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-stage0-distribution-gate`（世代非依存形式。current pointer から現行世代を解決する。generation path 直書きは再計画で stale になるため使わない。contract §2.3）
- Required evidence: quality_constraints 8 件と acceptance 3 件の全件に対応する実機検証ケース (macOS/Windows 別チェックリストを含む) が記載されていること → §2・§3・§5・§6 で確認可能
- rollback trigger: T-Q4 の changelog 再照合で marketplace 仕様の変更が判明した場合、該当 test ID の判定条件を修正し P05 以降を再実行する
