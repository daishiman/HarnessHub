---
graph_node_id: "issue-live-trial-reap-unscoped-kill-20260728"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","beads","live-trial","tmux","parallel-safety"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "live-trial-backend.py reap() が並行 trial の tmux session を無条件全 kill する"
owners: ["daishiman"]
created_at: "2026-07-28T00:10:24Z"
updated_at: "2026-07-29T05:12:39.314910Z"
status: "closed"
depends_on: []
related_nodes: ["issue-bd-external-ref-orphan-nodes-20260725","issue-orphan-external-ref-backlog-disposition-20260726"]
resource_scope: []
purpose: "並行 live-trial の後片付けが別実行の tmux session を巻き添えにしないよう、run-id と起動元 PID による所有権境界を実装して固定する"
goal: "live-trial-backend.py reap() が並行 trial の tmux session を無条件全 kill する"
mvp_alignment: null
scope_in: ["live-trial session に run-id と owner PID を記録する","reap を同一 run-id かつ同一 owner PID の session に限定する","全 live-trial session の削除は明示的な --all 操作だけに限定する","並行 session を保護する回帰テストと運用文書を整備する"]
scope_out: ["tmux 以外の実行 backend の追加","古い metadata 無し session の自動削除","明示的な管理者操作 --all の廃止"]
acceptance: ["引数なし reap は失敗し、暗黙の lt-* 全削除へ戻らない","通常の reap は run-id と owner PID が両方一致する session だけを削除する","同じ run-id の別 owner、別 run-id、metadata 無し session は残る","全削除は明示的な --all でのみ実行できる","回帰テスト、内容レビュー、task 仕様書品質ゲートが通る"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-live-trial-reap-unscoped-kill-20260728.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-28T00:42:38.774Z","origin_kind":"generated","source_digest":"bcf375bb2280a15e319ce73c012f65c059bb00a50cb8689ddf4ecbaede605859","source_path":"issues/sys-orphan-external-ref-backlog-disposition-20260726.md#HarnessHub-cjwm","source_plugin":"dev-graph","source_version":null}
classification_confidence: 1
classification_reason: "Beads HarnessHub-cjwm と重複 HarnessHub-0vs2 が報告した無差別 reap を実装対象として再確認し、run-id と owner PID の双方を必須にする所有権境界で解決した"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-live-trial-reap-unscoped-kill-20260728.md","confidence":1}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-cjwm","linked_at":"2026-07-28T00:42:38.774Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-29T01:39:45Z","evidence_refs":["tests/test_live_trial_backend.py","tests/test_live_trial_boot_send.py","eval-log/harness-creator/run-skill-live-trial/content-review/elegance-verdict.json","eval-log/harness-creator/run-skill-live-trial/content-review/rubric-verdict.json"],"policy":"manual","reconciled_at":"2026-07-29T01:39:45Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-07-28T00:42:38.774Z","missing_sections":[],"status":"complete"}
---

# 概要

並行実行中の live-trial を、別 trial の後片付けが巻き添えで終了させる不具合を修正した。
通常の `reap` は session 名だけで判断せず、起動時に記録した run-id と owner PID
（起動元プロセス番号）の両方が一致した session だけを削除する。

## 背景と問題

旧 `live-trial-backend.py` の `reap(prefix="lt-")` は、`lt-` から始まる tmux session を
所有者や実行単位を確認せず全件削除していた。複数の live-trial を並行実行すると、
先に完了した trial の後片付けが、まだ動作中の別 trial を外部から kill できた。

この問題は Beads `HarnessHub-cjwm` で管理し、同内容の `HarnessHub-0vs2` も重複課題として
同時に解決した。

## 実装した境界

1. `new-session` は安全な run-id を必須にし、tmux user option へ
   `@lt_run_id` と `@lt_owner_pid` を記録する。
2. 通常の `reap` は run-id と owner PID を必須にする。
3. session 名の prefix、記録済み run-id、記録済み owner PID の三つが一致した場合だけ削除する。
4. 全 live-trial session の削除は、明示的な管理者操作 `reap --all` だけに限定する。
5. metadata が無い古い session は通常の `reap` では削除しない。

## 中学生向けの説明

学校のロッカーに例えると、以前は「同じ色のロッカーを全部片付ける」仕組みでした。
そのため、別の人がまだ使っているロッカーまで空にしてしまいました。
今は「今回の活動番号」と「片付ける人の番号」が両方合うロッカーだけを片付けます。
全部片付ける操作は、はっきり `--all` と指定したときだけです。

## 受入条件

- [x] 引数なし `reap` は失敗し、暗黙の全削除を行わない。
- [x] run-id と owner PID が両方一致する session だけを削除する。
- [x] 別 owner、別 run、metadata 無しの session を保護する。
- [x] `--all` を明示した場合だけ全 live-trial session を削除できる。
- [x] fake tmux と実 tmux の回帰テストで並行 session の分離を確認する。

## 検証証跡

- `python3 -m pytest tests/test_live_trial_*.py -q`: 84 passed
- `python3 plugins/harness-creator/skills/run-skill-live-trial/scripts/live-trial-backend.py --self-test`: OK
- `python3 plugins/harness-creator/skills/run-skill-live-trial/scripts/live-trial-boot.py --self-test`: OK
- 内容レビュー:
  `eval-log/harness-creator/run-skill-live-trial/content-review/`

最終的な全品質ゲートと仕様反映は、main 統合後の仕様反映受領書に記録する。
