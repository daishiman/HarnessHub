#!/usr/bin/env python3
"""guard-cross-worktree-ref-update.py

並列 worktree 運用で「他ワークツリーが checkout 中の ref」を直接書き換える操作を
git の reference-transaction hook から遮断する (issue-worktree-main-ref-desync-20260728)。

背景:
  git は HEAD / index / 作業ツリーの 3 層で状態を持つ。`git pull` や `git checkout` は
  3 層すべてを更新するが、`git update-ref` / `git fetch <remote> <src>:<dst>` は ref だけを
  書き換える。worktree は .git を共有するため、別ディレクトリの worktree からでも
  主ワークツリーが checkout 中の refs/heads/main を動かせてしまう。動かされた側は
  HEAD・index だけが最新へ進み作業ツリーが古いまま取り残される (desync)。この状態で
  `git commit -a` すると直前の PR のマージ内容を丸ごと巻き戻すコミットが main に載る。

判定:
  refs/heads/* への更新のうち、その ref を checkout している worktree が
  「hook を実行している worktree 自身ではない」ものを違反とする。
  - 誰も checkout していない ref     → 許可 (desync の被害者が存在しない)
  - 自分が checkout している ref     → 許可 (通常の commit / pull / merge がこれ)
  - refs/heads/ 以外 (remotes/tags)  → 対象外 (作業ツリーと連動しない)

fail-open の設計判断 (意図的):
  reference-transaction hook は「git のあらゆる ref 更新」を通る根幹経路であり、判定材料が
  取れない場合にここで fail-closed にすると clone 直後や修復作業中にリポジトリ全体が
  操作不能に陥る。よって判定不能時 (git worktree list 失敗・worktree root 不明) は
  警告のみ出して許可する。この穴は pre-commit 側の guard-worktree-desync.py が
  fail-closed で塞ぐ二層防御とする。詳細は docs/worktree-parallel-operations-runbook.md。

usage:
  # git hook から (stdin に "<old-oid> <new-oid> <ref>" 行群、引数に transaction 状態)
  python3 scripts/guard-cross-worktree-ref-update.py prepared

  # 緊急回避 (別ワークツリーの ref を意図的に動かす場合のみ)
  HH_ALLOW_CROSS_WORKTREE_REF_UPDATE=1 git update-ref refs/heads/main <sha>

exit code:
  0 許可 (違反なし / 対象外 / 判定不能で fail-open)
  1 遮断 (他ワークツリーが checkout 中の ref への更新)

CONVENTIONS: stdlib only.
"""
import os
import subprocess
import sys

BYPASS_ENV = "HH_ALLOW_CROSS_WORKTREE_REF_UPDATE"
REENTRY_ENV = "HH_REF_GUARD_ACTIVE"
BRANCH_PREFIX = "refs/heads/"


def _git(*args):
    """re-entrancy guard 付きで git を読み取り実行する。"""
    env = dict(os.environ)
    env[REENTRY_ENV] = "1"
    return subprocess.run(
        ["git", *args], capture_output=True, text=True, env=env, check=False
    )


def parse_updates(stream):
    """reference-transaction hook の stdin を (old_oid, new_oid, ref) 群へ解く。

    ref 名に空白は含まれないが、将来の書式ゆれで壊れないよう maxsplit=2 で分割する。
    """
    updates = []
    for raw in stream:
        line = raw.rstrip("\n")
        if not line:
            continue
        parts = line.split(" ", 2)
        if len(parts) != 3:
            continue
        updates.append((parts[0], parts[1], parts[2]))
    return updates


def _norm(path):
    """macOS の /tmp -> /private/tmp のような symlink 差で誤判定しないよう正規化する。"""
    if not path:
        return None
    return os.path.realpath(path)


