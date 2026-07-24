---
status: draft
layer: feature-design
task: SYS-DOC-GOVERNANCE-PORTABILITY-P02
parent_feature: feat-doc-governance-portability
source: system-spec/dev-workflow.md (qa-070, appr-008)
---

# 検査設計 — 300 行 lint / 仕組み-ナレッジ境界 / 移植 opt-in

qa-070 (appr-008) が確定したドキュメント規約 2 件を機械強制する 3 検査の入出力契約・
false-positive 除外基準・allowlist schema を確定する。共通規約: stdlib のみ・argparse・
`--repo-root` (既定 cwd)・走査順は sorted で決定論・exit `0=適合 / 1=違反 / 2=設定エラー`・
時刻/乱数を出力に含めない。

## §1 lint-doc-line-limit.py (300 行 fail-closed ratchet)

- **対象**: `system-spec/ architecture/ features/ tasks/ docs/` 配下の `*.md` のうち
  **git 追跡済み (`git ls-files`) のみ**。1 文書 300 行を上限とする。
- **git 追跡限定の設計判断 (必守)**: 未追跡ファイルは検査対象外にする。理由は 2 つ。
  (1) 別作業が `docs/features/feat-dev-pipeline-improvement/` 配下の md を未追跡で並行
  追加・調整中であり、それらを本 lint が「新規違反」として掴むと並行編集と衝突する。
  (2) CI が検査すべきは「リポジトリに取り込まれた正本文書」であり、作業ツリー上の
  未コミット草稿ではない。`git ls-files` は取り込み済み集合を決定論的に返す唯一の source。
  git repo でない場合は exit 2 (設定エラー)。
- **行数の数え方**: `len(text.splitlines())` (末尾改行の有無に依存しない決定論値)。
- **ratchet (縮小のみ許す)**: `scripts/doc-line-limit-allowlist.json` の
  `baseline_line_count` と実測 `n` を比較する。
  - allowlist 外で `n > limit` → **VIOLATION** (新規違反)
  - allowlist 内で `n > baseline` → **VIOLATION** (baseline 超の肥大は不許可)
  - allowlist 内で `n == baseline` → OK
  - allowlist 内で `n < baseline` → OK + NOTE (baseline を `n` へ追随更新を促す)
  - allowlist 内で `n <= limit` → OK + NOTE (卒業。エントリ削除可)
  - allowlist にあるが追跡対象に不在 → OK + NOTE (stale entry)
- **出力**: text (NOTE は stdout, VIOLATION は stderr) または `--json`。
- **allowlist 改ざん検査 (`--ratchet-base <rev>`, P09 差し戻しで追加)**: allowlist 自体への
  不正追加を fail-closed に遮断する。基準 rev (`git show <rev>:scripts/doc-line-limit-allowlist.json`)
  と現在値を比較し、(a) 新規エントリ追加、(b) `baseline_line_count` の拡大、
  (c) `line_limit` の拡大、を VIOLATION (exit 1) にする。縮小・エントリ削除 (卒業) は許す。
  rev 解決不能は exit 2 (fail-closed)。基準 rev に allowlist が無い場合は初導入として
  NOTE + skip (移植先 repo での再利用を壊さない)。CI は `--ratchet-base origin/main` で起動する。
- **allowlist schema** (`scripts/doc-line-limit-allowlist.json`):
  ```json
  {
    "line_limit": 300,
    "allowlist": [
      {"path": "docs/security-spec.md", "baseline_line_count": 910, "reason": "…"}
    ]
  }
  ```
  制約: 最上位 object・`line_limit` は正整数 (既定 300)・`allowlist[]` は object 配列・
  各 entry の `path` は非空文字列・`baseline_line_count` は正整数・`path` 重複禁止。
  違反時 exit 2。
- **初期 baseline (2026-07-22 実測, splitlines)**: 300 行超の git 追跡 md は 5 件で、
  実値を投入して CI を緑にする (P08 でも縮小追随):
  `docs/security-spec.md`=910 / `docs/backend-spec.md`=434 /
  `docs/features/feat-hub-foundation/design-review-notes.md`=366 /
  `docs/features/feat-stage0-distribution-gate/design-review-notes.md`=320 /
  `docs/features/feat-hub-foundation/final-review-notes.md`=303。

## §2 lint-mechanism-knowledge-boundary.py (仕組み-ナレッジ境界)

- **対象 (仕組み側)**: `plugins/**/*.py`。`.claude/skills/` は `plugins/` への symlink
  投影なので `plugins/` 走査で被覆する (二重計上回避)。除外: `tests`/`test_*`/`conftest.py`
  (合成 fixture を組む検証ハーネスで portable 対象外)・`templates/`・`__pycache__`・
  `node_modules`。`scripts/` の repo-root tooling は本 iteration の対象外 (plugins/ が
  portable mechanism の正本)。
