---
graph_node_id: "arch-harness-hub-dev-workflow"
artifact_kind: "architecture"
artifact_subtypes: ["infrastructure"]
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["system-spec-import","dev-workflow"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "Harness Hub dev-workflow アーキテクチャ (system-spec 取込)"
owners: ["daishiman"]
created_at: "2026-07-18T08:10:00Z"
updated_at: "2026-08-10T01:48:56.084284Z"
status: "active"
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["arch-harness-hub-frontend","arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-security","arch-harness-hub-infrastructure","issue-hooks-entry-point-parity-generalization-20260728","spec-harness-hub-plugin-hook-governance-20260804","doc-hooks-entry-point-parity-spec-reflection-receipt-20260804","issue-rubric-proposal-20260806-review","task-rubric-proposal-retention-final-review-handoff-20260810","doc-rubric-proposal-retention-spec-reflection-receipt-20260810"]
resource_scope: ["architecture/harness-hub-dev-workflow.md"]
purpose: "Hub 本体の開発フロー、作者ローカル環境規律、MVP ファースト判断軸、C02/C11 の安全境界、live-trial session 環境隔離、検査対象 0 件と CI/local 呼び出し parity、および外部参考層と能動 plugin の所有境界を参照する"
goal: "qa-038/qa-039/qa-066/qa-067/qa-069/qa-090/qa-092/qa-096/qa-102/qa-122/qa-139/qa-140、C16 qa-141/qa-142、および qa-143 の確定内容に適合し、C11 artifact readiness、C02 document parity、tmux session 環境隔離、CI/local 品質ゲート、inline Python graph authority、worktree 診断、ready-payload 欠落の復旧境界、hook entry point parity、consumer-owned reference の境界を情報欠落なく提供する"
scope_in: ["system-spec/dev-workflow.md"]
scope_out: ["正本章の内容複製","未確定章の取込"]
acceptance: ["正本章が confirmed かつ evaluator PASS","source_digest が正本と一致"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "architecture/harness-hub-dev-workflow.md"
template_id: "architecture"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"5d357fc1659da7c469bd51ec4fec58ead4f6b02f7880884e90ed21d525da9626","evaluator":"system-spec-harness compile + coverage validation (qa-216)","evidence_ref":"docs/features/feat-dev-pipeline-improvement/verification-tiering-final-review-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-09T00:00:00Z","origin_kind":"system-spec-harness","source_digest":"5d357fc1659da7c469bd51ec4fec58ead4f6b02f7880884e90ed21d525da9626","source_path":"system-spec/dev-workflow.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.95
classification_reason: "system-spec-harness 確定章の R3-import 正規取込 (confirmed + evaluator PASS)"
classification_candidates: [{"artifact_kind":"architecture","candidate_path":"architecture/harness-hub-dev-workflow.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-07-18T08:10:00Z","missing_sections":[],"status":"complete"}
---

# Harness Hub dev-workflow アーキテクチャ (system-spec 取込)

> 本 artifact は system-spec 確定章への **参照型 wrapper** (R3-import)。内容は複製せず、正本の変更は source_digest 不一致として検出される。

## 正本 (source of truth)

- [system-spec/dev-workflow.md](../system-spec/dev-workflow.md) (sha256: `5d357fc1659d…` (完全値は frontmatter source_lineage.source_digest))

- confirmation: `confirmed` / evaluator: `system-spec-harness compile + coverage validation (qa-139, qa-140)` → **PASS**
  ([f84o 仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/f84o-inline-python-guard-spec-reflection-receipt.md) / [exact-13 再登録受領書](../docs/features/feat-dev-pipeline-improvement/register-package-projection-idempotency-spec-reflection-receipt.md))
- 取込日時: 2026-08-03T09:45:00Z / plugin: system-spec-harness v0.1.0

## 要件定義書 (上位概念)

この wrapper は開発フローの設計判断を上位要件へ追跡する索引であり、要件本文の正本は `system-spec/dev-workflow.md` に置く。

### U1 本質的目的 (essential_purpose)

人と AI agent が同じ証拠と安全境界を使い、変更を繰り返し再現できる形で届ける。

### U2 背景 (background)

正本の多重化、検査の迂回、証跡の自己申告、worktree 間の競合は誤った完了判定を生む。

### U3 ゴール (goals)

仕様、Dev Graph、Beads、GitHub、live-trial の責務を分離しながら相互追跡可能にする。

### U4 目標 (objectives)

fail-closed な品質ゲート、独立評価、正準 bridge、branch/worktree 規律を自動検証する。

### U5 成功基準 (success_criteria)

task の Phase 1〜13、fresh live-trial、独立 verdict、対象限定 diff、PR 証跡がすべて再検証可能であることを成功とする。

### U6 ステークホルダー (stakeholders)

開発者、AI agent、reviewer、repository 管理者、仕様と課題の運用担当者を対象とする。

### U7 スコープ (scope)

仕様策定、task 分解、実装、検証、証跡、課題同期、branch/PR 公開の開発ライフサイクルを扱う。

### U8 制約 (constraints)

Graph/Beads の直書き、独立監査の上書き、証跡の偽装、無関係差分の commit を禁止する。

### U9 具体的にやりたいこと (concrete_intents)

入力から PR までの各判断を機械検証できる台帳へ結び、失敗時は原因の段階へ戻れるようにする。

### 意思決定支援 (decisions)

速度と証拠完全性が競合するときは、再現可能な証拠、独立評価、正本の一意性を優先する。

## Architecture overview

正本: system-spec/dev-workflow.md (qa-038: GitHub Flow + PR 必須・required status checks 8 種・PR preview + production・main merge 自動デプロイ・expand/contract migration 強制 / qa-039: 作者ローカル環境 macOS 主・Windows 従・CI と同一の pnpm verify・本番操作の CI 一本化 / qa-066: features README と 11 requirements-baseline を P0〜P5 の派生投影として参照し、循環する二重正本を作らない / qa-139: inline Python の Graph authority 書込みを AST で fail-closed 検出 / qa-140: mtime クラスタを診断に限定し reflog で原因確認)。

## Context and drivers

正本章 (system-spec/dev-workflow.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Goals and non-goals

正本章 (system-spec/dev-workflow.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## System context and boundaries

正本章 (system-spec/dev-workflow.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Container and component view

正本章 (system-spec/dev-workflow.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Cross-cutting contracts

正本章 (system-spec/dev-workflow.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Subtype architecture

- subtype: infrastructure — 詳細は正本章を参照 (複製しない)。dev-workflow は CI/CD・デプロイ・環境戦略を扱うため infrastructure subtype に分類 (schema の subtype enum に dev-workflow が無いための写像。domain=dev-workflow が実態を表す)

## Architecture decisions

正本章 (system-spec/dev-workflow.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Delivery, migration and rollback

正本章 (system-spec/dev-workflow.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Risks and verification

正本章 (system-spec/dev-workflow.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Beads bridge の内部コンポーネント境界 (2026-08-01)

`bd-bridge.py` は Beads mutation の唯一の CLI 境界として残し、内部ロジックを
`contracts` / `graph` / `projection` / `audit` の四 component へ分離する。
`contracts` と `graph` は Beads へ書かず、`audit` も read-only、書込投影は
`projection` だけが担う。外部 I/O を持つ関数は `bd=` / `git=` を注入され、
CLI adapter が呼出時に実行関数を解決する。この境界により、単一チョークポイントを
維持したまま責務ごとの変更容易性を保つ。一般コードには一律の数値行数上限を設けない。
行数ゲートは実行時 context へ入る `SKILL.md` と skill の `prompts/` に限定する。

詳細な責務、互換性、不変条件、検証証拠は
[仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/w7n7-bd-bridge-split-spec-reflection-receipt.md)
を正とする。

## Beads 自由フィールドの書込境界 (2026-08-02)

`priority`、`assignee`、`labels` は Dev Graph parity の対象外だが、書込 authority は
他の mutation と同じ C28 bridge に限定する。C10 guard は直接 `bd update` を一律遮断し、
CLI adapter は引数解析と receipt、`bd_bridge_contracts.py` は許可 exact-set・priority と
labels の正規化を担う。labels は `--set-labels` への全置換だけを許し、順序依存の
add/remove を契約面から排除する。設計判断と検証証拠は
[dc7 仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/dc7-bd-free-field-write-route-spec-reflection-receipt.md)
を正とする。

> **変更履歴**: 2026-07-21〜2026-08-01 の差分追記は
> [harness-hub-dev-workflow-changelog.md](../docs/features/feat-dev-pipeline-improvement/harness-hub-dev-workflow-changelog.md)
> へ分割済み (300 行上限超過による remediation)。新規の差分追記は同ファイルへ追記する。

## 外部参考層と能動 plugin の所有境界 (2026-08-02)

`doc/参考Skill/` は比較・移管用の参考層とし、実行時に使う契約は consumer plugin の
`references/` と resource map が所有する。旧参考 Skill を削除するときは、利用中の契約を
所有先へ履歴付きで移し、能動参照 0 件・到達可能性・復元経路を同じ変更で検証する。
製品 runtime の component 境界は変えない。詳細は `system-spec/dev-workflow.md` の
`qa-122` と [仕様反映受領書](../docs/features/feat-doc-governance-portability/aiworkflow-reference-cleanup-spec-reflection-receipt.md)
を正とする。

## C10 inline Python 静的解析境界 (2026-08-03)

C10 entrypoint は判定順序だけを所有し、inline Python の書込み API 収集を
`guard_python_writes.py`、副作用のない path 式評価を `guard_python_path_eval.py` が担う。
両 module は AST だけを使い、subprocess・network・repository file 読込みを遮断経路へ
持ち込まない。shell 抽出は Python の command 位置、環境変数付き起動、嵌め込み shell を
区別し、散文として出力する `echo` / `cat` を実行と誤認しない。mutation API は import 解決後の
qualified name で判定し、同名のユーザー定義関数を巻き込まない。rename / move は source と
destination の双方、評価不能 path は確定済み
authority prefix / graph-store tail で fail-closed にする。別 script の本文は PreToolUse の
時間契約外とし、PostToolUse drift audit が補完する。契約と検証は
[f84o 仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/f84o-inline-python-guard-spec-reflection-receipt.md)
を正とする。

## hooks entry point 宣言・登録・実体の 3 者一致境界 (2026-08-04)

hooks の entry point 台帳は `package-contract.json` の `entry_points.hooks` が所有し、
その parity 検査は dev-graph 専用の契約テストではなく repo 全体の必須ゲート
`scripts/validate-plugin-completeness.py` (HK-001..003) が単一 SSOT として持つ。

**一般化する判断の根拠**: 宣言 ⊆ 実体だけを見る旧検査では台帳の過少申告 (登録済み
かつ未宣言) を検出できず、「乖離が無い」ことを確認する手段自体が無かった。実際に
一般化した検査で harness-creator の `auto-sync-on-session-start` 1 件が検出され、
移行コストは宣言 1 行の追加に収まった。同スクリプトは behavior closure の外側にある
ため、検査追加が live-trial receipt を失効させない点も採用理由である。

- HK-001 登録 ⊆ 宣言。登録元は `hooks/hooks.json` と manifest inline hooks の和を取る
  (manifest が hooks.json を参照していなくても Claude Code は読むため fail-closed)。
- HK-002 宣言 ⊆ 登録。`hooks/hooks.json` または manifest inline hooks の少なくとも一方を
  持つ plugin に適用する。登録経路自体を持たない plugin へ適用すると「未配線」を
  「宣言漏れ」と取り違える。
- HK-003 残余は import 専用 support module であること。判定は命名規則だけに頼らず
  shebang と `__main__` ブロックの不在まで要求し、責務分割 (500 行規約) で生まれる
  support module を偽陽性にせず、snake_case を付けた実 hook の宣言漏れも通さない。

判定ロジックの複製は禁じる。dev-graph の契約テストは同スクリプトの関数を import して
実 repo へ適用するだけとし、plugin 専用実装が repo 全体の検査を追い越す被覆差
(HarnessHub-vf66) を再発させない。

## C16 Beads ready payload 欠落の観測境界 (2026-08-03)

C16 は選択範囲内かつ schedulable な tracker_binding=beads node を、C28 の bd ready payload に同じ external_ref がなければ ready set に推測追加せず、unmapped[] の ready_payload_entry_absent / source=schedule-graph として報告する。pre-lease は ready/unmapped、active lease 後は conflicts を加えた和で候補を被覆する。entry はあるが parity が不一致な経路、依存未充足、C28 manifest 側の分類とは reason を混同せず、dependency 配列は順序でなく集合として比較する。P01 parent や dependency 形状の不正は停止する。復旧は C03/C28 の正規同期・linkage 修復・fresh parity manifest 生成後の再 schedule であり、製品 API、DB、認証認可、UI、Cloudflare deploy unit は変更しない。詳細と検証は [xz0u 仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/xz0u-ready-payload-entry-absent-spec-reflection-receipt.md) を正とする。

## C11 system-spec import heading readiness (2026-08-09 / `HarnessHub-o4zi`)

- template contract が `origin_kind + source_path` と conditional required sections の写像を所有し、resolver は全条件を AND 比較する。条件無し・lineage 不正は fail-closed に base へ戻す。
- validator は architecture / specification / task を対称に検査し、不足見出しを readiness evidence として列挙する。完全な base template は conditional family 発火時も有効である。
- plugin、導入済み `.dev-graph`、plugin-plan の contract copy は byte parity を保ち、fixture は契約正本から見出しを取得する。
- gate が検出した旧 specification / task は標準見出しへ移行し、500 行を超える詳細仕様は短い正規 contract と調査履歴へ責務分離する。
- foundation U1〜U9 の source-index は新しい要件文で補わず、記録済みユーザー発言を正規 transition で結び付ける。受理は coverage / source citation の同時 PASS を必須にする。

C19 の source-derived body は source artifact と byte 同一に保つ。adapter は node shape と source 読取り、C02 writer は node と graph store の書込みを所有し、elicitation / compile 実行ロジックを Dev Graph 側へ複製しない。製品 runtime は非変更。詳細は [o4zi 仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/o4zi-system-spec-import-heading-contract-spec-reflection-receipt.md) を正とする。

## 検証 tier の責務境界 (2026-08-09 / qa-216)

`select-verification-tier.py` は変更 path と規則表だけから `mvp / standard / critical` の最高一致 tier を返し、規則/source digest を証拠へ残す。`verification-gate-ledger.json` は gate 定義の SSOT（正本）で、plan builder が blocking・advisory・deferred を導出する。decision validator は selector absent、非仕様語彙、受け皿の無い延期を拒否する。

CI は現時点で算出・記録・artifact 保存までを担い、tier による下流 step 切替は `HarnessHub-xcl3` に残す。evaluator cache も機構だけがあり、実呼出元への配線は `HarnessHub-6nf1` に残す。この未配線境界を隠さないことを設計契約とする。詳細は [検証 tier 仕様追補](../specs/harness-hub-verification-tiering-addendum.md) と [仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/verification-tiering-final-review-spec-reflection-receipt.md) を正とする。

## C04 deep knowledge card 境界 (2026-08-10 / `HarnessHub-ldq`)

章と deep card の対応は `resource-map.yaml`、card の依存順は `knowledge-catalog.json` が所有する。compiler はこの宣言から `ui-ux` / `testing-qa` / `dev-workflow` / `infrastructure` の 4 章へ知識を投影し、validator は欠落・未知参照・順序 drift を停止する。製品 runtime には影響しない。詳細は [writeback 仕様](../specs/harness-hub-system-specification-implementation-writebacks.md) と [受領書](../docs/features/feat-dev-pipeline-improvement/ldq-design-knowledge-cards-spec-reflection-receipt.md) を参照する。

## C19 build / resume 完了境界 (2026-08-10)

build path の authority は独立 evaluator の native completion、resume path の authority は digest-bound receipt と deterministic runner report とする。resume report は C02 dry-run/upsert、graph preview、source digest、evidence ref の全 step を列挙し、post-run gate が transcript 上の runner stdout と byte-equivalent な JSON であることを確認する。resume では upstream Skill・Agent・runner 外 direct upsert を拒否する。これにより「再評価禁止」と「evaluator 完了必須」の循環を解消しつつ、C02 single-writer 境界を保つ。詳細は [仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/c19-resume-closure-spec-reflection-receipt.md) を正とする。

## rubric draft の保存と処遇判断の分離 (2026-08-10)

`run-skill-rubric-governance` が生成する `proposals/*.md` は、評価結果と改善候補を保持する証拠であり、採用・棄却・保留を決める authority（決定権）ではない。未判断 draft を保存するときは、同じ変更で Beads と dev-graph issue を結び、提案 path、未判断項目、close 条件を durable handoff（次の作業者が消えない形で引き継げる記録）として残す。commit や draft PR は保存・レビュー導線に限定し、human triage 完了前に issue を close しない。

これは `system-spec/dev-workflow.md` が継承する P13 write-back、scope separation、未完了項目の課題化を今回の rubric 提案へ適用したもので、新しい製品 component や runtime 契約は追加しない。`system-spec/spec-state.json` と確定章は変更せず、既存の [実装 writeback 索引](../system-spec/index.md#実装-writeback-索引-確定章への追記ではない) から `specs/` 追補と受領書へ接続する。今回の境界と残作業は [仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/rubric-proposal-retention-final-review-spec-reflection-receipt.md) を正とする。
