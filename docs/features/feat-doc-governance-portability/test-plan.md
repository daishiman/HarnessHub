---
status: draft
layer: test-design
task: SYS-DOC-GOVERNANCE-PORTABILITY-P04
parent_feature: feat-doc-governance-portability
source: system-spec/dev-workflow.md (qa-070, appr-008)
---

# テスト設計 — 3 検査の MUST_DETECT / MUST_PASS fixture

design.md §1-§3 の入出力契約に対し、各 lint の悪性 (MUST_DETECT=exit 非 0) と良性
(MUST_PASS=exit 0)、false-positive guard を pytest で固定する。命名は tests/README.md の
`test_<target>__<script>.py` に従い `tests/scripts-root/` へ置く。全テストは network 不要・
`tmp_path` fixture のみ (repo 内 fixture を書き換えない)。

## T1 test_root__lint_doc_line_limit.py

- **MUST_DETECT**
  - `evaluate_new_violation_over_limit`: allowlist 外の 301 行文書 → VIOLATION
  - `evaluate_allowlist_growth_beyond_baseline`: baseline 400 の文書が 500 行 → VIOLATION
  - `main_exit1_new_violation`: tmp git repo で新規違反 → exit 1
- **MUST_PASS**
  - `evaluate_within_limit_pass` (299 行) / `evaluate_at_limit_boundary_pass` (300 ちょうど)
  - `evaluate_allowlist_at_baseline_pass` (== baseline)
  - `main_exit0_clean_repo`: allowlist 込みの tmp repo → exit 0
- **ratchet NOTE**: `evaluate_allowlist_shrunk_pass_with_note` (縮小追随) /
  `evaluate_allowlist_graduated_note` (卒業) / `evaluate_stale_allowlist_entry_note`
- **git 追跡限定**: `list_tracked_docs_excludes_untracked` (999 行の未追跡巨大ファイルを
  対象外にする = 親の並行編集と衝突しない設計の固定) / `list_tracked_docs_not_a_repo_raises`
- **schema/設定エラー**: `load_allowlist_malformed` (6 変種で exit 2 相当) /
  `main_exit2_bad_allowlist`
- **実リポジトリ契約**: `cli_real_repo_exit_zero` (allowlist 込みで exit 0)
- **冪等 (P08)**: 同一入力で `evaluate` が同じ (violations, notes) を返すことは決定論的
  純関数として保証され、再実行差分 0 に収束する (allowlist baseline 遡及後も同様)。

## T2 test_root__lint_mechanism_knowledge_boundary.py

- **MUST_DETECT (制御フロー/既定値リテラル)**
  - `detect_qa_number_in_assignment` (`ref = "qa-070"`)
  - `detect_qa_number_in_comparison` (`if x == "qa-070":`)
  - `detect_knowledge_path_in_default_arg` (`def f(p="features/feat-x.md")`)
  - `detect_node_id_in_dict_value` / `detect_node_id_in_list_element`
  - `detect_system_spec_path` (`"system-spec/dev-workflow.md"`)
  - `cli_detects_injected_violation`: tmp plugin ツリーの悪性リテラル → exit 1
- **MUST_PASS (false-positive guard・核心)**
  - `pass_qa_in_comment`: `# 根拠: qa-070` は非検出
  - `pass_qa_in_module_docstring` / `pass_node_id_in_function_docstring`
  - `pass_bare_string_statement`
  - `pass_argparse_help_documentation`: `help="…system-spec/…json"` は非検出
    (`default=None` で実既定は config 解決)
  - `no_collision_mechanism_names`: `dev-graph`・`spec-section-missing`・
    `spec-drift-guardian`・`docs/…`/`eval-log/…` path・埋め込み `feat-` 部分文字列を非検出
  - `cli_passes_clean_plugin_tree` / `syntax_error_source_returns_empty`
- **既存混入 baseline**: `known_existing_is_note_not_violation` (KNOWN_EXISTING は note へ)
- **実リポジトリ契約**: `cli_real_repo_exit_zero` (exit 0)

## T3 test_root__lint_portability_knowledge_optin.py

- **MUST_DETECT**
  - `bundles_detect_knowledge_plugin_entry` (bundle plugins にナレッジ path)
  - `bundles_detect_knowledge_list_without_optin`
  - `manifest_detect_knowledge_in_include` (`package.include: ["docs/**"]`)
  - `install_script_detect_knowledge_copy` (`cp -r system-spec/`)
  - `cli_detects_injected_violation`: bundles にナレッジ path → exit 1
- **MUST_PASS**
  - `bundles_pass_plugin_names_only` (現状 baseline) / `bundles_pass_explicit_optin`
  - `manifest_pass_exclude_is_optout`: `package.exclude: ["eval-log/**"]` は PASS
    (opt-out は compliant。実在 `skill-intake` を割らない guard)
  - `manifest_pass_explicit_optin` / `install_script_pass_with_optin_gate`
  - **false-positive guard**: `bundles_pass_description_mentions_knowledge_word` /
    `manifest_pass_description_prose` / `install_script_pass_comment_reference`
  - `is_knowledge_ref_true_cases` / `is_knowledge_ref_false_cases`
- **実リポジトリ契約**: `cli_real_repo_exit_zero` (exit 0)

## 実行

```bash
python3 -m pytest tests/scripts-root/test_root__lint_doc_line_limit.py \
  tests/scripts-root/test_root__lint_mechanism_knowledge_boundary.py \
  tests/scripts-root/test_root__lint_portability_knowledge_optin.py -q
```

3 lint はいずれも実リポジトリに対し exit 0、CI (governance-check.yml の
change-category-guard job) に fail-closed (continue-on-error: false) で配線する。
