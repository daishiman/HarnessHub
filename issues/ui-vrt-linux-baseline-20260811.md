---
graph_node_id: "issue-ui-vrt-linux-baseline-20260811"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["vrt","ui-consistency","testing"]
priority: "medium"
start_date: "2026-08-11"
target_date: null
iteration: null
title: "VRT の Linux 版 baseline を更新する"
owners: ["daishiman"]
created_at: "2026-08-11T00:00:00Z"
updated_at: "2026-08-11T10:45:30Z"
status: "active"
depends_on: []
related_nodes: ["issue-ui-vrt-navigation-baseline-drift-20260810"]
resource_scope: ["apps/hub/tests/browser/__vrt__","apps/hub/tests/browser/vrt.ts",".github/workflows/ui-visual.yml"]
purpose: "darwin 側だけ更新した baseline を、Linux 側でも揃える。"
goal: "Linux 上で VRT を実行し、承認済み baseline を差し替える。"
scope_in: ["catalog-{data,feedback,form,layout,navigation}-{light,dark} の 10 枚","Linux 上での VRT 実行"]
scope_out: ["VRT 閾値の緩和","原因確認なしの baseline 更新"]
acceptance: ["Linux baseline が darwin と同じ意図の画面で更新される","Linux 上で browser test が全 PASS する"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/ui-vrt-linux-baseline-20260811.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"0e62ce0731ba94dd34512edd90fba0b014e6db2804012adddb4b56cccb60cec5","evaluator":"2026-08-11 の全28画面 UI 統一作業で実測した残課題","evidence_ref":"docs/product/backlog.md"}
source_lineage: {"imported_at":"2026-08-11T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"docs/product/backlog.md","source_plugin":null,"source_version":null}
classification_confidence: 0.98
classification_reason: "UI 統一作業で残した未着手項目であり、実装単位の不具合・改善課題に該当する。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/ui-vrt-linux-baseline-20260811.md","confidence":0.98}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-7mc6","linked_at":"2026-08-11T10:45:30Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-11T00:00:00Z","missing_sections":[],"status":"complete"}
---

# VRT の Linux 版 baseline を更新する

## 概要

UI 統一に伴う画面構造の変更で 10 枚の VRT baseline を更新したが、darwin 分のみ。

## 背景と問題

baseline は OS 別 (tests/browser/__vrt__/<platform>/) に持っており、Linux 版は Linux 上でしか作れない。ui-visual.yml は opt-in (workflow_dispatch または PR label ui-visual) で必須チェックではないため、赤いまま放置されうる。

## 現在の挙動

darwin では 33/33 PASS。Linux baseline は旧構造のまま。

## 期待する挙動

Linux 上で VRT を回し、承認済み baseline を差し替える。

## 再現手順またはユースケース

ui-visual ワークフローを手動実行すると寸法不一致で失敗する。

## 影響と優先度

必須チェックではないため medium。ただし放置すると視覚回帰の検出力が失われる。

## スコープ

baseline の差し替えのみ。閾値は変えない。

## 関連グラフ

issue-ui-vrt-navigation-baseline-drift-20260810 と同じ baseline 契約に従う。

## 受入条件

上記 acceptance のとおり。

## 更新経路の整備 (2026-08-12)

**この課題が止まっていた原因は「Linux 機が無い」ではなく「Linux 上で baseline を作り直す経路が無かった」ことだった。** `ui-visual.yml` は `ubuntu-latest` で走るが `pnpm test:browser` を検証モードで叩くだけで、`VRT_UPDATE=1` へ入る手段も、撮り直した画像を持ち帰る手段も無かった。

`.github/workflows/ui-visual.yml` へ次を追加した。

- `workflow_dispatch` の入力 `update_baseline` (既定 false)。true のとき `VRT_UPDATE=1` を渡す。
- ブラウザ工程が途中で失敗しても `always()` で、`git diff` から作る変更画像 manifest と `apps/hub/tests/browser/__vrt__/linux/` を artifact `vrt-baseline-linux` として回収する (`if-no-files-found: error`。無言で空を返さない)。
- **更新モードの run は最後に必ず失敗させる。** 更新モードは比較を 1 件も行っていないため、成功で終えると「未検査」が「差分なし」と同じ見た目になる。`apps/hub/tests/browser/vrt.ts` が基準画像の欠落に対して定めているのと同じ原則を CI 側にも通した。

`inputs.update_baseline` は `workflow_dispatch` でのみ定義されるため、`pull_request` 由来の run では null となり、`ui-visual` label 経由で更新モードへ入る経路は存在しない。

### 残手順

1. `ui-visual` を `update_baseline=true` で dispatch する (要 push 権限)。
2. artifact `vrt-baseline-linux` を取得し、同梱の `baseline-update-manifest.txt` に列挙された変更画像を**全枚**目視確認する。期待値は scope_in の `catalog-{data,feedback,form,layout,navigation}-{light,dark}` 10 枚である。
3. manifest が 10 枚でない場合は、「必要画像の更新漏れ」か「スコープ外画像の変更」として原因を調査する。枚数を合わせるために画像を便宜的に追加・除外しない。
4. manifest に列挙された承認済み Linux 画像を `apps/hub/tests/browser/__vrt__/linux/` へ取り込む (`darwin/` は触らない)。
5. `update_baseline` なしで再 dispatch し、比較モードが**全件 PASS**することを確認する。

## 検証証跡

docs/product/backlog.md (2026-08-11 時点) の優先度低/記録 #12。

2026-08-12: `ui-visual.yml` を PyYAML で構文検証し、`workflow_dispatch.inputs` が `update_baseline` の 1 件、manifest 作成・artifact 回収・最終 invalid marker の 3 step がいずれも `always() && inputs.update_baseline` で条件づけられていることを確認した。同じ契約は `browser-harness-optin.test.ts` で回帰検査する。`scripts/lint-ci-local-check-parity.py` は ok (CI blocking=42 / local hard=39 / allowlist=6) で、本変更は parity 対象の repo-root Python 検査を増やしていない。
