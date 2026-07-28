from __future__ import annotations

import importlib.util
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
SCRIPT = Path(__file__).parent / "fixtures" / "audit_decompose_live_trial.py"
SPEC = importlib.util.spec_from_file_location("audit_decompose_live_trial", SCRIPT)
assert SPEC and SPEC.loader
AUDIT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUDIT)


def _feature(node_id: str, *, promoted: bool, binding: str = "none", depends_on=()) -> dict:
    """schema allOf[7] と整合する feature を作る。

    allOf[7] は evaluation_status=pass から readiness complete を含意するので、
    「confirmed かつ pass かつ readiness incomplete」は schema-valid に作れない。
    昇格側は 3 条件すべてを満たす形にしか組めないのが正しい (HarnessHub-ojh6)。
    """
    node = {
        "graph_node_id": node_id,
        "artifact_kind": "feature",
        "depends_on": list(depends_on),
        "tracker_binding": binding,
        "confirmation_status": "confirmed" if promoted else "draft",
        "evaluation_status": "pass" if promoted else "pending",
        "github_publication": {
            "mode": "local_only",
            "project_aliases": [],
            "labels": [],
            "milestone": None,
        },
        "issue_linkage": None,
        "beads_linkage": None,
        "github_project_linkages": [],
        "pull_request_linkages": [],
        "implementation_readiness": {
            "status": "complete" if promoted else "incomplete"
        },
    }
    node["confirmation_evidence"] = (
        {
            "evaluator": "unit-test",
            "evidence_ref": f"tests#{node_id}",
            "evaluated_digest": AUDIT._evaluation_digest(node),
        }
        if promoted
        else {"evaluator": None, "evidence_ref": None, "evaluated_digest": None}
    )
    return node


def test_graph_measurements_are_derived_from_preview() -> None:
    features = [
        _feature("feature-source", promoted=False),
        _feature("feature-consumer", promoted=False, depends_on=["feature-source"]),
    ]
    nodes = [
        {
            "graph_node_id": "architecture-root",
            "artifact_kind": "architecture",
            "depends_on": [],
        },
        *features,
    ]

    graph = AUDIT._graph_measurements(
        nodes,
        {
            "metric": "max_inter_feature_depends_on_per_feature",
            "max_value": 3,
        },
    )

    assert graph["acyclic"] is True
    assert graph["measured_max"] == 1
    assert graph["threshold_pass"] is True
    assert graph["task_count"] == 0


def test_publication_gate_discriminates_promoted_from_draft() -> None:
    """昇格 1 件 + draft 1 件の実ノードで、gate が両クラスを分離することを測る。"""
    features = [
        _feature("feature-source", promoted=True),
        _feature("feature-consumer", promoted=False, depends_on=["feature-source"]),
    ]

    publication = AUDIT._publication_measurements(features)

    assert publication["promoted"] == ["feature-source"]
    assert [entry["graph_node_id"] for entry in publication["blocked"]] == [
        "feature-consumer"
    ]
    assert publication["blocked"][0]["blocked_by"] == [
        "confirmation_confirmed",
        "evaluation_pass",
        "readiness_complete",
    ]
    assert publication["eligible_by_binding"]["none"]["ids"] == ["feature-source"]
    assert publication["eligible_by_binding"]["beads"]["count"] == 0
    assert publication["eligible_by_binding"]["github"]["count"] == 0
    assert publication["gate_respected"] is True
    # 誰も投影していないので gate_respected は恒真側。受領書がそれを自己申告する。
    assert publication["gate_respected_vacuous"] is True
    assert publication["discriminating"] is True


def test_projection_targets_differ_per_binding() -> None:
    """binding ごとに異なる集合が出ることを固定する。

    旧実装の内包表記は本体で binding を参照しておらず、none/beads/github に同一集合が
    入っていた。「binding 別に 0 件」という証跡は 1 つの集合を 3 回書き写しただけで、
    binding 別の投影規律を何も示していなかった (HarnessHub-ojh6)。同一 preview から
    binding ごとに違う答えが出ることを見せない限り、この退行は検出できない。
    """
    features = [
        _feature("feature-local", promoted=True, binding="none"),
        _feature("feature-beads", promoted=True, binding="beads"),
        _feature("feature-draft-github", promoted=False, binding="github"),
    ]

    targets = AUDIT._publication_measurements(features)["eligible_by_binding"]

    assert targets["none"]["ids"] == ["feature-local"]
    assert targets["beads"]["ids"] == ["feature-beads"]
    # github は昇格候補が居ないので空。3 binding が同一集合になっていないことが要点。
    assert targets["github"]["ids"] == []


