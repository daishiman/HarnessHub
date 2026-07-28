# /// script
# name: test-validate-primary-source
# version: 0.1.0
# purpose: 一次 GET チョークポイント (validate-primary-source.py) の policy 層 (https 限定・host allowlist・内部 IP 拒否・
#          リダイレクト再検査)、証跡台帳の追記 (成功=ok / 到達不能=unreachable)、npm/GitHub の 2 経路 probe、
#          および鮮度 verdict → exit code 対応を検証する pytest。HTTP は全て stub し実ネットワークへ出ない。
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
"""C08 の一次 GET 手段 (issue: HarnessHub-nq2) の決定論部分を検証する。

実ネットワークへは出ない (urllib の opener と DNS 解決を stub)。「GET しか表現できない」ことと
「試行が必ず台帳に残る」ことが本 script の安全性・監査可能性の核なので、その 2 点を重点的に固定する。
"""
from __future__ import annotations

import hashlib
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


fps = _load("fps", "validate-primary-source.py")
# fps ロード時に sys.path.insert(0, scripts/) が実行済みのため、fps が実際に import した
# のと同じインスタンス (sys.modules キャッシュ) を取得できる。http_get 等 fps 側へ転送された
# 関数が内部で参照する urllib / LEDGER_ENV / MAX_BYTES は pgt 経由で monkeypatch する。
import primary_source_http as pgt  # noqa: E402


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


# policy 層 (check_url/_AllowlistRedirectHandler/_norm_host) と証跡台帳の基本動作
# (ok/unreachable/policy違反時は無記録/write失敗時のEvidenceError) は
# test_primary_source_http.py (HTTP/policy 層 module 自体のテスト) で検証する。
# ここでは main() 経由での fail-closed 挙動 (CLI 契約) だけを確認する。


def test_ledger_write_failure_is_indeterminate(monkeypatch, tmp_path, capsys):
    """GET 成功を証跡化できない場合は FRESH と自己申告せず fail-closed に止める (CLI 契約)。"""
    url = "https://developers.cloudflare.com/workers/wrangler/"
    ledger_dir = tmp_path / "ledger-is-a-directory"
    ledger_dir.mkdir()
    monkeypatch.setenv(pgt.LEDGER_ENV, str(ledger_dir))
    _install(monkeypatch, {url: b"<html>current</html>"})

    rc = fps.main(["--url", url, "--allow-host", "developers.cloudflare.com"])

    assert rc == 3
    assert "証跡保存失敗" in capsys.readouterr().err


# --- version 正規化と 2 経路 probe ----------------------------------------------------------


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("v11.16.0", "11.16.0"),
        ("11.16.0", "11.16.0"),
        ("pnpm@11.16.0", "11.16.0"),
        ("v1.0.0-rc.4", "1.0.0-rc.4"),
        (None, None),
    ],
)
def test_normalize_version(raw, expected):
    assert fps.normalize_version(raw) == expected


def test_probe_npm_reads_dist_tags_latest(monkeypatch, ledger):
    url = "https://registry.npmjs.org/-/package/pnpm/dist-tags"
    body = json.dumps({"latest": "11.16.0", "next-11": "11.16.0"})
    _install(monkeypatch, {url: body.encode()})
    route = fps.probe_npm(
        "pnpm", allowed_hosts=set(fps.DEFAULT_ALLOWED_HOSTS), ledger_path=ledger, target_id="pnpm", timeout=5
    )
    assert route == {
        "route": "npm",
        "ok": True,
        "url": url,
        "latest_version": "11.16.0",
        "raw_version": "11.16.0",
        "published_at": None,  # dist-tags エンドポイントは公開日時を持たない (経路 B が担う)
        "dist_tags": {"latest": "11.16.0", "next-11": "11.16.0"},
        "error": None,
    }


