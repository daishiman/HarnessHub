"""live-trial task 契約 lint の決定論的な解析・検査ロジック。

正本契約: issues/sys-c19-live-trial-task-fixture-contract-drift-20260726.md (HarnessHub-768b)。

## なぜ必要か

live-trial の task.md は run-skill-live-trial の準備局面で
``references/task-template.md`` を cp し、人が placeholder を埋めて作る。scenario 固有の
「入力前提」は template に無いため、実運用では過去の成功 run の task.md を複製していた。
その結果 C19 で、fixture 生成器 (shape_system_spec.py) が brief 1 file しか置かないのに
task.md が「確定成果物は事前配置済み・正規フローの再実行は禁止」と仮定する矛盾が生まれ、
被験 skill が正規フローを実行できず FAIL した。前提の食い違いを誰も機械検査していなかった。

本 lint は 3 つの正本を 1 経路で突合する:

  1. fixture 形状   plugins/dev-graph/tests/fixtures/live_trial_shapes/shape_*.py の TASK_CONTRACT
  2. scenario       plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json
  3. task 指示      eval-log/<plugin>/<skill>/live-trial/<run-id>/task.md

## 二層の検査

- 層A (決定論生成・強制): task.md が premise block マーカーを持つ場合、その
  ``contract-digest`` が 1 と 2 から再導出した digest と一致しなければ違反。
  ``--emit-premise`` が生成する block をそのまま貼れば一致する。scenario の args や
  観測条件、fixture の配置物が動けば digest が変わり、task を更新しない限り落ちる。
- 層B (後方互換・自然文): マーカーを持たない既存 task.md も、args のトークン一致 /
  entry point の明示 / 旧前提フレーズの不在 / 観測条件の被覆を検査する。既に取得済みの
  合格証跡 (改変してはならない) を再検査できるようにするため、層B を残す。

## 検出 rule

  LT-001  scenario-unstated        task.md が既知 scenario_id を 1 つも含まない
  LT-002  scenario-unknown         含む scenario_id が scenario 正本に無い
  LT-003  placed-input-unstated    fixture が置く入力への言及が無い
  LT-004  absent-artifact-asserted fixture が置かない成果物を「事前配置済み」と主張している
  LT-005  stale-premise-phrase     正規フローの再実行を禁じる旧前提が残っている
  LT-006  args-drift               Skill 呼出しの args が task_args_template とトークン不一致
  LT-007  entry-point-unstated     required entry point の記載漏れ
  LT-008  skill-tool-unrequired    委譲先 entry point を Skill ツールで呼ぶ要求が無い
  LT-009  observation-uncovered    required_observations の被覆キーワードが揃っていない
  LT-010  observation-contract-drift  observation_keywords 件数 != required_observations 件数
  LT-011  premise-digest-mismatch  premise block の contract-digest が正本と不一致
  LT-012  task-missing             --all で対象 run の task.md が見つからない

Exit codes:
  0  違反 0 件
  1  一般エラー (repo-root 不正・正本欠落・shape import 失敗)
  2  違反検出 (fail-closed)

CLI と前提節の出力処理は ``scripts/lint-live-trial-task-contract.py`` に分離する。この module は
fixture/scenario/task の契約照合だけを担い、単一責務を維持する。
"""
from __future__ import annotations

import hashlib
import importlib
import json
import re
import shlex
import sys
from pathlib import Path
from typing import Any

from live_trial_evidence_selection import task_path_from_criteria_receipt

LINT_NAME = "lint-live-trial-task-contract"

FIXTURES_REL = "plugins/dev-graph/tests/fixtures"
SHAPES_REL = f"{FIXTURES_REL}/live_trial_shapes"
SCENARIOS_REL = f"{FIXTURES_REL}/live-trial-positive-scenarios.json"
# scenario 正本は dev-graph plugin の live-trial だけを載せる。証跡の置き場所は
# lint-eval-log-layout.py が固定する eval-log/<plugin>/<skill>/live-trial/<run-id>/。
EVIDENCE_PLUGIN = "dev-graph"

PREMISE_BEGIN = re.compile(
    r"<!--\s*live-trial-premise:begin\s+scenario=(?P<scenario>[\w.\-]+)"
    r"\s+contract-digest=(?P<digest>[0-9a-f]+)\s*-->"
)
PREMISE_END = "<!-- live-trial-premise:end -->"

