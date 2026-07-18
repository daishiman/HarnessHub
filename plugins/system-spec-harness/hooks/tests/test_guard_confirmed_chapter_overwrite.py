#!/usr/bin/env python3
"""guard-confirmed-chapter-overwrite hook の回帰テスト。

## テスト戦略

hook の判定精度を 3 つの観点で固定する:

1. **MUST_BLOCK (保護の担保)**: 確定物 (正本 spec-state.json / 確定章) への監査経路を
   経ない直接書換は、経路 (redirect / mutation / python / 動的 / 変数) を問わず遮断する。
   これを緩めると確定仕様が無断で書き換わるため、回帰の最重要ガード。
2. **MUST_PASS (過剰遮断の是正)**: 確定物に書き込まない操作 — 保護領域の read、記録・生成物
   (fetched-references.json / index.md / completeness-*) への正規書込、draft/新規章の編集、
   `2>/dev/null` を伴う read、リダイレクト先が具体的で安全な glob read — は通す。
   MVP (references/hook-guard-protection-scope.md 提案2) が是正した過剰遮断の回帰ガード。
3. **KNOWN_GAP (既知の保護漏れ・現状固定)**: hook は「二重化補助」であり表層文字列判定ゆえ
   変数分割・引数経由 writer ですり抜ける (docstring 自認)。これらを「現状 pass」として固定し、
   意図せず挙動が変わった (= 偶然塞がった/更に緩んだ) 場合に検知する。塞ぐのは別 issue。

判定は実 root に依存しないよう、tempfile で確定/draft/index/記録を持つ fixture root を組み、
`bash_decision(cmd, root)` と `decide(payload, root)` を直接呼ぶ。

実行: python3 -m unittest discover plugins/system-spec-harness/hooks/tests
"""
from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

_HOOK_PATH = Path(__file__).resolve().parents[1] / "guard-confirmed-chapter-overwrite.py"
_spec = importlib.util.spec_from_file_location("guard_hook", _HOOK_PATH)
guard = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(guard)


def _write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


class GuardTestBase(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)
        spec_dir = self.root / "system-spec"
        # 正本 spec-state: security.web=確定 / security.mobile=対象外 (両終端) + draft 用 未収集
        _write(
            spec_dir / "spec-state.json",
            json.dumps(
                {
                    "schema_version": "1.0",
                    "matrix": {
                        "security": {
                            "web": {"state": "確定", "qa_ref": "qa-1"},
                            "mobile": {"state": "対象外", "reason": "native なし"},
                        },
                        "frontend": {"web": {"state": "未収集"}},
                    },
                },
                ensure_ascii=False,
            ),
        )
        # 確定章 (全対応セル終端・非再オープン → protected)
        _write(
            spec_dir / "security.md",
            "---\nstatus: confirmed\ncategory: security\n"
            "spec_cells: [security.web, security.mobile]\n---\n\n# security\n",
        )
        # draft 章 (status:draft → pass)
        _write(spec_dir / "draft.md", "---\nstatus: draft\ncategory: frontend\n---\n\n# draft\n")
        # index (生成物・status 無し)
        _write(spec_dir / "index.md", "---\nkind: index\n---\n\n# index\n")
        # 記録 (取得ログ)
        _write(spec_dir / "fetched-references.json", json.dumps({"references": []}))

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def bash(self, cmd: str) -> int:
        return guard.bash_decision(cmd, self.root)[0]

    def write_tool(self, file_path: str) -> int:
        return guard.decide({"tool_name": "Write", "tool_input": {"file_path": file_path}}, self.root)[0]

    def edit_tool(self, file_path: str) -> int:
        return guard.decide({"tool_name": "Edit", "tool_input": {"file_path": file_path}}, self.root)[0]

    def abspath(self, rel: str) -> str:
        return str(self.root / rel)


class TestMustBlock(GuardTestBase):
    """確定物への監査経路を経ない書換は遮断する (保護の担保・回帰の要)。"""

    def test_redirect_to_spec_state(self):
        self.assertEqual(self.bash("echo x > system-spec/spec-state.json"), 2)

    def test_append_redirect_to_spec_state(self):
        self.assertEqual(self.bash("echo x >> system-spec/spec-state.json"), 2)

    def test_cp_to_spec_state(self):
        self.assertEqual(self.bash("cp /tmp/a system-spec/spec-state.json"), 2)

    def test_tee_to_spec_state(self):
        self.assertEqual(self.bash("echo x | tee system-spec/spec-state.json"), 2)

    def test_sed_inplace_spec_state(self):
        self.assertEqual(self.bash("sed -i 's/a/b/' system-spec/spec-state.json"), 2)

    def test_python_write_spec_state(self):
        self.assertEqual(self.bash("python3 -c \"open('system-spec/spec-state.json','w').write('x')\""), 2)

    def test_variable_redirect_to_spec_state(self):
        # 変数に正本パスのリテラルが残り、リダイレクト先が動的 → branch4 で遮断
        self.assertEqual(self.bash("F=system-spec/spec-state.json; echo x > $F"), 2)

    def test_redirect_to_confirmed_chapter(self):
        self.assertEqual(self.bash("echo x > system-spec/security.md"), 2)

    def test_cp_to_confirmed_chapter(self):
        self.assertEqual(self.bash("cp /tmp/a system-spec/security.md"), 2)

    def test_sed_inplace_confirmed_chapter(self):
        self.assertEqual(self.bash("sed -i 's/a/b/' system-spec/security.md"), 2)

    def test_glob_mutation_to_confirmed_area(self):
        # system-spec/*.md は列挙不能 glob = 確定物扱い + mutation + 動的 → 遮断
        self.assertEqual(self.bash("cp /tmp/a system-spec/*.md"), 2)

    def test_sed_glob_confirmed_area(self):
        self.assertEqual(self.bash("sed -i 's/a/b/' system-spec/*.md"), 2)

    def test_write_tool_spec_state(self):
        self.assertEqual(self.write_tool(self.abspath("system-spec/spec-state.json")), 2)

    def test_edit_tool_confirmed_chapter(self):
        self.assertEqual(self.edit_tool(self.abspath("system-spec/security.md")), 2)