def test_probe_npm_uses_dist_tags_endpoint_not_packument(monkeypatch, ledger):
    """回帰: packument (`registry.npmjs.org/<pkg>`) を引くと人気 package で MAX_BYTES を超える。

    live-trial で pnpm の packument が 5MB を超え、切り詰められた JSON の parse に失敗して
    経路 A が丸ごと死んだ (本 issue が名指しした package でまさに再現)。dist-tags エンドポイントは
    数百バイトなので package の人気度に依存しない。
    """
    _install(monkeypatch, {"https://registry.npmjs.org/-/package/pnpm/dist-tags": b'{"latest":"11.16.0"}'})
    route = fps.probe_npm(
        "pnpm", allowed_hosts=set(fps.DEFAULT_ALLOWED_HOSTS), ledger_path=ledger, target_id="pnpm", timeout=5
    )
    assert route["ok"] is True
    assert route["url"].endswith("/-/package/pnpm/dist-tags")
    assert not route["url"].endswith("registry.npmjs.org/pnpm")


def test_probe_npm_handles_scoped_package(monkeypatch, ledger):
    """scoped package (`@opennextjs/cloudflare`) も同じ経路で引ける (issue が名指しした対象)。"""
    url = "https://registry.npmjs.org/-/package/@opennextjs/cloudflare/dist-tags"
    _install(monkeypatch, {url: b'{"latest":"1.20.2"}'})
    route = fps.probe_npm(
        "@opennextjs/cloudflare",
        allowed_hosts=set(fps.DEFAULT_ALLOWED_HOSTS),
        ledger_path=ledger,
        target_id="opennext",
        timeout=5,
    )
    assert route["ok"] is True
    assert route["latest_version"] == "1.20.2"


def test_probe_npm_surfaces_truncation_as_cause(monkeypatch, ledger):
    """切り詰めで JSON が壊れた場合、原因が切り詰めであることを error に明示する。"""
    url = "https://registry.npmjs.org/-/package/pnpm/dist-tags"
    _install(monkeypatch, {url: b'{"latest":"11.16.0"' + b" " * (pgt.MAX_BYTES + 10)})
    route = fps.probe_npm(
        "pnpm", allowed_hosts=set(fps.DEFAULT_ALLOWED_HOSTS), ledger_path=ledger, target_id="pnpm", timeout=5
    )
    assert route["ok"] is False
    assert "切り詰め" in route["error"]


def test_probe_github_reads_tag_name(monkeypatch, ledger):
    url = "https://api.github.com/repos/pnpm/pnpm/releases/latest"
    body = json.dumps({"tag_name": "v11.16.0", "published_at": "2026-07-24T01:00:00Z", "prerelease": False})
    _install(monkeypatch, {url: body.encode()})
    route = fps.probe_github(
        "pnpm/pnpm", allowed_hosts=set(fps.DEFAULT_ALLOWED_HOSTS), ledger_path=ledger, target_id="pnpm", timeout=5
    )
    assert route["ok"] is True
    assert route["latest_version"] == "11.16.0"
    assert route["prerelease"] is False


def test_probe_github_requires_owner_repo(ledger):
    with pytest.raises(fps.PolicyError):
        fps.probe_github(
            "pnpm", allowed_hosts=set(fps.DEFAULT_ALLOWED_HOSTS), ledger_path=ledger, target_id="pnpm", timeout=5
        )


# --- 鮮度判定と exit code (decide_freshness の契約) -----------------------------------------


def _route(name: str, version: str | None, ok: bool = True, **extra) -> dict:
    row = {"route": name, "ok": ok, "latest_version": version, "url": f"https://{name}.test/x"}
    row.update(extra)
    return row


def test_decide_freshness_both_routes_agree_with_record_is_fresh():
    verdict, reason = fps.decide_freshness("11.16.0", [_route("npm", "11.16.0"), _route("github", "11.16.0")])
    assert verdict == fps.VERDICT_FRESH
    assert reason


def test_decide_freshness_both_routes_ahead_of_record_is_stale():
    verdict, reason = fps.decide_freshness("11.15.0", [_route("npm", "11.16.0"), _route("github", "11.16.0")])
    assert verdict == fps.VERDICT_STALE
    assert reason