# task.md 先頭の Skill 呼出し。live-trial の launch 判定 (transcript に Skill 起動が
# 1 件以上) の対象そのものなので、args はここから読む。
SKILL_CALL = re.compile(
    r"""Skill\(\{\s*skill:\s*["'](?P<skill>[^"']+)["']\s*,\s*args:\s*["'](?P<args>[^"']*)["']\s*\}\)"""
)

# 「委譲先 entry point を Skill ツールで呼ぶ」要求 (LT-008)。
# 単に "Skill" の有無を見るだけでは、LT-006 が要求する被験 skill 自身の呼出し式
# (Skill({skill: ..., args: ...})) が必ず含まれるため常に成立し、rule が空虚になる。
# 実測では旧 task も新 task も entry point 語を持つが、両者を同一行に置くのは
# 委譲経路を指示している新 task だけだった。この非対称性を判定軸にする。
_ENTRY_POINT_TERM = r"(?:entry ?point|エントリ ?ポイント)"
ENTRY_POINT_VIA_SKILL = re.compile(
    rf"^(?:[^\n]*{_ENTRY_POINT_TERM}[^\n]*Skill|[^\n]*Skill[^\n]*{_ENTRY_POINT_TERM})[^\n]*$",
    re.MULTILINE,
)

# 旧前提を拒否する述語パターン (LT-004 / LT-005)。
#
# 選定方針: 「事前性・完了性を明示する語」だけを採り、中立語 (存在・揃っている・確定) は
# 採らない。合格側の task.md は正規フロー完走 *後* の実測対象として同じ artifact 名を挙げる
# ため (「`system-spec/completeness-report.json` の `verdict`」等)、中立語を入れると
# 正当な実測要求へ誤爆して既存の合格証跡が CI で落ちる。
#
# 実測による裏付け (2026-07-28): 下記 9 語 + 4 regex の全てが FAIL 側の実物
# (20260726T040700Z-sysspec-final/task.md) に 1 件以上ヒットし、PASS 側の実物
# (20260726T050519Z-sysspec-final2/task.md) には 1 件もヒットしない。
# test_live_trial_task_contract.py がこの非対称性を実物 2 件で回帰固定する。

# absent_artifacts の path/basename と同じ行に現れたら「fixture に既にある」という
# 主張とみなす語 (部分一致)。同居条件を付けるのは、artifact 名を伴わない一般的な
# 完了表現 (goal-seek 節の「計算済み」等) を巻き込まないため。
_PRESENCE_PREDICATES: tuple[str, ...] = (
    "事前配置",
    "既に存在",
    "既にある",
    "入っています",
    "収集済み",
    "生成済み",
    "作成済み",
    "配置済み",
    "マーカー付き",
)

# (regex, 何が問題か) の組。artifact 名を伴わずに正規フロー自体を否定する旧前提は
# 行単位で拾う。fixture は成果物を置かないので、これらが残っていると被験 skill は
# required_observations[0] (canonical flow completes) を満たせない。
_STALE_PREMISE_PATTERNS: tuple[tuple[str, str], ...] = (
    (
        r"再実行[^。]*(?:しないこと|しないで|作り直さない|禁止|不要)",
        "正規フローの再実行を禁じる旧前提が残っている "
        "(fixture は成果物を置かないので、正規フローの完走こそが測定対象)",
    ),
    (
        r"(?:既に|すでに)[^。]*(?:完走|完了)した",
        "正規フローが既に完走済みという旧前提が残っている "
        "(fixture が置くのは placed_inputs だけ)",
    ),
    (
        r"(?:WebFetch|WebSearch)[^。]*使わない",
        "外部取得の抑止が残っている (doc-fetch entry point の完走を妨げる)",
    ),
    (
        r"実質(?:の|的な)作業",
        "正規フローの一部工程だけを作業とみなす旧前提が残っている",
    ),
)


class LintError(Exception):
    """検査を続行できない一般エラー (exit 1)。"""


# --------------------------------------------------------------------------- 正本の読み込み


