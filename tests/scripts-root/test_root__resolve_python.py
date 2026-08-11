"""scripts/lib/resolve-python.sh の genuine 機能テスト (network 不要 / 実 repo 無変更)。

HarnessHub-sl6o: git hook はログインシェルの rc を読まないため PATH が手動実行と異なり、
jsonschema を持たない python3 が選ばれて validate-plugin-packages だけが hook 文脈で
blocking FAIL していた。本 lib は「PATH 順ではなく依存を import できるかで選ぶ」ことで
hook と手動の解決結果を一致させる。

テストは実 bash で lib を source し、fake interpreter (依存の有無を制御した sh script) を
候補に与えて全分岐を実行する。実 python の有無に依存しないので CI/ローカルで結果が変わらない。

- 正: 依存を満たす候補を PATH の並び順によらず同一に選ぶ (sl6o の回帰テスト本体)
- 正: 後続 hard gate が使う jsonschema / yaml の両方を満たす候補へ failover する
- 負: required を満たす候補がゼロなら fail-closed で、棄却した候補と理由を全件列挙する
- shim: 解決結果が `python3` として PATH 前置され、他コマンドを shadow しない
"""
import os
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
LIB = ROOT / "scripts" / "lib" / "resolve-python.sh"


def _make_fake_python(dirpath: Path, have: str) -> Path:
    """`python3 -c ...` の probe にだけ応答する fake interpreter を作る。

    have: 空白区切りの import 可能 module 名 (例 "jsonschema yaml")。
    """
    dirpath.mkdir(parents=True, exist_ok=True)
    exe = dirpath / "python3"
    exe.write_text(
        "#!/bin/sh\n"
        f'HAVE="{have}"\n'
        'code="$2"\n'
        'case "$code" in\n'
        '  *sys.executable*) echo "$0"; exit 0 ;;\n'
        '  *sys.version*)    echo "3.11.0"; exit 0 ;;\n'
        '  "import "*)\n'
        '    mod="${code#import }"\n'
        '    case " $HAVE " in *" $mod "*) exit 0 ;; *) exit 1 ;; esac ;;\n'
        'esac\n'
        'exit 1\n',
        encoding="utf-8",
    )
    exe.chmod(0o755)
    return exe


def _run(script: str, env_overrides: dict) -> subprocess.CompletedProcess:
    env = {
        "HOME": os.environ.get("HOME", "/tmp"),
        "PATH": "/usr/bin:/bin",
        "TMPDIR": os.environ.get("TMPDIR", "/tmp"),
    }
    env.update(env_overrides)
    return subprocess.run(
        ["bash", "-c", f". {LIB}\n{script}"],
        capture_output=True, text=True, env=env, cwd=str(ROOT),
    )


def test_lib_exists():
    assert LIB.is_file(), f"resolve-python.sh が無い: {LIB}"


# ============================================================================
# 正: 依存充足で選ぶ (= PATH の並び順に依存しない)
# ============================================================================

@pytest.mark.parametrize("reverse", [False, True])
def test_resolution_is_independent_of_path_order(tmp_path, reverse):
    """hook 文脈 (依存なし python が PATH 先頭) でも手動と同じ interpreter を選ぶ。

    これが sl6o の再現テスト本体。修正前の実装は PATH 先頭を素通しで採用していたため、
    reverse=False (依存なしが先頭) のとき jsonschema 不在 python が選ばれていた。
    """
    bare = _make_fake_python(tmp_path / "bare", have="")          # jsonschema 無し
    full = _make_fake_python(tmp_path / "full", have="jsonschema yaml")
    dirs = [str(full.parent), str(bare.parent)] if reverse else [str(bare.parent), str(full.parent)]
    proc = _run(
        'hh_resolve_python3 --required "jsonschema yaml"',
        {"PATH": ":".join(dirs) + ":/usr/bin:/bin"},
    )
    assert proc.returncode == 0, proc.stderr
    assert proc.stdout.strip() == str(full), f"PATH 順で結果が変わった: {proc.stdout!r}"


def test_yaml_missing_candidate_fails_over_to_pipeline_complete_python(tmp_path):
    """jsonschema だけの候補を採用せず、後続 hard gate に必要な yaml 入りへ進む。"""
    json_only = _make_fake_python(tmp_path / "json-only", have="jsonschema")
    complete = _make_fake_python(tmp_path / "complete", have="jsonschema yaml")
    proc = _run(
        'hh_resolve_python3 --required "jsonschema yaml"',
        {"HH_PYTHON_CANDIDATES": f"{json_only}:{complete}"},
    )
    assert proc.returncode == 0, proc.stderr
    assert proc.stdout.strip() == str(complete)


def test_jsonschema_only_candidate_cannot_start_the_hard_gate_pipeline(tmp_path):
    """後続の PyYAML 検査を実行不能な interpreter は成功扱いにしない。"""
    json_only = _make_fake_python(tmp_path / "json-only", have="jsonschema")
    proc = _run(
        'hh_resolve_python3 --required "jsonschema yaml"',
        {"HH_PYTHON_CANDIDATES": str(json_only)},
    )
    assert proc.returncode == 1
    assert "必須 module を import できない: yaml" in proc.stderr


