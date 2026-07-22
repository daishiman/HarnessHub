from __future__ import annotations

import importlib.util
import io
import json
import re
import os
import subprocess
import sys
from pathlib import Path

import pytest


PLUGIN = Path(__file__).resolve().parents[1]
SCRIPTS = PLUGIN / "scripts"
HOOKS = PLUGIN / "hooks"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))


def load(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def call_main(module, monkeypatch, capsys, *args, stdin=None):
    monkeypatch.setattr(sys, "argv", [module.__file__, *map(str, args)])
    if stdin is not None:
        monkeypatch.setattr(sys, "stdin", io.StringIO(json.dumps(stdin)))
    code = module.main()
    captured = capsys.readouterr()
    return code, captured


def canonical_issue(file_path: str = "issues/issue-1.md") -> dict:
    now = "2026-07-13T00:00:00Z"
    return {
        "graph_node_id": "issue-1",
        "artifact_kind": "issue",
        "artifact_subtypes": [],
        "title": "Issue one",
        "project_id": "project",
        "domain": "runtime",
        "status": "draft",
        "owners": ["team"],
        "tags": ["test"],
        "priority": None,
        "start_date": None,
        "target_date": None,
        "iteration": None,
        "created_at": now,
        "updated_at": now,
        "depends_on": [],
        "related_nodes": [],
        "resource_scope": ["issues"],
        "purpose": None,
        "goal": None,
        "scope_in": [],
        "scope_out": [],
        "acceptance": [],
        "architecture_refs": [],
        "parent_feature": None,
        "feature_package_id": None,
        "phase_ref": None,
        "file_path": file_path,
        "template_id": "issue",
        "template_version": "1.0.0",
        "confirmation_status": "draft",
        "evaluation_status": "pending",
        "confirmation_evidence": {"evaluator": None, "evidence_ref": None, "evaluated_digest": None},
        "source_lineage": {
            "origin_kind": "manual",
            "source_plugin": None,
            "source_path": None,
            "source_version": None,
            "source_digest": None,
            "imported_at": None,
        },
        "classification_confidence": 1.0,
        "classification_reason": "explicit test fixture",
        "classification_candidates": [],
        "github_publication": {"mode": "local_only", "project_aliases": [], "labels": [], "milestone": None},
        "issue_linkage": None,
        "tracker_binding": "none",
        "beads_linkage": None,
        "github_project_linkages": [],
        "pull_request_linkages": [],
        "execution_contexts": [],
        "completion_evidence": {
            "policy": "manual",
            "status": "not_applicable",
            "source": None,
            "completed_at": None,
            "reconciled_at": None,
            "evidence_refs": [],
        },
        "implementation_readiness": {"status": "incomplete", "missing_sections": [], "checked_at": None},
    }


def write_artifact(root: Path, node: dict, *, omit: str | None = None) -> None:
    path = root / node["file_path"]
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = ["---"]
    for key, value in node.items():
        if key != omit:
            lines.append(f"{key}: {json.dumps(value, ensure_ascii=False)}")
    lines.extend(["---", "", "# Overview", "", "Substantive content.", ""])
    path.write_text("\n".join(lines), encoding="utf-8")


def test_c11_uses_canonical_schema_and_frontmatter_path_contract(tmp_path, monkeypatch, capsys):
    mod = load(SCRIPTS / "validate-graph-schema.py", "validate_contract_c11")
    node = canonical_issue()
    write_artifact(tmp_path, node)
    assert mod.validate([node], repo_root=tmp_path) == []
    graph = tmp_path / ".dev-graph" / "state" / "graph.json"
    graph.parent.mkdir(parents=True)
    graph.write_text(json.dumps({"nodes": [node]}), encoding="utf-8")
    code, captured = call_main(mod, monkeypatch, capsys, "--graph", graph, "--repo-root", tmp_path)
    assert code == 0 and json.loads(captured.out)["schema"].endswith("schemas/graph-node.schema.json")

    without_owner = dict(node)
    without_owner.pop("owners")
    findings = mod.validate([without_owner], repo_root=tmp_path)
    assert any(item["code"] == "schema_violation" and "owners" in item["detail"] for item in findings)

    wrong_root = canonical_issue("tasks/issue-1.md")
    findings = mod.validate([wrong_root])
    assert any(item["code"] == "path_parity_error" for item in findings)

    write_artifact(tmp_path, node, omit="tags")
    findings = mod.validate([node], repo_root=tmp_path)
    assert {item["detail"] for item in findings if item["code"] == "frontmatter_missing"} == {"tags"}


def test_c10_invokes_c11_then_still_rejects_direct_mutation(tmp_path, monkeypatch, capsys):
    mod = load(HOOKS / "guard-graph-schema.py", "guard_contract_c10")
    graph = tmp_path / ".dev-graph" / "state" / "graph.json"
    graph.parent.mkdir(parents=True)
    graph.write_text('{"nodes": []}\n', encoding="utf-8")
    context = json.dumps({"local_state_paths": {"graph": str(graph)}})
    monkeypatch.setattr(mod, "context_ok", lambda root: (True, context))
    checked: list[Path] = []
    monkeypatch.setattr(mod, "schema_ok", lambda root, output: (checked.append(root) is None, "valid"))

    code, captured = call_main(
        mod,
        monkeypatch,
        capsys,
        "--repo-root",
        tmp_path,
        stdin={"tool_input": {"command": "rm -rf .dev-graph/state/graph.json # validate-graph-schema.py"}},
    )
    assert code == 2
    assert checked == [tmp_path]
    assert "C02 atomic writer" in captured.err

    monkeypatch.setattr(mod, "schema_ok", lambda root, output: (False, "schema invalid"))
    code, captured = call_main(
        mod,
        monkeypatch,
        capsys,
        "--repo-root",
        tmp_path,
        stdin={"tool_input": {"command": "sed -i '' plugins/dev-graph/schemas/graph-node.schema.json"}},
    )
    assert code == 2
    assert "C11 schema validation failed" in captured.err


def test_c10_redirect_detection_is_bound_to_the_redirect_destination(
    tmp_path, monkeypatch, capsys,
):
    mod = load(HOOKS / "guard-graph-schema.py", "guard_redirect_target_contract")
    monkeypatch.setattr(mod, "context_ok", lambda _root: (True, "{}"))
    monkeypatch.setattr(mod, "schema_ok", lambda _root, _detail: (True, "ok"))

    code, _ = call_main(
        mod,
        monkeypatch,
        capsys,
        "--repo-root",
        tmp_path,
        stdin={"tool_input": {"command": "sha256sum .dev-graph/state/graph.json 2>/dev/null"}},
    )
    assert code == 0

    code, _ = call_main(
        mod,
        monkeypatch,
        capsys,
        "--repo-root",
        tmp_path,
        stdin={"tool_input": {"command": "printf '{}' > .dev-graph/state/graph.json"}},
    )
    assert code == 2


def test_c10_destructive_detection_distinguishes_sources_from_destinations(
    tmp_path, monkeypatch, capsys,
):
    mod = load(HOOKS / "guard-graph-schema.py", "guard_operand_contract")
    monkeypatch.setattr(mod, "context_ok", lambda _root: (True, "{}"))
    monkeypatch.setattr(mod, "schema_ok", lambda _root, _detail: (True, "ok"))

    allowed = [
        "cp -rf plugins/dev-graph/templates .dev-graph/templates",
        "cp .dev-graph/state/graph.json /tmp/graph-backup.json",
        "sha256sum .dev-graph/state/graph.json 2>/dev/null",
    ]
    for command in allowed:
        code, _ = call_main(
            mod,
            monkeypatch,
            capsys,
            "--repo-root",
            tmp_path,
            stdin={"tool_input": {"command": command}},
        )
        assert code == 0, command

    blocked = [
        "cp /tmp/graph.json .dev-graph/state/graph.json",
        "mv .dev-graph/state/graph.json /tmp/graph.json",
        "rm -rf .dev-graph",
        "sed -i '' plugins/dev-graph/schemas/graph-node.schema.json",
    ]
    for command in blocked:
        code, _ = call_main(
            mod,
            monkeypatch,
            capsys,
            "--repo-root",
            tmp_path,
            stdin={"tool_input": {"command": command}},
        )
        assert code == 2, command


def git(cwd: Path, *args: str) -> str:
    return subprocess.run(["git", "-C", str(cwd), *args], check=True, text=True, capture_output=True).stdout.strip()


def init_repo(root: Path) -> None:
    root.mkdir()
    git(root, "init")
    git(root, "config", "user.email", "test@example.com")
    git(root, "config", "user.name", "Test")
    (root / "README.md").write_text("fixture\n", encoding="utf-8")
    git(root, "add", "README.md")
    git(root, "commit", "-m", "fixture")
    git(root, "remote", "add", "origin", "https://github.com/Acme/Demo.git")


def config_for(root: Path, tasks: str = "tasks") -> Path:
    config = root / ".dev-graph" / "config.json"
    config.parent.mkdir(exist_ok=True)
    config.write_text(json.dumps({
        "repository_id": "github:Acme/Demo",
        "content_roots": {"tasks": tasks},
        "local_state": {"graph": ".dev-graph/state/graph.json", "cache": ".dev-graph/cache", "locks": ".dev-graph/locks"},
        "path_policy": {
            "authority": "caller-repository",
            "allow_outside_repository": False,
            "follow_content_symlinks_outside_repository": False,
        },
    }), encoding="utf-8")
    return config


def test_c24_enforces_symlink_containment_and_common_repository_ownership(tmp_path, monkeypatch, capsys):
    mod = load(SCRIPTS / "resolve-repo-context.py", "resolve_contract_c24")
    root = tmp_path / "repo"
    init_repo(root)
    config_for(root)
    monkeypatch.delenv("CLAUDE_PROJECT_DIR", raising=False)
    code, captured = call_main(mod, monkeypatch, capsys, "--repo-root", root)
    assert code == 0
    result = json.loads(captured.out)
    assert result["repository_id"] == "github:Acme/Demo"
    assert result["root_trust_evidence"]["git_common_dir_ownership_verified"] is True

    other = tmp_path / "other"
    init_repo(other)
    with pytest.raises(Exception, match="objects authority"):
        mod.verify_common_ownership(root.resolve(), (root / ".git").resolve(), (other / ".git").resolve())

    outside = tmp_path / "outside"
    outside.mkdir()
    tasks = root / "tasks"
    tasks.symlink_to(outside, target_is_directory=True)
    with pytest.raises(Exception, match="escapes authority root"):
        call_main(mod, monkeypatch, capsys, "--repo-root", root)

    tasks.unlink()
    tasks.symlink_to(tmp_path / "missing-target", target_is_directory=True)
    with pytest.raises(Exception, match="broken content symlink"):
        call_main(mod, monkeypatch, capsys, "--repo-root", root)

    tasks.unlink()
    inside = root / "inside-tasks"
    inside.mkdir()
    tasks.symlink_to(inside, target_is_directory=True)
    with pytest.raises(Exception, match="must not traverse a symlink"):
        call_main(mod, monkeypatch, capsys, "--repo-root", root)

    tasks.unlink()
    config_for(root, "../outside")
    with pytest.raises(Exception, match="escapes repository authority"):
        call_main(mod, monkeypatch, capsys, "--repo-root", root)


def test_c24_discovery_precedence_and_fail_closed_boundaries(tmp_path, monkeypatch):
    mod = load(SCRIPTS / "resolve-repo-context.py", "resolve_contract_c24_discovery")
    empty = tmp_path / "empty"
    empty.mkdir()
    monkeypatch.chdir(empty)
    monkeypatch.delenv("CLAUDE_PROJECT_DIR", raising=False)
    monkeypatch.setattr(subprocess, "run", lambda *a, **k: type("CP", (), {"returncode": 1, "stdout": ""})())
    with pytest.raises(mod.ContractError, match="cannot be resolved"):
        mod.discover(None)

    root = tmp_path / "repo"
    root.mkdir()
    monkeypatch.setenv("CLAUDE_PROJECT_DIR", str(root))
    monkeypatch.setattr(mod, "git", lambda args, selected, check=True: str(root))
    assert mod.discover(None) == (root, "CLAUDE_PROJECT_DIR")

    other = tmp_path / "other"
    other.mkdir()
    monkeypatch.setattr(mod, "git", lambda args, selected, check=True: str(other))
    with pytest.raises(mod.ContractError, match="not current worktree root"):
        mod.discover(str(root))


def test_c24_common_dir_marker_remote_and_config_policy_boundaries(tmp_path, monkeypatch):
    mod = load(SCRIPTS / "resolve-repo-context.py", "resolve_contract_c24_common")
    root = tmp_path / "repo"
    common = root / "common"
    git_dir = root / "worktrees" / "wt"
    common.mkdir(parents=True)
    git_dir.mkdir(parents=True)
    (common / "objects").mkdir()
    (common / "config").write_text("[core]\n", encoding="utf-8")
    marker = git_dir / "commondir"
    marker.write_text("../../common\n", encoding="utf-8")

    values = {
        ("rev-parse", "--git-path", "objects"): str(common / "objects"),
        ("rev-parse", "--git-path", "config"): str(common / "config"),
        ("remote", "get-url", "origin"): "https://github.com/Acme/Demo.git",
        ("--git-dir", str(common), "remote", "get-url", "origin"): "https://github.com/Acme/Demo.git",
    }
    monkeypatch.setattr(mod, "git", lambda args, selected, check=True: values[tuple(args)])
    mod.verify_common_ownership(root, git_dir, common)

    marker.unlink()
    with pytest.raises(mod.ContractError, match="no trusted commondir marker"):
        mod.verify_common_ownership(root, git_dir, common)
    marker.write_text("missing-common\n", encoding="utf-8")
    with pytest.raises(mod.ContractError, match="invalid worktree commondir marker"):
        mod.verify_common_ownership(root, git_dir, common)
    other = root / "other-common"
    other.mkdir()
    marker.write_text("../../other-common\n", encoding="utf-8")
    with pytest.raises(mod.ContractError, match="commondir mismatch"):
        mod.verify_common_ownership(root, git_dir, common)

    marker.write_text("../../common\n", encoding="utf-8")
    values[("--git-dir", str(common), "remote", "get-url", "origin")] = "https://github.com/Other/Repo.git"
    with pytest.raises(mod.ContractError, match="different origin remotes"):
        mod.verify_common_ownership(root, git_dir, common)

    with pytest.raises(mod.ContractError, match="path_policy must be an object"):
        mod.resolve_config_paths(root, {"path_policy": ["invalid"]})
    with pytest.raises(mod.ContractError, match="weakens caller-repository containment"):
        mod.resolve_config_paths(root, {"path_policy": {"allow_outside_repository": True}})
    with pytest.raises(mod.ContractError, match="must be objects"):
        mod.resolve_config_paths(root, {"content_roots": ["invalid"], "local_state": {}})
    with pytest.raises(mod.ContractError, match="non-empty repository-relative path"):
        mod.resolve_declared_path(root, "", "content_roots.tasks", reject_leaf_symlink=True)


def test_c10_blocks_graph_authority_writes_through_the_write_tool(tmp_path, monkeypatch, capsys):
    """Write/Edit ツール経由の graph authority 書込みも C02 迂回として拒否する。

    2026-07-21 live-trial r14 で、render / status / system-spec の実走が
    `.dev-graph/state/graph.json` と `.dev-graph/config.json` を Write ツールで直接作成し、
    upsert-node.py を一度も通さずに「登録した」と主張する迂回が検出された。
    従来 hook は tool_input.command しか読まず Bash 限定だったため素通りしていた。
    """
    mod = load(HOOKS / "guard-graph-schema.py", "guard_write_tool_contract")
    monkeypatch.setattr(mod, "context_ok", lambda _root: (True, "{}"))
    monkeypatch.setattr(mod, "schema_ok", lambda _root, _detail: (True, "ok"))

    for tool, payload in (
        ("Write", {"file_path": f"{tmp_path}/.dev-graph/state/graph.json", "content": "{}"}),
        ("Write", {"file_path": f"{tmp_path}/.dev-graph/config.json", "content": "{}"}),
        ("Edit", {"file_path": f"{tmp_path}/.dev-graph/state/graph.json", "old_string": "a", "new_string": "b"}),
    ):
        code, captured = call_main(
            mod, monkeypatch, capsys, "--repo-root", tmp_path,
            stdin={"tool_name": tool, "tool_input": payload},
        )
        assert code == 2, f"{tool} {payload['file_path']} must be blocked"
        assert "C02" in captured.err

    # repo 内の通常ファイルは素通しする (過剰遮断で日常作業を止めない)
    code, _ = call_main(
        mod, monkeypatch, capsys, "--repo-root", tmp_path,
        stdin={"tool_name": "Write", "tool_input": {"file_path": f"{tmp_path}/README.md", "content": "x"}},
    )
    assert code == 0


def test_c10_blocks_interpreter_writes_to_the_graph_authority(tmp_path, monkeypatch, capsys):
    """python -c / heredoc から graph.json を open(w) する迂回も拒否する。

    r14 の node 実走は `python3 -c "... graph['nodes'] = [...]; json.dump(...)"` で
    graph.json を書き換えて登録失敗を隠蔽した。_mutating_operands は rm/mv/cp/sed 等しか
    認識せず、インタプリタ経由の書込みは検出できていなかった。
    """
    mod = load(HOOKS / "guard-graph-schema.py", "guard_interpreter_write_contract")
    monkeypatch.setattr(mod, "context_ok", lambda _root: (True, "{}"))
    monkeypatch.setattr(mod, "schema_ok", lambda _root, _detail: (True, "ok"))

    blocked = [
        """python3 -c "import json; json.dump({}, open('.dev-graph/state/graph.json','w'))" """,
        """python3 - <<'PY'\nopen('.dev-graph/state/graph.json', 'w').write('{}')\nPY""",
    ]
    for command in blocked:
        code, captured = call_main(
            mod, monkeypatch, capsys, "--repo-root", tmp_path,
            stdin={"tool_name": "Bash", "tool_input": {"command": command}},
        )
        assert code == 2, f"must block: {command[:60]}"
        assert "C02" in captured.err

    # 読み取りは素通しする
    code, _ = call_main(
        mod, monkeypatch, capsys, "--repo-root", tmp_path,
        stdin={"tool_name": "Bash", "tool_input": {
            "command": """python3 -c "import json; print(json.load(open('.dev-graph/state/graph.json')))" """}},
    )
    assert code == 0


def test_c10_guard_is_registered_for_file_writing_tools() -> None:
    """guard が Bash だけでなく Write/Edit 系にも配線されている。

    hook 本体が Write を判定できても hooks.json の matcher が Bash のままなら発火しない。
    r14 の C02 迂回はこの配線漏れが原因で素通りした。
    """
    hooks = json.loads((HOOKS / "hooks.json").read_text(encoding="utf-8"))
    entries = [
        entry for entry in hooks["hooks"]["PreToolUse"]
        if any("guard-graph-schema.py" in h.get("command", "") for h in entry.get("hooks", []))
    ]
    assert entries, "guard-graph-schema.py must be registered on PreToolUse"
    matcher = entries[0]["matcher"]
    for tool in ("Bash", "Write", "Edit"):
        assert re.search(matcher, tool), f"{tool} must match {matcher!r}"


def test_c10_bash_redirect_covers_the_whole_graph_authority_dir(tmp_path, monkeypatch, capsys):
    """Bash の redirect も `.dev-graph/` 配下全体を守る (state/graph.json だけではない)。

    2026-07-21 live-trial r16 で、`.dev-graph/config.json` への Write を hook が遮断した直後に
    `cat > .../.dev-graph/config.json` へ切り替えて同じ書込みを完遂する回避が観測された
    (transcript: "Config was blocked by the hook. Let me write it via bash")。
    GRAPH_AUTHORITY_DIR は末尾が `.dev-graph` の path しか見ておらず配下ファイルを守れていなかった。
    """
    mod = load(HOOKS / "guard-graph-schema.py", "guard_authority_dir_contract")
    monkeypatch.setattr(mod, "context_ok", lambda _root: (True, "{}"))
    monkeypatch.setattr(mod, "schema_ok", lambda _root, _detail: (True, "ok"))

    for command in (
        "cat > /repo/.dev-graph/config.json <<'EOF'\n{}\nEOF",
        "printf '{}' > /repo/.dev-graph/config.json",
        "cp /tmp/x.json /repo/.dev-graph/config.json",
        "rm -f /repo/.dev-graph/state/graph.json",
    ):
        code, captured = call_main(
            mod, monkeypatch, capsys, "--repo-root", tmp_path,
            stdin={"tool_name": "Bash", "tool_input": {"command": command}},
        )
        assert code == 2, f"must block: {command[:50]}"

    # 読み取りは素通しする
    code, _ = call_main(
        mod, monkeypatch, capsys, "--repo-root", tmp_path,
        stdin={"tool_name": "Bash", "tool_input": {"command": "cat /repo/.dev-graph/config.json"}},
    )
    assert code == 0


def test_c10_graph_authority_block_does_not_depend_on_the_context_subprocess(
    tmp_path, monkeypatch, capsys,
):
    """graph authority の遮断は resolve-repo-context のサブプロセスに依存しない。

    context_ok() は tool 呼出しごとに python サブプロセスを起動するため、hook の timeout (10s)
    に達すると guard 全体が素通り (fail-open) になりうる。最重要かつ最も安価な判定である
    authority path 検査は、その前段で完結させる。
    """
    mod = load(HOOKS / "guard-graph-schema.py", "guard_authority_precedence_contract")

    def _must_not_run(_root):
        raise AssertionError("context_ok must not gate the graph authority check")

    monkeypatch.setattr(mod, "context_ok", _must_not_run)

    code, captured = call_main(
        mod, monkeypatch, capsys, "--repo-root", tmp_path,
        stdin={"tool_name": "Write", "tool_input": {
            "file_path": "/repo/.dev-graph/state/graph.json", "content": "{}"}},
    )
    assert code == 2
    assert "C02" in captured.err