def load_shape_contracts(root: Path) -> dict[str, dict[str, Any]]:
    """TASK_CONTRACT を宣言した shape module だけを {shape: contract} で返す。

    contract を持たない shape は検査対象外 (issue の scope_out「他 scenario の task
    generator 全面再設計」に踏み込まないため)。宣言した shape が増えれば自動で対象になる。

    生成器の写しを検査側に持たず module としてそのまま読むのは lint-live-trial-verdict.py と
    同じ SSOT 方針。shape は ``from .base_shape import ...`` の相対 import を持つので
    file 直読み (spec_from_file_location) では解決できず、fixtures ディレクトリを
    sys.path へ載せて package として import し、shape 名の対応は package 側の
    ``SHAPE_MODULES`` (正本) に委ねる。
    """
    fixtures_dir = root / FIXTURES_REL
    if not (fixtures_dir / "live_trial_shapes" / "__init__.py").is_file():
        raise LintError(f"shape package が無い: {SHAPES_REL}")
    if str(fixtures_dir) not in sys.path:
        sys.path.insert(0, str(fixtures_dir))
    try:
        package = importlib.import_module("live_trial_shapes")
    except Exception as exc:  # noqa: BLE001 — import 失敗は検査不能 (exit 1)
        raise LintError(f"shape package の import に失敗: {SHAPES_REL}: {exc}") from exc
    shape_modules = getattr(package, "SHAPE_MODULES", None)
    if not isinstance(shape_modules, dict):
        raise LintError(f"live_trial_shapes.SHAPE_MODULES が dict でない: {SHAPES_REL}")

    contracts: dict[str, dict[str, Any]] = {}
    for shape, module_name in sorted(shape_modules.items()):
        try:
            module = importlib.import_module(f"live_trial_shapes.{module_name}")
        except Exception as exc:  # noqa: BLE001
            raise LintError(f"shape module の import に失敗: {module_name}: {exc}") from exc
        contract = getattr(module, "TASK_CONTRACT", None)
        if contract is None:
            continue
        if not isinstance(contract, dict):
            raise LintError(f"TASK_CONTRACT は dict である必要がある: {module_name}")
        contracts[str(shape)] = contract
    return contracts


def load_scenarios(root: Path) -> dict[str, dict[str, Any]]:
    path = root / SCENARIOS_REL
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise LintError(f"scenario 正本を読めない: {SCENARIOS_REL}: {exc}") from exc
    scenarios = data.get("scenarios") if isinstance(data, dict) else None
    if not isinstance(scenarios, list):
        raise LintError(f"scenario 正本の scenarios が配列でない: {SCENARIOS_REL}")
    result: dict[str, dict[str, Any]] = {}
    for entry in scenarios:
        if isinstance(entry, dict) and isinstance(entry.get("scenario_id"), str):
            result[entry["scenario_id"]] = entry
    return result


def contract_digest(contract: dict[str, Any], scenario: dict[str, Any]) -> str:
    """fixture 契約と scenario 契約を 1 つの digest へ束ねる (16 hex)。

    task.md の premise block はこの digest を持つ。どちらの正本が動いても digest が
    変わるので、「scenario ID / task args / required observations / fixture contract の
    変更が 1 つの検証経路へ束ねられる」(受入条件 5) が digest 1 個で成立する。
    fixture の実 path は run ごとに違うため digest の入力に含めない。
    """
    payload = {
        "contract": _canonical(contract),
        "scenario": {
            key: _canonical(scenario.get(key))
            for key in (
                "scenario_id", "skill", "task_args_template", "fixture_contract",
                "required_observations", "task_contract", "resource_budget",
                "forbidden_invoked_skills",
            )
        },
    }
    blob = json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()[:16]


def _canonical(value: Any) -> Any:
    """tuple を list へ落として JSON 決定論化する (dict は key 順で安定化済み)。"""
    if isinstance(value, tuple):
        return [_canonical(item) for item in value]
    if isinstance(value, list):
        return [_canonical(item) for item in value]
    if isinstance(value, dict):
        return {str(key): _canonical(item) for key, item in sorted(value.items())}
    return value


# --------------------------------------------------------------------------- task.md の解析


def extract_skill_args(text: str) -> tuple[str, str] | None:
    """最初の Skill 呼出しから (skill, args) を返す。無ければ None。"""
    match = SKILL_CALL.search(text)
    if match is None:
        return None
    return match.group("skill"), match.group("args")


