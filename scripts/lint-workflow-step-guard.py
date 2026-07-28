#!/usr/bin/env python3
"""lint-workflow-step-guard.py

GitHub Actions の step-level `if:` が「評価時点では解決できない値」を参照していないかを
機械強制し、あわせて secret 有無による run/skip 分岐を手元で実測できるようにする。

背景 (HarnessHub-5u5k):
  governance-check.yml の Notion 検査 2 step は次のように書かれていた。

      if: ${{ env.NOTION_TOKEN != '' }}
      env:
        NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}

  GitHub Actions は step-level の `if` を step の `env` 適用より「前」に評価するため、
  この式は workflow / job レベルの env を見に行く。そこに定義が無いので式は恒久的に
  '' != '' = false となり、secret を投入しても step は一度も実行されない。
  「未設定なら skip」という意図に対し、実際は「常時 skip」の fail-open だった。
  同じ書き方は静的には自然に見えるため、人手のレビューでは再発しやすい。

検査項目 (--lint):
  1. step-level `if` が参照する `env.X` は、workflow-level env / job-level env /
     先行 step が $GITHUB_ENV へ書き出した名前 のいずれかで解決できること。
     step 自身の `env:` にしか定義が無いものは VIOLATION (上記 defect そのもの)。
  2. step-level `if` は `secrets` context を参照しないこと。
     steps.if で secrets context は利用できず、Actions は式の解決に失敗する。

ゲート実効性の実測 (--simulate):
  secrets / vars の投入状態を与えて各 step の `if` を評価し、run / skip を判定する。
  「token を入れたら本当に走るのか」「入れなければ skip で済むのか」を、GitHub 上で
  試行錯誤せずに手元で確認するための経路。

usage:
  python3 scripts/lint-workflow-step-guard.py [--workflows-dir PATH]
  python3 scripts/lint-workflow-step-guard.py --self-test
  python3 scripts/lint-workflow-step-guard.py --simulate \
      --workflow governance-check.yml --secret NOTION_TOKEN=dummy
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover - CI は PyYAML 前提
    sys.stderr.write("[ERR] PyYAML が必要です: pip install pyyaml\n")
    raise SystemExit(2)

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_WORKFLOWS_DIR = ROOT / ".github" / "workflows"

# `${{ ... }}` の中身を取り出す。if: は ${{ }} の有無に関わらず式として評価されるため、
# 両方の書き方を同じ経路へ寄せる。
WRAPPED_EXPR_RE = re.compile(r"^\s*\$\{\{(?P<body>.+)\}\}\s*$", re.S)
# 式中の context 参照 (env.X / secrets.X / vars.X ...)。
CONTEXT_REF_RE = re.compile(
    r"\b(?P<context>secrets|vars|env|github|needs|inputs|runner|steps|job|matrix|strategy)"
    r"(?:\.(?P<dot_name>[A-Za-z_][A-Za-z0-9_-]*)"
    r"|\[['\"](?P<bracket_name>[A-Za-z_][A-Za-z0-9_-]*)['\"]\])"
)
# `echo "NAME=value" >> "$GITHUB_ENV"` 系で後続 step へ渡される名前。
GITHUB_ENV_WRITE_RE = re.compile(
    r"^\s*echo\s+[\"']?(?P<name>[A-Za-z_][A-Za-z0-9_]*)=", re.M
)


def unwrap_expression(raw: str) -> str:
    """`${{ expr }}` を `expr` へ、素の式はそのまま返す。"""
    text = str(raw)
    match = WRAPPED_EXPR_RE.match(text)
    return match.group("body").strip() if match else text.strip()


def collect_github_env_writes(run_script: str) -> set[str]:
    """step の run が $GITHUB_ENV へ書き出す名前を集める (後続 step から env で見える)。"""
    if "GITHUB_ENV" not in run_script:
        return set()
    names = set()
    for line in run_script.splitlines():
        if "GITHUB_ENV" not in line:
            continue
        match = GITHUB_ENV_WRITE_RE.match(line)
        if match:
            names.add(match.group("name"))
    return names


def context_reference(match: re.Match[str]) -> tuple[str, str]:
    """dot / bracket の両記法を同じ (context, name) へ正規化する。"""
    return match.group("context"), match.group("dot_name") or match.group("bracket_name")


def classify_env_reference(name: str, scopes: dict[str, set[str]]) -> tuple[str, str]:
    """step-level `if` が参照する env 名 `name` を、その step から見えるスコープに照らして分類する。

    Args:
        name: `if` 式が `env.<name>` として参照している環境変数名。
        scopes: この step から見える定義元。キーは以下の 4 つ。
            - "workflow_env": workflow 直下の `env:` で定義された名前の集合
            - "job_env":      この step が属する job の `env:` で定義された名前の集合
            - "github_env":   先行 step が `$GITHUB_ENV` へ書き出した名前の集合
            - "step_env":     この step 自身の `env:` で定義された名前の集合

    Returns:
        (severity, detail) のタプル。severity は "ok" または "violation"。
        detail は違反時に運用者へ出す説明 (ok のときは空文字で良い)。
    """
    # if の評価時点で確定しているのは workflow / job レベルの env と、先行 step が
    # $GITHUB_ENV へ書き出した値の 3 つだけ。step 自身の env はまだ適用されていない。
    resolvable = scopes["workflow_env"] | scopes["job_env"] | scopes["github_env"]
    if name in resolvable:
        return "ok", ""

    # ここから下は「if が恒久的に '' として評価される」= 条件が常に false になるケース。
    # 症状は同じでも直し方が違うので、原因ごとにメッセージを分ける。
    if name in scopes["step_env"]:
        return "violation", (
            f"step-level if が `env.{name}` を参照しているが、`{name}` の定義は同じ step の "
            "`env:` にしかない。step の env は if の評価より後に適用されるため if からは "
            "見えず、式は常に '' として評価される (= この step は永久に skip)。"
            f"job-level env へ `HAS_{name}: ${{{{ secrets.{name} != '' }}}}` のような真偽値を"
            "置き、if からはそれを参照する (secret 本体は当該 step の env に残してよい)"
        )

    return "violation", (
        f"step-level if が `env.{name}` を参照しているが、workflow-level env / job-level env / "
        "先行 step の $GITHUB_ENV 書き出しのいずれにも定義が無い。式は常に '' として評価され、"
        "条件は恒久的に false になる。定義元を追加するか、if の条件式を見直すこと "
        "(先行 step が動的に設定している場合は `echo \"NAME=value\" >> \"$GITHUB_ENV\"` の形へ"
        "揃えると本 lint が定義元として認識する)"
    )


def lint_workflow(path: Path) -> list[str]:
    """1 つの workflow ファイルを検査し、違反メッセージの一覧を返す。"""
    doc = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    workflow_env = set((doc.get("env") or {}).keys())
    violations: list[str] = []

    for job_id, job in (doc.get("jobs") or {}).items():
        if not isinstance(job, dict):
            continue
        job_env = set((job.get("env") or {}).keys())
        github_env: set[str] = set()

        for index, step in enumerate(job.get("steps") or []):
            if not isinstance(step, dict):
                continue
            label = step.get("name") or step.get("uses") or f"step[{index}]"
            where = f"{path.name}:{job_id}:{label}"
            condition = step.get("if")

            if condition is not None:
                expr = unwrap_expression(condition)
                step_env = set((step.get("env") or {}).keys())
                scopes = {
                    "workflow_env": workflow_env,
                    "job_env": job_env,
                    "github_env": set(github_env),
                    "step_env": step_env,
                }
                for ref in CONTEXT_REF_RE.finditer(expr):
                    context, name = context_reference(ref)
                    if context == "secrets":
                        violations.append(
                            f"{where}: step-level if が `secrets.{name}` を参照している。"
                            "steps.if で secrets context は利用できない。job-level env へ "
                            f"`HAS_{name}: ${{{{ secrets.{name} != '' }}}}` のような真偽値を置き、"
                            "if からはそれを参照する"
                        )
                        continue
                    if context != "env":
                        continue
                    severity, detail = classify_env_reference(name, scopes)
                    if severity != "ok":
                        violations.append(f"{where}: {detail}")

            # $GITHUB_ENV への書き出しは「この step より後」から見える。順序を保って積む。
            github_env |= collect_github_env_writes(str(step.get("run") or ""))

    return violations


# ---------------------------------------------------------------------------
# ゲート実効性の実測 (--simulate)
# ---------------------------------------------------------------------------

LITERAL_RE = re.compile(r"^'(?P<value>.*)'$", re.S)


def _resolve_operand(token: str, contexts: dict[str, dict[str, str]]) -> str | None:
    """式のオペランド 1 個を文字列へ解決する。未対応構文は None。"""
    token = token.strip()
    literal = LITERAL_RE.match(token)
    if literal:
        return literal.group("value")
    if token in ("true", "false"):
        return token
    ref = CONTEXT_REF_RE.fullmatch(token)
    if not ref:
        return None
    context, name = context_reference(ref)
    pool = contexts.get(context)
    if pool is None:
        return None
    return pool.get(name, "")


def eval_expression(expr: str, contexts: dict[str, dict[str, str]]) -> bool | None:
    """限定文法の GitHub 式を評価する。対応: `A == B` / `A != B` / 単項 A。未対応は None。"""
    expr = unwrap_expression(expr)
    for operator in ("==", "!="):
        if operator in expr:
            left_raw, _, right_raw = expr.partition(operator)
            left = _resolve_operand(left_raw, contexts)
            right = _resolve_operand(right_raw, contexts)
            if left is None or right is None:
                return None
            return left == right if operator == "==" else left != right
    single = _resolve_operand(expr, contexts)
    if single is None:
        return None
    return single not in ("", "false")


def simulate_workflow(
    path: Path, secrets: dict[str, str], variables: dict[str, str]
) -> list[tuple[str, str, bool | None]]:
    """secrets / vars の投入状態を仮定し、各 step が run されるか skip されるかを判定する。

    Returns: [(job_id, step_label, will_run)] 。will_run が None は式が未対応構文で判定不能。
    """
    doc = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    base_contexts = {"secrets": secrets, "vars": variables}
    results: list[tuple[str, str, bool | None]] = []

    def resolve_env_block(block: dict, contexts: dict[str, dict[str, str]]) -> dict[str, str]:
        """env: の各値 (式を含みうる) を実際の文字列へ落とす。"""
        resolved = {}
        for key, raw in (block or {}).items():
            text = str(raw)
            if "${{" in text:
                expr = unwrap_expression(text)
                operand = _resolve_operand(expr, contexts)
                if operand is not None:
                    resolved[key] = operand
                    continue
                verdict = eval_expression(expr, contexts)
                if verdict is not None:
                    resolved[key] = "true" if verdict else "false"
                    continue
                resolved[key] = ""
                continue
            resolved[key] = text
        return resolved

    workflow_env = resolve_env_block(doc.get("env") or {}, base_contexts)

    for job_id, job in (doc.get("jobs") or {}).items():
        if not isinstance(job, dict):
            continue
        env_state = dict(workflow_env)
        env_state.update(resolve_env_block(job.get("env") or {}, base_contexts))

        for index, step in enumerate(job.get("steps") or []):
            if not isinstance(step, dict):
                continue
            label = step.get("name") or step.get("uses") or f"step[{index}]"
            condition = step.get("if")
            if condition is None:
                will_run: bool | None = True
            else:
                # step 自身の env は if の評価に「効かない」。この非対称性こそが本 defect の
                # 原因なので、シミュレータでも意図的に step env を混ぜない。
                will_run = eval_expression(str(condition), {**base_contexts, "env": env_state})
            results.append((job_id, label, will_run))
            if will_run:
                for name in collect_github_env_writes(str(step.get("run") or "")):
                    env_state.setdefault(name, "<set-by-previous-step>")

    return results


# ---------------------------------------------------------------------------
# self-test
# ---------------------------------------------------------------------------

BROKEN_FIXTURE = """
name: broken
on: [push]
jobs:
  guard:
    runs-on: ubuntu-latest
    steps:
      - name: gated step
        if: ${{ env.MY_TOKEN != '' }}
        env:
          MY_TOKEN: ${{ secrets.MY_TOKEN }}
        run: echo run
