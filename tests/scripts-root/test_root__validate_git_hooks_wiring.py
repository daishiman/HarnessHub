"""scripts/validate-git-hooks-wiring.py の機能テスト (network 不要)。

issue-worktree-main-ref-desync-20260728 受入条件 3 の検証。
「hook が beads 更新で消えないこと、または消失を検知できること」を、配線の各要素を
1 つずつ壊して検知されることで確認する。

core.hooksPath はリポジトリに 1 つしか設定できず、beads の .beads/hooks と repo の
.githooks が競合する。hook は「存在するのに呼ばれない」形で死ぬため失敗が起きず、
検知手段が無いと永久に気づけない。

カバー:
- 完全な配線 -> violation なし
- 主経路 (.githooks) の欠落・実行権限欠落・ガード/委譲の結線漏れを個別に検知
- 共有 bundle へコピーする tracked guard script の欠落を検知
- 保険経路 (.beads/hooks) のガード呼び出し消失 (= beads 上書き) を検知
- --check-local-config: core.hooksPath 未設定 / 別ディレクトリ指定を検知
- 実リポジトリの配線が実際に通ること (契約テスト)

network: false, keychain: なし, 実ファイル書換: なし (tmp_path のみ)。
"""
import importlib.util
import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "validate-git-hooks-wiring.py"

SPEC = importlib.util.spec_from_file_location("validate_git_hooks_wiring_uut", SCRIPT)
MOD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MOD)


def _build_wiring(root: Path) -> Path:
    """検査に通る完全な配線を tmp 上に組み立てる。"""
    githooks = root / ".githooks"
    (githooks / "lib").mkdir(parents=True, exist_ok=True)
    for lib in MOD.LIB_FILES:
        path = githooks / "lib" / lib
        path.write_text("#!/usr/bin/env sh\nexit 0\n", encoding="utf-8")
        path.chmod(0o755)

    for hook, need in MOD.HOOKS.items():
        body = ["#!/usr/bin/env sh"]
        if need["guard"]:
            body.append(f'sh "$ROOT/.githooks/lib/{MOD.GUARD_MARKER}" {hook} "$@"')
        if need["delegate"]:
            body.append(f'exec sh "$ROOT/.githooks/lib/{MOD.DELEGATE_MARKER}" {hook} "$@"')
        path = githooks / hook
        path.write_text("\n".join(body) + "\n", encoding="utf-8")
        path.chmod(0o755)

    beads_hooks = root / ".beads" / "hooks"
    beads_hooks.mkdir(parents=True, exist_ok=True)
    for hook, need in MOD.HOOKS.items():
        if not need["guard"]:
            continue
        path = beads_hooks / hook
        path.write_text(
            f'#!/usr/bin/env sh\nsh "$root/.githooks/lib/{MOD.GUARD_MARKER}" {hook} "$@"\n',
            encoding="utf-8",
        )
        path.chmod(0o755)

    scripts_root = root / "scripts"
    scripts_root.mkdir()
    for script in MOD.BUNDLE_SCRIPT_FILES:
        (scripts_root / script).write_text(
            f"#!/usr/bin/env python3\n# {script}\n", encoding="utf-8"
        )
    return root


@pytest.fixture
def wired(tmp_path):
    return _build_wiring(tmp_path / "repo")


def test_complete_wiring_has_no_violations(wired):
    assert MOD.check_wiring(wired) == []


def test_detects_missing_primary_hook(wired):
    (wired / ".githooks" / "pre-commit").unlink()
    violations = MOD.check_wiring(wired)
    assert any("pre-commit" in v and "存在しません" in v for v in violations)


def test_detects_non_executable_hook(wired):
    (wired / ".githooks" / "pre-commit").chmod(0o644)
    violations = MOD.check_wiring(wired)
    assert any("実行権限" in v for v in violations)


def test_detects_missing_guard_call(wired):
    """ガード呼び出しだけ消された hook (中身が空洞化した状態) を検知する。"""
    (wired / ".githooks" / "pre-commit").write_text(
        f'#!/usr/bin/env sh\nexec sh lib/{MOD.DELEGATE_MARKER} pre-commit "$@"\n',
        encoding="utf-8",
    )
    (wired / ".githooks" / "pre-commit").chmod(0o755)
    violations = MOD.check_wiring(wired)
    assert any(MOD.GUARD_MARKER in v for v in violations)


def test_detects_missing_beads_delegation(wired):
    """beads 委譲が失われると課題の自動同期が無言で止まるため検知する。"""
    (wired / ".githooks" / "post-merge").write_text(
        "#!/usr/bin/env sh\nexit 0\n", encoding="utf-8"
    )
    (wired / ".githooks" / "post-merge").chmod(0o755)
    violations = MOD.check_wiring(wired)
    assert any(MOD.DELEGATE_MARKER in v and "post-merge" in v for v in violations)