def args_drift(template: str, actual: str) -> str | None:
    """task_args_template と実 args のトークン列を突合し、差分理由を返す (一致なら None)。

    ``<placeholder>`` は任意の 1 トークンにマッチする。件数一致を要求するので、
    template に無い flag (旧 C19 task の ``--resume`` が実例) の混入を確実に落とせる。
    自然文マッチに頼らずに前提ドリフトを検出できる唯一の決定論的な軸。
    """
    try:
        expected = shlex.split(template)
        got = shlex.split(actual)
    except ValueError as exc:
        return f"args を分割できない: {exc}"
    if len(expected) != len(got):
        return (
            f"トークン数が違う (template {len(expected)} 個 {expected} / "
            f"実 args {len(got)} 個 {got})"
        )
    for index, (want, have) in enumerate(zip(expected, got)):
        if want.startswith("<") and want.endswith(">"):
            continue
        if want != have:
            return f"トークン {index} が違う (template {want!r} / 実 args {have!r})"
    return None


def premise_block(text: str) -> tuple[str, str] | None:
    """premise block の (scenario_id, contract-digest) を返す。マーカー無しなら None。"""
    match = PREMISE_BEGIN.search(text)
    if match is None:
        return None
    return match.group("scenario"), match.group("digest")


def _mentions(text: str, needle: str) -> bool:
    """path はそのままか basename でも言及として認める (task.md は略記することがある)。"""
    return needle in text or Path(needle).name in text


def _lines_with(text: str, needle: str) -> list[str]:
    name = Path(needle).name
    return [line for line in text.splitlines() if needle in line or name in line]


# --------------------------------------------------------------------------- 検査本体


def check_task(
    text: str,
    *,
    contract: dict[str, Any],
    scenario: dict[str, Any],
    scenarios: dict[str, dict[str, Any]],
) -> list[dict[str, str]]:
    """task.md 1 件の違反リストを返す (空 = 合格)。"""
    violations: list[dict[str, str]] = []

    def add(rule: str, detail: str) -> None:
        violations.append({"rule": rule, "detail": detail})

    scenario_id = str(scenario.get("scenario_id", ""))
    if scenario_id not in scenarios:
        add("LT-002", f"scenario_id {scenario_id!r} が scenario 正本 {SCENARIOS_REL} に無い")
    if scenario_id and scenario_id not in text:
        add("LT-001", f"対象 scenario_id {scenario_id!r} が task.md に明記されていない")

    # 層A: premise block があれば digest 一致を強制する。
    expected_digest = contract_digest(contract, scenario)
    block = premise_block(text)
    if block is not None:
        block_scenario, block_digest = block
        if block_scenario != scenario_id:
            add("LT-011", f"premise block の scenario={block_scenario!r} が対象 {scenario_id!r} と不一致")
        if block_digest != expected_digest:
            add(
                "LT-011",
                f"premise block の contract-digest {block_digest} != 正本 {expected_digest} "
                "(fixture 契約または scenario が更新された — --emit-premise で前提節を作り直すこと)",
            )
        if PREMISE_END not in text:
            add("LT-011", f"premise block の終端マーカー {PREMISE_END} が無い")

    # 層B: 自然文の task.md も同じ観測を要求する。
    placed = [str(item) for item in contract.get("placed_inputs", ())]
    for relative in placed:
        if not _mentions(text, relative):
            add("LT-003", f"fixture が置く入力 {relative} への言及が task.md に無い")

    absent = [str(item) for item in contract.get("absent_artifacts", ())]
    for relative in absent:
        for line in _lines_with(text, relative):
            for predicate in _PRESENCE_PREDICATES:
                if predicate in line:
                    add(
                        "LT-004",
                        f"fixture が置かない {relative} を存在前提で記述している "
                        f"(述語 {predicate!r}): {line.strip()[:120]}",
                    )
                    break

    workflow_mode = str(contract.get("workflow_mode", "build"))
    if workflow_mode != "reuse-confirmed":
        for pattern, reason in _STALE_PREMISE_PATTERNS:
            for line in text.splitlines():
                if re.search(pattern, line):
                    add("LT-005", f"{reason}: {line.strip()[:120]}")
                    break

    template = scenario.get("task_args_template")
    invocation = extract_skill_args(text)
    if invocation is None:
        add("LT-006", "task.md に Skill({skill: ..., args: ...}) 呼出しが無い")
    else:
        expected_skill = scenario.get("skill")
        accepted_skills = (
            {expected_skill, f"{EVIDENCE_PLUGIN}:{expected_skill}"}
            if isinstance(expected_skill, str)
            else set()
        )
        if accepted_skills and invocation[0] not in accepted_skills:
            add(
                "LT-006",
                f"被験 skill が scenario 正本とずれている "
                f"(expected one of {sorted(accepted_skills)!r} / actual {invocation[0]!r})",
            )
        if isinstance(template, str):
            drift = args_drift(template, invocation[1])
            if drift is not None:
                add("LT-006", f"args が task_args_template とずれている — {drift}")

    entry_points = [str(item) for item in contract.get("required_entry_points", ())]
    missing = [name for name in entry_points if name not in text]
    if missing:
        add("LT-007", f"required entry point の記載漏れ: {', '.join(missing)}")
    if entry_points and workflow_mode != "reuse-confirmed" and not ENTRY_POINT_VIA_SKILL.search(text):
        add(
            "LT-008",
            "委譲先 entry point を `Skill` ツールで呼ぶ要求が task.md に無い "
            "(被験 skill 自身の起動要求だけでは、委譲が Skill 経由か Bash 直叩きかを測れない)",
        )

    observations = scenario.get("required_observations")
    keywords = contract.get("observation_keywords", ())
    if isinstance(observations, list) and len(observations) != len(keywords):
        add(
            "LT-010",
            f"observation_keywords {len(keywords)} 件 != required_observations "
            f"{len(observations)} 件 (scenario 側の観測条件が動いた — 契約を追従させること)",
        )
    else:
        for index, group in enumerate(keywords):
            absent_keywords = [word for word in group if str(word) not in text]
            if absent_keywords:
                label = ""
                if isinstance(observations, list) and index < len(observations):
                    label = f" ({str(observations[index])[:60]})"
                add(
                    "LT-009",
                    f"required_observations[{index}]{label} の被覆キーワード不足: "
                    f"{', '.join(absent_keywords)}",
                )

    return violations


