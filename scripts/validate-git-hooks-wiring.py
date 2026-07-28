#!/usr/bin/env python3
"""validate-git-hooks-wiring.py

git hook の配線が生きているかを fail-closed で検査する
(issue-worktree-main-ref-desync-20260728 受入条件 3)。

なぜ必要か:
  core.hooksPath はリポジトリに 1 つしか設定できない。本リポジトリでは beads が
  .beads/hooks を要求し、リポジトリ自身は .githooks を持つため、片方を選ぶと
  もう片方の hook が無言で死ぬ。実際、本検査の導入前は core.hooksPath=.beads/hooks
  が設定されており .githooks/pre-push の CI 等価チェックが一切実行されていなかった。
  「hook が存在するのに動いていない」状態は失敗が起きないため気づけない。

配線モデル (二重化):
  <git-common-dir>/harness-hub-hooks/<hook>
                         … 全 worktree 共通の実行 bundle (主経路)
  .githooks/<hook>       … 上記 bundle の tracked template
  .beads/hooks/<hook>    … beads 管理ブロック + repo ガード呼び出し (保険経路)
  core.hooksPath は共有 bundle の絶対パスを指す。これにより古い branch の worktree
  から実行しても同じ reference-transaction hook が走る。beads が .beads/hooks を
  再生成して保険経路が消えても主経路は無傷であり、消失は git diff と本検査で見える。

usage:
  python3 scripts/validate-git-hooks-wiring.py                      # ファイル整合のみ (CI 用)
  python3 scripts/validate-git-hooks-wiring.py --check-local-config # core.hooksPath も検査
  python3 scripts/validate-git-hooks-wiring.py \
    --installed-hooks-root <path>                                  # bundle 自身からの検査
  python3 scripts/validate-git-hooks-wiring.py --json

exit code:
  0 配線正常
  1 配線に欠落あり (fail-closed)
  2 設定エラー

CONVENTIONS: stdlib only.
"""
import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

GUARD_MARKER = "run-repo-guards.sh"
DELEGATE_MARKER = "delegate-beads.sh"
SHARED_HOOKS_DIRNAME = "harness-hub-hooks"

# hook 名 -> {guard: repo ガードが要るか, delegate: beads へ委譲が要るか}
# reference-transaction は beads 側に対応 hook が無いため委譲しない。
# また stdin を guard が消費するため、委譲すると beads 側が空 stdin を読むことになる。
HOOKS = {
    "pre-commit": {"guard": True, "delegate": True},
    "pre-push": {"guard": True, "delegate": True},
    "reference-transaction": {"guard": True, "delegate": False},
    "post-checkout": {"guard": False, "delegate": True},
    "post-merge": {"guard": False, "delegate": True},
    "prepare-commit-msg": {"guard": False, "delegate": True},
}

LIB_FILES = ["run-repo-guards.sh", "delegate-beads.sh"]
BUNDLE_SCRIPT_FILES = [
    "guard-cross-worktree-ref-update.py",
    "guard-worktree-desync.py",
    "validate-git-hooks-wiring.py",
]


def _read(path):
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return None


def _check_hook_tree(hooks_root, label, require_bundle_scripts=False):
    """主 hook tree (tracked template または installed bundle) を検査する。"""
    hooks_root = Path(hooks_root)
    violations = []

    for lib in LIB_FILES:
        path = hooks_root / "lib" / lib
        if not path.is_file():
            violations.append(f"{label}/lib/{lib} が存在しません (hook の共通実装)")
        elif not os.access(path, os.X_OK):
            violations.append(f"{label}/lib/{lib} に実行権限がありません")

    for hook, need in HOOKS.items():
        path = hooks_root / hook
        body = _read(path)
        if body is None:
            violations.append(f"{label}/{hook} が存在しません (主経路の欠落)")
            continue
        if not os.access(path, os.X_OK):
            violations.append(f"{label}/{hook} に実行権限がありません")
        if need["guard"] and GUARD_MARKER not in body:
            violations.append(
                f"{label}/{hook} が repo ガード ({GUARD_MARKER}) を呼んでいません"
            )
        if need["delegate"] and DELEGATE_MARKER not in body:
            violations.append(
                f"{label}/{hook} が beads 委譲 ({DELEGATE_MARKER}) を行っていません"
            )

    if require_bundle_scripts:
        for script in BUNDLE_SCRIPT_FILES:
            path = hooks_root / "scripts" / script
            if not path.is_file():
                violations.append(
                    f"{label}/scripts/{script} が存在しません (共有 guard bundle)"
                )

    return violations


