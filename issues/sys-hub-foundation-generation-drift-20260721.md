---
graph_node_id: "issue-hub-foundation-generation-drift-20260721"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["dev-graph","system-dev-planner","generation","promotion"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "supersede 済み世代が自己記述性を持たず、正本と誤読される / promotion 後の再実行コマンドが解決できない"
owners: ["daishiman"]
created_at: "2026-07-21T00:00:00Z"
updated_at: "2026-07-22T00:00:00Z"
status: "draft"
depends_on: []
related_nodes: ["issue-devgraph-parity-manifest-provenance-20260721"]
resource_scope: ["plugins/system-dev-planner/scripts/validate-generation-lineage.py","plugins/system-dev-planner/scripts/build-task-projection-rerun.py","plugins/system-dev-planner/scripts/validate-system-plan.py","plugins/dev-graph/scripts/validate-source-digest.py","plugins/system-dev-planner/references/feature-execution-package-contract.md"]
purpose: "published generation の世代関係を、pointer/receipt を辿らない読み手にも機械にも誤読させない状態にする"
goal: "supersede 済み世代が自己記述的な marker を持ち、旧世代の byte-for-byte 不変性・現行世代の digest・再実行コマンドの解決可能性が fail-closed で検査される"
scope_in: ["supersede 済み世代への決定論的 supersession marker","current pointer 起点の generation lineage 検査 (V1..V7)","validate-system-plan の世代非依存な再実行経路","task projection への再実行コマンド冪等配線","package 由来 node の source_digest 契約整合","契約文書と task spec template への明記","回帰テスト"]
scope_out: ["旧世代の内容を現行世代へ上書きする是正","graph.json の source_lineage schema 変更と 195 node backfill","content-addressed generation 本文の手編集","live-trial 証跡の再取得"]
acceptance: ["supersede 済み世代 15 件が現行世代を指す SUPERSEDED.json を持ち、旧世代の canonical digest が変化しない","validate-generation-lineage.py が V1..V7 を fail-closed で検査し、旧世代の上書きと marker 改竄を exit 2 で拒否する","validate-system-plan.py --feature-package が current pointer から現行世代を解決し PASS する","task projection 195 件が世代非依存の再実行コマンドを持ち --check が exit 0 になる","validate-source-digest.py が system-dev-planner 由来 195 node を検出力を落とさず exit 0 で通す","契約文書に supersession marker と再実行コマンドの規範が明記される"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-hub-foundation-generation-drift-20260721.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-21T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"issues/sys-devgraph-parity-manifest-provenance-20260721.md","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "feat-hub-foundation の task-spec 突合中に観測した、published generation 層の誤読可能性と再実行不能コマンドを追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-hub-foundation-generation-drift-20260721.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-6cv","linked_at":"2026-07-21T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-22T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

published feature package は 2 層に分かれている。`.dev-graph/plans/generations/<slug>/<generation_id>/` が content-addressed な現行世代で、`.dev-graph/plans/<slug>/` は generations layout 導入前の第 1 世代 = supersede 済み世代である。後者は名前が最も発見しやすく render 済み HTML も同居するのに、**自分が旧世代であることを一切主張しない**。読み手は `.dev-graph/state/current/<slug>.json` の `supersedes` を辿らない限り、旧世代を正本と誤読する。

あわせて、content-addressed generation の task spec 本文に書かれた再検証コマンドが promotion 後に解決できない問題と、package 由来 node の `source_digest` 契約が validator と食い違う問題が同じ層に同居している。

## 背景と問題

### (1) supersede 済み世代が自己記述性を持たない

`references/feature-execution-package-contract.md` は「再計画では旧 package/旧 promotion receipt/旧 registration receipt を byte-for-byte 不変で残し」と規定し、`promote-system-plan.py` も `_previous_generation()` の docstring で "without mutating legacy published bytes" と明示する。つまり旧世代がそのまま残っているのは**設計どおり**であり、内容を現行世代へ追随させる上書きは契約違反になる。

しかし旧世代 directory には status を示すものが無い。`atomic-promotion-receipt.json` は `"status": "promoted"` のままで、`generation_id` も `supersedes` も持たない (現行 schema 導入前の形)。結果として「不変で残すのは正しいが、正本でないことが誰にも伝わらない」状態になっている。

なお `HarnessHub-6cv` の当初記述は「promoted task-spec 13 件を新世代へ直接編集し、generations 側が旧世代のまま取り残された」としていたが、実測では**向きが逆**である。generations 側が現行世代 (`938ecf38` 系 feature context)、`.dev-graph/plans/<slug>/` 側が旧世代 (`06c97e2e` 系) で、15 feature 全件が同型だった。また C26 (`reconcile-github-lifecycle.py`) は `node["file_path"]` = `tasks/<feature>/<id>.md` しか読まず、published 層を参照しない。

### (2) promotion 後に解決できない再実行コマンド

同契約 §2 は「task spec 本文に runtime reference として `.dev-graph/staging` を保存しない。atomic rename 後も解決可能にする」と定めるが、published 195 task spec 全件の `Automated commands` に `validate-system-plan.py --repo-root . --staging .` が残っている。repository root から実行すると required package file 不在で失敗する。一方 generation id を直書きすると再計画のたびに stale になるため、単純な置換では直らない。content-addressed generation 本文は不変なので手編集もできない。

### (3) package 由来 node の source_digest 契約不一致

`register-package.py:247` は exact-13 task node の `source_lineage.source_digest` に **package (generation) の canonical digest** を書くことを fail-closed で要求する。一方 `validate-source-digest.py` は `source_digest` を `source_path` 単体の sha256 として照合する。両者は package 登録 node に対して同時に成立しえず、195 node 全件が `digest 不一致 (他 file 流用の疑い)` で exit 2 になっていた。

## 現在の挙動

- `.dev-graph/plans/<slug>/` 15 件のいずれにも supersede を示すファイルが無い (`find -iname "*supersed*"` 0 件)。
- 15 件の実バイトから再計算した canonical digest は、`current/<slug>.json` の `supersedes.published_digest` と全件一致する (旧世代は不変に保たれている)。
- `validate-system-plan.py --repo-root . --staging .` は repository root では失敗し、generation path を明示すると PASS する。
- `validate-source-digest.py --registered <system-dev-planner 由来 195 node>` が exit 2、mismatch 195 件。

## 期待する挙動

- supersede 済み世代 directory は現行世代を指す決定論的な `SUPERSEDED.json` を持ち、canonical digest の対象集合の外側にあるため旧世代の digest を変えない。
- current pointer 起点の検査が、現行世代の digest 再計算・receipt 3 digest 一致・旧世代の不変性・marker の内容一致を fail-closed で検証する。旧世代の上書き是正は V6 で拒否される。
- plan validator は `--feature-package <id>` で current pointer から現行世代を解決でき、executor が読む task projection にその形式が配線されている。
- `validate-source-digest.py` は package 由来 node を `staging-manifest.json` の canonical digest と per-file sha256 で 2 段照合し、他 package の digest 流用と generation 改変を引き続き検出する。

## 再現手順またはユースケース

1. `.dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-01-requirements.md` を開く
2. 旧世代の feature context (`sha256:06c97e2e...`) を前提にした記述だけが見え、旧世代であることを示す情報がどこにも無い
3. 同 directory の `atomic-promotion-receipt.json` も `"status": "promoted"` としか書かれていない
4. 記載の `validate-system-plan.py --repo-root . --staging .` を repository root で実行すると失敗する

## 影響と優先度

- 影響範囲: system (published plan 層。15 feature × 13 task = 195 spec)
- 深刻度: medium
- 緊急度: 中 — 実行経路 (`tasks/` projection と graph の `source_lineage`) は現行世代を正しく指しており実害は限定的だが、人間と planner の誤読は静かに起きる。

## スコープ

- In: supersession marker、generation lineage 検査、世代非依存の再実行経路、projection への配線、source_digest 契約整合、契約文書と template、回帰テスト
- Out: 旧世代の上書き是正、graph schema 変更と node backfill、generation 本文の手編集、live-trial 証跡の再取得

## 関連グラフ

- 原因/親ノード: —
- 関連仕様: `plugins/system-dev-planner/references/feature-execution-package-contract.md` §2.2 / §2.3
- 関連課題: `HarnessHub-6cv` (本 issue) / `HarnessHub-cc6` (再実行コマンド) / `HarnessHub-432` (source_digest 契約)

## 仕様反映受領書 (2026-07-22 最終レビュー)

- **Beads ID**: `HarnessHub-6cv` / **dev-graph node**: `issue-hub-foundation-generation-drift-20260721`
- **品質ゲート再実行 (実測)**:
  - focused pytest 60 passed / 広域 (system-dev-planner 全 + source-digest) 120 passed
  - 受入 4 コマンドを実 repository で再実行: `validate-generation-lineage.py`=15 checked/0 violations、`build-task-projection-rerun.py --check`=195 checked/0 missing、`validate-source-digest.py --registered <195>`=195 checked/0 mismatch、`validate-system-plan.py --feature-package`=status pass/0 violations
- **仕様・設計への影響判断**:
  - **製品仕様 (`system-spec/`・`specs/`・`architecture/`)**: 影響なし。本変更は dev-graph / system-dev-planner の**開発メタツール層** (published generation の自己記述性・世代非依存の再実行経路) に閉じる。製品仕様は HarnessHub 本体を記述し、`architecture/harness-hub-dev-workflow.md`・`system-spec/dev-workflow.md` にも generation/promotion/supersede の記述は存在しないため、正規フローでの反映対象は無い。
  - **メタツール契約 (正本)**: `plugins/system-dev-planner/references/feature-execution-package-contract.md` §2.2 (supersede 済み世代の自己記述性) / §2.3 (promotion 後も解決可能な再実行コマンド) と `system-task-spec-template.md`・`run-system-dev-plan/SKILL.md`・`workflow-manifest.json` に反映済み。
  - **docs/features (living docs)**: 世代非依存 `--feature-package` 形式へ 7 件反映 (feat-hub-foundation と feat-stage0-distribution-gate の ADR・requirements-baseline・design-review-notes・test-design)。evidence/acceptance-record/test-run-results/implementation-notes は「旧世代 byte-for-byte 不変」原則により凍結証跡として対象外。
  - **tasks/ projection**: 195 spec の `## 実行契約` へ世代非依存 rerun 行を配線済み。
- **結論**: 受入条件を全件実測で満たし、製品仕様への影響なし・メタツール契約と docs/tasks への反映完了。