def test_detects_missing_lib(wired):
    (wired / ".githooks" / "lib" / "run-repo-guards.sh").unlink()
    violations = MOD.check_wiring(wired)
    assert any("run-repo-guards.sh" in v and "存在しません" in v for v in violations)


def test_detects_missing_tracked_bundle_script(wired):
    """install 済みコピーだけが残る状態を CI の tracked 配線検査で検知する。"""
    (wired / "scripts" / "guard-worktree-desync.py").unlink()
    violations = MOD.check_wiring(wired)
    assert any(
        "scripts/guard-worktree-desync.py" in v
        and "tracked source" in v
        for v in violations
    )


def test_detects_beads_overwrite_of_fallback_guard(wired):
    """beads が .beads/hooks を再生成し保険経路のガード呼び出しが消えた状態。"""
    (wired / ".beads" / "hooks" / "pre-commit").write_text(
        "#!/usr/bin/env sh\n# --- BEGIN BEADS INTEGRATION v1.1.0 ---\n"
        "bd hooks run pre-commit \"$@\"\n"
        "# --- END BEADS INTEGRATION v1.1.0 ---\n",
        encoding="utf-8",
    )
    violations = MOD.check_wiring(wired)
    assert any(".beads/hooks/pre-commit" in v and "失われ" in v for v in violations)


def test_detects_missing_beads_reference_transaction(wired):
    (wired / ".beads" / "hooks" / "reference-transaction").unlink()
    violations = MOD.check_wiring(wired)
    assert any("reference-transaction" in v and "保険経路" in v for v in violations)


def test_reference_transaction_is_not_delegated():
    """stdin をガードが消費するため beads へは委譲しない (設計判断の固定)。"""
    assert MOD.HOOKS["reference-transaction"]["delegate"] is False
    assert MOD.HOOKS["reference-transaction"]["guard"] is True


# ── core.hooksPath (ローカル設定) の検査 ────────────────────────────────────

def _git(cwd, *args):
    env = dict(os.environ)
    env.setdefault("GIT_CONFIG_NOSYSTEM", "1")
    return subprocess.run(
        ["git", *args], cwd=str(cwd), capture_output=True, text=True,
        env=env, check=True,
    )


def _install_shared_bundle(repo: Path) -> Path:
    """tracked template を git common dir の共有 bundle へ模擬設置する。"""
    installed = MOD.shared_hooks_root(repo)
    assert installed is not None
    shutil.copytree(repo / ".githooks", installed)

    source_scripts = repo / "scripts"
    installed_scripts = installed / "scripts"
    source_scripts.mkdir(exist_ok=True)
    installed_scripts.mkdir()
    for script in MOD.BUNDLE_SCRIPT_FILES:
        source = source_scripts / script
        source.write_text(f"#!/usr/bin/env python3\n# {script}\n", encoding="utf-8")
        shutil.copy2(source, installed_scripts / script)

    _git(repo, "config", "core.hooksPath", str(installed))
    return installed


def test_detects_unconfigured_hooks_path(tmp_path):
    repo = _build_wiring(tmp_path / "repo")
    _git(repo, "init", "-b", "main")
    violations = MOD.check_wiring(repo, check_local_config=True)
    assert any("core.hooksPath が未設定" in v for v in violations)


def test_detects_hooks_path_pointing_elsewhere(tmp_path):
    """beads が core.hooksPath を .beads/hooks へ戻した状態を検知する。"""
    repo = _build_wiring(tmp_path / "repo")
    _git(repo, "init", "-b", "main")
    _git(repo, "config", "core.hooksPath", ".beads/hooks")
    violations = MOD.check_wiring(repo, check_local_config=True)
    assert any("core.hooksPath" in v and ".beads/hooks" in v for v in violations)


def test_rejects_relative_per_worktree_hooks_path(tmp_path):
    """相対 .githooks は古い branch の worktree で hook が欠落するため許可しない。"""
    repo = _build_wiring(tmp_path / "repo")
    _git(repo, "init", "-b", "main")
    _git(repo, "config", "core.hooksPath", ".githooks")
    violations = MOD.check_wiring(repo, check_local_config=True)
    assert any("core.hooksPath" in v and ".githooks" in v for v in violations)


def test_accepts_correct_hooks_path(tmp_path):
    repo = _build_wiring(tmp_path / "repo")
    _git(repo, "init", "-b", "main")
    _install_shared_bundle(repo)
    assert MOD.check_wiring(repo, check_local_config=True) == []


def test_detects_stale_installed_bundle(tmp_path):
    repo = _build_wiring(tmp_path / "repo")
    _git(repo, "init", "-b", "main")
    installed = _install_shared_bundle(repo)
    (repo / ".githooks" / "pre-commit").write_text(
        "#!/usr/bin/env sh\n# updated tracked template\n"
        "run-repo-guards.sh\ndelegate-beads.sh\n",
        encoding="utf-8",
    )
    violations = MOD.check_wiring(repo, check_local_config=True)
    assert any("tracked template より古い" in v and str(installed) in v for v in violations)


