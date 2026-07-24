---
status: confirmed
layer: system-wide-design
sources: [README.md]
---

# Beads・strandkanban の役割と、迷ったときの戻り先

> README.md「Part 3 / Part 4」から分離した参照ガイド。日々の開発フロー本体は README を、
> 実行 tracker／完了 authority の正本は `plugins/dev-graph/references/execution-tracker-contract.md` を参照する。

## Beads と strandkanban の役割

### Beads が正本として持つもの

Beads は、実行タスク、担当、priority、依存、blocker、進捗を保持する課題トラッカーです。issue はローカルの Dolt DB（`.beads/dolt/`）に保存され、マシン間同期は git remote の `refs/dolt/data` を使います。

```bash
bd prime
bd ready
bd list --status=open
bd list --status=in_progress
bd blocked
bd show <id>
bd update <id> --claim
bd close <id> --reason="<完了理由>"
bd stats
bd doctor
```

AI エージェントは対話 editor を開く `bd edit` を使いません。field の更新は `bd update <id> --title ... --description ... --notes ...` のような非対話 command を使います。

### strandkanban が見せるもの

strandkanban は Beads issue をブラウザで見る live 看板です。タスクの作成・依存・完了状態の正本を別に持つものではありません。

| 確認したいこと | 使うもの |
|---|---|
| 次に着手可能な1件 | `bd ready` |
| ブロック理由・依存先 | `bd blocked` / `bd show <id>` |
| 人が全 task を一覧し、状態を相談する | strandkanban |
| resource 競合と lease を含む並行実行候補 | `/dev-graph next` |
| 仕様 → feature → task の全体 DAG | `/dev-graph render` |
| PR merge を含む完了の最終状態 | GitHub PR fact → `/dev-graph sync` → Beads |

看板を起動していなくても、Beads CLI と dev-graph だけで開発・自動同期は成立します。

## 迷ったときの戻り先

| 状況 | 実行すること |
|---|---|
| 要件や技術決定が変わった | `/dev-graph spec` へ戻る |
| feature の範囲・依存が変わった | `/dev-graph decompose` を再実行し、必要な node 差分を正規 writer で反映する |
| feature context が変わった | `/dev-graph plan --feature-id ... --feature-context ...` を再実行する。生成済み task を個別手編集しない |
| requirements が handoff されない | `missing_sections` と readiness を直し、`/dev-graph requirements` を再実行する |
| Beads に task が見えない | `/dev-graph sync` 後に `bd ready` と `bd stats` を確認する |
| 何を着手すべきか分からない | `bd ready`、`/dev-graph next`、strandkanban を比較し、Claude Code に読み取り専用で相談する |
| lease が衝突した | `/dev-graph worktree list` で所有者を確認する。勝手に release しない |
| 実装中に要件不足を発見した | 実装で推測して埋めず、`/dev-graph spec` または Beads follow-up へ戻す |
| PR後に状態がずれる | `/dev-graph sync` を再実行し、`bd show` と `/dev-graph status` を確認する |

### いつでも実行できる状態確認

```bash
bd ready
bd blocked
bd stats
git status --short
python3 scripts/lint-artifact-placement.py
```

```text
/dev-graph status
/dev-graph next
/dev-graph worktree list
/dev-graph render
```
