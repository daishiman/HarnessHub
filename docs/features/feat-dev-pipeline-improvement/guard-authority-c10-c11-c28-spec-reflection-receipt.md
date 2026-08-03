---
status: confirmed
layer: feature-spec-reflection
feature_node_id: feat-dev-pipeline-improvement
dev_graph_node_id: issue-guard-script-file-indirection-20260726
beads_ids:
  - HarnessHub-kzth
  - HarnessHub-f84o
  - HarnessHub-l1ru
  - HarnessHub-dc7
spec_impact: reflected
qa_id: qa-138
approval_id: appr-027
reviewed_at: 2026-08-03
---

# C10/C11/C28 authority 防御 仕様反映受領書

## 依頼・目的・背景

変更中の四課題を最終レビューし、main 統合後の差分と task 仕様書の品質ゲートを再検証する。
仕様・設計へ影響する場合は正規フローで各文書層へ反映し、対象差分だけを draft PR として
引き渡せる状態にする。背景は、Dev Graph の正本を迂回した書込みと Beads 更新 field の
経路欠落を、単一 guard への過剰な責務集中なしに防ぐ必要があったためである。

## 結論

変更は製品機能ではなく repository 内の開発管理契約へ影響するため、`qa-134`（行数ゲート境界）と
`qa-138`（authority 防御）として dev-workflow 仕様を統合確定した。C10 事前 guard、PostToolUse
監査、C11 validator の三層防御と、最新 main で確定済みの C28 bridge 更新 field 契約を正本・集約仕様・
設計・feature・task へ同期した。

## TL;DR

正規 writer を通らない Dev Graph 変更を前後で検出し、壊れた状態を一度警告して見逃す穴を塞ぎ、
Beads の priority・assignee・labels 更新も正規 bridge だけで届くようにした。

## 変更と課題の対応

| Beads ID | 変更 | 主な証拠 |
|---|---|---|
| `HarnessHub-kzth` | script-file 経由の authority drift を実行後監査で検出 | `audit-graph-authority-drift.py`、hook wiring、正負テスト |
| `HarnessHub-f84o` | inline Python 変数で組み立てた graph/config path を C10 で遮断 | `guard-graph-schema.py`、fail-open window test |
| `HarnessHub-l1ru` | 改行区切りの shell command を独立 segment として判定 | `guard_graph_commands.py`、semantic boundary test |
| `HarnessHub-dc7` | 最新 main で merge 済みの priority・assignee・labels 経路を継承・再検証 | `bd-bridge.py`、field passthrough test、contract 文書 |

## 設計判断

1. C10 は低レイテンシの事前遮断を担当し、command 文字列上で決定できる書込みだけを扱う。
2. script file の全意味解析は行わず、実行後監査が canonical graph/config の drift を確認する。
3. confirmed drift は baseline を更新せず、正規 writer の修復まで再通知する。初回の壊れた
   JSON/envelope も baseline に採用しない。
4. C02 build・C11 validator・事後監査は exact-4-key envelope の定義を共有する。
5. labels は add/remove の差分操作を公開せず、bridge の公開 `--labels` を冪等な
   `bd --set-labels` へ転送する。
6. VCS rollback の advisory は shell segment が git 操作だけの場合に限定し、非 git writer の
   混在で confirmed drift を緩和しない。

## 仕様反映マトリクス

| 層 | 反映先 | 内容 |
|---|---|---|
| 正本 | `system-spec/spec-state.json` / `system-spec/dev-workflow.md` | `qa-134` / `qa-138` / `appr-027`、prompt-only 行数境界と C10/C11/C28 契約 |
| 集約仕様 | `specs/harness-hub-system-specification.md` / `specs/harness-hub-dev-graph-authority-addendum.md` | 三層防御、exact envelope、製品非変更。正規文書と prompt は個別の行数ゲートへ従う |
| 設計 | `architecture/harness-hub-dev-workflow.md` / changelog | 責務分担、lineage、受領書参照 |
| feature | `features/feat-dev-pipeline-improvement.md` / changelog | final-review wave と handoff |
| task | P12 / P13 | 品質ゲートと PR 引継ぎの write-back |
| 実装契約 | `plugins/dev-graph/references/*.md` | hook と Beads bridge の公開契約 |

## 製品仕様への影響

外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。変更範囲は
repository の Dev Graph authority、validator、Beads mutation、開発品質証拠に限定される。

## 行数境界

今回の新規手書き実装・テスト・受領書はいずれも 500 行未満であるが、これは固定の一般ルールではない。
qa-134 によりソースコードとテストには一律の数値行数上限を設けず、分割は責務境界と変更容易性で判断する。
live-trial fixture の sync 責務は `live_trial_sync_contract.py` へ分離した。最新 main の `HarnessHub-w7n7` が
`bd-bridge.py` の判定責務を四つの `plugins/dev-graph/lib/bd_bridge_*.py` へ分離済みで、CLI 本体も
421 行へ収束している。実行時 context に入る `SKILL.md` は本文 300 行、skill の
`prompts/*.md|yaml` は 500 行、qa-070 の正規文書は 300 行をそれぞれ上限として機械検査する。
最新 main 統合後に 510 行となった集約仕様書は `harness-hub-dev-graph-authority-addendum.md` へ分冊し、
本体 493 行・追補 146 行へ収束した。
`.dev-graph/state/graph.json`、`system-spec/spec-state.json`、`.claude/settings.json` は schema が
単一文書を要求する構造化正本であり、分割すると loader と正本契約を壊すため分割対象にしない。

