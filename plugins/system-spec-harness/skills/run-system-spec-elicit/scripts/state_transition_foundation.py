"""Foundation and decision transitions for the spec-state single writer."""
from __future__ import annotations

import importlib.util
from pathlib import Path


_FOUNDATION_PROVENANCE_PATH = (
    Path(__file__).resolve().parents[3] / "scripts" / "foundation_provenance.py"
)
_FOUNDATION_PROVENANCE_SPEC = importlib.util.spec_from_file_location(
    "system_spec_foundation_provenance", _FOUNDATION_PROVENANCE_PATH
)
if _FOUNDATION_PROVENANCE_SPEC is None or _FOUNDATION_PROVENANCE_SPEC.loader is None:
    raise ImportError(f"cannot load foundation provenance helper: {_FOUNDATION_PROVENANCE_PATH}")
_FOUNDATION_PROVENANCE = importlib.util.module_from_spec(_FOUNDATION_PROVENANCE_SPEC)
_FOUNDATION_PROVENANCE_SPEC.loader.exec_module(_FOUNDATION_PROVENANCE)
validate_foundation_source_indexes = _FOUNDATION_PROVENANCE.validate_foundation_source_indexes
FOUNDATION_SOURCE_INDEXES = _FOUNDATION_PROVENANCE.FOUNDATION_SOURCE_INDEXES

from state_transition_common import (
    DECISION_COMPARISON_AXES,
    DECISION_COST_CATEGORIES,
    DECISION_OPTION_FIELDS,
    DECISION_STATUSES,
    FOUNDATION_KEYS,
    TransitionError,
    foundation_goal_ids,
    foundation_missing_fields,
    has_entry,
    is_explicit_na,
    is_https_url,
    is_rfc3339,
    normalize_serves,
    require_nonempty,
    require_nonempty_string_list,
)


def _require_fresh_bindings_for_confirmed_value_changes(
    previous: dict, merged: dict
) -> None:
    """A confirmed U value cannot change while retaining its old evidence."""
    if not previous.get("confirmed") or not merged.get("confirmed"):
        return
    changed = [
        (field, label)
        for field, label, _canonical_qa in FOUNDATION_SOURCE_INDEXES
        if previous.get(field) != merged.get(field)
    ]
    if not changed:
        return

    previous_refs = previous.get("effective_source_refs")
    merged_refs = merged.get("effective_source_refs")
    previous_refs = previous_refs if isinstance(previous_refs, dict) else {}
    merged_refs = merged_refs if isinstance(merged_refs, dict) else {}
    invalid_labels: list[str] = []
    changed_approval_refs: set[str] = set()
    for _field, label in changed:
        old_binding = previous_refs.get(label)
        new_binding = merged_refs.get(label)
        old_binding = old_binding if isinstance(old_binding, dict) else {}
        new_binding = new_binding if isinstance(new_binding, dict) else {}
        qa_changed = (
            isinstance(new_binding.get("qa_ref"), str)
            and new_binding.get("qa_ref") != old_binding.get("qa_ref")
        )
        approval_changed = (
            isinstance(new_binding.get("approval_ref"), str)
            and new_binding.get("approval_ref") != old_binding.get("approval_ref")
        )
        if not qa_changed or not approval_changed:
            invalid_labels.append(label)
        if approval_changed:
            changed_approval_refs.add(new_binding["approval_ref"])
    if invalid_labels:
        raise TransitionError(
            "確定済み foundation の値変更には対象U "
            + ", ".join(invalid_labels)
            + " の新しい qa_ref / approval_ref が必須"
        )

    current_approval = merged.get("approval_ref")
    if (
        current_approval == previous.get("approval_ref")
        or current_approval not in changed_approval_refs
    ):
        raise TransitionError(
            "確定済み foundation の値変更には、変更対象Uの新しい approval_ref を"
            " requirements_foundation.approval_ref に設定する必要がある"
        )


