"""scripts/lint-ui-text-emoji.py の genuine で網羅的な機能テスト (network 不要)。

feat-semantic-emphasis-icons の絵文字 fail-closed lint。純関数
(is_emoji_presentation / find_emoji / list_source_files / evaluate) を in-process で
網羅し、subprocess で実 CLI の exit code も確認する。

このテストの主眼は **ゲートの実効性**にある。「実 repo で exit 0」だけを確認する
テストは、判定ロジックを空にしても通ってしまい、無音で失効した lint を緑と誤読させる。
そのため MUST_DETECT (絵文字を置いたら必ず非0で落ちる) を先に固定する。

カバー:
- MUST_DETECT (exit 1): Emoji_Presentation の絵文字 / U+FE0F 付きの絵文字表示
- MUST_PASS  (exit 0): 矢印・幾何記号など既定でテキスト表示される記号 (誤検出しない)
- 位置報告: 行番号・列番号・符号位置が違反メッセージに出る
- 対象限定: .ts/.tsx 以外は検査しない
- 設定エラー (exit 2): 対象 root 不在
- 実リポジトリ CLI 実行が exit 0 (契約テスト)

network: false, keychain: なし, 実ファイル書換: なし (tmp_path のみ)。
"""
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "lint-ui-text-emoji.py"

SPEC = importlib.util.spec_from_file_location("lint_ui_text_emoji_uut", SCRIPT)
MOD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MOD)


def _src(tmp_path: Path, rel: str, body: str) -> Path:
    """tmp repo に source file を置き、その path を返す。"""
    p = tmp_path / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(body, encoding="utf-8")
    return p


def _run_cli(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(SCRIPT), *args], capture_output=True, text=True
    )


# --- MUST_DETECT: 絵文字は必ず落ちる ------------------------------------------


@pytest.mark.parametrize(
    "glyph",
    [
        "\U0001F389",  # 🎉 party popper
        "\U0001F534",  # 🔴 red circle
        "✅",      # ✅ white heavy check mark
        "⚡",      # ⚡ high voltage
        "\U0001F680",  # 🚀 rocket
    ],
)
def test_emoji_presentation_glyph_is_violation(tmp_path: Path, glyph: str) -> None:
    """既定で絵文字表示される符号位置は違反として検出される。"""
    _src(tmp_path, "packages/ui/src/a.tsx", f"const label = '{glyph} 完了';\n")
    violations = MOD.evaluate(
        tmp_path, MOD.list_source_files(tmp_path, ("packages/ui/src",))
    )
    assert len(violations) == 1
    assert "ui-text-emoji" in violations[0]


def test_variation_selector_emoji_is_violation(tmp_path: Path) -> None:
    """U+FE0F で絵文字表示へ切り替えた文字 (⚠️ など) も検出する。

    ⚠ (U+26A0) 単体は Emoji_Presentation=No のため範囲表には載らない。
    U+FE0F を見ないと、最頻出の警告絵文字が素通りする。
    """
    _src(tmp_path, "packages/ui/src/a.tsx", "const t = '⚠️ 注意';\n")
    violations = MOD.evaluate(
        tmp_path, MOD.list_source_files(tmp_path, ("packages/ui/src",))
    )
    assert len(violations) == 1
    assert "U+26A0 U+FE0F" in violations[0]


def test_cli_exits_nonzero_on_violation(tmp_path: Path) -> None:
    """CLI は絵文字検出時に非ゼロ終了する (CI が fail-closed になる条件)。"""
    _src(tmp_path, "packages/ui/src/a.ts", "export const x = '\U0001F389';\n")
    proc = _run_cli("--repo-root", str(tmp_path), "--root", "packages/ui/src")
    assert proc.returncode == 1
    assert "FAIL: ui-text-emoji" in proc.stderr


# --- MUST_PASS: テキスト表示の記号は誤検出しない ------------------------------


