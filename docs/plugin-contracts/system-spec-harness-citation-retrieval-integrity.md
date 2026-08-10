---
status: recorded
layer: plugin-contract-record
task: HarnessHub-p1ql
beads: HarnessHub-p1ql
dev_graph_node: issue-source-citation-retrieval-integrity-20260803
judged_at: 2026-08-10T00:00:00Z
reviewer: Claude final review
---

# Citation 取得証跡・時刻実在性 — 仕様反映判定の受領書

対象変更: `plugins/system-spec-harness` の C13 citation validation を、自己申告の URL と時刻だけで通さず、実際に保存された取得証跡へ束縛するよう強化する。加えて、証跡の**置き場所**を守る配置 lint 側に残っていた無検査の穴を塞ぐ。

## 判定結論

**spec-impact: none（本 PR の残差分について）。** 本 node の当初スコープであった C13 validator 本体と `system-spec/fetched-references.json` への証跡反映は、PR #654 とその後続の再取得によって既に main へ着地している（`retrieval-evidence` は 23 件、取得経路は npm registry 直接照会、取得時刻は 2026-08-07）。したがって本 PR に残る差分は `scripts/lint-artifact-placement.py` の配置ゲート強化と本受領書のみであり、`system-spec/`・`specs/`・`architecture/`・`features/`・`tasks/` の内容は変更しない。機械受領書は、この commit の作成後に `scripts/build-spec-reflection-receipt.py --spec-impact none` で HEAD に束縛して記録する。

変更対象は HarnessHub 製品の振る舞いではなく、plugin が生成・検証する引用レジストリの完全性である。製品 API、DB schema、認証認可、画面、Cloudflare 配置、feature/task 要件は変更しない。正本は `plugins/system-spec-harness/` の schema、R2/R3/R4、C03、C08、runbook と、main へ着地済みの `system-spec/fetched-references.json` / `system-spec/retrieval-evidence/` に置く。

## 変更した契約

| 項目 | 新しい必須条件 |
|---|---|
| 時刻 | `retrieved_at` と `latest_checked_at` は timezone 付き RFC3339 で、検証時刻より未来でない |
| 固定値検出 | 複数 record の `retrieved_at` が完全一致する場合は失敗 |
| 取得証跡 | record ごとに repo 相対 `evidence_ref` と小文字 SHA-256 `evidence_sha256` を持つ |
| 突合 | validator が path traversal と repo 外参照を拒否し、実ファイルの digest と比較する |
| 実行 | citation を検証する CLI は `--repo-root` を必須にし、証跡を実ファイルに対して検査する |
| 配置 | `system-spec/retrieval-evidence/` 直下は平坦な `*.json` のみ。非 JSON とネストは配置 lint が拒否する |

R2-fetch は raw snapshot と要約を `system-spec/retrieval-evidence/<target_id>.json` に保存し、R3-record は算出済み digest を引用する。`retrieved_at` は実際の証跡取得時刻を持ち、`latest_checked_at`・version・summary は意味的鮮度 (C08) の別判定を混同しないため C13 とは独立に扱う。

## 本 PR で塞いだ穴 — allowlist の無検査通過

`scripts/lint-artifact-placement.py` は `system-spec/` 直下への雑多なファイル混入を遮断するが、`SYSTEM_SPEC_DIR_ALLOWLIST` に載ったサブディレクトリは**名前一致で `continue` するだけで中身を一切検査していなかった**。

これは単なる厳しさ不足ではなく、上表「配置」行の契約を実質無効化する。C13 は `evidence_ref` の指す先を `system-spec/retrieval-evidence/<target_id>.json` という唯一の正規配置として宣言しているが、lint が中身を見ないため次が素通りする。

- 非 JSON ファイル（`.txt` / `.md` / バイナリ）の混入
- ネストしたサブディレクトリの作成

結果として証跡ディレクトリが任意ファイルの避難所になり、「配置規約は lint が守っている」という前提だけが緑のまま残る（ゲートと実質の乖離）。

是正は、allowlist の意味を「そのディレクトリの**存在**を許す」に限定し、直下は平坦な `*.json` のみを許可する形に一般化した。特定のディレクトリ名を決め打ちせず allowlist 全体へ適用しているため、将来 allowlist に項目が増えても同じ検査が自動で効く。非 JSON・ネスト・是正後クリーンの 3 点は `--self-test` の回帰テストで固定した。

## task 仕様書ゲートの判定

`HarnessHub-p1ql` は `feature_package_id: null` の単独 `issue` node で、13 本の task 仕様書を生成・promote する feature package ではない。そのため `validate-system-plan.py` の exact-13 task-spec ゲートは **対象外**である。代替として issue artifact の graph schema、配置、行数ゲート、および C13 の回帰テストを実行する。この区別により、無関係な製品 task 仕様書を形式的に書き換えない。

## 仕様領域への影響確認

| 領域 | 判定 | 理由 |
|---|---|---|
| `system-spec/` | 反映なし | 証跡の反映は main へ着地済み。本 PR は配置ゲートのみ変更し、内容は不変 |
| `specs/` | 反映なし | 公開 API・データ契約は不変 |
| `architecture/` | 反映なし | サービス構成・境界・配置は不変 |
| `features/` | 反映なし | 製品機能の受入条件は不変 |
| `tasks/` | 反映なし | 本件は単独 bug 修正で feature package を持たない |
| `docs/` | 記録 | 本受領書で allowlist の穴、是正方針、main との統合判断を記録 |

## main との意味的コンフリクトの解消方針

本 branch が滞留する間に、main 側は後続 PR で同じ問題をより新しい取得経路で解決していた。両者は同一ファイルを触るためテキスト上は衝突するが、実体は**どちらの解が新しいか**という意味の衝突である。採用方針は以下。

| 対象 | 採用 | 理由 |
|---|---|---|
| `system-spec/retrieval-evidence/*.json` | main | 2026-08-07 の npm registry 直接照会が 2026-08-04 の HTML 取得を置換済み |
| `system-spec/fetched-references.json` | main | reference が 20 → 23 件に増え、summary も再照合結果へ更新済み |
| `issues/`・`.dev-graph/state/graph.json` | main | graph が authority。branch 側の古い projection は破棄 |
| `scripts/lint-artifact-placement.py` | 統合 | main の拡張可能な allowlist 構造 + branch の中身検査。両側にしかない価値を保存 |

## 検証

- `python3 scripts/lint-artifact-placement.py --self-test`（非 JSON・ネスト・是正後クリーンの回帰）
- `python3 scripts/lint-artifact-placement.py`（実リポジトリ）
- `python3 -m pytest -q plugins/system-spec-harness`
- `validate-graph-schema.py`、`lint-doc-line-limit.py`、`git diff --check`

## 残課題

実際の WebFetch 実行を doc-fetch 完了条件として強制し、`_records.json` の事後編集を防ぐ変更は **HarnessHub-eiky** が所有する。本件は C13 が捏造結果を通さないようにする検証層までを担当する。さらに既存の `system-spec/completeness-report.json` が記録する C08 の意味的鮮度（pnpm / wrangler / Playwright などの version 再照合）は別の follow-up であり、本 PR では触れない。
