---
graph_node_id: "issue-spec-elicit-leading-question-lint-20260802"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["governance","lint","system-spec","hearing-quality"]
priority: "low"
start_date: "2026-08-02"
target_date: null
iteration: null
title: "system-spec: R2-interview に誘導質問と論点束ねの機械検査が無く同型の質問が再発しうる"
owners: ["daishiman"]
created_at: "2026-08-12T04:19:06.115941Z"
updated_at: "2026-08-12T04:19:06.115941Z"
status: "active"
depends_on: []
related_nodes: ["issue-doc-internal-link-integrity-gate-20260811"]
resource_scope: ["plugins/system-spec-harness/skills/run-system-spec-elicit/prompts/R2-interview.md","plugins/system-spec-harness/skills/run-system-spec-elicit/prompts/R6-audit-hearing.md","plugins/system-spec-harness/agents/system-spec-hearing-auditor.md"]
purpose: "ヒアリング品質の担保を LLM 監査の裁量だけに委ねず、誘導質問と論点束ねという再現性のある欠陥型を決定論的に遮断する。"
goal: "R2-interview が生成する質問に対し、誘導語と複数論点の同時提示を機械検査で検出し、同型の質問が再発しない状態にする。"
scope_in: ["誘導質問と論点束ねの欠陥型の定義","決定論検査の実現可能性評価","R6-audit-hearing との責務境界の確定"]
scope_out: ["ヒアリング内容そのものの良否判定","LLM 監査 (system-spec-hearing-auditor) の置換","質問文の自動書き換え"]
acceptance: ["誘導質問と論点束ねの 2 欠陥型を、機械判定可能な形で定義する","R6-audit-hearing / system-spec-hearing-auditor による LLM 監査との責務境界を文書化する","決定論検査が偽陽性過多になるか否かを実サンプルで評価し、採否を根拠つきで決める"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/spec-elicit-leading-question-lint-20260802.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"aa2ff657ab6648317f9b3a29ea04440526a42c48f02453fe0df7843748961907","evaluator":"2026-08-12 repo 走査による決定論検査器の不在確認","evidence_ref":"plugins/system-spec-harness/skills/run-system-spec-elicit/prompts/R6-audit-hearing.md"}
source_lineage: {"imported_at":"2026-08-02T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "誘導質問の検出は R6-audit-hearing と system-spec-hearing-auditor による LLM 監査のみに依存し、決定論的な検査器が repo に存在しないことを確認した。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/spec-elicit-leading-question-lint-20260802.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-rylh","linked_at":"2026-08-02T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-12T00:00:00Z","missing_sections":[],"status":"complete"}
---

# system-spec: R2-interview に誘導質問と論点束ねの機械検査が無く同型の質問が再発しうる

## 概要

`plugins/system-spec-harness/skills/run-system-spec-elicit` の R2-interview が生成する質問について、誘導質問 (leading question) と論点束ね (複数の判断を 1 問に詰める) を検出する決定論的な検査が存在しない。

## 背景と問題

ヒアリング品質の担保は現在、`plugins/system-spec-harness/skills/run-system-spec-elicit/prompts/R6-audit-hearing.md` と `plugins/system-spec-harness/agents/system-spec-hearing-auditor.md` による LLM 監査だけに依存している。LLM 監査は文脈依存の欠陥を拾える一方、同じ入力に対して同じ判定を返す保証が無い。結果として、誘導質問という再現性のある欠陥型が監査の当たり外れで通過し、同型の質問が再発しうる。

## 現在の挙動

誘導語を含む質問や、複数の論点を 1 問に束ねた質問を生成しても、決定論的に落ちる検査は無い。R6-audit-hearing が指摘するかどうかは実行ごとに変わりうる。

## 期待する挙動

誘導質問と論点束ねの 2 欠陥型が機械判定可能な形で定義され、LLM 監査とは独立に、同じ入力へ常に同じ判定を返す検査が働く。

## 再現手順またはユースケース

R2-interview で「〜という理解でよろしいですか」のような同意を前提化した問い、または 1 問に選択肢と判断基準を同時に含む問いを生成させる。現状これらは決定論的には検出されない。

## 影響と優先度

要件収集の入口が歪むと下流の system-spec 全体に伝播するが、LLM 監査という受け皿は存在し完全な無防備ではない。したがって low とする。

## スコープ

欠陥型の定義、決定論検査の実現可能性評価、および LLM 監査との責務境界の確定を対象とする。質問文の自動書き換えとヒアリング内容そのものの良否判定は含めない。

## 関連グラフ

`issue-doc-internal-link-integrity-gate-20260811` と同じく「受入条件が参照する検査器が実在しない」型の課題である。HarnessHub-mfh7 の orphan external_ref 解消の対象として本 artifact を配置した。

Beads 課題は `HarnessHub-rylh`。

## 受入条件

- 誘導質問と論点束ねの 2 欠陥型を、機械判定可能な形で定義する
- R6-audit-hearing / system-spec-hearing-auditor による LLM 監査との責務境界を文書化する
- 決定論検査が偽陽性過多になるか否かを実サンプルで評価し、採否を根拠つきで決める

## 検証証跡

2026-08-12 時点で `plugins/system-spec-harness` 配下に誘導質問を検査する script は存在せず、`誘導質問` の語を含むのは R6-audit-hearing.md・system-spec-hearing-auditor.md と評価 rubric のみであることを確認した。いずれも LLM 判断を前提とする成果物である。

なお本 artifact は起票 (2026-08-02) 時に本文が未作成のまま external_ref だけが Beads 側に登録され、`make orphan-external-ref` が OE-001 / true_orphan として検出していた。本 upsert により当該 orphan は解消する。
