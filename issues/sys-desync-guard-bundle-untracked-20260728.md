---
graph_node_id: "issue-desync-guard-bundle-untracked-20260728"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["dev-workflow","git","worktree","data-loss-risk","false-green"]
priority: "critical"
start_date: null
target_date: null
iteration: null
title: "HarnessHub-7xi9 の成果物 985 行がリポジトリに存在せず .git/ 内の 1 コピーのみで生存している"
owners: ["daishiman"]
created_at: "2026-07-28T07:55:00Z"
updated_at: "2026-07-28T07:55:00Z"
status: "draft"
depends_on: []
related_nodes: ["issue-worktree-main-ref-desync-20260728","issue-local-ci-gate-drift-20260728"]
resource_scope: [".githooks","scripts/install-git-hooks.sh"]
purpose: "HarnessHub-7xi9 (worktree desync 遮断) は全 5 受入条件を実装・検証済みとして CLOSED になっているが、その成果物はリポジトリに 1 バイトも存在しない。実体は .git/harness-hub-hooks/ 配下の 11 ファイル 985 行のみであり、.git/ は追跡対象外・push 対象外のため再 clone で消える。hook 自身が参照する tracked template 7 件は origin/main に無く、origin の 29 ブランチを全数走査しても 0 件。close 理由が主張する回帰テストも tests/ に存在しない。core.hooksPath は絶対パスを指しており、この 1 台の 1 clone でしか機能しない。hook の mtime (15:43-15:46) と同日夕方の作業ツリー clobber (403 files / -29,159 行) の時系列から、install 済みコピーだけが .git/ 配下で生き残り作業ツリー側の template が commit 前に消失した経路が最も整合する。HarnessHub-7xi9 が防ごうとした障害そのものによって HarnessHub-7xi9 の成果物が失われている。"
goal: "desync / clobber 遮断機構を tracked template としてリポジトリへ復元し、任意の clone で install-git-hooks.sh 経由で有効化でき、その配線と発火経路が回帰テストで機械検査される状態にする"
scope_in: [".git/harness-hub-hooks/ の 11 ファイル 985 行を tracked template として復元し、install-git-hooks.sh を共有 bundle 設置まで行うよう拡張する","guard-worktree-desync.py が発火する commit 経路 (commit -a / add 後 commit / 部分 add) の実測と、素通りする経路の制約としての記録","hook 配線と guard 判定の回帰テストを tests/ へ追加し CI 到達被覆に載せる","HarnessHub-7xi9 の close 状態の是正"]
scope_out: ["clobber の発生源そのものの特定と遮断","beads hook (.beads/hooks) の設計変更","他 plugin の hook 配線"]
acceptance: [".git/harness-hub-hooks/ の 11 ファイル 985 行が tracked template としてリポジトリに存在すること","install-git-hooks.sh が共有 bundle への設置まで行い core.hooksPath が絶対パスに依存しないこと","hook 配線と guard 判定の回帰テストが tests/ に存在し lint-test-discovery-coverage の CI 到達被覆に入っていること","guard-worktree-desync.py が発火する commit 経路が実測で特定され、素通りする経路があれば制約として記録されていること","HarnessHub-7xi9 の close 状態が実態に合わせて是正されていること"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-desync-guard-bundle-untracked-20260728.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-28T07:55:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.97
classification_reason: "close 済み課題の成果物がリポジトリに不在という、追跡と実体の乖離に関するリポジトリ運用上の欠陥であり、特定 feature の実装タスクではない"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-desync-guard-bundle-untracked-20260728.md","confidence":0.97}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-28T07:55:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`HarnessHub-7xi9` (worktree desync 遮断) は「全 5 受入条件を実装・回帰テスト・runbook・共有 hook bundle で検証し、CI 相当ゲート PASS 117 / FAIL 0 を確認」として **CLOSED** になっている。しかしその成果物は**リポジトリに 1 バイトも存在しない**。実体は `.git/harness-hub-hooks/` 配下の 11 ファイル / 985 行だけであり、`.git/` は追跡対象外・push 対象外なので、再 clone すれば消える。

## 実測 (2026-07-28)

### 存在するもの: `.git/harness-hub-hooks/` の 985 行

| ファイル | 行数 |
|---|---|
| `scripts/validate-git-hooks-wiring.py` | 298 |
| `scripts/guard-worktree-desync.py` | 268 |
| `scripts/guard-cross-worktree-ref-update.py` | 200 |
| `lib/run-repo-guards.sh` | 81 |
| `pre-push` | 41 |
| `lib/delegate-beads.sh` | 25 |
| `reference-transaction` | 20 |
| `pre-commit` | 19 |
| `post-checkout` / `post-merge` / `prepare-commit-msg` | 各 11 |

### 存在しないもの: hook 自身が参照する tracked template 全 7 件

`pre-commit` の冒頭には「本ファイルは共有 hook bundle へコピーされる tracked template」と書かれ、`.githooks/lib/run-repo-guards.sh` と `docs/worktree-parallel-operations-runbook.md` を参照している。いずれも実在しない。

```bash
for p in .githooks/lib/run-repo-guards.sh .githooks/pre-commit \
         .githooks/reference-transaction docs/worktree-parallel-operations-runbook.md \
         scripts/guard-worktree-desync.py scripts/guard-cross-worktree-ref-update.py \
         scripts/validate-git-hooks-wiring.py; do
  git cat-file -e "origin/main:$p" 2>/dev/null && echo "ある: $p" || echo "無い: $p"
done
# -> 7 件すべて「無い」
```

origin の **29 ブランチを全数走査**しても `guard-worktree-desync` を含むものは 0 件。close 理由が主張する「回帰テスト」も `tests/` に存在しない。

### `core.hooksPath` が絶対パス

```
core.hooksPath = /Users/dm/dev/dev/個人開発/HarnessHub/.git/harness-hub-hooks
```

この 1 台の 1 clone でしか機能しない。追跡された `scripts/install-git-hooks.sh` は `core.hooksPath=.githooks` を設定するだけで、共有 bundle の設置は行わない。つまり**他の誰かがこのリポジトリを clone しても、desync 遮断は一切効かない**。

## 原因の推定

hook 群の mtime は `15:43`〜`15:46`。同日夕方に同リポジトリで**作業ツリー clobber** (ref 無傷のまま作業ツリーが過去スナップショットへ丸ごと置換。403 files / -29,159 行) が発生している (`issues/sys-worktree-main-ref-desync-20260728.md` の「6 件目は別機構である」節)。

install 済みコピーは `.git/` 配下のため clobber を免れ、**作業ツリー側の tracked template だけが commit 前に消失した**という経路が最も整合する。

**`HarnessHub-7xi9` が防ごうとした障害そのものによって、`HarnessHub-7xi9` の成果物が失われている。**

## 追加で判明した実装の穴

汚染ツリー (404 files / -29,159 行) で `guard-worktree-desync.py` を bare 実行すると **exit 0** を返す。

```bash
cd <汚染ツリー> && python3 .git/harness-hub-hooks/scripts/guard-worktree-desync.py; echo $?
# -> 0
```

両検知器がいずれも **index** を見るためである。

| 検知器 | 実装 | staged 前の挙動 |
|---|---|---|
| 祖先 tree 一致 | `git write-tree` (= index tree) を HEAD 祖先の tree 集合と照合 | index が HEAD と同一なので HEAD tree として除外され不一致 |
| 大量削除 | `git diff --cached --diff-filter=D` | staged が空なので 0 件 |

`git commit -a` 経由なら削除 112 件 (実測) が staged され閾値 20 を超えて `bulk-delete` で発火する見込みだが、**これは未実測**である (汚染ツリーへの書き込みを避けたため)。`git add` を挟む経路や部分 add での挙動も未検証。

これは受入条件 (2)「desync 状態でのコミットが検査で止まる」が、**どの commit 経路について成立するのか**が確かめられていないことを意味する。

## 受入条件

1. `.git/harness-hub-hooks/` の 11 ファイル 985 行が tracked template としてリポジトリへ復元されていること (退避済み: scratchpad の `hook-bundle-backup/`)
2. `scripts/install-git-hooks.sh` が共有 bundle への設置まで行い、`core.hooksPath` が絶対パスに依存しないこと
3. close 理由が主張する回帰テストが `tests/` に存在し CI から到達すること (`lint-test-discovery-coverage` で機械検査される)
4. `guard-worktree-desync.py` が発火する commit 経路が実測で特定され、素通りする経路があれば制約として記録されていること
5. `HarnessHub-7xi9` の close 状態が実態に合わせて是正されていること

## なぜ P0 か

「実装済み・検証済み」と記録された機構が、実際には 1 台のローカル `.git/` にしか存在しない。これは本リポジトリで繰り返し出ている**「動いていないことが観測できない」型**の最も直接的な事例である。

- 代理指標の衝突 — 実体と代理がずれても緑
- 恒久 false な step gate — 起動しない step が緑
- CI-local ゲート乖離 — 検査していないものを「同等」と表示
- **本件 — リポジトリに無い成果物を「実装・検証済み」と記録**

さらに悪いことに、失われたのは**この型の事故を止めるための機構そのもの**である。復旧しない限り、7 件目の desync / clobber を止める仕組みは存在しない。

## 関連

- `HarnessHub-7xi9` — 本件の親。CLOSED だが実態は未達
- `issue-worktree-main-ref-desync-20260728` — clobber の記録
- `issue-local-ci-gate-drift-20260728` — 同じ「検査されていない宣言」の型
- `docs/worktree-desync-recovery-runbook.md` §2.1 / §4.0
