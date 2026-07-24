---
status: recorded
layer: session-handoff
doc_type: session-handoff
date: 2026-07-25
predecessor: docs/features/feat-domain-model-db/session-handoff-20260724.md
worktree: task-20260724-135338-wt-4
branch: devgraph/feat-domain-model-db
head_sha: fbcb582
merge_commit: cbea551
pr: 53
beads_epic: HarnessHub-u6q
beads_new: HarnessHub-9hj
dev_graph_node: feat-domain-model-db
---

# セッション引き継ぎ書 — CI 赤の解消 + main 再取り込み (2026-07-25)

> **この文書の狙い**: 前回の文脈を一切覚えていない前提で、「何が起き・今どうで・次に何をすべきか」を一意に把握できるようにする。
> **前提となる文書**: [session-handoff-20260724.md](./session-handoff-20260724.md)（feature 本体 P01–P12 の実施記録・PR #53 作成まで）。本書はその**続き**にあたる。
>
> **用語の凡例**: fail-closed=異常時は安全側に倒して停止する設計 / digest=内容を要約したハッシュ値（1 文字変わると別値になる指紋）/ ratchet=いったん締めた規制を緩められないようにする仕組み / stash=git の一時退避棚 / upsert=無ければ追加・あれば更新。

---

## 1. メタ情報（一目で分かる現況）

| 項目 | 値 |
|---|---|
| 日付 | 2026-07-25 |
| ブランチ | `devgraph/feat-domain-model-db` |
| HEAD | `fbcb582`（本セッションの commit） |
| マージコミット | `cbea551`（`origin/main` = `55e0440` を取り込み） |
| PR | **#53**（OPEN / base=`main`） · https://github.com/daishiman/HarnessHub/pull/53 |
| Beads epic | `HarnessHub-u6q`（**IN_PROGRESS 維持** — P13 が残るため） |
| 新規 Beads | `HarnessHub-9hj`（OPEN・本セッションで起票） |
| dev-graph node | `feat-domain-model-db` / `issue-test-coverage-enforcement-20260724` |
| 仕様反映 | **none 維持**（正本無改変・受領書 §7 に記録） |

---

## 2. 出発点（何が問題だったか）

前セッションで PR #53 まで到達したが、**CI が 1 ジョブだけ赤のまま残っていた**。

- 落ちていたジョブ: `change-category-guard`（`.github/workflows/governance-check.yml`）
- エラー: `docs/features/feat-domain-model-db/session-handoff-20260724.md` の frontmatter に **`status:` と `layer:` が無い**（2 violations）
- **原因**: `scripts/lint-artifact-placement.py` は `docs/` 配下の全 `*.md` を走査し「無標識（ラベルの無い）文書を置かせない」規約を課す。前セッションで引き継ぎ書を新規追加した際にこの 2 キーを付け忘れた。**実装（`packages/db`）とは無関係な文書メタデータの欠落**。
- この lint はキーの**存在**のみを検査し値は見ないため、値は「規約としての一貫性」で選ぶ必要があった。

---

## 3. 実施したこと

### 3-1. CI 赤の解消（frontmatter 補完）

| 対象 | 変更 | 選定理由 |
|---|---|---|
| `session-handoff-20260724.md` | `status: recorded` | 本書は「設計を確定する文書」ではなく「事実を記録する文書」。同性質の `spec-reflection-receipt.md` が既に `recorded` を使う（`docs/` 全体の分布は confirmed 59 / draft 13 / recorded 1 / in_progress 1）。 |
| 同上 | `layer: session-handoff` | `docs/` の `layer` は「文書の役割」を表す自由記述で既に 21 種の値が実在（`feature-design` 43 / `system-wide-design` 5 ほか）。引き継ぎ書は設計文書ではないため役割を正確に表す値を新設。 |
| 同上 / `spec-reflection-receipt.md` | `updated: 2026-07-25` | 追補が入ったことを frontmatter からも辿れるようにする。 |

### 3-2. 文書の分割（qa-070 300 行上限）

frontmatter を直しただけでは**別の CI が赤になった**。本リポジトリは qa-070 により **1 文書 300 行が上限**（`scripts/lint-doc-line-limit.py`）で、追補を 20260724 版へ足すと 334 行で超過するため。

- **対処**: セッション単位で責務分割し、追補を本書（`session-handoff-20260725.md`）へ独立させた。20260724 版は 261 行 + 参照リンクに戻した。
- **allowlist へ逃がさない理由**: この lint は `--ratchet-base origin/main` で **allowlist 自体の改ざん（新規追加・baseline 拡大）も遮断**する設計。既存超過文書の段階的解消のための仕組みであり、新規文書を例外登録するのは規約の意図に反する。
- この失敗は `verify` ジョブ（pytest `test_root__lint_doc_line_limit.py::test_cli_real_repo_exit_zero`）でも同時に検出された。**lint がリポジトリ実体に対して exit 0 になることをテストが直接保証している**ため、逃げ道が塞がれている。