def _check_beads_fallback(repo_root):
    """core.hooksPath が beads 側へ戻された場合の保険経路を検査する。"""
    beads_hooks = Path(repo_root) / ".beads" / "hooks"
    violations = []

    # 保険経路: .beads/hooks 側にも repo ガードが結線されているか。
    for hook, need in HOOKS.items():
        if not need["guard"]:
            continue
        path = beads_hooks / hook
        body = _read(path)
        if body is None:
            violations.append(
                f".beads/hooks/{hook} が存在しません "
                f"(core.hooksPath が .beads/hooks へ戻された場合の保険経路)"
            )
            continue
        if GUARD_MARKER not in body:
            violations.append(
                f".beads/hooks/{hook} の repo ガード呼び出しが失われています "
                f"(beads の再生成で上書きされた可能性: git diff -- .beads/hooks で確認)"
            )

    return violations


def _check_tracked_bundle_scripts(repo_root):
    """共有 bundle へコピーする tracked guard 本体の欠落を検査する。"""
    scripts_root = Path(repo_root) / "scripts"
    violations = []
    for script in BUNDLE_SCRIPT_FILES:
        if not (scripts_root / script).is_file():
            violations.append(
                f"scripts/{script} が存在しません "
                "(共有 hook bundle の tracked source)"
            )
    return violations


def shared_hooks_root(repo_root):
    """全 worktree が共有する installed hook bundle の絶対パス。"""
    repo_root = Path(repo_root)
    proc = subprocess.run(
        ["git", "rev-parse", "--git-common-dir"],
        cwd=repo_root, capture_output=True, text=True, check=False,
    )
    if proc.returncode != 0 or not proc.stdout.strip():
        return None
    common = Path(proc.stdout.strip())
    if not common.is_absolute():
        common = repo_root / common
    return Path(os.path.realpath(common)) / SHARED_HOOKS_DIRNAME


def _check_local_config(repo_root, expected_hooks_root):
    """core.hooksPath が共有 bundle の絶対パスを指すことを検査する。"""
    repo_root = Path(repo_root)
    violations = []
    proc = subprocess.run(
        ["git", "config", "--get", "core.hooksPath"],
        cwd=repo_root, capture_output=True, text=True, check=False,
    )
    configured = proc.stdout.strip()
    if not configured:
        violations.append(
            "core.hooksPath が未設定です (bash scripts/install-git-hooks.sh を実行してください)"
        )
        return violations

    configured_path = Path(configured)
    if not configured_path.is_absolute():
        configured_path = repo_root / configured_path
    if os.path.realpath(configured_path) != os.path.realpath(expected_hooks_root):
        violations.append(
            f"core.hooksPath が {configured!r} を指しています "
            f"(期待: 全 worktree 共通の {expected_hooks_root})。"
            f"bash scripts/install-git-hooks.sh で復旧してください"
        )
    return violations


