#!/usr/bin/env python3
"""lint-worktree-clobber-mtime.py

作業ツリー clobber (ref を動かさず作業ツリーの実ファイルだけが古いスナップショット
へ丸ごと置換される事象。issue-worktree-main-ref-desync-20260728 §2.1) の再発検知。

guard-worktree-desync.py は commit しようとしている index の tree hash を HEAD の
祖先と突合するため、staged 済みの巻き戻しコミットは検出できる。しかし clobber は
「未 stage のまま作業ツリーに残る」ため index を見る検査では捕捉できない
(docs/worktree-desync-recovery-runbook.md §7 の 2026-07-28 夕の事例)。本 script は
その隙間を埋める、working tree を直接見る非 blocking の診断ツール。

検知の原理:
  git checkout はファイル書き込み時点の現在時刻を mtime にする。したがって通常の
  編集・commit・checkout はどれも「複数ファイルの mtime が分単位まで完全一致する」
  状態を作らない。一方 clobber の実体は rsync/tar/cp -p や Finder のコピーなど、
  元 mtime を保持したままファイルを配置する機構であり、同一の配置元から来た
  ファイル群は同一の mtime を持つ。

  2026-08-02 の実測 (issue-worktree-main-ref-desync-20260728 続報) では、未コミット
  401 件中 276 件が分単位まで完全一致する mtime (2026-07-31 06:56) を持ち、
  相互に無関係な 15+ プラグインへ横断していた。この「同一 mtime クラスタが複数の
  独立ディレクトリにまたがる」ことを clobber の指紋として検知する。

fail-open の設計判断 (guard-worktree-desync.py の fail-closed とは非対称):
  本 script は commit を止める blocking hook として配線しない。mtime クラスタの
  一致は状況証拠であり (誤検知の余地がある。例: 意図的な一括 touch や codemod)、
  確定検知ではないため。pre-commit で強制すると正当な一括変更を止めてしまう。
  検査材料が取れない場合も exit 0 (診断不能は「疑わしくない」として扱う)。

usage:
  python3 scripts/lint-worktree-clobber-mtime.py            # 人間向け報告
  python3 scripts/lint-worktree-clobber-mtime.py --json     # 判定材料を JSON で出力

環境変数:
  HH_CLOBBER_MIN_CLUSTER_SIZE=N   疑わしいクラスタとみなす最小ファイル数 (既定 10)
  HH_CLOBBER_MIN_DISTINCT_DIRS=N  疑わしいクラスタとみなす最小の独立ディレクトリ数 (既定 3)

exit code:
  0 clobber の指紋なし (または診断不能)
  1 clobber が疑われるクラスタを検出 (commit は止めない。手動確認を促すのみ)

CONVENTIONS: stdlib only.
"""
import json
import os
import subprocess
import sys
from collections import defaultdict

MIN_CLUSTER_SIZE_ENV = "HH_CLOBBER_MIN_CLUSTER_SIZE"
MIN_DISTINCT_DIRS_ENV = "HH_CLOBBER_MIN_DISTINCT_DIRS"
DEFAULT_MIN_CLUSTER_SIZE = 10
DEFAULT_MIN_DISTINCT_DIRS = 3


def _git(*args, cwd=None):
    return subprocess.run(
        ["git", *args], capture_output=True, text=True, cwd=cwd, check=False
    )


def _env_int(name, default):
    raw = os.environ.get(name)
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    return value if value > 0 else default


def _top_dirs(path, depth=2):
    """clobber がまたぐ独立ディレクトリの判別に使う先頭 N セグメント。"""
    parts = path.split("/")
    return "/".join(parts[:depth]) if len(parts) > 1 else parts[0]


def changed_paths(cwd=None):
    """working tree 上で変更・未追跡のファイル一覧 (削除済みは除く)。"""
    proc = _git("status", "--porcelain=v1", "--untracked-files=all", cwd=cwd)
    if proc.returncode != 0:
        return None
    paths = []
    for line in proc.stdout.splitlines():
        if len(line) < 4:
            continue
        status, path = line[:2], line[3:]
        if "D" in status:
            continue  # 削除は mtime を持たないため対象外
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        paths.append(path.strip('"'))
    return paths


