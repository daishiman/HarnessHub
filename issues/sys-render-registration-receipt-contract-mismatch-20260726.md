---
graph_node_id: "issue-render-registration-receipt-contract-mismatch-20260726"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","render","acceptance-criteria","vacuous-pass","follow-up","qa-6in4"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "run-dev-graph-render の --registration-receipt が optional 表記なのに OUT1 受入条件は receipt 照合を必須要求している"
owners: ["daishiman"]
created_at: "2026-07-25T22:22:01Z"
updated_at: "2026-07-26T03:28:01.451963Z"
status: "draft"
depends_on: ["issue-guard-fix-closure-verdict-refresh-20260726"]
related_nodes: ["issue-guard-graph-schema-timeout-fail-open-20260725"]
resource_scope: ["plugins/dev-graph/skills/run-dev-graph-render/SKILL.md","plugins/dev-graph/skills/run-dev-graph-render/scripts/render-graph-html.py"]
purpose: "receipt を渡さない実行では render-metadata の registration が null になり OUT1 の照合が成立しないが、仕様は optional と表記している。表示総数が偶然一致すると照合したように見える真空合格が成立し、呼び出し側から本物の合格と区別できない"
goal: "argument-hint / 引数定義 / criteria:OUT1 の 3 箇所が同じ必須性を述べ、receipt 不在時は照合未実施が出力から識別できる状態にする"
mvp_alignment: null
scope_in: ["SKILL.md 11 行 / 73 行 / 48 行 / 133 行 の必須性表記の整合","receipt 不在時に render-metadata と生成 HTML の双方へ照合未実施を明記する実装","receipt あり / なしの両系統と、子 task 件数が偶然一致する負例の単体テスト"]
scope_out: ["done 数 X の照合 (SKILL.md 133 行で明示的に対象外。register-package.py が 13 子を active 強制するため X は常に 0)","receipt を required にして receipt なし render を廃止する案 (探索的 render の正当な用途を潰すため非採用)","本課題単独での live-trial 再取得 (skill_md_sha256 が動くため修正と 1 バッチで実施する)"]
acceptance: ["SKILL.md の 3 箇所が同じ必須性を述べている","receipt なし実行で render-metadata と HTML の双方に照合未実施が現れる","receipt あり実行で applied_count / expected_count と総数 Y の一致、および source_digest の HTML 出現 1 件以上を機械検証する単体テストが存在する","子 task 件数が receipt 件数と偶然一致する負例で照合未実施が正しく報告される"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-render-registration-receipt-contract-mismatch-20260726.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-25T22:22:01Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "live-trial の独立評価者が receipt 未指定 run を FAIL 判定し、同一条件の過去 run が PASS になっていた事実から、評価者の厳しさに依存して緑赤が変わる仕様不整合であることを確定した"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-render-registration-receipt-contract-mismatch-20260726.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-35ai","linked_at":"2026-07-26T03:25:49Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-25T22:22:01Z","missing_sections":[],"status":"complete"}
---

## 概要

`run-dev-graph-render` の SKILL.md は `--registration-receipt` を **optional** と表記しているが、同じ SKILL.md の `criteria:OUT1` 受入条件は registration receipt との照合を**必須**として要求している。この不整合により、receipt を渡さずに skill を実行すると「受入条件を満たせない実行」が仕様上は正常系として許される。

## 実測

- SKILL.md 11 行 (argument-hint): `[--registration-receipt PATH]` — 角括弧つき = optional。
- SKILL.md 73 行 (引数定義): `--registration-receipt <optional-receipt.json>` — 明示的に optional。
- SKILL.md 48 行 / 133 行 (`criteria:OUT1`): 生成 HTML の**総数 Y** が registration receipt の `applied_count` / `expected_count` と一致し、receipt の `source_digest` が表示内容に一致することを受入条件としている。

receipt を渡さない実行では `render-metadata` の `registration` が `null` になり、照合対象が存在しないため OUT1 の 2 条件はいずれも検証不能になる。

## 検出経緯 — 真空合格 (vacuous pass)

2026-07-25 の live-trial 再取得で、`--registration-receipt` を指定せずに走った run が独立評価者により **FAIL** と判定された。

- `render-metadata.registration` が `null`。
- それにもかかわらず被験は「総数 13 が receipt と一致」と報告していた。
- 実体は「子 task が偶然 13 件だった」ことによる数値一致であり、**照合機構が一度も作動していない**。空の照合が通ったのではなく、照合が存在しないまま結論だけが出ていた。

さらに問題なのは、これ以前の run (別 worktree, wt1r2) が**同じ条件で PASS になっていた**点である。当時の評価者は数値一致のみで満足しており、照合機構の作動を確認していなかった。つまりこの不整合は、評価者の厳しさに依存して緑にも赤にもなる状態だった。

同じ skill を receipt path と照合 scope を明示した task で再走させたところ、`registration` は非 null になり `source_digest` が生成 HTML 中に出現することを実測で確認できた。すなわち **skill の実装は receipt を受け取れば正しく照合する**。欠陥は実装ではなく仕様表記にある。

## 影響

- optional 表記に従って receipt を省略した実行は、OUT1 を満たさないまま「正常終了」になる。
- その状態で表示された総数が偶然一致すると、照合したように見える出力が得られる。呼び出し側から見て真空合格と本物の合格が区別できない。
- live-trial の verdict がこの穴を通過しうるため、鮮度ゲートを緑にしても OUT1 の実質的な保証は得られない。

## 修正方針 (三択)

1. **`--registration-receipt` を required にする**: 受入条件に合わせて仕様を締める。既存の receipt なし呼び出しは破壊的変更になるため、影響範囲の洗い出しが必要。
2. **receipt 不在時は照合部分を「未検証」として出力に明記する**: 総数を表示しつつ「receipt 未指定のため照合していない」を HTML と `render-metadata` の双方に出す。真空合格を出力から識別可能にする。あわせて OUT1 の文言を「receipt を伴う実行では一致すること」に条件づける。
3. **receipt 不在時に fail-closed で落とす**: 実装側 (`render-graph-html.py`) で `registration` が null なら非 0 終了。1 と実質同じだが、検出位置が引数解析ではなく照合時点になる。

推奨は **2**。receipt なしの探索的 render には正当な用途があり (グラフ構造だけ見たい)、その場合に「照合していない」ことが出力から読み取れれば、真空合格は成立しなくなる。1 は用途を潰し、3 は 1 と同じ副作用を持つ。

## 受入条件の候補

- SKILL.md の argument-hint / 引数定義 / `criteria:OUT1` の 3 箇所が同じ必須性を述べている (整合)。
- receipt を渡さない実行で、`render-metadata` と生成 HTML の双方に「照合未実施」が現れる。
- receipt を渡した実行で、`applied_count` / `expected_count` と総数 Y の一致、および `source_digest` の HTML 出現 (1 件以上) を機械検証する単体テストがある。
- 「子 task 件数が偶然 receipt の件数と一致する」ケースを負例として持ち、照合未実施が正しく報告されることをテストで固定する。

## 実行順序の制約

SKILL.md の変更は `skill_md_sha256` を動かすため、`run-dev-graph-render` の live-trial verdict と content-review verdict が stale になる。修正と証跡再取得を 1 バッチで実施すること。HarnessHub-q5h9 (dev-graph 9 skill の再取得) の完了後に着手する。