def _check_bundle_freshness(repo_root, installed_root):
    """tracked template と installed bundle の内容ずれを検知する。"""
    repo_root = Path(repo_root)
    installed_root = Path(installed_root)
    pairs = []
    for hook in HOOKS:
        pairs.append((repo_root / ".githooks" / hook, installed_root / hook))
    for lib in LIB_FILES:
        pairs.append(
            (repo_root / ".githooks" / "lib" / lib, installed_root / "lib" / lib)
        )
    for script in BUNDLE_SCRIPT_FILES:
        pairs.append((repo_root / "scripts" / script, installed_root / "scripts" / script))

    violations = []
    for source, installed in pairs:
        try:
            source_bytes = source.read_bytes()
            installed_bytes = installed.read_bytes()
        except OSError:
            # 欠落自体は source/bundle の構造検査で報告する。
            continue
        if source_bytes != installed_bytes:
            violations.append(
                f"共有 hook bundle が tracked template より古いです: {installed} "
                "(bash scripts/install-git-hooks.sh で再設置してください)"
            )
    return violations


def check_installed_wiring(repo_root, hooks_root):
    """installed bundle が単独で動作可能かを検査する (古い branch からも使用)。"""
    hooks_root = Path(hooks_root)
    violations = _check_hook_tree(
        hooks_root, str(hooks_root), require_bundle_scripts=True
    )
    violations += _check_local_config(repo_root, hooks_root)
    # 現在の worktree に tracked template が存在する場合は、installed bundle が
    # その内容へ追随していることも検査する。古い branch で source 側のファイルが
    # 存在しない場合は _check_bundle_freshness が当該 pair を skip するため、
    # 「古い branch からも共有 bundle 単独で動く」契約は維持される。
    #
    # pre-push は installed bundle 内の本 script を起動するため、ここで freshness を
    # 見ないと tracked guard を更新して再 install し忘れた状態を push 前に検知できない。
    violations += _check_bundle_freshness(repo_root, hooks_root)
    return violations


def check_wiring(repo_root, check_local_config=False):
    """tracked 配線を検査し violation 文字列のリストを返す。"""
    repo_root = Path(repo_root)
    violations = _check_hook_tree(repo_root / ".githooks", ".githooks")
    violations += _check_beads_fallback(repo_root)
    violations += _check_tracked_bundle_scripts(repo_root)

    if check_local_config:
        installed_root = shared_hooks_root(repo_root)
        if installed_root is None:
            violations.append("git common dir を取得できず共有 hook bundle を検査できません")
        else:
            violations += _check_hook_tree(
                installed_root, str(installed_root), require_bundle_scripts=True
            )
            violations += _check_local_config(repo_root, installed_root)
            violations += _check_bundle_freshness(repo_root, installed_root)

    return violations


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", default=None)
    parser.add_argument(
        "--check-local-config", action="store_true",
        help="core.hooksPath のローカル設定も検査する (CI では clone に設定が無いため既定 off)",
    )
    parser.add_argument(
        "--installed-hooks-root", default=None,
        help="installed bundle だけを検査する (古い branch から呼ぶ hook 用)",
    )
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)

    repo_root = args.repo_root
    if repo_root is None:
        proc = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, check=False,
        )
        if proc.returncode != 0:
            sys.stderr.write("[validate-git-hooks-wiring] git リポジトリ外です\n")
            return 2
        repo_root = proc.stdout.strip()

    if args.installed_hooks_root:
        violations = check_installed_wiring(repo_root, args.installed_hooks_root)
    else:
        violations = check_wiring(
            repo_root, check_local_config=args.check_local_config
        )

    if args.json:
        print(json.dumps(
            {"ok": not violations, "violations": violations},
            ensure_ascii=False, indent=2,
        ))
        return 1 if violations else 0

    if not violations:
        print("[validate-git-hooks-wiring] OK — hook 配線は正常です")
        return 0

    sys.stderr.write("\n[validate-git-hooks-wiring] FAIL: hook 配線に欠落があります\n")
    for v in violations:
        sys.stderr.write(f"  - {v}\n")
    sys.stderr.write(
        "\nhook が死んでいると desync 検査も ref 更新の遮断も動きません。\n"
        "復旧: bash scripts/install-git-hooks.sh\n"
        "詳細: docs/worktree-parallel-operations-runbook.md\n\n"
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
