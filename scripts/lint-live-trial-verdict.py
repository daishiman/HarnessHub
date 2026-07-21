#!/usr/bin/env python3
"""live-trial 実走 acceptance 証拠 (verdict.json) を機械検査する (offline, tmux/LLM 不実行)。

役割境界 (D9: lint-content-review 同型の最終強制層):
  - 機械層: eval-log/<plugin>/<skill>/live-trial/<run-id>/verdict.json (最新 run-id) の
            schema 適合 / skill_dir_tree_sha 再計算突合 / overall.verdict=PASS /
            tier 降格・denylist 被験体の除外 を検査
  - 実走層 (本 lint の対象外): trial 実行はローカル claude + tmux で run-skill-live-trial
            を起動して行う (リモート CI での LLM/tmux 実行は D14 で却下済み)

検証実装は run-skill-live-trial 同梱の validate_schema / skill_dir_tree_sha を
importlib で再利用する (SSOT: 生成側と検査側の実装乖離を排除)。

D13 パイロットゲート: verdict **不在** は FAIL にしない (record-only WARN + 件数出力)。
--enforce (P3 常設化 go/no-go で昇格するまで既定 OFF) 指定時のみ不在も FAIL。
verdict が **存在する** 場合の stale-sha / schema 不適合 / FAIL verdict / downgrade は
パイロット中も exit 1 (存在する証拠の偽装・陳腐化は soft にしない)。

Usage:
  python3 scripts/lint-live-trial-verdict.py --all [--enforce]
  python3 scripts/lint-live-trial-verdict.py --plugin harness-creator [--enforce]
  python3 scripts/lint-live-trial-verdict.py --self-test
"""
import argparse
import hashlib
import importlib.util
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PLUGINS_DIR = ROOT / "plugins"
EVAL_LOG = ROOT / "eval-log"
# harness 正本の所在は PLUGINS_DIR と独立に固定する (テストが PLUGINS_DIR を
# tmp へ差し替えても SSOT 実装のロード元は実 repo のまま)
HARNESS_SKILL_DIR = (
    Path(__file__).resolve().parent.parent
    / "plugins" / "harness-creator" / "skills" / "run-skill-live-trial"
)

sys.path.insert(0, str(ROOT / "scripts"))
import feedback_contract_ssot as FC  # noqa: E402


