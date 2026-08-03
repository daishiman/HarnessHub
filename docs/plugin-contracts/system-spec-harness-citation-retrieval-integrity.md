---
status: recorded
layer: plugin-contract-record
task: HarnessHub-p1ql
beads: HarnessHub-p1ql
dev_graph_node: issue-source-citation-retrieval-integrity-20260803
judged_at: 2026-08-03T08:45:00Z
reviewer: daishiman
---

# Citation 取得証跡・時刻実在性 — 仕様反映判定の受領書

対象変更: `plugins/system-spec-harness` の C13 citation validation を、自己申告の URL と時刻だけで通さず、実際に保存された取得証跡へ束縛するよう強化する。

## 判定結論

**spec-impact: none。** `system-spec/`、`specs/`、`architecture/`、`features/`、`tasks/` への反映は不要と判定した。機械受領書は、対象 commit を作成後に `scripts/build-spec-reflection-receipt.py --spec-impact none` で HEAD に束縛して記録する。

変更対象は HarnessHub 製品の振る舞いではなく、plugin が生成する `fetched-references.json` と C13 validator の内部契約である。製品 API、DB schema、認証認可、画面、Cloudflare 配置、feature/task 要件は変更しない。正本は `plugins/system-spec-harness/` の schema、R2/R3/R4、C03、C08、runbook に置く。

## 変更した契約

| 項目 | 新しい必須条件 |
|---|---|
| 時刻 | `retrieved_at` と `latest_checked_at` は timezone 付き RFC3339 で、検証時刻より未来でない |
| 固定値検出 | 複数 record の `retrieved_at` が完全一致する場合は失敗 |
| 取得証跡 | record ごとに repo 相対 `evidence_ref` と小文字 SHA-256 `evidence_sha256` を持つ |
| 突合 | validator が path traversal と repo 外参照を拒否し、実ファイルの digest と比較する |
| 実行 | citation を検証する CLI は `--repo-root` を必須にし、証跡を実ファイルに対して検査する |

R2-fetch は raw snapshot と要約を `system-spec/retrieval-evidence/<target_id>.json` に保存し、R3-record は算出済み digest を引用する。C03 compile と C08 freshness audit、schema、fixture、runbook をこの契約へ同期した。

## task 仕様書ゲートの判定

`HarnessHub-p1ql` は `feature_package_id: null` の単独 `issue` node で、13 本の task 仕様書を生成・promote する feature package ではない。そのため `validate-system-plan.py` の exact-13 task-spec ゲートは **対象外**である。代替として issue artifact の graph schema、配置、行数ゲート、および C13 の回帰テストを実行する。この区別により、無関係な製品 task 仕様書を形式的に書き換えない。

## 仕様領域への影響確認

| 領域 | 判定 | 理由 |
|---|---|---|
| `system-spec/` | 反映なし | 製品仕様の状態遷移・構成・Q&A は不変 |
| `specs/` | 反映なし | 公開 API・データ契約は不変 |
| `architecture/` | 反映なし | サービス構成・境界・配置は不変 |
| `features/` | 反映なし | 製品機能の受入条件は不変 |
| `tasks/` | 反映なし | 本件は単独 bug 修正で feature package を持たない |
| `docs/` | 記録 | 本受領書で plugin 契約と no-impact 判定を記録 |

## 検証

- `python3 -m pytest -q plugins/system-spec-harness`
- `python3 plugins/system-spec-harness/scripts/validate-source-citation.py --targets <targets> --references <references> --repo-root <repo-root>`
- `validate-graph-schema.py`、`lint-artifact-placement.py`、`lint-doc-line-limit.py`、`git diff --check`

## 残課題

実際の WebFetch 実行を doc-fetch 完了条件として強制し、`_records.json` の事後編集を防ぐ変更は **HarnessHub-eiky** が所有する。本件は C13 が捏造結果を通さないようにする検証層までを担当する。