- **検出するナレッジ参照トークン (repo 固有・低誤検出)**:
  - K1 qa 番号: `qa-<digits>`
  - K2 ナレッジ path: `(system-spec|specs|architecture|features|tasks|issues)/….(md|json|jsonl)`
  - K3 feature/issue node id: `feat-<slug>` / `issue-<slug>`
  - **対象外の根拠**: `docs/`・`eval-log/`・`.dev-graph/` path と `arch-/spec-/sys-`
    接頭辞は、仕組み側の識別子 (`spec-drift-guardian` 等) やエラーコード
    (`spec-section-missing`) と衝突し過検出になるため除外する (Goodhart 回避)。
- **FAIL / PASS 判定 (核心の false-positive guard)**: Python AST で判定する。
  - **FAIL**: 制御フロー/既定値として使われる「コード値の文字列リテラル」
    (`ast.Constant` str) にトークンが含まれる。例: 代入値・比較演算子の項・既定引数・
    dict 値・list 要素。これは仕組みへナレッジを焼き込んだ混入。
  - **PASS**: (a) コメント (`# …`) — AST に現れないので構造的に非対象。
    (b) docstring / bare 文字列文 — `Expr(Constant str)` を exempt。
    (c) documentation channel の keyword 引数 (`help=/description=/epilog=/usage=/metavar=`)
    の文字列 — 制御フローでも既定値でもない説明文 (citation)。`argparse` の
    `default=None` で実既定は config 解決である事実と整合。exempt は root だけでなく
    部分木ごと適用する (help= 内の連結式の内側部分式を誤検出しない)。
  - **分割記述回避の遮断 (P09 差し戻しで追加)**: 定数のみから合成される文字列式
    (`"qa-" + "070"` / `f"qa-{70}"` / `"qa-%d" % 70` / `"qa-{}".format(70)` / 隣接リテラル
    連結) は畳み込み後の文字列も検査して FAIL する。非定数部を含む合成
    (`f"tasks/{name}.md"` / `"qa-" + suffix`) は入力由来の正当な組み立てなので検出しない
    (非定数部は placeholder `{}` になり token 正規表現が構造的に不成立)。
- **既存混入 baseline**: qa-070 は『既存の混入は一括修正せず beads で段階解消する』と
  定める。発見済みの 1 件 (`migrate-pipeline-improvement.py` が receipt へ自 feature id を
  ラベルとして焼き込む箇所) を `KNOWN_EXISTING` 定数 (path, kind, token) に記録し、
  fail させず NOTE のみ出す。新規混入だけを遮断する ratchet。エントリを増やして緑化する
  Goodhart は禁止 (縮小のみが正)。
- **出力/exit**: violation ありで exit 1、baseline は note、なしで exit 0。

## §3 lint-portability-knowledge-optin.py (移植 opt-in)

- **対象チャネル**: `.claude-plugin/bundles.json`・`plugins/*/.claude-plugin/plugin.json`・
  `scripts/install-bundle.sh`。
- **契約 (固定検査)**: 移植導線は「仕組みのみ既定 (オン)・ナレッジ同梱は明示 opt-in
  (オフ既定)」。ナレッジ content-root = `system-spec/ specs/ architecture/ features/
  tasks/ issues/ docs/ eval-log/ .dev-graph/` (先頭セグメント判定)。`plugins/`・`.claude/`・
  `references/` は仕組みで非対象。
  - **bundles.json**: 各 bundle の `plugins[]` はナレッジ content-root を含まない
    (現状 plugin 名のみ)。含む場合は bundle に `knowledge_optin: true` が必要。
    `knowledge[]` を opt-in なしで宣言するのも FAIL。
  - **plugin.json**: `knowledge_optin: true` が無い限り、payload key にナレッジ
    content-root を置けない。**false-positive guard**: (a) `description` 等 free-text は
    非対象。(b) `exclude/ignore` キーにナレッジ root が載るのは opt-out (むしろ compliant)
    なので非対象 — 実在例 `skill-intake` の `package.exclude: ["eval-log/**"]` を PASS。
  - **install-bundle.sh**: `INCLUDE_KNOWLEDGE` / `knowledge-optin` の opt-in gate が
    無い限りナレッジ content-root path を参照しない。gate token は `if` / `test` /
    `case` 等の条件式に現れる場合だけ有効とし、コメント行 (`#`) や `echo` に token を
    置いただけの gate 偽装は認めない。コメント行は citation として content-root 検査の非対象。
- **baseline (2026-07-22)**: bundles/plugin.json/install-bundle.sh いずれもナレッジ
  content-root を同梱経路に持たず、全 PASS (exit 0)。
- **出力/exit**: violation ありで exit 1、なしで exit 0。

## 据置 (P08 引き継ぎ)

- doc-line-limit allowlist の baseline は分割 remediation (HarnessHub-3d8) の進捗に応じて
  縮小追随する。boundary の `KNOWN_EXISTING` は beads 段階解消後に削除する。