def test_installed_bundle_can_validate_without_branch_templates(tmp_path):
    """古い branch に .githooks が無くても共有 bundle 自身は検査できる。"""
    repo = _build_wiring(tmp_path / "repo")
    _git(repo, "init", "-b", "main")
    installed = _install_shared_bundle(repo)
    shutil.rmtree(repo / ".githooks")
    shutil.rmtree(repo / "scripts")
    assert MOD.check_installed_wiring(repo, installed) == []


def test_installed_bundle_detects_stale_template_before_push(tmp_path):
    """pre-push の installed-only 経路でも再 install 忘れを fail-closed にする。"""
    repo = _build_wiring(tmp_path / "repo")
    _git(repo, "init", "-b", "main")
    installed = _install_shared_bundle(repo)
    (repo / "scripts" / "guard-worktree-desync.py").write_text(
        "#!/usr/bin/env python3\n# updated after install\n",
        encoding="utf-8",
    )
    violations = MOD.check_installed_wiring(repo, installed)
    assert any(
        "tracked template より古い" in v
        and "guard-worktree-desync.py" in v
        for v in violations
    )


def test_installer_blocks_cross_worktree_update_from_legacy_branch(tmp_path):
    """共有 bundle は新しい hook を持たない古い branch の worktree からも発火する。"""
    repo = tmp_path / "repo"
    repo.mkdir()
    _git(repo, "init", "-b", "main")
    _git(repo, "config", "user.email", "t@example.com")
    _git(repo, "config", "user.name", "tester")
    (repo / "a.txt").write_text("a\n", encoding="utf-8")
    _git(repo, "add", "-A")
    _git(repo, "commit", "-m", "A")
    commit_a = _git(repo, "rev-parse", "HEAD").stdout.strip()

    legacy = tmp_path / "legacy"
    _git(repo, "worktree", "add", "-b", "legacy", str(legacy))

    (repo / "b.txt").write_text("b\n", encoding="utf-8")
    _git(repo, "add", "-A")
    _git(repo, "commit", "-m", "B")

    # hook 導入ファイルは main worktree の未コミット差分として置く。legacy worktree には
    # .githooks も guard scripts も存在しないため、相対 hooksPath なら防御不能になる。
    shutil.copytree(ROOT / ".githooks", repo / ".githooks")
    shutil.copytree(ROOT / ".beads" / "hooks", repo / ".beads" / "hooks")
    (repo / "scripts").mkdir()
    for name in [
        "install-git-hooks.sh",
        "guard-cross-worktree-ref-update.py",
        "guard-worktree-desync.py",
        "validate-git-hooks-wiring.py",
    ]:
        shutil.copy2(ROOT / "scripts" / name, repo / "scripts" / name)

    install = subprocess.run(
        ["bash", str(repo / "scripts" / "install-git-hooks.sh")],
        cwd=repo, capture_output=True, text=True, check=False,
    )
    assert install.returncode == 0, install.stdout + install.stderr

    configured = _git(repo, "config", "--get", "core.hooksPath").stdout.strip()
    assert Path(configured).is_absolute()
    assert Path(configured) == MOD.shared_hooks_root(repo)
    assert not (legacy / ".githooks" / "reference-transaction").exists()

    blocked = subprocess.run(
        ["git", "update-ref", "refs/heads/main", commit_a],
        cwd=legacy, capture_output=True, text=True, check=False,
    )
    assert blocked.returncode != 0
    assert "guard-cross-worktree-ref-update" in blocked.stderr

    # commit 前の最終防衛線は判定不能時 fail-closed。Python が消えても素通りしない。
    (repo / "c.txt").write_text("c\n", encoding="utf-8")
    _git(repo, "add", "-A")
    no_python = subprocess.run(
        ["git", "commit", "-m", "must not commit"],
        cwd=repo,
        env={**os.environ, "HH_PYTHON": "definitely-missing-python"},
        capture_output=True,
        text=True,
        check=False,
    )
    assert no_python.returncode != 0
    assert "BLOCKED" in no_python.stderr


# ── 実リポジトリ契約テスト ──────────────────────────────────────────────────

def test_real_repository_wiring_is_intact():
    """このリポジトリ自身の hook 配線が実際に通ること。"""
    assert MOD.check_wiring(ROOT) == []


def test_cli_exits_zero_on_real_repository():
    proc = subprocess.run(
        [sys.executable, str(SCRIPT), "--repo-root", str(ROOT)],
        capture_output=True, text=True, check=False,
    )
    assert proc.returncode == 0, proc.stdout + proc.stderr