def test_gate_violation_is_observed_from_the_node_projection_surface() -> None:
    """gate 違反は述語の裏返しではなく node の投影面から観測する。

    旧実装は投影先を「昇格した node」からしか作らなかったため、blocked と投影集合は
    定義上素集合で、blocked_projected は必ず空・gate_respected は必ず真だった
    (HarnessHub-ojh6 残課題 #1)。投影痕跡を直接読めば、draft のまま publication intent を
    立てた成果物がその場で不合格材料になる = 観測が反証可能になる。
    """
    clean = _feature("feature-draft", promoted=False)
    assert AUDIT._projection_evidence(clean) == []

    leaked = _feature("feature-draft", promoted=False)
    leaked["github_publication"]["mode"] = "issue"
    leaked["beads_linkage"] = {"bd_issue_id": "X-1", "sync_state": "linked"}

    publication = AUDIT._publication_measurements(
        [_feature("feature-source", promoted=True), leaked]
    )

    assert publication["projected"] == ["feature-draft"]
    assert publication["blocked_projected"] == ["feature-draft"]
    assert publication["gate_respected"] is False
    assert publication["gate_respected_vacuous"] is False


def test_evaluated_digest_must_be_bound_to_node_content() -> None:
    """placeholder digest を通さない。

    schema は 64 桁 hex の正規表現しか課さないので `a`*64 でも通り、
    「confirmation/evaluation を同一 artifact digest へ pin する」意図が実値にならない
    (HarnessHub-ojh6 残課題 #2)。正準レシピで再計算して突き合わせる。
    """
    node = _feature("feature-source", promoted=True)
    assert AUDIT._evidence_binding([node])["all_bound"] is True

    placeholder = _feature("feature-source", promoted=True)
    placeholder["confirmation_evidence"]["evaluated_digest"] = "a" * 64
    assert AUDIT._evidence_binding([placeholder])["all_bound"] is False


def test_evaluated_digest_detects_content_edited_after_promotion() -> None:
    """昇格後に node を書き換えたら digest が外れる (stale PASS 拒否の実値)。"""
    node = _feature("feature-source", promoted=True)
    node["acceptance"] = ["登録できる"]
    node["confirmation_evidence"]["evaluated_digest"] = AUDIT._evaluation_digest(node)
    assert AUDIT._evidence_binding([node])["all_bound"] is True

    node["acceptance"] = ["登録できる", "後から足した受け入れ条件"]
    assert AUDIT._evidence_binding([node])["all_bound"] is False


def test_evaluated_digest_recipe_excludes_only_the_self_reference() -> None:
    """レシピは confirmation_evidence だけを除く: 除外を増やすと束縛が緩む。"""
    assert AUDIT.EVALUATED_DIGEST_EXCLUDED == ("confirmation_evidence",)

    node = _feature("feature-source", promoted=True)
    before = AUDIT._evaluation_digest(node)
    node["confirmation_evidence"] = {
        "evaluator": "別の評価者",
        "evidence_ref": "別の証跡",
        "evaluated_digest": None,
    }
    assert AUDIT._evaluation_digest(node) == before


def test_unpromoted_node_may_omit_digest_but_not_forge_one() -> None:
    draft = _feature("feature-draft", promoted=False)
    assert AUDIT._evidence_binding([draft])["all_bound"] is True

    forged = _feature("feature-draft", promoted=False)
    forged["confirmation_evidence"]["evaluated_digest"] = "b" * 64
    assert AUDIT._evidence_binding([forged])["all_bound"] is False


def test_promoted_node_requires_non_empty_evaluator_and_evidence_ref() -> None:
    node = _feature("feature-source", promoted=True)
    node["confirmation_evidence"]["evaluator"] = "   "
    assert AUDIT._evidence_binding([node])["all_bound"] is False


