---
graph_node_id: "issue-source-citation-version-evidence-consistency-20260817"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["system-spec-harness","citation","fail-closed","evidence"]
priority: "high"
start_date: "2026-08-17"
target_date: null
iteration: null
title: "validate-source-citation.py が version と取得証跡本文の整合を検査しない"
owners: ["daishiman"]
created_at: "2026-08-17T00:00:00.000000Z"
updated_at: "2026-08-17T00:00:00.000000Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/system-spec-harness/scripts/validate-source-citation.py"]
purpose: "証跡ファイルの digest 束縛はあるが、record の version がその証跡から来ていることを誰も検査していないため、値だけ差し替えた捏造が緑で通る"
goal: "version/last_updated が取得証跡本文と矛盾する記録を決定論ゲートが fail-closed で落とす状態"
scope_in: ["validate-source-citation.py への値と証跡本文の整合検査","表記ゆれの正規化規則と回帰テスト"]
scope_out: ["doc-fetch skill 本体の取得方式変更","coverage-matrix 側の検査"]
acceptance: ["version が証跡本文と矛盾する fixture で exit 非 0","既存実データが全件通る (偽陽性 0)"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/source-citation-version-evidence-consistency-20260817.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"745a6e9de9dd63fff48e8b76ba4f7e325f03d256873f02aef5e3e6e924a75f49","evaluator":"2026-08-17 最小 fixture で exit 0 を実測 (version=3.46.0 と証跡本文 3.53.4 の矛盾が通過)","evidence_ref":"plugins/system-spec-harness/scripts/validate-source-citation.py"}
source_lineage: {"imported_at":"2026-08-17T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "決定論ゲートの検査軸不足であり、修正対象は validator script 単体"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/source-citation-version-evidence-consistency-20260817.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-pepx","linked_at":"2026-08-17T14:21:48Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-17T00:00:00Z","missing_sections":[],"status":"complete"}
---

## 症状

`validate-source-citation.py` は `evidence_ref` の実在と SHA-256 を突合するが、record の `version` / `last_updated` がその証跡本文と整合するかを検査しない。このため「証跡は実取得の本物・値だけモデル記憶由来 (または事後 Edit)」という組み合わせが exit 0 で通過する。

HarnessHub-p1ql で塞いだのは (1) 未来日時 (2) 全 record 同一定数 (3) 証跡ファイルの実在+digest の 3 つ。証跡は「取得した事実」を束縛するが、「記録した値がその取得結果から来ていること」は束縛していない。束縛の強さはあるが範囲が足りない。

## 実測 (再現手順つき)

証跡本文が `SQLite version 3.53.4` と言っているのに record の `version` を `3.46.0` (HarnessHub-eiky の r2 で実際に記録されたモデル記憶由来の旧版) にした最小 fixture を作り、

    python3 plugins/system-spec-harness/scripts/validate-source-citation.py --targets targets.json --references refs.json --repo-root .

結果: `OK: 出典記録が全件対応・必須フィールド・公式 host・時刻・取得証跡の一致を満たす` / exit 0。

evidence_sha256 は正しいまま (証跡ファイルは触っていない) なので digest 突合では検出できない。HarnessHub-eiky の r2 で起きた「別 agent の実 fetch 結果を見て _records.json の version だけを事後 Edit (3.46.0 to 3.53.4 / 0.115.0 to 0.141.1)」は、証跡が付いた現在の形でも同じく緑になる。

## 原因

証跡検査が evidence_path.is_file() と sha256 一致で完結しており、証跡の中身と record の値を突き合わせる軸が無い。

## 修正方針 (案)

1. `version` / `last_updated` が非 None のとき、その文字列が evidence 本文に出現することを要求する。最小の変更で今回の穴を塞げる。
2. 表記ゆれ (v3.53.4 / 3.53 / 3.53.4-1 など) で偽陽性が出うるため、正規化規則を決めて test で固定する。既存の実データ (system-spec/retrieval-evidence/*) が全件通ることを先に実測してから入れる。
3. 通せない実データがある場合は、fail ではなく warning surface から始めて ratchet で締める案も可。

## コスト上の注意 (未着手の理由)

`plugins/system-spec-harness/scripts/validate-source-citation.py` は `run-system-spec-compile` の SKILL.md 25 行目で宣言済み依存として参照されており、挙動閉包 digest に含まれる。1 文字でも変更すると live-trial 受領書が失効し、system-spec-harness 系 skill の live-trial 再実行が必要になる。HarnessHub-m0bd の作業記録では同種の再実行中に Claude の週次利用上限に到達した実績がある。着手時期は利用枠と合わせて判断すること。

## 関連

- HarnessHub-p1ql (closed): 未来日時・同一定数・証跡実在の 3 軸を実装。本件はその範囲外の残穴。
- HarnessHub-eiky: 捏造の元事象。本件が塞がるまで「gate が緑 = 実質履行」は依然として成り立たない。

## 受入条件

- [ ] version/last_updated が証跡本文と矛盾する fixture で exit 非 0 になる
- [ ] 既存の実データが全件通る (偽陽性 0) ことを実測で示す
- [ ] 表記ゆれの正規化規則を回帰テストで固定する
- [ ] 失効した live-trial 受領書を再実行で更新する