def branch_owners():
    """checkout 中の branch ref -> worktree root path の対応を返す。

    判定不能なら None を返す (呼び出し側で fail-open)。
    """
    proc = _git("worktree", "list", "--porcelain")
    if proc.returncode != 0:
        return None
    owners = {}
    current = None
    for line in proc.stdout.splitlines():
        if line.startswith("worktree "):
            current = line[len("worktree "):].strip()
        elif line.startswith("branch ") and current:
            owners[line[len("branch "):].strip()] = _norm(current)
        elif not line.strip():
            current = None
    return owners


def self_worktree():
    """hook を実行している worktree の root を返す。判定不能なら None。"""
    proc = _git("rev-parse", "--show-toplevel")
    if proc.returncode != 0:
        return None
    top = proc.stdout.strip()
    return _norm(top) if top else None


def find_violations(updates, owners, self_root):
    """他ワークツリー所有の refs/heads/* 更新を抽出する。"""
    violations = []
    for old_oid, new_oid, ref in updates:
        if not ref.startswith(BRANCH_PREFIX):
            continue
        owner = owners.get(ref)
        if owner is None:
            continue
        if owner == self_root:
            continue
        violations.append(
            {"ref": ref, "owner": owner, "old": old_oid, "new": new_oid}
        )
    return violations


def _report(violations, self_root):
    lines = [
        "",
        "[guard-cross-worktree-ref-update] BLOCKED: 他ワークツリーが checkout 中の ref を直接更新しようとしました。",
        f"  実行元 worktree: {self_root}",
        "",
    ]
    for v in violations:
        lines.append(f"  ref   : {v['ref']}")
        lines.append(f"  所有者 : {v['owner']} (この worktree が checkout 中)")
        lines.append(f"  更新   : {v['old'][:12]} -> {v['new'][:12]}")
        lines.append("")
    lines += [
        "この更新を通すと、所有者側は HEAD・index だけが進み作業ツリーが古いまま取り残されます",
        "(desync)。その状態で git commit -a すると直前のマージ内容を巻き戻すコミットが生まれます。",
        "",
        "正しい手順:",
        "  - リモートの取得は remote-tracking のみに限定する:  git fetch origin",
        "  - main を進めたい場合は所有者の worktree で:        git pull --ff-only",
        "  - 禁止:  git fetch origin main:main / git update-ref refs/heads/main <sha>",
        "",
        f"意図的に行う場合のみ:  {BYPASS_ENV}=1 <command>",
        "詳細: docs/worktree-parallel-operations-runbook.md",
        "",
    ]
    sys.stderr.write("\n".join(lines))


def main(argv=None, stdin=None):
    argv = sys.argv if argv is None else argv
    stdin = sys.stdin if stdin is None else stdin

    # reference-transaction は prepared/committed/aborted で呼ばれる。
    # 遮断できるのは prepared のみ (committed 以降は既に確定済み)。
    phase = argv[1] if len(argv) > 1 else "prepared"
    if phase != "prepared":
        return 0

    # guard 自身の git 呼び出しが hook を再帰起動した場合は素通しする。
    if os.environ.get(REENTRY_ENV) == "1":
        return 0

    updates = parse_updates(stdin)
    if not any(ref.startswith(BRANCH_PREFIX) for _, _, ref in updates):
        return 0

    if os.environ.get(BYPASS_ENV) == "1":
        sys.stderr.write(
            f"[guard-cross-worktree-ref-update] {BYPASS_ENV}=1 により検査を skip しました\n"
        )
        return 0

    owners = branch_owners()
    self_root = self_worktree()
    if owners is None or self_root is None:
        # fail-open (docstring 参照): ref 更新経路を塞がない。
        sys.stderr.write(
            "[guard-cross-worktree-ref-update] WARN: worktree 情報を取得できず検査を skip しました "
            "(pre-commit 側の guard-worktree-desync.py が二層目として検査します)\n"
        )
        return 0

    violations = find_violations(updates, owners, self_root)
    if not violations:
        return 0
    _report(violations, self_root)
    return 1


if __name__ == "__main__":
    sys.exit(main())
