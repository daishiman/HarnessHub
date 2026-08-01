#!/usr/bin/env python3
"""guard-worktree-desync.py

desync 状態 (HEAD だけが進み作業ツリーが古い) でのコミットを fail-closed で遮断する
(issue-worktree-main-ref-desync-20260728)。guard-cross-worktree-ref-update.py が
遮断しきれなかった ref 直接更新の被害を、コミット直前の最終防衛線として止める。

検知の原理:
  desync の本質は「commit されようとしている index の中身が、HEAD ではなく HEAD の
  祖先コミットの状態である」ことにある。したがって index の tree hash が HEAD の祖先
  いずれかの tree hash と一致すれば、それは巻き戻しコミットであることが確定する
  (誤検知なし)。2026-07-28 の実測ケース (65 files / -5,467 行) はこの検査で捕まる。

  固有の変更が少量混ざり tree が完全一致しない部分 desync に備え、staged 削除数の
  異常も併せて材料に採る。こちらは閾値ヒューリスティックであり誤検知しうるため、
  bypass 環境変数で通せる設計とする。

fail-closed の設計判断 (意図的):
  検査材料が取れない場合は「安全側 = 遮断」とする。止まるのは commit だけで、
  bypass 環境変数と runbook の復旧手順で必ず前進できるため、取り返しのつかない
  巻き戻しコミットを通すリスクの方が高い。ref 更新経路を塞げない
  guard-cross-worktree-ref-update.py の fail-open と対になる二層防御。

usage:
  python3 scripts/guard-worktree-desync.py            # pre-commit hook から
  python3 scripts/guard-worktree-desync.py --json     # 判定材料を JSON で出力

環境変数:
  HH_SKIP_DESYNC_CHECK=1          検査を skip (緊急回避)
  HH_DESYNC_DELETION_THRESHOLD=N  大量削除とみなす staged 削除数 (既定 20)
  HH_DESYNC_ANCESTOR_DEPTH=N      祖先 tree を遡る深さ (既定 200)

exit code:
  0 問題なし
  1 遮断 (desync 由来の巻き戻しコミットの疑い)
  2 設定エラー

CONVENTIONS: stdlib only.
"""
import json
import os
import subprocess
import sys

SKIP_ENV = "HH_SKIP_DESYNC_CHECK"
THRESHOLD_ENV = "HH_DESYNC_DELETION_THRESHOLD"
DEPTH_ENV = "HH_DESYNC_ANCESTOR_DEPTH"
DEFAULT_DELETION_THRESHOLD = 20
DEFAULT_ANCESTOR_DEPTH = 200


class EvidenceError(RuntimeError):
    """検査材料を取得できなかった (fail-closed 対象)。"""


def _git(*args, cwd=None):
    return subprocess.run(
        ["git", *args], capture_output=True, text=True, cwd=cwd, check=False
    )


def _git_out(*args, cwd=None):
    proc = _git(*args, cwd=cwd)
    if proc.returncode != 0:
        raise EvidenceError(
            f"git {' '.join(args)} が失敗しました (exit {proc.returncode}): "
            f"{proc.stderr.strip()}"
        )
    return proc.stdout


def has_head(cwd=None):
    """HEAD が実コミットを指しているか (初回コミット前は False)。"""
    return _git("rev-parse", "--verify", "--quiet", "HEAD", cwd=cwd).returncode == 0


def index_tree(cwd=None):
    """commit されようとしている index の tree hash。"""
    return _git_out("write-tree", cwd=cwd).strip()


def ancestor_tree_map(depth, cwd=None):
    """HEAD の祖先の tree hash -> commit hash。HEAD と同 tree のものは除く。

    除外が commit 単位ではなく tree 単位である理由 (2026-07-28 実環境で誤検知):
      マージコミットは片側だけが進んでいる場合に親と同一の tree を持つ。実際
      dedfdc3 (Merge PR #87) と親 1f78791 の tree はどちらも 76c6a92 だった。
      HEAD 自身だけを除くと、この親が「祖先」として残る。index tree == HEAD tree
      (= 差分なし) の状態がその親と一致してしまい、通常の commit が全て遮断される。

      HEAD と同 tree の祖先へ「巻き戻して」も内容は 1 バイトも変わらないため、
      これらを除外しても desync の見逃しは生じない。
    """
    out = _git_out(
        "log", f"--max-count={depth}", "--format=%H %T", "HEAD", cwd=cwd
    )
    head_tree = None
    mapping = {}
    for i, line in enumerate(out.splitlines()):
        parts = line.split()
        if len(parts) != 2:
            continue
        commit, tree = parts
        if i == 0:
            head_tree = tree
            continue  # HEAD 自身
        mapping.setdefault(tree, commit)
    if head_tree is not None:
        mapping.pop(head_tree, None)
    return mapping


def staged_deletions(cwd=None):
    """staged で削除されるパス一覧。"""
    out = _git_out(
        "diff", "--cached", "--name-only", "--diff-filter=D", cwd=cwd
    )
    return [p for p in out.splitlines() if p.strip()]


def _env_int(name, default):
    raw = os.environ.get(name)
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError:
        raise EvidenceError(f"{name} は整数である必要があります (実際: {raw!r})")
    if value < 0:
        raise EvidenceError(f"{name} は 0 以上である必要があります (実際: {value})")
    return value


