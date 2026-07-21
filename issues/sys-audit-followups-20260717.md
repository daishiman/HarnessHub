---
graph_node_id: "issue-audit-followups-20260717"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["audit","system-spec","follow-up"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "Studio 反映監査 (C06/C07/C08) の残 findings 4 件の是正"
owners: ["daishiman"]
created_at: "2026-07-17T09:30:00Z"
updated_at: "2026-07-21T07:32:40Z"
status: "draft"
depends_on: []
related_nodes: ["spec-harness-hub-requirements"]
resource_scope: ["system-spec/spec-state.json","system-spec/fetched-references.json"]
purpose: "C06/C07/C08 監査 (2026-07-17) で残った低〜中優先 findings 4 件を追跡し、次回 spec 改訂時に是正する"
goal: "auth.web / infrastructure.desktop-* の qa_ref 裏付け強化、claude-code-plugins / authjs の一次照合、hearing_progress 意味論の SSOT 明記が完了している"
scope_in: ["auth.web qa_ref 再確定","infrastructure.desktop-* qa_ref 差替","C02 一次照合 (claude-code-plugins / authjs)","C01 SSOT へ hearing_progress 意味論を明記"]
scope_out: ["Studio mockup 反映本体 (是正済み)","C05 完了ゲートの再評価"]
acceptance: ["補正内容を裏付ける qa_ref への再確定","fetched-references.json の一次照合更新","C01 SSOT の意味論明記"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-audit-followups-20260717.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-17T09:30:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "C06/C07/C08 監査 (2026-07-17) の残 findings 4 件を追跡する issue (聞き取り/マトリクス/鮮度の低〜中優先是正)"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-audit-followups-20260717.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-xon","linked_at":"2026-07-17T10:34:46Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-17T09:30:00Z","missing_sections":[],"status":"complete"}
---

# 概要

2026-07-17 の Studio mockup 要件反映に対する監査 (C06/C07/C08) で検出された、低〜中優先の残 findings 4 件をまとめて追跡する。

## 背景と問題

Harness Studio mockup の要件層反映 (qa-021〜030・D5/D6・U7 改訂) に対して C06 (ヒアリング監査)・C07 (マトリクス監査)・C08 (鮮度監査) を実施した。高 severity の指摘 (D5/D6/foundation の証跡欠落) は qa-028/029/030 + appr-005 で是正済み。ただし以下の低〜中優先 findings が未是正で残っている。

## 現在の挙動

1. [C07 / medium] auth.web の qa_ref=qa-005 は、elegant-review 由来の reopen 補正 (認可マトリクス・トークンライフサイクル・deny-by-default 欠落操作の修正) を裏付ける auth 向け質疑が qa_log に存在しない。mockup 反映で他 7 カテゴリは qa-021〜027 の再確認質疑を得たが、auth のみ初期質疑のまま。
2. [C07 / low] infrastructure.desktop-windows / desktop-macos の qa_ref=qa-003 は desktop 固有言及が末尾一文のみで薄い (ui-ux/security は過去に qa-007/qa-008 へ差替済みの前例あり)。
3. [C08 / medium] WebFetch 不可環境のため claude-code-plugins / authjs の再照合が WebSearch 二次照合に留まった。一次照合 (source_url 直接 GET) を C02 (run-system-spec-doc-fetch R2) で行い、latest_checked_at を更新する。特に authjs は 2026-07-07 の Vercel による Better Auth 買収 (D3 リスク) の公式ページ本文確認が必要。
4. [C06 / low] qa-014 が複数論点 (非保持境界 + U1-U9 承認) を 1 エントリに束ねており論点分離が検証しづらい。また hearing_progress.loop_count の意味論 (全体 loop か直近差分 loop か) が C01 SSOT に未定義。
5. [dev-graph / medium・2026-07-17 追記] 要件層の並行拡張 (qa-034〜037・dev-workflow カテゴリのヒアリング進行・章 .md の stub 化) の収束後に、(a) `/spec-compile` で全章を再描画し、(b) C05 完成度評価を再実行し、(c) spec/architecture wrapper 6 件の一括 reimport (digest 追従・本文短縮表記込み) と全 confirmed feature の pin 再確定を行う。wrapper は現在世代混在 (逐次追従の限界を確認済み)。plan 済み 6 feature の goal-spec lineage は時点記録として有効 (canonical gate は wrapper 非依存)。

## 期待する挙動

- auth.web と infrastructure.desktop-* が補正内容を成文化した qa_ref で再確定されている (C01 R4-reopen 経由)
- claude-code-plugins / authjs の一次照合が完了し fetched-references.json が更新されている
- C01 SSOT に hearing_progress の意味論が明記されている

## 再現手順またはユースケース

1. C06/C07/C08 の監査レポート (2026-07-17 実施、本 issue 本文に要約) を参照する

## 影響と優先度

- 影響範囲: system-spec の監査トレーサビリティ (実装ブロッカーではない)
- 深刻度: medium
- 緊急度: 低 — ゲート (coverage/citation/C05) は全て緑であり、次回 spec 改訂時にまとめて是正すれば足りる

## スコープ

- In: 上記 findings 4 件の是正
- Out: mockup 反映本体 (是正済み)・C05 完了ゲートの再評価

## 関連グラフ

- 原因/親ノード: spec-harness-hub
- 関連仕様: spec-harness-hub
- 関連アーキテクチャ: (該当なし)
- 解決タスク: (未割当)

## 受入条件

- [x] auth.web の qa_ref が補正内容を裏付ける質疑を指す (qa-036・reopen_log 記録あり / 2026-07-21 確認)
- [x] infrastructure.desktop-* の qa_ref が desktop 固有の質疑を指す (qa-043・reopen_log 記録あり / 2026-07-21 確認)
- [x] claude-code-plugins / authjs の一次照合完了と record 更新 (公式 `source_url` 直接取得・`latest_checked_at=2026-07-21T07:32:40Z` / 2026-07-21)
- [x] hearing_progress の意味論が C01 SSOT に明記 (spec-state-contract.md「hearing_progress の意味論 (SSOT)」/ 2026-07-21)

## 是正記録 (2026-07-21)

### finding 1 (C07 medium / auth.web qa_ref) — 是正済みを確認

`matrix.auth.web.qa_ref` は `qa-005` ではなく **`qa-036`** ("Hub Web の認証 (auth.web) の実装可能粒度の詳細" = Auth.js + テナント別 OIDC の検証契約・session 数値・失効の意味論) を指す。`reopen_log` に R4-reopen 経由の根拠 (elegant-review 由来補正 2 件 + 2026-07-17 のユーザー指示による実装可能粒度化) が残っており、補正内容を裏付ける auth 固有質疑への再確定が完了している。

### finding 2 (C07 low / infrastructure.desktop-*) — 是正済みを確認

`matrix.infrastructure.desktop-windows` / `desktop-macos` の `qa_ref` は `qa-003` ではなく **`qa-043`** (作者デスクトップ環境の配布・実行基盤・ツールチェーン) を指す。`reopen_log` に「C07 マトリクス監査 medium 指摘: qa_ref=qa-003 は Hub web hosting 中心で desktop 固有の裏付けが薄い」を理由とする差替が記録されている (ui-ux の qa-001→qa-007、security の qa-006→qa-008 と同型)。`maintenance-ops.desktop-*` も同時に `qa-044` へ差替済み。

### finding 3 (C08 medium / claude-code-plugins・authjs の一次照合) — 是正済み

2026-07-21 に公式 `source_url` への直接 GET が可能な環境で一次照合を再実行し、`fetched-references.json` の 2 record を C02 R3 assembler 経由で更新した (`retrieved_at` / `latest_checked_at` = `2026-07-21T07:32:40Z`)。

- **authjs**: `https://authjs.dev/getting-started` を直接取得し、`next-auth@5.0.0-beta` 以降 / `@auth/*` namespace、provider / adapter 対応、Better Auth 傘下であることを確認した。あわせて Vercel 公式発表 `https://vercel.com/blog/vercel-acquires-better-auth` と Better Auth 公式発表 `https://better-auth.com/blog/better-auth-joins-vercel` を直接取得し、2026-07-07 の買収、Better Auth の MIT・名称・open contribution model 維持、Auth.js / NextAuth.js の保守・security issue・bug fix 継続方針を一次情報で確認した。従来の二次情報由来だった「security patch のみ・新機能開発なし」という強い断定は一次資料で裏付けられないため record から除外した。
- **claude-code-plugins**: `https://code.claude.com/docs/en/plugin-marketplaces` を直接取得し、`.claude-plugin/marketplace.json`、relative path / `github` / git URL / `git-subdir` / `npm` source、remote URL 型は `marketplace.json` のみを取得するため相対 path を解決できないこと、URL の scheme 必須 (本文 anchor = Claude Code v2.1.196) を確認した。二次 release tracker に依存した CLI 現行版の記述を除外し、公式本文で確認できる契約へ record を収束させた。

C02 の Key Rule 2 (捏造しない / fail-visible) と Key Rule 4 (決定論組み立て) に従い、取得事実のみを素材化したうえで `build-fetched-references.py` を通し、全 17 target の並びと既存 record を保持した。IN1 の citation validator も exit 0 であるため、本 finding の環境ブロックは解消済み。

### finding 4 (C06 low / qa-014 束ね + hearing_progress 意味論) — 是正済み

- **hearing_progress 意味論**: C01 SSOT (`references/spec-state-contract.md`) に「hearing_progress の意味論 (SSOT)」節を新設。writer 実装 (`apply-spec-transition.py`) の実挙動に追従させ、field ごとに (a) 意味、(b) 更新する経路 を表で確定した。判明した非自明点は 2 つ — `loop_count` は chunk 開始時に 0 リセットされる**直近 chunk の turn 数**で累計ではないこと、`complete` は **chunk 経路でのみ更新**され `apply` 単独では据え置かれるため完了判定の正本は `--require-complete` であること。
- **qa-014 の論点束ね**: 既登録 entry の逐語は改変しない (C05 findings の「監査証跡は改変せず保持する」方針・writer も既存 id を上書きしない)。再発防止として C01 SSOT に「qa_log の論点分離 (1 entry = 1 論点)」節を新設し、束ねが後から判明した場合は元 entry を編集せず分離索引を新規 entry として追記する規律 (前例: qa-047 の再登録・qa-049 の逐語補記) を成文化した。現行決定自体は qa-047/qa-049 と appr-007 で中立再確認済みのため章の再オープンは行わない。

### finding 5 (dev-graph medium / 2026-07-17 追記分) — 3 項目とも完了済みを確認

- (a) `/spec-compile` による全章再描画: `system-spec/*.md` 11 章が qa-065/qa-066 反映後の世代で再生成済み。
- (b) C05 完成度評価の再実行: `system-spec/completeness-report.json` の `verdict=PASS`、6 aspect すべて PASS (foundation_trace / decision_guidance / matrix_coverage / design_knowledge_reflection / doc_freshness / prompt_quality)。
- (c) wrapper 一括 reimport + pin 再確定: `specs/` `architecture/` の wrapper 7 件すべてで `source_lineage.source_digest` が実 source ファイルの SHA-256 と一致 (世代混在は解消)。`features/*.md` 15 件はすべて `confirmation_status=confirmed` かつ lineage digest 追従。

## 検証証跡

- コマンド/テスト:
  - `python3 plugins/system-spec-harness/skills/run-system-spec-doc-fetch/scripts/build-fetched-references.py assemble --records <取得素材> --targets system-spec/spec-state.json --out system-spec/fetched-references.json` → `OK: 17 件`
  - `python3 plugins/system-spec-harness/scripts/validate-coverage-matrix.py --matrix system-spec/spec-state.json --require-complete --require-foundation` → exit 0
  - `python3 plugins/system-spec-harness/scripts/validate-source-citation.py --targets system-spec/spec-state.json --references system-spec/fetched-references.json --state system-spec/spec-state.json` → exit 0
  - `python3 -m pytest plugins/system-spec-harness/skills/run-system-spec-doc-fetch/tests/test_build_fetched_references.py -q` → 29 passed
- 証跡 path: system-spec/spec-state.json (qa_log / reopen_log), system-spec/fetched-references.json, system-spec/completeness-report.json
- SSOT 追記 path: plugins/system-spec-harness/skills/run-system-spec-elicit/references/spec-state-contract.md (「hearing_progress の意味論 (SSOT)」「qa_log の論点分離」), 同 SKILL.md (ゴールシーク実行 / Gotchas からの参照)
