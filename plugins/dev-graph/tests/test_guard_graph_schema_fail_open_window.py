"""C10 guard: 遮断経路に fail-open の窓を作らない契約 (HarnessHub-6in4 / 7dw)。

背景:
  PreToolUse hook が timeout すると Claude Code は tool を通す。旧実装は Bash の破壊操作枝
  だけが `context_ok()` の後段にあり、さらに遮断/許可を左右しない `schema_ok()` (= graph
  全件の C11 検証) を理由文の出し分けのためだけに呼んでいた。実測で Write 枝 0.10s に対し
  Bash 枝は 39.79s を要し、run-dev-graph-init の live-trial では `.dev-graph/config.json` と
  `.dev-graph/state/graph.json` への Bash 直書きが 2 回素通りした。

本 test が固定する 3 つの契約:
  1. 遮断は repository context 検査より前に確定し、graph サイズ・マシン負荷に依存しない
     (受入条件 1 の機械化)。
  2. redirect の判定は shell 文法どおり quote の外だけを見る。遮断パターンを説明する散文を
     引数へ渡すコマンドを巻き込まない (7dw の散文誤遮断)。
  3. `.dev-graph/config.json` の sanctioned writer 呼出しは通り、writer の名前を騙るだけの
     直書きは通らない (allowlist が名前文字列一致でないこと)。

判定の構造そのもの (遮断経路が subprocess を起動しないこと) は
test_semantic_contract_boundaries_c10_c11_c24.py が固定する。ここでは *実プロセスの
遮断結果* と *入力の分類* を実測で押さえる。絶対所要時間は machine load まで測る
proxy metric であり、閾値を上げるほど graph 走査の退行を見逃す範囲が広がるため使わない。
"""
from __future__ import annotations

import importlib.util
import io
import json
import subprocess
import sys
from pathlib import Path

import pytest

PLUGIN = Path(__file__).resolve().parents[1]
HOOK = PLUGIN / "hooks" / "guard-graph-schema.py"
# 旧実装が全件検証していたのは hook 自身の --repo-root の graph、すなわち HarnessHub 本体の
# graph である。書込先が別 repo (fixture) でも遅くなるのがこの bug の核心だったため、
# live-trial と同じ条件を再現するために本体 repo を --repo-root に渡す (read-only)。
REPO_ROOT = PLUGIN.parents[1]


