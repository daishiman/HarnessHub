"""Matrix, log, and resumable-chunk transitions owned by the spec-state writer."""
from __future__ import annotations

import hashlib
import re
import sys
from pathlib import Path, PurePosixPath

from state_transition_common import (
    CANONICAL_PLATFORMS,
    CELL_STATES,
    PLATFORM_LABELS,
    TransitionError,
    empty_foundation,
    has_entry,
    normalize_serves,
)
CATEGORY_ID_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
APPLICATION_STATES = {"applied", "not_applicable"}
DESIGN_APPLICATION_CONTRACT_VERSION = "1.0"
CURRENT_STATE_SCHEMA_VERSION = "1.1"


def normalize_design_applications(raw: object) -> list[dict]:
    """Validate chapter-specific design interpretation separately from Q&A text."""
    if not isinstance(raw, list) or not raw:
        raise TransitionError("design_applications は非空配列必須")
    normalized: list[dict] = []
    for index, item in enumerate(raw):
        label = f"design_applications[{index}]"
        if not isinstance(item, dict):
            raise TransitionError(f"{label} は object 必須")
        for key in ("knowledge_ref", "principle", "rationale"):
            value = item.get(key)
            if not isinstance(value, str) or not value.strip():
                raise TransitionError(f"{label}.{key} は非空文字列必須")
        applicability = item.get("applicability")
        if applicability not in APPLICATION_STATES:
            raise TransitionError(
                f"{label}.applicability={applicability!r} は applied|not_applicable 必須"
            )
        tradeoffs = item.get("tradeoffs")
        if (
            not isinstance(tradeoffs, list)
            or not tradeoffs
            or any(not isinstance(value, str) or not value.strip() for value in tradeoffs)
        ):
            raise TransitionError(f"{label}.tradeoffs は非空文字列の配列必須")
        normalized.append(
            {
                "knowledge_ref": item["knowledge_ref"].strip(),
                "principle": item["principle"].strip(),
                "applicability": applicability,
                "rationale": item["rationale"].strip(),
                "tradeoffs": [value.strip() for value in tradeoffs],
            }
        )
    return normalized


# 利用者の一次入力を出所とする kind。foundation trace と C06 中立性監査はここだけを根拠にできる。
PRIMARY_QA_SOURCE_KINDS = {"user-dialogue", "written-requirements"}
# 利用者の新規入力を伴わない kind。監査は「新しい主張が入ったか」を kind だけで判別できる。
#   harness-remediation : レビュー/監査の指摘を反映した是正 (新規主張はあるが利用者発ではない)
#   derived-consolidation: 既存 qa の統合・復旧 (新しい情報を増やさない、承認証跡が要る)
NON_PRIMARY_QA_SOURCE_KINDS = {"harness-remediation", "derived-consolidation"}
QA_SOURCE_KINDS = PRIMARY_QA_SOURCE_KINDS | NON_PRIMARY_QA_SOURCE_KINDS
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


def _find_qa(state: dict, qa_id: object, label: str) -> dict:
    if not isinstance(qa_id, str) or not qa_id.strip():
        raise TransitionError(f"{label}: qa_id は非空文字列必須")
    qa_id = qa_id.strip()
    entry = next(
        (candidate for candidate in state.get("qa_log", []) if candidate.get("id") == qa_id),
        None,
    )
    if entry is None:
        raise TransitionError(f"{label}: qa_log に存在しない qa_id: {qa_id}")
    return entry


