---
graph_node_id: "task-github-issue-mirror-retirement-20260815"
artifact_kind: "task"
artifact_subtypes: []
project_id: "harness-hub"
domain: "operations"
tags: ["beads","github","tracker","mirror","cleanup"]
priority: "medium"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "GitHub issue ミラーの退役と repo プロファイル判定軸の是正"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00Z"
updated_at: "2026-08-15T00:00:00Z"
status: "active"
depends_on: []
related_nodes: ["feat-dev-pipeline-improvement","arch-harness-hub-dev-workflow","doc-mx65-spec-reflection-receipt-20260815"]
resource_scope: [".dev-graph/config.json","plugins/dev-graph/references/execution-tracker-contract.md","docs/beads-operations-runbook.md","architecture/harness-hub-dev-workflow.md","tasks/feat-dev-pipeline-improvement/github-issue-mirror-retirement.md"]
purpose: "beads から GitHub への push-only 投影が生んだ 490 件規模の open issue 乖離を収束させ、再発源である repo プロファイル判定軸の誤りを仕様側で是正する。"
goal: "GitHub の open issue が beads の未完了課題と CI 通知だけに一致し、投影が既定で走らない状態を設定と仕様の双方で固定する。"
scope_in: ["完了済み GitHub issue の close による収束","github_mirror の none 化","repo プロファイル判定軸の仕様反映","運用 runbook と決定記録の追記"]
scope_out: ["GitHub issue の物理削除","beads と GitHub の双方向同期の実装","CI 通知 workflow の変更","製品 runtime・API・DB・認証認可・UI の変更"]
acceptance: ["GitHub open issue が beads の open/in_progress と CI 通知のみに一致する","github_mirror=none により bd から GitHub への一括投影が既定で走らない","判定軸の是正が execution-tracker-contract §1 と運用 runbook に反映されている"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "tasks/feat-dev-pipeline-improvement/github-issue-mirror-retirement.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"5e1570921d07def4959dd917903bfaf06aa3f5e28cf25415c91ccc31aee1b507","evaluator":"final-review","evidence_ref":"docs/features/feat-dev-pipeline-improvement/mx65-github-issue-mirror-retirement-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.98
classification_reason: "製品 runtime を変えず、tracker 設定と開発運用契約の是正だけを行う単一 task として記録する。"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-dev-pipeline-improvement/github-issue-mirror-retirement.md","confidence":0.98}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-mx65","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"in_progress"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 目的

beads から GitHub への push-only 投影が生んだ 490 件規模の open issue 乖離を収束させ、再発源である repo プロファイル判定軸の誤りを仕様側で是正する。製品 runtime は変更しない。

## 背景

`.dev-graph/config.json` の `execution_tracker.beads.github_mirror` が `bd_github_push_only`（beads から GitHub へ一方向にだけ送る設定）のままだったため、beads 側で close した課題が GitHub 側へ伝わらず、GitHub の open issue が実態から乖離し続けていた。乖離は運用の怠慢ではなく、逆流路を持たない設定の構造的帰結であり、時間とともに単調増加する。

仕様側の根本原因は `execution-tracker-contract.md` §1 の repo プロファイル表にある。判定軸を private / public という公開範囲に置いていたため、public repository である本リポジトリは「GitHub Issues が最初から正本」へ誤誘導される。実態は owner と AI エージェントだけが起票するソロ開発であり、真の決定要因は公開範囲ではなく起票主体である。

## 入力と前提条件

- `bd` の `external_ref` が GitHub issue の URL を保持しており、タイトル推測ではなく厳密な 1 対 1 突合が可能であること。
- `gh` CLI が認証済みで、`gh-bridge.py` / `build-repo-config.py` の正規経路が利用可能であること。
- GitHub issue の close は guard hook により `gh-bridge.py --op issue-close` 経由に限定される。

## 出力と成果物

- `.dev-graph/config.json`: `execution_tracker.beads.github_mirror` = `none`
- `plugins/dev-graph/references/execution-tracker-contract.md` §1: 判定軸の是正
- `docs/beads-operations-runbook.md` §1.1: GitHub Issues の権威関係と正規経路
- `architecture/harness-hub-dev-workflow.md`: 決定記録
- 本 task 仕様書と仕様反映受領書

## 依存関係

先行 task なし。`feat-dev-pipeline-improvement` 配下の開発運用改善として位置づける。

## 実装対象

| 対象 | 変更 |
| --- | --- |
| `.dev-graph/config.json` | `github_mirror` を `bd_github_push_only` → `none` |
| `execution-tracker-contract.md` §1 | 判定軸を公開範囲から起票主体へ是正、public + ソロ開発の扱いを明記 |
| `docs/beads-operations-runbook.md` | §1.1 を新設し、権威関係・投影再開操作の禁止・close の正規経路を記載 |
| `architecture/harness-hub-dev-workflow.md` | 決定記録を追記 |
| GitHub issue 444 件 | `gh-bridge.py --op issue-close` で収束（物理削除はしない） |

## 実行手順

1. `bd` の `external_ref` で GitHub open issue を突合し、close 対象を機械的に確定する。
2. `gh-bridge.py --op issue-close` を 1 件ずつ実行する（冪等なので再実行可能）。
3. `build-repo-config.py` で `github_mirror=none` を書き込む（`.dev-graph/config.json` の唯一の sanctioned writer）。
4. 契約・runbook・architecture へ仕様反映する。
5. 突合を再実行して残存 open が想定集合と一致することを確認する。

## Write scope と競合制約

`resource_scope` に列挙した 5 path のみを書く。`.dev-graph/state/graph.json` は `upsert-node.py` が、`.dev-graph/config.json` は `build-repo-config.py` が唯一の writer であり、直接編集しない。製品 runtime（API・DB・認証認可・UI・Cloudflare deploy unit）には触れない。

## 受入条件

- GitHub open issue が beads の open / in_progress と CI 通知のみに一致する。
- `github_mirror=none` により bd から GitHub への一括投影が既定で走らない。
- 判定軸の是正が `execution-tracker-contract` §1 と運用 runbook に反映されている。

## 検証方法

- `external_ref` による突合で GitHub open の残数と内訳が想定と一致することを確認する。
- `build-repo-config.py` の write receipt が `valid: true` / `violations: []` であることを確認する。
- 設定変更の意味的差分が `github_mirror` の 1 件のみであることを、flatten した key 単位の比較で確認する。

## リスクとロールバック

- **リスク**: close した 444 件に生きた課題が混入する。→ `external_ref` による機械突合で判定し、曖昧な混在（bd 側に closed と open が併存）は安全側に倒して残した。
- **ロールバック**: close は `gh issue reopen` で戻せる。物理削除しないため不可逆な損失はない。`github_mirror` は `build-repo-config.py` で元値へ戻せる。

## GitHub publication

`mode=local_only`。本 task は beads 束縛であり、GitHub issue へは投影しない。本 task 自身が投影の退役を扱うため、投影すると自己矛盾になる。

## Handoff

残課題は次のとおり。

- `plugins/dev-graph/templates/repo-config.example.json` と `plugins/system-dev-planner/assets/default-project-config.json` の既定値は `bd_github_push_only` のままである。新規リポジトリの既定を `none` へ寄せるかは、テンプレート利用側への影響評価が要るため本 task の scope 外とする。
- 定期 reconcile を実装して push-only を安全に再開する選択肢は未着手。現時点では `none` で足りている。
- `execution-tracker-contract.md` の編集により `run-dev-graph-decompose` / `run-dev-graph-sync` の live-trial verdict が stale-sha となった件は解消済み。挙動面は変えていないが digest は意味を読まないため区別できず、fail-closed の正しい動作として抑止せず、両 skill を `run-skill-live-trial` で再実走した。新 verdict は `20260815T015641Z-mx65-c03`（sync）と `20260815T015744Z-mx65-c14`（decompose）で、いずれも overall=PASS。criteria receipt の `live_trial_verdict_ref` を新 run へ差し替え、`lint-live-trial-verdict.py --all` と `test_skill_criteria_evidence.py` の緑を確認した。