class TestMustPass(GuardTestBase):
    """確定物に書き込まない操作は通す (過剰遮断の是正・MVP の回帰ガード)。"""

    def test_read_spec_state(self):
        self.assertEqual(self.bash("jq . system-spec/spec-state.json"), 0)

    def test_find_with_devnull(self):
        self.assertEqual(self.bash("find system-spec -name '*.md' 2>/dev/null"), 0)

    def test_wc_glob_read_to_tmp(self):
        self.assertEqual(self.bash("wc -l system-spec/*.md > /tmp/x"), 0)

    def test_grep_glob_read_to_tmp(self):
        self.assertEqual(self.bash("grep -l confirmed system-spec/*.md > /tmp/x"), 0)

    def test_read_then_echo_exit(self):
        # `; echo $?` の $ が動的指標だが read のみ → 通す
        self.assertEqual(self.bash("jq . system-spec/spec-state.json; echo $?"), 0)

    def test_fetched_references_cp(self):
        self.assertEqual(self.bash("cp /tmp/a system-spec/fetched-references.json"), 0)

    def test_fetched_references_cp_variable(self):
        # このセッションで頻出: scratchpad から記録を更新。$SCRATCH の $ で誤爆していた
        self.assertEqual(self.bash("cp $SCRATCH/x.json system-spec/fetched-references.json"), 0)

    def test_fetched_references_redirect(self):
        self.assertEqual(self.bash("echo x > system-spec/fetched-references.json"), 0)

    def test_build_fetched_references_out(self):
        # 正規 writer の --out 呼び出し ($ を含む) が通る
        self.assertEqual(
            self.bash("python3 build-fetched-references.py assemble --out system-spec/fetched-references.json"),
            0,
        )

    def test_index_md_write(self):
        self.assertEqual(self.bash("echo x > system-spec/index.md"), 0)

    def test_completeness_report_write(self):
        self.assertEqual(self.bash("cp $X system-spec/completeness-report.json"), 0)

    def test_draft_chapter_sed(self):
        self.assertEqual(self.bash("sed -i 's/a/b/' system-spec/draft.md"), 0)

    def test_draft_chapter_cp(self):
        self.assertEqual(self.bash("cp /tmp/a system-spec/draft.md"), 0)

    def test_new_chapter_cp(self):
        # 不在の具体 .md = 新規 draft 作成 → 通す
        self.assertEqual(self.bash("cp /tmp/a system-spec/newchap.md"), 0)

    def test_read_only_cat(self):
        self.assertEqual(self.bash("cat system-spec/security.md"), 0)

    def test_self_plugin_path_not_triggered(self):
        # system-spec-harness/ は保護領域 system-spec/ の部分文字列だが発火しない
        self.assertEqual(self.bash("cat plugins/system-spec-harness/hooks/x.py > /tmp/y"), 0)

    def test_write_tool_non_system_spec(self):
        self.assertEqual(self.write_tool("/tmp/x.md"), 0)

    def test_write_tool_draft_chapter(self):
        self.assertEqual(self.write_tool(self.abspath("system-spec/draft.md")), 0)

    def test_write_tool_index(self):
        self.assertEqual(self.write_tool(self.abspath("system-spec/index.md")), 0)

    def test_write_tool_fetched_references(self):
        self.assertEqual(self.write_tool(self.abspath("system-spec/fetched-references.json")), 0)


class TestKnownGaps(GuardTestBase):
    """既知の保護漏れ (FN)。hook は二重化補助ゆえ表層回避を許す。現状 pass を固定し挙動変化を検知。"""

    def test_variable_split_evasion_currently_passes(self):
        # `system-spec` を変数分割するとパスセグメント参照が外れて素通り (Class1 FN)
        self.assertEqual(self.bash("P=sys; Q=tem-spec; echo x > $P$Q/spec-state.json"), 0)

    def test_arg_based_writer_currently_passes(self):
        # --out で自前 open するラッパーは書込指標 (>/mutation/py open) を持たず素通り (Class2 FN)
        self.assertEqual(self.bash("python3 apply-spec-transition.py --out system-spec/spec-state.json"), 0)

    def test_multiedit_not_matched_currently_passes(self):
        # MultiEdit は matcher 非対象 + decide 未処理 (提案4 で是正予定)
        self.assertEqual(
            guard.decide(
                {"tool_name": "MultiEdit", "tool_input": {"file_path": self.abspath("system-spec/security.md")}},
                self.root,
            )[0],
            0,
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
