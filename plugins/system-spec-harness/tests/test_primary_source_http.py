# /// script
# name: test-primary-source-http
# version: 0.1.0
# purpose: 一次 GET の HTTP/policy 層 (primary_source_http.py) の https 限定・host allowlist・
#          内部 IP 拒否・リダイレクト再検査・証跡台帳追記 (成功=ok / 到達不能=unreachable) を検証する
#          pytest。HTTP は全て stub し実ネットワークへ出ない。500 行分割: issue HarnessHub-nq2。
# inputs:
#   - argv: pytest 経由 (直接 argv は取らない)
# outputs:
#   - stdout: pytest 結果
#   - exit: 0=all pass / 1=failure
# contexts: [E, C]
# network: false
# write-scope: none
# dependencies: []
# requires-python: ">=3.9"
# ///
"""一次 GET チョークポイントの HTTP/policy 層を検証する (issue: HarnessHub-nq2)。

実ネットワークへは出ない (urllib の opener と DNS 解決を stub)。「GET しか表現できない」ことと
「試行が必ず台帳に残る」ことが本 module の安全性・監査可能性の核なので、その 2 点を重点的に固定する。
"""
from __future__ import annotations

import importlib.util
import json
import socket
from pathlib import Path

import pytest

SCRIPTS = Path(__file__).resolve().parent.parent / "scripts"


def _load(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / filename)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


pgt = _load("pgt", "primary_source_http.py")


class _FakeResponse:
    def __init__(self, body: bytes, status: int = 200, url: str = "https://example.test/"):
        self._body = body
        self.status = status
        self._url = url

    def read(self, _n: int | None = None) -> bytes:
        return self._body

    def geturl(self) -> str:
        return self._url

    def getcode(self) -> int:
        return self.status

    def __enter__(self):
        return self

    def __exit__(self, *_exc):
        return False


class _FakeOpener:
    """url -> bytes | Exception の対応表で応答する opener stub。"""

    def __init__(self, responses: dict):
        self.responses = responses
        self.calls: list[str] = []

    def open(self, request, timeout=None):  # noqa: ARG002
        url = request.full_url
        self.calls.append(url)
        payload = self.responses.get(url)
        if payload is None:
            raise OSError(f"stub 未登録の URL: {url}")
        if isinstance(payload, Exception):
            raise payload
        return _FakeResponse(payload, url=url)


@pytest.fixture(autouse=True)
def _no_dns(monkeypatch):
    """DNS 解決を public IP 固定に stub する (テストを実ネットワークから切り離す)。"""
    monkeypatch.setattr(
        socket, "getaddrinfo", lambda *a, **k: [(2, 1, 6, "", ("93.184.216.34", 443))]
    )


@pytest.fixture
def ledger(tmp_path) -> Path:
    return tmp_path / "primary-get-ledger.jsonl"


def _install(monkeypatch, responses: dict) -> _FakeOpener:
    opener = _FakeOpener(responses)
    monkeypatch.setattr(pgt.urllib.request, "build_opener", lambda *a, **k: opener)
    return opener


def _rows(ledger: Path) -> list[dict]:
    if not ledger.exists():
        return []
    return [json.loads(line) for line in ledger.read_text(encoding="utf-8").splitlines() if line]


# --- policy 層: GET 以外・allowlist 外・内部 IP を構造的に弾く -------------------------------


def test_check_url_rejects_non_https():
    with pytest.raises(pgt.PolicyError):
        pgt.check_url("http://registry.npmjs.org/pnpm", set(pgt.DEFAULT_ALLOWED_HOSTS))


def test_check_url_rejects_host_outside_allowlist():
    with pytest.raises(pgt.PolicyError):
        pgt.check_url("https://example.com/pnpm", set(pgt.DEFAULT_ALLOWED_HOSTS))


def test_check_url_accepts_default_allowlist_host():
    assert pgt.check_url("https://registry.npmjs.org/pnpm", set(pgt.DEFAULT_ALLOWED_HOSTS)) == "registry.npmjs.org"


def test_check_url_accepts_explicitly_declared_host():
    allowed = set(pgt.DEFAULT_ALLOWED_HOSTS) | {"developers.cloudflare.com"}
    assert (
        pgt.check_url("https://developers.cloudflare.com/workers/wrangler/", allowed)
        == "developers.cloudflare.com"
    )


def test_check_url_rejects_internal_ip(monkeypatch):
    monkeypatch.setattr(socket, "getaddrinfo", lambda *a, **k: [(2, 1, 6, "", ("127.0.0.1", 443))])
    with pytest.raises(pgt.PolicyError):
        pgt.check_url("https://api.github.com/repos/a/b", set(pgt.DEFAULT_ALLOWED_HOSTS))