def normalize_qa_source(raw: object, answer: object) -> dict:
    """qa entry の source を契約形状へ正規化する。

    対話は ``{"kind": "user-dialogue"}``、書面は path / section / sha256 を伴う。
    書面の sha256 は ``answer`` 原文 (UTF-8 bytes) と一致しなければならない。digest が
    合わない source を受け入れると「利用者原文を索引した」という主張が根拠を失う。

    利用者の新規入力を伴わない entry (レビュー指摘の反映・既存 qa の統合復旧) を
    ``user-dialogue`` と索引すると、C06 中立性監査と foundation trace が「利用者が答えた」
    という前提のまま偽の一次根拠を数えてしまう。この 2 経路は専用 kind で明示し、
    それぞれ何に由来するかを必須フィールドとして持たせる。
    """
    if not isinstance(raw, dict):
        raise TransitionError("qa source: source は object 必須")
    kind = raw.get("kind")
    if kind not in QA_SOURCE_KINDS:
        raise TransitionError(f"qa source: source.kind は {sorted(QA_SOURCE_KINDS)} のいずれか必須")
    if kind == "user-dialogue":
        if set(raw) - {"kind"}:
            raise TransitionError("qa source: user-dialogue source に余分な key を持たせない")
        return {"kind": kind}

    if kind == "harness-remediation":
        # どの指摘に由来するかを辿れなければ、是正は「AI が勝手に足した」と区別できない。
        trigger = raw.get("trigger")
        if set(raw) - {"kind", "trigger"}:
            raise TransitionError("qa source: harness-remediation source に余分な key を持たせない")
        if not isinstance(trigger, str) or not trigger.strip():
            raise TransitionError("qa source: harness-remediation source.trigger は非空文字列必須")
        return {"kind": kind, "trigger": trigger.strip()}

    if kind == "derived-consolidation":
        # 統合は新しい情報を増やさない操作なので、由来 qa と承認証跡の両方を要求する。
        derived_from, approval_ref = raw.get("derived_from"), raw.get("approval_ref")
        if set(raw) - {"kind", "derived_from", "approval_ref"}:
            raise TransitionError("qa source: derived-consolidation source に余分な key を持たせない")
        if not isinstance(derived_from, list) or not derived_from or not all(
            isinstance(item, str) and item.strip() for item in derived_from
        ):
            raise TransitionError(
                "qa source: derived-consolidation source.derived_from は非空の qa id 配列必須"
            )
        if not isinstance(approval_ref, str) or not approval_ref.strip():
            raise TransitionError(
                "qa source: derived-consolidation source.approval_ref は非空文字列必須"
            )
        return {
            "kind": kind,
            "derived_from": [item.strip() for item in derived_from],
            "approval_ref": approval_ref.strip(),
        }

    path, section, digest = raw.get("path"), raw.get("section"), raw.get("sha256")
    if not isinstance(path, str) or not path.strip() or path.startswith("/") or ".." in path.split("/"):
        raise TransitionError("qa source: written source.path は安全な相対パス必須")
    if not isinstance(section, str) or not section.strip():
        raise TransitionError("qa source: written source.section が空")
    if not isinstance(digest, str) or not SHA256_RE.fullmatch(digest):
        raise TransitionError("qa source: written source.sha256 が不正")
    if not isinstance(answer, str) or hashlib.sha256(answer.encode("utf-8")).hexdigest() != digest:
        raise TransitionError("qa source: written source.sha256 が answer 原文と不一致")
    return {"kind": kind, "path": path, "section": section, "sha256": digest}


def set_qa_source(state: dict, qa_id: str, raw: object) -> None:
    """既存 qa の質問・回答を保ったまま、欠落していた出所メタデータだけを追記する。

    schema 1.1 移行前に記録された一部の qa は ``source`` も ``legacy_exempt`` も持たず、
    「対話で得たのか書面から索引したのか」を監査が判別できない。既登録の逐語を改変せずに
    出所だけを補える経路が無いと、reopen → 再確認という重い手順で回答そのものを作り直す
    ことになり、かえって一次根拠を失う。

    ただし後付けであること自体は隠さない。``source_provenance`` に
    ``{"mode": "metadata_backfill", "writer": "set-qa-source"}`` を残し、対話時にその場で
    記録された source と区別できるようにする。既存 source の上書きは常に拒否する
    (同一 payload の再適用のみ冪等に受け入れる)。
    """
    entry = _find_qa(state, qa_id, "set-qa-source")
    normalized = normalize_qa_source(raw, entry.get("answer"))
    provenance = {"mode": "metadata_backfill", "writer": "set-qa-source"}
    repair = {"mode": "type_repair", "writer": "set-qa-source"}

    existing = entry.get("source")
    if existing is not None and not isinstance(existing, dict):
        # 契約は source を object と定めるが、検査するゲートが無かったため素の文字列 (注記) が
        # 混入していた。型不正は「対話経路で記録済みの source」ではなく壊れた値なので保護対象に
        # 含めず、注記本文を source_note へ退避したうえで契約形状へ修復する。捨てると
        # 「なぜこの qa が存在するか」の唯一の手掛かりを失うため、必ず保存する。
        # 退避先は「読める注記」なので非空文字列に揃える。"" / 0 / [] / False をそのまま
        # 代入すると writer は受理するが schema (minLength 1) が拒否する値を書けてしまう。
        # かといって捨てると「壊れた値が入っていた」という事実まで消えるので、型と値を
        # 明示した文字列へ包んで残す。
        entry["source_note"] = (
            existing
            if isinstance(existing, str) and existing.strip()
            else f"(契約外の source を修復時に退避: {existing!r})"
        )
        entry["source"] = normalized
        entry["source_provenance"] = repair
        return

    if existing is not None:
        # 修復済み (type_repair) の再適用も、同一 payload なら冪等に受け入れる。
        if entry.get("source_provenance") not in (provenance, repair):
            raise TransitionError(
                "set-qa-source: 対話経路で記録済みの source は保護し、"
                f"後付けへの差し替えを拒否: {entry['id']}"
            )
        if existing != normalized:
            raise TransitionError(
                f"set-qa-source: 補完済み source と異なる値の再適用は拒否: {entry['id']}"
            )
        return

    entry["source"] = normalized
    entry["source_provenance"] = provenance


