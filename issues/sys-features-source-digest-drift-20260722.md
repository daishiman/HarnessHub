---
graph_node_id: "issue-features-source-digest-drift-20260722"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["dev-graph","source-lineage","follow-up"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "features 18 件の source_digest が現行 source 実体と不一致 (既存 drift) の追随"
owners: ["daishiman"]
created_at: "2026-07-22T23:04:59Z"
updated_at: "2026-08-02T21:09:14.112561Z"
status: "closed"
depends_on: []
related_nodes: ["spec-harness-hub-requirements"]
resource_scope: ["features/","plugins/dev-graph/scripts/upsert-node.py","plugins/dev-graph/scripts/validate-source-digest.py"]
purpose: "features/feat-*.md 18 件の source_lineage.source_digest が source 実体と不一致になった既存 drift を、意味影響を判定したうえで正規 writer により追随させ、由来追跡を回復する。"
goal: "18 件の source_lineage が現行 source 実体へ追随済みであり、source 変更が feature の意味に影響する場合だけ再 import 経路へ差し戻されている。"
scope_in: ["4 source ファイルの変更内容が各 feature の意味に影響するかの判定","影響なしの feature の lineage refresh (source_digest 実測更新) を正規 writer upsert-node.py patch で実施","影響ありの feature の再 import 経路への差し戻し"]
scope_out: ["sha 手書換での digest 合わせ (偽装として禁止)","validate-source-digest.py の検査範囲拡張 (別課題)","t9q の R3 再 import 対象 (spec-harness-hub-requirements / arch-harness-hub-infrastructure)"]
acceptance: ["18 件の source_digest が実測値と一致するか、再 import 差し戻しの記録がある","digest 更新は upsert-node.py patch 経由のみで行われている","意味影響の判定根拠と仕様反映要否が本 issue に記録されている"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-features-source-digest-drift-20260722.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-22T23:04:59Z","origin_kind":"manual","source_digest":null,"source_path":"specs/harness-hub-system-specification.md","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "HarnessHub-t9q の lineage 調査 (2026-07-22、全 215 artifact 突合) で観測した features 14 件の source_digest 既存 drift を追跡する follow-up issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-features-source-digest-drift-20260722.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-5kh","linked_at":"2026-07-23T10:11:37Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: [{"base_branch":"main","closing_reference_verified":false,"head_branch":"devgraph/issue-features-source-digest-drift-20260722","linked_at":"2026-08-02T21:08:14Z","merge_commit_sha":null,"merged_at":null,"pr_number":643,"repo":"daishiman/HarnessHub","state":"open","url":"https://github.com/daishiman/HarnessHub/pull/643"}]
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-02T21:08:14Z","evidence_refs":["issues/sys-features-source-digest-drift-20260722.md","https://github.com/daishiman/HarnessHub/pull/643"],"policy":"manual","reconciled_at":"2026-08-02T21:08:14Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-07-22T23:04:59Z","missing_sections":[],"status":"complete"}
---

# 概要

features/feat-*.md の source_lineage.source_digest が source 実体と不一致になる既存 drift を追跡する。初回発見は 14 件だったが、訂正前の 2026-08-02 実測では 18 件へ増加していた。validate-source-digest.py は registered_this_run のみ検査するため既存 node の drift は検出されず、lineage の追跡性が劣化していた。

## 背景と問題

`issue-features-source-digest-drift-20260722` は「features 18 件の source_digest が現行 source 実体と不一致 (既存 drift) の追随」を追跡する issue である。背景と根本原因は Beads `HarnessHub-5kh` の description / notes と node の purpose に記録している。

## 現在の挙動

graph status は `draft`、completion status は `open` であり、Beads `HarnessHub-5kh` が残作業の実行状態を管理する。

## 期待する挙動

features 18 件の source_lineage が現行 source 実体へ追随済みで、source 変更が feature の意味に影響する場合は再 import 経路へ差し戻されている

## 再現手順またはユースケース

Beads `HarnessHub-5kh` の description に記録した入力条件を用い、対象 script / workflow / validator を実行して現象を再現する。再現条件と実測結果は同 issue の notes に追記し、完了時は node の evidence_refs へ repository 内の証跡を係留する。

## 影響と優先度

priority は `medium`。features/feat-*.md 18 件の source_lineage.source_digest が実体と不一致となり、由来追跡が劣化していたため、他 issue と依存・write scope を分離して追跡する。

## スコープ

**対象:**

- 4 source ファイルの変更内容が各 feature の意味に影響するかの判定
- 影響なしの feature の lineage refresh (source_digest 実測更新) を正規 writer upsert-node.py patch で実施
- 影響ありの feature の再 import 経路への差し戻し

**対象外:**

- sha 手書換での digest 合わせ (偽装として禁止)
- validate-source-digest.py の検査範囲拡張 (別課題)
- t9q の R3 再 import 対象 (spec-harness-hub-requirements / arch-harness-hub-infrastructure)

## 関連グラフ

- spec-harness-hub-requirements
- Beads: `HarnessHub-5kh`

## 受入条件

- features 18 件の source_digest が実測値と一致するか、再 import 差し戻しの記録がある
- digest 更新は upsert-node.py patch 経由のみで行われている
- 意味影響の判定根拠が本 issue に記録されている

## 検証証跡

**2026-08-02 実測・訂正完了。**

### 実測 (訂正前, graph revision 1126 時点)

feature 19 件中 一致 1 件 (feat-hearing-intake) / 不一致 18 件 (2026-07-26 時点の 16 件からさらに増加)。内訳:

- specs/harness-hub-system-specification.md を source とする 13 件 (feat-stage0-distribution-gate, feat-hub-foundation, feat-domain-model-db, feat-auth-tenancy, feat-publish-pipeline, feat-publisher-plugin, feat-dual-catalog-web, feat-workspace-governance, feat-user-org-admin, feat-metrics-tracking, feat-build-pipeline-board, feat-feedback-loop, feat-docs-cms): 実測は全件 `0765accae210…` に収束 (feat-hearing-intake の記載値と一致=既に最新)。
- system-spec/dev-workflow.md を source とする 3 件 (feat-dev-pipeline-improvement, feat-doc-governance-portability, feat-mvp-first-scheduling): 実測は全件 `f365125fc467…`。8wo で feat-dev-pipeline-improvement を訂正した値 (`43336931b9d8…`) は今回 feat-mvp-first-scheduling の記載値として観測され、8wo 以降さらに source が編集され再 drift していたことを確認。
- system-spec/testing-qa.md を source とする feat-task-spec-test-strategy: 記載 `530b64ca7ea7…` / 実測 `d6b74c9e1eeb…` (新規 drift、2026-07-26 notes には未記載)。
- docs/features/feat-domain-model-db/requirements-baseline.md を source とする feat-tenant-data-retention: 記載 `5b591475b2b9…` / 実測 `fa2924a1c143…` (2026-07-26 notes と同一、未変化)。

### 意味影響の判定 (scope_in「source の変更内容が各 feature の意味に影響するかの判定」)

各 source ファイルの git 履歴 (git log -p) と、各 feature 自身の記録 (features/<id>.md の「実装反映」節、docs/features/<id>/requirements-baseline.md) を突合し、18 件全件を判定した (3 並列の read-only 調査 agent による独立確認、担当は source ファイル単位で分割)。

- **specs/harness-hub-system-specification.md 系 13 件**: このファイルの節本文はプレースホルダー (「正本章…を参照」) が主で、実質的な内容は末尾に積み上がる feature ごとの「実装反映 (日付 / HarnessHub-ID)」追記ブロックのみ。5 件 (stage0-distribution-gate, hub-foundation, domain-model-db, auth-tenancy, publish-pipeline) は固有の追記が存在するが、いずれも対応する features/<id>.md 側に同日付・同 HarnessHub-ID の「実装反映」節として既に取り込み済みで内容の矛盾なし。残り 8 件はファイル内に当該 feature への言及自体が存在せず、drift は他 feature 追記によるファイル全体ハッシュの機械的変動のみが原因。**全件 no_impact。**
- **system-spec/dev-workflow.md 系 3 件**: 直近コミット (fb106ee4, 87f930ae 等) は「確定済み QA 回答・製品 API・DB schema・認証認可・UI・Cloudflare deploy unit は変更しない」と明記した実装反映注記の追記、または既存条項を「全面維持」した節番号変更 (qa-069/070 系のリネーム) のみで、各 feature 側の scope_in/purpose/acceptance と矛盾しない。**全件 no_impact。**
- **feat-task-spec-test-strategy**: system-spec/testing-qa.md の該当セクション (qa-076/078/079/081) は導入コミット e1d9ab29 以降本文無変更。digest 差分は末尾への新規 qa エントリ追記 (f5b215ed / cbdee227 / 088e14df) のみで、いずれも「既存契約を全面維持」と明記。**no_impact。**
- **feat-tenant-data-retention**: docs/features/feat-domain-model-db/requirements-baseline.md はコミット f5603ad8 で節番号が §6.2→§7.2 へ移動し digest が変わったが、qa-045 follow-up (tenant_data_objects / C4 改訂) の趣旨は不変で、むしろ `(feat-tenant-data-retention 相当)` の明示参照が追加された。**no_impact。**

判定結果: **18 件全件が no_impact**。再 import 差し戻しが必要な件(意味影響あり)は 0 件。

### digest 更新の実施

正規 writer `plugins/dev-graph/scripts/upsert-node.py` の `{"patch": {"graph_node_id": ..., "source_lineage": {...}}}` 形式 (`.dev-graph/cache/digest-refresh/*.patch.json`) のみを用い、`--body-file` は指定せず本文を保持 (`body_source: preserved` を全件で確認)。sha 手書換は一切行っていない (scope_out 遵守)。

- graph_revision: 1126 → 1144 (18 件それぞれ +1、`operation: updated`)
- 全件 dry-run で `body_source: preserved` を先行確認後、本適用
- 適用後、19 feature 全件で実測 sha256 と source_lineage.source_digest が一致することを再検証 (mismatch 0 件)
- `plugins/dev-graph/scripts/validate-graph-schema.py --graph .dev-graph/state/graph.json --repo-root .` → `{"valid": true, "violations": []}`

### 対象外として据置した既存事項

- docs/features/feat-dev-pipeline-improvement/requirements-baseline.md 第7節の 2 行 (architecture/harness-hub-dev-workflow.md 参照箇所、specs/harness-hub-system-specification.md 参照箇所) が status=verified のまま実体と不一致の件は、graph node の source_lineage フィールドではなく本文中の参照記述であり、本 issue のスコープ (feature node の source_digest) 外のため今回も未着手。8wo からの継続据置。
- validate-source-digest.py の既存 node 検査範囲拡張 (再発防止 gate) は scope_out に明記の通り別課題として扱う。

### 最終レビュー・main 統合後の再検証 (2026-08-03)

- `origin/main` を local `main`（`7fa2f057`）へ取り込み、続けて本 branch へマージした。統合後、source 実体の hash が再度変化したため、初回の訂正結果をそのまま使わず再計算した。
- `feat-task-spec-test-strategy` は上流 `main` が system-spec-harness 経由で既に `system-spec/testing-qa.md` の現行 hash `8e8d4833fcbb…` を正規取込済みだったため、本 branch からは上書きしなかった。
- 残る 17 件を `upsert-node.py` patch 経由で再適用した。現行 hash は、system specification 系 13 件が `7e1a6753bec4…`、dev workflow 系 3 件が `ab4bd2e75bae…`、tenant retention 1 件が `fa2924a1c143…`。graph revision は main 統合直後の `1157` から `1174` へ進んだ。
- `validate-source-digest.py` は registered 18 件すべて mismatch 0、`validate-graph-schema.py` は valid=true。誤って active へ戻っていた `feat-doc-governance-portability`（`HarnessHub-ik0`）と `feat-mvp-first-scheduling`（`HarnessHub-6gl`）は Beads 実態に合わせて `closed` を維持した。
- task-spec quality gate は 18 package 全件 PASS。targeted pytest は `77 passed, 18 subtests passed`、文書行数 gate、artifact placement、`git diff --check` はすべて PASS。

### 仕様・設計影響と反映受領

**本 branch の仕様・設計影響はなし。** この変更は既存 feature node の source_lineage（由来の hash）と lifecycle 投影を実体に合わせるだけであり、製品の API、DB schema、認証認可、UI、Cloudflare deploy、task requirements を変更しない。そのため `docs/`、`features/`、`system-spec/`、`architecture/`、`tasks/` に追加の製品仕様文書を作らない。

上流 main に含まれる qa-134（task spec の世代非依存 rerun command）は仕様影響を持つが、これは base branch 側で既に `feat-task-spec-test-strategy` へ system-spec-harness が正規取込済みであり、[rerun-command-spec-reflection-receipt](../docs/features/feat-task-spec-test-strategy/rerun-command-spec-reflection-receipt.md) に受領済みである。本 branch はその仕様を変更・再反映しない。今回の no-impact 受領書は `build-spec-reflection-receipt.py --spec-impact none` により commit `bcaebad0` へ紐付けて記録済みである。

### 公開状態 (2026-08-03)

- draft PR: [#643](https://github.com/daishiman/HarnessHub/pull/643)（base: `main`、head: `devgraph/issue-features-source-digest-drift-20260722`）
- Beads: `HarnessHub-5kh` を完了へ更新。PR は draft のため、マージ済みを示す証跡には扱わない。
