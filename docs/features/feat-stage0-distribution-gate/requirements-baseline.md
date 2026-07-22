---
status: confirmed
layer: feature-design
task: SYS-STAGE0-DISTRIBUTION-GATE-P01
parent_feature: feat-stage0-distribution-gate
feature_package_id: feature-package/feat-stage0-distribution-gate
source: .dev-graph/plans/feature-package-feat-stage0-distribution-gate/goal-spec.json
feature_context_digest: sha256:6b7340ade5290ee9e3c5bb63d22d3381684b28817303152c6240906ff050fb0a
architecture_refs: [arch-harness-hub-infrastructure]
---

# feat-stage0-distribution-gate 要件ベースライン

> **位置づけ**: P01 (要件ベースライン確定) の成果物。promoted goal-spec の purpose/goal/scope_in/scope_out/acceptance/quality_constraints を**確定転記**した baseline であり、P02 以降の全 task はこの文書を唯一の合意事項として参照する。転記元との相違が判明した場合は本文書を修正せず goal-spec 側の再確定を dev-graph へ差し戻す (rollback 規約)。

> **構築順オーバーレイ (baseline 外)**: **P0 技術 Gate**。P2 の install/download 実方式を先に確定する技術前提で、認証を最初の業務機能にする方針とは矛盾しない。正本: [system-design-overview.md](../../system-design-overview.md) §3 / [README.md](../README.md)。

## 1. 目的 (purpose)

Stage 1 へ投資する前に、Skill 配布の成立経路 (URL 型 marketplace / npm source / Bootstrap Installer) と Windows 実機 E2E を検証し、成立経路を確定する (仮説 H7)

## 2. ゴール (goal)

最小 artifact で 2 経路以上の配布検証が完了し、採用経路が根拠付きで記録された状態

## 3. スコープ

### 3.1 scope_in

1. URL 型 marketplace 検証
2. npm source 検証 (公式サポート確認済み)
3. Bootstrap Installer 試作
4. Windows/macOS 実機 E2E
5. 採用経路の決定記録

### 3.2 scope_out

1. Hub 本体の実装
2. 課金・商用配布

## 4. 受入基準 (acceptance — goal-spec 3 件の確定転記・転記原文)

### 4.1 転記原文と判定責務

| # | acceptance (転記原文) | 一次判定 phase | 最終判定 phase |
|---|---|---|---|
| A1 | 2 経路以上の実機検証記録が存在する | P06 (実機検証実行) | P07 → P10 |
| A2 | 採用経路が decision record として登録される | P13 (C01 writer 登録依頼) | P07 → P10 (§7 fail-closed 契約により P13 の applied receipt 確認まで pass 不可) |
| A3 | Windows E2E が成功する | P06 (Windows 実機 E2E) | P07 → P10 |

### 4.2 検証方法 (machine-verifiable)

P04 が実行可能 test ID を定義し P06 が実行する際の、A1-A3 それぞれの合否判定条件を以下に固定する。ここに書かれた条件以外を pass 根拠にしてはならない。

| # | 合否判定条件 (exact lookup 可能な形) |
|---|---|
| A1 | canonical path を `url-marketplace` / `bootstrap-installer` の **2 件に固定**し (npm source は §6 `stage0-two-path-distribution-technical-gate-h7-qa003` により `url-marketplace` 経路内の source type variant として扱い、独立経路として数えない)、両 canonical path それぞれについて `result=success` の実機検証記録が 1 件以上存在すること。すなわち成功記録が存在する distinct canonical path 数 ≥ 2。npm source variant の記録は A1 の充足数に加算せず、`url-marketplace` 経路の内訳証跡として保持する |
| A2 | `.dev-graph/cache/stage0-decision-registration-receipt.json` の `status` == `applied` かつ、同 receipt の decision `id` が `system-spec/spec-state.json` の `decisions[]` に **完全一致で存在**し当該 decision の `status` == `confirmed` であり、かつ receipt の spec-state after digest が現行 `system-spec/spec-state.json` の実測 sha256 と一致すること (3 条件の AND。1 つでも欠けたら fail) |
| A3 | Windows 実機で以下 3 点が **すべて** 記録されていること: (a) 採用経路の install コマンドが exit code 0 で終了、(b) インストール後に対象 skill が Claude Code の plugin/skill 一覧へ列挙される、(c) 当該 skill を実行し期待出力が得られる。install の exit code 0 のみを A3 の pass 根拠にしてはならない (「入るが使えない」状態を通過させないため) |