def retire_qa(
    state: dict,
    qa_id: str,
    reason: str,
    *,
    superseded_by: str | None = None,
) -> None:
    """Mark an unconsumed historical QA as retired without rewriting its text.

    Retirement is deliberately metadata-only.  A QA which still drives a
    confirmed matrix cell or an effective foundation value is current evidence
    and cannot be retired.  The exact-payload replay is idempotent; every other
    rewrite is rejected so retirement history cannot be silently reinterpreted.
    """
    if not isinstance(reason, str) or not reason.strip():
        raise TransitionError("retire-qa: reason は非空文字列必須")
    matches = [
        candidate
        for candidate in state.get("qa_log", [])
        if isinstance(candidate, dict) and candidate.get("id") == qa_id
    ]
    if len(matches) != 1:
        raise TransitionError(
            f"retire-qa: qa_id={qa_id!r} は qa_log で一意に実在する必要がある"
        )
    entry = matches[0]
    payload = {"writer": "retire-qa", "reason": reason.strip()}

    if superseded_by is not None:
        if not isinstance(superseded_by, str) or not superseded_by.strip():
            raise TransitionError("retire-qa: superseded_by は非空文字列必須")
        superseded_by = superseded_by.strip()
        if superseded_by == qa_id:
            raise TransitionError("retire-qa: superseded_by は自分自身を指せない")
        replacement = [
            candidate
            for candidate in state.get("qa_log", [])
            if isinstance(candidate, dict) and candidate.get("id") == superseded_by
        ]
        if len(replacement) != 1 or isinstance(replacement[0].get("retirement"), dict):
            raise TransitionError(
                "retire-qa: superseded_by は qa_log に一意に実在する active entry 必須"
            )
        payload["superseded_by"] = superseded_by

    consumers: list[str] = []
    for category, row in (state.get("matrix") or {}).items():
        if not isinstance(row, dict):
            continue
        for platform, cell in row.items():
            if isinstance(cell, dict) and cell.get("qa_ref") == qa_id:
                consumers.append(f"matrix.{category}.{platform}")
    foundation = state.get("requirements_foundation") or {}
    refs = foundation.get("effective_source_refs") if isinstance(foundation, dict) else None
    if isinstance(refs, dict):
        for label, binding in refs.items():
            if isinstance(binding, dict) and binding.get("qa_ref") == qa_id:
                consumers.append(f"requirements_foundation.effective_source_refs.{label}")
    if consumers:
        raise TransitionError(
            f"retire-qa: active consumer が残る qa_id={qa_id!r}: {', '.join(consumers)}"
        )

    existing = entry.get("retirement")
    if existing is not None:
        if existing == payload:
            return
        raise TransitionError(f"retire-qa: 既存 retirement の上書きは拒否: {qa_id}")
    entry["retirement"] = payload


