# Claude Code hooks contract

## 配線方針

- 共有既定はplugin同梱の`hooks/hooks.json`。`.claude/settings.json`はplugin hookを使えない導入先だけの明示opt-in fallbackとし、`claude_hooks.source`は`plugin|project|disabled`のいずれか1つに固定する。
- initは既存`.claude/settings.json`を全書換せず、preview→構文検証→hooks配列の識別子付きdeep merge→atomic replaceを行う。既存hookは保持し、rollback manifestを残す。
- `.claude/settings.local.json`、managed policy、`allowManagedHooksOnly`、`disableAllHooks`により実効設定が変わる場合は診断し、登録済みと誤報しない。
- project fallbackは`${CLAUDE_PLUGIN_ROOT}`へ依存せず、installer/initがpreview付きで確認したrepo-local code symlink `.claude/dev-graph-plugin`を使う。link realpathはC24のplugin sourceと一致させ、PreToolUse C10を含む全eventをまとめて切り替える。
- `source=project`はdev-graphをClaude pluginとして有効化していないplain-symlink導入モードだけに許可する。initはeffective hooksを検査し、plugin hookが1件でも見える状態ではproject mergeを拒否する。`source=plugin`時はproject側dev-graph hookを除去/rollbackし、config値だけで排他化できたとみなさない。

## イベント契約

| Event | Matcher | 動作 | 判定権限 |
|---|---|---|---|
| `SessionStart` | `startup|resume` | C24/C27でworktree contextとlease/pending eventを読取り、期限到来時はC03/C26 scheduled reconciliationを起動して短いcontextを返す | completion判定はC26 |
| `PostToolUse` | `Bash` | 成功済みtool inputをJSONとして検査し、`git pull`、`git merge`、`git push`、`gh pr merge`のときだけC26をasync起動 (beads repoでは`git push`もC26 reconciliation発火の対象。beads還流はC26の完了確定の下流)。他はno-op | asyncのためなし |
| `TaskCompleted` | matcherなし | task subject/descriptionに`[DG:<graph_node_id>]`がある場合だけC27 leaseを`pending_review`へparkする。PR merge前でも正常終了を許し、GitHub taskをdoneにしない | identity/owner不整合時だけexit 2 |

`Stop`は再入loopを作りやすいため使わない。PostToolUseはコマンド文字列をshellで再実行せず、許可した操作の観測トリガーとしてだけ扱う。

## security / idempotency

- commandは`${CLAUDE_PLUGIN_ROOT}`と`${CLAUDE_PROJECT_DIR}`だけを引用符付き固定command stringで渡す。stdin/tool commandをshellへ連結・再実行せず、script側でevent名・tool名・cwd・session/task identifier・長さを検証する。
- C24がcaller root containment、C27がrepository/worktree identityを検証する。tool input、環境変数、gh outputのtoken/authorization値をlogへ出さない。
- event keyは`repository_id:event:session_id:tool_use_id:head_sha`。git common dir配下のdev-graph event ledgerとatomic lockで重複・再入を抑止する。
- async hookは状態判定を返さない。TaskCompletedは当該`graph_node_id`のlease transitionだけを行い、無関係なClaude taskは常にno-opとする。PR open検知後はC26/C27が`pending_merge`へ進め、merge後だけdurable doneへ進める。

## C10 PreToolUse の遮断時間契約

- graph authority (`.dev-graph/state/`、`.dev-graph/config.json`、`graph-node.schema.json`) への直接書込み、Beads/GitHub bridge 迂回、content root への破壊操作は `guard-graph-schema.py` の `static_denial` で判定する。遮断対象の判定経路では subprocess、graph 全件 schema 検査、network I/O を起動しない。
- repository context 検査は静的遮断を通過した入力にだけ実行する。PreToolUse timeout が「遮断すべき操作を許可する fail-open 窓」にならない順序を不変条件とする。
- shell redirect は quote 外の演算子とその宛先だけを評価する。遮断例を引用した notes 等の散文は redirect とみなさず、tokenize 不能な入力だけ安全側 fallback を使う。
- `.dev-graph/config.json` の正規 writer は `scripts/build-repo-config.py`、初期 `.dev-graph/state/graph.json` の正規 writer は `scripts/build-graph-store.py`。init は各 receipt を検証し、直接 Write/Edit/Bash redirect/`Path.write_text()` へ退避しない。node 登録後の graph 変更は C02 `upsert-node.py` に限定する。
- シェル書込み先解析は `hooks/guard_graph_commands.py` に分離し、hook entrypoint は input 正規化・静的遮断・context 検査の順序だけを所有する。

## 公式仕様参照

- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/hooks-guide
- https://code.claude.com/docs/en/configuration
- https://code.claude.com/docs/en/debug-your-config