### 3-3. main の再取り込み（依頼「リモート main → ローカル main → 本ブランチ」）

- 前セッション想定の `53f14b8` からさらに前進しており、実際の `origin/main` は **`55e0440`**（PR #56・#57 マージ後）だった。
- ローカル `main` は `origin/main` と同一（`merge --ff-only` は `Already up to date.`）。そこから本ブランチへ `git merge main` を実行し、**コンフリクト 0 / 42 ファイル前進**で完了。

### 3-4. graph.json の衝突回避（重要な手順）

`.dev-graph/state/graph.json` は**単一の正本状態ファイル**なのでブランチ間で必ず衝突する。以下の順で回避した。

1. 未コミットだった graph.json（rev 512・9hj ノード入り）を `git stash push` で退避 — 素直に merge すると「ローカル変更が上書きされる」で失敗するため。
2. `git merge main` → graph.json は main 版（**rev 523 / 279 ノード**）がクリーンに入る。
3. 退避分は**復元せず**、正規経路 `plugins/dev-graph/scripts/upsert-node.py` で 9hj ノードを**再登録**（receipt: `operation: added` / rev 523 → 524 / `write_count: 2`）。
4. 実測で「追加ノード 1 件のみ・既存 279 ノードの改変 0 件」を確認。

> **なぜ手マージしないか**: JSON 全体が競合するうえ、手編集では `graph_revision` の単調増加と digest 整合が壊れる。「main 版を土台に採り、追加分を upsert で再適用」が唯一整合する手順。

### 3-5. follow-up issue の起票（前セッション §8-5 の宿題）

**`HarnessHub-9hj`** として起票（graph node `issue-test-coverage-enforcement-20260724` / 本体 `issues/sys-test-coverage-enforcement-20260724.md`）。

- 内容: **タスク仕様書がテスト網羅（単体 + 結合 + 境界 + 既存回帰 + カバレッジ 80%+）を再現的に機械強制する仕組み**の構築。3 層（テンプレート正本 `system-task-spec-template.md` / C12 `validate-system-plan.py` / 各 `vitest.config.ts` のカバレッジ実測基盤）で fail-closed 化する。
- 発見の経緯: 本 feature のテスト品質レビューで「13 フェーズ契約は P04=test-design・P06=各テスト種別を**名前としては持つが、網羅とカバレッジが束縛されていない**（器はあるが強制力が無い）」と判明した。
- **本 PR のスコープ外**。着手は別途。

### 3-6. beads の更新

- `HarnessHub-u6q` の NOTES に本セッションの作業記録を追記（`bd-bridge.py --op update --append-notes` 経由）。
- epic は **IN_PROGRESS 維持**（completion policy `linked_pr_merged_all` により P13 は PR merge 後）。

---

## 4. 品質ゲート結果（2026-07-25 ローカル実測）

| ゲート | 結果 |
|---|---|
| `scripts/lint-artifact-placement.py`（**CI 赤の原因**） | ✅ **exit 0**（修正前 2 violations）+ self-test 緑 |
| `scripts/lint-doc-line-limit.py --ratchet-base origin/main` | ✅ 分割後 exit 0（分割前 1 violation / 334 行） |
| `pnpm --filter @harness-hub/db test` | ✅ 13 files / **62 tests pass / 0 fail** |
| `tsc --noEmit` | ✅ 0 error |
| `biome check packages/db` | ✅ 65 files / 0 diagnostics |
| `check:ddl` | ✅ 1 migration / 単一 lineage / 破壊的 DDL 0 |
| `check:tenant-isolation-coverage` | ✅ scoped=14 / exempt=4 / fixture 14/14 |
| `check:connection-isolation` | ✅ driver 直接 import 0 |
| `validate-graph-schema.py` | ✅ `valid: true` / violations 0 |
| `lint-eval-log-layout.py` | ✅ 2389 走査 / violations 0 |
| `lint-handoff-disposition.py` | ✅ 123 findings 走査 / violations 0 |
| `lint-open-residue.py` | ⚠️ ローカルのみ 19 件（§5） |

---

## 5. `lint-open-residue` 19 件の切り分け（本 PR 起因ではない）

ローカル実行では `violation_count: 19 / exit_code: 2` になるが、**本 feature 起因ではない**。