def set_qa_design_applications(state: dict, qa_id: str, raw: object) -> None:
    """Backfill design interpretation without rewriting the original Q&A text."""
    if not isinstance(qa_id, str) or not qa_id.strip():
        raise TransitionError("set-qa-design-applications: qa_id は非空文字列必須")
    qa_id = qa_id.strip()
    entry = next(
        (candidate for candidate in state.get("qa_log", []) if candidate.get("id") == qa_id),
        None,
    )
    if entry is None:
        raise TransitionError(
            f"set-qa-design-applications: qa_log に存在しない qa_id: {qa_id}"
        )

    normalized = normalize_design_applications(raw)
    provenance = {
        "mode": "legacy_backfill",
        "writer": "set-qa-design-applications",
    }
    existing = entry.get("design_applications")
    existing_provenance = entry.get("design_application_provenance")
    if existing_provenance is not None:
        # The shared schema permits only this exact provenance. Keep the explicit
        # guard because this function and CLI also receive hand-authored JSON
        # before the standalone schema/coverage gates run.
        if existing_provenance != provenance:
            raise TransitionError(
                f"set-qa-design-applications: 既存 provenance の上書きは拒否: {qa_id}"
            )
        if existing is None:
            raise TransitionError(
                "set-qa-design-applications: 完了済み provenance に対する "
                f"design_applications 欠落を検出: {qa_id}"
            )
        if normalize_design_applications(existing) != normalized:
            raise TransitionError(
                "set-qa-design-applications: 完了済み backfill と異なる "
                f"design_applications の再適用は拒否: {qa_id}"
            )
        # A previously completed backfill is the only idempotent replay allowed.
        entry.pop("legacy_exempt", None)
        entry.pop("legacy_exempt_reason", None)
        return

    if existing is not None:
        raise TransitionError(
            "set-qa-design-applications: provenance の無い既存 design_applications は"
            f"対話経路として保護し、legacy_backfill への変更を拒否: {qa_id}"
        )
    reason = entry.get("legacy_exempt_reason")
    if entry.get("legacy_exempt") is not True or not isinstance(reason, str) or not reason.strip():
        raise TransitionError(
            "set-qa-design-applications: legacy_exempt=true と非空の "
            f"legacy_exempt_reason を持つ旧 qa のみ補完可能: {qa_id}"
        )

    entry["design_applications"] = normalized
    entry["design_application_provenance"] = provenance
    # A successful validated backfill supersedes the temporary legacy escape.
    entry.pop("legacy_exempt", None)
    entry.pop("legacy_exempt_reason", None)


MD_HEADING_RE = re.compile(r"^#{1,6}\s+(.*?)\s*$", re.MULTILINE)


def _split_knowledge_ref(ref: str, label: str) -> tuple[str, str]:
    if not isinstance(ref, str) or not ref.strip():
        raise TransitionError(f"fix-qa-knowledge-ref: {label} は非空文字列必須")
    raw_path, _, anchor = ref.partition("#")
    raw_path = raw_path.strip()
    path = PurePosixPath(raw_path)
    if path.is_absolute() or ".." in path.parts or str(path) in {"", "."}:
        raise TransitionError(
            f"fix-qa-knowledge-ref: {label} は repo root 配下の安全な相対パス必須: {raw_path!r}"
        )
    return raw_path, anchor.strip()


def fix_qa_knowledge_ref(
    state: dict, qa_id: str, old_ref: str, new_ref: str, repo_root: object
) -> None:
    """壊れた knowledge_ref だけを、解釈本文を一切変えずに実在する参照へ差し替える。

    ``set_qa_design_applications`` は design_applications 配列を丸ごと一単位として保護するため、
    対話経路 (provenance なし) の entry では綴り違いすら訂正できない。しかし参照先の実在しない
    引用は「この知識に基づいて判断した」という主張の根拠を持たず、放置すると
    ``validate-design-knowledge-refs.py`` が恒久的に赤になる。

    契約の保護意図は「対話で得た解釈内容を後から AI が書き換えないこと」なので、次の全条件を
    満たす場合に限って knowledge_ref だけの差し替えを許す。1 つでも欠ければ拒否する。

    - principle / applicability / rationale / tradeoffs は一切触らない (照合対象ですらない)。
    - 旧 ref の path が repo 内に**実在しない** (実在する参照の付け替え=解釈の変更は許さない)。
    - 新 ref の path が実在し、anchor 指定があればその見出しも実在する。
    - 該当する application が 1 件以上ある。

    差し替えは ``knowledge_ref_corrections`` へ append-only で記録し、対話時の引用と
    後からの訂正を監査が区別できるようにする。同一の訂正の再適用は冪等に no-op とする。
    """
    entry = _find_qa(state, qa_id, "fix-qa-knowledge-ref")
    root = Path(repo_root)
    old_path, _ = _split_knowledge_ref(old_ref, "old_ref")
    new_path, new_anchor = _split_knowledge_ref(new_ref, "new_ref")
    if old_ref == new_ref:
        raise TransitionError("fix-qa-knowledge-ref: old_ref と new_ref が同一")

    applications = entry.get("design_applications")
    if not isinstance(applications, list) or not applications:
        raise TransitionError(
            f"fix-qa-knowledge-ref: design_applications を持たない qa: {qa_id}"
        )

    if not any(item.get("knowledge_ref") == old_ref for item in applications):
        # Idempotent replay: the correction already landed and left its audit trail.
        if any(item.get("knowledge_ref") == new_ref for item in applications) and any(
            record.get("old_ref") == old_ref and record.get("new_ref") == new_ref
            for record in entry.get("knowledge_ref_corrections", [])
        ):
            return
        raise TransitionError(
            f"fix-qa-knowledge-ref: old_ref に一致する design_application が無い: {qa_id}"
        )

    if (root / old_path).is_file():
        raise TransitionError(
            "fix-qa-knowledge-ref: 実在する参照の付け替えは解釈の変更にあたるため拒否: "
            f"{old_path}"
        )
    target = root / new_path
    if not target.is_file():
        raise TransitionError(f"fix-qa-knowledge-ref: new_ref の参照先が実在しない: {new_path}")
    if new_anchor:
        headings = set(MD_HEADING_RE.findall(target.read_text(encoding="utf-8")))
        if new_anchor not in headings:
            raise TransitionError(
                f"fix-qa-knowledge-ref: new_ref の見出しが実在しない: {new_path}#{new_anchor}"
            )

    changed = 0
    for item in applications:
        if item.get("knowledge_ref") == old_ref:
            item["knowledge_ref"] = new_ref
            changed += 1
    entry.setdefault("knowledge_ref_corrections", []).append(
        {
            "old_ref": old_ref,
            "new_ref": new_ref,
            "applied_to": changed,
            "writer": "fix-qa-knowledge-ref",
            "reason": "参照先が実在しない引用を、解釈本文を変えずに実在する参照へ接地させる",
        }
    )


