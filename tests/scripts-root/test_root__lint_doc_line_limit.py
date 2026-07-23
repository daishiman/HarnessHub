"""scripts/lint-doc-line-limit.py の genuine で網羅的な機能テスト (network 不要)。

qa-070 の 300 行 fail-closed lint。純関数 (count_lines / load_allowlist /
list_tracked_docs / evaluate) を in-process で網羅し、subprocess で実 CLI の
exit code も確認する。tmp git repo で git 追跡限定の走査も踏む。

カバー:
- MUST_DETECT (exit 非0): allowlist 外の 300 行超新規違反 / allowlist baseline 超過肥大
- MUST_PASS  (exit 0): 上限以内 / allowlist baseline ちょうど / baseline 未満へ縮小
- ratchet NOTE: 縮小追随の促し / 上限以内へ卒業 / stale entry
- git 追跡限定: 未追跡ファイルは検査対象外 (親の並行編集と衝突しない設計)
- allowlist schema エラー (exit 2)
- 実リポジトリ CLI 実行が exit 0 (契約テスト)

network: false, keychain: なし, 実ファイル書換: なし (tmp_path のみ)。
"""
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "lint-doc-line-limit.py"

SPEC = importlib.util.spec_from_file_location("lint_doc_line_limit_uut", SCRIPT)
MOD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MOD)


def _write_lines(path: Path, n: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(f"line {i}" for i in range(n)) + "\n", encoding="utf-8")


def _allowlist(tmp_path: Path, entries, limit=300) -> Path:
    p = tmp_path / "allow.json"
    p.write_text(json.dumps({
        "line_limit": limit,
        "allowlist": [
            {"path": pth, "baseline_line_count": base, "reason": "t"}
            for pth, base in entries
        ],
    }), encoding="utf-8")
    return p


# ── count_lines ──────────────────────────────────────────────────────────────
def test_count_lines_matches_splitlines(tmp_path):
    f = tmp_path / "a.md"
    f.write_text("a\nb\nc", encoding="utf-8")  # 末尾改行なし
    assert MOD.count_lines(f) == 3
    f.write_text("a\nb\nc\n", encoding="utf-8")  # 末尾改行あり → 同数
    assert MOD.count_lines(f) == 3


# ── load_allowlist ───────────────────────────────────────────────────────────
def test_load_allowlist_ok(tmp_path):
    p = _allowlist(tmp_path, [("docs/x.md", 400)], limit=300)
    limit, m = MOD.load_allowlist(p)
    assert limit == 300 and m == {"docs/x.md": 400}


def test_load_allowlist_missing_file(tmp_path):
    with pytest.raises(FileNotFoundError):
        MOD.load_allowlist(tmp_path / "nope.json")


@pytest.mark.parametrize("bad", [
    "[]",  # 最上位が配列
    '{"line_limit": 0, "allowlist": []}',  # 非正の limit
    '{"allowlist": [{"path": "", "baseline_line_count": 400}]}',  # 空 path
    '{"allowlist": [{"path": "a", "baseline_line_count": 0}]}',  # 非正 baseline
    '{"allowlist": [{"path": "a", "baseline_line_count": 4},'
    '{"path": "a", "baseline_line_count": 5}]}',  # 重複 path
    "not-json",
])
def test_load_allowlist_malformed(tmp_path, bad):
    p = tmp_path / "bad.json"
    p.write_text(bad, encoding="utf-8")
    with pytest.raises((ValueError,)):
        MOD.load_allowlist(p)


# ── evaluate: MUST_DETECT ────────────────────────────────────────────────────
def test_evaluate_new_violation_over_limit(tmp_path):
    _write_lines(tmp_path / "docs" / "big.md", 301)
    v, _ = MOD.evaluate(tmp_path, ["docs/big.md"], 300, {})
    assert len(v) == 1 and "doc-line-limit" in v[0] and "docs/big.md" in v[0]


def test_evaluate_allowlist_growth_beyond_baseline(tmp_path):
    _write_lines(tmp_path / "docs" / "big.md", 500)
    v, _ = MOD.evaluate(tmp_path, ["docs/big.md"], 300, {"docs/big.md": 400})
    assert len(v) == 1 and "doc-line-ratchet" in v[0]


# ── evaluate: MUST_PASS ──────────────────────────────────────────────────────
def test_evaluate_within_limit_pass(tmp_path):
    _write_lines(tmp_path / "docs" / "small.md", 299)
    v, notes = MOD.evaluate(tmp_path, ["docs/small.md"], 300, {})
    assert v == [] and notes == []


def test_evaluate_at_limit_boundary_pass(tmp_path):
    _write_lines(tmp_path / "docs" / "edge.md", 300)  # 300 ちょうどは PASS
    v, _ = MOD.evaluate(tmp_path, ["docs/edge.md"], 300, {})
    assert v == []


