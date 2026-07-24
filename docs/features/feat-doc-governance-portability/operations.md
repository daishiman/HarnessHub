---
status: draft
layer: operations
task: SYS-DOC-GOVERNANCE-PORTABILITY-P12
parent_feature: feat-doc-governance-portability
source: system-spec/dev-workflow.md (qa-070, appr-008)
---

# 運用手順 — allowlist ratchet 更新と誤検出トリアージ

3 検査 (300 行 lint / 仕組み-ナレッジ境界 / 移植 opt-in) の CI 稼働後の運用手順。
CI は `.github/workflows/governance-check.yml` change-category-guard job で fail-closed。

## §1 allowlist ratchet の更新手順 (縮小のみ許す)

正本: `scripts/doc-line-limit-allowlist.json`。許される変更は **縮小方向のみ**:

1. **baseline 追随 (縮小)**: 対象文書を分割・削減して実測行数が baseline を下回ったら、
   lint の NOTE (`baseline_line_count を N へ追随更新してよい`) に従い baseline を実測値へ
   下げる。
2. **卒業 (エントリ削除)**: 実測が 300 行以下になったら、NOTE (`allowlist から卒業できる`)
   に従いエントリを削除する。
3. **stale 削除**: 文書の削除・改名で追跡対象から消えたら、NOTE に従いエントリを削除する。

**禁止される変更 (CI が exit 1 で遮断)** — `--ratchet-base origin/main` の改ざん検査:

- 新規エントリの追加 (新たな 300 行超過は allowlist でなく文書分割で解消する)
- `baseline_line_count` の拡大
- `line_limit` の拡大 (上限の変更は qa-070 の規約改訂そのものであり、system-spec-harness
  の確定質疑フローで行う)

確認手順: 変更後にローカルで
`python3 scripts/lint-doc-line-limit.py --repo-root . --ratchet-base origin/main` を実行し
exit 0 を確認してから PR を出す。exit 1 の `allowlist-ratchet:` 行が出たらその変更は不正。
分割 remediation の進捗管理は HarnessHub-3d8 (issue-doc-granularity-remediation-20260722) 側。

**注意**: allowlist を持つ文書を改名したい場合は、先に 300 行以下へ分割してから
(卒業してから) 改名する。改名先エントリの新規追加は ratchet が遮断するため。

## §2 誤検出 (false positive) トリアージ手順

共通原則: 検査を無効化・緩和する前に、まず「本当に規約違反か」を切り分ける。
3 検査の判定基準の正本は `docs/features/feat-doc-governance-portability/design.md`、
規約の正本は system-spec/dev-workflow.md の qa-070 (参照のみ。本書へ複製しない)。

### 300 行 lint (`doc-line-limit` / `doc-line-ratchet` / `allowlist-ratchet`)

1. `python3 scripts/lint-doc-line-limit.py --repo-root . --json` で対象 path と実測行数を確認。
2. 実測は `splitlines()` 基準 (末尾改行に依存しない)。`wc -l` と 1 行ずれることがある。
3. 新規違反が正当な文書なら、責務単位で分割する (allowlist 追加は不可)。
4. 検査対象は git 追跡済み `*.md` のみ (system-spec/ architecture/ features/ tasks/ docs/)。
   未追跡草稿が検出された報告は誤りなので再現手順を確認する。

### 仕組み-ナレッジ境界 (`mechanism-knowledge-boundary`)

1. 検出行の token 種 (qa-number / knowledge-path / node-id) と実コードを確認。
2. **PASS すべき形** (誤検出疑いの確認点): コメント・docstring・bare 文字列文・
   `help=/description=/epilog=/usage=/metavar=` 内の引用、入力由来の動的組み立て
   (`f"tasks/{name}.md"` 等)。これらが FAIL したら lint の欠陥 → 本 feature の回帰テスト
   (`tests/scripts-root/test_root__lint_mechanism_knowledge_boundary.py`) に再現ケースを
   追加して修正する。
3. **FAIL が正しい形**: 制御フロー・既定値のコード値リテラル (定数のみの連結・f-string・
   `%`・`.format` 合成を含む)。修正は「値を args/config/content-root 解決の入力へ移す」。
4. 既存混入と判明した場合は qa-070 の段階解消原則に従い beads issue を起票し、
   `KNOWN_EXISTING` へ (path, kind, token) を追記して NOTE 化する (縮小のみ。追加起票なしの
   KNOWN_EXISTING 拡大は Goodhart なので禁止)。

### 移植 opt-in (`portability-optin`)

1. 検出対象 (bundles.json / plugin.json / install-bundle.sh) と検出行を確認。
2. **PASS すべき形**: free-text (`description` 等) の英単語・`exclude/ignore` キーの
   ナレッジ root (opt-out は compliant)・コメント行の引用。
3. ナレッジ同梱が本当に必要なら、暗黙同梱ではなく明示 opt-in
   (bundle: `"knowledge_optin": true` + `"knowledge": [...]` / plugin.json: 最上位
   `"knowledge_optin": true` / install script: `if`・`test`・`case` 等で
   `INCLUDE_KNOWLEDGE` を評価する gate) を宣言する。コメントや `echo` に gate token を
   書くだけでは明示 opt-in にならず、検査は exit 1 で遮断する。

## §3 実装挙動との整合

本手順は P05 実装 (design.md の入出力契約) と P09 悪性実測
(`eval-log/dev-graph/doc-governance-portability/qa-fail-closed-report.json`: 悪性 15 ケース
全遮断・warning-only 経路なし・残存 risk 1 件は PR review で扱う) に基づく。手順と実装が
乖離した場合は design.md を正として本書を追随更新する。