def derive_aggregate(cells: list[str]) -> str:
    if not cells or all(state == "未収集" for state in cells):
        return "未着手"
    if all(state == "対象外" for state in cells):
        return "対象外"
    if any(state == "未収集" for state in cells):
        return "収集中"
    return "確定"


def _row_states(state: dict, category_id: str) -> list[str]:
    return [state["matrix"][category_id][platform]["state"] for platform in CANONICAL_PLATFORMS]


def recompute_aggregates(state: dict) -> None:
    state["category_aggregate"] = {
        category["id"]: derive_aggregate(_row_states(state, category["id"]))
        for category in state["categories"]
    }


def count_unresolved(state: dict) -> int:
    return sum(
        cell.get("state") == "未収集"
        for row in state.get("matrix", {}).values()
        for cell in row.values()
        if isinstance(cell, dict)
    )


def _refresh_hearing_progress(state: dict) -> None:
    """Keep the resumable progress fields consistent with the matrix."""
    progress = state.setdefault("hearing_progress", {})
    unresolved = count_unresolved(state)
    progress["complete"] = unresolved == 0
    progress["next_question"] = None if unresolved == 0 else next_unresolved_question(state)


def bootstrap_state() -> dict:
    return {
        "schema_version": CURRENT_STATE_SCHEMA_VERSION,
        "design_application_contract_version": DESIGN_APPLICATION_CONTRACT_VERSION,
        "categories": [], "platforms": list(CANONICAL_PLATFORMS),
        "matrix": {}, "qa_log": [], "approval_log": [], "reopen_log": [],
        "category_aggregate": {}, "targets": [], "requirements_foundation": empty_foundation(),
        "decisions": [], "knowledge_candidates": [],
        "hearing_progress": {"loop_count": 0, "next_question": None, "complete": False},
    }


