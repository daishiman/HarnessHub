"""lint-icon-ownership-boundary.py の発火条件を固定する (HarnessHub-pbrl)。

このゲートは「現状 0 件」を守るためのものなので、緑であること自体は証拠にならない
(何も検査していなくても緑になる)。故意に違反を仕込んだ木で赤くなること・正当な
書き方で赤くならないことの両方を固定して、初めてゲートとして機能する。
"""
from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = REPO_ROOT / "scripts" / "lint-icon-ownership-boundary.py"


def _load():
    spec = importlib.util.spec_from_file_location("lint_icon_ownership_boundary", SCRIPT)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _tree(tmp_path: Path, rel: str, source: str) -> Path:
    target = tmp_path / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(source, encoding="utf-8")
    return tmp_path


def test_icon_component_usage_is_clean(tmp_path: Path) -> None:
    mod = _load()
    root = _tree(
        tmp_path,
        "apps/hub/src/app/page.tsx",
        "import { Icon } from '@harness-hub/ui';\n"
        "export function Page() { return <Icon name=\"home\" />; }\n",
    )
    result = mod.lint(root)
    assert result["scanned_files"] == 1
    assert result["violations"] == []


def test_inline_svg_in_screen_code_is_a_violation(tmp_path: Path) -> None:
    mod = _load()
    root = _tree(
        tmp_path,
        "apps/hub/src/app/page.tsx",
        "export function Page() {\n"
        '  return <svg viewBox="0 0 24 24"><path d="M4 4h16" /></svg>;\n'
        "}\n",
    )
    result = mod.lint(root)
    assert [v["rule"] for v in result["violations"]] == ["inline-svg"]
    assert result["violations"][0]["line"] == 2


def test_svg_string_and_data_uri_are_violations(tmp_path: Path) -> None:
    """dangerouslySetInnerHTML / data URI という迂回路も塞ぐ。"""
    mod = _load()
    root = _tree(
        tmp_path,
        "apps/hub/src/components/Badge.tsx",
        "const mark = 'data:image/svg+xml;utf8,PHN2Zz4=';\n"
        "export const html = { __html: '<svg><circle r=\"2\" /></svg>' };\n",
    )
    rules = sorted(v["rule"] for v in mod.lint(root)["violations"])
    assert rules == ["inline-svg", "svg-source"]


def test_emoji_used_as_icon_is_a_violation(tmp_path: Path) -> None:
    mod = _load()
    root = _tree(
        tmp_path,
        "apps/hub/src/app/notice.tsx",
        "export function Notice() { return <span>\U0001f4a1 ヒント</span>; }\n",
    )
    result = mod.lint(root)
    assert [v["rule"] for v in result["violations"]] == ["emoji-icon"]


def test_comments_are_exempt(tmp_path: Path) -> None:
    """根拠をコメントに書いた瞬間に落ちる lint は、説明を消す圧力になる。"""
    mod = _load()
    root = _tree(
        tmp_path,
        "apps/hub/src/app/page.tsx",
        "// <svg> を直接書かず Icon を使う。\U0001f4a1 のような絵文字も使わない。\n"
        "/* data:image/svg+xml の持ち込みも同じ理由で禁止。 */\n"
        "export const ok = true;\n",
    )
    assert mod.lint(root)["violations"] == []


def test_url_in_string_does_not_hide_the_rest_of_the_line(tmp_path: Path) -> None:
    """文字列中の `//` をコメント開始と誤読すると、その先の違反を見逃す。"""
    mod = _load()
    root = _tree(
        tmp_path,
        "apps/hub/src/app/page.tsx",
        "const s = 'https://example.com/a' + '<svg />';\n",
    )
    assert [v["rule"] for v in mod.lint(root)["violations"]] == ["inline-svg"]


def test_test_files_are_out_of_scope(tmp_path: Path) -> None:
    """テストは出荷される画面ではなく、検査用の被写体を組み立てる正当な理由がある。"""
    mod = _load()
    root = _tree(
        tmp_path,
        "apps/hub/src/__tests__/icon.test.tsx",
        "const fixture = '<svg />';\n",
    )
    result = mod.lint(root)
    assert result["scanned_files"] == 0
    assert result["violations"] == []


def test_arrow_characters_are_not_treated_as_emoji(tmp_path: Path) -> None:
    """日本語の説明でよく使う `→` `↔` で落ち始めると lint が信用されなくなる。"""
    mod = _load()
    root = _tree(
        tmp_path,
        "apps/hub/src/app/page.tsx",
        "export const label = '下書き → 公開 (差し戻しは 公開 ↔ 下書き)';\n",
    )
    assert mod.lint(root)["violations"] == []


def test_allowlist_requires_a_reason_and_downgrades_to_allowed(tmp_path: Path) -> None:
    mod = _load()
    root = _tree(
        tmp_path,
        "apps/hub/src/app/page.tsx",
        "export const html = { __html: '<svg />' };\n",
    )
    mod.ALLOWLIST["apps/hub/src/app/page.tsx"] = "移行中: HarnessHub-xxxx で解消予定"
    result = mod.lint(root)
    assert result["violations"] == []
    assert result["allowed"][0]["allow_reason"].startswith("移行中")


def test_allowlist_baseline_is_empty() -> None:
    """0 件が現状。エントリを増やして緑にするのは禁止 (縮小のみが正)。"""
    assert _load().ALLOWLIST == {}


def test_repository_is_currently_clean() -> None:
    """実リポジトリで緑。ここが赤くなったら供給元が割れたということ。"""
    proc = subprocess.run(
        [sys.executable, str(SCRIPT), "--repo-root", str(REPO_ROOT), "--json"],
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, proc.stdout + proc.stderr
    import json

    payload = json.loads(proc.stdout)
    # 0 件検査の緑と違反なしの緑を取り違えないため、検査件数そのものを主張する。
    assert payload["scanned_files"] > 0
    assert payload["violations"] == []