def test_hh_python_is_honoured_when_it_satisfies_deps(tmp_path):
    bare = _make_fake_python(tmp_path / "bare", have="")
    full = _make_fake_python(tmp_path / "full", have="jsonschema yaml")
    proc = _run(
        'hh_resolve_python3 --required "jsonschema"',
        {"PATH": f"{bare.parent}:/usr/bin:/bin", "HH_PYTHON": str(full)},
    )
    assert proc.returncode == 0, proc.stderr
    assert proc.stdout.strip() == str(full)


# ============================================================================
# 負: fail-closed (無言 skip / 無言 fallback を作らない)
# ============================================================================

def test_no_candidate_fails_closed_and_lists_rejections(tmp_path):
    """依存を満たす候補ゼロなら exit 1。どの候補をどの理由で棄却したかを全件出す。"""
    bare = _make_fake_python(tmp_path / "bare", have="")
    other = _make_fake_python(tmp_path / "other", have="yaml")
    proc = _run(
        'hh_resolve_python3 --required "jsonschema"',
        {"HH_PYTHON_CANDIDATES": f"{bare}:{other}"},
    )
    assert proc.returncode == 1
    assert proc.stdout.strip() == "", "失敗時に interpreter を出してはならない"
    for exe in (bare, other):
        assert str(exe) in proc.stderr, f"棄却した候補が診断に出ていない: {exe}"
    assert proc.stderr.count("必須 module を import できない: jsonschema") == 2
    assert "requirements-dev.txt" in proc.stderr, "対処方法が示されていない"


def test_hh_python_cannot_bypass_the_gate(tmp_path):
    """HH_PYTHON 指定でも import 実測は迂回できない (gate 緩和の抜け道を作らない)。"""
    bare = _make_fake_python(tmp_path / "bare", have="")
    proc = _run(
        'hh_resolve_python3 --required "jsonschema"',
        {"HH_PYTHON_CANDIDATES": str(bare), "HH_PYTHON": str(bare)},
    )
    assert proc.returncode == 1
    assert "jsonschema" in proc.stderr


def test_unreadable_candidate_is_reported_not_silently_dropped(tmp_path):
    missing = tmp_path / "absent" / "python3"
    full = _make_fake_python(tmp_path / "full", have="jsonschema")
    proc = _run(
        'hh_resolve_python3 --required "jsonschema"',
        {"HH_PYTHON_CANDIDATES": f"{missing}:{full}"},
    )
    # 解決自体は成功するが、棄却理由は診断に残る
    assert proc.returncode == 0, proc.stderr
    assert proc.stdout.strip() == str(full)


# ============================================================================
# shim: 解決結果が literal `python3` にも子プロセスにも伝播する
# ============================================================================

def test_shim_makes_python3_resolve_to_the_chosen_interpreter(tmp_path):
    bare = _make_fake_python(tmp_path / "bare", have="")
    full = _make_fake_python(tmp_path / "full", have="jsonschema yaml")
    proc = _run(
        'p="$(hh_resolve_python3 --required jsonschema --preferred yaml)"\n'
        'hh_shim_python3 "$p"\n'
        'command -v python3\n'
        'bash -c "command -v python3"\n'   # 子プロセスにも伝播するか
        'echo "HH_PYTHON=$HH_PYTHON"\n'
        'readlink "$HH_PYTHON_SHIM_DIR/python3"\n'   # symlink の指す先 (cleanup 前に読む)
        'rm -rf "$HH_PYTHON_SHIM_DIR"\n',
        {"HH_PYTHON_CANDIDATES": f"{bare}:{full}"},
    )
    assert proc.returncode == 0, proc.stderr
    lines = proc.stdout.strip().splitlines()
    shim_path, child_shim_path, hh_python, link_target = lines[0], lines[1], lines[2], lines[3]
    assert shim_path.endswith("/python3")
    assert "hh-python-shim." in shim_path, f"shim dir が PATH 前置されていない: {shim_path}"
    assert child_shim_path == shim_path, "子プロセスに解決結果が伝播していない"
    assert hh_python == f"HH_PYTHON={full}"
    assert Path(link_target) == full, "shim が別の interpreter を指している"


def test_shim_does_not_shadow_other_commands(tmp_path):
    """shim dir に置くのは python3 だけ (jq/node 等を巻き添えで shadow しない)。"""
    full = _make_fake_python(tmp_path / "full", have="jsonschema")
    proc = _run(
        'hh_shim_python3 "$HH_PYTHON_CANDIDATES"\n'
        'ls -A "$HH_PYTHON_SHIM_DIR"\n'
        'rm -rf "$HH_PYTHON_SHIM_DIR"\n',
        {"HH_PYTHON_CANDIDATES": str(full)},
    )
    assert proc.returncode == 0, proc.stderr
    assert proc.stdout.split() == ["python3"]


# ============================================================================
# 結線: run-ci-checks.sh が本 lib を経由して python3 を決めていること
# ============================================================================

def test_run_ci_checks_wires_the_resolver():
    body = (ROOT / "scripts" / "run-ci-checks.sh").read_text(encoding="utf-8")
    assert "scripts/lib/resolve-python.sh" in body, "run-ci-checks が resolver を source していない"
    assert "hh_resolve_python3" in body
    assert 'hh_resolve_python3 --required "jsonschema yaml"' in body
    assert "hh_shim_python3" in body, "解決結果が PATH へ反映されていない"
    # 解決失敗を無言で素通りさせない (FAILED に積む)
    assert "FAILED+=(\"resolve-python" in body
