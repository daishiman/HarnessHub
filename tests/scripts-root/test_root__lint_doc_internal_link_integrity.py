"""scripts/lint-doc-internal-link-integrity.py の genuine で網羅的な機能テスト (network 不要)。

HarnessHub-j7a4 の md 本文 dangling path 検査。純関数 (normalize_token /
extract_candidates / strip_fenced_blocks / scan) を in-process で網羅し、
subprocess で実 CLI の exit code と zero attribution 出力も確認する。
tmp git repo を作って git 追跡限定の走査も踏む。

カバー:
- gate liveness: 意図的に dangling を仕込んだ fixture で exit が 0 → 1 へ反転する
- MUST_PASS: 実在 path のみなら exit 0 / fenced block 内の dangling は無視
- zero attribution: 「検査対象 0」と「違反 0」が別の NOTE として区別される
- 誤検出の除外: URL / anchor / 絶対 path / glob / 省略記法 (...) / 行番号サフィックス
- ratchet: --max-violations で許容し、下回れば締めるよう NOTE が出る
- 設定エラー (exit 2): 存在しない repo-root / 負の --max-violations
- 実リポジトリ CLI 実行が現行 baseline 上限で exit 0 (契約テスト)

network: false, keychain: なし, 実ファイル書換: なし (tmp_path のみ)。
"""
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "lint-doc-internal-link-integrity.py"

SPEC = importlib.util.spec_from_file_location("lint_doc_internal_link_integrity_uut", SCRIPT)
MOD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MOD)

# 実 repo の現行 baseline。allowlist を置かず件数だけで ratchet する方針のため、
# この上限は「減る方向にしか動かさない」。CI (governance-check.yml) と local gate
# (run-ci-checks.sh) に書く --max-violations と同じ値に保つこと。
# 308 (2026-08-11 初回) -> 302 (2026-08-12, HarnessHub-9am.3 の merge で
# design-review-notes.md が実在化し、それを指していた 6 件が解消)。
REAL_REPO_MAX_VIOLATIONS = 302


def _git(repo: Path, *args: str) -> None:
    subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True, text=True)


def _make_repo(tmp_path: Path) -> Path:
    repo = tmp_path / "repo"
    (repo / "docs").mkdir(parents=True)
    (repo / "scripts").mkdir()
    (repo / "scripts" / "real.py").write_text("# real\n", encoding="utf-8")
    _git(repo.parent, "init", "-q", str(repo))
    _git(repo, "config", "user.email", "t@example.com")
    _git(repo, "config", "user.name", "t")
    return repo


def _commit_all(repo: Path) -> None:
    _git(repo, "add", "-A")
    _git(repo, "commit", "-q", "-m", "t")


def _run(repo: Path, *extra: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(SCRIPT), "--repo-root", str(repo), *extra],
        capture_output=True, text=True,
    )


# ── normalize_token: 誤検出の除外規則 ────────────────────────────────────────
@pytest.mark.parametrize("token", [
    "https://example.com/a/b",          # URL
    "#anchor",                          # ページ内アンカー
    "mailto:a@example.com/x",           # mailto
    "/abs/path/file.md",                # 絶対 path (環境依存)
    "../sibling/file.md",               # 親方向の相対 path (基準位置が解けない)
    "docs/**/*.md",                     # glob
    "docs/${NAME}/x.md",                # 変数展開
    "docs/<placeholder>/x.md",          # プレースホルダ
    "docs/.../x.md",                    # 省略記法
    "single-token-no-slash",            # / を含まない
    "",                                 # 空
])
def test_normalize_token_rejects_non_path(token):
    assert MOD.normalize_token(token) is None


