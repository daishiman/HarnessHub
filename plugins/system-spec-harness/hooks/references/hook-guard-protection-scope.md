# guard-confirmed-chapter-overwrite: 保護スコープの設計と境界定義

> `guard-confirmed-chapter-overwrite.py` (PreToolUse: Write|Edit|Bash) が **何を守り・何を守らないか** の正本。
> hook 本体のコメント (「境界定義: references/hook-guard-protection-scope.md」) と回帰テストが本書を参照する。

## 0. 位置づけ (defense-in-depth)

- 本 hook は要件 C11 の **二重化 (補助防御)**。仕様状態遷移の正本防御は C01 (`apply-spec-transition.py` の単一 transition writer) と C03 (compile) が担う。
- writer は「確定セルの直接変更を拒否・R4-reopen (要 reason) 経由のみ確定を動かす」を機械強制する。hook はその結果 confirmed になった成果物の **事後的な上書き/巻き戻し** を、writer を経由しない直接書換から守る後段の層。
- 従って hook は「唯一のセキュリティ境界」ではない。**表層文字列回避 (adversarial evasion) は設計上許容**し、狙うのは *エージェントによる偶発的上書き* の防止。

## 1. 保護すべき対象 = 「source-of-truth ∧ 非再生成」

| 対象 | 保護 | 根拠 |
|---|---|---|
| 正本 `system-spec/spec-state.json` (確定セルを含む) | ✅ | 状態遷移の SSOT。直接書換は確定巻き戻しの温床 |
| status:confirmed 章 (全対応セル終端・非 reopen) | ✅ | 確定仕様の実体。compile 再生成可能だが確定内容の無断改変を防ぐ |
| 憲法章 `00-requirements-definition.md` (foundation confirmed 時) | ✅ | requirements_foundation (U1-U9) を正本とする確定物。spec_cells を持たないが a5w.2 で保護 |
| 詳細正本 `docs/*-spec.md` (backend/frontend/infrastructure/security-spec.md・実在時) | ✅ Bash のみ | 手動維持・非再生成正本。**Bash 書込 (clobber/glob sweep) を遮断・Edit/Write ツール authoring は許可**。system-spec/ 外だが a5w.1 で保護 |
| 記録・生成物 (`fetched-references.json` / `index.md` / `completeness-report.json` / `completeness-findings.json`) | ❌ EXEMPT | 正規 writer が都度全上書きするのが正常動作。監査経路不要 |
| docs/ の overview 文書 (`screen-inventory.md` 等・非 `-spec.md`) / `docs/features/**` / `docs/mockups/**` | ❌ | 詳細正本でない / feature 成果物。誤爆回避で通す |
| draft 章 / 新規章 / 確定セルなき spec-state | ❌ | 未確定。誤爆回避優先で通す |

判定ソースは `<root>/system-spec/spec-state.json` の 1 経路のみ (rglob 探索なし=fixture 交差汚染を構造排除)。

## 2. 判定原則 (a5w.1 以降): 「参照」ではなく「書込先」で判定する

### 2.1 是正前の欠陥 (branch2/3 の参照↔書込 conflation)

旧実装は「確定物がコマンド文字列に現れる (`refs_spec_state` / `.md` トークン)」ことを書込指標と混同していた。結果、**確定物を read するだけのコマンドが遮断される** 過剰遮断が多発した:

- `wc -l system-spec/*.md > /tmp/x` / `grep -l x system-spec/*.md > /tmp/x` (read + 安全な redirect)
- `rm -rf $SCRATCH && python3 compile.py --spec system-spec/spec-state.json --out-dir $SCRATCH`
  (spec-state は `--spec` の **read arg**、mutation の対象は scratch)
- `cp system-spec/spec-state.json /tmp/backup` (spec-state は cp の **source**)
- validator (`--matrix system-spec/spec-state.json`) を別 segment の mutation と併記した場合

### 2.2 是正 (write-target モデル)

`_write_target_tokens(cmd)` が **実際に書き込む/削除する先だけ** を抽出する:

1. **変数一段解決**: `VAR=value` 代入を集め、`$VAR`/`${VAR}` を書込先トークンで解決する (`F=…/spec-state.json; echo x > $F` は spec-state へ還元して遮断)。
2. **segment 別 mutation 宛先**: `&&`/`;`/`|` で分割し、各 segment のツール別に宛先だけを取る — cp/mv/install/ln は最終 file arg、tee/rm/truncate は対象 file 群、dd は `of=`、sed は `-i` 時のみ対象 file。**source・読取 arg・option は除外**。
3. **redirect 先**: `>`/`>>` の対象 (既存 `_redirect_targets`。`/dev/null`・`2>&1` は除外)。
4. **inline python**: `open('X','w'|'a'|'x')` の X。

遮断は「抽出した書込先が 正本 spec-state / 確定章 のとき」に限る。静的に確定できない書込先 (未解決変数・glob) が **保護領域を指す** 場合のみ安全側で遮断 (`cp /tmp/a system-spec/*.md` 等)。

副産物として、旧 KnownGap の変数分割回避 (`P=sys; Q=tem-spec; echo x > $P$Q/spec-state.json`) は変数解決で `system-spec/spec-state.json` に還元され **FN が解消** した。

## 3. 既知の残存ギャップ (FN・二重化補助ゆえ許容)