def init_state(taxonomy: dict, existing_state: dict | None = None) -> dict:
    if not isinstance(taxonomy, dict):
        raise TransitionError("taxonomy は object 必須")
    platforms = taxonomy.get("platforms")
    if not isinstance(platforms, list):
        raise TransitionError("taxonomy.platforms は配列必須")
    taxonomy_platforms = [item.get("id") for item in platforms if isinstance(item, dict)]
    if taxonomy_platforms != list(CANONICAL_PLATFORMS):
        raise TransitionError("taxonomy.platforms は canonical 6 platform と順序を一致させる必要がある")
    categories = taxonomy.get("categories")
    if not isinstance(categories, list) or not categories:
        raise TransitionError("taxonomy.categories は非空配列必須")
    ids = [item.get("id") for item in categories if isinstance(item, dict)]
    if len(ids) != len(categories) or len(set(ids)) != len(ids):
        raise TransitionError("taxonomy.categories の id が不正または重複")
    if existing_state and any(
        isinstance(cell, dict) and cell.get("state") == "確定"
        for row in existing_state.get("matrix", {}).values()
        if isinstance(row, dict)
        for cell in row.values()
    ):
        raise TransitionError(
            "init --state は matrix 未着手の bootstrap state 専用。"
            "確定セルを含む state の再初期化は R4-reopen を迂回するため拒否"
        )
    if existing_state is None:
        state = bootstrap_state()
    else:
        if not isinstance(existing_state, dict):
            raise TransitionError("既存 state は object 必須")
        schema_version = existing_state.get("schema_version")
        contract_version = existing_state.get("design_application_contract_version")
        if schema_version == "1.0":
            if contract_version is not None:
                raise TransitionError(
                    "legacy schema 1.0 は design_application_contract_version 欠落時だけ"
                    "明示 migration 可能"
                )
        elif schema_version == CURRENT_STATE_SCHEMA_VERSION:
            if contract_version != DESIGN_APPLICATION_CONTRACT_VERSION:
                raise TransitionError(
                    "schema 1.1 は design_application_contract_version=1.0 必須。"
                    "marker 欠落/不一致を init で修復してはならない"
                )
        else:
            raise TransitionError(
                "既存 state の schema_version は exact 1.0 legacy または exact 1.1 current 必須"
            )
        state = dict(existing_state)
    # init は legacy 1.0 state の明示 migration boundary でもある。matrix は未収集へ
    # 再初期化されるため、旧 qa entry を design-app contract 適合と偽装せず 1.1 へ進められる。
    state["schema_version"] = CURRENT_STATE_SCHEMA_VERSION
    state["design_application_contract_version"] = DESIGN_APPLICATION_CONTRACT_VERSION
    state["categories"] = [{"id": item["id"], "label": item["label"]} for item in categories]
    state["platforms"] = list(CANONICAL_PLATFORMS)
    state["matrix"] = {
        category["id"]: {platform: {"state": "未収集"} for platform in CANONICAL_PLATFORMS}
        for category in state["categories"]
    }
    state.setdefault("qa_log", [])
    state.setdefault("approval_log", [])
    state.setdefault("reopen_log", [])
    state.setdefault("targets", [])
    state.setdefault("requirements_foundation", empty_foundation())
    state.setdefault("decisions", [])
    state.setdefault("knowledge_candidates", [])
    state["hearing_progress"] = {"loop_count": 0, "next_question": None, "complete": False}
    recompute_aggregates(state)
    _refresh_hearing_progress(state)
    return state


def add_category(state: dict, category: dict) -> None:
    if not isinstance(category, dict):
        raise TransitionError("add-category: category は object 必須")
    category_id, label = category.get("id"), category.get("label")
    if not isinstance(category_id, str) or not category_id.strip():
        raise TransitionError("add-category: id が空")
    if not isinstance(label, str) or not label.strip():
        raise TransitionError("add-category: label が空")
    category_id, label = category_id.strip(), label.strip()
    if not CATEGORY_ID_RE.fullmatch(category_id):
        raise TransitionError(f"add-category: id は kebab-case 必須 ({category_id})")
    if category_id in state["matrix"] or any(item.get("id") == category_id for item in state["categories"]):
        raise TransitionError(f"add-category: 既存カテゴリ ({category_id}) の変更は R4-reopen 経由")
    state["categories"].append({"id": category_id, "label": label})
    state["matrix"][category_id] = {platform: {"state": "未収集"} for platform in CANONICAL_PLATFORMS}
    recompute_aggregates(state)
    _refresh_hearing_progress(state)


def _cell(state: dict, category: str, platform: str) -> dict:
    if category not in state["matrix"]:
        raise TransitionError(f"未知カテゴリ: {category}")
    if platform not in state["matrix"][category]:
        raise TransitionError(f"未知 platform: {platform} (カテゴリ {category})")
    return state["matrix"][category][platform]