def test_all_draft_preview_is_not_discriminating() -> None:
    """全 draft は候補 0 件になるが、それは gate が効いた証拠にならない。

    「候補が空」が gate の成果ではなく「そもそも誰も昇格していない」の副産物である
    状態を discriminating=True にしてしまうと、gate 実装を削除しても緑のままになる。
    """
    features = [
        _feature("feature-source", promoted=False),
        _feature("feature-consumer", promoted=False),
    ]

    publication = AUDIT._publication_measurements(features)

    assert publication["promoted"] == []
    assert publication["gate_respected"] is True
    assert publication["discriminating"] is False


def test_all_promoted_preview_is_not_discriminating() -> None:
    """全昇格も同様に非空虚性を満たさない: 除外される側の実例が無い。"""
    features = [
        _feature("feature-source", promoted=True),
        _feature("feature-consumer", promoted=True),
    ]

    publication = AUDIT._publication_measurements(features)

    assert publication["blocked"] == []
    assert publication["discriminating"] is False


def test_readiness_clause_of_the_predicate_is_checked_here_not_in_live_trial() -> None:
    """述語の readiness 節はここで合成入力を使って検査する。

    schema allOf[7] のため、この検体は schema-valid な graph node としては存在できない。
    それでも述語自体は readiness で落とせなければならない (schema 検証前の preview に
    対する多重防御)。合成検体を使うのは単体検査だから正当であり、これを live-trial の
    「skill が gate を尊重した証拠」として提出したのが旧実装の誤りだった。
    """
    node = _feature("feature-probe", promoted=True)
    node["implementation_readiness"]["status"] = "incomplete"

    conditions = AUDIT._gate_conditions(node)

    assert conditions == {
        "confirmation_confirmed": True,
        "evaluation_pass": True,
        "readiness_complete": False,
    }
    assert AUDIT._is_publication_candidate(node) is False


def test_mirror_array_diverging_from_nodes_is_rejected() -> None:
    """`features[]` だけ昇格させた自己矛盾 preview を合格させない。

    監査は `nodes[]` しか読まないので、便宜配列だけを昇格させると昇格が監査に届かず、
    同一 id が配列ごとに別状態を持つ成果物が素通りする (2026-07-26 実走 2 本目の実害)。
    """
    canonical = _feature("feature-source", promoted=False)
    mirror = _feature("feature-source", promoted=True)
    preview = {"nodes": [canonical], "features": [mirror]}

    consistency = AUDIT._preview_consistency(preview, [canonical])

    assert consistency["canonical_array"] == "nodes"
    assert consistency["mirror_arrays"] == ["features"]
    assert consistency["consistent"] is False
    assert consistency["divergent"][0]["graph_node_id"] == "feature-source"
    assert consistency["divergent"][0]["reason"] == "gate_status_diverges_from_nodes"


def test_mirror_array_matching_nodes_is_accepted() -> None:
    node = _feature("feature-source", promoted=True)
    preview = {"nodes": [node], "features": [dict(node)]}

    consistency = AUDIT._preview_consistency(preview, [node])

    assert consistency["consistent"] is True
    assert consistency["divergent"] == []


def test_mirror_array_node_absent_from_nodes_is_rejected() -> None:
    canonical = _feature("feature-source", promoted=False)
    preview = {"nodes": [canonical], "features": [_feature("feature-ghost", promoted=True)]}

    consistency = AUDIT._preview_consistency(preview, [canonical])

    assert consistency["consistent"] is False
    assert consistency["divergent"][0]["reason"] == "absent_from_nodes"


def test_unresolved_binding_sentinel_is_rejected() -> None:
    """repo-config-default のまま preview に残るのは binding 解決が走っていない徴候。

    黙って none へ倒すと「外部投影 0 件」が binding 解決の成果ではなく既定値の
    副産物になり、beads/github が空である観測の意味が失われる。
    """
    node = _feature("feature-unresolved", promoted=True, binding="repo-config-default")

    try:
        AUDIT._publication_measurements([node])
    except AUDIT.AuditError as exc:
        assert "unresolved sentinel" in str(exc)
    else:
        raise AssertionError("unresolved binding sentinel must be rejected")


