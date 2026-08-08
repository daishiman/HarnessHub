# 目的

scenario C01-OUT1-positive-idempotence-r17 の live trial で、init 済み fixture repository の graph store に実ノードを 1 件保持し、C11 (validate-graph-schema.py) を「ノードが 0 件でない状態」で通せるようにする。

## 対象読者

dev-graph harness の維持担当者、および C01 run-dev-graph-init の冪等性を再検査する評価者。

## 要約

第 1 パスの init が 6 content root と repo-local state を作成した後、C02 (run-dev-graph-node) がこの document ノードを `upsert-node.py` 単一 writer で登録した。第 2 パスの init はこのノードと利用者編集済み template の双方を保持し、planned changes を 0 件で終える。

## 本文

登録経路は次のとおり。

1. C24 `resolve-repo-context.py --mode write` が caller repository を解決し、`repository_id` を `local:sha256:d47b8566…0302a` に確定した。
2. C01 init が `issues/ tasks/ specs/ architecture/ features/ docs/` と `.dev-graph/{config.json,state,cache,locks,templates}` を生成した。config は `build-repo-config.py`、初期 graph store は `build-graph-store.py` という正規 writer だけを経由している。
3. パス間で `.dev-graph/templates/document.md` を利用者編集し、その sha256 を記録した。
4. 本ノードを `upsert-node.py` の dry-run → apply で登録し、graph store のノード件数を 1 件にした。
5. 第 2 パスの init は既存 config/graph/template をすべて保持し、planned changes 0 件で終了する。

## 決定事項

- 本ノードは tracker binding を持たない (`tracker_binding: none`) ため、GitHub/Beads への投影は行わず `github_publication.mode=local_only` とする。
- 本ノードは live trial の証跡であり、fixture repository の外へは公開しない。

## 運用・更新方法

- 更新契機: scenario C01-OUT1-positive-idempotence-r17 の再実行時。
- 更新責任者: dev-graph harness の維持担当者。
- 鮮度確認: 各 live trial run で fixture repository ごと再生成されるため、run 単位で使い捨てる。

## 関連資料

- `eval-log/run-dev-graph-init-receipt-pass1.json` (init 第 1 パスの receipt)
- `eval-log/run-dev-graph-init-goal-spec.json` (goal-seek 正本)

## 変更履歴

| Date | Change | Author |
|---|---|---|
| 2026-08-08 | live trial C01-OUT1-positive-idempotence-r17 の seed ノードとして新規作成 | dev-graph harness |