- 上記は P04 が定義する実行可能 test ID の判定述語の正本とする。P04 は本表の各行に test ID を 1 対 1 で対応させる。
- 本表の条件を緩める変更は baseline の改訂を要し、P06 以降の phase 単独では行えない。

## 5. scope_in 責務追跡 (未割当 0 件)

現行 feature context (`sha256:6b7340ade5290ee9e3c5bb63d22d3381684b28817303152c6240906ff050fb0a`) の scope_in 5 件について、実行責務を持つ phase を全件割り当てる。空欄・未割当が 1 件でも存在する場合、本 baseline は不成立として P02 へ引き継がない。

| # | scope_in (転記原文) | 実行 phase | 対応 acceptance |
|---|---|---|---|
| S1 | URL 型 marketplace 検証 | P05 (artifact 作成) → P06 (実機検証) | A1 |
| S2 | npm source 検証 (公式サポート確認済み) | P05 → P06 | A1 |
| S3 | Bootstrap Installer 試作 | P05 → P06 | A1 |
| S4 | Windows/macOS 実機 E2E | P06 | A1, A3 |
| S5 | 採用経路の決定記録 | P13 (C01 writer 経由登録) | A2 |

- 未割当件数: **0 件** (scope_in 5 件すべてに実行 phase と対応 acceptance を割当済み)
- scope_out 2 件 (Hub 本体の実装 / 課金・商用配布) はいずれの phase にも割り当てない。割り当てが発生した時点で scope 逸脱として差し戻す。

## 6. 品質制約 (quality_constraints — goal-spec 8 件の確定転記)