- **引数経由 writer**: `python3 apply-spec-transition.py --out system-spec/spec-state.json` は書込指標 (redirect/mutation/inline-open) を持たず素通り。書込は正規 writer 自身なので実害はない。
- **nested-shell + 変数 mutation**: `env -i F=<spec-state> sh -c 'cp x $F'` は mutation が `-c` の引用文字列内にあり segment 先頭 tool 検出が wrapper に阻まれ宛先を抽出できない。現実の偶発上書き経路ではない。
- **inline python の write_text/複雑式**: `open(...,'w')` 以外の書込先は静的抽出できないため、py_write かつ書込先不明かつ保護対象を参照する場合の **保護参照フォールバック** で安全側に倒す (CLI script 起動 `python3 x.py` は `_PY_WRITE` 非該当ゆえ発火せず、compile 等の FP を招かない)。

## 4. 実装済み (a5w.1/a5w.2) と未実装 (follow-up)

**実装済み (a5w.1 残)**:
- **docs/*-spec.md の保護**: `docs/{backend,frontend,infrastructure,security}-spec.md` は手動維持・再生成 writer を持たない詳細正本。**Bash 書込 (redirect/mutation の clobber、docs/ 直下 glob の sweep) を遮断し、Edit/Write ツールでの意図的 authoring は許可**する非対称保護。concrete は実在時のみ保護 (新規作成は妨げない=確定章と一貫)。docs/ 直下でも `-spec.md` でない overview や `docs/features/**` は対象外。

**実装済み (a5w.2)**:
- **MultiEdit 対応**: matcher を `Write|Edit|MultiEdit|Bash` へ拡張 (`hooks/hooks.json` を正本とし `scripts/build-claude-settings.py` で `.claude/settings.json` を再生成)。`decide()` が MultiEdit を Write/Edit と同格に処理する。従来 MultiEdit は matcher 非対象で確定章を素通り改変できた FN を解消。
- **憲法章 (要件定義書) 保護**: `00-requirements-definition.md` (category:requirements-definition・spec_cells 無) は従来「対応セル不明」で通していたが、`requirements_foundation.confirmed=true` のとき確定物として保護する。foundation 未確定 (draft) 時は誤爆回避で通す。

**実装済み (提案1: 明示レジストリ化)**:
- **保護対象レジストリ `_PROTECTION_RULES`**: concrete な書込先に対する保護判定を単一の宣言テーブルへ集約した (id / matcher / scope / reason)。`scope="all"` (spec-state・確定/憲法章) と `scope="bash"` (docs/*-spec.md=Bash のみ・Edit 許可) を宣言で表し、`_match_protection(token, root, bash=…)` が参照する。`bash_decision` の散在した if 判定を置換し、保護対象を 1 箇所で discoverable にした。契約は `TestProtectionRegistry` が固定。
  - 注: Write/Edit/MultiEdit 経路 (`decide()`) は realpath 一致 + 確定セル有無 + frontmatter + F3 fail-closed というより厳密な条件を持つため、レジストリの `scope="all"` 対象を「同等に保護する」形で残置し、完全な単一関数化はしていない (保護対象の宣言は共有・判定精度は経路別)。

**未実装 (follow-up)**:
- **姉妹 hook `plugins/dev-graph/hooks/guard-graph-schema.py` の同種 conflation**: コマンド文字列に `rm ... *.md` 等が現れると (書込対象でなくても) 破壊操作と誤検知する。本 hook で採った write-target モデルの横展開候補。

- **`guard-graph-schema.py` の tool-path 保護 (graph authority への C02 迂回書換)**: 従来 guard は Bash の command 文字列しか見ておらず、Write/Edit ツールや interpreter 本文経由の書換は素通りだった。`.dev-graph/state`・`config.json`・`graph-node.schema.json` を C02 の atomic writer を経由せず直接書換えると、registration receipt を手書きしたうえで python one-liner で digest を後から一致させ C02 を迂回できた (2026-07-21 live-trial r7 で実際に突破)。これを塞ぐため保護次元を 2 つ追加した。(a) matcher を `Bash` から `Bash|Write|Edit|MultiEdit|NotebookEdit` へ拡張し、`FILE_WRITING_TOOLS` の `file_path`/`notebook_path` が graph authority (`GRAPH_AUTHORITY_PATH` = `.dev-graph/state`・`config.json`・`graph-node.schema.json`) を指すなら exit2。(b) Bash 経路でも interpreter 本文の `open(path,'w')` を `INTERPRETER_WRITE` 正規表現で検出し、path が graph authority なら exit2。対象は authority に限定し `templates/`・`cache/`・`tmp/` は init が正当に書くため除外する (広く取ると `cp plugins/dev-graph/templates .dev-graph/templates` まで止まる)。authority 判定は `context_ok()` の subprocess 起動より手前に置き、hook timeout (10s) による fail-open の窓を塞ぐ。契約は `plugins/dev-graph/tests/test_semantic_contract_boundaries_c10_c11_c24.py` 系が固定する。

## 5. 検証

- 回帰テスト `tests/test_guard_confirmed_chapter_overwrite.py` (47 件): MUST_BLOCK / MUST_PASS (2.1 の FP 群を含む) / KNOWN_GAP。
- 実行: `python3 -m unittest discover -s plugins/system-spec-harness/hooks/tests -p "test_*.py"`
- e2e: 実 compile/validator コマンド → exit0、`echo x > spec-state.json` / `sed -i … security.md` → exit2 を確認済み。
