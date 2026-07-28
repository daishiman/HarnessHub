#!/usr/bin/env python3
# /// script
# name: validate-primary-source
# version: 0.1.0
# purpose: 監査 sub-agent (C08 doc-freshness-auditor) と C02 が、公式 publisher の一次 API/ドキュメントへ
#          read-only GET を実行するための単一チョークポイント。GET 以外を構造的に表現できない形で外部到達を
#          与え、実行の痕跡を append-only 台帳へ残す (WebFetch 不在・curl 権限拒否の環境でも一次照合を可能にし、
#          WebSearch = 二次索引ラグ由来の「裏取り不能 FAIL」を解消する)。
# inputs:
#   - argv: --url URL | (--npm PKG かつ/または --github OWNER/REPO) [--recorded-version V] [--target-id ID]
#           [--allow-host HOST]... [--timeout SEC] [--ledger PATH] [--max-body-chars N]
#   - env: CLAUDE_PROJECT_DIR (台帳の書込起点。未設定時は cwd)
#          SYSTEM_SPEC_PRIMARY_GET_LEDGER (台帳パスの明示上書き。テスト・live-trial 用)
# outputs:
#   - stdout: 照合結果 JSON ({verdict, routes[], ledger_path, ...})
#   - stderr: 到達不能・policy 違反の理由
#   - file: <project>/eval-log/system-spec-harness/primary-get-ledger.jsonl (1 GET = 1 行の追記)
#   - exit: 0=FRESH (記録が現行と一致) / 1=STALE (乖離を確定) / 2=usage・policy 違反 / 3=INDETERMINATE (到達不能で確定不能)
# contexts: [E, C]
# network: true
# write-scope: workspace
# dependencies: []
# requires-python: ">=3.9"
# ///
"""公式一次ソースへの read-only GET と 2 経路照合 (issue: HarnessHub-nq2)。

## なぜ必要か

C08 (`system-spec-doc-freshness-auditor`) の実行環境では WebFetch が使えない場合があり
('No such tool available')、`curl` は Bash 権限で拒否される。結果として C08 は WebSearch
(検索エンジンの二次索引) だけに依拠し、**索引ラグ**と**真の世代落ち**を区別できなかった。
公開直後の版 (npm の検索 index が未更新) では「現行版を確定できない」まま安全側 FAIL に倒れ、
doc_freshness が構造的に FAIL を反復していた。

本 script は標準ライブラリ (urllib) だけで公式 API へ GET する経路を与える。監査 agent は
`Bash` を既に持つため、追加の権限付与なしに一次照合が可能になる。

## 安全性 (能力を足す以上、mutation を構造的に表現できないようにする)

- HTTP method は GET 固定。POST/PUT/PATCH/DELETE を渡す引数が存在しない。
- scheme は https のみ。
- host は allowlist 制。既定は公式 publisher の一次 API host のみで、それ以外は
  `--allow-host` による明示宣言を要求する (宣言は台帳へ `host_policy=explicit` として残り、
  「どの host を公式と見なして GET したか」が事後監査できる)。
- 名前解決先が loopback/private/link-local の場合は拒否する (SSRF による内部到達の遮断)。
- リダイレクト先も同じ allowlist 検査を通す。
- 認証情報・Cookie は送らない。応答本文は台帳へ保存せず sha256 のみ記録する。

## 監査証跡 (受入条件: 一次 GET を実行した証跡が残る)

監査 agent は `Write` を持たないため自力で痕跡を残せない。台帳の writer を本 script 側に置くことで、
「モデルが書ける層」ではなく「実際に GET が起きた層」に証跡を接地させる (`record-audit-fork.py` が
fork 証跡で採るのと同じ doctrine)。到達不能だった試行も `outcome=unreachable` として記録するため、
「一次照合を試みたが不能だった」と「そもそも試みていない」を事後に区別できる。

## 2 経路照合 (受入条件: npm index 遅延中でも確定判定できる)

- 経路 A = npm registry API (`registry.npmjs.org/<pkg>`) の `dist-tags.latest`。
  検索 index ではなく registry 本体なので公開と同時に反映される。
- 経路 B = GitHub Releases API (`api.github.com/repos/<owner>/<repo>/releases/latest`) の `tag_name`。
  publisher が発行する release 情報そのもの。

いずれも publisher 由来の一次ソースであり、片方の索引ラグに引きずられない。
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path
from urllib.parse import quote

sys.path.insert(0, str(Path(__file__).resolve().parent))
from primary_source_http import (  # noqa: E402
    DEFAULT_ALLOWED_HOSTS,
    EvidenceError,
    PolicyError,
    _norm_host,
    check_url,
    http_get,
    resolve_ledger_path,
)

SCHEMA_VERSION = "1.0"
SCRIPT_NAME = "validate-primary-source"
DEFAULT_TIMEOUT = 20.0

# --url 単発時に stdout へ返す本文の既定上限。監査 SSOT が「公式サイト本文の長文復唱はしない」と
# 定めているため、公式ページ全文 (最大 5MB) を context へ流し込まない。version/last_updated は
# 通常ページ冒頭付近にあるので既定で足り、不足時は呼び出し側が --max-body-chars で広げる。
# 切り詰めても全体の sha256 は原本に対して算出済みなので、証跡の同一性検査には影響しない。
DEFAULT_MAX_BODY_CHARS = 20000

VERDICT_FRESH = "FRESH"
VERDICT_STALE = "STALE"
VERDICT_INDETERMINATE = "INDETERMINATE"

EXIT_BY_VERDICT = {VERDICT_FRESH: 0, VERDICT_STALE: 1, VERDICT_INDETERMINATE: 3}


def _now() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def normalize_version(raw: str | None) -> str | None:
    """`v1.2.3` / `1.2.3` / `react@1.2.3` 等の表記ゆれを比較可能な形へ正規化する。"""
    if not raw:
        return None
    text = str(raw).strip()
    text = text.rsplit("@", 1)[-1] if "@" in text[1:] else text
    match = re.search(r"\d+(?:\.\d+)*(?:[-+][0-9A-Za-z.\-]+)?", text)
    return match.group(0) if match else text.lstrip("vV") or None


def probe_npm(pkg: str, **kw) -> dict:
    """経路 A: npm registry 本体 (検索 index ではない) の dist-tags エンドポイントから latest を取る。

    packument (`registry.npmjs.org/<pkg>`) ではなく dist-tags 専用エンドポイントを使う。
    packument は全 version の metadata を含むため人気 package では数 MB に達し (pnpm は 5MB 超)、
    MAX_BYTES で切り詰められて JSON parse に失敗する — 本 issue が名指しした pnpm でまさに
    経路 A が死ぬ。dist-tags エンドポイントは同じ registry 本体の一次情報を数百バイトで返すため、
    package の人気度に依存せず確定できる。副作用として `time[latest]` (公開日時) は取れないが、
    鮮度判定は version 一致で行い、公開日時は経路 B (GitHub Releases) が持つ。
    """
    url = f"https://registry.npmjs.org/-/package/{quote(pkg, safe='@/')}/dist-tags"
    result = http_get(url, route="npm", **kw)
    if not result.get("ok"):
        return {"route": "npm", "ok": False, "url": url, "error": result.get("error")}
    try:
        data = json.loads(result["body"])
    except json.JSONDecodeError as exc:
        hint = " (応答が MAX_BYTES で切り詰められた)" if result.get("truncated") else ""
        return {"route": "npm", "ok": False, "url": url, "error": f"JSON parse 失敗{hint}: {exc}"}
    latest = data.get("latest")
    return {
        "route": "npm",
        "ok": bool(latest),
        "url": url,
        "latest_version": normalize_version(latest),
        "raw_version": latest,
        "published_at": None,  # dist-tags エンドポイントは公開日時を持たない (経路 B が担う)
        "dist_tags": data,
        "error": None if latest else "dist-tags に latest が存在しない",
    }


def probe_github(repo: str, **kw) -> dict:
    """経路 B: GitHub Releases API から publisher 発行の最新 release tag を取る。"""
    if "/" not in repo:
        raise PolicyError(f"--github は OWNER/REPO 形式で指定する: {repo!r}")
    url = f"https://api.github.com/repos/{repo}/releases/latest"
    result = http_get(url, route="github", **kw)
    if not result.get("ok"):
        return {"route": "github", "ok": False, "url": url, "error": result.get("error")}
    try:
        data = json.loads(result["body"])
    except json.JSONDecodeError as exc:
        hint = " (応答が MAX_BYTES で切り詰められた)" if result.get("truncated") else ""
        return {"route": "github", "ok": False, "url": url, "error": f"JSON parse 失敗{hint}: {exc}"}
    tag = data.get("tag_name")
    return {
        "route": "github",
        "ok": bool(tag),
        "url": url,
        "latest_version": normalize_version(tag),
        "raw_version": tag,
        "published_at": data.get("published_at"),
        "prerelease": bool(data.get("prerelease")),
        "error": None if tag else "tag_name が存在しない",
    }


def decide_freshness(recorded_version: str | None, routes: list[dict]) -> tuple[str, str]:
    """記録値と一次 2 経路の観測から鮮度 verdict を導出する。

    Args:
        recorded_version: `fetched-references.json` の記録値 (未指定なら None)。
        routes: 各経路の観測。成功時 `{route, ok=True, latest_version, published_at, ...}`、
            失敗時 `{route, ok=False, error}`。

    Returns:
        (verdict, reason): verdict は "FRESH" / "STALE" / "INDETERMINATE"。
        reason は日本語 1 文で、どの経路の何を根拠にそう決めたかを述べる。

    ## 判定規則の設計判断 (代替案と、それを採らなかった理由)

    1. **1 経路だけ観測できた場合も確定させる** (代替案: 2 経路揃わなければ INDETERMINATE)。
       2 経路必須にすると、GitHub Releases を発行しない package や npm に無い OSS で常に
       INDETERMINATE となり、本 issue が是正しようとした「確定できず FAIL が反復する」状態へ
       戻ってしまう。観測できた経路は publisher 自身の一次ソースであり、二次索引と違って
       索引ラグを持たないため、単独でも現行版の根拠になる。2 経路を引く意味は「両方揃うこと」
       ではなく「片方が遅れても確定できること」にある。
    2. **記録がいずれかの一次経路と一致すれば FRESH** (代替案: 経路間で割れたら INDETERMINATE)。
       npm の `dist-tags.latest` は安定版のみ、GitHub の `releases/latest` は prerelease を
       含みうるため、両者が割れるのは正常系 (実例: drizzle-orm の rc 系)。記録が publisher の
       一次ソースが現に指す版と一致している以上「世代落ち」ではなく、これを STALE にするのは
       誤検出になる。ただし割れている事実は監査材料なので reason に必ず残す。
    3. **どの経路とも不一致なら、未確定経路が残っていても STALE** (代替案: 未確定があれば
       INDETERMINATE)。SSOT の安全側原則 (疑いは検出側に倒す) に従う。C08 は read-only の
       検出器であり、STALE は C02 への再取得材料にすぎないため、誤検出のコストは低い。
       ただし「どの経路をまだ確定できていないか」は reason に必ず開示する (未確定経路には
       到達不能だけでなく、GET は通ったが version を抽出できなかった経路も含める。判定に
       使えなかった経路を黙殺すると、本 issue が正した「試みた事実が見えない」状態が
       出力側で再生産される)。
    4. **比較は正規化後の文字列一致で行う** (代替案: semver の大小比較)。prerelease の順序規則まで
       実装すると判定器自体が誤りやすくなる。一致しない = 記録が現行を指していない、で検出目的は
       足りる。記録が現行より「新しい」先行記録も一致しない側に落ちるが、それも監査対象として
       surface すべき状態なので取りこぼしにならない。
    5. **記録値が無い場合は FRESH と呼ばない**。突合対象が無いだけで「現行である」ことは示せない。
       記録欠落そのものは形式層 (C13 の必須フィールド検査) の担当軸なので、鮮度層では確定させず
       観測した現行版を根拠として返す (C02 の記録更新材料になる)。
    """
    observed = [r for r in routes if r.get("ok") and r.get("latest_version")]
    # 到達不能だけでなく「GET は通ったが version を抽出できなかった」経路 (--url 併用時など) も
    # 未確定として扱う。判定に使えなかった経路を黙殺すると、本 issue が正した「試みた事実が
    # 見えない」状態を出力側で再生産することになる。
    unconfirmed = [r for r in routes if not (r.get("ok") and r.get("latest_version"))]

    # 一次経路を 1 つも観測できないときに限り「鮮度未確認」を名乗れる (判断 1 の裏返し)。
    if not observed:
        detail = "; ".join(f"{r.get('route')}={r.get('error')}" for r in routes) or "照合経路の指定なし"
        return VERDICT_INDETERMINATE, f"一次経路をいずれも観測できず鮮度を確定できない ({detail})"

    seen = {r["route"]: r["latest_version"] for r in observed}
    pending = f"、未確定経路: {[r.get('route') for r in unconfirmed]}" if unconfirmed else ""

    if not recorded_version:
        return VERDICT_INDETERMINATE, f"記録 version が無く突合できない (一次観測: {seen}{pending})"

    recorded = normalize_version(recorded_version)
    matched = [route for route, version in seen.items() if version == recorded]

    if matched:
        split = "" if len(set(seen.values())) == 1 else f" (経路間で値が割れている: {seen})"
        prerelease = [r["route"] for r in observed if r["route"] in matched and r.get("prerelease")]
        pre_note = f" ※一致経路 {prerelease} は prerelease を指している" if prerelease else ""
        return (
            VERDICT_FRESH,
            f"記録 {recorded} が一次経路 {'/'.join(matched)} の現行版と一致{split}{pre_note}{pending}",
        )

    return (
        VERDICT_STALE,
        f"記録 {recorded} がどの一次経路の現行版とも不一致 (一次観測: {seen}{pending})",
    )


def build_report(
    recorded_version: str | None, routes: list[dict], ledger_path: Path, target_id: str | None
) -> dict:
    verdict, reason = decide_freshness(recorded_version, routes)
    return {
        "script": SCRIPT_NAME,
        "schema_version": SCHEMA_VERSION,
        "checked_at": _now(),
        "target_id": target_id,
        "recorded_version": recorded_version,
        "verdict": verdict,
        "reason": reason,
        "routes": [{k: v for k, v in r.items() if k != "body"} for r in routes],
        "primary_get_count": sum(1 for r in routes if r.get("ok")),
        "ledger_path": str(ledger_path),
    }


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(
        description="公式一次ソースへの read-only GET と 2 経路照合 (C08 doc-freshness の一次確認手段)"
    )
    ap.add_argument("--url", help="単発 GET する公式 URL (https のみ)")
    ap.add_argument("--npm", help="npm registry を照合する package 名 (経路 A)")
    ap.add_argument("--github", help="GitHub Releases を照合する OWNER/REPO (経路 B)")
    ap.add_argument("--recorded-version", help="fetched-references.json の記録 version")
    ap.add_argument("--target-id", help="対象 target_id (台帳・出力の識別子)")
    ap.add_argument(
        "--allow-host",
        action="append",
        default=[],
        help="既定 allowlist 外の公式 host を明示宣言する (台帳へ host_policy=explicit として残る)",
    )
    ap.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT, help="1 GET の timeout 秒")
    ap.add_argument(
        "--max-body-chars",
        type=int,
        default=DEFAULT_MAX_BODY_CHARS,
        help=f"--url 単発時に stdout へ返す本文の上限文字数 (既定 {DEFAULT_MAX_BODY_CHARS}、0 で無制限)",
    )
    ap.add_argument("--ledger", help="台帳パスの上書き (既定: eval-log/system-spec-harness/primary-get-ledger.jsonl)")
    args = ap.parse_args(argv)

    if not (args.url or args.npm or args.github):
        print("--url / --npm / --github のいずれか 1 つ以上が必要", file=sys.stderr)
        return 2

    allowed = set(DEFAULT_ALLOWED_HOSTS) | {_norm_host(h) for h in args.allow_host if h}
    ledger_path = resolve_ledger_path(args.ledger)
    common = {
        "allowed_hosts": allowed,
        "ledger_path": ledger_path,
        "target_id": args.target_id,
        "timeout": args.timeout,
    }

    routes: list[dict] = []
    try:
        if args.npm:
            routes.append(probe_npm(args.npm, **common))
        if args.github:
            routes.append(probe_github(args.github, **common))
        if args.url:
            result = http_get(args.url, route="url", **common)
            routes.append(
                {
                    "route": "url",
                    "ok": result.get("ok", False),
                    "url": args.url,
                    "status": result.get("status"),
                    "body_sha256": result.get("body_sha256"),
                    "body": result.get("body"),
                    "error": result.get("error"),
                }
            )
    except PolicyError as exc:
        print(f"policy 違反: {exc}", file=sys.stderr)
        return 2
    except EvidenceError as exc:
        print(f"証跡保存失敗: {exc}", file=sys.stderr)
        return 3

    # --url 単発 (記録値の突合なし) は取得結果をそのまま返す。鮮度判定は照合経路がある時だけ。
    if not (args.npm or args.github):
        single = routes[0]
        body = single.get("body")
        limit = args.max_body_chars
        truncated = bool(body) and limit > 0 and len(body) > limit
        payload = {
            "script": SCRIPT_NAME,
            "schema_version": SCHEMA_VERSION,
            "checked_at": _now(),
            "target_id": args.target_id,
            "fetched": {k: v for k, v in single.items() if k != "body"},
            "body": body[:limit] if truncated else body,
            "body_chars": len(body) if body else 0,
            "body_truncated": truncated,
            "ledger_path": str(ledger_path),
        }
        if truncated:
            print(
                f"[warn] 本文が {len(body)} 文字あるため先頭 {limit} 文字のみ返した "
                f"(全体の sha256 は fetched.body_sha256。広げるなら --max-body-chars)",
                file=sys.stderr,
            )
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0 if single.get("ok") else 3

    report = build_report(args.recorded_version, routes, ledger_path, args.target_id)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return EXIT_BY_VERDICT[report["verdict"]]


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