| id | summary (転記原文) | source |
|---|---|---|
| stage0-two-path-distribution-technical-gate-h7-qa003 | Publisher / Skill の作者環境への配布は URL 型 marketplace (native source) または Bootstrap Installer の 2 経路を Stage 0 technical gate (H7) で検証し、成立した経路を採用する。npm source (claude-code-plugins 公式サポート確認済み) は URL 型 marketplace 経路内の source type として扱う。 | system-spec/spec-state.json qa-003 (「Publisher / Skill の作者環境への配布は URL 型 marketplace [native source] または Bootstrap Installer の 2 経路を Stage 0 technical gate [H7] で検証し、成立した経路を採用する」) |
| stage0-technical-gate-h3-h6-h7-stage1-entry-condition-i9 | Stage 0 technical gate は URL 型 marketplace / Bootstrap Installer / wrangler 公開の成立検証 (仮説 H3/H6/H7) を行い、その結果が Stage 1 開始条件の判定材料になる。本 feature は H7 (Skill 配布経路) の検証を担う。 | system-spec/00-requirements-definition.md I9 (「Stage 0 technical gate: URL 型 marketplace / Bootstrap Installer / wrangler 公開の成立検証 [H3 / H6 / H7] と Stage 1 開始条件の判定」serves G1, G3); U7 スコープ (in) 「Stage 0: Discovery Pilot と technical gate 検証 [H3 / H6 / H7: wrangler CLI 公開・URL 型 marketplace・Bootstrap Installer]」 |
| author-environment-macos-windows-linux-out-of-scope-qa001 | 実機 E2E の対象作者環境は macOS + Windows のみ。desktop Linux は非エンジニアの業務 PC に存在しないため対象外とする。 | system-spec/spec-state.json qa-001 (「作者環境は macOS + Windows。desktop Linux は対象外 [非エンジニアの業務 PC に存在しないため]」) および matrix.infrastructure.desktop-linux (「Linux desktop 向け Publisher 配布は対象外 [作者環境は macOS + Windows]」) |
| npm-source-official-support-changelog-recheck-claude-code-plugins | npm source は claude-code-plugins 公式ドキュメント (2026-07-17 再確認) で github・git URL・git-subdir と並ぶ正式な source type として確認済み。ただし remote URL 型 marketplace では marketplace.json しか取得されず相対パス source の plugin 本体は解決不能であるため、plugin 本体の配布には外部 source (npm 等) が必須になる制約がある。CLI は高頻度リリース (2026-07 時点 v2.1.21x 系) のため、H7 検証時および実装着手時に code.claude.com の changelog を再照合する。 | system-spec/fetched-references.json claude-code-plugins entry (「source type は github・git URL・git-subdir に加え npm も許可されており…remote URL 型では marketplace.json しか取得されないため相対パス source の plugin は解決不能で、plugin 本体 source は外部 source が必要…Stage 0 technical gate [H7] の検証対象…CLI は高頻度リリースされており [2026-07 時点 v2.1.21x 系]、H7 検証と実装着手時に code.claude.com の changelog / 本ページを再照合する」) |
| cost-zero-verification-within-free-tier-c2 | Stage 0 の検証 (試作・実機 E2E を含む) も C2 (固定費ゼロ・無料枠優先) の対象であり、有償プラン契約を伴わずに完了できる範囲で実施する。 | system-spec/00-requirements-definition.md U8 制約 C2 (「インフラコスト: 固定費を極小化する [従量課金・無料枠優先]。顧客 Workspace 数が増えても固定費が比例して増えないこと」) |
| solo-operator-ai-assisted-verification-c1 | 検証体制は提供者 1 名 + AI (Claude Code / Codex) のみで完結させ、運用負荷の低さ・保守性を経路選定の最優先基準とする。 | system-spec/00-requirements-definition.md U8 制約 C1 (「開発体制: 実装・運用は提供者 1 名 + AI [Claude Code / Codex] のみ。運用負荷の低さと保守性を技術選定の最優先基準とする」) |
| h7-unresolved-blocks-stage1-fail-closed-gate | H7 (Skill 配布の成立経路) が Stage 0 で成立確認されない限り、Stage 1 (Publisher + Thin Dual Catalog MVP) へは進めない。本 feature の受入 (「2 経路以上の実機検証記録が存在する」「Windows E2E が成功する」) は Stage 1 開始条件の充足根拠として扱う fail-closed ゲートである。 | system-spec/00-requirements-definition.md I9 (Stage 0 technical gate の成立検証と Stage 1 開始条件の判定); U7 スコープ (in) の Stage 0 / Stage 1 の順序区分; features/feat-stage0-distribution-gate.md depends_on: [] (Stage 0 先頭 feature であり後続 Stage 1 系 feature の前提となる) |
| adopted-path-decision-record-registration-spec-state-decisions | 採用経路の決定は system-spec/spec-state.json の decisions[] (D1-D6 と同形式: id / question / status / options / 評価軸 / 確定根拠) への登録を経路とし、実機検証記録を伴う decision record として確定させる。 | system-spec/spec-state.json decisions[] (D1-D6 の登録形式: id / question / status=confirmed / options / AI推奨 / ユーザー決定 / 資するゴール); features/feat-stage0-distribution-gate.md 受入 (「採用経路が decision record として登録される」) |

## 7. Normative closure — H7 fail-closed 契約 (2026-07-19 確定)

本節は P01 が確定し、**P02 以降の全 task に対して規範 (normative)** として作用する。本節と矛盾する記述が後続 task spec に現れた場合は本節を優先する。

### 7.1 decision record 登録の単一 writer 契約

