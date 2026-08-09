---
graph_node_id: "spec-harness-hub-verification-tiering-20260809"
artifact_kind: "specification"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["verification-tier","quality-gate","qa-216","qa-217"]
priority: "high"
start_date: "2026-08-09"
target_date: null
iteration: null
title: "Harness Hub 検証 tier と証拠台帳の仕様追補"
owners: ["daishiman"]
created_at: "2026-08-09T00:00:00Z"
updated_at: "2026-08-09T00:00:00Z"
status: "active"
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["arch-harness-hub-dev-workflow","arch-harness-hub-testing-qa","issue-verification-evaluator-cache-20260809","issue-verification-tier-unwired-20260809"]
resource_scope: ["scripts/select-verification-tier.py","scripts/build-verification-plan.py","scripts/validate-tier-decision.py","scripts/build-evaluator-cache.py","scripts/verification-gate-ledger.json",".github/workflows/governance-check.yml"]
purpose: "変更差分から検証深度を決定論的に選び、延期・再利用・検証結果を後から追跡できる開発品質契約を定める。"
goal: "tier 判定が実行者に依存せず、検査の省略や降格が受け皿の無いまま成立せず、記録から実際の検証状態を復元できる。"
scope_in: ["mvp/standard/critical の決定規則","verification plan の disposition","tier-decision 記録検証","evaluator cache の fail-closed 契約"]
scope_out: ["製品 API","DB schema","認証認可","UI","Cloudflare deploy unit","tier による下流 CI step の切替","evaluator 呼出元への cache 配線"]
acceptance: ["同じ変更 path 集合から同じ tier を得る","deferred は Beads の受け皿を必須にする","selector absent の新規記録を拒否する","full を新規 tier 名として出力しない","cache miss/corrupt は評価器を再実行する"]
architecture_refs: ["arch-harness-hub-dev-workflow","arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "specs/harness-hub-verification-tiering-addendum.md"
template_id: "specification"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"5d357fc1659da7c469bd51ec4fec58ead4f6b02f7880884e90ed21d525da9626","evaluator":"system-spec-harness compile + coverage validation","evidence_ref":"system-spec/spec-state.json#qa-216"}
source_lineage: {"imported_at":"2026-08-09T00:00:00Z","origin_kind":"system-spec-harness","source_digest":"5d357fc1659da7c469bd51ec4fec58ead4f6b02f7880884e90ed21d525da9626","source_path":"system-spec/dev-workflow.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.99
classification_reason: "総合仕様を 500 行超にせず、qa-216/qa-217 の開発品質契約を独立追補として参照可能にする。"
classification_candidates: [{"artifact_kind":"specification","candidate_path":"specs/harness-hub-verification-tiering-addendum.md","confidence":0.99}]
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

# Harness Hub 検証 tier と証拠台帳の仕様追補

## 目的と成功状態

変更の危険度に応じて検証量を調整しつつ、最低限の安全確認を外さない。成功状態は、同じ差分が常に同じ tier になり、実行・延期・cache 再利用が機械可読な `tier-decision.json` から説明できることである。

## スコープ

- 対象: repository 内の tier 算出、検査計画、証拠台帳、CI artifact、review 証拠整合。
- 対象外: 製品 runtime と、本追補で残作業と明記した下流 step/cache 呼出元の配線。

## 用語と主体

- `mvp`: repository 内 tooling、plugin、仕様文書など、公開面や逆転不能な変更に当たらない差分の最小 tier。
- `standard`: `apps/`、`packages/`、`tenants/` など製品 runtime に関わる差分の標準 tier。
- `critical`: workflow、installer、公開 catalog、認証認可、migration、削除経路などの最高 tier。
- `full`: 過去資料だけに現れ得る旧称。新規の判定・台帳・受領書では使わない。
- `disposition`: 検査の扱い。`executed`、`deferred`、`skipped` を区別する。

## tier 選択契約

`scripts/select-verification-tier.py` は変更 path を正規化・重複排除・昇順化し、公開面と逆転不能性を規則表で評価する。複数規則に一致した場合は最も高い tier を採る。規則表と selector 本体の digest を記録し、同じ入力に対する判定根拠を後から照合できるようにする。

人が算出結果より低い tier へ降格する場合は、理由と deferred Beads ID を同時に必須とする。どちらかが欠ければ非 0 終了で拒否する。selector が無い時代の `tier_selector: absent` 記録は、新規検証の根拠には使わず `critical` 相当で再検証する。

## 検査計画と証拠

`scripts/verification-gate-ledger.json` を gate 台帳の正本とし、`scripts/build-verification-plan.py` が tier ごとの blocking 集合を導出する。常時 blocking の gate は tier で緩めない。低い tier で実行する検査は advisory、高い tier へ延期する検査は deferred とし、deferred が一つでもあれば受け皿 issue を必須にする。

`scripts/validate-tier-decision.py` は selector、入力、規則一致、checks、deferred issue、cache hit の語彙と整合を検査する。`cache_hit: true` は過去の同一入力の結果を再利用した実行として `disposition: executed` を保ち、`cached` という別の disposition を作らない。

## evaluator cache

cache key は「対象内容 digest」「evaluator ID と version」「実効設定」だけから決定論的に作る。miss と corrupt は evaluator を再実行し、同じ key に異なる結果を上書きしない。cache 機構自体は実装済みだが evaluator の実呼出元には未配線であり、`HarnessHub-6nf1` が残作業を所有する。

## 現在の配線境界

`.github/workflows/governance-check.yml` は tier の算出、記録検証、artifact 保存までを行う。tier に応じた下流 CI step の起動・blocking 切替はまだ行わない。切替残作業は `HarnessHub-xcl3`、延期の常設受け皿は `HarnessHub-sy31` が所有する。

## ユースケースとユーザーフロー

開発者または CI が base と HEAD の差分を selector へ渡し、tier と checks を一度だけ導出する。validator が記録を検査し、CI は結果を 30 日保持の artifact として保存する。延期があれば Beads の受け皿から後続実行へつなぐ。

## 機能要件

- 変更 path の順序、重複、実行者によって tier が変わらない。
- 最上位一致を採り、降格は理由と issue の双方を要求する。
- gate ledger から checks を一方向に導出し、decision と plan の二重計算を避ける。

## 非機能要件

- selector、plan builder、validator、cache builder、手管理文書を各 500 行以下に保つ。
- 記録を append-only とし、既存 run や同一 cache key の異結果を上書きしない。
- secret や利用者データを入力・出力へ追加しない。

## UI・状態遷移

製品 UI は変更しない。開発証拠は `executed / deferred / skipped`、cache は `hit / miss / corrupt`、tier は `mvp / standard / critical` の閉じた状態集合を持つ。

## ビジネスルールと検証

危険度の高い一致が低い一致に優先する。常時 blocking gate は tier で緩めず、延期に受け皿が無い場合と selector 根拠が無い場合は失敗とする。

## API契約

製品 API は変更しない。repository 内 CLI の JSON 入出力を契約とし、必須 field と閉列挙を validator が検査する。

## データモデル

DB schema は変更しない。`tier-decision.json`、verification plan、cache entry の JSON schema 相当契約だけを追加する。

## 認証・認可

認証・認可の製品契約は変更しない。ただし auth/authz/credentials を含む変更 path は安全側の `critical` へ自動昇格する。

## エラー・例外・回復

入力不正は exit 1、無記録降格・受け皿無し延期・append-only 違反は exit 2 とする。cache corrupt は古い結果を使わず evaluator 再実行へ回復する。

## イベント・非同期処理

新しい製品イベントや queue は追加しない。GitHub Actions の run 単位で decision artifact を生成する同期処理だけを追加する。

## 可観測性

run ID、target、変更 path、matched rules、rules/source digest、checks、deferred refs、cache key/hit を記録し、なぜその検証になったかを再構成可能にする。

## 互換性・移行・リリース

過去の `full` は `critical` の旧称として読み、既存 qa_log の逐語は書き換えない。`tier_selector: absent` の過去 run は記録として残すが、新規判断に再利用せず `critical` 相当で再検証する。

## テストと受入条件

selector、plan、decision、cache、signal consistency の focused pytest、system-spec coverage、task plan、repository CI、PR-ready gate を main 取り込み後の最終 HEAD で通す。

### live-trial の資源予算と再利用契約

- canonical positive scenario は `max_wall_clock_s` と `max_total_tokens` を正の整数で必須宣言する。poll と verdict の双方が同じ scenario を読み、環境変数や再試行で上限を引き上げてはならない。
- token 使用量は main/subagent transcript の assistant message ID を重複排除し、input、cache creation、cache read、output の合計として記録する。計測不能または超過時は PASS を禁止する。
- digest-bound PASS receipt が current な system-spec bundle は、version、artifact digest、coverage、source citation、evaluator verdict を検証して再利用できる。不在または stale の場合だけ正規の elicit→必要時 doc-fetch→compile→evaluator を実行する。
- 再利用経路は上流 Skill 呼出し 0、network call 0、C02-only registration、source lineage/evaluator evidence 保持を受入条件とする。重複ロジック 0 の検査は upstream runtime の陽性対照を必須とし、検査対象 0 件による空の PASS を禁止する。
- system-spec state schema 1.0 は read-only compatibility とし、design application を持つ 1.1 への移行は明示 `init` だけに限定する。既存確定状態を暗黙変換しない。

## 未決事項

evaluator cache の実呼出元配線は `HarnessHub-6nf1`、tier による下流 CI 切替は `HarnessHub-xcl3`、deferred backlog の定期消化は `HarnessHub-sy31` が所有する。

## 非変更境界

本追補は repository の開発品質ゲートだけを変更する。Harness Hub の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit の契約は変更しない。

## 正本と追跡

- 正本: `system-spec/dev-workflow.md` の `qa-216` と `system-spec/testing-qa.md` の `qa-217`。
- 仕様反映受領書: `docs/features/feat-dev-pipeline-improvement/verification-tiering-final-review-spec-reflection-receipt.md`。
- 主な Beads: `HarnessHub-jb6r`、`HarnessHub-6fct`、`HarnessHub-hz8m`、`HarnessHub-6nf1`、`HarnessHub-xcl3`、`HarnessHub-true`、`HarnessHub-sy31`。
- bounded C19 と上流修正: `HarnessHub-p65r`、`HarnessHub-a0zd`、`HarnessHub-74mb`、`HarnessHub-xbzu`。
