# r5 blocker — target skill unresolvable in this session

## 到達点

- beads step 1: fixture graph node 0 件 / `resolve-repo-context.py --mode write` 成功 (exit 0, mode=write, repo_root=fixture) を確認。
- beads step 2: `eval-log/run-dev-graph-decompose-goal-spec.json` (bundle コピー) と
  `eval-log/run-dev-graph-decompose-intermediate.jsonl` (intermediate 先頭 1 行) を作成。
- beads step 3: `audit_decompose_live_trial.py snapshot` で `eval-log/pre-state.json` 取得
  (graph node_count=0, revision=0, docs/want.md sha256=7c08c499…4577 一致)。
- beads step 4: compatibility probe `Skill(dev-graph:run-dev-graph-decompose)` → `Unknown skill`（想定どおり、成功起動に非算入）。

## 停止理由

step 4 の実在 alias `Skill({skill: "run-dev-graph-decompose", ...})` も
`Unknown skill: run-dev-graph-decompose` を返した。namespaced / 短縮名の双方で
target skill が起動できず、`Launching skill` tool result を持つ成功起動が 0 件。

- 実体は存在する: `plugins/dev-graph/skills/run-dev-graph-decompose/SKILL.md`
  (frontmatter `name: run-dev-graph-decompose`, `user-invocable: true`)、
  `.claude/skills/run-dev-graph-decompose` → 同ディレクトリへの symlink も健在。
- したがって disk 側の登録欠落ではなく、この session の skill registry に
  dev-graph plugin skills が 1 件も load されていない session 側の条件。
  過去 run r2/r3/r4 では同 skill が起動できていた。

step 4 が満たせないため step 5〜13（R2/R3 Read → Explore → node 登録 → promotion →
noop 再送 → Skill② → audit）と最終照合（成功起動 beads=2 / none=2 / 合計4）は
到達不能。証跡を捏造せず FAIL で終了した。

## 再走に必要な条件

dev-graph plugin skills が Skill tool から解決できる session で実行すること
（`Skill({skill: "run-dev-graph-decompose"})` が `Launching skill` を返すこと）。
fixture `wt31-qa121-decompose-beads-r5` は graph node 0 件のまま（writer 未実行）で、
`eval-log/` の上記 3 ファイルのみ生成済み。none fixture は未着手。