- 採用経路の decision record を `system-spec/spec-state.json` の `decisions[]` へ書き込めるのは **C01 (run-system-spec-elicit) の単一 transition writer のみ**である。実体は `plugins/system-spec-harness/skills/run-system-spec-elicit/scripts/apply-spec-transition.py set-decision`。
- `spec-state.json` の直接編集は経路違反として拒否する。本 feature は writer の内部実装を変更しない (scope out) が、**writer の実行と applied receipt の検証は本 feature の責務**である。
- P13 は登録依頼と writer 実行を行い、以下 3 点を receipt として残す。
  1. writer receipt の `status` = `applied`
  2. 登録された decision の `id` と digest
  3. writer 適用後の spec-state after digest
- 証跡パス (published task spec の Effective implementation/evidence paths 正本):
  - `.dev-graph/cache/stage0-decision-registration-request.json`
  - `.dev-graph/cache/stage0-decision-registration-receipt.json`
  - `.dev-graph/cache/stage0-stage1-gate-receipt.json`

### 7.2 fail-closed 判定規則

- **P07 は「P13 で登録予定」を A2 の pass 根拠にできない。** 予定・計画・文書化は実施済み証跡の代替にならない。
- §7.1 の 3 点 (applied receipt / decision id・digest / after digest) が exact lookup で確認できるまで、**P07・P10・P13 および feature 完了を fail-closed** とする。
- H7 が Stage 0 で成立確認されない限り Stage 1 (Publisher + Thin Dual Catalog MVP) へ進めない (§6 `h7-unresolved-blocks-stage1-fail-closed-gate` と同一のゲート)。

### 7.3 必須証跡 (mandatory evidence — 6 件)

| # | 証跡 | 確認 phase |
|---|---|---|
| E1 | 2 経路実機記録 | P06 → P07 |
| E2 | Windows/macOS 実機 E2E | P06 → P07 |
| E3 | C01 writer receipt (`status=applied`) | P13 → P07/P10 |
| E4 | decision の exact lookup (id / digest / after digest) | P13 → P07/P10 |
| E5 | Publisher / Dual Catalog の parent feature `depends_on` への本 feature 登録 | P13 |
| E6 | Beads edge parity (E5 の依存が Beads 側 edge と一致) | P13 |

E5 の現況 (P01 時点の観測): `features/feat-publisher-plugin.md` および `features/feat-dual-catalog-web.md` の `depends_on` に `feat-stage0-distribution-gate` が登録済み。P13 は本登録の維持と E6 の parity 確認を行う。

### 7.4 trace rule (phase 間の証跡受け渡し規則)

- P04 が実行可能 test ID を定義する → P05 がその対象を実装する → P06 が実行する。
- P07 / P10 は **実行済み証跡のみ**を裁定対象とする。未実行・計画中のものを裁定に含めない。
- P09 は適用対象となる検査を fail-closed にする。
- P11 は source digest と再実行コマンドを保全する。
- P12 / P13 は、**不足している実装・証跡を文書や計画で代替できない**。

## 8. 転記元と検証

- 転記元: `.dev-graph/plans/feature-package-feat-stage0-distribution-gate/goal-spec.json` (promoted。feature_context_digest = sha256:6b7340ade5290ee9e3c5bb63d22d3381684b28817303152c6240906ff050fb0a)
- 本文書の受入条件 (P01 acceptance):
  1. goal-spec の acceptance 3 件 (§4) と quality_constraints 8 件 (§6) が過不足なく転記されていること
  2. 現行 feature context の scope_in / acceptance 全件に実行責務 phase が割り当てられ、未割当 0 件であること (§5・§4.1)
  3. Normative closure (§7) が固定され、P07 が「P13 で登録予定」を pass 根拠にできない fail-closed 契約が明示されていること
- 検証コマンド: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-stage0-distribution-gate`（世代非依存形式。current pointer から現行世代を解決する。`--staging .` は repository root から解決できないため使わない。contract §2.3）
