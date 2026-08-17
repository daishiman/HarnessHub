---
graph_node_id: "issue-screen-profile-source-of-truth-20260812"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["documentation","information-design"]
priority: "low"
start_date: "2026-08-12"
target_date: null
iteration: null
title: "画面ごとの表示形式 (profile) の正本が、参照先に存在しない"
owners: ["daishiman"]
created_at: "2026-08-12T00:00:00Z"
updated_at: "2026-08-12T03:37:48Z"
status: "closed"
depends_on: []
related_nodes: []
resource_scope: ["docs/frontend-ui-foundation-spec.md","docs/screen-inventory.md"]
purpose: "仕様が宣言している正本の場所と、実際に値が書かれている場所を一致させる。"
goal: "画面ごとの表示形式をどこに書くかを 1 か所に決め、そちらへ統一する。"
scope_in: ["正本をどちらにするかの決定","決めた側への統一"]
scope_out: ["profile の値そのものの見直し"]
acceptance: ["profile の正本が 1 か所に定まる","各シートの記述が正本と食い違わない","仕様側の宣言が実態と一致する"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/screen-profile-source-of-truth-20260812.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"49d08f1d3914ba63a7b86c68d68969397afce1dea5d50697ed1eea406819afd3","evaluator":"2026-08-12 の情報設計シート棚卸しで検出","evidence_ref":"issues/screen-profile-source-of-truth-20260812.md"}
source_lineage: {"imported_at":"2026-08-12T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"docs/product/backlog.md","source_plugin":null,"source_version":null}
classification_confidence: 0.96
classification_reason: "仕様文書と台帳の参照の食い違いであり、文書側の課題に該当する。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/screen-profile-source-of-truth-20260812.md","confidence":0.96}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-nqo5","linked_at":"2026-08-12T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-12T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 画面ごとの表示形式 (profile) の正本が、参照先に存在しない

## 概要

`docs/frontend-ui-foundation-spec.md` は「画面ごとの profile の割当は
`docs/screen-inventory.md` の profile **だけ**を正本とする」と定めている (§0 相当の
26 行目、および 81 行目)。しかし `screen-inventory.md` に profile 列は存在しない。

## 背景と問題

各画面の情報設計シートは、§画面プロファイルで `screen-inventory.md` を参照する形で
書かれている。例:

- `docs/features/feat-docs-cms/information-design/S15.md:9`
  「`docs/screen-inventory.md` の `S15` 行を参照する (一覧は `scan · comfortable · card-collection`)」
- `docs/features/feat-dual-catalog-web/information-design/S04-releases.md:9`
  「`docs/screen-inventory.md` の `S04 Release 履歴` 行を参照する
  (wide/middle `compare · compact · table+master-detail` / narrow `compare · balanced · list+master-detail`)」

参照先にその情報が無いため、**括弧の中に書かれた値が事実上の正本になっている**。
仕様が「1 か所を正本とする」と宣言しているのに、実際は各シートに散っている状態で、
以下が起きる。

- 画面をまたいで profile を見比べられない (統一されているかを確認できない)。
- どちらかを直したときに、もう一方が追従しない。
- 新しい画面を足す人が、どこに profile を書けばよいか分からない。

## 現在の挙動

`docs/screen-inventory.md` の Studio 由来画面の表 (30-31 行目) の列は
ID / 画面 / 主な role / Stage / 優先度 / 担当 feature / mock id の 7 列。profile は無い。

## 期待する挙動

次のどちらかに決める。

- **A: 台帳に profile 列を足す。** 仕様の宣言どおり 1 か所に集める。各シートの括弧書きは
  台帳への参照だけにする。画面数ぶんの棚卸しが要る。
- **B: 仕様の宣言を実態に合わせる。** 「profile の正本は各画面の情報設計シート」と
  書き換え、台帳は画面の存在と担当 feature だけを持つ台帳に留める。

**推奨は A。** profile は「画面をまたいで揃っているか」を確かめるための情報で、
散らしたままだと本来の用途に使えない。

## 再現手順またはユースケース

`docs/screen-inventory.md` を開いて S15 行の profile を読もうとすると、列が無い。

## 影響と優先度

いま実装が間違っているわけではないので low。ただしこの食い違いを放置すると、
「台帳を見れば分かる」と思って台帳を見た人が profile を見つけられず、
シートを 1 枚ずつ開くことになる。

## スコープ

A か B の決定と、決めた側への統一まで。profile の値そのものの見直しは含まない。

## 関連グラフ

- `docs/frontend-ui-foundation-spec.md:26`、`:81`
- `docs/screen-inventory.md:30-31` (表頭)、`:39` (S15 行)
- 各 feature の `information-design/*.md` の §画面プロファイル

## 受入条件

上記 acceptance のとおり。

## 検証証跡

2026-08-12 に上記 3 ファイルを実読し、参照先に profile 列が無いことを確認。
