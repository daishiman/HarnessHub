#!/usr/bin/env python3
"""Validate features/<id>.context.json against the contract the plan verb enforces.

`context.json` は `/dev-graph plan --feature-context` の唯一の入力で、その形状は
resolve-project-context.py の validate_feature_context() が fail-closed で検査している。
ところがこの検査は **plan を起動して初めて走る**。作成・編集の時点では誰も見ていないため、
契約に反した sidecar がリポジトリへ入り込み、その feature を plan しようとした人が
初めて気付く (実際 30 件中 4 件が plan 不能のまま滞留していた)。

ここはその検査を作成時に前倒しするだけの薄い入口である。**契約を再実装しない**のが
最重要の設計判断で、plan 側の関数をそのまま import する。契約を書き写すと、片方だけが
更新されたときに「作成時は緑なのに plan で落ちる」という最悪の乖離が生まれる。

exit code: 0 = 全件適合 / 1 = 契約違反あり / 2 = 実行不能 (graph 欠落・import 失敗等)
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path


# plan 側のゲート本体。ここから契約を import することで実装を 1 つに保つ。
PLAN_GATE = Path("plugins/system-dev-planner/scripts/resolve-project-context.py")
CONTEXT_WRITER = Path("scripts/build-feature-context.py")

REPAIR_HINT = (
    "graph.json 側に同じ値があるキーは重複なので削る "
    "(python3 scripts/build-feature-context.py --check で突合できる)。"
    "architecture_refs は実在するファイルパスで書く (node id 表記は plan が解決できない)"
)


class ValidationUnavailable(Exception):
    """検査そのものが実行できない。緑と区別する必要があるので専用の例外にする。"""


def load_plan_gate(repo_root: Path):
    """plan 側の validate_feature_context をそのまま借りてくる。

    sys.path を汚さず明示パスで読む。契約を写経しないこと自体が本 script の存在意義なので、
    import に失敗したら「検査できなかった」として exit 2 で落とす (契約無しで緑にしない)。
    """
    target = repo_root / PLAN_GATE
    if not target.is_file():
        raise ValidationUnavailable(f"plan gate が見つからない: {PLAN_GATE}")
    spec = importlib.util.spec_from_file_location("_plan_gate_for_validation", target)
    if spec is None or spec.loader is None:
        raise ValidationUnavailable(f"plan gate を読み込めない: {PLAN_GATE}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    try:
        spec.loader.exec_module(module)
    except Exception as exc:  # pragma: no cover - import 段の異常は環境依存
        raise ValidationUnavailable(f"plan gate の import に失敗: {exc}") from exc
    gate = getattr(module, "validate_feature_context", None)
    if gate is None:
        raise ValidationUnavailable(
            "plan gate に validate_feature_context が無い。"
            "関数名が変わったなら本 script の参照も直すこと"
        )
    # 契約違反として扱ってよい例外型も plan ゲートから取る。これ以外の例外は
    # 「対象ファイルが悪い」ではなく「検査側が壊れている」なので、違反に混ぜない。
    violation_types = tuple(
        error for error in (
            getattr(module, "PolicyError", None), getattr(module, "UsageError", None),
        ) if isinstance(error, type)
    )
    if not violation_types:
        raise ValidationUnavailable(
            "plan gate に PolicyError / UsageError が無い。"
            "違反と検査不能を区別できないため検査しない"
        )
    return gate, violation_types


def load_context_writer(repo_root: Path):
    """凍結判定 (digest_bindings) の実装を借りる。束縛の定義を 2 つに増やさない。"""
    target = repo_root / CONTEXT_WRITER
    if not target.is_file():
        raise ValidationUnavailable(f"context writer が見つからない: {CONTEXT_WRITER}")
    spec = importlib.util.spec_from_file_location("_context_writer_for_validation", target)
    if spec is None or spec.loader is None:
        raise ValidationUnavailable(f"context writer を読み込めない: {CONTEXT_WRITER}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    try:
        spec.loader.exec_module(module)
    except Exception as exc:  # pragma: no cover - import 段の異常は環境依存
        raise ValidationUnavailable(f"context writer の import に失敗: {exc}") from exc
    if not hasattr(module, "digest_bindings"):
        raise ValidationUnavailable("context writer に digest_bindings が無い")
    return module


def feature_ids(repo_root: Path) -> list[str]:
    return sorted(
        path.name[: -len(".context.json")]
        for path in (repo_root / "features").glob("*.context.json")
    )


def check_feature(gate, violation_types, repo_root: Path, feature_id: str) -> dict:
    """1 件を plan と同じ基準で検査する。違反は握り潰さず理由文字列で返す。

    捕まえるのは plan ゲートが違反として送出する型だけ。想定外の例外を違反へ混ぜると、
    検査側のバグが「その feature が悪い」という誤った結論になり、直す場所を間違える。
    """
    rel = f"features/{feature_id}.context.json"
    try:
        gate(repo_root, feature_id, rel)
    except violation_types as exc:
        return {"feature_id": feature_id, "path": rel, "ok": False, "reason": str(exc)}
    except Exception as exc:
        raise ValidationUnavailable(
            f"{rel} の検査中に想定外の例外: {type(exc).__name__}: {exc}"
        ) from exc
    return {"feature_id": feature_id, "path": rel, "ok": True, "reason": None}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", default=".", type=Path)
    parser.add_argument(
        "--feature",
        action="append",
        default=[],
        metavar="FEATURE_ID",
        help="対象 feature id。複数指定可。省略時は全件",
    )
    parser.add_argument(
        "--skip-frozen",
        action="store_true",
        help="plan digest に束縛済み (=凍結) の feature を外す。件数は必ず表示する",
    )
    parser.add_argument("--json", action="store_true", help="結果を JSON で出す")
    args = parser.parse_args(argv)

    repo_root = args.repo_root.resolve()

    # 「検査できなかった」を「違反なし」とも「違反あり」とも取り違えないため、
    # 検査不能は最後まで exit 2 の一本道で扱う。
    try:
        gate, violation_types = load_plan_gate(repo_root)

        targets = list(dict.fromkeys(args.feature)) or feature_ids(repo_root)
        if not targets:
            raise ValidationUnavailable("検査対象の features/*.context.json が 1 件も無い")

        frozen: list[str] = []
        if args.skip_frozen:
            writer = load_context_writer(repo_root)
            kept = []
            for feature_id in targets:
                if writer.digest_bindings(repo_root, feature_id):
                    frozen.append(feature_id)
                else:
                    kept.append(feature_id)
            targets = kept

        results = [
            check_feature(gate, violation_types, repo_root, feature_id) for feature_id in targets
        ]
    except ValidationUnavailable as error:
        print(f"error: {error}", file=sys.stderr)
        return 2

    violations = [result for result in results if not result["ok"]]

    if args.json:
        print(json.dumps(
            {
                "checked": len(results),
                "frozen_skipped": frozen,
                "violations": [result["feature_id"] for result in violations],
                "features": results,
            },
            ensure_ascii=False, indent=2, sort_keys=True,
        ))
    else:
        # 検査件数を必ず出す。0 件検査の緑は「契約を満たした」ではなく「何も見ていない」。
        print(f"checked {len(results)} feature (frozen skipped: {len(frozen)})")
        for result in violations:
            print(f"{result['path']}: {result['reason']}")
        if violations:
            print(f"\nrepair: {REPAIR_HINT}", file=sys.stderr)

    return 1 if violations else 0


if __name__ == "__main__":
    raise SystemExit(main())
