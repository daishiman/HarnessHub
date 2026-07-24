#!/usr/bin/env python3
# /// script
# name: provenance_helper
# purpose: digest 単独書き換え (再 trial せずに緑化した live-trial 証跡) を git 差分から検出する。
# inputs: []  (import 専用モジュール。CLI なし。呼び口は lint-live-trial-verdict.py --check-provenance)
# outputs: []  (違反文字列の list / exit code を返すのみ。ファイル書込みなし)
# requires-python = ">=3.10"
# dependencies: []
# contexts: [C, E]
# network: false
# write-scope: none
# ///
"""digest 単独書き換え (再 trial せずに緑化した live-trial 証跡) を git 差分から検出する。

lint-live-trial-verdict.py から責務分離した helper (§4.3/§4.4 例外: Python import 上
underscore 必須の共有 module)。verdict.json の skill_dir_tree_sha が base_ref から変化
しているのに transcript が変わっていない差分 = 実走せずに記録を現在の closure へ合わせた
証跡を、commit 履歴の突合で検出する (HarnessHub-dst の provenance 経路)。

呼び口は lint-live-trial-verdict.py:main が --check-provenance で run_provenance を呼ぶ。
検査本体 check_digest_provenance と補助述語は本 module に閉じる (ROOT/subprocess 依存)。
"""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


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


def _provenance_base(base_ref, repo_root=None):
    """provenance 差分の実効基準を HEAD と base_ref の分岐点 (merge-base) にする。

    base_ref (例: origin/main) を直接 diff 基準にすると、作業ブランチが base_ref より
    遅れているとき base_ref 側で後から追加された証跡まで「現ツリーから消えた」と
    誤判定される (evidence-removed 偽陽性 = HarnessHub-ys3)。分岐点を基準にすれば
    検査対象は「本ブランチが分岐後に加えた変更」だけに限定され、base_ref の後追い
    追加は差分に現れない。真の証跡削除 (分岐点→HEAD で消えた run) は引き続き検出できる。

    CI の push-to-main では HEAD==base_ref のため merge-base==base_ref となり従来と同一
    (無回帰)。

    利用できる材料:
      - _git("merge-base", "HEAD", base_ref, repo_root=repo_root)
        → returncode==0 なら .stdout.strip() が分岐点コミットの sha
      - base_ref: 呼び出し元で rev-parse 済み (解決可能であることは保証済み)

    returns: diff の基準にする ref 文字列。

    フォールバック: merge-base が引けない場合 (無関係履歴・shallow clone・HEAD 不在) は
    fail-closed の原則に従い厳格側の base_ref を返す。偽陽性は人手調査で回復できるが、
    真の証跡削除の見逃しは不可逆なので「見逃さない側」へ倒す。
    """
    mb = _git("merge-base", "HEAD", base_ref, repo_root=repo_root)
    if mb.returncode == 0 and mb.stdout.strip():
        return mb.stdout.strip()
    return base_ref


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
    # base_ref (origin/main) を直接基準にすると、作業ブランチが base_ref より遅れている
    # とき base_ref 側で後から追加された証跡まで「現ツリーから消えた」と誤判定する
    # (evidence-removed 偽陽性 = ys3)。HEAD と base_ref の分岐点を実効基準にする。
    base = _provenance_base(base_ref, repo_root=repo_root)
    diff = _git("diff", "--name-only", base, "--", "eval-log", repo_root=repo_root)
    if diff.returncode != 0:
        return [f"git-diff-failed: {diff.stderr.strip()}"], 0

    root = Path(repo_root or ROOT)
    violations, inspected = [], 0
    for rel in (line for line in diff.stdout.splitlines() if _is_verdict_path(line)):
        old = _git("show", f"{base}:{rel}", repo_root=repo_root)
        current = root / rel
        # 新規 run の追加は比較対象が無いので対象外
        if old.returncode != 0:
            continue
        # 既存証跡の消失 (削除・run ディレクトリ改名) は履歴束縛を外す迂回になるため違反
        if not current.is_file():
            violations.append(
                f"{rel}: evidence-removed: 分岐点 (merge-base) に存在した live-trial 証跡が現ツリーに無い "
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
        if _has_rerun_evidence(rel, old_doc, new_doc, base, root, repo_root=repo_root):
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