def test_adapter_suppression_requires_real_dry_run_receipt_shape() -> None:
    beads = {"payload": {"op": "create", "dry_run_preview": {"graph_node_id": "feature-source"}}}
    github = {"payload": {"op": "issue-create", "dry_run": True, "mutation_suppressed": True}}
    incomplete = {"payload": {"op": "issue-create", "dry_run": True}}

    assert AUDIT._suppression_from(beads) is True
    assert AUDIT._suppression_from(github) is True
    assert AUDIT._suppression_from(incomplete) is False


def test_helper_identity_is_bound_to_git_index() -> None:
    identity = AUDIT._helper_identity()

    assert identity["path"].endswith("audit_decompose_live_trial.py")
    assert identity["tracked_in_index"] is True
    assert identity["index_matches_worktree"] is True
    assert len(identity["sha256"]) == 64


def test_helper_identity_covers_every_audit_module() -> None:
    """責務分割で provenance の穴を作らない: 監査 module 全部が identity に入る。

    状態層を別ファイルへ出した後に代表 module だけを測ると、状態層を試験中に書き換えても
    provenance_valid が緑のままになる。合成 identity は全 module を含み、どれか 1 本の
    変更で sha256 が動くこと (= pre-state との比較で検出できること) を固定する。
    """
    identity = AUDIT._helper_identity()
    covered = {module["path"] for module in identity["modules"]}

    assert covered == {
        path.relative_to(REPO_ROOT).as_posix() for path in AUDIT.AUDIT_PROVENANCE_FILES
    }
    assert all(module["index_matches_worktree"] for module in identity["modules"])

    single = AUDIT.STATE.composite_identity([SCRIPT])
    assert single["sha256"] != identity["sha256"]


def test_helper_identity_covers_the_scenario_contract() -> None:
    """合格条件を書いた契約まで provenance に含める。

    監査コードだけを束縛すると、閾値や fixture_contract を試験中に緩めることで
    コードを一行も触らずに要求を下げられる (HarnessHub-ojh6 残課題 #3)。
    """
    contract = (
        Path(__file__).parent / "fixtures" / "live-trial-positive-scenarios.json"
    ).resolve()

    assert contract in AUDIT.AUDIT_PROVENANCE_FILES
    covered = {module["path"] for module in AUDIT._helper_identity()["modules"]}
    assert contract.relative_to(REPO_ROOT).as_posix() in covered

    modules_only = AUDIT.STATE.composite_identity(list(AUDIT.AUDIT_MODULES))
    assert modules_only["sha256"] != AUDIT._helper_identity()["sha256"]


def test_negative_control_mutators_isolate_the_clause_they_target() -> None:
    """反例合成が狙った節だけを壊すことを固定する。

    readiness 用の変異が evidence 欠落も一緒に起こすと、schema が落ちた理由が
    readiness 節かどうか判別できなくなり、negative control が「何かが落ちた」以上の
    ことを言えなくなる。
    """
    node = _feature("feature-draft", promoted=False)
    AUDIT._mutate_pass_without_readiness(node)

    assert node["confirmation_status"] == "confirmed"
    assert node["evaluation_status"] == "pass"
    assert node["implementation_readiness"]["status"] == "incomplete"
    evidence = node["confirmation_evidence"]
    assert evidence["evaluator"] and evidence["evidence_ref"]
    assert evidence["evaluated_digest"] == AUDIT._evaluation_digest(node)

    intent = _feature("feature-draft", promoted=False)
    AUDIT._mutate_publication_intent(intent)
    assert intent["github_publication"]["mode"] == "issue"
    assert AUDIT._projection_evidence(intent) == ["github_publication.mode=issue"]


def test_negative_control_is_skipped_and_fails_when_no_blocked_feature_exists() -> None:
    """反例の土台が無いときに「実行しなかった」を合格へ倒さない。"""
    result = AUDIT._gate_negative_controls(
        REPO_ROOT, REPO_ROOT / "plugins/dev-graph", {"nodes": []}, {"payload": {}}, []
    )

    assert result["executed"] is False
    assert result["all_rejected"] is False