@pytest.mark.parametrize("token,expected", [
    ("docs/a/b.md", "docs/a/b.md"),
    ("./docs/a/b.md", "docs/a/b.md"),               # 先頭 ./ を剥がす
    ("docs/a/b.md#sec", "docs/a/b.md"),             # anchor を落とす
    ("docs/a/b.md?x=1", "docs/a/b.md"),             # query を落とす
    ("apps/hub/x.ts:120", "apps/hub/x.ts"),         # 行番号
    ("apps/hub/x.ts:120-140", "apps/hub/x.ts"),     # 行範囲
    ("tests/a/t.py::test_x", "tests/a/t.py"),       # pytest node id
    ("(docs/a/b.md)", "docs/a/b.md"),               # 括弧に包まれた埋め込み
    ("docs/a/b.md。", "docs/a/b.md"),                # 日本語句点
    ("`docs/a/b.md`,", "docs/a/b.md"),
])
def test_normalize_token_normalizes(token, expected):
    assert MOD.normalize_token(token) == expected


# ── extract_candidates: code span とリンクの両経路 ──────────────────────────
def test_extract_candidates_from_code_span_command():
    # code span はコマンド全体であることが多いので token 分割が要る。
    line = "実行: `python3 scripts/real.py --repo-root .` を使う"
    assert MOD.extract_candidates(line) == ["scripts/real.py"]


def test_extract_candidates_from_markdown_link():
    line = "詳細は [設計](docs/features/x/design.md) を参照"
    assert MOD.extract_candidates(line) == ["docs/features/x/design.md"]


def test_extract_candidates_mixed_and_multiple():
    line = "`a/b.md` と `c/d.md`、[e](f/g.md)"
    assert MOD.extract_candidates(line) == ["a/b.md", "c/d.md", "f/g.md"]


# ── strip_fenced_blocks ─────────────────────────────────────────────────────
def test_strip_fenced_blocks_excludes_fenced_content():
    text = "before\n```bash\ninside/fence.md\n```\nafter\n"
    kept = [line for _, line in MOD.strip_fenced_blocks(text)]
    assert kept == ["before", "after"]


def test_strip_fenced_blocks_keeps_line_numbers():
    text = "a\n```\nx\n```\nb\n"
    assert MOD.strip_fenced_blocks(text) == [(1, "a"), (5, "b")]


def test_strip_fenced_blocks_tilde_fence_and_mismatched_marker():
    # ~~~ で開いた block は ``` では閉じない (同種 fence 文字のみ閉じる)。
    text = "a\n~~~\n```\nx\n~~~\nb\n"
    kept = [line for _, line in MOD.strip_fenced_blocks(text)]
    assert kept == ["a", "b"]


# ── gate liveness: 仕込んだ dangling で検査が反転する ───────────────────────
def test_gate_liveness_dangling_flips_exit_code(tmp_path):
    repo = _make_repo(tmp_path)
    doc = repo / "docs" / "guide.md"

    # 1) 実在 path のみ → PASS
    doc.write_text("実装は `scripts/real.py` にある\n", encoding="utf-8")
    _commit_all(repo)
    ok = _run(repo)
    assert ok.returncode == 0, ok.stdout + ok.stderr

    # 2) dangling を 1 件仕込む → FAIL へ反転
    doc.write_text(
        "実装は `scripts/real.py` にある\n"
        "設計は [design](docs/nonexistent/design.md) を参照\n",
        encoding="utf-8",
    )
    _commit_all(repo)
    ng = _run(repo)
    assert ng.returncode == 1, ng.stdout + ng.stderr
    assert "docs/nonexistent/design.md" in ng.stderr
    assert "docs/guide.md:2" in ng.stderr


def test_fenced_block_dangling_is_not_a_violation(tmp_path):
    repo = _make_repo(tmp_path)
    (repo / "docs" / "guide.md").write_text(
        "```bash\npython3 scripts/does-not-exist.py\n```\n", encoding="utf-8"
    )
    _commit_all(repo)
    res = _run(repo)
    assert res.returncode == 0, res.stdout + res.stderr


def test_untracked_document_is_not_scanned(tmp_path):
    repo = _make_repo(tmp_path)
    (repo / "docs" / "tracked.md").write_text("`scripts/real.py`\n", encoding="utf-8")
    _commit_all(repo)
    # 未追跡の草稿に dangling があっても検査対象外 (並行編集を新規違反にしない)。
    (repo / "docs" / "draft.md").write_text("`scripts/ghost.py`\n", encoding="utf-8")
    res = _run(repo)
    assert res.returncode == 0, res.stdout + res.stderr


