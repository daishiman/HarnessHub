---
graph_node_id: "issue-shared-script-refs-closure-coupling-20260729"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","live-trial","behavior-closure"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "同一 plugin 内の共有 script を複数 skill が script_refs 宣言し 1 ファイル変更で live-trial 証跡が同時失効する"
owners: ["daishiman"]
created_at: "2026-07-28T21:40:43Z"
updated_at: "2026-08-04T04:00:27.875270Z"
status: "draft"
depends_on: []
related_nodes: ["issue-live-trial-verdict-staleness-hook-closure-20260726","issue-bd-external-ref-orphan-nodes-20260725"]
resource_scope: ["plugins/dev-graph/scripts/bd-bridge.py","plugins/harness-creator/skills/run-skill-live-trial/scripts/live-trial-verdict.py"]
purpose: "共有 script 1 行の変更に 4 skill 分の live-trial 再実走 (約 1 時間) が付く構造を解消し、共有 script へ触れない逆インセンティブを取り除く"
goal: "同一 plugin 内の共有 script を複数 skill が script_refs 宣言し 1 ファイル変更で live-trial 証跡が同時失効する"
mvp_alignment: null
scope_in: ["script_refs 経由の挙動閉包 digest が共有 script の変更で複数 skill を同時失効させる構造の分析と対策設計","差分の性質による再実走要否の切り分けが fail-closed に成立するかの検討"]
scope_out: ["plugin hooks 経由の連鎖失効 (issue-live-trial-verdict-staleness-hook-closure-20260726 の担当)","cross-plugin の entry_points 過剰包含 (HarnessHub-1wo3 の担当)","本課題の解消を待たずに現行の再実走運用を止めること"]
acceptance: ["共有 script の変更が被験 skill の挙動に到達するかを判定する規則が定義され、判定不能時は再実走要求へ倒す fail-closed 設計になっている","対策適用後、bd-bridge.py の無害な変更 (docstring 等) で 4 skill の live-trial 証跡が失効しないことを実測で確認する","hooks 経路 (r65n) と cross-plugin 経路 (1wo3) との責務境界が文書化され、3 経路が互いの対策を重複させない"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-shared-script-refs-closure-coupling-20260729.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-28T21:40:43Z","origin_kind":"generated","source_digest":null,"source_path":"docs/features/feat-dev-pipeline-improvement/mfh7-ii90-spec-reflection-receipt.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 1
classification_reason: "2026-07-28 HarnessHub-zep2 の対応中に、共有 script bd-bridge.py の変更で 4 skill の live-trial 証跡が同時失効する構造を実測。hooks 経路 (r65n) と cross-plugin 経路 (1wo3) とは対策が異なるため独立 issue と判断"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-shared-script-refs-closure-coupling-20260729.md","confidence":1}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-ntip","linked_at":"2026-07-28T21:43:40Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-28T21:40:43Z","missing_sections":[],"status":"complete"}
---

## 概要

dev-graph の C02 `run-dev-graph-node` / C03 `run-dev-graph-sync` / C14 `run-dev-graph-decompose` /
C15 `run-dev-graph-schedule` の 4 skill は、いずれも `script_refs` に共有スクリプト
`plugins/dev-graph/scripts/bd-bridge.py` を宣言している。live-trial の挙動閉包 digest
(`skill_dir_tree_sha`) は `script_refs` を含むため、この 1 ファイルを 1 行変更するだけで
4 skill 全ての live-trial 証跡が同時に無効化される。

## 実測 (HarnessHub-zep2 / PR#590)

2026-07-28、commit `0efff24` で 4 skill の live-trial を取り直し全て PASS になった直後、
同ブランチで並行作業していたセッションの commit `a0d9bbf` が `bd-bridge.py` を変更したため、
4 本の証跡が一斉に stale-sha へ戻った。復旧に 4 本の再実走を要した。

| skill | run-id | wall_clock |
|---|---|---|
| C02 node | `20260728T115514Z-zep2b-node` | 825s |
| C03 sync | `20260728T205448Z-zep2b-sync` | 585s |
| C14 decompose | `20260728T122040Z-zep2b-decompose` | 945s |
| C15 schedule | `20260728T122707Z-zep2b-schedule` | 600s |

合計 wall_clock 2955s (約 49 分)。待ち時間・証跡張り替え込みで実質 1 時間超。

## 同根の既存課題との差分 (別課題として起票する理由)

挙動閉包 digest の粒度が粗いという同じ根から、これで 3 経路目になる。ただし対策が異なる。

| 経路 | 課題 | 性質 | 対策の方向 |
|---|---|---|---|
| plugin hooks | `issue-live-trial-verdict-staleness-hook-closure-20260726` (HarnessHub-r65n) | hook 1 件の修正で dev-graph 8 skill が一斉 stale 化 | 閉包から hook を除外できるか |
| cross-plugin entry_points | HarnessHub-1wo3 | 依存 plugin の `entry_points` を丸ごと閉包に含めるため、使わない skill の編集でも連鎖 stale 化 | 閉包の**過剰包含**の是正 |
| 同一 plugin の script_refs | **本課題** | 4 skill が実際に使う共有 script なので、失効自体は正しい | 正しさではなく**コスト**の問題 |

本課題が前 2 者と決定的に違うのは、**閉包を絞っても解決しない**点である。4 skill は実際に
`bd-bridge.py` を使うので、その変更で挙動が変わりうるのは事実であり、再実走の要求自体は正しい。
問題は、共有 script 1 行の変更に約 1 時間の再実走が付くと、**共有 script へ触れないという
逆インセンティブ (変更抑止)** が働くことにある。

## 検討したい方向 (いずれも未検証・要設計)

1. **差分の性質による再実走要否の切り分け**
   被験 skill が実際に呼ぶ関数・CLI 表面に届く変更かどうかを判定し、無関係な内部変更
   (docstring / 未使用ヘルパ / コメント) は再実走を免除する。
   ただし判定を誤ると証跡の意味が失われるため、判定不能時は再実走要求へ倒す fail-closed
   設計が必須。「呼ばれていないから安全」の判定は動的呼び出しで簡単に破れる。

2. **共有 script の分解**
   薄い facade と skill 別 module へ分け、`script_refs` の粒度を細かくする。
   ただし bd mutation の単一チョークポイント制約 (`guard-graph-schema.py` が機械強制。
   `bd create` 直叩きは BLOCK される) と衝突しうるため、facade の責務設計が要る。

3. **再実走の並列度向上**
   現状は逐次実行が前提。コスト削減であって構造の解消ではないが、対策 1・2 が
   設計上難しいと判明した場合の次善策になる。

## 参照

- `docs/features/feat-dev-pipeline-improvement/mfh7-ii90-spec-reflection-receipt.md` §7.6 / §7.7
- HarnessHub-zep2 — 本課題が顕在化した CI 失敗の対応記録
- HarnessHub-1wo3 — cross-plugin 側の連鎖失効 (閉包定義の過剰包含)
- `issue-live-trial-verdict-staleness-hook-closure-20260726` — hooks 側の連鎖失効