def test_redirect_handler_rechecks_allowlist():
    handler = pgt._AllowlistRedirectHandler(set(pgt.DEFAULT_ALLOWED_HOSTS))
    with pytest.raises(pgt.PolicyError):
        handler.redirect_request(None, None, 302, "Found", {}, "https://evil.test/x")


def test_norm_host_does_not_mangle_web_dev():
    # lstrip("www.") 実装だと `web.dev` -> `eb.dev` に潰れる退行の固定
    assert pgt._norm_host("web.dev") == "web.dev"
    assert pgt._norm_host("www.python.org") == "python.org"


# --- 証跡台帳: 成功も到達不能も 1 行残る ----------------------------------------------------


def test_ledger_records_successful_get(monkeypatch, ledger):
    url = "https://registry.npmjs.org/pnpm"
    _install(monkeypatch, {url: b'{"dist-tags":{"latest":"11.16.0"}}'})
    result = pgt.http_get(
        url, allowed_hosts=set(pgt.DEFAULT_ALLOWED_HOSTS), ledger_path=ledger, target_id="pnpm", route="npm"
    )
    assert result["ok"] is True
    rows = _rows(ledger)
    assert len(rows) == 1
    assert rows[0]["method"] == "GET"
    assert rows[0]["outcome"] == "ok"
    assert rows[0]["target_id"] == "pnpm"
    assert rows[0]["host_policy"] == "default"
    assert rows[0]["body_sha256"]
    assert "body" not in rows[0]  # 応答本文は台帳へ残さない


def test_ledger_records_unreachable_attempt(monkeypatch, ledger):
    url = "https://api.github.com/repos/pnpm/pnpm/releases/latest"
    _install(monkeypatch, {url: OSError("network unreachable")})
    result = pgt.http_get(
        url, allowed_hosts=set(pgt.DEFAULT_ALLOWED_HOSTS), ledger_path=ledger, target_id="pnpm", route="github"
    )
    assert result["ok"] is False
    rows = _rows(ledger)
    # 「試みたが不能」と「試みていない」を事後に区別できることが受入条件
    assert len(rows) == 1
    assert rows[0]["outcome"] == "unreachable"
    assert "network unreachable" in rows[0]["error"]


def test_policy_violation_leaves_no_ledger_row(ledger):
    with pytest.raises(pgt.PolicyError):
        pgt.http_get(
            "https://evil.test/x", allowed_hosts=set(pgt.DEFAULT_ALLOWED_HOSTS), ledger_path=ledger
        )
    assert _rows(ledger) == []  # GET を実行していないので証跡も無い


def test_ledger_write_failure_raises_evidence_error(monkeypatch, tmp_path):
    """GET 成功を証跡化できない場合は FRESH と自己申告せず fail-closed に止める。"""
    url = "https://developers.cloudflare.com/workers/wrangler/"
    ledger_dir = tmp_path / "ledger-is-a-directory"
    ledger_dir.mkdir()
    _install(monkeypatch, {url: b"<html>current</html>"})

    with pytest.raises(pgt.EvidenceError):
        pgt.http_get(
            url,
            allowed_hosts=set(pgt.DEFAULT_ALLOWED_HOSTS) | {"developers.cloudflare.com"},
            ledger_path=ledger_dir,
        )


def test_explicit_host_is_marked_in_ledger(monkeypatch, ledger):
    url = "https://developers.cloudflare.com/workers/wrangler/"
    _install(monkeypatch, {url: b"<html>wrangler</html>"})
    allowed = set(pgt.DEFAULT_ALLOWED_HOSTS) | {"developers.cloudflare.com"}
    pgt.http_get(url, allowed_hosts=allowed, ledger_path=ledger, target_id="wrangler")
    assert _rows(ledger)[0]["host_policy"] == "explicit"


def test_resolve_ledger_path_prefers_env(monkeypatch, tmp_path):
    monkeypatch.setenv(pgt.LEDGER_ENV, str(tmp_path / "custom.jsonl"))
    assert pgt.resolve_ledger_path(None) == tmp_path / "custom.jsonl"
    assert pgt.resolve_ledger_path(str(tmp_path / "explicit.jsonl")) == tmp_path / "explicit.jsonl"


def test_http_get_flags_truncated_response(monkeypatch, ledger):
    """MAX_BYTES 超過を「切り詰め」として名乗らせる (JSON parse 失敗に化けさせない)。"""
    url = "https://registry.npmjs.org/-/package/pnpm/dist-tags"
    _install(monkeypatch, {url: b"z" * (pgt.MAX_BYTES + 500)})
    result = pgt.http_get(url, allowed_hosts=set(pgt.DEFAULT_ALLOWED_HOSTS), ledger_path=ledger, timeout=5)
    assert result["truncated"] is True
    assert result["bytes"] == pgt.MAX_BYTES
    assert _rows(ledger)[0]["truncated"] is True
