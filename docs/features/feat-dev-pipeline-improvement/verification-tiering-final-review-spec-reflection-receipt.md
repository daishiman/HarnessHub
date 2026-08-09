---
graph_node_id: "doc-verification-tiering-spec-reflection-receipt-20260809"
artifact_kind: "document"
artifact_subtypes: []
layer: "feature-spec-reflection"
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["spec-reflection","verification-tier","final-review","qa-216","qa-217"]
priority: "high"
start_date: "2026-08-09"
target_date: null
iteration: null
title: "検証 tier・elegant review 証拠整合の仕様反映受領書"
owners: ["daishiman"]
created_at: "2026-08-09T00:00:00Z"
updated_at: "2026-08-09T00:00:00Z"
status: "active"
depends_on: []
related_nodes: ["spec-harness-hub-verification-tiering-20260809","arch-harness-hub-dev-workflow","arch-harness-hub-testing-qa","issue-verification-evaluator-cache-20260809"]
resource_scope: ["docs/features/feat-dev-pipeline-improvement/verification-tiering-final-review-spec-reflection-receipt.md","system-spec/dev-workflow.md","system-spec/testing-qa.md","system-spec/spec-state.json","specs/harness-hub-verification-tiering-addendum.md","architecture/harness-hub-dev-workflow.md","architecture/harness-hub-testing-qa.md","features/feat-dev-pipeline-improvement.md","tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-verification-tiering-final-review-handoff.md"]
purpose: "検証 tier と elegant-review の証拠整合に関する仕様・設計影響、非変更境界、検証、残作業を受領記録として固定する。"
goal: "実装、仕様正本、各文書層、Beads、dev-graph、draft PR が同じ完了範囲と残作業を指す。"
scope_in: ["仕様影響判断","層別反映","品質ゲート結果","残作業と追跡 ID"]
scope_out: ["製品 API","DB schema","認証認可","UI","Cloudflare deploy unit"]
acceptance: ["qa-216/qa-217 の正規遷移を記録する","完了と未配線を区別する","中学生向けと技術説明を併記する","品質ゲート結果を追記する"]
architecture_refs: ["arch-harness-hub-dev-workflow","arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "docs/features/feat-dev-pipeline-improvement/verification-tiering-final-review-spec-reflection-receipt.md"
template_id: "document"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"5d357fc1659da7c469bd51ec4fec58ead4f6b02f7880884e90ed21d525da9626","evaluator":"final review + system-spec-harness","evidence_ref":"system-spec/dev-workflow.md"}
source_lineage: {"imported_at":"2026-08-09T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "仕様反映の根拠と製品非変更境界を、実装成果物とは別の受領 document として固定する。"
classification_candidates: [{"artifact_kind":"document","candidate_path":"docs/features/feat-dev-pipeline-improvement/verification-tiering-final-review-spec-reflection-receipt.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-09T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 検証 tier・elegant review 証拠整合 — 仕様反映受領書

## 結論

**仕様・設計への影響あり。ただし開発品質ゲートに限定される。** 差分から `mvp / standard / critical` を決める selector、検査計画と延期記録、tier decision 検証、elegant-review の `condition` と `condition_signal` 整合を実装した。`system-spec/` は R4-reopen（確定済み仕様を根拠付きで再度開き、再確定する正規手順）で `qa-216` / `qa-217` として更新した。製品 API、DB schema、認証認可、UI、Cloudflare deploy unit は変えていない。

## 中学生向けの説明

学校の提出物を全部同じ重さで検査すると、小さな文章直しにも長い試験が必要になります。そこで、変えた場所を見て「短い確認」「普通の確認」「とても厳しい確認」の三段階を自動で選ぶ係を作りました。ただし、危ない変更を人が勝手に軽い確認へ下げたり、後回しにした試験を忘れたりはできません。後回しにするなら Beads という課題表に必ず残します。

レビュー結果にも、問題の種類と合否の数え方が食い違わない検査を追加しました。においのような軽い注意は合否問題と混ぜず、古い記録はそのまま読めるよう日付境界を設けています。

## 技術的な説明

- selector は変更 path、公開面、逆転不能性から最高一致 tier を決定し、規則表と source の digest を証拠へ含める。
- gate ledger から `executed / deferred / skipped` と blocking を導出し、deferred は受け皿 Beads ID が無ければ fail-closed（安全を確認できない場合は処理を止める）にする。
- decision validator は selector absent、非仕様 disposition、受け皿の無い延期、cache hit の不正表現、理由の無い降格を拒否する。
- evaluator cache は対象内容 digest、evaluator ID/version、設定で key を作り、corrupt を miss 同様に再実行へ倒す。同一 key の異結果上書きは拒否する。
- elegant-review は `contradiction→C1`、`omission→C2`、`inconsistency→C3`、`dependency_break→C4` を検査し、`smell` は condition 無しとする。2026-08-09 以降の run は自動 strict、古い run は WARN とする。
- 561 行だった phase-order validator は主 CLI 343 行と support module 215 行へ分離した。

## 層別の正規反映

| 層 | 反映 | 理由 |
|---|---|---|
| `system-spec/` | `qa-216`、`qa-217`、`appr-041` と再 compile | selector 実装済み事実と `critical` 語彙を正本化するため |
| `specs/` | verification tier 追補 | 496 行の総合仕様を 500 行超にせず契約を独立させるため |
| `architecture/` | selector、gate ledger、証拠、未配線境界 | 開発品質の責務分担と fail-closed 境界が変わるため |
| `features/`・`docs/` | feature 追記と本受領書 | 目的、変更、非変更、追跡を 1 箇所で確認するため |
| `tasks/` | Phase 13 補助引継ぎ | 凍結済み P01..P13 を書き換えず統合条件を残すため |

## Beads と dev-graph

- 完了: `HarnessHub-jb6r`（承認遷移）、`HarnessHub-6fct`（tier selector）、`HarnessHub-hz8m`（signal 整合）。
- 未完了: `HarnessHub-6nf1`（cache の evaluator 呼出元配線）、`HarnessHub-xcl3`（tier による下流 CI 切替）。
- 仕様陳腐化の解消: `HarnessHub-true`（selector 未実装記述）、`issues/dev-workflow-tier-vocabulary-full-vs-critical-20260809.md`（旧 `full` 語彙）。
- 延期の受け皿: `HarnessHub-sy31`。関連監査は `HarnessHub-ic7w`、`HarnessHub-w0sv`、`HarnessHub-lg8s`、`HarnessHub-o3qb`。
- 公開前 gate の残課題: `HarnessHub-p65r`（`run-dev-graph-system-spec` の live-trial 再実行）、`HarnessHub-n7gg`（HEAD 由来 7 artifact の template 移行）。
- PR の代表 node: `issue-verification-evaluator-cache-20260809`。cache 配線未完了を含むため draft とする。

## 検証記録

- focused pytest: 136 passed。
- signal consistency focused pytest（validator 分割後）: 7 passed。
- Python compile、JSON parse、`git diff --check`: pass。
- system-spec compile と coverage matrix `--require-complete`: pass。
- task 仕様書品質ゲート: pass（P01..P13、legacy contract exemption を含め違反 0）。
- content review: 77 skills pass。script LLM coverage: 62.2% から 63.8% へ回復し ratchet pass。
- GitHub macOS/Python 3.11 で validator 分割後の sibling import 不足を検出し修正。既存 importlib test 2 系統を含む 78 tests が pass。
- main 取り込み後の repository CI: 139 pass / 5 staged warning / 1 fail。唯一の failing check は live-trial lint で、同一の旧 verdict に対する stale SHA・downgraded・`DEGRADED` の 3 violation である。`HarnessHub-p65r` で再試走を追跡する。
- global graph gate: 今回追加 node は適合。HEAD 由来 specification 5 件・task 2 件の frontmatter/heading 不足で fail し、`HarnessHub-n7gg` へ分離した。
- repository に独立した `verify-pr-ready.sh` は存在しないため、上記 repository CI、focused test、task 仕様、system-spec、graph、`git diff --check` を公開前ゲートとして最終 HEAD で実行した。

## 残作業

`build-evaluator-cache.py` は機構と単体テストまでで、実 evaluator 起動点から未使用である。また CI は tier を算出・保存するが、下流 step の実行有無や blocking を切り替えていない。この二点を本 PR の完了扱いにせず、上記 Beads を open のまま引き継ぐ。