def collect_evidence(cwd=None):
    """working tree の mtime クラスタを集計する。取得できなければ None。"""
    paths = changed_paths(cwd=cwd)
    if paths is None:
        return None

    root = cwd or "."
    clusters = defaultdict(list)
    for rel_path in paths:
        abs_path = os.path.join(root, rel_path)
        try:
            mtime = int(os.path.getmtime(abs_path))
        except OSError:
            continue  # 既に消えている等、診断対象外
        bucket = mtime - (mtime % 60)  # 分単位に丸める
        clusters[bucket].append(rel_path)

    cluster_report = []
    for bucket, files in clusters.items():
        distinct_dirs = {_top_dirs(p) for p in files}
        cluster_report.append({
            "mtime_minute_epoch": bucket,
            "file_count": len(files),
            "distinct_dir_count": len(distinct_dirs),
            "sample_files": sorted(files)[:5],
        })
    cluster_report.sort(key=lambda c: c["file_count"], reverse=True)

    return {
        "total_changed_files": len(paths),
        "clusters": cluster_report,
    }


def judge(evidence, min_cluster_size, min_distinct_dirs):
    """クラスタ一覧から clobber 疑いを判定する。

    Returns:
        (verdict, reason, suspects) のタプル。
            verdict: "ok" / "clobber-suspected"
            reason:  人間向け 1 行説明 ("ok" のときは "")
            suspects: 閾値を満たしたクラスタのリスト
    """
    suspects = [
        c for c in evidence["clusters"]
        if c["file_count"] >= min_cluster_size
        and c["distinct_dir_count"] >= min_distinct_dirs
    ]
    if not suspects:
        return ("ok", "", [])
    suspects.sort(key=lambda c: c["file_count"], reverse=True)
    top = suspects[0]
    reason = (
        f"{top['file_count']} 件のファイルが mtime 分単位まで完全一致し "
        f"({top['distinct_dir_count']} 個の独立ディレクトリへ横断)、"
        "通常の編集では起こらないパターンです"
    )
    return ("clobber-suspected", reason, suspects)


def _report(verdict, reason, suspects, evidence):
    lines = [
        "",
        "[lint-worktree-clobber-mtime] "
        + ("SUSPECTED: clobber の指紋を検出しました" if verdict == "clobber-suspected" else "OK"),
    ]
    if verdict == "clobber-suspected":
        lines += [
            f"  {reason}",
            "",
            f"  未コミット変更の総数: {evidence['total_changed_files']}",
            "  疑わしいクラスタ:",
        ]
        for c in suspects:
            lines.append(
                f"    - {c['file_count']} files / {c['distinct_dir_count']} dirs "
                f"/ sample: {', '.join(c['sample_files'])}"
            )
        lines += [
            "",
            "これは commit を止めるものではありません (状況証拠のため)。",
            "docs/worktree-desync-recovery-runbook.md §2.1 の見分け方で裏を取ってください。",
            "",
        ]
    sys.stderr.write("\n".join(lines) + "\n")


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    as_json = "--json" in argv

    min_cluster_size = _env_int(MIN_CLUSTER_SIZE_ENV, DEFAULT_MIN_CLUSTER_SIZE)
    min_distinct_dirs = _env_int(MIN_DISTINCT_DIRS_ENV, DEFAULT_MIN_DISTINCT_DIRS)

    evidence = collect_evidence()
    if evidence is None:
        return 0  # 診断不能は「疑わしくない」として扱う (fail-open)

    verdict, reason, suspects = judge(evidence, min_cluster_size, min_distinct_dirs)

    if as_json:
        print(json.dumps(
            {"verdict": verdict, "reason": reason, "suspects": suspects, "evidence": evidence},
            ensure_ascii=False, indent=2,
        ))
    elif verdict == "clobber-suspected":
        _report(verdict, reason, suspects, evidence)

    return 1 if verdict == "clobber-suspected" else 0


if __name__ == "__main__":
    sys.exit(main())