# ── zero attribution: 未検査と違反 0 を区別する ─────────────────────────────
def test_zero_attribution_no_documents(tmp_path):
    repo = _make_repo(tmp_path)
    (repo / "scripts" / "x.py").write_text("#\n", encoding="utf-8")
    _commit_all(repo)  # docs/ 配下に追跡 md が無い
    res = _run(repo, "--json")
    assert res.returncode == 0
    payload = json.loads(res.stdout)
    assert payload["checked_documents"] == 0
    assert payload["violation_count"] == 0
    assert any("未検査" in n for n in payload["notes"])


def test_zero_attribution_no_references(tmp_path):
    repo = _make_repo(tmp_path)
    (repo / "docs" / "guide.md").write_text("path 参照を含まない本文\n", encoding="utf-8")
    _commit_all(repo)
    res = _run(repo, "--json")
    assert res.returncode == 0
    payload = json.loads(res.stdout)
    assert payload["checked_documents"] == 1
    assert payload["checked_references"] == 0
    assert any("検査対象参照が無い" in n for n in payload["notes"])


def test_checked_counts_are_always_reported(tmp_path):
    repo = _make_repo(tmp_path)
    (repo / "docs" / "guide.md").write_text("`scripts/real.py`\n", encoding="utf-8")
    _commit_all(repo)
    res = _run(repo)
    assert res.returncode == 0
    # 「違反 0」を裸で出さない。必ず検査母数を添える。
    assert "検査 1 文書 / 1 参照" in res.stdout


# ── ratchet (--max-violations) ──────────────────────────────────────────────
def test_max_violations_allows_baseline_and_notes_tightening(tmp_path):
    repo = _make_repo(tmp_path)
    (repo / "docs" / "guide.md").write_text(
        "`scripts/ghost-a.py` と `scripts/ghost-b.py`\n", encoding="utf-8"
    )
    _commit_all(repo)
    assert _run(repo).returncode == 1               # 既定 0 では落ちる
    assert _run(repo, "--max-violations", "2").returncode == 0  # baseline 固定で通る
    assert _run(repo, "--max-violations", "1").returncode == 1  # 上限超過は落ちる

    res = _run(repo, "--max-violations", "5", "--json")
    payload = json.loads(res.stdout)
    assert res.returncode == 0
    assert payload["violation_count"] == 2
    assert any("引き下げて" in n for n in payload["notes"])


# ── 設定エラー (exit 2) ─────────────────────────────────────────────────────
def test_missing_repo_root_is_config_error(tmp_path):
    res = subprocess.run(
        [sys.executable, str(SCRIPT), "--repo-root", str(tmp_path / "nope")],
        capture_output=True, text=True,
    )
    assert res.returncode == 2
    assert "設定エラー" in res.stderr


def test_negative_max_violations_is_config_error(tmp_path):
    repo = _make_repo(tmp_path)
    _commit_all(repo)
    res = _run(repo, "--max-violations", "-1")
    assert res.returncode == 2
    assert "設定エラー" in res.stderr


# ── 実リポジトリ契約テスト ──────────────────────────────────────────────────
def test_real_repository_stays_within_recorded_baseline():
    """実 repo が記録済み baseline 上限内であること (肥大の逆戻り防止)。"""
    res = subprocess.run(
        [sys.executable, str(SCRIPT), "--repo-root", str(ROOT),
         "--max-violations", str(REAL_REPO_MAX_VIOLATIONS), "--json"],
        capture_output=True, text=True,
    )
    assert res.returncode == 0, res.stdout + res.stderr
    payload = json.loads(res.stdout)
    assert payload["checked_documents"] > 0, "検査対象 0 は合格ではない (zero attribution)"
    assert payload["checked_references"] > 0
    assert payload["violation_count"] <= REAL_REPO_MAX_VIOLATIONS