def load(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def guard():
    return load(HOOK, "guard_fail_open_window")


def run_hook_process(command: str) -> tuple[int, str]:
    """hook を実プロセスとして起動し (exit code, stderr) を返す。"""
    payload = json.dumps({"tool_name": "Bash", "tool_input": {"command": command}})
    proc = subprocess.run(
        [sys.executable, str(HOOK), "--repo-root", str(REPO_ROOT)],
        input=payload, capture_output=True, text=True, check=False,
    )
    return proc.returncode, proc.stderr


def decide(guard, monkeypatch, capsys, command: str, root: Path) -> tuple[int, str]:
    """context 解決を bypass して静的判定だけを in-process で評価する。"""
    monkeypatch.setattr(guard, "context_ok", lambda _root: (True, "{}"))
    monkeypatch.setattr(sys, "argv", [str(HOOK), "--repo-root", str(root)])
    monkeypatch.setattr(
        sys, "stdin", io.StringIO(json.dumps({"tool_name": "Bash", "tool_input": {"command": command}}))
    )
    code = guard.main()
    return code, capsys.readouterr().err


@pytest.mark.parametrize("target", [".dev-graph/config.json", ".dev-graph/state/graph.json"])
def test_bash_redirect_into_graph_authority_is_denied_in_real_process(target):
    """live-trial で素通りした 2 経路が、実プロセスでも exit 2 で遮断される。"""
    command = f"ROOT=/tmp/dev-graph-probe\ncat > \"$ROOT/{target}\" <<'EOF'\n{{}}\nEOF"

    code, stderr = run_hook_process(command)

    assert code == 2, f"遮断されていない: {stderr}"
    assert "C02 atomic writer" in stderr


def test_denial_does_not_resolve_repository_context_for_any_graph_size(
    guard, monkeypatch, capsys, tmp_path,
):
    """本体 repo (大きい graph) と空 repo の双方で graph 検査より前に遮断する。

    旧実装は --repo-root の graph 全件を C11 検証していたため、書込先が別 repo でも本体
    graph の大きさがそのまま遅延になった。絶対時間や大小 2 process の比は machine load
    も測る proxy metric であり、並列実行では graph 非依存でも偽陽性になりうる。

    現在の直接契約は、遮断対象が repository context 解決へ到達しないこと。context_ok()
    は subprocess を起動する唯一の後段なので、これを呼んだ時点で失敗させれば graph
    サイズ非依存性と fail-open window の不在を負荷に依存せず検査できる。
    """
    command = "cat > /tmp/dev-graph-probe/.dev-graph/config.json <<'EOF'\n{}\nEOF"

    def context_must_not_run(_root):
        raise AssertionError("遮断前に repository context 検査へ到達した")

    monkeypatch.setattr(guard, "context_ok", context_must_not_run)
    for label, root in (("repo", REPO_ROOT), ("empty", tmp_path)):
        monkeypatch.setattr(sys, "argv", [str(HOOK), "--repo-root", str(root)])
        monkeypatch.setattr(
            sys,
            "stdin",
            io.StringIO(
                json.dumps({"tool_name": "Bash", "tool_input": {"command": command}})
            ),
        )
        assert guard.main() == 2, label
        assert "C02 atomic writer" in capsys.readouterr().err

    # 陽性対照: trap 自体が空振りしていないことを、遮断対象外の入力で確認する。
    # static_denial() が None の場合は必ず context_ok() へ進むため、この入力だけは発火する。
    monkeypatch.setattr(sys, "argv", [str(HOOK), "--repo-root", str(tmp_path)])
    monkeypatch.setattr(
        sys,
        "stdin",
        io.StringIO(
            json.dumps({"tool_name": "Bash", "tool_input": {"command": "echo safe"}})
        ),
    )
    with pytest.raises(AssertionError, match="repository context 検査"):
        guard.main()


# quote の内側にある `>` は shell 文法上 redirect ではない。旧実装は command 全体を正規表現で
# 走査していたため、遮断パターンを説明する散文を引数に渡すだけのコマンドまで遮断していた。
PROSE_MUST_PASS = [
    # 6in4 の調査中に実際に誤遮断された形 (bd notes へ迂回手順を記録するだけ)
    'python3 plugins/dev-graph/scripts/bd-bridge.py update HarnessHub-6in4'
    ' --notes "Write 遮断後に cat > .dev-graph/config.json へ迂回した経路を閉じた"',
    "python3 plugins/dev-graph/scripts/bd-bridge.py update HarnessHub-7dw"
    " --notes 'echo x > .dev-graph/state/graph.json も遮断対象である'",
    # commit message / grep pattern / echo の本文として保護 path を含むだけ
    'git commit -m "guard: cat > .dev-graph/config.json を遮断する"',
    "grep -n 'cat > .dev-graph/config.json' plugins/dev-graph/hooks/guard-graph-schema.py",
    'echo "cat > .dev-graph/state/graph.json は遮断される"',
]

# quote の外にある本物の redirect は形を変えても遮断される (緩和ではなく解析の精密化)。
REDIRECT_MUST_BLOCK = [
    "cat > .dev-graph/config.json",
    "printf '{}' >> .dev-graph/state/graph.json",
    'echo "{}" > ".dev-graph/config.json"',
    "python3 -m json.tool 1> .dev-graph/state/graph.json",
    # 前段が read-only でも、後段の redirect 宛先が保護 path なら書込である
    "jq . /tmp/draft.json > .dev-graph/config.json",
]


@pytest.mark.parametrize("command", PROSE_MUST_PASS)
def test_prose_arguments_are_not_treated_as_redirects(guard, command):
    assert guard.destructive_graph_or_schema_operation(command) is False, command


@pytest.mark.parametrize("command", REDIRECT_MUST_BLOCK)
def test_real_redirects_into_graph_authority_are_blocked(guard, command):
    assert guard.destructive_graph_or_schema_operation(command) is True, command


def test_unparsable_quoting_falls_back_to_the_safe_side(guard):
    """quote 不一致でトークナイズ不能な入力を「redirect 無し」と扱うのは fail-open。"""
    assert guard.destructive_graph_or_schema_operation('cat > .dev-graph/config.json "') is True


WRITER_CALL = (
    'python3 "$DEV_GRAPH_PLUGIN/scripts/build-repo-config.py" --repo-root "$ROOT" --stdin'
    " --require-content-roots issues tasks specifications architecture features documents"
)
GRAPH_WRITER_CALL = (
    'python3 "$DEV_GRAPH_PLUGIN/scripts/build-graph-store.py" --repo-root "$ROOT"'
)

WRITER_MUST_PASS = [
    WRITER_CALL,
    f'{WRITER_CALL} < "$ROOT/.dev-graph/tmp/draft.json"',
    f"{WRITER_CALL} <<'JSON'\n{{}}\nJSON",
    f'cat "$ROOT/.dev-graph/tmp/draft.json" | {WRITER_CALL}',
    WRITER_CALL.replace("--stdin", '--from-json "$ROOT/.dev-graph/tmp/draft.json"'),
    WRITER_CALL + " --if-absent --dry-run",
    GRAPH_WRITER_CALL,
    GRAPH_WRITER_CALL + " --dry-run",
]

WRITER_MUST_BLOCK = [
    # writer の名前をコメントへ書いても直書きは直書き (allowlist は名前一致ではない)
    "cat > \"$ROOT/.dev-graph/config.json\" <<'EOF'  # build-repo-config.py\n{}\nEOF",
    'echo "{}" | tee "$ROOT/.dev-graph/config.json"',
    'cp /tmp/draft.json "$ROOT/.dev-graph/config.json"',
]


@pytest.mark.parametrize("command", WRITER_MUST_PASS)
def test_sanctioned_writer_invocation_passes_the_guard(guard, monkeypatch, capsys, tmp_path, command):
    """init が config を生成できること = fail-open に依存しないこと (受入条件 3)。"""
    code, stderr = decide(guard, monkeypatch, capsys, command, tmp_path)
    assert code == 0, f"sanctioned writer が遮断された: {stderr}"


@pytest.mark.parametrize("command", WRITER_MUST_BLOCK)
def test_writer_name_does_not_launder_a_direct_write(guard, monkeypatch, capsys, tmp_path, command):
    code, stderr = decide(guard, monkeypatch, capsys, command, tmp_path)
    assert code == 2, command
    assert "build-repo-config.py" in stderr, "遮断理由が正規経路を案内していない"


# HarnessHub-lp36: interpreter 経由 (python -c / heredoc) の書込み API 検出を issue の静的
# probe と同じ形で固定する。取りこぼし側 (false negative) は pathlib write_text/write_bytes に
# 加えて shutil.copy* / shutil.move / os.replace / os.rename / json.dump を、過剰遮断側
# (false positive) は open(..., 'r'/'rb') が ALLOW になり 'r+' は BLOCK のまま残ることを見る。
# shell redirect (cat> / tee) 側は REDIRECT_MUST_BLOCK / WRITER_MUST_BLOCK が別途固定済み。
INTERPRETER_WRITE_MUST_BLOCK = [
    "open('.dev-graph/state/graph.json', 'w')",
    "open('.dev-graph/config.json', 'a')",
    "open('.dev-graph/state/graph.json', 'x')",
    "open('.dev-graph/state/graph.json', 'r+')",
    "open('.dev-graph/state/graph.json', 'br+')",
    "open('.dev-graph/state/graph.json', '+rb')",
    "open('.dev-graph/state/graph.json', 'bw')",
    "from pathlib import Path\nPath(sys.argv[1]).write_text('{}')  # .dev-graph/state/graph.json",
    "from pathlib import Path\nPath('.dev-graph/state/graph.json').write_text('{}')",
    "from pathlib import Path\nPath('.dev-graph/config.json').write_bytes(b'{}')",
    "shutil.copy(src, '.dev-graph/state/graph.json')",
    "shutil.copyfile(src, '.dev-graph/config.json')",
    "shutil.copy2(src, '.dev-graph/state/graph.json')",
    "shutil.move(src, '.dev-graph/state/graph.json')",
    "os.replace(src, '.dev-graph/state/graph.json')",
    "os.rename(src, '.dev-graph/config.json')",
    "json.dump(data, open('.dev-graph/state/graph.json', 'w'))",
]

INTERPRETER_READ_MUST_ALLOW = [
    "open('.dev-graph/state/graph.json', 'r')",
    "open('.dev-graph/state/graph.json', 'rb')",
    "open('.dev-graph/state/graph.json', 'br')",
    "json.load(open('.dev-graph/state/graph.json'))",
    "from pathlib import Path\nprint(Path('.dev-graph/state/graph.json').read_text())",
]


@pytest.mark.parametrize("command", INTERPRETER_WRITE_MUST_BLOCK)
def test_interpreter_write_apis_into_graph_authority_are_blocked(guard, command):
    assert guard.interpreter_writes_graph_authority(command) is True, command


@pytest.mark.parametrize("command", INTERPRETER_READ_MUST_ALLOW)
def test_interpreter_read_only_calls_are_not_blocked(guard, command):
    assert guard.interpreter_writes_graph_authority(command) is False, command


def test_write_denial_names_the_actual_protected_scope(guard, monkeypatch, capsys, tmp_path):
    """遮断理由が保護範囲を広く名乗ると、正規手順まで塞がれていると読まれる。

    `.dev-graph/tmp/` は再生成可能で保護対象外であり、run-dev-graph-init は config draft を
    そこへ置いてから writer に渡す。理由文が「.dev-graph/ 配下」と述べると、遮断された agent は
    その正規手順も封じられていると解釈して別の迂回を探す (6in4 の fail-open が起きた局面)。
    理由文の範囲は `GRAPH_AUTHORITY_PATH` の実体と一致させる。
    """
    monkeypatch.setattr(guard, "context_ok", lambda _root: (True, "{}"))
    monkeypatch.setattr(sys, "argv", [str(HOOK), "--repo-root", str(tmp_path)])
    monkeypatch.setattr(
        sys, "stdin",
        io.StringIO(json.dumps({
            "tool_name": "Write",
            "tool_input": {"file_path": str(tmp_path / ".dev-graph" / "config.json"), "content": "{}"},
        })),
    )
    assert guard.main() == 2
    stderr = capsys.readouterr().err
    for member in (".dev-graph/state/", ".dev-graph/config.json", "graph-node.schema.json"):
        assert member in stderr, f"保護対象 {member} が理由文に現れない"
    assert ".dev-graph/ 配下" not in stderr, "保護外の tmp/ cache/ まで含む表現になっている"
    assert ".dev-graph/tmp/" in stderr, "draft の正規置き場が案内されていない"

    # 理由文の主張どおり tmp/ への Write は通る (文言と実挙動の一致)。
    monkeypatch.setattr(
        sys, "stdin",
        io.StringIO(json.dumps({
            "tool_name": "Write",
            "tool_input": {
                "file_path": str(tmp_path / ".dev-graph" / "tmp" / "config-draft.json"),
                "content": "{}",
            },
        })),
    )
    assert guard.main() == 0, capsys.readouterr().err


# TODO(human): 下の 3 形は redirect 境界のうちまだ分類を決めていないものです。
#   実挙動を確かめたうえで、遮断すべきものを BOUNDARY_MUST_BLOCK へ、通すべきものを
#   BOUNDARY_MUST_PASS へ振り分けてください (両方空のままでも suite は緑のままです)。
#     (a) 'python3 build-repo-config.py --repo-root "$ROOT" --stdin > .dev-graph/tmp/receipt.json'
#         writer の receipt を .dev-graph/tmp/ へ落とす。tmp/ は再生成可能で graph authority の
#         保護対象外だが、宛先は .dev-graph/ 配下である。
#     (b) 'jq . .dev-graph/state/graph.json > .dev-graph/cache/pretty.json'
#         cache/ への派生物生成。source は保護 path、宛先は保護外。
#     (c) 'git checkout -- .dev-graph/state/graph.json'
#         redirect ではないが graph を過去 revision へ巻き戻す。C02 の revision 単調増加を
#         迂回する書込みと見るか、VCS 操作として guard の管轄外と見るか。
BOUNDARY_MUST_BLOCK: list[str] = []
BOUNDARY_MUST_PASS: list[str] = []


@pytest.mark.parametrize("command", BOUNDARY_MUST_BLOCK)
def test_boundary_cases_classified_as_writes_are_blocked(guard, command):
    assert guard.destructive_graph_or_schema_operation(command) is True, command


@pytest.mark.parametrize("command", BOUNDARY_MUST_PASS)
def test_boundary_cases_classified_as_reads_pass(guard, command):
    assert guard.destructive_graph_or_schema_operation(command) is False, command