def test_decide_freshness_all_routes_unreachable_is_indeterminate():
    routes = [
        _route("npm", None, ok=False, error="timeout"),
        _route("github", None, ok=False, error="timeout"),
    ]
    verdict, _reason = fps.decide_freshness("11.15.0", routes)
    assert verdict == fps.VERDICT_INDETERMINATE


def test_decide_freshness_single_reachable_route_still_confirms():
    """判断1: 2 経路揃わなくても、観測できた一次経路だけで確定させる。

    2 経路必須にすると GitHub Releases を出さない package が常時 INDETERMINATE となり、
    本 issue が是正した「確定できず FAIL が反復する」状態へ戻る。
    """
    routes = [_route("npm", "11.16.0"), _route("github", None, ok=False, error="404")]
    verdict, reason = fps.decide_freshness("11.16.0", routes)
    assert verdict == fps.VERDICT_FRESH
    assert "github" in reason  # 未観測経路が残っていることは reason に開示する


def test_decide_freshness_routes_disagree_but_record_matches_one_is_fresh():
    """判断2: npm(安定版) と GitHub(prerelease 含む) が割れるのは正常系。

    記録が publisher の一次ソースが現に指す版と一致している以上、世代落ちではない。
    ただし割れている事実は監査材料として reason に残す。
    """
    routes = [_route("npm", "0.45.2"), _route("github", "1.0.0-rc.4", prerelease=True)]
    verdict, reason = fps.decide_freshness("1.0.0-rc.4", routes)
    assert verdict == fps.VERDICT_FRESH
    assert "割れている" in reason
    assert "prerelease" in reason


def test_decide_freshness_mismatch_with_pending_route_is_stale():
    """判断3: 未確定経路が残っていても、観測できた経路と不一致なら検出側に倒す (安全側)。"""
    routes = [_route("npm", "11.16.0"), _route("github", None, ok=False, error="timeout")]
    verdict, reason = fps.decide_freshness("11.15.0", routes)
    assert verdict == fps.VERDICT_STALE
    assert "未確定経路" in reason


def test_decide_freshness_discloses_fetched_but_unparsed_route():
    """判断3の開示範囲: GET は通ったが version を抽出できない経路 (--url 併用時) も未確定として出す。

    黙殺すると「試みたが判定に使えなかった」が出力から消え、本 issue が正した
    「試みた事実が見えない」状態を出力側で再生産することになる。
    """
    routes = [_route("npm", "11.16.0"), _route("url", None, ok=True)]
    verdict, reason = fps.decide_freshness("11.16.0", routes)
    assert verdict == fps.VERDICT_FRESH
    assert "未確定経路" in reason and "url" in reason


def test_decide_freshness_record_ahead_of_current_is_not_silently_passed():
    """判断4: 記録が現行より「新しい」先行記録も一致しない側に落ち、surface される。"""
    verdict, _reason = fps.decide_freshness("12.0.0", [_route("npm", "11.16.0")])
    assert verdict == fps.VERDICT_STALE


def test_decide_freshness_without_record_is_indeterminate():
    """判断5: 記録欠落は形式層 (C13) の担当軸。鮮度層で FRESH と確定させない。"""
    verdict, reason = fps.decide_freshness(None, [_route("npm", "11.16.0")])
    assert verdict == fps.VERDICT_INDETERMINATE
    assert "11.16.0" in reason  # 観測した現行版は C02 の記録更新材料として返す


def test_decide_freshness_normalizes_version_notation():
    """記録 `v11.16.0` と観測 `11.16.0` の表記ゆれで STALE を誤検出しない。"""
    verdict, _reason = fps.decide_freshness("v11.16.0", [_route("npm", "11.16.0")])
    assert verdict == fps.VERDICT_FRESH


