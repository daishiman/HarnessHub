---
graph_node_id: "issue-docs-recompose-followups-20260718"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["decompose","follow-up","dev-graph"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "docs/ 全体マクロ再分解 (2026-07-18) の残 findings 5 件の是正"
owners: ["daishiman"]
created_at: "2026-07-18T16:20:35Z"
updated_at: "2026-07-18T16:20:35Z"
status: "draft"
depends_on: []
related_nodes: ["feat-tenant-data-retention","feat-domain-model-db","feat-auth-tenancy"]
resource_scope: ["docs/security-spec.md","features/feat-domain-model-db.md","plugins/dev-graph/scripts/bd-bridge.py"]
purpose: "docs/ 全体マクロ再分解 (run-dev-graph-decompose 2026-07-18) で検出した drift・バグ・残骸のうち、分解処理の範囲外である 5 件を追跡して是正する"
goal: "security-spec の C4 旧前提修正、feature md の architecture_refs 整合、arch-dev-workflow の参照接続、bd-bridge 冪等検索修正の恒久化、beads closed 残骸の整理方針確定が完了している"
scope_in: ["docs/security-spec.md §1.4 N2 の qa-048 整合修正","features/feat-domain-model-db.md architecture_refs の baseline 整合修正","arch-harness-hub-dev-workflow への参照 feature 接続","bd-bridge.py _find_external/_create_one 修正のテスト追加と commit","beads closed 残骸 57 組の整理方針確定"]
scope_out: ["feat-tenant-data-retention の confirmation 判断 (feature 側で追跡)","P02 で確定する境界事例 (users 所有権・Build 自動生成 owner)"]
acceptance: ["security-spec §1.4 N2 が qa-048 と無矛盾","feature md と baseline の architecture_refs が一致","arch-harness-hub-dev-workflow を参照する feature が 1 以上","bd-bridge 修正がテスト付きで main に反映","closed 残骸の keep/purge 方針が記録済み"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-docs-recompose-followups-20260718.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-18T16:20:35Z","origin_kind":"manual","source_digest":null,"source_path":"eval-log/run-dev-graph-decompose-progress.json","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "docs/ 全体マクロ再分解 (2026-07-18) の R2 カバレッジ分析 findings と実行中インシデント (INC-1) を追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-docs-recompose-followups-20260718.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-9ao","linked_at":"2026-07-18T16:24:01Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-18T16:20:35Z","missing_sections":[],"status":"complete"}
---

# docs/ 全体マクロ再分解 (2026-07-18) の残 findings 5 件の是正

`/dev-graph decompose` (docs/ 全体入力) の R2 カバレッジ分析と実行中インシデントから、分解処理の範囲外として残った是正項目を追跡する。

## Findings

### 1. security-spec §1.4 N2 の C4 旧前提残存 (high) — 解消済み (2026-07-18)

`docs/security-spec.md` §1.4 N2 が「顧客業務データの保護 — C4 により Hub は保持しない」と記載し、C4 改訂 (qa-048: 業務データ保持可) と矛盾していた。

**解消**: frontmatter qa_ref に qa-045/qa-046/qa-048/qa-050 が既登録である事実から、これは R4-reopen を要する新規変更ではなく確定済み qa-050 の転記漏れと判定。qa-050 の確定文言どおり §1.2 に業務データ 2 種 (最高機密区分)、§1.3 に T14/T15、§1.4 に N2 撤回を転記し、§10 に確定記録を追記した。DDL・検証手順の全面展開は qa-046 の据置どおり feature P02 前の security 深掘りで実施する (据置は本 issue のスコープ外)。

### 2. feat-domain-model-db の architecture_refs 不一致 (medium) — macro 解消済み (2026-07-19)

`features/feat-domain-model-db.md` は data/backend、外部 planner の P01 baseline は data/infrastructure で分裂していた。独立 macro auditor が scope を再確認し、repository/API は backend、schema は data、R2/export/migration/D1 退避は infrastructure に属するため、feature/context/graph の `architecture_refs` を 3 層の和集合へ統一した。P01 baseline は外部 planner の digest 固定成果物なので本 macro 操作では改稿せず、次回 re-plan で再同期する。

### 3. arch-harness-hub-dev-workflow の孤立 (low) — 解消済み (2026-07-19)

15 feature の architecture_refs を再集計し、共通 package 境界・CI/CD・required status checks・PR preview の owner である `feat-hub-foundation` から参照を接続した。同 feature は shared-layers §1〜§3 の owner として frontend/backend/data/security/infrastructure/dev-workflow の全6 architecture を参照する。

### 6. docs 25件の再監査 findings (high/medium) — macro 解消済み (2026-07-19)

`eval-log/run-dev-graph-decompose-docs-coverage-audit-20260719.json` の再監査で検出した dependency SSOT、C4 非保持記述、legal owner、shared-layer owner、feature source lineage のずれを graph revision 20 へ同期した。retention から docs/hearing/build への必須 edge は追加せず、任意統合 API / extension point として境界を固定した。既存 P01〜P13 package のうち context が変わった feature は外部 planner 再実行まで stale として扱い、macro 操作から task を直接変更しない。

### 4. bd-bridge.py 冪等検索修正の恒久化 (high) — テスト追加済み (2026-07-20)

bd 1.1.0 の `search --external-contains` 非対応により `_find_external` が常に「既存なし」と誤判定し、projection 再実行で二重起票が発生していた (2026-07-18 の実行で顕在化・修正済み・未 commit)。`_find_external` の text query + list フォールバック化、`_create_one` の show 再取得を、回帰テスト付きで commit する。過去の hub-foundation (0e9 系) / auth-tenancy (p4q 系) 二重投影も同根。

**恒久化**: `_find_external` / `_create_one` の修正本体は commit `184acbc` で既に main に入っていた (未 commit だったのは 2026-07-18 時点の記録) 一方、回帰テストが欠けていた。既存の `test_c27_c28_projection_contract.py` の fake は `search` が external_ref で一致する理想実装であり、実際の失敗機序 (bd がヘルプ文を返す) を構造的に再現できないことを確認したため、bd 1.1.0 の実挙動を模した専用テスト `plugins/dev-graph/tests/test_bd_bridge_external_ref_idempotency.py` (7 ケース) を追加した。

実挙動の実測 (2026-07-20, bd 1.1.0 Homebrew):

- `bd search --external-contains <ref> --json` は positional query を欠くと JSON 行ではなくヘルプ文を stdout へ出す → `bd()` が JSON として解せず `{"text":..., "returncode":...}` へ退避 → `_find_external` から「該当 0 件」に化ける。これが二重起票の直接機序。
- `bd search` の text query は title/ID を引く (help 記載) ため、単独では取りこぼしうる。`list --status all --limit 10000` フォールバックが実質の正本経路。
- `bd list --json` の行は `external_ref` を持つが `issue_type` / `parent` を持たない → `_create_one` の `show` 再取得は削れない構造的必然。

固定した契約: search 盲目時の list フォールバック / external_ref 完全一致のみ採用 (部分一致で誤って冪等化しない) / list 経由で発見した既存を再 create しない / show 再取得による type・parent 不一致の fail-closed / digest 変更時の update supersede。変異検査 (修正を pre-fix 実装へ巻き戻して再実行) で 5 ケースが fail することを確認済み。

### 5. beads closed 残骸の整理方針 (low) — 方針確定済み (2026-07-20)

open+closed 併存の external_ref が 57 組 (今回復旧した y5y/5yp 系 28 組を含む)。open 側単一のため実害はないが、パリティ検査のノイズになる。keep (監査証跡として保持) / purge (external_ref 剥離) の方針を確定して記録する。

**現況の再実測 (2026-07-20)**: `bd list --status all --limit 10000 --json` で issue 287 件 (open 214 / closed 70 / in_progress 3)、`external_ref` 保有 269 件、**同一 external_ref の重複 0 組**。2026-07-18 に観測した 57 組は既に解消しており、剥離作業の残件はない。

**確定方針 — purge (fail-closed)**:

- closed 残骸は `external_ref` を剥離して運用する。**closed issue 自体は監査証跡として残す** (剥離対象は external_ref フィールドのみ)。
- 同一 external_ref の併存を検出したら `_find_external` が `ContractError("duplicate beads external_ref")` で projection を止める (現行実装のまま・挙動変更なし)。
- keep (open 側を暗黙採用して closed を無視する fail-open) は採らない。重複検知を弱め、finding 4 の二重起票再発を隠すため。
- 採用理由: 現行実装が既に fail-closed であること、本 issue の scope_in が「方針確定」であり `resource_scope` 外の挙動変更を含まないこと、dev-graph 全体が parity・digest 不一致でも止める fail-closed 設計で一貫していること。

方針は文書だけでなく `test_bd_bridge_external_ref_idempotency.py::test_find_external_fails_closed_on_open_plus_closed_remnant` で機械強制しており、fail-open へ退行すると CI が落ちる。

## 派生 issue (2026-07-21)

本 issue の実行中に、`guard-graph-schema` が beads mutation を `bd-bridge.py` の単一チョークポイントへ限定する一方で `bd-bridge.py --op update` が `--notes` / `--design` を、`--op create` が `--priority` を通せないことを観測した。notes 更新の正規経路が存在しないため、本 issue の進捗メモを beads 側へ残せなかった。`issues/sys-bd-bridge-notes-passthrough-20260721.md` (HarnessHub-8ql) として分離して追跡する。
