#!/usr/bin/env python3
"""feedback_protocol SSOT 整合 lint (オフライン、NOTION_TOKEN 不要)。

検証:
  R1. skill-list.schema.json#feedback_protocol が必須キーと同定フロー構造を満たす
  R2. page_body_sections に id=feedback (renderer_ref=feedback_protocol) が含まれる
  R3. run-skill-feedback/SKILL.md が schema を SSOT として参照し、protocol hash・同定手順・対話項目が同期している
  R4. run-skill-feedback/SKILL.md の triggers が firing_conditions を包含する近似 (各 firing_condition の主要キーワードが triggers のいずれかに含まれる)
  R5. notion-upsert-plugin.py が _load_feedback_protocol() を経由している
  R6. 量産プラグイン (plugins/*/plugin.json 保持) の README/plugin.json/commands/agents に run-skill-feedback 発火経路が周知されている
      (default warn / --strict で exit 1)
  R7. 量産プラグイン (生成器自身=feedback_contract_ssot.is_feedback_deploy_exempt で除外) の skills/run-skill-feedback/ が symlink/実体で配備されている
      (default warn / --strict で exit 1)

Usage:
  python3 scripts/lint-feedback-protocol.py [--strict]
"""
import argparse, hashlib, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# dogfooding 除外境界は SSOT (FC.is_feedback_deploy_exempt) が単一正本。
sys.path.insert(0, str(ROOT / "scripts"))
import feedback_contract_ssot as FC  # noqa: E402
SCHEMA = ROOT / "doc" / "notion-schema" / "skill-list.schema.json"
SKILL_MD = ROOT / "plugins" / "harness-creator" / "skills" / "run-skill-feedback" / "SKILL.md"
COMMAND_PROMPT = ROOT / "plugins" / "harness-creator" / "references" / "command-usage-prompts" / "run-skill-feedback.md"
UPSERT = ROOT / "scripts" / "notion-upsert-plugin.py"


PLUGINS_DIR = ROOT / "plugins"
FEEDBACK_KEYWORD = "run-skill-feedback"
IDENTIFICATION_ACTIONS = [
    "open_question",
    "scan_skills",
    "match_and_confirm",
    "read_spec",
]
IDENTIFICATION_HEADINGS = [
    "Step 1 — 目的を聞く",
    "Step 2 — 全スキルを収集してマッチング",
    "Step 3 — 候補を提示して確認",
    "Step 4 — 対象スキルの現状仕様を提示",
]


def _protocol_hash(protocol):
    canonical = json.dumps(
        protocol,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode()).hexdigest()


def _target_plugins():
    """検査対象 plugin (manifest を持ち、生成器自身=配備除外プラグインは除外)。

    除外境界は SSOT 述語 (FC.is_feedback_deploy_exempt) に委譲する。
    """
    if not PLUGINS_DIR.exists():
        return []
    out = []
    for plugin_dir in sorted(PLUGINS_DIR.iterdir()):
        if not plugin_dir.is_dir():
            continue
        if FC.is_feedback_deploy_exempt(plugin_dir.name):
            continue
        manifests = [
            plugin_dir / ".claude-plugin" / "plugin.json",
            plugin_dir / "plugin.json",
            plugin_dir / "plugin-composition.yaml",
        ]
        if not any(p.exists() for p in manifests):
            continue
        out.append(plugin_dir)
    return out


def check_plugin_awareness():
    """R6: 量産プラグイン側に発火経路 (run-skill-feedback) の周知文言があるか。

    haystack: manifest (plugin.json / .claude-plugin/plugin.json / plugin-composition.yaml)
              + README.md + commands/*.md + agents/*.md
    """
    warnings = []
    for plugin_dir in _target_plugins():
        haystack = ""
        candidates = [
            plugin_dir / ".claude-plugin" / "plugin.json",
            plugin_dir / "plugin.json",
            plugin_dir / "plugin-composition.yaml",
            plugin_dir / "README.md",
        ]
        for sub in ("commands", "agents"):
            d = plugin_dir / sub
            if d.is_dir():
                candidates.extend(sorted(d.glob("*.md")))
        for p in candidates:
            if p.exists():
                try:
                    haystack += p.read_text()
                except Exception:
                    pass
        if FEEDBACK_KEYWORD not in haystack:
            warnings.append(f"R6: {plugin_dir.name} に '{FEEDBACK_KEYWORD}' 発火経路の周知記載が無い (manifest/README/commands/agents)")
    return warnings