"""

FIXED_FIXTURE = """
name: fixed
on: [push]
jobs:
  guard:
    runs-on: ubuntu-latest
    env:
      HAS_MY_TOKEN: ${{ secrets.MY_TOKEN != '' }}
    steps:
      - name: gated step
        if: env.HAS_MY_TOKEN == 'true'
        env:
          MY_TOKEN: ${{ secrets.MY_TOKEN }}
        run: echo run
"""

SECRETS_IN_IF_FIXTURE = """
name: secrets-in-if
on: [push]
jobs:
  guard:
    runs-on: ubuntu-latest
    steps:
      - name: gated step
        if: ${{ secrets.MY_TOKEN != '' }}
        run: echo run
"""

GITHUB_ENV_FIXTURE = """
name: github-env
on: [push]
jobs:
  guard:
    runs-on: ubuntu-latest
    steps:
      - name: export flag
        run: echo "LATE_FLAG=yes" >> "$GITHUB_ENV"
      - name: gated step
        if: env.LATE_FLAG == 'yes'
        run: echo run
"""


def _lint_text(tmp_dir: Path, name: str, text: str) -> list[str]:
    path = tmp_dir / name
    path.write_text(text, encoding="utf-8")
    return lint_workflow(path)


def self_test() -> int:
    import tempfile

    failures: list[str] = []
    with tempfile.TemporaryDirectory() as raw_tmp:
        tmp = Path(raw_tmp)

        # 1. defect パターン: step 自身の env にしか定義が無い → 検出できること
        broken = _lint_text(tmp, "broken.yml", BROKEN_FIXTURE)
        if not broken:
            failures.append("broken fixture (step-level env のみ) を検出できていない")

        # 2. 修正パターン: job-level env の真偽値経由 → 誤検出しないこと
        fixed = _lint_text(tmp, "fixed.yml", FIXED_FIXTURE)
        if fixed:
            failures.append(f"fixed fixture を誤検出した: {fixed}")

        # 3. steps.if で secrets context を参照 → 検出できること
        secrets_in_if = _lint_text(tmp, "secrets-in-if.yml", SECRETS_IN_IF_FIXTURE)
        if not secrets_in_if:
            failures.append("steps.if の secrets 参照を検出できていない")

        # 4. 先行 step の $GITHUB_ENV 書き出し → 正当な定義元として誤検出しないこと
        github_env = _lint_text(tmp, "github-env.yml", GITHUB_ENV_FIXTURE)
        if github_env:
            failures.append(f"$GITHUB_ENV 由来の定義を誤検出した: {github_env}")

        # 5. ゲート実効性: 修正パターンが token 有無で run/skip を切り替えること
        fixed_path = tmp / "fixed.yml"
        with_token = simulate_workflow(fixed_path, {"MY_TOKEN": "dummy"}, {})
        without_token = simulate_workflow(fixed_path, {}, {})
        if not all(run is True for _, _, run in with_token):
            failures.append(f"token 投入時に run されない step がある: {with_token}")
        if not all(run is False for _, _, run in without_token):
            failures.append(f"token 未投入時に skip されない step がある: {without_token}")

        # 6. defect パターンは token を投入しても skip のまま (fail-open の再現)
        broken_with_token = simulate_workflow(tmp / "broken.yml", {"MY_TOKEN": "dummy"}, {})
        if any(run is True for _, _, run in broken_with_token):
            failures.append("defect fixture が token 投入で run されてしまった (再現失敗)")

    for message in failures:
        print(f"[NG] {message}")
    if failures:
        print(f"self-test: FAIL ({len(failures)} 件)")
        return 1
    print("self-test: OK (6 checks)")
    return 0


def _parse_assignments(pairs: list[str]) -> dict[str, str]:
    result = {}
    for pair in pairs:
        name, _, value = pair.partition("=")
        result[name.strip()] = value
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workflows-dir", default=str(DEFAULT_WORKFLOWS_DIR))
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--simulate", action="store_true",
                        help="secret/vars の投入状態を仮定して run/skip を実測する")
    parser.add_argument("--workflow", help="--simulate 対象の workflow ファイル名")
    parser.add_argument("--secret", action="append", default=[], metavar="NAME=VALUE")
    parser.add_argument("--var", action="append", default=[], metavar="NAME=VALUE")
    args = parser.parse_args()

    if args.self_test:
        return self_test()

    workflows_dir = Path(args.workflows_dir)

    if args.simulate:
        if not args.workflow:
            parser.error("--simulate には --workflow が必要です")
        target = workflows_dir / args.workflow
        secrets = _parse_assignments(args.secret)
        variables = _parse_assignments(args.var)
        print(f"# simulate {target.name} "
              f"(secrets={sorted(secrets) or '[]'} vars={sorted(variables) or '[]'})")
        for job_id, label, will_run in simulate_workflow(target, secrets, variables):
            mark = {True: "RUN ", False: "SKIP", None: "????"}[will_run]
            print(f"{mark} {job_id}: {label}")
        return 0

    if not workflows_dir.is_dir():
        print(f"[SKIP] workflows dir not found: {workflows_dir}")
        return 0

    all_violations: list[str] = []
    checked = 0
    for path in sorted(workflows_dir.glob("*.y*ml")):
        checked += 1
        all_violations.extend(lint_workflow(path))

    for message in all_violations:
        print(f"VIOLATION {message}")
    print(f"summary: workflows={checked} violations={len(all_violations)}")
    return 1 if all_violations else 0


if __name__ == "__main__":
    raise SystemExit(main())
