---
status: recorded
layer: feature-spec-reflection
feature_id: feat-dev-pipeline-improvement
graph_node_id: issue-doc-line-limit-followup-mfh7-20260728
beads_id: HarnessHub-w7n7
updated: 2026-08-01
spec_impact: reflected
---

# Beads bridge / mfh7 文書分割 — 仕様反映受領書

## 1. 目的と背景

`HarnessHub-w7n7` は、Beads 操作の単一入口 `bd-bridge.py` と、親課題 mfh7 の
棚卸し記録が 500 行を超えたため、挙動と証拠を失わずに責務分割するタスクである。
目的は機能追加ではなく、変更理由と検証範囲をファイル単位で読み取れる状態へ戻すことにある。

## 2. 対象

| 項目 | 値 |
|---|---|
| 主 Beads | `HarnessHub-w7n7` |
| 関連 Beads | `HarnessHub-mfh7`, `HarnessHub-l1ru` |
| dev-graph node | `issue-doc-line-limit-followup-mfh7-20260728` |
| branch | `devgraph/issue-doc-line-limit-followup-mfh7-20260728` |
| base | `main` |
| task type | implementation / NON_VISUAL |
| deploy unit | repository development tooling |

`HarnessHub-l1ru` は今回、孤立していた node を正規登録しただけで、不具合本体は実装していない。
したがって open を維持し、完了対象へ含めない。

## 3. 中学生向けの説明

学校の係の仕事が、一枚の長すぎる説明書に全部書かれていると、どこを直せばよいか分かりません。
そこで「ルールを決める係」「資料を読む係」「課題を登録する係」「おかしな所を点検する係」に
説明書を分けました。受付は今までと同じ一つなので、勝手な入口が増えたわけではありません。

また、昔の調査記録は「今の課題の説明」と「日ごとの調査日記」に分けました。
内容は捨てず、読む目的に合わせて二冊にしただけです。

## 4. 技術者向けの説明

### 4.1 component boundary

| module | 責務 | 外部書込 |
|---|---|---|
| `scripts/bd-bridge.py` | argv / preflight / CLI dispatch / receipt | `bd` 呼出の唯一入口 |
| `lib/bd_bridge_contracts.py` | exact-set と pure validation | なし |
| `lib/bd_bridge_graph.py` | canonical graph / manifest / artifact read | なし |
| `lib/bd_bridge_projection.py` | graph → Beads projection | 注入された `bd` 経由 |
| `lib/bd_bridge_audit.py` | orphan / removal preflight | なし |

`bd` / `git` を使う lib 関数は callable を keyword injection で受ける。CLI module の wrapper が
呼出時に module 変数を渡すため、既存テストの `monkeypatch.setattr(module, "bd", ...)` と
`git` 差替えを維持する。`_ready_with_parity` は AST 契約のため CLI module に残す。

### 4.2 互換性

- CLI operation、argv、exit code、receipt schema を変更しない。
- 既存テストが参照する定数・private function は CLI module から再輸出する。
- `ContractError` の世代ずれを避けるため、テストによる再 import 時は分割 module を再読込する。
- 新 module は `plugins/dev-graph/lib/` 配置とし、scripts coverage の分母を増やさない。

### 4.3 文書分割

`issues/sys-bd-external-ref-orphan-nodes-20260725.md` は課題定義と初期観測を保持し、
2026-07-26 以降の時系列実測を `-log.md` へ逐語移設した。分冊は frontmatter を持たず、
graph node と Beads linkage は親だけが保持する。

## 5. 仕様・設計への影響

**影響あり（内部設計のみ）**と判断した。

- `system-spec/dev-workflow.md`: 単一チョークポイントを維持する四責務境界を実装注記へ反映。
- `specs/harness-hub-system-specification.md`: 製品非影響と設計 trace を要約。
- `architecture/harness-hub-dev-workflow.md`: CLI adapter と四 component の境界を反映。
- `features/feat-dev-pipeline-improvement.md`: follow-up node と実装導線を反映。
- `tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p08.md`: 凍結済み契約を変えない
  post-completion write-back として記録。
- `docs/features/feat-dev-pipeline-improvement/feat-dev-pipeline-improvement-changelog.md`: 変更履歴を記録。

製品 API、DB schema、認証認可、UI、Cloudflare deploy unit、確定済み QA 回答は変更しない。

## 6. 500 行判定

| ファイル | 最終行数 | 判定 |
|---|---:|---|
| `plugins/dev-graph/scripts/bd-bridge.py` | 415 | 500 以下 |
| `plugins/dev-graph/lib/bd_bridge_audit.py` | 319 | 500 以下 |
| `plugins/dev-graph/lib/bd_bridge_contracts.py` | 203 | 500 以下 |
| `plugins/dev-graph/lib/bd_bridge_graph.py` | 265 | 500 以下 |
| `plugins/dev-graph/lib/bd_bridge_projection.py` | 227 | 500 以下 |
| mfh7 親文書 | 130 | 500 以下 |
| mfh7 実測ログ | 422 | 500 以下 |

今回追加した live-trial 証跡も全ファイル 500 行以下である。重複していた約 1,200 行の
decompose 生 audit 複製は commit 対象から外し、独立検証 JSON と transcript へ要点を係留した。

## 7. 最終検証

- main 同期: `origin/main` とローカル `main` を `4306919c` へ fast-forward 確認後、
  ローカル `main` を本 branch へ merge (`d87895ba`)。
- Python 構文検査: 分割対象 5 ファイル PASS。
- focused tests: 71 passed。
- Dev Graph 全テスト: 731 passed / 2 skipped / 5 subtests passed。
- criteria receipt 回帰: 22 passed。
- fresh live-trial: C02 node / C03 sync / C14 decompose / C15 schedule の4件すべて PASS。
- live-trial freshness: 9 verified / stale 0 / record-only missing 6。
- graph schema: `valid=true` / violations 0。architecture source digest: mismatch 0。
- system plan Phase 1〜13: `status=pass` / violations 0。
- orphan external ref: violations 0（closed residue 13、merge-pending 1 は非違反）。
- harness coverage: scripts mechanical 85.6% / llm_eval 63.2%、`RATCHET OK`。
- 文書: line-limit 461 件 PASS / artifact placement PASS / `git diff --check` PASS。
- repository lint / package: `make lint` PASS / 22 plugin package blocking failure 0。
- pre-push 相当: `scripts/run-ci-checks.sh` = PASS 136 / WARN 4 / FAIL 0。

以上により仕様影響は `reflected`、品質ゲートは PASS と受領する。

## 8. 残課題

- `HarnessHub-l1ru`: 改行区切り command の誤遮断修正。今回は node 登録だけで実装対象外。
- `HarnessHub-mfh7`: merge-pending として別 ref に実在する node の自然解消を継続監視する。

新しい未追跡課題が最終レビューで見つかった場合は Beads へ起票し、本節へ追記する。
