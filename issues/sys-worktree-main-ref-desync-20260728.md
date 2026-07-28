---
graph_node_id: "issue-worktree-main-ref-desync-20260728"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["dev-workflow","git","worktree","parallel-session","data-loss-risk"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "並列 worktree の refs/heads/main 直接更新で主ワークツリーが desync し、main 巻き戻しコミットを生む"
owners: ["daishiman"]
created_at: "2026-07-28T02:05:00Z"
updated_at: "2026-07-28T07:59:42Z"
status: "draft"
depends_on: []
related_nodes: ["feat-dev-pipeline-improvement","spec-harness-hub-requirements"]
resource_scope: [".githooks",".beads/hooks",".dev-graph/state/graph.json","architecture/harness-hub-dev-workflow.md","docs/worktree-parallel-operations-runbook.md","features/feat-dev-pipeline-improvement.md","issues/sys-worktree-main-ref-desync-20260728.md","scripts/install-git-hooks.sh","scripts/run-ci-checks.sh","scripts/guard-cross-worktree-ref-update.py","scripts/guard-worktree-desync.py","scripts/validate-git-hooks-wiring.py","specs/harness-hub-system-specification.md","system-spec/dev-workflow.md","system-spec/spec-state.json","tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p12.md","tests/scripts-root"]
purpose: "2026-07-28、主ワークツリーで HEAD と index だけが最新 main へ進み、作業ツリーが 09:36 時点 (03093e4) に取り残される desync が発生した。原因は並列稼働中の worktree/セッションが git update-ref 系で refs/heads/main を直接書き換えたこと。git reflog show main に理由メッセージが空のエントリが 3 件 (10:06:29 -> 8560e92 / 10:16:32 -> 6e03e8f / 10:52:28 -> 9fe09e5) 残っており、pull / merge / checkout いずれの経路でもないことが確定している。症状は (a) ref が最新のため git pull が Already up to date を返す、(b) git status が PR で追加されたファイルを deleted、更新されたファイルを modified と表示する、の 2 点。この状態で git commit -a すると PR #84 / #85 のマージ内容を丸ごと巻き戻すコミット (65 files / -5467 行) が main に載る。今回は commit 前に検知して復旧したが、過去の stash に同種の退避が残っており再発である。復旧作業中に別セッションが stash push したため番号参照の指す対象が入れ替わる事象も同時に観測した"
goal: "並列セッションを止めずに、main ref の横取り更新による desync を発生させない、または発生しても巻き戻しコミットとして main へ到達させない状態にする"
scope_in: ["worktree/エージェントから他ワークツリーで checkout 中の ref を直接更新する経路を遮断する仕組みの設計と導入 (reference-transaction hook が第一候補)","core.hooksPath が .beads/hooks を指すため beads 更新で hook が消える経路の評価と、消えた場合の検知手段","desync 状態でのコミットを fail-closed で止める検査の pre-commit 系への結線 (HEAD と作業ツリーの整合、大量 deletion の異常検知)","並列稼働を止めない復旧手順の runbook 化 (--detach で HEAD を SHA 固定 -> stash push -u -> 一致確認 -> 選択復元 -> checkout main)","stash の参照を番号ではなくメッセージで行う規約の明文化"]
scope_out: ["並列セッション運用そのものの停止や同時実行数の削減","既存 48 件の stash の棚卸し","GitHub 側のブランチ保護設定の変更"]
acceptance: ["worktree から refs/heads/main を直接更新しようとした操作が遮断されるか、遮断できない場合はその制約が根拠つきで記録されている","desync 状態 (HEAD と作業ツリーの不整合) でのコミットが検査で止まり、巻き戻しコミットが main へ到達しないことが再現手順つきで検証されている","hook の設置場所が beads 更新で消えないこと、または消えたことを検知できることが検証されている","並列稼働下の復旧手順が runbook に記載され、記載どおりの操作で復旧できることが確認されている","stash 参照をメッセージで行う規約が文書化されている"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-worktree-main-ref-desync-20260728.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-28T02:05:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "並列 worktree 運用と git ref 更新の衝突により再現しうる、リポジトリ運用上の追跡課題"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-worktree-main-ref-desync-20260728.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-7xi9","linked_at":"2026-07-28T06:31:19Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-28T06:55:08Z","evidence_refs":["architecture/harness-hub-dev-workflow.md","docs/worktree-parallel-operations-runbook.md","features/feat-dev-pipeline-improvement.md","specs/harness-hub-system-specification.md","system-spec/dev-workflow.md","system-spec/spec-state.json","tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p12.md","tests/scripts-root/test_root__guard_cross_worktree_ref_update.py","tests/scripts-root/test_root__guard_worktree_desync.py","tests/scripts-root/test_root__validate_git_hooks_wiring.py"],"policy":"manual","reconciled_at":"2026-07-28T07:59:42Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-07-28T02:05:00Z","missing_sections":[],"status":"complete"}
---

# 概要

並列稼働中の worktree / エージェントセッションが `refs/heads/main` を **作業ツリーを更新せずに** 直接書き換えるため、主ワークツリーで HEAD・index だけが最新へ進み、実ファイルが古いまま取り残される。この状態で `git commit -a` すると、直前にマージされた PR の内容を丸ごと巻き戻すコミットが main に載る。

## 背景と問題

git は **HEAD / index / 作業ツリー** の 3 層で状態を持つ。`git pull` や `git checkout` は 3 層すべてを更新するが、`git update-ref` 系は ref だけを書き換える。worktree は `.git` を共有するため、別ディレクトリの worktree からでも主ワークツリーが checkout 中の `refs/heads/main` を動かせてしまう。

結果として次の 2 症状が同時に出る。

| 症状 | 実際に起きていること |
|---|---|
| `git pull` が `Already up to date` | ref は最新なので pull に仕事がない。git は正しい |
| 身に覚えのない大量の差分 | PR で **追加された** ファイルが手元に無いので `deleted`、**更新された** ファイルが古いので `modified` と表示される |

差分の向きが直感と逆になるため、「自分が壊した」と誤認しやすい。

## 再現の証拠 (2026-07-28)

`git reflog show main --date=iso` の理由メッセージが **空** のエントリが、ref 直接書き換えの指紋である。

```
9fe09e5 main@{2026-07-28 10:52:28 +0900}:            <- 空 (PR #86)
6e03e8f main@{2026-07-28 10:16:32 +0900}:            <- 空 (PR #85)
8560e92 main@{2026-07-28 10:06:29 +0900}:            <- 空 (PR #84)
03093e4 main@{2026-07-28 09:36:22 +0900}: pull: Fast-forward
```

時刻が符合する worktree が 2 件あった。

- `.worktrees/task-20260728-094807-wt-13` — `03093e4` を detached で保持 (09:48 作成)
- `.worktrees/task-20260728-100917-wt-6` — `8560e92` を detached で保持 (10:09 作成)

## 危険性

検知が遅れた場合の実害は次のとおり。今回は commit 前に検知した。

- `git commit -a` で **65 files changed / -5,467 行** の巻き戻しコミットが生成される
- 内容は PR #84 / #85 のマージ結果の打ち消しであり、レビュー済みの変更が無言で消える
- CI は「意図された削除」と区別できないため、緑のまま通過しうる

## 再発である証拠

`stash@{26}` に同種の退避が残っている。

```
On main: main-4bf2a66 同期前の退避: index+worktree が 7e250f1 のまま古かった分 (固有変更なしと検証済み)
```

同じ現象が過去にも発生し、そのときも手作業で退避して収束させている。仕組みで止めていないため再発した。

## 併発した二次問題: stash 番号の揺れ

復旧作業中、別セッションが `git stash push` を実行したため `stash@{0}` の指す対象が入れ替わった。`stash@{N}` は **スタックの位置**であって識別子ではない。並列稼働下では、退避した内容を番号で参照する手順はそれ自体が事故要因になる。

## 検討軸

| 軸 | 論点 |
|---|---|
| 遮断 | `reference-transaction` hook で「他ワークツリーが checkout 中の ref」への更新を拒否できるか。git 2.38.1 で利用可能 |
| hook の永続性 | `core.hooksPath` が `.beads/hooks` を指すため、beads の更新で hook が消える可能性がある。消えない設置場所か、消失の検知が要る |
| 検知 | HEAD と作業ツリーの整合検査を pre-commit へ結線し、desync 状態のコミットを fail-closed で止める。大量 deletion の異常検知も併用しうる |
| 運用 | エージェント側は `git fetch origin` (remote-tracking のみ) に限定し、`git fetch origin main:main` / `git update-ref refs/heads/main` を禁止する |
| 復旧 | 並列稼働を止めない復旧手順の runbook 化 |

## 復旧手順 (2026-07-28 に実証済み)

`--detach` で HEAD を SHA に固定すると、作業中に ref が書き換わっても作業ツリーが巻き込まれない。実際、この手順の実行中に PR #86 のマージで main が動いたが影響を受けなかった。

```bash
git checkout --detach          # HEAD を SHA 固定。ref 書き換えの影響を遮断
git stash push -u -m "<内容がわかるメッセージ>"
git status                     # 作業ツリーが HEAD と一致することを確認
git diff --shortstat HEAD      # 空であること
git restore --source="<メッセージから取得した stash SHA>^3" -- <untracked で残したいパス>
git checkout main              # ref の最新へ追従
```

保全対象の選別には「main 側がそのファイルを触ったか」を使う。

```bash
git diff --shortstat <古い基点> <最新> -- <path>
# 出力が空 = main 側は無変更 = 作業ツリー側の固有変更
```

## 実装 (2026-07-28)

本課題への対応として次を導入した。詳細は `docs/worktree-parallel-operations-runbook.md`。

| 受入条件 | 実装 |
|---|---|
| ref 直接更新の遮断 | `scripts/guard-cross-worktree-ref-update.py` を、全 worktree 共通の `<git-common-dir>/harness-hub-hooks/reference-transaction` へ結線。古い branch 側に hook ファイルが無くても遮断。判定不能時は fail-open (根拠は同スクリプト docstring) |
| desync コミットの遮断 | `scripts/guard-worktree-desync.py` を `pre-commit` へ結線。index の tree が HEAD 祖先の tree と一致すれば巻き戻し確定として fail-closed |
| hook 消失の検知 | git common dir の共有 bundle (主経路) + `.githooks` (tracked template) + `.beads/hooks` (保険経路) を検証する `scripts/validate-git-hooks-wiring.py` を CI と pre-push へ結線 |
| 復旧 runbook | `docs/worktree-parallel-operations-runbook.md` §4 |
| stash 参照規約 | 同 runbook §5 (メッセージ検索で SHA を得てから使う) |

### 有効化時に実環境で検出した誤検知と修正

初期案の `core.hooksPath=.githooks` を有効化し、稼働中の全 worktree で
`guard-worktree-desync.py` を実行したところ `verdict=rollback` を返した。原因は祖先
tree の照合対象から **HEAD 自身しか除いていなかった**こと。

HEAD の `dedfdc3` (Merge PR #87) と親の `1f78791` は tree が共に `76c6a92` である。
main 側に追加 commit が無い状態のマージは親の tree をそのまま採るため、GitHub の PR
マージで日常的にこの形になる。結果、差分なしの index (= HEAD の tree) が「祖先と一致」
に該当し、通常の commit が全て遮断されていた。

修正は照合対象の除外を commit 単位から **tree 単位**へ変更 (`ancestor_tree_map`)。
HEAD と同 tree の祖先へ巻き戻しても内容は変わらないため、除外しても検知漏れは生じない。
回帰テストは `test_allows_commit_after_ff_like_merge` /
`test_still_blocks_desync_after_ff_like_merge`。

修正後、稼働中 16 worktree すべてで guard を直接実行して `verdict=ok`、現在の
worktree から `refs/heads/main` への直接更新は `fatal: ref updates aborted by hook`
で遮断、他者が checkout していない branch の作成/削除は通過した。

### 相対 hooksPath の worktree 間欠落と修正

上記の初期案には、`core.hooksPath=.githooks` がコマンド実行元 worktree の
`.githooks` を参照するため、導入前の古い branch では `reference-transaction` 自体が
存在しない欠陥があった。実際に稼働中の古い worktree で欠落を確認した。

`scripts/install-git-hooks.sh` を、全 worktree が共有する git common dir 配下へ hook と
guard 本体をコピーし、その絶対パスを `core.hooksPath` に設定する方式へ変更した。
統合テストは「main worktree にだけ導入ファイルがあり、legacy worktree には
`.githooks` も guard script も無い」状態を作り、legacy 側の `git update-ref
refs/heads/main` が共有 bundle で遮断されることを実 git で確認する。
