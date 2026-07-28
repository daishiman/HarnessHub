#!/usr/bin/env python3
# /// script
# name: primary-source-http
# version: 0.1.0
# purpose: validate-primary-source.py が使う一次 GET の HTTP/policy 層 (SSRF 対策・allowlist 検査・
#          リダイレクト再検査・append-only 台帳への記録)。CLI としては呼ばれず、同一 scripts/ 配下から
#          import される内部ヘルパー (500 行分割: issue HarnessHub-nq2)。
# inputs:
#   - (CLI 引数なし。呼び出し元 module から関数として呼ばれる)
# outputs:
#   - file: <project>/eval-log/system-spec-harness/primary-get-ledger.jsonl (呼び出し元経由で追記)
# contexts: [E, C]
# network: true
# write-scope: workspace
# dependencies: []
# requires-python: ">=3.9"
# ///
"""一次 GET チョークポイントの HTTP/policy 層 (issue: HarnessHub-nq2)。

`validate-primary-source.py` から `import primary_source_http` で使われる。判定ロジック
(decide_freshness) や npm/GitHub の probe 実装は呼び出し元に残し、本 module は「安全に GET を
実行し、証跡を台帳へ残す」責務だけを持つ。

## 安全性 (能力を足す以上、mutation を構造的に表現できないようにする)

- HTTP method は GET 固定。POST/PUT/PATCH/DELETE を渡す引数が存在しない。
- scheme は https のみ。
- host は allowlist 制。既定は公式 publisher の一次 API host のみで、それ以外は
  呼び出し元が明示的に allowlist へ加えた host のみ許可する (「どの host を公式と
  見なして GET したか」が事後監査できる)。
- 名前解決先が loopback/private/link-local の場合は拒否する (SSRF による内部到達の遮断)。
- リダイレクト先も同じ allowlist 検査を通す。
- 認証情報・Cookie は送らない。応答本文は台帳へ保存せず sha256 のみ記録する。
"""
from __future__ import annotations

import datetime as dt
import hashlib
import ipaddress
import json
import os
import socket
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

SCHEMA_VERSION = "1.0"
SCRIPT_NAME = "validate-primary-source"
LEDGER_RELPATH = Path("eval-log") / "system-spec-harness" / "primary-get-ledger.jsonl"
LEDGER_ENV = "SYSTEM_SPEC_PRIMARY_GET_LEDGER"

# 既定 allowlist = publisher が運用する一次 API host のみ。ドキュメントページ (react.dev 等) は
# 対象 target ごとに異なるため、呼び出し側が --allow-host で明示宣言する (宣言は台帳に残る)。
DEFAULT_ALLOWED_HOSTS = frozenset(
    {
        "registry.npmjs.org",
        "api.github.com",
        "pypi.org",
        "crates.io",
        "proxy.golang.org",
        "rubygems.org",
        "hex.pm",
    }
)

USER_AGENT = "system-spec-harness/validate-primary-source (read-only doc freshness audit)"
MAX_BYTES = 5 * 1024 * 1024
MAX_REDIRECTS = 3
DEFAULT_TIMEOUT = 20.0


class PolicyError(Exception):
    """allowlist・scheme・到達先 IP など、実行前に弾く policy 違反 (exit 2)。"""


class EvidenceError(Exception):
    """GET の証跡を台帳へ永続化できず、監査結果を確定できない状態 (exit 3)。"""


def _now() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _norm_host(host: str) -> str:
    # lstrip("www.") は文字集合の先頭除去で `web.dev` -> `eb.dev` と潰すため removeprefix を使う。
    return (host or "").lower().split(":")[0].removeprefix("www.")


def _assert_public_host(host: str) -> None:
    """名前解決先が loopback/private/link-local なら拒否する (SSRF 遮断)。

    解決できない host はネットワーク到達不能として扱い、ここでは policy 違反にしない
    (呼び出し時に urllib 側の失敗として unreachable に落ちる)。
    """
    try:
        infos = socket.getaddrinfo(host, 443, proto=socket.IPPROTO_TCP)
    except socket.gaierror:
        return
    for info in infos:
        addr = info[4][0]
        try:
            ip = ipaddress.ip_address(addr)
        except ValueError:
            continue
        if ip.is_loopback or ip.is_private or ip.is_link_local or ip.is_reserved:
            raise PolicyError(f"到達先 IP が内部アドレス: host={host} ip={addr}")


