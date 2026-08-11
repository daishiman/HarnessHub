---
status: confirmed
layer: feature-spec-reflection
beads_ids:
  - HarnessHub-uypz
dev_graph_node_ids:
  - issue-audit-multi-dispatch-null-verdict-20260808
related_feature: feat-dev-pipeline-improvement
spec_impact: internal-development-contract
recorded_at: 2026-08-11
---

# 複数監査 dispatch 台帳 schema 1.2 — 仕様反映受領書

## 1. 目的と背景

Beads `HarnessHub-uypz` / Dev Graph `issue-audit-multi-dispatch-null-verdict-20260808` は、
同一 assistant message から複数の監査 Agent を起動したとき、台帳の一部行が
`audit_verdict=null` になり、集約器が不要な同期再 fork を要求する問題を直す。

目的は、PostToolUse が **tool call ごと**に渡す top-level `tool_use_id` と call 全体の
`tool_response` digest、生 `AUDIT_VERDICT` を writer → receipt schema → consumer の全経路で
同一 dispatch に結び付けることである。製品の画面・公開 API・DB・認証は変えない。

## 2. 結論（仕様影響）

**製品仕様・利用者向け設計への意味的な影響はない。**  
**開発パイプライン内部の監査証跡契約には影響がある** (`spec_impact: internal-development-contract`)。

| 層 | 判定 | 理由と反映 |
|---|---|---|
| `docs/` | 反映済み | 本受領書が判断・検証・残課題の正本 |
| `features/` | 追跡のみ | `feat-dev-pipeline-improvement` の内部品質契約。feature の purpose/goal/acceptance は不変 |
| `system-spec/` | **変更なし** | 新しい利用者要求・QA 回答・製品の承認判断が無い。plugin 内部契約を製品正本へ複製すると二重正本になる |
| `specs/` | **変更なし** | 外部契約・製品要件に差分なし |
| `architecture/` | 差分追記 | `architecture/harness-hub-dev-workflow.md` と dev-workflow changelog に schema 1.2 境界を追記 |
| `tasks/` | handoff 追加 | 凍結済み exact-13 は手編集せず、本 issue 用 handoff を追加 |

## 3. 実装要約

1. **writer** `record-audit-fork.py` (v0.3.2): schema `1.2` で `tool_use_id` / `verdict_state` /
   whole per-call `response_sha256` / 生 verdict を同一行に記録。旧 Task の ID 無し payload は
   schema `1.1` 互換を維持。Agent の ID 欠落は 1.1 へ downgrade せず記録対象外。
2. **consumer** `audit_fork_attribution.py`: schema 1.2 は session + `tool_use_id` で照合し、
   digest / subagent / tool / resolved verdict の不一致・重複・競合を fail-closed 拒否。
3. **receipt schema**: `dispatch.tool_use_id` を optional 追加。1.2 接地 receipt では欠落を拒否。
4. **運用 gate**: unit / fixture の parallel PASS は defensive hardening に留める。正式 evaluator は
   fresh live-trial 完了まで `1 message = 1 foreground fork` を維持。
5. **500 行**: 変更した手書き Python はすべて 500 行以下（hook 319 / writer test 468 /
   attribution 467 / attribution test 282）。

## 4. 検証結果（MVP 最小）

| 検証 | 結果 |
|---|---|
| `hooks/tests` + completeness-evaluator focused | **141 passed** |
| うち writer / multi-dispatch / attribution 核心 | **66 passed**（先に単体確認） |
| completeness-findings.schema.json | JSON として load 可能 |
| 変更 Python 行数 | すべて ≤500 |
| `git diff --check` | 対象差分に whitespace 問題なし（PNG を除く実装 diff） |
| fresh live-trial（3 parallel canary e2e） | **未実施** → 残課題。正式 parallel 運用は未許可 |

## 5. 残課題

1. current runtime での fresh live-trial: 3 監査 per-call 台帳行と最終 receipt の対応、
   不要な再 fork が無いことの実証（issue 受入条件の未チェック 1 件）。
2. 実証後に限り、正式 evaluator の直列化 gate 解除を別途判断する（本 PR では解除しない）。
3. 作業ツリーに残る無関係差分は本 PR に含めない:
   - navigation VRT baseline (`HarnessHub-preq`)
   - `docs/features/feat-build-pipeline-board/design-review-notes.md` (`HarnessHub-9am.3`)

## 6. 開発内容の説明

### 中学生向け

テストのとき「別の先生が本当に採点したか」を記録するノートがある。先生を 3 人同時に呼ぶと、
誰の点数が誰のものか分からなくなり、ノートの一部が空欄になることがあった。今回は、
先生ごとの受付番号をノートに書き、番号・答案の指紋・点数をセットで照合するようにした。
番号が合わない答えは合格に使えない。実際の授業で 3 人同時がうまくいく最終確認は、
まだ残りの宿題である。Web サイトの見た目や利用者向け機能は変わらない。

### 技術者向け

Claude Code の PostToolUse は matching tool call ごとに 1 回発火し、top-level
`tool_use_id` と当該 call の `tool_response` を渡す（batch 全体は PostToolBatch）。
schema 1.2 は call identity を台帳の第一級キーにし、`response_sha256` は nested block の
部分 digest ではなく **call 全体**の canonical JSON digest とする。`verdict_state` は
`resolved|absent|pending|ambiguous` で zero-attribution を潰さない。consumer は 1.2 行を
last-write-wins せず、重複/競合を fail-closed とする。schema 1.1 は旧 Task のみの legacy
経路。background `async_launched` は `pending` のまま completion receipt に使わない。