@pytest.mark.parametrize(
    "glyph",
    [
        "→",  # → 日本語コメントの矢印
        "←",  # ← 戻る
        "▲",  # ▲ 昇順
        "▼",  # ▼ 降順
        "↕",  # ↕ 未ソート
        "■",  # ■ 停止
        "▾",  # ▾ 開く印
        "▸",  # ▸ 折りたたみ
    ],
)
def test_text_presentation_symbol_is_not_violation(tmp_path: Path, glyph: str) -> None:
    """既定でテキスト表示される記号は違反にしない (誤検出で lint を殺さない)。"""
    _src(tmp_path, "packages/ui/src/a.tsx", f"// 状態 {glyph} を表す\n")
    violations = MOD.evaluate(
        tmp_path, MOD.list_source_files(tmp_path, ("packages/ui/src",))
    )
    assert violations == []


def test_ascii_and_japanese_only_source_passes(tmp_path: Path) -> None:
    """通常の日本語コメント込みソースは適合する。"""
    _src(
        tmp_path,
        "packages/ui/src/a.tsx",
        "/** バッジの配色は semantic token だけで決める。 */\nexport const tone = 'info';\n",
    )
    proc = _run_cli("--repo-root", str(tmp_path), "--root", "packages/ui/src")
    assert proc.returncode == 0
    assert "OK: ui-text-emoji" in proc.stdout


# --- 位置報告・対象限定・設定エラー -------------------------------------------


def test_violation_reports_line_and_column(tmp_path: Path) -> None:
    """違反は行番号・列番号つきで報告する (直せる形で出す)。"""
    _src(tmp_path, "packages/ui/src/a.tsx", "const a = 1;\nconst b = '\U0001F389';\n")
    violations = MOD.evaluate(
        tmp_path, MOD.list_source_files(tmp_path, ("packages/ui/src",))
    )
    assert "packages/ui/src/a.tsx:2:12" in violations[0]


def test_only_ts_and_tsx_are_checked(tmp_path: Path) -> None:
    """.md や .css は検査対象外 (共通 UI 層の実装ファイルだけを見る)。"""
    _src(tmp_path, "packages/ui/src/readme.md", "# \U0001F389 見出し\n")
    _src(tmp_path, "packages/ui/src/a.css", "/* \U0001F389 */\n")
    _src(tmp_path, "packages/ui/src/a.ts", "export const x = 1;\n")
    files = MOD.list_source_files(tmp_path, ("packages/ui/src",))
    assert [p.name for p in files] == ["a.ts"]
    assert MOD.evaluate(tmp_path, files) == []


def test_missing_root_is_config_error(tmp_path: Path) -> None:
    """対象 root 不在は設定エラー (exit 2)。違反 0 件の成功と混同しない。"""
    proc = _run_cli("--repo-root", str(tmp_path))
    assert proc.returncode == 2
    assert "設定エラー" in proc.stderr


def test_json_output_shape(tmp_path: Path) -> None:
    """--json は roots / checked / violations を返す。"""
    _src(tmp_path, "packages/ui/src/a.ts", "export const x = '\U0001F389';\n")
    proc = _run_cli("--repo-root", str(tmp_path), "--root", "packages/ui/src", "--json")
    assert proc.returncode == 1
    payload = json.loads(proc.stdout)
    assert payload["roots"] == ["packages/ui/src"]
    assert payload["checked"] == 1
    assert len(payload["violations"]) == 1


# --- 実リポジトリ契約 ---------------------------------------------------------


def test_default_roots_cover_ui_and_screen_layers() -> None:
    """既定 root は共通 UI 層と画面層の両方を見る。

    packages/ui だけに絞ると、画面側に直に書かれた空状態文言や見出しの絵文字が
    素通りする (scope_in の「UI 文言・空状態文言」を取りこぼす)。
    """
    assert MOD.DEFAULT_ROOTS == ("packages/ui/src", "apps/hub/src")


def test_real_repository_is_clean() -> None:
    """本リポジトリの既定 root (共通 UI 層 + 画面層) が絵文字ゼロであることを固定する。"""
    proc = _run_cli("--repo-root", str(ROOT))
    assert proc.returncode == 0, proc.stderr