`eval-log/` の transcript / canonical audit には 500 行を超える機械生成証拠があるが、
`transcript_sha256` と JSON pointer で verdict に束縛された immutable evidence である。
分割すると証拠の同一性を壊すため、手書き実装・テスト・正本文書の責務分離規約とは別に、
生成単位のまま append-only で保存する。

## 品質ゲート

| Gate | 結果 |
|---|---|
| system plan exact P01-P13 / semantic coverage | PASS、violations 0、digest `af8a73df…` |
| graph schema / canonical envelope | PASS、revision 1180、violations 0 |
| criteria evidence pytest | PASS、22 passed |
| full Dev Graph pytest | PASS、805 passed + 5 subtests in 244.73s（latest main 統合後） |
| live-trial acceptance | PASS、9 verdicts verified、task contract violations 0（C02/C03/C14/C19 を現行 closure で再取得） |
| repository CI | PASS 139 / WARN 5 / FAIL 0（WARN は段階導入中の既存項目） |
| document line limit / artifact placement / diff check | PASS、542 文書・上限 300・allowlist 0、配置違反 0、`git diff --check` clean |
| spec reflection receipt | 本変更の commit 後、HEAD-bound 機械受領書を再記録する |

### CI 証跡更新と行数契約の明確化 (2026-08-03)

latest main 統合後に CI が失敗した直接原因は、C02/C03/C14/C19 の live-trial verdict に記録された
`skill_dir_tree_sha` が、統合後の skill directory と一致しなくなったことであり、500 行ゲートの不一致ではない。
各 trial は現行 skill を対象に再実行し、別 evaluator が観測値と closure digest を再計算して確認する。

あわせて `specs/harness-hub-dev-graph-authority-addendum.md` に残っていた「手書き変更対象は 500 行以下」
という一般表現を qa-134 に同期した。現行の正本は、ソースコード／テストを一律の数値で制限せず責務で分離し、
`SKILL.md` 本文 300 行、`prompts/*.md|yaml` 500 行、qa-070 正規文書 300 行だけを機械ゲートにする。
この訂正は repository の開発品質契約の表現整合であり、製品 API、DB schema、認証認可、UI、Cloudflare deploy
unit への影響はない。

### 正規 C02 登録 (2026-08-03)

配置ゲートが追補仕様の graph projection 不在を検出したため、
`spec-harness-hub-dev-graph-authority-addendum` を C02 `upsert-node.py` の dry-run 後に登録した。
本文は `preserved`、operation は `added`、graph revision は 1177 から 1178 となり、canonical envelope・
frontmatter・artifact placement を再検証して violations 0 を確認した。入力は
`eval-log/dev-graph/c02-authority-addendum-registration/authority-addendum-input.json` に保持する。

## 最新 main 統合の受領

追加で更新された `origin/main` の feature source lineage review closure を local `main` と本 branch に
取り込み、`aa8f30aa` で競合を解消した。さらに `origin/main` `41a79292` を local `main` から
`08cefba2` へ統合し、今回の追加統合では手作業 conflict は発生しなかった。評価証跡6件は最新 main の live-trial 参照へ更新し、
`eval-log/system-spec-harness/audit-fork-ledger.jsonl` は双方の append-only 記録を保持した。`qa-134` と
`qa-138` は `system-spec/dev-workflow.md` に併記し、製品仕様への影響は引き続きない。

## 残課題

- draft PR は merge 前のため、`HarnessHub-kzth` / `HarnessHub-f84o` / `HarnessHub-l1ru` は
  PR lifecycle 完了まで durable done にしない。`HarnessHub-dc7` は最新 main で完了済みである。

## 中学生向けの説明

大事な設計図を書き換えるとき、入口の先生だけでなく、作業後の見回りと提出物チェックも
行うようにした。誰かが別の方法で設計図を変えても見つけ続け、正しい道具で直るまで
「問題なし」にはしない。課題カードの担当者や優先度も、決められた窓口から変更できる。

## 専門的な説明

PreToolUse の command-only static guard、PostToolUse の stat/digest/revision/envelope audit、
C11 schema validation を defense-in-depth（複数層の防御）として分離した。監査台帳は
confirmed drift で進めず、ctime を fast-path 条件へ追加し、canonical store envelope を
shared module へ集約した。C28 は最新 main の公開 `--labels` → 内部 `bd --set-labels` 契約を
継承し、guarded direct `bd update` と非冪等 label delta を引き続き拒否する。