def set_foundation(state: dict, foundation: dict) -> None:
    """Merge and confirm U1--U9 only after source, value, and approval gates pass."""
    if not isinstance(foundation, dict):
        raise TransitionError(f"requirements_foundation は object でない: {foundation!r}")
    foundation = dict(foundation)
    approval_note = foundation.pop("approval_note", None)
    approval_ref = foundation.get("approval_ref")
    approvals = list(state.get("approval_log") or [])
    if approval_ref and approval_note is not None:
        if not has_entry(approvals, approval_ref):
            approvals.append({"id": approval_ref, "note": approval_note})
    previous = dict(state.get("requirements_foundation") or {})
    merged = dict(previous)
    for key, value in foundation.items():
        if key not in FOUNDATION_KEYS:
            raise TransitionError(f"requirements_foundation の未知キー: {key!r}")
        merged[key] = value
    scope = merged.get("scope")
    if scope is None:
        scope = {"in": [], "out": []}
    if not isinstance(scope, dict):
        raise TransitionError("requirements_foundation.scope は object でない")
    if not is_explicit_na(scope):
        scope.setdefault("in", [])
        scope.setdefault("out", [])
    merged["scope"] = scope
    goals = merged.get("goals", [])
    goal_ids = [] if is_explicit_na(goals) else foundation_goal_ids(goals)
    intents = merged.get("concrete_intents", []) or []
    if is_explicit_na(intents):
        intents = []
    elif not isinstance(intents, list):
        raise TransitionError("requirements_foundation.concrete_intents は配列でない")
    for intent in intents:
        if not isinstance(intent, dict):
            raise TransitionError(f"concrete_intent は object でない: {intent!r}")
        for goal_id in intent.get("serves", []) or []:
            if goal_id not in goal_ids:
                raise TransitionError(f"concrete_intent {intent.get('id')!r} の serves={goal_id!r} が実在 goal を指さない")
    confirmed = bool(merged.get("confirmed"))
    if confirmed:
        _require_fresh_bindings_for_confirmed_value_changes(previous, merged)
        missing = foundation_missing_fields(merged)
        if missing:
            raise TransitionError("確定条件不足: U1-U3 は値必須・U4-U9 は値または明示 N/A+理由が必須: " + ", ".join(missing))
        approval_ref = merged.get("approval_ref")
        if not isinstance(approval_ref, str) or not approval_ref.strip():
            raise TransitionError("確定条件不足: confirmed には approval_ref (ユーザー合意の approval_log 参照) が必須")
        if not has_entry(approvals, approval_ref):
            raise TransitionError(f"確定条件不足: approval_ref={approval_ref!r} が approval_log に不在 (承認証跡なし)")
        candidate = dict(state)
        candidate["approval_log"] = approvals
        candidate["requirements_foundation"] = merged
        source_findings = validate_foundation_source_indexes(candidate)
        if source_findings:
            raise TransitionError("確定条件不足: " + "; ".join(source_findings))
    merged["confirmed"] = confirmed
    state["approval_log"] = approvals
    state["requirements_foundation"] = merged


def _validate_cost_model(value, label: str) -> str:
    if not isinstance(value, dict):
        raise TransitionError(f"decision: {label} は object 必須")
    category = value.get("category")
    if category not in DECISION_COST_CATEGORIES:
        raise TransitionError(f"decision: {label}.category={category!r} が許容値外 ({sorted(DECISION_COST_CATEGORIES)})")
    amount = value.get("amount")
    if category == "unknown":
        if amount is not None and (isinstance(amount, bool) or not isinstance(amount, (int, float)) or amount < 0):
            raise TransitionError(f"decision: {label}.amount は非負数または null 必須")
    elif isinstance(amount, bool) or not isinstance(amount, (int, float)) or amount < 0:
        raise TransitionError(f"decision: {label}.amount は非負数必須")
    if category == "free" and amount != 0:
        raise TransitionError(f"decision: {label}.category=free の amount は 0 必須")
    if category in {"low-cost", "paid"} and amount == 0:
        raise TransitionError(f"decision: {label}.category={category} の amount は正数必須")
    for field in ("currency", "billing_period", "tco"):
        require_nonempty(value.get(field), f"{label}.{field}")
    return category


