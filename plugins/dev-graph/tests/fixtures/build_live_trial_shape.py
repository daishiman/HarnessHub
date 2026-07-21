#!/usr/bin/env python3
"""scenario 固有の live-trial fixture を決定論的に生成する (base fixture + shape)。

``build_live_trial_fixture.py`` が作る共通の repo 骨格 (config / graph / content root /
git identity) の上に、``live_trial_shapes/`` の scenario 形状を重ねる。

分離の理由: 1 file に全 scenario の入力を詰めると、C02 の 5 種 artifact・C03 の adapter
fixture・C04 の exact-13 package・C19 の system-spec workspace が同居して肥大化し、
どの scenario がどの artifact を要求するのかが読めなくなる。1 module = 1 scenario に
すると、scenario 契約 (live-trial-positive-scenarios.json の fixture_contract) と
生成手順が 1 対 1 で対応する。

Usage:
  python3 plugins/dev-graph/tests/fixtures/build_live_trial_shape.py \
      --shape node --out <dir> [--force] [--verify]
"""
from __future__ import annotations

import argparse
import importlib.util
import shutil
import sys
from pathlib import Path

FIXTURES_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(FIXTURES_DIR.parent))  # tests/ を import path へ (fixtures package 解決)


def _load_base():
    """base generator を module として読む (ファイル名が module 名と一致するため直読み)。"""
    path = FIXTURES_DIR / "build_live_trial_fixture.py"
    spec = importlib.util.spec_from_file_location("build_live_trial_fixture", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _load_shape(shape: str):
    """live_trial_shapes.<module> の build を解決する。"""
    package_init = FIXTURES_DIR / "live_trial_shapes" / "__init__.py"
    spec = importlib.util.spec_from_file_location(
        "live_trial_shapes", package_init, submodule_search_locations=[str(package_init.parent)]
    )
    assert spec and spec.loader
    package = importlib.util.module_from_spec(spec)
    sys.modules["live_trial_shapes"] = package
    spec.loader.exec_module(package)
    return package.load(shape), sorted(package.SHAPE_MODULES)


def main() -> int:
    base = _load_base()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--shape", required=True, help="scenario 形状名")
    parser.add_argument("--out", required=True, help="fixture repo の生成先")
    parser.add_argument("--force", action="store_true", help="既存 fixture を削除して作り直す")
    parser.add_argument("--verify", action="store_true", help="生成後に C11 validator で検証する")
    args = parser.parse_args()

    try:
        shape_build, known = _load_shape(args.shape)
    except KeyError as exc:
        print(f"{exc}", file=sys.stderr)
        return 2

    out = Path(args.out).expanduser().resolve()
    if out.exists():
        if not args.force:
            print(f"already exists (use --force to rebuild): {out}", file=sys.stderr)
            return 2
        if not base.owned_fixture(out):
            print(
                f"refusing --force: ownership marker is missing or invalid: "
                f"{out / base.OWNERSHIP_MARKER}",
                file=sys.stderr,
            )
            return 2
        shutil.rmtree(out)
    out.mkdir(parents=True)
    (out / base.OWNERSHIP_MARKER).write_text(base.OWNERSHIP_MARKER_CONTENT, encoding="utf-8")
    # git init を先に済ませてから identity を導出する (C24 の導出規則が git common dir 依存)。
    base.git_init(out)
    base.build(out, base.derive_repository_id(out))
    shape_build(out)
    base.git_commit(out)
    print(f"fixture built: {out} (shape={args.shape})")
    if args.verify:
        return base.verify(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
