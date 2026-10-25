---
graph_node_id: "issue-flyer-studio-elegant-review-findings-20261022"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["flyer-studio","elegant-review","quality-gate"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "flyer-studio の elegant-review で C1〜C4 が全て FAIL: 3cycle 上限・独立性・旧レビュー転記・様式の機械化・計画正本の古さを直す"
owners: ["daishiman"]
created_at: "2026-10-22T14:40:00Z"
updated_at: "2026-10-25T01:24:22.539556Z"
status: "draft"
depends_on: []
related_nodes: ["doc-flyer-studio-final-review-spec-reflection-20261025","task-flyer-studio-final-integration-20261025"]
resource_scope: ["plugins/flyer-studio/"]
purpose: "capability-review (dry-run) の結果、品質ゲートの穴 (cycle 上限がコード未強制、旧レビュー転記で通過、独立性が名前の自己申告のみ) と、依頼の中心である多様な様式 (漫画・墨絵・文字主体) が schema・rubric・fixture に落ちていないことが分かった"
goal: "/skill-improve で eval-log/flyer-studio/_plugin/elegant-review/run-20261022-232500/review-plugin.md の論点 A〜J が反映され、再度の capability-review で C1〜C4 が PASS になっている状態"
scope_in: ["review-plugin.md の論点 A〜J"]
scope_out: ["実案件の証拠更新 (HarnessHub-f0ps)","利用者の明示依頼が無い commit / push"]
acceptance: ["様式の語彙が design-contract の enum を正本にし、写真以外 (漫画・墨絵・文字主体) の brief fixture が visual-review まで通る","cycle 番号が記録され、上限超過で INCOMPLETE を返すことをテストで固定","reviewedAt が render.createdAt より後であること、および前版と同一の観察文を拒否することをテストで固定","workflow.md・run-create-flyer manifest・composition outputs に pilot 工程が載る","component-inventory が現物 (4 agent・pilot・DD11/12) と一致するか、将来目標と明示されている","再 capability-review で C1〜C4 PASS"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/flyer-studio-elegant-review-findings-20261022.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-10-22T14:40:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "capability-review の FAIL を改善へつなぐための追跡。改善は /skill-improve で行う"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/flyer-studio-elegant-review-findings-20261022.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-cgix","linked_at":"2026-10-25T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-10-23T01:37:53Z","evidence_refs":["docs/features/feat-dev-pipeline-improvement/flyer-studio-final-review-spec-reflection-receipt.md"],"policy":"manual","reconciled_at":"2026-10-25T00:00:00Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-10-22T14:40:00Z","missing_sections":[],"status":"complete"}
---

# 概要

flyer-studio の capability-review (run-elegant-review dry-run、scope_mode=plugin) で C1〜C4 が全て FAIL した。品質ゲートの穴と、多様な様式の機械化不足を /skill-improve で直す。

## 背景と問題

PKG 検査 (r4) は 14 pass + PKG-015 not_applicable で契約適合は満たした。しかし設計 elegance の検査では、品質を守るはずのゲートの一部が文書だけ、または自己申告だけで成立していることが分かった。依頼の中心である「写真・漫画調・墨絵など様々な表現」も、文章規範には書けているが schema・rubric・fixture に落ちていない。

## 現在の挙動

- 「最大3cycle」をコードが数えていない (SS-1, LS-7)
- 旧レビューの観察文を転記し、fingerprint と pngSha256 だけ更新すれば通る (SS-2)
- 独立性が designer と reviewer の名前文字列の比較だけ。専門3レンズは同一 reviewer の記入ラベル (MD-5, SS-3)
- expression と stylePreferences は自由文字列。写真以外の通し fixture が無い。権利知見が DD07 と DD11 に分裂 (MD-1〜4)
- workflow.md・manifest・composition outputs に pilot 工程が無い。pilot-review の鮮度は finalize で再検証しない (LS-4, SS-6)
- analysisRequired=false で analysis ゲートを素通りできる (SS-5)
- component-inventory が現物より古い (LS-1, LS-2, SS-8)

## 期待する挙動

review-plugin.md の論点 A〜J が反映され、再 capability-review で C1〜C4 が PASS になる。

## 再現手順またはユースケース

1. `/capability-review plugins/flyer-studio plugin` を実行する
2. eval-log/flyer-studio/_plugin/elegant-review/<run>/verdict.json を読む

## 影響と優先度

high。品質と精度が最優先の制作ハーネスで、独立評価と反復上限が形だけになっている。

## スコープ

対象は論点 A〜J。対象外は実案件の証拠更新 (HarnessHub-f0ps) と、明示依頼の無い commit / push。

## 関連グラフ

関連する課題は HarnessHub-f0ps (実案件の証拠更新) と HarnessHub-dtr8 (eh99 待ち)。

## 受入条件

ノードの acceptance を参照。

## 検証証跡

eval-log/flyer-studio/_plugin/elegant-review/run-20261022-232500/ (findings.json, verdict.json, review-plugin.md, findings-phase2-*.json)


## 2026-10-25 最終統合注記

上記は起票時の問題記録を保存したもの。Beads cgix の close は 2026-10-23 Codex run の完了根拠に対応する。後続 Claude restart は 23種使用・7種省略で正式判定 incomplete のまま、r06 の限定差分検証では追加 blocking なし。最新treeの全30種PASSは主張しない。現在の範囲・検証は最終統合受領書を参照。
