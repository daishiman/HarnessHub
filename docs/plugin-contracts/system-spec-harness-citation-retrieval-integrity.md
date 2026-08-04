---
status: recorded
layer: plugin-contract-record
task: HarnessHub-p1ql
beads: HarnessHub-p1ql
dev_graph_node: issue-source-citation-retrieval-integrity-20260803
judged_at: 2026-08-04T00:42:00Z
reviewer: Codex final review
---

# Citation 取得証跡・時刻実在性 — 仕様反映判定の受領書

対象変更: `plugins/system-spec-harness` の C13 citation validation を、自己申告の URL と時刻だけで通さず、実際に保存された取得証跡へ束縛するよう強化する。最終レビューで判明した既存 20 record の移行漏れも併せて是正する。

## 判定結論

**spec-impact: reflected。** C13 の実装自体は HarnessHub 製品の振る舞いを変えないが、最終レビューで `system-spec/fetched-references.json` の全 20 record が新しい必須証跡を持たず、実データに C13 を掛けると失敗することを検出した。公式一次 URL を HTTP 200 で再取得し、各 record に `evidence_ref` とその SHA-256 を反映した。機械受領書は、この反映を含む commit の作成後に `scripts/build-spec-reflection-receipt.py --spec-impact reflected` で HEAD に束縛して記録する。

変更対象は HarnessHub 製品の振る舞いではなく、plugin が生成・検証する引用レジストリの完全性である。製品 API、DB schema、認証認可、画面、Cloudflare 配置、feature/task 要件は変更しない。正本は `plugins/system-spec-harness/` の schema、R2/R3/R4、C03、C08、runbook と、今回移行した `system-spec/fetched-references.json` / `system-spec/retrieval-evidence/` に置く。

## 変更した契約

| 項目 | 新しい必須条件 |
|---|---|
| 時刻 | `retrieved_at` と `latest_checked_at` は timezone 付き RFC3339 で、検証時刻より未来でない |
| 固定値検出 | 複数 record の `retrieved_at` が完全一致する場合は失敗 |
| 取得証跡 | record ごとに repo 相対 `evidence_ref` と小文字 SHA-256 `evidence_sha256` を持つ |
| 突合 | validator が path traversal と repo 外参照を拒否し、実ファイルの digest と比較する |
| 実行 | citation を検証する CLI は `--repo-root` を必須にし、証跡を実ファイルに対して検査する |

R2-fetch は raw snapshot と要約を `system-spec/retrieval-evidence/<target_id>.json` に保存し、R3-record は算出済み digest を引用する。今回、20 record すべてをこの形式に移行した。`retrieved_at` は実際の証跡取得時刻に更新した一方、`latest_checked_at`・version・summary は意味的鮮度 (C08) の別判定を混同しないため変更していない。

## task 仕様書ゲートの判定

`HarnessHub-p1ql` は `feature_package_id: null` の単独 `issue` node で、13 本の task 仕様書を生成・promote する feature package ではない。そのため `validate-system-plan.py` の exact-13 task-spec ゲートは **対象外**である。代替として issue artifact の graph schema、配置、行数ゲート、および C13 の回帰テストを実行する。この区別により、無関係な製品 task 仕様書を形式的に書き換えない。

## 仕様領域への影響確認

| 領域 | 判定 | 理由 |
|---|---|---|
| `system-spec/` | 反映 | `fetched-references.json` の 20 record と `retrieval-evidence/` 20 件を C13 の実ファイル digest に束縛。製品状態遷移・構成・Q&A は不変 |
| `specs/` | 反映なし | 公開 API・データ契約は不変 |
| `architecture/` | 反映なし | サービス構成・境界・配置は不変 |
| `features/` | 反映なし | 製品機能の受入条件は不変 |
| `tasks/` | 反映なし | 本件は単独 bug 修正で feature package を持たない |
| `docs/` | 記録 | 本受領書で移行内容、判定理由、残る C08 境界を記録 |

## 検証

- `python3 -m pytest -q plugins/system-spec-harness`
- `python3 plugins/system-spec-harness/scripts/validate-source-citation.py --targets <system-spec/spec-state.json 由来の 20 target> --references system-spec/fetched-references.json --state system-spec/spec-state.json --repo-root .`（C13 実データ）
- `validate-graph-schema.py`、`lint-artifact-placement.py`、`lint-doc-line-limit.py`、`git diff --check`

## 残課題

実際の WebFetch 実行を doc-fetch 完了条件として強制し、`_records.json` の事後編集を防ぐ変更は **HarnessHub-eiky** が所有する。本件は C13 が捏造結果を通さないようにする検証層までを担当する。さらに既存の `system-spec/completeness-report.json` が記録する C08 の意味的鮮度（pnpm / wrangler / Playwright などの version 再照合）は別の follow-up であり、本移行で古い version を現在値と偽って更新しない。