def set_decision(state: dict, decision: dict) -> None:
    if not isinstance(decision, dict):
        raise TransitionError("decision は object 必須")
    decision_id = decision.get("id")
    require_nonempty(decision_id, "id")
    require_nonempty(decision.get("question"), "question")
    status = decision.get("status")
    if status not in DECISION_STATUSES:
        raise TransitionError(f"decision: status={status!r} が許容値外")
    goal_ids = set(foundation_goal_ids((state.get("requirements_foundation") or {}).get("goals", [])))
    serves = normalize_serves(decision.get("serves_goals"))
    if not serves:
        raise TransitionError("decision: serves_goals は非空必須")
    dangling = [goal_id for goal_id in serves if goal_id not in goal_ids]
    if dangling:
        raise TransitionError(f"decision: serves_goals {dangling} が実在 goal を指さない")
    options = decision.get("options")
    if not isinstance(options, list) or not 2 <= len(options) <= 3:
        raise TransitionError("decision: options は2-3件必須")
    option_ids: list[str] = []
    cost_categories: set[str] = set()
    for option in options:
        if not isinstance(option, dict):
            raise TransitionError("decision option は object 必須")
        for field in DECISION_OPTION_FIELDS:
            if field != "cost_model":
                require_nonempty(option.get(field), f"option.{field}")
        cost_categories.add(_validate_cost_model(option.get("cost_model"), "option.cost_model"))
        for field in ("pros", "cons", "risks"):
            require_nonempty_string_list(option.get(field), f"option.{field}")
        evidence_refs = option.get("evidence_refs")
        require_nonempty_string_list(evidence_refs, "option.evidence_refs")
        if any(not is_https_url(ref) for ref in evidence_refs):
            raise TransitionError("decision: option.evidence_refs は公式 https URL 必須")
        if option["id"] in option_ids:
            raise TransitionError(f"decision: option id 重複 {option['id']!r}")
        option_ids.append(option["id"])
    if not cost_categories.intersection({"free", "low-cost"}):
        raise TransitionError("decision: options には free または low-cost 候補が最低1件必須")
    recommendation = decision.get("recommendation")
    if status != "needs_guidance":
        if not isinstance(recommendation, dict):
            raise TransitionError("decision: recommendation が必須")
        for field in ("option_id", "rationale", "caveats", "confidence", "latest_checked_at"):
            require_nonempty(recommendation.get(field), f"recommendation.{field}")
        require_nonempty_string_list(recommendation.get("caveats"), "recommendation.caveats")
        basis = recommendation.get("comparison_basis")
        if not isinstance(basis, dict):
            raise TransitionError("decision: recommendation.comparison_basis は object 必須")
        for axis in DECISION_COMPARISON_AXES:
            require_nonempty(basis.get(axis), f"recommendation.comparison_basis.{axis}")
        if not is_rfc3339(recommendation.get("latest_checked_at")):
            raise TransitionError("decision: recommendation.latest_checked_at は RFC3339 必須")
        if recommendation.get("option_id") not in option_ids:
            raise TransitionError("decision: recommendation.option_id が options に不在")
    user_decision = decision.get("user_decision")
    if status == "confirmed":
        if not isinstance(user_decision, dict):
            raise TransitionError("decision: confirmed には user_decision が必須")
        if user_decision.get("option_id") not in option_ids:
            raise TransitionError("decision: user_decision.option_id が options に不在")
        require_nonempty(user_decision.get("confirmed_at"), "user_decision.confirmed_at")
        if not is_rfc3339(user_decision.get("confirmed_at")):
            raise TransitionError("decision: user_decision.confirmed_at は RFC3339 必須")
    elif user_decision:
        raise TransitionError("decision: AI推奨だけで confirmed にせずユーザー確認を待つこと")
    normalized, records = dict(decision), list(state.get("decisions") or [])
    normalized["serves_goals"] = serves
    for index, current in enumerate(records):
        if isinstance(current, dict) and current.get("id") == decision_id:
            records[index] = normalized
            break
    else:
        records.append(normalized)
    state["decisions"] = records
