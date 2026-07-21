---
graph_node_id: "issue-guard-indirect-mutation-init-config-schema-20260721"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["guard-hook","dev-graph","schema-conformance"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "dev-graph: guard hook の間接一括書換 (find/xargs) 遮断と init 生成 config の schema 適合"
owners: ["daishiman"]
created_at: "2026-07-21T08:40:00Z"
updated_at: "2026-07-21T08:40:00Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/dev-graph/hooks","plugins/dev-graph/schemas","plugins/dev-graph/templates","plugins/dev-graph/skills/run-dev-graph-init"]
purpose: "姉妹 hook で確立した write-target モデルを dev-graph の guard hook へ横展開し、書込先を静的抽出できない間接一括書換を遮断する。あわせて init が自分の schema に通らない config を出力できる欠陥を是正する"
goal: "find/xargs 経由で graph 権威領域を一括改変する経路が hook で遮断され、init が配置する正本 config と実運用 config の双方が repo-config.schema.json に適合することが pytest で固定されている"
scope_in: ["guard-graph-schema.py への間接 mutation 判定の追加","repo-config.schema.json の plan_roots 許可","repo-config.example.json の content_roots.features 補完","run-dev-graph-init SKILL.md の config 検証契約の明文化","上記を固定する回帰テストの追加"]
scope_out: ["dev-graph 全 9 skill の live-trial 証跡の再取得 (HarnessHub-j24 が担当。本 issue の変更が closure を変えるため、再取得は本 PR merge 後に一括で行う)","init 実行時に config を検証する決定論 script の実装 (後続)"]
acceptance: ["find/xargs 経由で保護領域を書き換えるコマンドが hook で BLOCK され、read-only な列挙は通ることが回帰テストで固定されている","repo-config.example.json と実運用 .dev-graph/config.json が repo-config.schema.json に適合することが pytest で検証される","live-trial fixture が commit 済みの生成 script から決定論的に再生成できる"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-guard-indirect-mutation-init-config-schema-20260721.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-21T08:40:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "guard hook の検知漏れ (FN) と init の schema 未検証という 2 つの防御欠落を、同一の closure 変更単位として扱うため issue として起票した"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-guard-indirect-mutation-init-config-schema-20260721.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-xm3","linked_at":"2026-07-21T08:42:30Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-21T08:40:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`plugins/dev-graph/hooks/guard-graph-schema.py` は、書込先が静的トークンとして現れない間接一括書換 (`find … | xargs sed -i`、`find … -exec rm`、`find … -delete`) を遮断できず、graph 権威領域 (`tasks/` `docs/` `specs/` `.dev-graph/`) を素通りで一括改変できた。あわせて `run-dev-graph-init` は、自身の `repo-config.schema.json` に適合しない `config.json` を正常初期化として出力できる状態だった。

## 背景と問題

### 1. guard hook の検知漏れ (FN)

姉妹 hook `plugins/system-spec-harness/hooks/` の bxz 修正で「書込先を静的抽出し、抽出できない場合だけ安全側に倒す」write-target モデルを確立した。その follow-up メモには dev-graph 側の guard に「同種の 参照↔書込 conflation (FP)」が残っていると記録されていたが、再調査したところ FP は既に解消済みで、実際に残っていたのは**逆向きの FN** だった。

`_mutating_operands()` は `cp src dst` の dst のように、コマンド文字列上に現れる宛先トークンだけを見る。`find tasks -name '*.md' | xargs sed -i 's/x/y/'` は書換対象が find の列挙結果として実行時に渡るため、宛先トークンが存在せず判定をすり抜ける。

### 2. init が出力する config が schema 未検証

`run-dev-graph-init` の Execution contract は「`validate-graph-schema.py` で config/graph/template readiness を検証する」と書いていたが、**`validate-graph-schema.py` は graph しか検証しない**。C01 の live-trial (r16) で、この経路から実際に schema 不適合の config が正常初期化として出力されることを確認した。

さらに正本資産そのものにも drift があった。

- `templates/repo-config.example.json` の `content_roots` に `features` が無い (schema の required は 7 key)。物理ディレクトリは init が作るのに routing policy から参照できない。
- 実運用 `.dev-graph/config.json` は system-dev-planner が読む `plan_roots` を持つが、schema は `additionalProperties:false` でこれを許していなかった。

どちらも資産単体としては妥当に見えるため、**正本資産を自身の schema にかける往復が無かった**ことが穴だった。

## 期待する挙動

- 間接構文 + mutation ツール + 保護領域の走査が共起するコマンドは、書込先確定不能として BLOCK される。read-only な列挙 (`find tasks | xargs wc -l`) は通る。
- `repo-config.example.json` と実運用 `config.json` が `repo-config.schema.json` に適合し、それが pytest で固定される。

## 再現手順またはユースケース

1. `find tasks -name '*.md' | xargs sed -i '' 's/status/broken/'` を Bash ツールから実行する
2. 修正前の hook では素通りし、`tasks/` 配下の graph 権威成果物が一括改変される

## 影響と優先度

- 影響範囲: dev-graph の graph 権威領域の保護、および init が配置する config の正当性
- 深刻度: medium
- 緊急度: 中 — hook は C02 atomic writer の二重化 (補助防御) であり単独の唯一防壁ではないが、init の config 欠陥は導入先 repository へそのまま伝播する

## スコープ

- In: guard hook の間接 mutation 判定、repo-config schema/template の是正、init SKILL.md の契約明文化、回帰テスト
- Out: dev-graph 全 9 skill の live-trial 証跡再取得 (HarnessHub-j24)、init 実行時に config を検証する決定論 script

## 備考

本 issue の変更は `plugins/dev-graph/hooks/guard-graph-schema.py` を含むため、**dev-graph 全 9 skill の behavior closure digest が変わる**。したがって既存 live-trial 証跡は一律 stale となり、`plugins/dev-graph/tests/test_skill_criteria_evidence.py` が 9 件 fail する。証跡の再取得は HarnessHub-j24 の再 trial campaign が担当し、closure を変える変更 (本 issue) が merge された後に一括で実施する。順序を逆にすると、先に取得した証跡が本 issue の merge で無効化されるため。