def check_url(url: str, allowed_hosts: set[str]) -> str:
    """URL の scheme/host を policy 検査し、正規化 host を返す。違反は PolicyError。"""
    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise PolicyError(f"https 以外の scheme は許可しない: {url!r}")
    host = _norm_host(parsed.netloc)
    if not host:
        raise PolicyError(f"URL から host を解決できない: {url!r}")
    if host not in allowed_hosts:
        raise PolicyError(
            f"host={host!r} は allowlist 外 (公式一次 host として使うなら --allow-host {host} を明示宣言する)"
        )
    _assert_public_host(host)
    return host


def _append_ledger(ledger_path: Path, row: dict) -> None:
    """1 GET = 1 行の append-only 台帳へ追記する (証跡は本文でなく sha256 のみ)。"""
    try:
        ledger_path.parent.mkdir(parents=True, exist_ok=True)
        with ledger_path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")
    except OSError as exc:
        # 証跡が残らないまま FRESH/STALE を返すと、受入条件の「一次 GET 実行証跡」を
        # モデルの自己申告だけで満たしたことになる。監査結果は fail-closed で確定不能にする。
        raise EvidenceError(f"一次 GET 台帳へ追記できない: {ledger_path} ({exc})") from exc


def resolve_ledger_path(explicit: str | None) -> Path:
    if explicit:
        return Path(explicit)
    env = os.environ.get(LEDGER_ENV)
    if env:
        return Path(env)
    root = Path(os.environ.get("CLAUDE_PROJECT_DIR") or Path.cwd())
    return root / LEDGER_RELPATH


class _AllowlistRedirectHandler(urllib.request.HTTPRedirectHandler):
    """リダイレクト先にも同じ allowlist / scheme 検査をかける。"""

    def __init__(self, allowed_hosts: set[str]) -> None:
        self._allowed = allowed_hosts
        self.max_redirections = MAX_REDIRECTS

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: D102
        check_url(newurl, self._allowed)  # 違反は PolicyError で中断 (黙って追従しない)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def http_get(
    url: str,
    *,
    allowed_hosts: set[str],
    ledger_path: Path,
    target_id: str | None = None,
    route: str = "url",
    timeout: float = DEFAULT_TIMEOUT,
) -> dict:
    """read-only GET を 1 回実行し、結果を台帳へ記録して返す。

    戻り値: {ok, url, host, status, bytes, body_sha256, body(text|None), error}
    policy 違反 (allowlist 外等) は PolicyError を送出し、台帳には残さない (GET を実行していないため)。
    """
    host = check_url(url, allowed_hosts)
    row: dict = {
        "schema_version": SCHEMA_VERSION,
        "script": SCRIPT_NAME,
        "recorded_at": _now(),
        "method": "GET",
        "route": route,
        "target_id": target_id,
        "url": url,
        "host": host,
        "host_policy": "default" if host in DEFAULT_ALLOWED_HOSTS else "explicit",
    }
    request = urllib.request.Request(url, method="GET")
    request.add_header("User-Agent", USER_AGENT)
    request.add_header("Accept", "application/json, text/html;q=0.8, */*;q=0.5")

    opener = urllib.request.build_opener(_AllowlistRedirectHandler(allowed_hosts))
    try:
        with opener.open(request, timeout=timeout) as resp:
            # MAX_BYTES+1 読んで超過を検知する。ちょうど MAX_BYTES で切ると「切り詰めた」ことが
            # 分からず、JSON parse 失敗という無関係に見えるエラーとして表面化する (実際に
            # packument 経路でこれを踏んだ)。切り詰めは切り詰めとして名乗らせる。
            body = resp.read(MAX_BYTES + 1)
            truncated = len(body) > MAX_BYTES
            if truncated:
                body = body[:MAX_BYTES]
            final_url = resp.geturl()
            status = getattr(resp, "status", None) or resp.getcode()
    except (urllib.error.URLError, OSError, ValueError) as exc:
        row.update({"outcome": "unreachable", "error": f"{type(exc).__name__}: {exc}"})
        _append_ledger(ledger_path, row)
        return {"ok": False, "url": url, "host": host, "route": route, "error": row["error"]}

    text = body.decode("utf-8", errors="replace")
    row.update(
        {
            "outcome": "ok",
            "status": status,
            "bytes": len(body),
            "truncated": truncated,
            "body_sha256": hashlib.sha256(body).hexdigest(),
            "final_url": final_url,
        }
    )
    _append_ledger(ledger_path, row)
    return {
        "ok": True,
        "url": url,
        "final_url": final_url,
        "host": host,
        "route": route,
        "status": status,
        "bytes": len(body),
        "truncated": truncated,
        "body_sha256": row["body_sha256"],
        "body": text,
    }