def test_verdict_maps_to_documented_exit_codes():
    # script ヘッダーの契約: 0=FRESH / 1=STALE / 3=INDETERMINATE (2 は usage・policy 違反に予約)
    assert fps.EXIT_BY_VERDICT[fps.VERDICT_FRESH] == 0
    assert fps.EXIT_BY_VERDICT[fps.VERDICT_STALE] == 1
    assert fps.EXIT_BY_VERDICT[fps.VERDICT_INDETERMINATE] == 3


# --- CLI -------------------------------------------------------------------------------------


def test_main_requires_a_route(capsys):
    assert fps.main([]) == 2


def test_main_rejects_host_outside_allowlist(monkeypatch, ledger):
    monkeypatch.setenv(pgt.LEDGER_ENV, str(ledger))
    assert fps.main(["--url", "https://evil.test/x"]) == 2
    assert _rows(ledger) == []


def test_main_single_url_get_returns_body(monkeypatch, ledger, capsys):
    url = "https://developers.cloudflare.com/workers/wrangler/"
    monkeypatch.setenv(pgt.LEDGER_ENV, str(ledger))
    _install(monkeypatch, {url: b"<html>Updated Jul 24, 2026</html>"})
    rc = fps.main(["--url", url, "--allow-host", "developers.cloudflare.com", "--target-id", "wrangler"])
    assert rc == 0
    payload = json.loads(capsys.readouterr().out)
    assert "Updated Jul 24, 2026" in payload["body"]
    assert payload["ledger_path"] == str(ledger)
    assert _rows(ledger)[0]["outcome"] == "ok"


def test_main_single_url_truncates_long_body(monkeypatch, ledger, capsys):
    """公式ページ全文を context へ流し込まない (SSOT: 公式サイト本文の長文復唱はしない)。

    切り詰めても台帳の body_sha256 は原本に対する値のままなので、証跡の同一性検査は壊れない。
    """
    url = "https://developers.cloudflare.com/workers/wrangler/"
    body = b"<html>" + b"x" * 60000 + b"</html>"
    monkeypatch.setenv(pgt.LEDGER_ENV, str(ledger))
    _install(monkeypatch, {url: body})
    rc = fps.main(["--url", url, "--allow-host", "developers.cloudflare.com"])
    assert rc == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["body_truncated"] is True
    assert len(payload["body"]) == fps.DEFAULT_MAX_BODY_CHARS
    assert payload["body_chars"] == len(body)  # 元の長さは失わず開示する
    assert payload["fetched"]["body_sha256"] == hashlib.sha256(body).hexdigest()


def test_main_single_url_max_body_chars_zero_disables_truncation(monkeypatch, ledger, capsys):
    url = "https://developers.cloudflare.com/workers/wrangler/"
    body = b"y" * 30000
    monkeypatch.setenv(pgt.LEDGER_ENV, str(ledger))
    _install(monkeypatch, {url: body})
    rc = fps.main(
        ["--url", url, "--allow-host", "developers.cloudflare.com", "--max-body-chars", "0"]
    )
    assert rc == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["body_truncated"] is False
    assert len(payload["body"]) == 30000


def test_main_two_route_check_exits_by_verdict(monkeypatch, ledger, capsys):
    monkeypatch.setenv(pgt.LEDGER_ENV, str(ledger))
    _install(
        monkeypatch,
        {
            "https://registry.npmjs.org/-/package/pnpm/dist-tags": json.dumps({"latest": "11.16.0"}).encode(),
            "https://api.github.com/repos/pnpm/pnpm/releases/latest": json.dumps({"tag_name": "v11.16.0"}).encode(),
        },
    )
    rc = fps.main(
        ["--target-id", "pnpm", "--npm", "pnpm", "--github", "pnpm/pnpm", "--recorded-version", "11.15.0"]
    )
    report = json.loads(capsys.readouterr().out)
    assert report["verdict"] == fps.VERDICT_STALE
    assert rc == 1
    assert report["primary_get_count"] == 2
    assert len(_rows(ledger)) == 2  # 一次 2 経路の GET が証跡として残る