def resolve_scenario(
    contract: dict[str, Any], scenarios: dict[str, dict[str, Any]]
) -> dict[str, Any]:
    scenario_id = str(contract.get("scenario_id", ""))
    scenario = scenarios.get(scenario_id)
    if scenario is None:
        # scenario 不在でも検査は続ける (LT-002 として報告する) ため最小 dict を返す。
        return {"scenario_id": scenario_id}
    return scenario


def latest_task_path(root: Path, skill: str) -> Path | None:
    """criteria receipt の PASS evidence、次に最新 run-id の task.md を返す。

    criteria receipt が採用した current PASS を優先することで、時計ずれを含む run-id の
    辞書順が古い verdict を勝たせない。receipt が無い場合だけ、従来どおり verdict 保有
    run-id の辞書順最大へ後退する。verdict の無い中断 run は常に対象外である。
    """
    receipted = task_path_from_criteria_receipt(root, skill)
    if receipted is not None:
        return receipted
    base = root / "eval-log" / EVIDENCE_PLUGIN / skill / "live-trial"
    if not base.is_dir():
        return None
    candidates = sorted(
        (
            directory
            for directory in base.iterdir()
            if directory.is_dir() and (directory / "verdict.json").is_file()
        ),
        key=lambda directory: directory.name,
    )
    for directory in reversed(candidates):
        if (directory / "task.md").is_file():
            return directory / "task.md"
    return None


def find_contract(
    contracts: dict[str, dict[str, Any]], *, shape: str | None, text: str | None
) -> tuple[str, dict[str, Any]]:
    """--shape 明示があればそれ、無ければ task.md 本文の scenario_id から shape を解決する。"""
    if shape is not None:
        if shape not in contracts:
            raise LintError(
                f"shape {shape!r} は TASK_CONTRACT を宣言していない (宣言済み: {sorted(contracts)})"
            )
        return shape, contracts[shape]
    if text is None:
        raise LintError("--shape か --task のどちらかが必要")
    hits = [
        (name, contract)
        for name, contract in sorted(contracts.items())
        if str(contract.get("scenario_id", "")) and str(contract["scenario_id"]) in text
    ]
    if not hits:
        if len(contracts) == 1:
            # 単一契約なら対象を一意に決められる。check_task が LT-001 を JSON violation
            # として返せるため、契約違反を一般エラー (exit 1) に潰さない。
            return next(iter(sorted(contracts.items())))
        raise LintError(
            "task.md が既知 scenario_id を含まないため shape を解決できない (LT-001) — "
            f"--shape で明示するか scenario_id を task.md に書くこと (宣言済み: {sorted(contracts)})"
        )
    if len(hits) > 1:
        raise LintError(f"task.md が複数 scenario_id を含む: {[name for name, _ in hits]}")
    return hits[0]