def check_plugin_deployment():
    """R7: 量産プラグインに skills/run-skill-feedback/ が symlink/実体で配備されているか。"""
    warnings = []
    for plugin_dir in _target_plugins():
        target = plugin_dir / "skills" / "run-skill-feedback"
        # symlink でも実体でも存在すれば OK (broken symlink は exists() が False)
        if not (target.exists() or target.is_symlink()):
            warnings.append(f"R7: {plugin_dir.name} に skills/run-skill-feedback/ 配備なし")
            continue
        if target.is_symlink() and not target.exists():
            warnings.append(f"R7: {plugin_dir.name}/skills/run-skill-feedback/ が broken symlink")
    return warnings


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--strict", action="store_true", help="R6/R7 を fail (exit 1) として扱う")
    args = ap.parse_args()
    violations = []
    sc = json.loads(SCHEMA.read_text())

    # R1
    fp = sc.get("feedback_protocol")
    required = {"command", "firing_conditions", "intake_fields", "status_lifecycle",
                "open_statuses", "promise_to_reporter", "callout_summary",
                "identification_step"}
    if not fp:
        violations.append("R1: skill-list.schema.json に feedback_protocol が無い")
    else:
        missing = required - set(fp.keys())
        if missing:
            violations.append(f"R1: feedback_protocol に必須キー欠落: {sorted(missing)}")
        identification = fp.get("identification_step") or {}
        actions = [step.get("action") for step in identification.get("steps", [])]
        if actions != IDENTIFICATION_ACTIONS:
            violations.append(
                f"R1: identification_step actions 不一致: {actions} "
                f"(expected {IDENTIFICATION_ACTIONS})"
            )
        fallback = str(identification.get("fallback") or "")
        if "投入を中断" not in fallback or "plugin='不明'" in fallback:
            violations.append("R1: identification_step fallback が未同定時の fail-closed 中断を定義していない")
        intake_names = [field.get("name") for field in fp.get("intake_fields", [])]
        if not intake_names or any(not name for name in intake_names):
            violations.append("R1: intake_fields が空、または name 欠落")

    # R2
    sections = sc.get("page_body_sections", [])
    fb_sec = next((s for s in sections if s.get("id") == "feedback"), None)
    if not fb_sec:
        violations.append("R2: page_body_sections に id=feedback が無い")
    elif fb_sec.get("renderer_ref") != "feedback_protocol":
        violations.append("R2: feedback section の renderer_ref が feedback_protocol を指していない")

    # R3
    md = SKILL_MD.read_text() if SKILL_MD.exists() else ""
    if "feedback_protocol" not in md or "skill-list.schema.json" not in md:
        violations.append("R3: run-skill-feedback/SKILL.md が schema feedback_protocol を参照していない")
    if fp:
        marker = re.search(r"feedback_protocol_sha256:\s*([0-9a-f]{64})", md)
        expected_hash = _protocol_hash(fp)
        if not marker or marker.group(1) != expected_hash:
            actual = marker.group(1) if marker else "missing"
            violations.append(
                f"R3: feedback_protocol hash 不一致: {actual} "
                f"(expected {expected_hash})"
            )
        missing_headings = [heading for heading in IDENTIFICATION_HEADINGS if heading not in md]
        if missing_headings:
            violations.append(f"R3: SKILL.md 同定手順欠落: {missing_headings}")
        intake_names = [field.get("name") for field in fp.get("intake_fields", [])]
        missing_fields = [name for name in intake_names if name and name not in md]
        if missing_fields:
            violations.append(f"R3: SKILL.md 対話項目欠落: {missing_fields}")
        prompt = COMMAND_PROMPT.read_text() if COMMAND_PROMPT.exists() else ""
        prompt_marker = re.search(r"feedback_protocol_sha256:\s*([0-9a-f]{64})", prompt)
        if not prompt_marker or prompt_marker.group(1) != expected_hash:
            actual = prompt_marker.group(1) if prompt_marker else "missing"
            violations.append(
                f"R3: command usage prompt protocol hash 不一致: {actual} "
                f"(expected {expected_hash})"
            )
        required_names = [
            field.get("name")
            for field in fp.get("intake_fields", [])
            if field.get("required") is True
        ]
        optional_names = [
            field.get("name")
            for field in fp.get("intake_fields", [])
            if field.get("required") is not True
        ]
        required_projection = "|".join(name for name in required_names if name)
        optional_projection = "|".join(name for name in optional_names if name)
        if f"required_intake_fields: {required_projection}" not in md:
            violations.append("R3: SKILL.md の required intake field 投影が schema と不一致")
        if f"optional_intake_fields: {optional_projection}" not in md:
            violations.append("R3: SKILL.md の optional intake field 投影が schema と不一致")
        if f"required_intake_fields: {required_projection}" not in prompt:
            violations.append("R3: command usage prompt の required intake field 投影が schema と不一致")
        if f"optional_intake_fields: {optional_projection}" not in prompt:
            violations.append("R3: command usage prompt の optional intake field 投影が schema と不一致")
        forbidden_mandatory_review = (
            "30 種全使用・省略禁止",
            "30 思考法は全種使用必須",
            "30 件全て埋まるまで完了しない",
        )
        mandatory_hits = [token for token in forbidden_mandatory_review if token in prompt]
        if mandatory_hits:
            violations.append(f"R3: command usage prompt が exhaustive review を既定必須化: {mandatory_hits}")

    # R4: firing_conditions の主要語が triggers に存在
    if fp:
        tr_match = re.search(r"^triggers:\s*\n((?:\s+-.*\n)+)", md, re.M)
        triggers_blob = tr_match.group(1) if tr_match else ""
        keywords = ["分かりにくい", "直してほしい", "バグ", "改善", "要望"]
        missing_kw = [k for k in keywords if k not in triggers_blob and k not in md]
        if missing_kw:
            violations.append(f"R4: SKILL.md triggers/本文に発火キーワード欠落: {missing_kw}")

    # R5
    src = UPSERT.read_text() if UPSERT.exists() else ""
    if "_load_feedback_protocol" not in src:
        violations.append("R5: notion-upsert-plugin.py が _load_feedback_protocol() を未使用")

    if violations:
        print(f"[FAIL] feedback_protocol SSOT lint: {len(violations)} violation(s)")
        for v in violations:
            print(f"  - {v}")
        sys.exit(1)

    r6_warnings = check_plugin_awareness()
    r7_warnings = check_plugin_deployment()
    has_warn = bool(r6_warnings or r7_warnings)
    label = "FAIL" if args.strict else "WARN"
    if r6_warnings:
        print(f"[{label}] R6 周知 lint: {len(r6_warnings)} 件")
        for w in r6_warnings:
            print(f"  - {w}")
    if r7_warnings:
        print(f"[{label}] R7 配備 lint: {len(r7_warnings)} 件")
        for w in r7_warnings:
            print(f"  - {w}")
    if has_warn and args.strict:
        sys.exit(1)

    print("[OK] feedback_protocol SSOT lint: all checks passed")


if __name__ == "__main__":
    main()