- 違反ノードは `SYS-DOC-GOVERNANCE-PORTABILITY-P01..P13`・`SYS-STAGE0-DISTRIBUTION-GATE-P02..P13`・独立 issue 6 件で、`feat-domain-model-db` 系および新規 9hj は **0 件**（node id 全件を grep して実測）。
- CI の同ステップは `continue-on-error: false` にもかかわらず PR #53 で **pass** している。差の理由は **beads DB の有無**: ローカルは `beads_axis=resolved` で md / graph / beads の 3 表現の乖離まで検査するが、CI 環境には beads DB が無くこの軸が評価されない。
- つまり**ローカルの方が厳しい側の差分**で、本 PR のマージ可否には影響しない。既存 tracker（`HarnessHub-j71` 系 / doc-governance 系）の completion projection 残置として別途扱う。

---

## 6. 仕様反映の判定（結論と根拠）

**spec_impact = none を維持**（正本への手編集なし）。

- `git status` / `git diff` の実測で `system-spec/`・`architecture/`・`features/`・`tasks/`・`specs/` への差分は **0 件**。
- frontmatter 補完は文書メタデータのみ、issue 起票は**仕様変更ではなく tracker 登録**（実際の仕様変更は 9hj の実施時に改めて判定）、main マージは main 側で review / CI 済みの確定内容の取り込み。
- `packages/db` は本セッションで無変更のため、前セッションの整合表がそのまま有効。
- 記録先: 人間可読 `docs/features/feat-domain-model-db/spec-reflection-receipt.md` §7 / 機械可読は HEAD `fbcb582` へ再束縛済み（`spec_impact: none` / `spec_files: 0`）。
- あわせて同受領書 §6 の「beads mutation 不可」という**誤診断を訂正**した（`plugins/dev-graph/scripts/bd-bridge.py` は実在し mutation 可能）。

---

## 7. 未完了・申し送り（次にやること）

- **P13（本番反映）は依然 未実施** — completion policy `linked_pr_merged_all` により PR #53 merge 後に着手。手順は `runbook.md` を起点にする（前セッション §8-1 が有効）。
- **`HarnessHub-9hj`（テスト網羅の機械強制）は未着手** — 本 PR のスコープ外。
- **`.dev-graph/tmp/`（upsert 用の一時入力 2 ファイル）が worktree に残存** — 本環境は `rm` が permission ポリシーで拒否されるため削除代行不可。commit 対象外なので PR には混入しない。手動削除: `rm -r .dev-graph/tmp`
- **`git stash@{0}`（`wip-9hj-graph-node`）が残置** — 9hj は upsert で再登録済みのため内容は不要。破棄する場合は `git stash drop stash@{0}`（破壊操作のため実行者判断）。
- **意図的に commit しない揮発 2 ファイル**:
  - `eval-log/run-dev-graph-status-execution.json`（`run-dev-graph-status` の実行ログ・巨大差分）
  - `plugins/harness-creator/skills/run-skill-rubric-governance/proposals/2026-07-25-rubric-update.md`（SessionEnd フックの自動生成ドラフト）
- **既知の環境負債**は前セッション §8-5 のまま有効（`validate-system-plan` の 27 violations は spec 文書側の失効で実装品質と無関係）。

---

## 8. 再現コマンド（裏取り・継続用）

```bash
R=/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260724-135338-wt-4
cd "$R"   # pnpm はワークスペース root からの実行が前提

# --- 状態確認 ---
git -C "$R" log --oneline -3            # fbcb582 / cbea551 / c13f0bb
git -C "$R" status --porcelain          # 揮発 2 ファイル + .dev-graph/tmp/ のみ
gh pr view 53 --json state,isDraft,baseRefName,changedFiles,mergeable
gh pr checks 53

# --- CI と同一の文書ガバナンス検査 ---
python3 scripts/lint-artifact-placement.py --self-test
python3 scripts/lint-artifact-placement.py
python3 scripts/lint-doc-line-limit.py --repo-root . --ratchet-base origin/main

# --- 品質ゲート ---
pnpm --filter @harness-hub/db test
pnpm --filter @harness-hub/db run check:ddl
pnpm --filter @harness-hub/db run check:tenant-isolation-coverage
pnpm --filter @harness-hub/db run check:connection-isolation

# --- graph 検証 ---
python3 plugins/dev-graph/scripts/validate-graph-schema.py --graph .dev-graph/state/graph.json --repo-root "$PWD"

# --- 受領書 ---
cat "$R/docs/features/feat-domain-model-db/spec-reflection-receipt.md"
cat "$(git -C "$R" rev-parse --git-common-dir)/dev-graph/spec-reflection/devgraph__feat-domain-model-db.json"

# --- beads（読取は guard 対象外 / mutation は bd-bridge.py 経由）---
bd show HarnessHub-u6q     # IN_PROGRESS（P13 残）
bd show HarnessHub-9hj     # OPEN（本セッション起票）
```