def apply_cell_op(state: dict, op: dict) -> None:
    action, category, platform = op.get("action"), op.get("category"), op.get("platform")
    cell = _cell(state, category, platform)
    current = cell.get("state")
    if action == "reopen":
        if current != "確定":
            raise TransitionError(f"reopen 不可: {category}/{platform} は '{current}' (確定セルのみ reopen できる)")
        if not op.get("reason"):
            raise TransitionError(f"reopen には reason が必須: {category}/{platform}")
        # reopen は確定を取り消す操作なので、approval_ref を次のセルへ引き継がないのが正しい
        # (別の回答に対して得た承認を、再確定したセルが継承してしまう)。ただし discarded に
        # 載せずに落とすと「承認があったこと自体」が state から消え、reopen_log を読んでも
        # 再取得が要ると分からない。捨てる判断は変えず、捨てた事実だけを残す。
        discarded = {
            key: list(cell[key]) if isinstance(cell[key], list) else cell[key]
            for key in ("qa_ref", "serves_goals", "serves_intents", "approval_ref")
            if key in cell
        }
        log_entry = {
            "category": category,
            "platform": platform,
            "reason": op["reason"],
            "from": "確定",
        }
        if discarded:
            log_entry["discarded"] = discarded
        state.setdefault("reopen_log", []).append(log_entry)
        state["matrix"][category][platform] = {"state": "未収集", "reopened_from": "確定", "reopen_reason": op["reason"]}
        return
    if action == "set-serves":
        if current != "確定":
            raise TransitionError(f"set-serves 不可: {category}/{platform} は '{current}' (確定セルのみ serves_goals を付与できる)")
        serves = normalize_serves(op.get("serves_goals"))
        if not serves:
            raise TransitionError(f"set-serves には非空 serves_goals が必須: {category}/{platform}")
        cell["serves_goals"] = serves
        return
    if action == "set-approval":
        # exclude は approval_ref を cell へ持てるのに confirm は持てない、という非対称が
        # 「回答本文は承認を主張しているが、確定セルから承認記録へ機械追跡できない」
        # (F-0025) の直接原因だった。confirm の action 定義を変えると確定条件そのものへ
        # 触れることになるため、確定セル限定の後付け annotation である set-serves と
        # 同型の action を新設して対称化する (単一 writer 契約・確定巻き戻し拒否は不変)。
        if current != "確定":
            raise TransitionError(
                f"set-approval 不可: {category}/{platform} は '{current}' (確定セルのみ approval_ref を付与できる)"
            )
        approval_ref = op.get("approval_ref")
        if not isinstance(approval_ref, str) or not approval_ref.strip():
            raise TransitionError(f"set-approval には非空 approval_ref が必須: {category}/{platform}")
        approval_ref = approval_ref.strip()
        if not has_entry(state.get("approval_log", []), approval_ref):
            raise TransitionError(
                f"set-approval: approval_log に存在しない approval_ref: {approval_ref} ({category}/{platform})"
            )
        cell["approval_ref"] = approval_ref
        return
    if current == "確定":
        raise TransitionError(f"確定セルの直接変更は拒否: {category}/{platform}。変更は R4-reopen を経由すること")
    if action == "confirm":
        if not op.get("qa_ref"):
            raise TransitionError(f"confirm には qa_ref が必須: {category}/{platform}")
        next_cell = {"state": "確定", "qa_ref": op["qa_ref"]}
        serves = normalize_serves(op.get("serves_goals"))
        if serves:
            next_cell["serves_goals"] = serves
        state["matrix"][category][platform] = next_cell
    elif action == "exclude":
        if not (op.get("reason") or op.get("approval_ref")):
            raise TransitionError(f"exclude には reason か approval_ref が必須: {category}/{platform}")
        next_cell = {"state": "対象外"}
        if op.get("reason"):
            next_cell["reason"] = op["reason"]
        if op.get("approval_ref"):
            next_cell["approval_ref"] = op["approval_ref"]
        state["matrix"][category][platform] = next_cell
    else:
        raise TransitionError(f"未知 action: {action!r}")


def set_targets(state: dict, targets: list) -> None:
    if not isinstance(targets, list):
        raise TransitionError(f"targets は配列でない: {targets!r}")
    normalized, seen = [], set()
    for target in targets:
        if isinstance(target, str):
            target_id, category = target, None
        elif isinstance(target, dict):
            target_id, category = target.get("target_id"), target.get("category")
        else:
            raise TransitionError(f"target は str か object でない: {target!r}")
        if not target_id:
            raise TransitionError(f"target に target_id が必須: {target!r}")
        if target_id in seen:
            raise TransitionError(f"target_id が重複: {target_id!r}")
        seen.add(target_id)
        entry = {"target_id": target_id}
        if category:
            entry["category"] = category
        normalized.append(entry)
    state["targets"] = normalized


