---
graph_node_id: "doc-rubric-proposal-retention-spec-reflection-receipt-20260810"
artifact_kind: "document"
artifact_subtypes: []
layer: "feature-spec-reflection"
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["spec-reflection","rubric-governance","final-review","harness-creator"]
priority: "low"
start_date: "2026-08-10"
target_date: null
iteration: null
title: "rubric 自動生成提案の保持と human review 引継ぎ — 最終レビュー兼仕様反映受領書"
owners: ["daishiman"]
created_at: "2026-08-10T00:00:00Z"
updated_at: "2026-08-10T04:56:27Z"
status: "active"
depends_on: []
related_nodes: ["issue-rubric-proposal-20260806-review","feat-dev-pipeline-improvement","arch-harness-hub-dev-workflow","spec-harness-hub-system-specification-implementation-writebacks"]
resource_scope: ["docs/features/feat-dev-pipeline-improvement/rubric-proposal-retention-final-review-spec-reflection-receipt.md","plugins/harness-creator/skills/run-skill-rubric-governance/proposals/2026-08-06-rubric-update.md","issues/harness-rubric-proposal-20260806-review.md","tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-rubric-proposal-retention-final-review-handoff.md","features/feat-dev-pipeline-improvement.md","system-spec/index.md","specs/harness-hub-system-specification-implementation-writebacks.md","architecture/harness-hub-dev-workflow.md"]
purpose: "rubric draft の保存と human review の未完了を分離し、仕様影響判断、検証、追跡、公開境界を受領記録として固定する。"
goal: "実装差分、層別文書、Beads、dev-graph、draft PR が同じ完了範囲と残作業を指す。"
scope_in: ["仕様影響判断","層別 writeback","品質ゲート","Beads / dev-graph / PR の追跡"]
scope_out: ["rubric 本体の改訂","25 findings の採否判断","製品 API、DB、認証認可、UI、Cloudflare deploy unit"]
acceptance: ["製品非変更と既存 dev-workflow 契約の適用理由を記録する","全変更ファイルと 500 行上限を確認する","task 仕様書、graph、focused governance gate の結果を記録する","Beads HarnessHub-lzfs と draft PR の残課題を明記する"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "docs/features/feat-dev-pipeline-improvement/rubric-proposal-retention-final-review-spec-reflection-receipt.md"
template_id: "document"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"05f021732b3ea4fa6ae0db06710866bd1a66a6a98d00a7883860f7b9ef47a4ca","evaluator":"final-review","evidence_ref":"plugins/harness-creator/skills/run-skill-rubric-governance/proposals/2026-08-06-rubric-update.md"}
source_lineage: {"imported_at":"2026-08-10T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "仕様影響の判断理由と公開前検証を、提案本文や issue とは別責務の受領 document として固定する。"
classification_candidates: [{"artifact_kind":"document","candidate_path":"docs/features/feat-dev-pipeline-improvement/rubric-proposal-retention-final-review-spec-reflection-receipt.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-10T00:00:00Z","missing_sections":[],"status":"complete"}
---

# rubric 自動生成提案の保持と human review 引継ぎ — 最終レビュー兼仕様反映受領書

## 結論

2026-08-06 の rubric 更新提案を履歴へ保存し、未判断項目を Beads `HarnessHub-lzfs` と dev-graph `issue-rubric-proposal-20260806-review` へ引き継いだ。**Harness Hub 製品仕様と rubric 本体への変更はない。** 影響は repository 内の文書・課題追跡・レビュー導線に限定され、既存 dev-workflow 契約を今回の提案へ適用した実装 writeback である。

## 中学生向けの説明

自動プログラムが「ここを直すとよさそう」というメモを作りました。今回やったのは、そのメモをなくさない場所へ保存し、あとで人が一つずつ判断できる課題表へつないだことです。

まだ「直す」「直さない」は決めていません。ノートをファイルに入れたり、レビュー用の PR を作ったりしても、宿題が終わったことにはしません。25 個の候補を人が全部確認するまで、Beads の課題は開いたままです。

## 技術的な説明

- `aggregate-evals.py` の出力は観測証拠であり、rubric の変更 authority ではない。
- proposal、issue Markdown、dev-graph node、Beads external reference を同じ ID 連鎖へ束縛する。
- 25 件の `friction_density` finding と、skill 名の代わりに旧 worktree 絶対 path が混入した 1 件を human triage の入力として保持する。
- commit / push / draft PR は保存と review の transport に限定し、Beads close 条件へ読み替えない。
- 外部 API、DB schema、認証認可、UI、Cloudflare deploy unit、rubric schema / template / weight / threshold は変更しない。

## 仕様・設計影響の判断

| 層 | 判断 | 反映 |
|---|---|---|
| `system-spec/` | 新しい製品要求なし / 実装索引の反映あり | `dev-workflow.web` は既存の P13 write-back、scope separation、未完了項目の durable tracking を継承済み。`spec-state.json` と確定章は legacy schema 1.0 の read-only 境界を守って非変更とし、`system-spec/index.md` の「実装 writeback 索引」から今回の `specs/` 追補と受領書へ到達できる行だけを追加した |
| `specs/` | 実装 writeback あり | `harness-hub-system-specification-implementation-writebacks.md` に今回の適用範囲と非変更境界を追記 |
| `architecture/` | 運用責務の追跡あり | proposal は証拠、human review は決定 authority、Beads / dev-graph は durable handoff という責務分離を追記 |
| `features/` / `docs/` | 履歴と判断記録あり | feature、changelog、本受領書へ目的・完了範囲・残作業を追記 |
| `tasks/` | P13 補助引継ぎあり | 凍結済み exact-13 を手編集せず、今回の最終統合条件を独立 task に記録 |

## 正規フローの判断理由

正規 transition writer で新規 QA を追加できるか事前確認したところ、最新 `main` の `system-spec/spec-state.json` は schema 1.0 であり、writer は legacy state の更新を fail-closed（安全を確認できないときは停止する方式）で拒否した。正式な migration は全 matrix を未収集へ戻して再ヒアリングする契約で、今回の proposal 保存とは別責務である。

また、現行 dev-workflow は既存契約を全面継承し、実装後の write-back、範囲外作業の別 task 化、未完了検査の Beads 追跡をすでに要求している。したがって新規製品 QA を重ねず、`system-spec/index.md` が明示する実装 writeback 索引、`specs/` の実装追補、architecture、feature、task、本受領書へ今回の適用結果を反映するのが二重正本を作らない最小の正規経路である。

## 変更対象

- rubric proposal の履歴保存
- Beads `HarnessHub-lzfs` と dev-graph issue の linkage
- issue / feature / specification writeback / architecture / task / docs の層別記録
- graph canonical store と仕様反映受領書
- `system-spec/index.md` の実装 writeback 索引

## 検証記録

- conflict 解消: `origin/main` (`9846b58a`) をローカル `main` へ merge (`d2516655`) し、そのローカル `main` を本 branch へ merge (`b00a2f94`)。未解決 conflict は 0。
- verification tier: `mvp`（`MV-01`）。変更は repository 内の文書・graph・未公開 proposal に限定され、製品 runtime path は非変更。
- task 仕様書: `validate-system-plan.py --feature-package feature-package/feat-dev-pipeline-improvement` が exact P01〜P13、digest `af8a73df…`、violations 0 で PASS。
- dev-graph: canonical envelope / artifact readiness / schema が violations 0 で PASS。issue node に draft PR #688 の base / head / URL を正規 writer 経由で関連付けた。
- 配置・文書粒度: artifact placement PASS。doc line limit は 665 文書、上限 300 行、違反 0。
- content review: changed-only は proposal を behavior change と扱わず `no target skill` で PASS。
- focused test: rubric proposal 生成・集計の 2 suite が 80 passed。
- secret scan: `@harness-hub/inspection` の対象 817 files、findings 0、1 test passed。
- repository build / typecheck: `pnpm -r build` と `pnpm -r typecheck` が終了コード 0 で PASS。build には `jose` の Edge Runtime 圧縮 API に関する既存 warning が出たが、生成・型検査は完了。
- worktree safety: clobber mtime、cross-worktree ref update、desync の 3 guard が PASS。各 guard の回帰テストも 53 passed。
- system-spec 入力健全性: coverage matrix `--require-complete --require-foundation` と source citation が PASS。legacy state への書込は writer が意図どおり拒否し、生成章への一時差分は破棄して現行正本を維持。
- pre-push 等価ゲート: `bash scripts/run-ci-checks.sh` は PASS 140 / advisory WARN 5 / FAIL 0。5 件は段階導入中の既存 plugin completeness / rubric reference 検査で、今回差分を止める blocking failure ではない。
- `git diff --check`: whitespace error 0。

手書きの変更文書はすべて 300 行以下である。`.dev-graph/state/graph.json` は固定 path / schema を読む canonical 集約正本であり、正規 C02 upsert が管理する生成 JSON なので分割対象外とする。分割すると graph reader と atomic writer の既存契約を壊す。

repository 全 pytest や live-trial は、実装コード・rubric 本体・skill behavior の変更がない MVP 差分のため追加実行しない。既存 proposal 生成の focused 80 tests、task package、graph、文書 gate を blocking 集合とした。

## 残作業

- `friction_density` 25 件を、閾値見直し / 評価項目新設 / template 更新 / 棄却へ全件分岐する。
- 旧 worktree 絶対 path の集計キー混入について修正要否を判断し、必要なら別 issue を起票する。
- 判断後に proposal の `status` または対応不要理由を更新する。

上記は本 PR で完了扱いにしない。Beads `HarnessHub-lzfs` は open のまま human review へ引き継ぐ。
