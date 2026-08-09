#!/usr/bin/env python3
"""select-verification-tier.py - 変更 path 集合から検証 tier を決定論的に算出する。

正本は system-spec/dev-workflow.md の確定内容 (qa-214【1】【2】)。要旨:

- 検証深度は mvp / standard / critical の 3 tier。tier は人の裁量ではなく変更差分から
  決定論的に導出する。導出入力は (a) 変更 path 集合 (b) 逆転不能性 (c) 公開面 の 3 つだけ。
- 規則が上位 tier を指す場合は自動的に引き上げる。人が算出結果より低い tier で実行する
  場合は --downgrade-to <tier> --reason <理由> を必須とし、deferred issue を必ず起票する。
  無記録の引き下げは fail-closed で拒否する。
- 同じ差分に対して常に同じ tier を返し、環境や実行者で揺れない。

本 script が未実装だった間、実行系は standard を既定とし tier-decision.json へ
`tier_selector: "absent"` を書いていた (dev-workflow.md【3】)。本 script が存在する run は
`tier_selector` に path と source digest を記録し、`absent` を出さないこと。

決定論の担保: 規則表 (RULES) は本ファイル内に閉じ、出力へ rules_digest (規則表の canonical
JSON の sha256) を含める。規則を変えれば digest が変わるため、過去の判定がどの規則版に
基づくかを後から機械追跡できる。

Usage:
  python3 scripts/select-verification-tier.py --changed-path apps/web/src/a.ts
  python3 scripts/select-verification-tier.py --changed-paths-file changed.txt
  python3 scripts/select-verification-tier.py --from-git origin/main
  python3 scripts/select-verification-tier.py --from-git origin/main \
      --downgrade-to mvp --reason "..." --deferred-issue HarnessHub-xxxx \
      --out eval-log/verification-tier/run-20260809-1/tier-decision.json

Exit codes:
  0 = 判定成功 / 1 = 使い方・入力エラー / 2 = fail-closed 拒否 (無記録の引き下げ等)
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

TIERS = ("mvp", "standard", "critical")
TIER_RANK = {tier: index for index, tier in enumerate(TIERS)}

# 規則表。tier 昇順ではなく「critical から先に評価し、最初に該当した最上位 tier を採る」。
# match は (kind, value) で、kind は次の 3 種だけに閉じる (正規表現を避け、規則の読み違いを防ぐ):
#   prefix  : repo 相対 path の前方一致
#   exact   : repo 相対 path の完全一致
#   glob    : path 全体に対する fnmatch (segment を跨ぐ ** を含む)
#   segment : path のいずれかのディレクトリ/ファイル名セグメントに一致
RULES = [
    {
        "rule_id": "CR-01",
        "tier": "critical",
        "reason": "公開 catalog (marketplace / plugin manifest) は公開面であり、誤りが外部へ即時伝播する",
        "match": [
            ("exact", ".claude-plugin/marketplace.json"),
            ("glob", "plugins/*/.claude-plugin/plugin.json"),
        ],
    },
    {
        "rule_id": "CR-02",
        "tier": "critical",
        "reason": "production deploy unit (CI workflow / installer) は実行環境そのものを差し替える",
        "match": [("prefix", ".github/workflows/"), ("prefix", "installers/")],
    },
    {
        "rule_id": "CR-03",
        "tier": "critical",
        "reason": "認証認可経路の誤りは公開後に取り消せない",
        "match": [("segment", "auth"), ("segment", "authz"), ("segment", "credentials")],
    },
    {
        "rule_id": "CR-04",
        "tier": "critical",
        "reason": "DB migration は逆転不能 (適用済みデータを元に戻せない)",
        "match": [("segment", "migrations"), ("glob", "**/*.sql")],
    },
    {
        "rule_id": "CR-05",
        "tier": "critical",
        "reason": "データ削除経路は逆転不能",
        "match": [("glob", "**/*delete*"), ("glob", "**/*purge*"), ("glob", "**/*prune*")],
    },
    {
        "rule_id": "ST-01",
        "tier": "standard",
        "reason": "製品 runtime コード (外部 API / UI / DB 読み取り経路)",
        "match": [("prefix", "apps/"), ("prefix", "packages/")],
    },
    {
        "rule_id": "ST-02",
        "tier": "standard",
        "reason": "tenant 配信設定は製品挙動へ直結する",
        "match": [("prefix", "tenants/")],
    },
]

# いずれの規則にも該当しない変更 (repository 内 tooling・plugin・spec 文書・未公開 feature 実装)。
DEFAULT_RULE_ID = "MV-01"
DEFAULT_TIER = "mvp"


def rules_digest() -> str:
    canonical = json.dumps(RULES, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def source_digest() -> str:
    return hashlib.sha256(Path(__file__).read_bytes()).hexdigest()


def _matches(path: str, kind: str, value: str) -> bool:
    from fnmatch import fnmatch

    if kind == "prefix":
        return path.startswith(value)
    if kind == "exact":
        return path == value
    if kind == "glob":
        # fnmatch は ** を * と同義に扱うため、先頭 "**/" は「任意階層」の意味で自前に展開する。
        if value.startswith("**/"):
            tail = value[3:]
            return fnmatch(path, tail) or fnmatch(path, f"*/{tail}")
        return fnmatch(path, value)
    if kind == "segment":
        return value in path.split("/")
    raise ValueError(f"未知の match kind: {kind!r}")


def normalize(paths) -> list[str]:
    """repo 相対の posix path へ正規化し、重複を除いて昇順に並べる (順序で判定が揺れないため)。"""
    seen = set()
    for raw in paths:
        # lstrip("./") は先頭の '.' を全て削り .github/ や .claude-plugin/ を壊すため使わない。
        value = str(raw).strip().replace("\\", "/")
        while value.startswith("./"):
            value = value[2:]
        if value:
            seen.add(value)
    return sorted(seen)


def evaluate(paths: list[str]) -> dict:
    matches = []
    for rule in RULES:
        hit = sorted(
            path for path in paths
            if any(_matches(path, kind, value) for kind, value in rule["match"])
        )
        if hit:
            matches.append({
                "rule_id": rule["rule_id"],
                "tier": rule["tier"],
                "reason": rule["reason"],
                "paths": hit,
            })
    if matches:
        computed = max((m["tier"] for m in matches), key=lambda t: TIER_RANK[t])
    else:
        computed = DEFAULT_TIER
        matches = [{
            "rule_id": DEFAULT_RULE_ID,
            "tier": DEFAULT_TIER,
            "reason": "上位規則に非該当 (repository 内 tooling・plugin・spec 文書・未公開 feature 実装)",
            "paths": list(paths),
        }]
    return {"computed_tier": computed, "rule_matches": matches}


def affected_packages(paths: list[str]) -> list[str]:
    """影響 package を <root>/<name> の 2 段で数える (plugins/foo, apps/web など)。"""
    roots = ("plugins", "apps", "packages", "tenants")
    found = set()
    for path in paths:
        parts = path.split("/")
        if len(parts) >= 2 and parts[0] in roots:
            found.add(f"{parts[0]}/{parts[1]}")
    return sorted(found)


def derive_checks(tier: str, ledger: str | None = None) -> list[dict]:
    """gate 台帳から、この tier の checks を導出する (build-verification-plan.py と同一規則)。

    導出規則を写経せず同じ実装を呼ぶ。写経すると台帳の読み方が 2 箇所に分かれ、
    片方だけ直したときに tier-decision と verification-plan が食い違う。
    """
    import importlib.util

    path = Path(__file__).resolve().parent / "build-verification-plan.py"
    spec = importlib.util.spec_from_file_location("build_verification_plan", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    gates = module.load_ledger(Path(ledger) if ledger else module.DEFAULT_LEDGER)
    return module.plan_for(tier, gates)


def git_fork_point(base_ref: str, repo_root: Path) -> str:
    """base_ref と HEAD の分岐点。

    ``base...HEAD`` の三点 diff は commit 済みの差分しか見ないため、手元で走らせると
    作業中の未 commit 変更が丸ごと落ち、実態より軽い tier が出る。分岐点に対する
    二点 diff なら作業ツリーを含みつつ、base 側だけで進んだ commit を差分に混ぜない。
    CI は checkout 直後で作業ツリーが空なので、この置換で結果は変わらない。
    """
    result = subprocess.run(
        ["git", "merge-base", base_ref, "HEAD"],
        cwd=repo_root, capture_output=True, text=True,
    )
    if result.returncode != 0 or not result.stdout.strip():
        # 分岐点が取れない = 判定入力が取れない。三点 diff へ黙って落とすと
        # 「未 commit 分を見落とした軽い tier」が根拠不明のまま成立する。
        raise SystemExit(f"ERROR: merge-base が取れない ({base_ref}): {result.stderr.strip()}")
    return result.stdout.strip()


def git_changed_lines(base_ref: str, repo_root: Path) -> int | None:
    """実効変更行数 (added + deleted)。binary 行は '-' で来るので数えない。"""
    result = subprocess.run(
        ["git", "diff", "--numstat", git_fork_point(base_ref, repo_root)],
        cwd=repo_root, capture_output=True, text=True,
    )
    if result.returncode != 0:
        return None
    total = 0
    for line in result.stdout.splitlines():
        fields = line.split("\t")
        if len(fields) >= 2 and fields[0].isdigit() and fields[1].isdigit():
            total += int(fields[0]) + int(fields[1])
    return total


def git_changed_paths(base_ref: str, repo_root: Path) -> list[str]:
    result = subprocess.run(
        ["git", "diff", "--name-only", git_fork_point(base_ref, repo_root)],
        cwd=repo_root, capture_output=True, text=True,
    )
    if result.returncode != 0:
        raise SystemExit(f"ERROR: git diff が失敗した ({base_ref}): {result.stderr.strip()}")
    paths = result.stdout.splitlines()

    # 未追跡 file は diff に現れない。新規追加された migration や workflow が
    # 「まだ add していない」だけで判定入力から消えると、tier を上げる規則に
    # 一度も当たらないまま最も軽い検査で通ってしまう。
    untracked = subprocess.run(
        ["git", "ls-files", "--others", "--exclude-standard"],
        cwd=repo_root, capture_output=True, text=True,
    )
    if untracked.returncode == 0:
        paths.extend(untracked.stdout.splitlines())
    return paths


def build_decision(paths: list[str], args) -> tuple[dict, int]:
    evaluated = evaluate(paths)
    computed = evaluated["computed_tier"]
    effective = computed
    downgrade = None

    if args.downgrade_to:
        # 引き上げは規則が自動で行う。downgrade flag を昇格に流用させると、
        # 「記録義務のある引き下げ」と「自動昇格」が同じ経路に混ざって区別できなくなる。
        if TIER_RANK[args.downgrade_to] >= TIER_RANK[computed]:
            print(
                f"ERROR: --downgrade-to={args.downgrade_to} は算出 tier={computed} 以上であり引き下げでない "
                "(引き上げは規則が自動で行うため flag では指定しない)",
                file=sys.stderr,
            )
            return {}, 2
        missing = []
        if not (args.reason or "").strip():
            missing.append("--reason")
        if not args.deferred_issue:
            missing.append("--deferred-issue (降格で外れた検査を受け止める beads issue)")
        if missing:
            print(
                f"ERROR: 無記録の引き下げは拒否する (fail-closed)。不足: {', '.join(missing)}",
                file=sys.stderr,
            )
            return {}, 2
        effective = args.downgrade_to
        downgrade = {
            "from": computed,
            "to": args.downgrade_to,
            "reason": args.reason.strip(),
            "deferred_issue_refs": list(args.deferred_issue),
        }

    checks: list[dict] = []
    deferred_refs = list(args.deferred_issue)
    if getattr(args, "derive_checks", False):
        # tier を決めてから台帳を引く一方向の導出。plan を別 process で作って読み戻すと
        # 「tier を出すための select」と「checks を入れるための select」で 2 回走ることになり、
        # 同じ差分を 2 度測る (規則表が動けば 1 回目と 2 回目で tier がズレうる) 経路ができる。
        checks = derive_checks(effective, getattr(args, "ledger", None))
        if not any(c.get("disposition") == "deferred" for c in checks):
            # 延期 0 件の run に受け皿 id を書かない (延期の有無を台帳上で判別可能に保つ)。
            deferred_refs = [] if not downgrade else deferred_refs
    if getattr(args, "checks_file", None):
        plan = json.loads(Path(args.checks_file).read_text(encoding="utf-8"))
        checks = plan.get("checks", [])
        # plan 側の受け皿 issue も取り込む。plan の tier と判定 tier が食い違うと
        # 「別 tier 向けの blocking 集合を、この tier の記録として残す」ことになるため拒否する。
        if plan.get("tier") and plan["tier"] != effective:
            print(
                f"ERROR: checks の tier={plan['tier']} と effective_tier={effective} が食い違う",
                file=sys.stderr,
            )
            return {}, 2
        for ref in plan.get("deferred_issue_refs", []):
            if ref not in deferred_refs:
                deferred_refs.append(ref)

    # deferred が 1 件でもあれば受け皿 issue が必須 (dev-workflow.md【1】)。
    # 空配列を許すと「延期した」と「やった」が台帳上で同じ形になる。
    if any(c.get("disposition") == "deferred" for c in checks) and not deferred_refs:
        print("ERROR: deferred な検査があるのに deferred_issue_refs が空 (fail-closed)", file=sys.stderr)
        return {}, 2

    decision = {
        "schema_version": "1.0",
        # dev-workflow.md【1】が必須と定める名前。computed_tier / rule_matches は
        # 「なぜその tier になったか」を残すための拡張で、tier は最終的な実効値を指す。
        "tier": effective,
        "matched_rules": [m["rule_id"] for m in evaluated["rule_matches"]],
        "decided_at": args.decided_at or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "target": args.target,
        "inputs": {
            "changed_paths": paths,
            "changed_file_count": len(paths),
            "changed_line_count": args.changed_line_count,
            "affected_packages": affected_packages(paths),
            "affected_package_count": len(affected_packages(paths)),
        },
        "checks": checks,
        "deferred_issue_refs": deferred_refs,
        "computed_tier": computed,
        "effective_tier": effective,
        "rule_matches": evaluated["rule_matches"],
        "changed_paths": paths,
        "downgrade": downgrade,
        "tier_selector": {
            "path": "scripts/select-verification-tier.py",
            "source_digest": source_digest(),
            "rules_digest": rules_digest(),
        },
    }
    if args.run_id:
        decision["run_id"] = args.run_id
    if args.supersedes:
        decision["supersedes"] = args.supersedes
    return decision, 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="変更 path から検証 tier を決定論的に算出する")
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--changed-path", action="append", default=[])
    parser.add_argument("--changed-paths-file")
    parser.add_argument("--from-git", metavar="BASE_REF")
    parser.add_argument("--downgrade-to", choices=list(TIERS))
    parser.add_argument("--reason", default="")
    parser.add_argument("--deferred-issue", action="append", default=[])
    parser.add_argument("--run-id")
    parser.add_argument("--target", help="feature id または task id (dev-workflow.md【1】必須)")
    parser.add_argument("--checks-file", help="build-verification-plan.py の出力 (checks / deferred_issue_refs)")
    parser.add_argument("--derive-checks", action="store_true",
                        help="gate 台帳から checks を直接導出する (plan を別 process で作らない)")
    parser.add_argument("--ledger", help="gate 台帳の path (--derive-checks 時)")
    parser.add_argument("--decided-at", help="判定時刻の固定 (テスト用)")
    parser.add_argument("--supersedes", help="この判定が置き換える過去 run_id (append-only の連鎖)")
    parser.add_argument("--out", help="tier-decision.json の書込先 (既存は上書きしない)")
    args = parser.parse_args(argv)

    repo_root = Path(args.repo_root).resolve()
    raw: list[str] = list(args.changed_path)
    args.changed_line_count = None
    if args.changed_paths_file:
        raw.extend(Path(args.changed_paths_file).read_text(encoding="utf-8").splitlines())
    if args.from_git:
        raw.extend(git_changed_paths(args.from_git, repo_root))
        # 実効変更行数は git 経路でしか実測できない。path 集合だけを渡された場合は
        # 推定値で埋めず null を残す (推定を実測値として記録しない)。
        args.changed_line_count = git_changed_lines(args.from_git, repo_root)
    if not (args.changed_path or args.changed_paths_file or args.from_git):
        print("ERROR: --changed-path / --changed-paths-file / --from-git のいずれかが必要", file=sys.stderr)
        return 1

    paths = normalize(raw)
    if not paths:
        # 変更 path 集合が空だと、どの規則にも該当せず既定の mvp が記録される。だがこれは
        # 「tooling だけの変更だった」ではなく「入力そのものが取れなかった」であることが多い
        # (base ref の指定違いで三点 diff が空集合になる等)。両者を同じ mvp へ潰すと、
        # 最も検査を削った判定が最も根拠の薄い経路から生まれる。
        print(
            f"ERROR: 変更 path 集合が空 (fail-closed)。判定入力が取得できなかった可能性があるため "
            "mvp を既定として記録しない。base ref の指定を確認する",
            file=sys.stderr,
        )
        return 2
    decision, code = build_decision(paths, args)
    if code != 0:
        return code

    if args.out:
        out_path = Path(args.out)
        # append-only: 既存 run の判定を上書き・削除しない (dev-workflow.md【1】)。
        if out_path.exists():
            print(f"ERROR: 既存の tier-decision を上書きしない (append-only): {out_path}", file=sys.stderr)
            return 2
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(decision, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps(decision, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