def _load_module(path: Path):
    spec = importlib.util.spec_from_file_location(path.stem.replace("-", "_"), path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def load_harness():
    """(verdict_mod, backend_mod, schema_dict) — 生成側実装の再利用が SSOT。"""
    verdict_mod = _load_module(HARNESS_SKILL_DIR / "scripts" / "live-trial-verdict.py")
    backend_mod = _load_module(HARNESS_SKILL_DIR / "scripts" / "live-trial-backend.py")
    schema = json.loads(
        (HARNESS_SKILL_DIR / "schemas" / "live-trial-verdict.schema.json").read_text(encoding="utf-8")
    )
    return verdict_mod, backend_mod, schema


def _all_skills(plugin_filter=None):
    skills = set()
    if not PLUGINS_DIR.exists():
        return skills
    for plugin_dir in PLUGINS_DIR.iterdir():
        if not plugin_dir.is_dir():
            continue
        if plugin_filter and plugin_dir.name != plugin_filter:
            continue
        sk_dir = plugin_dir / "skills"
        if not sk_dir.is_dir():
            continue
        for s in sk_dir.iterdir():
            if s.is_symlink():
                continue
            if (s / "SKILL.md").is_file():
                skills.add((plugin_dir.name, s.name))
    return skills


def _declares_live_trial(plugin, skill):
    """frontmatter feedback_contract の criteria に verify_by: live-trial があるか。"""
    md = PLUGINS_DIR / plugin / "skills" / skill / "SKILL.md"
    try:
        fc = FC.extract_frontmatter_feedback_contract(md.read_text(encoding="utf-8"))
    except OSError:
        return False
    criteria = fc.get("criteria") if isinstance(fc, dict) else None
    if not isinstance(criteria, list):
        return False
    return any(
        isinstance(c, dict) and c.get("verify_by") == "live-trial" for c in criteria
    )


def latest_verdict_path(plugin, skill):
    """最新 run-id (辞書順最大) の verdict.json。無ければ None。"""
    base = EVAL_LOG / plugin / skill / "live-trial"
    if not base.is_dir():
        return None
    candidates = sorted(
        (d for d in base.iterdir() if d.is_dir() and (d / "verdict.json").is_file()),
        key=lambda d: d.name,
    )
    return (candidates[-1] / "verdict.json") if candidates else None


def check_verdict(path, plugin, skill, verdict_mod, backend_mod, schema):
    """verdict 1 件の違反リストを返す (空 = 合格)。"""
    errs = []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return [f"invalid-json: {exc}"]
    schema_errs = verdict_mod.validate_schema(data, schema)
    if schema_errs:
        return [f"schema: {e}" for e in schema_errs]

    target = str(data.get("target_skill", ""))
    if target.rsplit(":", 1)[-1] != skill:
        errs.append(f"target-mismatch: target_skill={target!r} が置き場所 {plugin}/{skill} と不一致")
    if backend_mod.deny_target_skill(target):
        errs.append(
            f"denylist-subject: {target} は再帰遮断対象 — この証拠は存在してはならない "
            f"({sorted(backend_mod.DENY_TARGET_SKILLS)})"
        )

    skill_dir = PLUGINS_DIR / plugin / "skills" / skill
    if (skill_dir / "SKILL.md").is_file():
        current_sha = verdict_mod.skill_dir_tree_sha(skill_dir)
        if data.get("skill_dir_tree_sha") != current_sha:
            errs.append(
                f"stale-sha: 記録 {data.get('skill_dir_tree_sha')} != 現在 {current_sha} "
                "(被験 skill の挙動面が verdict 後に変更された — 再 trial 要)"
            )

    # transcript 束縛: 記録された digest を同じ run の transcript 実体と突合する。
    # これが無いと transcript_sha256 も併せて書き換えるだけで provenance 検査を
    # 迂回できてしまう (digest 単独書き換えの検出が transcript の不変を根拠にするため)。
    recorded_transcript = data.get("transcript_sha256")
    transcript = path.parent / "transcript.jsonl"
    if recorded_transcript is not None and transcript.is_file():
        actual = hashlib.sha256(transcript.read_bytes()).hexdigest()
        if actual != recorded_transcript:
            errs.append(
                f"transcript-mismatch: 記録 {str(recorded_transcript)[:12]} != 実体 {actual[:12]} "
                "(verdict が指す会話ログが差し替わっている — 証拠として無効)"
            )

    # 降格除外: tier が live 未満 or downgrade_reason 有りは PASS 扱い禁止 (D13)
    if data.get("tier") != "live" or data.get("downgrade_reason") is not None:
        errs.append(
            f"downgraded: tier={data.get('tier')} reason={data.get('downgrade_reason')!r} "
            "— live 受け入れ証拠として無効 → human_review で降格理由の妥当性を人間判断すること"
        )
    v = (data.get("overall") or {}).get("verdict")
    if v != "PASS":
        errs.append(f"verdict={v} (PASS のみ受理。DEGRADED/FAIL/BLOCKED は再 trial 要)")
    return errs


def _git(*args, repo_root=None):
    return subprocess.run(
        ["git", *args], cwd=str(repo_root or ROOT), capture_output=True, text=True
    )


def _is_verdict_path(rel):
    parts = Path(rel).parts
    return (
        len(parts) >= 5
        and parts[0] == "eval-log"
        and "live-trial" in parts
        and parts[-1] == "verdict.json"
    )


def _has_rerun_evidence(rel, old_doc, new_doc, base_ref, root, repo_root=None):
    """digest 更新に「実際に走らせた」痕跡が伴うかを判定する (True = 正当な再 trial)。

    本検査は path 同一性を鍵に履歴を突き合わせるため、この述語を「変化したか」で書くと
    削除も変化として通ってしまう。transcript.jsonl を消して transcript_sha256 を null に
    するだけで遮断を迂回できた (2026-07-21 実測)。肯定形の実体確認で書くこと。

    利用できる材料:
      - rel: verdict.json の repo 相対 path (str)
      - old_doc / new_doc: base_ref 時点と現在の verdict.json (dict)
      - transcript_rel: 同じ run の transcript.jsonl の repo 相対 path
      - _git("diff", "--name-only", base_ref, "--", transcript_rel, repo_root=repo_root)
        → .stdout が非空なら transcript が base_ref から変化 (追加/変更/削除のいずれか)
      - (root / transcript_rel).is_file() → 現ツリーに transcript が現存するか
    """
    transcript_rel = (Path(rel).parent / "transcript.jsonl").as_posix()
    moved = _git("diff", "--name-only", base_ref, "--", transcript_rel, repo_root=repo_root)
    transcript_exists = (root / transcript_rel).is_file()
    old_sha, new_sha = old_doc.get("transcript_sha256"), new_doc.get("transcript_sha256")

    # 証拠 1: transcript 実体が現ツリーに存在し、かつ base_ref から変化している。
    # 削除も `moved` には現れるため、現存確認 (transcript_exists) を必ず伴わせる。
    if transcript_exists and moved.stdout.strip():
        return True
    # 証拠 2: 記録 digest が更新されている。ただし新しい値が実在する digest の場合に限る。
    # schema が null 許容 (tui 層のみの run) なので、非 null → null という「変化」で
    # 迂回できないよう new_sha の真偽で足切りする。
    if new_sha and new_sha != old_sha:
        return True
    # 再実行の痕跡が一切無い。transcript を持たない run の digest 更新もここに落ちる
    # (証拠が無い以上、正当性を主張できない — fail-closed)。
    return False


def check_digest_provenance(base_ref, repo_root=None):
    """digest 単独書き換え (再 trial せずに緑化した証跡) を git 差分から検出する。

    verdict.json の skill_dir_tree_sha が base_ref から変化しているのに、同じ run
    ディレクトリの transcript.jsonl も transcript_sha256 も変化していない差分は、
    「実走せずに記録を現在の closure へ合わせた」ことを意味する。

    この経路だけは履歴を見ないと検出できない: 書き換え後は digest が現在値と一致する
    ため、check_verdict の stale-sha も pytest の closure 突合も緑になり、さらに
    plan-live-trials が action=reuse (current-pass) と判定して再 trial を計画しなくなる。
    証拠の失効が「検証済み」に化けるため、失効そのものより検出が難しい。

    本検査は path 同一性を鍵にするため、path を動かす迂回 (run ディレクトリ改名・証跡の
    削除) も塞ぐ: base_ref に存在した verdict.json が現ツリーから消えていれば
    evidence-removed として報告する。証跡は実運用上 append-only であり (2026-07-21 時点で
    履歴上の消失は 0 件)、消失そのものが人手確認に値する事象である。

    returns: (violations, inspected)
    """
    probe = _git("rev-parse", "--verify", f"{base_ref}^{{commit}}", repo_root=repo_root)
    if probe.returncode != 0:
        return [f"base-ref-unresolvable: {base_ref}"], 0
    diff = _git("diff", "--name-only", base_ref, "--", "eval-log", repo_root=repo_root)
    if diff.returncode != 0:
        return [f"git-diff-failed: {diff.stderr.strip()}"], 0

    root = Path(repo_root or ROOT)
    violations, inspected = [], 0
    for rel in (line for line in diff.stdout.splitlines() if _is_verdict_path(line)):
        old = _git("show", f"{base_ref}:{rel}", repo_root=repo_root)
        current = root / rel
        # 新規 run の追加は比較対象が無いので対象外
        if old.returncode != 0:
            continue
        # 既存証跡の消失 (削除・run ディレクトリ改名) は履歴束縛を外す迂回になるため違反
        if not current.is_file():
            violations.append(
                f"{rel}: evidence-removed: base_ref に存在した live-trial 証跡が現ツリーに無い "
                "(削除または run ディレクトリ改名 — digest 書き換えの履歴束縛を外す経路)"
            )
            continue
        try:
            old_doc = json.loads(old.stdout)
            new_doc = json.loads(current.read_text(encoding="utf-8"))
        except Exception as exc:
            violations.append(f"{rel}: invalid-json: {exc}")
            continue
        inspected += 1
        old_sha, new_sha = old_doc.get("skill_dir_tree_sha"), new_doc.get("skill_dir_tree_sha")
        if old_sha == new_sha:
            continue
        if _has_rerun_evidence(rel, old_doc, new_doc, base_ref, root, repo_root=repo_root):
            continue
        violations.append(
            f"{rel}: digest-only-rewrite: skill_dir_tree_sha を {str(old_sha)[:12]} → "
            f"{str(new_sha)[:12]} へ更新したが transcript が変わっていない "
            "(実走せずに現在の closure へ合わせた証跡)"
        )
    return violations, inspected


def run_provenance(base_ref):
    violations, inspected = check_digest_provenance(base_ref)
    if violations:
        print(f"[FAIL] digest provenance: {len(violations)} violation(s) since {base_ref}")
        for v in violations:
            print(f"  - {v}")
        print()
        print("Fix: digest を書き戻し、run-skill-live-trial で対象 skill を実走させて")
        print("     新しい run-id の verdict.json + transcript.jsonl を取得してください。")
        print("     closure が変わった skill は再 trial するまで未検証として扱います。")
        print("     evidence-removed は既存 run を消さずに新しい run-id を追加してください")
        print("     (証跡は append-only。消した証跡は履歴突合の対象から外れます)。")
        return 1
    print(f"[OK] digest provenance: {inspected} verdict(s) inspected since {base_ref}")
    return 0


def run_lint(plugin_filter=None, enforce=False):
    verdict_mod, backend_mod, schema = load_harness()
    skills = sorted(_all_skills(plugin_filter))

    violations = []  # 存在する verdict の違反 (常に exit 1)
    missing = []  # verdict 不在 (D13 パイロットゲート: record-only WARN、--enforce で FAIL)
    checked = 0
    for plugin, skill in skills:
        required = (
            _declares_live_trial(plugin, skill)
            and not backend_mod.deny_target_skill(skill)
        )
        latest = latest_verdict_path(plugin, skill)
        if latest is None:
            if required:
                missing.append(
                    f"{plugin}/{skill}: feedback_contract が verify_by: live-trial を宣言するが"
                    " eval-log/<plugin>/<skill>/live-trial/<run-id>/verdict.json が無い"
                )
            continue
        checked += 1
        for err in check_verdict(latest, plugin, skill, verdict_mod, backend_mod, schema):
            violations.append(f"{plugin}/{skill}: {latest.parent.name}/verdict.json {err}")

    if missing:
        level = "FAIL" if enforce else "WARN"
        print(f"[{level}] live-trial verdict 不在: {len(missing)} skill(s)"
              + ("" if enforce else " (D13 パイロットゲート中 record-only。P3 常設化で --enforce に昇格)"))
        for m in missing:
            print(f"  - {m}")
    if violations:
        print(f"[FAIL] live-trial verdict lint: {len(violations)} violation(s)")
        for v in violations:
            print(f"  - {v}")
        print()
        print("Fix: ローカル Claude Code で run-skill-live-trial を対象 skill に対し実行し")
        print("     eval-log/<plugin>/<skill>/live-trial/<run-id>/verdict.json を保存してください。")
        return 1
    if enforce and missing:
        return 1
    print(f"[OK] live-trial verdict lint: {checked} verdict(s) verified, {len(missing)} missing (record-only)")
    return 0


def self_test():
    """合成 fixture で 正 (合格) / 負 (各違反) / 不在 の検出を自己検査する。"""
    global PLUGINS_DIR, EVAL_LOG
    verdict_mod, backend_mod, schema = load_harness()
    orig = (PLUGINS_DIR, EVAL_LOG)
    failures = []
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        PLUGINS_DIR = root / "plugins"
        EVAL_LOG = root / "eval-log"
        skill_dir = PLUGINS_DIR / "demo-plugin" / "skills" / "run-demo"
        (skill_dir / "scripts").mkdir(parents=True)
        (skill_dir / "SKILL.md").write_text("---\nname: run-demo\n---\nbody\n", encoding="utf-8")
        (skill_dir / "scripts" / "x.py").write_text("print('x')\n", encoding="utf-8")

        doc = {
            "target_skill": "demo-plugin:run-demo",
            "args": "",
            "requested_model": "",
            "actual_model": ["claude-sonnet-5"],
            "nudge_count": 0,
            "gate_response_count": 0,
            "goal_verdict": {"result": "PASS", "blockers": []},
            "overall": {"launch": "PASS", "completion": "PASS", "goal_fit": "PASS", "verdict": "PASS"},
            "skill_dir_tree_sha": verdict_mod.skill_dir_tree_sha(skill_dir),
            "transcript_sha256": None,
            "scenario_origin": "synthetic",
            "environment": {
                "claude_version": "2.0.0",
                "tmux": True,
                "transcript_layer": "jsonl",
                "permissions_mode": "bypassPermissions",
            },
            "tier": "live",
            "downgrade_reason": None,
            "timeline": {"boot_s": 3.0, "poll_exit": "DONE", "wall_clock_s": 60.0},
        }
        vpath = EVAL_LOG / "demo-plugin" / "run-demo" / "live-trial" / "20260702T000000" / "verdict.json"
        vpath.parent.mkdir(parents=True)

        def write(d):
            vpath.write_text(json.dumps(d, ensure_ascii=False), encoding="utf-8")

        def expect(name, mutate, needle):
            d = json.loads(json.dumps(doc))
            mutate(d)
            write(d)
            errs = check_verdict(vpath, "demo-plugin", "run-demo", verdict_mod, backend_mod, schema)
            hit = (not errs) if needle is None else any(needle in e for e in errs)
            if not hit:
                failures.append(f"{name}: expected {needle!r}, got {errs}")

        expect("valid-pass", lambda d: None, None)
        expect("non-pass", lambda d: d["overall"].__setitem__("verdict", "DEGRADED"), "verdict=DEGRADED")
        expect("stale-sha", lambda d: d.__setitem__("skill_dir_tree_sha", "0" * 64), "stale-sha")
        expect("downgraded", lambda d: (d.__setitem__("tier", "fork"),
                                        d.__setitem__("downgrade_reason", "tmux 不在")), "downgraded")
        expect("extra-key", lambda d: d.__setitem__("score", 95), "schema")
        expect("deny-subject", lambda d: d.__setitem__("target_skill", "x:run-skill-iter-improve"),
               "denylist-subject")
        vpath.write_text("{broken", encoding="utf-8")
        errs = check_verdict(vpath, "demo-plugin", "run-demo", verdict_mod, backend_mod, schema)
        if not any("invalid-json" in e for e in errs):
            failures.append(f"invalid-json: got {errs}")
        if latest_verdict_path("demo-plugin", "no-such-skill") is not None:
            failures.append("missing: 不在 skill で verdict が返った")

    PLUGINS_DIR, EVAL_LOG = orig
    if failures:
        print(f"[FAIL] self-test: {len(failures)} failure(s)")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("[OK] self-test: 8 case(s) passed")
    return 0


def main():
    ap = argparse.ArgumentParser(description="live-trial verdict の機械検査 (D9/D13)")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--all", action="store_true", help="全 plugin を走査")
    g.add_argument("--plugin", help="対象 plugin を限定")
    g.add_argument("--self-test", action="store_true", help="合成 fixture で自己検査")
    g.add_argument("--check-provenance", metavar="BASE_REF",
                   help="BASE_REF からの差分で digest 単独書き換え (再 trial なしの緑化) を検出")
    ap.add_argument("--enforce", action="store_true",
                    help="違反を FAIL (exit 1) にする。既定は D13 record-only WARN")
    args = ap.parse_args()

    if args.self_test:
        return self_test()
    if args.check_provenance:
        return run_provenance(args.check_provenance)
    return run_lint(plugin_filter=args.plugin, enforce=args.enforce)


if __name__ == "__main__":
    sys.exit(main())
