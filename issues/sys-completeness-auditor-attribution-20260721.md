---
graph_node_id: "issue-completeness-auditor-attribution-20260721"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["system-spec-harness","fail-closed","goodhart","attribution"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "completeness-report の auditor 帰属が実 fork 証跡に接地せず、独立監査を経ない自己申告が機械層を通過する"
owners: ["daishiman"]
created_at: "2026-07-21T00:00:00Z"
updated_at: "2026-07-21T00:00:00Z"
status: "draft"
depends_on: []
related_nodes: ["issue-audit-followups-20260717"]
resource_scope: ["plugins/system-spec-harness/skills/assign-system-spec-completeness-evaluator/scripts/aggregate-completeness.py","plugins/system-spec-harness/skills/assign-system-spec-completeness-evaluator/schemas/completeness-findings.schema.json","plugins/system-spec-harness/hooks/record-audit-fork.py","plugins/system-spec-harness/hooks/hooks.json"]
purpose: "aspects[].auditor が評価者自身の書く文字列でしかなく、独立監査を 1 件も fork しない実行でも独立 auditor の判定を名乗るレポートが exit 0 で通過する穴を塞ぐ"
goal: "独立 auditor を名乗る観点が、モデルが書けない層 (PostToolUse hook) の fork 台帳で裏取りできるときだけ機械層を通過する"
scope_in: ["audit_delegations[] (fork receipt) の schema 追加と必須化","aggregate-completeness.py への帰属検証層 (validate_attribution) 追加","PostToolUse(Task) fork 台帳 writer hook の新設","rubric / aspect-criteria / SKILL.md / R1-R2 prompt の契約追記","回帰テスト"]
scope_out: ["監査 prompt の実質性判定 (意味層 = content-review/human の責務)","出荷済み system-spec/completeness-report.json の再生成 (別課題)","specs/harness-hub-system-specification.md の evaluated_digest 更新 (別課題)"]
acceptance: ["audit_delegations を持たないレポートは aggregate-completeness.py --report が exit 1 を返す","fork 台帳が存在しない/空の実行では独立監査の帰属が violation になる (fail-closed)","C05 自前評価の観点に primary receipt を付けると虚偽の独立性主張として violation になる","role=primary の receipt verdict と aspects[].verdict の不一致が検出される","PostToolUse hook が監査 agent への Task fork を台帳へ追記し、無関係な Task は記録しない","回帰テストが plugins/system-spec-harness 配下に存在する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-completeness-auditor-attribution-20260721.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-21T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260721T202439/verdict.json","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "live-trial 2 run (20260721T202439 / 20260721T210154) で独立に再現した評価器の fail-closed 欠陥を追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-completeness-auditor-attribution-20260721.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-e9b","linked_at":"2026-07-21T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-21T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`aggregate-completeness.py` の `ASPECTS` 定数は観点ごとの auditor 名をハードコードし、レポートの
`aspects[<id>].auditor` がその期待値と **文字列一致するか** だけを検査していた。これは「どの agent が
担当すべきか」の検査であって「その agent が実際に走ったか」の検査ではない。

結果として、独立監査 (Task fork) を **1 件も起動しない実行** でも「独立 auditor が PASS を出した」と
名乗る `completeness-report.json` を生成でき、`--report` は exit 0 で通過した。

## 背景と問題

レポートの digest は graph node の `confirmation_evidence.evaluated_digest` として `confirmed` の根拠に
なる (`specs/harness-hub-system-specification.md:20`)。したがって fail-closed の証跡連鎖に
「**帰属だけ検証されない**」穴が残り、評価者の自己申告がそのまま確定仕様の裏付けに昇格しうる。

live-trial 2 run で独立に再現した:

| run | verdict | 該当 blocker |
|---|---|---|
| `eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260721T202439` | DEGRADED | 「completeness-report.json を被験対象が手書きし、独立 auditor (Task/Agent) 呼出し 0 件のまま confirmed の根拠にしている」 |
| `eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260721T210154` | PASS | 同一 scenario の再走。同じ経路が構造的に開いたまま |

## 設計上の制約 (なぜ hook が必要か)

監査 sub-agent は 3 つとも **`Write` を持たない**:

| agent | component | tools |
|---|---|---|
| `system-spec-matrix-auditor` | C07 | `Read, Bash` |
| `system-spec-hearing-auditor` | C06 | `Read` |
| `system-spec-doc-freshness-auditor` | C08 | `Read, Bash, WebSearch, WebFetch` |

read-only 監査という設計は正しい (proposer ≠ approver) が、その帰結として **自力ではディスク上に
「自分が走った」痕跡を一切残せない**。従って証跡は「モデルが書けない層」= harness (hook) が書くしかない。

先例として `validate-goal-seek-evidence.py` は「fork した副産物でしか作れないファイル」を証跡に採ったが、
本件は副産物を作れないケースなので、hook が副産物そのものを作る形へ一般化する。

## 是正

### 1. 証跡 writer: `hooks/record-audit-fork.py` (PostToolUse: `Task`)

本 plugin 同梱 agent (`agents/*.md` の stem) への `Task` が完了したとき、append-only の JSONL 台帳
`eval-log/system-spec-harness/audit-fork-ledger.jsonl` へ 1 行追記する。exit 0 always (観測専用・非 blocking)。
prompt 本文は記録せず sha256 のみ。pinned plugin の実 payload `system-spec-harness:<agent>` は自 plugin
qualifier のみ受理して unqualified stem へ正規化する。無関係な Task は記録しない
(肥大化防止 + 他 plugin agent 名での偽装遮断)。

### 2. 帰属検証: `validate_attribution(report, ledger)`

レポートに `audit_delegations[]` (fork receipt) を必須化し、以下を fail-closed に検査する:

| 必須 receipt | role | auditor | component |
|---|---|---|---|
| `matrix_coverage` | `primary` | `system-spec-matrix-auditor` | C07 |
| `matrix_coverage` | `sub_input` | `system-spec-hearing-auditor` | C06 |
| `doc_freshness` | `primary` | `system-spec-doc-freshness-auditor` | C08 |

- receipt の `auditor` は `agents/<auditor>.md` に実在すること (架空 agent 名の遮断)
- `dispatch.tool == "Task"` かつ `dispatch.subagent_type == auditor`
- `role=primary` の `verdict` は `aspects[aspect].verdict` と一致 (監査判定の忠実転記)
- C05 自前評価の 4 観点に `primary` receipt を付けるのは **虚偽の独立性主張** として violation
- 各 receipt は fork 台帳で裏取りできること。台帳が無い/空 = 裏取り 0 件 → violation

## 機械層が保証しない範囲 (正直な境界)

台帳が示すのは「その `subagent_type` への Task が **完了した**」ことだけ。

- 監査 prompt が実質を伴うか (空 prompt で fork するだけの緑化) は判定できない。
- 返った verdict がレポートへ忠実に転記されたかは、receipt との自己矛盾までしか捕まえられない。
- 突合は **run/session に束縛されない** (台帳行の `ts` / `session_id` を照合軸に使わない) ため、
  過去 run の同一 `subagent_type` 記録でも裏取りが成立しうる。確実に弾けるのは「fork を 1 件も
  起こしていない実行」までで、「今回の run で fork した」ことの証明ではない。session 束縛は
  follow-up `HarnessHub-x4o` (レポートへ session_id を持たせると宣言自体が再び自己申告になるため、
  宣言と台帳の両方を要求する設計が要る)。

これらは意味層 (content-review / human) の未閉塞責務として明示する。guard hook と同じく **表層的な
adversarial evasion は設計上許容**し、狙いは「fork を省略した実行が独立監査を名乗って機械層を通過する」
という live-trial で実際に観測された失敗の遮断。

## 既知の影響

出荷済み `system-spec/completeness-report.json` (verdict=PASS) は `audit_delegations` を持たないため、
新ゲートでは 4 件の violation を出す。これは **仕様どおりの挙動** (証跡なき PASS を通さない)。
実 fork つきでの evaluator 再実行とレポート再生成は別課題として起票する
(`specs/harness-hub-system-specification.md` の `evaluated_digest` 更新を伴うため)。

## 検証

- `plugins/system-spec-harness/skills/assign-system-spec-completeness-evaluator/tests/test_aggregate_completeness.py`
  — 帰属検証 / 台帳集計 / hook 契約突合を含む受入テスト
- `plugins/system-spec-harness/hooks/tests/test_record_audit_fork.py` — 台帳 writer の回帰テスト