def test_evaluate_allowlist_at_baseline_pass(tmp_path):
    _write_lines(tmp_path / "docs" / "big.md", 400)
    v, notes = MOD.evaluate(tmp_path, ["docs/big.md"], 300, {"docs/big.md": 400})
    assert v == [] and notes == []


def test_evaluate_allowlist_shrunk_pass_with_note(tmp_path):
    _write_lines(tmp_path / "docs" / "big.md", 350)
    v, notes = MOD.evaluate(tmp_path, ["docs/big.md"], 300, {"docs/big.md": 400})
    assert v == []
    assert any("縮小" in n and "docs/big.md" in n for n in notes)


def test_evaluate_allowlist_graduated_note(tmp_path):
    _write_lines(tmp_path / "docs" / "big.md", 280)  # 上限以内へ縮小 → 卒業 NOTE
    v, notes = MOD.evaluate(tmp_path, ["docs/big.md"], 300, {"docs/big.md": 400})
    assert v == []
    assert any("卒業" in n for n in notes)


def test_evaluate_stale_allowlist_entry_note(tmp_path):
    v, notes = MOD.evaluate(tmp_path, [], 300, {"docs/gone.md": 400})
    assert v == []
    assert any("存在しない" in n for n in notes)


# ── list_tracked_docs: git 追跡限定 (未追跡は対象外) ─────────────────────────
def _git(tmp_path, *args):
    subprocess.run(["git", "-C", str(tmp_path), *args], check=True,
                   capture_output=True, text=True)


def test_list_tracked_docs_excludes_untracked(tmp_path):
    _git(tmp_path, "init", "-q")
    _git(tmp_path, "config", "user.email", "t@t")
    _git(tmp_path, "config", "user.name", "t")
    _write_lines(tmp_path / "docs" / "tracked.md", 10)
    _write_lines(tmp_path / "docs" / "untracked.md", 999)  # 巨大だが未追跡
    _git(tmp_path, "add", "docs/tracked.md")
    _git(tmp_path, "commit", "-qm", "init")
    tracked = MOD.list_tracked_docs(tmp_path)
    assert tracked == ["docs/tracked.md"]  # 未追跡の巨大ファイルは含まれない


def test_list_tracked_docs_not_a_repo_raises(tmp_path):
    (tmp_path / "docs").mkdir()
    with pytest.raises(RuntimeError):
        MOD.list_tracked_docs(tmp_path)


# ── main / CLI ───────────────────────────────────────────────────────────────
def _init_repo_with_allowlist(tmp_path, doc_lines, allow_entries):
    _git(tmp_path, "init", "-q")
    _git(tmp_path, "config", "user.email", "t@t")
    _git(tmp_path, "config", "user.name", "t")
    for rel, n in doc_lines.items():
        _write_lines(tmp_path / rel, n)
    al = tmp_path / "scripts" / "doc-line-limit-allowlist.json"
    al.parent.mkdir(parents=True, exist_ok=True)
    al.write_text(json.dumps({
        "line_limit": 300,
        "allowlist": [
            {"path": p, "baseline_line_count": b, "reason": "t"}
            for p, b in allow_entries
        ],
    }), encoding="utf-8")
    _git(tmp_path, "add", "-A")
    _git(tmp_path, "commit", "-qm", "init")


def test_main_exit0_clean_repo(tmp_path, capsys):
    _init_repo_with_allowlist(tmp_path, {"docs/a.md": 10, "docs/big.md": 400},
                              [("docs/big.md", 400)])
    rc = MOD.main(["--repo-root", str(tmp_path)])
    assert rc == 0
    assert "OK:" in capsys.readouterr().out


def test_main_exit1_new_violation(tmp_path, capsys):
    _init_repo_with_allowlist(tmp_path, {"docs/huge.md": 301}, [])
    rc = MOD.main(["--repo-root", str(tmp_path)])
    assert rc == 1
    assert "VIOLATION" in capsys.readouterr().err


def test_main_exit2_bad_allowlist(tmp_path):
    (tmp_path / "docs").mkdir()
    bad = tmp_path / "al.json"
    bad.write_text("[]", encoding="utf-8")
    rc = MOD.main(["--repo-root", str(tmp_path), "--allowlist", str(bad)])
    assert rc == 2


# ── 実リポジトリ契約 (allowlist 込みで exit 0) ──────────────────────────────
def test_cli_real_repo_exit_zero():
    res = subprocess.run([sys.executable, str(SCRIPT), "--repo-root", str(ROOT)],
                         text=True, capture_output=True)
    assert res.returncode == 0, f"stdout={res.stdout}\nstderr={res.stderr}"
