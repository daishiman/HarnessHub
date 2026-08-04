---
graph_node_id: "issue-c14-live-trial-scenario-coverage-gap-20260726"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","decompose","live-trial","vacuous-pass","acceptance-criteria","scenario-contract","follow-up","qa-6in4"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "C14 live-trial の scenario 契約が要求する readiness-incomplete 除外が未検証で、起票 0 件も binding=none と交絡している"
owners: ["daishiman"]
created_at: "2026-07-25T23:50:00Z"
updated_at: "2026-07-26T03:26:08.976543Z"
status: "draft"
depends_on: ["issue-decompose-live-trial-audit-defects-20260726"]
related_nodes: ["issue-decompose-live-trial-audit-defects-20260726","issue-guard-fix-closure-verdict-refresh-20260726"]
resource_scope: ["plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json","plugins/harness-creator/skills/run-skill-live-trial/scripts/live-trial-verdict.py","eval-log/dev-graph/run-dev-graph-decompose/criteria-test/scenario-verdict.json"]
purpose: "OUT1 は verify_by:live-trial であり判定の正本は scenario の required_observations だが、4 観測のうち readiness-incomplete による publication candidate 除外が実データで未検証、Issue 起票 0 件は binding=none による抑止と交絡しており、verdict PASS が OUT1 全体の充足を意味しない"
goal: "run 中に昇格した feature が readiness incomplete で除外されることを実観測として記録し、起票 0 件の抑止要因を切り分けられる状態にする"
mvp_alignment: null
scope_in: ["run 中に produced feature を confirmed + evaluation-pass へ昇格させ readiness を incomplete に保つ task.md 手順の設計","publication candidate からの除外を実 run 観測として記録する","draft gate による抑止と binding による抑止を区別できる観測設計","required_observations の未回収項目を受領書へ機械的に開示する仕組み","task_args_template と実 args の乖離検出"]
scope_out: ["binding=beads / github の実 tracker への書込みを伴う live-trial (外部依存のため別課題)","criteria:OUT3 (--dry-run の write 0 件と stdin schema 検証) の検証 (verify_by:test の担当)","run-dev-graph-decompose の SKILL.md 変更"]
acceptance: ["run 中に昇格した confirmed + evaluation-pass + readiness incomplete の feature が 1 件以上存在する状態で C14 live-trial が完走している","その feature が publication candidate から除外されたことが監査 script の合成 probe ではなく実 run 観測として記録されている","Issue 起票 0 件の観測で draft gate による抑止と binding による抑止が区別できる","scenario の required_observations のうち未検証のものが受領書 observed へ機械的に列挙される","task_args_template と実 args の乖離が verdict または受領書に現れる"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-c14-live-trial-scenario-coverage-gap-20260726.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-25T23:50:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "scenario 定義 live-trial-positive-scenarios.json の fixture_contract 原文と dcmp2 run の graph.json 実 node 状態 (5 node すべて draft/pending/incomplete) を突き合わせ、契約が明文で否定する状態であることを独立評価者が実測した"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-c14-live-trial-scenario-coverage-gap-20260726.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-dyxr","linked_at":"2026-07-26T03:25:49Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-25T23:50:00Z","missing_sections":[],"status":"complete"}
---

## 概要

`run-dev-graph-decompose` の `criteria:OUT1` は `verify_by: live-trial` であり、判定の正本は `plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json` の scenario `C14-OUT1-positive-macro-decomposition` が定める `fixture_contract` と `required_observations` である。

2026-07-25 の再取得 run `20260725T205644Z-dcmp2-wt6` の独立評価により、この scenario が要求する 4 つの `required_observations` のうち **2 つが実データでは未検証**のまま live-trial が PASS していることが判明した。原因は被験の逸脱ではなく、run へ渡した task.md が scenario 契約を反映していなかったこと (設計の乖離) にある。

## 未検証その 1: readiness-incomplete による publication candidate 除外

scenario の `fixture_contract` は次を明示的に要求している (原文):

> The run must additionally promote at least one produced feature to confirmed with evaluation-pass while its implementation_readiness stays incomplete, so the publication-candidate gate has to evaluate readiness and exclude it; **a candidate set that is empty only because every node is draft leaves the readiness condition untested and does not satisfy the contract.**

`required_observations[2]` も同じ内容を求める。

しかし `dcmp2` run の実測は次のとおりで、昇格は 1 件も行われていない。

- `.dev-graph/state/graph.json` の 5 node (`arch-webapp-base` / `feat-user-auth` / `feat-user-dashboard` / `feat-email-notification` / `feat-admin-report`) はすべて `confirmation_status=draft` / `evaluation_status=pending` / `implementation_readiness.status=incomplete`
- したがって publication candidate 集合は「全 node が draft だから空」であり、これは契約が明文で「契約を満たさない」と書いている状態そのもの

代替として `audit_decompose_live_trial.py` の `readiness_probe` (`features[0]` を deepcopy して confirmed/pass を代入し、直後に readiness=incomplete を代入して自前述語が False を返すことを見る) が動いているが、これは HarnessHub-9ndl の欠陥 2 (トートロジー) として既に起票済みのもので、実 run の観測ではない。

## 未検証その 2: 「Issue 起票 0 件」における draft gate と binding=none の交絡

`required_observations[1]` は「pre-evaluation draft features publish zero issues **on every binding**」を要求する。

`dcmp2` run は `--binding none` で走らせたため、`issues/` 配下 0 件・`.beads/` 不在という観測は得られたが、その 0 件が

- (a) draft gate が作動して起票を止めた結果なのか
- (b) `--binding none` により投影経路そのものが発火しなかった結果なのか

を切り分けられない。`--dry-run` を外したことで「dry-run による抑止」は除去できたが、`binding=none` による抑止という別の交絡が残っている。「on every binding」の要求に対して 1 binding しか観測していない点も未充足。

## 未検証その 3 (許容): dry run の write 0 件

`task_args_template` は `--repo-root <contained-fixture-repo> --binding none --dry-run` だが、`dcmp2` の task.md は `--dry-run` を明示的に禁止して上書きした。これは「実書込み経路が有効な状態で draft 起票 0 件を見る」ためであり意図的な選択である。結果として `required_observations[3]` (dry run の write 0 件と stdin 経由 schema 検証) は本 run では未検証だが、これは `criteria:OUT3` (`verify_by: test`) の担当であり、本課題では blocker としない。

ただし scenario の `task_args_template` と実際に走らせた args が食い違ったまま verdict が PASS になる点は、scenario 定義と run の整合を機械検査していないことを意味する。

## 影響

- `eval-log/dev-graph/run-dev-graph-decompose/criteria-test/scenario-verdict.json` の OUT1 は現在 `20260725T205644Z-dcmp2-wt6` を参照して緑だが、その根拠は scenario 契約の 4 観測のうち 2 つ (acyclic DAG + 粒度閾値、draft の起票 0 件 [交絡あり]) にとどまる。
- `live-trial-verdict.py` は `scenario_id` の一致は見るが、`required_observations` が実際に観測されたかは検査していない。したがって scenario 契約を満たさない run でも verdict は PASS になりうる。これは受入判定の構造的な穴であり、本課題の中心。

## 実行順序の制約 (重要)

本課題の修正 (昇格を含む task.md での再走) は、HarnessHub-9ndl の欠陥 1 (`draft_candidates` が `_is_publication_candidate` で絞るため昇格させると `draft_empty` ゲートが落ちる) を先に直さないと**構造的に監査が赤くなる**。したがって 9ndl に依存する。

## 修正方針

1. `dcmp2` の task.md をベースに、run 中に produced feature を 1 件だけ confirmed + evaluation-pass へ昇格させ `implementation_readiness.status` は `incomplete` のままにする手順を追加する (fixture に seed するのではなく run 内で昇格させる — 契約が "Promotion is performed on the produced preview nodes during the run, never seeded by the fixture" と明記している)。
2. その状態で publication candidate から当該 feature が除外されることを、監査 script の合成 probe ではなく実 run の観測として実測する。
3. 「on every binding」の交絡を解く観測設計を決める。実 tracker への書込みを避けつつ binding 次元の差を出す方法 (例: binding ごとに投影経路が呼ばれたことを receipt で確認し、draft のときだけ 0 件になることを見る) を検討する。実 tracker 書込みを伴う beads/github の live-trial は外部依存のため本課題の scope 外とする。
4. `live-trial-verdict.py` (または受領書 lint) に、scenario の `required_observations` が verdict/receipt で回収されているかの検査を足すか、少なくとも `task_args_template` と実 args の乖離を検出して開示を強制する。

## 受入条件の候補

- run 中に昇格した feature (confirmed + evaluation-pass + readiness incomplete) が 1 件以上存在する状態で C14 の live-trial が完走し、その feature が publication candidate から除外されたことを実 run の観測として記録している。
- 「Issue 起票 0 件」の観測について、draft gate による抑止と binding による抑止が区別できる形で記録されている。
- scenario の `required_observations` のうち本 run で未検証のものが、受領書の observed に開示事項として機械的に列挙される (人手の記憶に依存しない)。
- `task_args_template` と実際の args が食い違う場合に、その差分が verdict または受領書に現れる。

## 検出経緯

2026-07-26、HarnessHub-q5h9 (guard-graph-schema 修正で stale 化した 9 skill の live-trial verdict 再取得) の一環で `run-dev-graph-decompose` を再走 (`20260725T205644Z-dcmp2-wt6`) し、独立評価者が真空合格 (vacuous pass) の点検を行った際に判明した。評価者は scenario 定義の原文と graph.json の実 node 状態を突き合わせ、契約が明文で否定している「全 node が draft だから candidate が空」の状態であることを実測した。