def collect_evidence(cwd=None):
    """判定に必要な材料を集める。取得できなければ EvidenceError。"""
    depth = _env_int(DEPTH_ENV, DEFAULT_ANCESTOR_DEPTH)
    threshold = _env_int(THRESHOLD_ENV, DEFAULT_DELETION_THRESHOLD)
    tree = index_tree(cwd=cwd)
    ancestors = ancestor_tree_map(depth, cwd=cwd)
    matched = ancestors.get(tree)
    deletions = staged_deletions(cwd=cwd)
    return {
        "index_tree": tree,
        "matched_ancestor": matched,
        "staged_deletion_count": len(deletions),
        "staged_deletions": deletions,
        "deletion_threshold": threshold,
        "ancestor_depth": depth,
    }


def judge(evidence):
    """検査材料から遮断可否を判定する。

    Args:
        evidence: collect_evidence() の戻り値。主に使うのは次の 3 キー。
            - matched_ancestor (str | None):
                index の tree が HEAD の祖先コミットの tree と一致した場合、その
                コミット hash。None なら一致なし。一致は「巻き戻しコミット確定」を
                意味する (誤検知なし)。
            - staged_deletion_count (int): staged で削除されるファイル数。
            - deletion_threshold (int): 大量削除とみなす閾値 (既定 20)。

    Returns:
        (verdict, reason) のタプル。
            verdict: "ok" (通す) / "rollback" (巻き戻し確定) / "bulk-delete" (大量削除の疑い)
            reason:  ユーザーに見せる 1 行の日本語説明。"ok" のときは ""。

    判定順序は「確定検知 (rollback) を閾値ヒューリスティック (bulk-delete) より優先」。
    desync では両方成立しうるが、誤検知のない rollback を報告した方が原因に直結し、
    かつ bulk-delete 用の bypass で誤って通されることを防げる。
    """
    matched = evidence.get("matched_ancestor")
    if matched:
        return (
            "rollback",
            f"commit されようとしている内容が祖先コミット {matched[:12]} と完全一致します "
            f"(作業ツリーが古い状態のまま HEAD だけが進んでいます)",
        )

    threshold = evidence.get("deletion_threshold", DEFAULT_DELETION_THRESHOLD)
    count = evidence.get("staged_deletion_count", 0)
    # threshold=0 は検査の無効化を意味する (0 件の削除で発火させない)。
    if threshold > 0 and count >= threshold:
        return (
            "bulk-delete",
            f"{count} 件のファイル削除が staged されています (閾値 {threshold})",
        )

    return ("ok", "")


def _report(verdict, reason, evidence):
    header = {
        "rollback": "BLOCKED: 巻き戻しコミットを検出しました (desync 確定)",
        "bulk-delete": "BLOCKED: 異常な量の削除を検出しました (desync の疑い)",
    }[verdict]
    lines = [
        "",
        f"[guard-worktree-desync] {header}",
        f"  {reason}",
        "",
        f"  index tree           : {evidence['index_tree'][:12]}",
        f"  一致した祖先コミット : {(evidence['matched_ancestor'] or '-')[:12]}",
        f"  staged 削除数        : {evidence['staged_deletion_count']} "
        f"(閾値 {evidence['deletion_threshold']})",
        "",
        "考えられる原因: 別の worktree が refs/heads/<branch> を直接更新し、この作業ツリーが",
        "古いまま取り残されています (HEAD・index だけが進んだ状態)。",
        "",
        "復旧 (並列稼働を止めずに行えます):",
        "  git checkout --detach                       # HEAD を SHA 固定し ref 書き換えの影響を遮断",
        "  git stash push -u -m '<内容がわかるメッセージ>'",
        "  git status && git diff --shortstat HEAD     # 作業ツリーが HEAD と一致することを確認",
        "  git checkout main                           # ref の最新へ追従",
        "",
    ]
    if verdict == "bulk-delete":
        lines += [
            f"意図した削除である場合のみ:  {SKIP_ENV}=1 git commit ...",
            "",
        ]
    lines += ["詳細: docs/worktree-parallel-operations-runbook.md", ""]
    sys.stderr.write("\n".join(lines))


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    as_json = "--json" in argv

    if os.environ.get(SKIP_ENV) == "1":
        sys.stderr.write(
            f"[guard-worktree-desync] {SKIP_ENV}=1 により検査を skip しました\n"
        )
        return 0

    if not has_head():
        return 0  # 初回コミット前は祖先が無く desync が定義されない

    try:
        evidence = collect_evidence()
    except EvidenceError as exc:
        # fail-closed (docstring 参照)
        sys.stderr.write(
            f"\n[guard-worktree-desync] BLOCKED: 検査材料を取得できませんでした\n"
            f"  {exc}\n"
            f"  検査不能のまま通すと巻き戻しコミットを見逃すため遮断します。\n"
            f"  意図的に続行する場合のみ:  {SKIP_ENV}=1 git commit ...\n\n"
        )
        return 1

    verdict, reason = judge(evidence)

    if as_json:
        print(json.dumps(
            {"verdict": verdict, "reason": reason, "evidence": evidence},
            ensure_ascii=False, indent=2,
        ))

    if verdict == "ok":
        return 0
    if not as_json:
        _report(verdict, reason, evidence)
    return 1


if __name__ == "__main__":
    sys.exit(main())