def apply_turn(state: dict, turn: dict) -> None:
    qa_id = turn.get("qa_id")
    ops = turn.get("ops", [])
    normalized_design_applications: list[dict] | None = None
    if state.get("design_application_contract_version") == DESIGN_APPLICATION_CONTRACT_VERSION:
        confirmed_refs = {
            op.get("qa_ref") or qa_id
            for op in ops
            if isinstance(op, dict) and op.get("action") == "confirm"
        }
        for qa_ref in confirmed_refs:
            if not qa_ref:
                continue
            if qa_ref == qa_id and not has_entry(state["qa_log"], qa_ref):
                normalized_design_applications = normalize_design_applications(
                    turn.get("design_applications")
                )
                continue
            existing = next(
                (entry for entry in state["qa_log"] if entry.get("id") == qa_ref),
                None,
            )
            if existing is None:
                raise TransitionError(
                    f"schema 1.1 の confirm は qa_log entry を参照する必要がある: {qa_ref}"
                )
            normalize_design_applications(existing.get("design_applications"))
    if qa_id and not has_entry(state["qa_log"], qa_id):
        entry = {"id": qa_id, "question": turn.get("question", ""), "answer": turn.get("answer", "")}
        if "source" in turn:
            # 主経路の chunk/apply がここで逐語コピーしていたため、set-qa-source では拒否される
            # 形状が新規 entry には素通りしていた。特に危険なのが path/section/sha256 を持たない
            # {"kind": "written-requirements"} で、「書面を典拠に索引した」と主張しながら原文
            # ハッシュを一切持たない entry が決定論ゲート緑のまま残せた (validate-coverage-matrix
            # もこの形状は捕まえない)。後付け経路より主経路が緩いのは逆であり、writer / validator /
            # schema の 3 者を同じ契約で揃える。
            entry["source"] = normalize_qa_source(turn["source"], entry["answer"])
        if normalized_design_applications is not None:
            entry["design_applications"] = normalized_design_applications
        elif "design_applications" in turn:
            entry["design_applications"] = normalize_design_applications(turn["design_applications"])
        state["qa_log"].append(entry)
    approval_id = turn.get("approval_id")
    if approval_id and not has_entry(state["approval_log"], approval_id):
        state["approval_log"].append({"id": approval_id, "note": turn.get("approval_note", "")})
    for raw_op in ops:
        op = dict(raw_op)
        if op.get("action") == "confirm" and not op.get("qa_ref") and qa_id:
            op["qa_ref"] = qa_id
        if op.get("action") == "exclude" and not op.get("reason") and not op.get("approval_ref") and approval_id:
            op["approval_ref"] = approval_id
        # confirm と同 turn で承認を得た場合、その turn の approval_id を確定セルへ紐づける。
        # turn 境界は state に永続化されないため (LS-04)、この場でしか対応を残せない。
        if op.get("action") == "set-approval" and not op.get("approval_ref") and approval_id:
            op["approval_ref"] = approval_id
        apply_cell_op(state, op)
    recompute_aggregates(state)
    _refresh_hearing_progress(state)


def next_unresolved_question(state: dict) -> str | None:
    labels = {category["id"]: category["label"] for category in state["categories"]}
    for category in state["categories"]:
        for platform in CANONICAL_PLATFORMS:
            cell = state["matrix"][category["id"]].get(platform)
            if cell and cell.get("state") == "未収集":
                return f"{labels.get(category['id'], category['id'])}（{category['id']}）× {PLATFORM_LABELS.get(platform, platform)}（{platform}）は対象ですか? 対象なら要件を、非対象なら理由を教えてください。"
    return None


def run_chunk(
    state: dict,
    turns: list[dict],
    max_loops: int = 5,
    require_all: bool = False,
) -> int:
    """turn 列を 1 invocation ぶん (最大 max_loops turn) 適用する。

    max_loops を超える turn は適用されない。これは per-invocation chunk limit という
    仕様どおりの挙動だが、以前は超過分を戻り値以外のどこにも現さず黙って捨てていた。
    ``hearing_progress.complete`` は「未収集セルが 0」を意味するだけで turn を消化した
    証跡にはならないため、既存ゲートでは取りこぼしを検出できず、実際に 9 turn 投入で
    5 turn しか適用されていない事故が起きた。未消化があれば必ず stderr へ出し、
    ``require_all=True`` では TransitionError で停止する (fail-closed)。
    """
    processed = 0
    state["hearing_progress"]["loop_count"] = 0
    for turn in turns:
        if processed >= max_loops:
            break
        apply_turn(state, turn)
        processed += 1
        state["hearing_progress"]["loop_count"] = processed
    recompute_aggregates(state)
    _refresh_hearing_progress(state)
    state["hearing_progress"]["max_loops"] = max_loops

    unprocessed = len(turns) - processed
    if unprocessed > 0:
        message = (
            f"chunk: 投入 {len(turns)} turn のうち {processed} turn を適用し、"
            f"{unprocessed} turn が未消化のまま残った (max_loops={max_loops})。"
            f"未消化分は次の chunk 呼出しへ切り出して再投入すること。"
        )
        if require_all:
            raise TransitionError(message)
        print(f"WARNING: {message}", file=sys.stderr)
    return processed
