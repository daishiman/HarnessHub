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
updated_at: "2026-07-28T06:23:05Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: [".beads/hooks","plugins/dev-graph/hooks","plugins/dev-graph/scripts"]
purpose: "2026-07-28、主ワークツリーで HEAD と index だけが最新 main へ進み、作業ツリーが 09:36 時点 (03093e4) に取り残される desync が発生した。原因は並列稼働中の worktree/セッションが git update-ref 系で refs/heads/main を直接書き換えたこと。git reflog show main に理由メッセージが空のエントリが 3 件 (10:06:29 -> 8560e92 / 10:16:32 -> 6e03e8f / 10:52:28 -> 9fe09e5) 残っており、pull / merge / checkout いずれの経路でもないことが確定している。症状は (a) ref が最新のため git pull が Already up to date を返す、(b) git status が PR で追加されたファイルを deleted、更新されたファイルを modified と表示する、の 2 点。この状態で git commit -a すると PR #84 / #85 のマージ内容を丸ごと巻き戻すコミット (65 files / -5467 行) が main に載る。今回は commit 前に検知して復旧したが、stash@{26} に同種の退避 (main-4bf2a66 同期前の退避: index+worktree が 7e250f1 のまま古かった分) が残っており再発である。復旧作業中に別セッションが stash push したため stash@{0} の指す対象が入れ替わる事象も同時に観測した"
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
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
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

### 3 回目の再発 (2026-07-28 午後、本課題の起票中に発生)

本課題を起票した同じ日の午後、**同一の主ワークツリーで 3 回目が発生した**。起票によって現象が既知になっても、仕組みが無ければ止まらないことの実証になっている。

```
dedfdc3 main@{2026-07-28 12:34:40 +0900}:            <- 空 = 4 件目の直接書き換え
```

- HEAD = `dedfdc3` (PR #87 マージ済みの最新 main)
- index + 作業ツリー = PR #87 以前の実体
- `git diff --shortstat HEAD` = 19 files / -878 行

実体でも裏を取った。`packages/db/repository/crud.ts` の `guardedWrite` が作業ツリー側 0 個に対し HEAD 側 4 個、PR #87 が追加した `packages/db/scripts/check-db-write-gate.mjs` がディスク上に存在しない状態だった。commit していれば **PR #87 (repository write の guardedWrite 掃き出し) が丸ごと打ち消されていた**。

commit 前に検知し、下記 runbook の手順で復旧済み。**3 回とも目視で止めており、機械的な遮断は 1 度も働いていない。**

### 直接書き換えは常態である (2026-07-28 時点の全数)

本課題の対応中 (15:08:40) にさらに 5 件目 (`4c66e5e`) を観測した。この時点で `git reflog show main` に残る当日のエントリは、**`pull: Fast-forward` と記録された 09:36 の 1 件を除きすべて理由メッセージが空**である。つまり main の更新経路として、ref 直接書き換えが例外ではなく既定になっている。

一方で 5 件目は desync を起こさなかった。作業中のワークツリーが `main` ではなく作業ブランチを checkout していたためである。**desync の必要条件は「main を checkout したまま保持していること」**であり、これは (1) の遮断が入るまでの実効的な緩和策になる (runbook §6 に反映済み)。

## 復旧手順

正本は `docs/worktree-desync-recovery-runbook.md`。検知 (reflog の理由メッセージ / `git diff --shortstat HEAD` / 実体照合)、退避、選択復元、stash のメッセージ参照規約までを収録している。

要点のみ再掲すると、`--detach` で HEAD を SHA に固定してから退避することで、**並列セッションを止めずに**復旧できる。実際 1 回目の復旧作業中に PR #86 のマージで main が動いたが、影響を受けなかった。

## 併発した二次問題: stash 番号の揺れ

復旧作業中、別セッションが `git stash push` を実行したため `stash@{0}` の指す対象が入れ替わった。`stash@{N}` は **スタックの位置**であって識別子ではない。並列稼働下では、退避した内容を番号で参照する手順はそれ自体が事故要因になる。

## 検討軸

| 軸 | 論点 |
|---|---|
| 遮断 | `reference-transaction` hook で「他ワークツリーが checkout 中の ref」への更新を拒否できるか。git 2.38.1 で利用可能 |
| hook の永続性 | `core.hooksPath` が `.beads/hooks` を指すため、beads の更新で hook が消える可能性がある。消えない設置場所か、消失の検知が要る |
| 検知 | HEAD と作業ツリーの整合検査を pre-commit へ結線し、desync 状態のコミットを fail-closed で止める。大量 deletion の異常検知も併用しうる |
| 運用 | エージェント側は `git fetch origin` (remote-tracking のみ) に限定し、`git fetch origin main:main` / `git update-ref refs/heads/main` を禁止する |
| 復旧 | 並列稼働を止めない復旧手順の runbook 化 (2026-07-28 に `docs/worktree-desync-recovery-runbook.md` として完了) |

## 進捗

| 受入条件 | 状態 |
|---|---|
| (1) ref 直接更新の遮断 | 未着手。`reference-transaction` hook を第一候補として検討中 |
| (2) desync 状態での commit を検査で止める | 未着手 |
| (3) hook が beads 更新で消えないことの検証 | 未着手 |
| (4) 並列稼働下の復旧 runbook | **完了** — `docs/worktree-desync-recovery-runbook.md`。2026-07-28 に 2 度、記載どおりの手順で復旧を実証 |
| (5) stash 参照をメッセージで行う規約 | **完了** — 同 runbook §5 |

残る (1)(2)(3) が本課題の主眼であり、これらが未達である限り検知は目視依存のままである。
