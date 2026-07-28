---
graph_node_id: "issue-cross-plugin-behavior-closure-staleness-20260728"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["dev-graph","live-trial","package-contract","verify","goodhart"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "依存プラグインの非対象 skill 編集が dev-graph の live-trial 挙動閉包ダイジェストを連鎖失効させ verify を落とす"
owners: ["daishiman"]
created_at: "2026-07-28T01:00:00Z"
updated_at: "2026-07-28T01:00:00Z"
status: "draft"
depends_on: []
related_nodes: ["issue-c08-audit-primary-get-capability-20260722","issue-500-line-split-dilutes-harness-coverage-20260728"]
resource_scope: ["plugins/harness-creator/skills/run-skill-live-trial/scripts/live-trial-verdict.py","plugins/dev-graph/tests/test_skill_criteria_evidence.py","plugins/dev-graph/references/package-contract.json"]
purpose: "run-skill-live-trial の skill_dir_tree_sha (挙動閉包ダイジェスト) は、依存プラグインとして宣言された package-contract.json の entry_points.{skills,agents,commands} をエントリポイントディレクトリごと丸ごと閉包へ取り込む。そのため system-spec-harness の entry-point skill (assign-system-spec-completeness-evaluator 等) を 1 byte 編集しただけで、それを直接使っていない dev-graph:run-dev-graph-system-spec の live-trial 証跡まで stale 化し、test_skill_criteria_evidence.py の verify が落ちる。2026-07-28 に HarnessHub-nq2 (PR #88) で実測した: origin/main では PASS、nq2 branch では plugins/dev-graph/ への diff が 0 件のまま FAIL、記録済み skill_dir_tree_sha (8f1013d23ccdcc...) と再計算値 (14c0b847adcea6...) が不一致。"
goal: "依存プラグインの非対象 skill 編集だけでは dev-graph 側の live-trial 証跡が連鎖失効しない仕組み (閉包スコープの絞り込み、または意味的に無関係な変更への verdict 継承) を確定する"
scope_in: ["behavior_closure_files() が依存プラグインの entry point 全体を閉包に含める現行設計を維持するか、dev-graph が実際に呼び出す skill のみへ絞るかの評価","sha 不変以外の verdict 継承 (意味的に無関係と判定できる変更への引き継ぎ) の是非評価","live-trial fixture worktree が prunable のまま実体だけ消える運用の是正 (今回 sysspec-split trial で発生)"]
scope_out: ["verify の検査基準の緩和 (回帰の正しい検出は維持する)","content-review-verdict の sha 手書換による偽装的な緑化"]
acceptance: ["依存プラグインの entry-point skill 編集が dev-graph 側 live-trial 証跡へ与える影響範囲の設計判断が確定している","判断が plugins/dev-graph の実装または architecture へ反映されている","eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260726T033200Z-sysspec-split/ の未完了 trial が re-trial または明示的な破棄のいずれかで解消されている"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-cross-plugin-behavior-closure-staleness-20260728.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-28T01:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "HarnessHub-nq2 (PR #88) の verify 失敗原因調査 (git worktree での origin/main vs nq2 実測比較) で特定した構造的副作用の追跡課題"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-cross-plugin-behavior-closure-staleness-20260728.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-1wo3","linked_at":"2026-07-28T04:48:09Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-28T01:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`plugins/dev-graph` は `references/package-contract.json` の `depends_on` に `system-spec-harness` を宣言している。
`run-skill-live-trial` の `skill_dir_tree_sha` (挙動閉包ダイジェスト) は、依存プラグインとして宣言された
`system-spec-harness` の `entry_points.skills` 配下 (`run-system-spec-elicit` / `run-system-spec-doc-fetch` /
`run-system-spec-compile` / `ref-system-design-knowledge` / `assign-system-spec-completeness-evaluator`) を
まるごと閉包へ取り込む設計になっている。そのため、**`system-spec-harness` 側の対象 skill を 1 byte でも
編集すると、それを直接使っていない `dev-graph:run-dev-graph-system-spec` の live-trial 証跡まで連鎖的に
stale になり `verify` (pytest) が落ちる。**

## 背景と問題

`plugins/harness-creator/skills/run-skill-live-trial/scripts/live-trial-verdict.py` の
`behavior_closure_files()` は、`context` 付きで呼ばれた場合、宣言された依存プラグインごとに次を閉包へ
加える。

- 依存プラグインの native manifest / hooks
- `references/package-contract.json` の `entry_points.{skills,agents,commands}` に列挙された**エントリポイント
  ディレクトリ丸ごと**
- 依存プラグイン root 直下の `scripts/` `schemas/`

`system-spec-harness` の `entry_points.skills` には `assign-system-spec-completeness-evaluator` が含まれる。
`HarnessHub-nq2` (issue `issue-c08-audit-primary-get-capability-20260722`, PR #88) は同 skill の `SKILL.md`
を編集した (C08 一次 GET 手段の delegation 記述を追加)。この skill 自体は `plugins/dev-graph/` に一切
差分が無いにもかかわらず、`dev-graph:run-dev-graph-system-spec` の `skill_dir_tree_sha` が変化し、
2026-07-26 の正式 live-trial (`sysspec-final2`) が記録した値と食い違って `verify` が FAIL する。

## 実測 (2026-07-28)

| 項目 | 値 |
|---|---|
| origin/main (`dedfdc3`) で `test_independent_scenario_receipt_covers_exact_criteria[C19-run-dev-graph-system-spec-...]` を実行 | **PASS** (`git worktree add` で個別計測) |
| `devgraph/issue-c08-audit-primary-get-capability-20260722` (nq2, PR #88) で同テストを実行 | **FAIL** (`AssertionError: C19/OUT1: stale behavior closure digest`) |
| `plugins/dev-graph/` への git diff (origin/main → nq2) | **0 件** (`git diff origin/main...HEAD --stat -- plugins/dev-graph/` が空) |
| 記録済み `skill_dir_tree_sha` (`eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260726T050519Z-sysspec-final2/verdict.json`) | `8f1013d23ccdcc3770f297a893225baadc0990004f077766df44286cb6ab0013` |
| nq2 branch 上で `skill_dir_tree_sha(...)` を再計算した値 | `14c0b847adcea68dc29a08ef2e0cad0a032bfeb9cf0d7347b4eb51075a252cc4` |

**回帰の全量が「依存プラグインの非対象 skill 編集」由来であり、dev-graph 自体の実装・テストの欠陥ではない。**

## 既知の先行未完了トライアル

`eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260726T033200Z-sysspec-split/` に、まさに同型
(500 行分割由来の依存側変更で digest が stale 化した) シナリオの live-trial task.md が存在するが、
`verdict.json` が無く **未完了のまま放棄されている**。この trial が要求する fixture worktree
(`task-20260726-002450-wt-6`) は既に削除済み (`git worktree list` に `prunable` で残るのみ、実ディレクトリ
は存在しない) で、再開には fixture の作り直しが必要。

同ディレクトリの他の trial (`r1`〜`r21`, `e9b-r2`〜`e9b-r4`, `wt1`〜`wt6`, `sysspec-final`,
`sysspec-final2` 等) から、この skill の live-trial は歴史的に **20 回以上の再試行**を要していることが
読み取れる。genuine な re-trial は tmux 上で実エージェントセッションを長時間 (数十分〜) 走らせる重い工程で
あり、成功が保証されない。

## 検討軸

| 軸 | 論点 |
|---|---|
| 閉包の対象範囲 | 依存プラグインの entry point 全体を閉包に含める現行設計を維持するか。dev-graph が実際に呼び出す skill (`assign-system-spec-completeness-evaluator` のみ等) に絞るスコープ限定案は Goodhart リスク (測定対象を減らして再現性コストを下げる) を伴う |
| verdict の継承 | 依存側の変更が「意味的に無関係」(例: prompt 文言の追加で、dev-graph が実際に踏む経路には影響しない) と判定できる場合に verdict を引き継ぐ仕組みの是非。sha 不変以外の引き継ぎは規約上「偽装」に近づく (`content-review-protocol.md` の retarget 規約と同型の論点) |
| live-trial の頻度対コスト | `system-spec-harness` の entry-point skill は編集頻度が高い。編集のたびに `run-dev-graph-system-spec` の live-trial 再走が要る運用は持続可能か |
| fixture 保全 | live-trial fixture worktree が `prunable` のまま実体だけ消える運用 (今回のように) を防ぐ (例: fixture を `eval-log/dev-graph/live-trial-fixtures/` 配下の非 worktree 資産として保持する) |

## 影響

- 影響範囲: `system-spec-harness` の `entry_points.skills` に列挙された 5 skill (`run-system-spec-elicit` /
  `run-system-spec-doc-fetch` / `run-system-spec-compile` / `ref-system-design-knowledge` /
  `assign-system-spec-completeness-evaluator`) のいずれかを編集するすべての変更。
- 緊急度: 中。`verify` は回帰を正しく検出しており fail-open ではない。ただし live-trial 再走の重さゆえ、
  放置すると「stale のまま red で留め置く」運用が常態化しかねない。

## 関連

- `HarnessHub-nq2` (`issue-c08-audit-primary-get-capability-20260722`, PR #88) — 本課題を顕在化させた変更
  (`assign-system-spec-completeness-evaluator/SKILL.md` への一次 GET delegation 追記)
- `HarnessHub-2mor` (`issue-500-line-split-dilutes-harness-coverage-20260728`) — 同型の Goodhart 隣接構造課題
  (500 行分割が harness-coverage の分母を希釈する)。今回の課題は「依存プラグイン変更が下流 live-trial 証跡を
  希釈/失効させる」という対の構造
- `eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260726T033200Z-sysspec-split/` — 未完了のまま
  放棄された先行 live-trial (fixture worktree 消失済み)
