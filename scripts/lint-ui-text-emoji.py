#!/usr/bin/env python3
"""lint-ui-text-emoji.py

feat-semantic-emphasis-icons の fail-closed lint。共通 UI 層と Hub の画面層
(既定 `packages/ui/src` と `apps/hub/src`) のソース中に絵文字が混入することを遮断する。

なぜ遮断するか:
  絵文字は OS/フォントによって字形・色・サイズが変わり、配色 token の contrast 保証
  (`packages/ui/src/tokens/tokens.ts` の contrastRequirements) の外側で描画される。
  結果として dark テーマや高コントラスト設定で「意味を担う印だけが読めない」状態になる。
  強調・状態表現は inline SVG アイコン (`packages/ui/src/icons`) と semantic color token で
  表現し、絵文字は使わない。

何を絵文字とみなすか (誤検出を避けるための線引き):
  Unicode の `Emoji_Presentation=Yes` (既定で絵文字として描画される符号位置) と、
  異体字セレクタ U+FE0F を伴って絵文字表示へ切り替わる文字だけを違反とする。
  `→` `←` `▲` `▼` `↕` `■` `▾` `▸` のような **既定でテキスト表示される記号は違反にしない**。
  これらは日本語コメントの矢印やソート方向の印として既に多数使われており、一律禁止に
  すると違反が数十件出て lint そのものが無視される (ゲートの実効性を殺す)。

usage:
  python3 scripts/lint-ui-text-emoji.py [--repo-root PATH] [--root REL ...] [--json]
  python3 scripts/lint-ui-text-emoji.py --self-test

exit code:
  0 違反なし (--self-test では detector 実効性 OK)
  1 絵文字を検出 (fail-closed。--self-test では detector が壊れている)
  2 設定エラー (対象 root 不在など)

CONVENTIONS: stdlib only.
"""
from __future__ import annotations

import argparse
import contextlib
import io
import json
import sys
import tempfile
from pathlib import Path

# 既定の検査対象。共通 UI 層 (部品) と Hub の画面層 (文言・空状態文言) の両方を見る。
# packages/ui だけに絞ると、画面側で直に書かれた空状態文言や見出しの絵文字が素通りする。
DEFAULT_ROOTS = ("packages/ui/src", "apps/hub/src")
SOURCE_SUFFIXES = (".ts", ".tsx")

# 異体字セレクタ。直前の文字を絵文字表示へ切り替える (例: U+26A0 + U+FE0F = ⚠️)。
VARIATION_SELECTOR_16 = 0xFE0F

# Unicode `Emoji_Presentation=Yes` の符号位置範囲 (両端含む)。
# 出典: Unicode Emoji Data (emoji-data.txt) の Emoji_Presentation 属性。
# ここに載らない記号 (矢印・幾何学模様など) は既定でテキスト表示のため違反にしない。
EMOJI_PRESENTATION_RANGES: tuple[tuple[int, int], ...] = (
    (0x231A, 0x231B), (0x23E9, 0x23EC), (0x23F0, 0x23F0), (0x23F3, 0x23F3),
    (0x25FD, 0x25FE), (0x2614, 0x2615), (0x2648, 0x2653), (0x267F, 0x267F),
    (0x2693, 0x2693), (0x26A1, 0x26A1), (0x26AA, 0x26AB), (0x26BD, 0x26BE),
    (0x26C4, 0x26C5), (0x26CE, 0x26CE), (0x26D4, 0x26D4), (0x26EA, 0x26EA),
    (0x26F2, 0x26F3), (0x26F5, 0x26F5), (0x26FA, 0x26FA), (0x26FD, 0x26FD),
    (0x2705, 0x2705), (0x270A, 0x270B), (0x2728, 0x2728), (0x274C, 0x274C),
    (0x274E, 0x274E), (0x2753, 0x2755), (0x2757, 0x2757), (0x2795, 0x2797),
    (0x27B0, 0x27B0), (0x27BF, 0x27BF), (0x2B1B, 0x2B1C), (0x2B50, 0x2B50),
    (0x2B55, 0x2B55),
    (0x1F004, 0x1F004), (0x1F0CF, 0x1F0CF), (0x1F18E, 0x1F18E),
    (0x1F191, 0x1F19A), (0x1F1E6, 0x1F1FF), (0x1F201, 0x1F201),
    (0x1F21A, 0x1F21A), (0x1F22F, 0x1F22F), (0x1F232, 0x1F236),
    (0x1F238, 0x1F23A), (0x1F250, 0x1F251), (0x1F300, 0x1F320),
    (0x1F32D, 0x1F335), (0x1F337, 0x1F37C), (0x1F37E, 0x1F393),
    (0x1F3A0, 0x1F3CA), (0x1F3CF, 0x1F3D3), (0x1F3E0, 0x1F3F0),
    (0x1F3F4, 0x1F3F4), (0x1F3F8, 0x1F43E), (0x1F440, 0x1F440),
    (0x1F442, 0x1F4FC), (0x1F4FF, 0x1F53D), (0x1F54B, 0x1F54E),
    (0x1F550, 0x1F567), (0x1F57A, 0x1F57A), (0x1F595, 0x1F596),
    (0x1F5A4, 0x1F5A4), (0x1F5FB, 0x1F64F), (0x1F680, 0x1F6C5),
    (0x1F6CC, 0x1F6CC), (0x1F6D0, 0x1F6D2), (0x1F6D5, 0x1F6D7),
    (0x1F6DC, 0x1F6DF), (0x1F6EB, 0x1F6EC), (0x1F6F4, 0x1F6FC),
    (0x1F7E0, 0x1F7EB), (0x1F7F0, 0x1F7F0), (0x1F90C, 0x1F93A),
    (0x1F93C, 0x1F945), (0x1F947, 0x1F9FF), (0x1FA70, 0x1FA7C),
    (0x1FA80, 0x1FA88), (0x1FA90, 0x1FABD), (0x1FABF, 0x1FAC5),
    (0x1FACE, 0x1FADB), (0x1FAE0, 0x1FAE8), (0x1FAF0, 0x1FAF8),
)


def is_emoji_presentation(code_point: int) -> bool:
    """既定で絵文字として描画される符号位置か (Emoji_Presentation=Yes)。"""
    for start, end in EMOJI_PRESENTATION_RANGES:
        if start <= code_point <= end:
            return True
    return False


def find_emoji(text: str) -> list[tuple[int, int, str]]:
    """text 中の絵文字を (行番号, 列番号, 文字列) の list で返す。いずれも 1 起点。

    検出するのは 2 種類:
      1. Emoji_Presentation=Yes の符号位置 (単体で絵文字表示)
      2. 任意の文字 + U+FE0F (異体字セレクタで絵文字表示へ切り替えたもの)
    """
    found: list[tuple[int, int, str]] = []
    for line_no, line in enumerate(text.splitlines(), start=1):
        for col, char in enumerate(line, start=1):
            next_char = line[col] if col < len(line) else ""
            if next_char and ord(next_char) == VARIATION_SELECTOR_16:
                found.append((line_no, col, char + next_char))
            elif ord(char) == VARIATION_SELECTOR_16:
                continue  # 直前の文字と組で既に記録済み
            elif is_emoji_presentation(ord(char)):
                found.append((line_no, col, char))
    return found


def list_source_files(repo_root: Path, roots: tuple[str, ...]) -> list[Path]:
    """検査対象の source file を repo 相対 sorted で返す。root 不在は設定エラー。"""
    files: list[Path] = []
    for rel in roots:
        base = repo_root / rel
        if not base.is_dir():
            raise FileNotFoundError(f"検査対象 root が存在しない: {rel}")
        files.extend(
            p for p in base.rglob("*") if p.is_file() and p.suffix in SOURCE_SUFFIXES
        )
    return sorted(files)


def evaluate(repo_root: Path, files: list[Path]) -> list[str]:
    """違反メッセージの list を返す。空なら適合。"""
    violations: list[str] = []
    for path in files:
        text = path.read_text(encoding="utf-8", errors="replace")
        rel = path.relative_to(repo_root).as_posix()
        for line_no, col, glyph in find_emoji(text):
            code = " ".join(f"U+{ord(c):04X}" for c in glyph)
            violations.append(
                f"VIOLATION: ui-text-emoji: {rel}:{line_no}:{col} に絵文字 "
                f"{glyph!r} ({code}) がある。強調・状態表現は packages/ui/src/icons の "
                "inline SVG アイコンと tokens.ts の semantic color token で表す"
            )
    return violations


def self_test() -> int:
    """detector 実効性: 意図的な絵文字を検出でき、テキスト表示記号は見逃すこと。

    lint 本体だけを CI に置くと、判定ロジックが空になっても「違反 0 件」で緑になる
    (無音の失効)。その失効を検出する手段を lint 自身の中に持たせる。
    一時ツリーを script 内で組み立てるので、CI と `run-ci-checks.sh` の双方から
    同じ 1 コマンドで呼べる (CI にしか無い検査を作らない)。
    """
    def probe_exit(probe: Path) -> int:
        """probe ツリーへ lint 本体をかけ、exit code だけを取る。

        内側の実行が出す「FAIL: ...」は probe に対する期待どおりの結果なので、
        CI ログで本物の違反と読み間違えないよう握りつぶす。
        """
        sink = io.StringIO()
        with contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
            return main(["--repo-root", str(probe), "--root", "packages/ui/src"])

    failures: list[str] = []
    with tempfile.TemporaryDirectory() as tmp:
        probe = Path(tmp)
        root = probe / "packages" / "ui" / "src"
        root.mkdir(parents=True)

        # 1. Emoji_Presentation=Yes を検出する
        (root / "probe.ts").write_text(
            "export const label = '\U0001F389 done';\n", encoding="utf-8"
        )
        code = probe_exit(probe)
        if code != 1:
            failures.append(f"絵文字 (U+1F389) を検出できていない (期待 exit=1, 実際 exit={code})")

        # 2. U+FE0F 付きの異体字も検出する
        (root / "probe.ts").write_text(
            "export const warn = '⚠️ attention';\n", encoding="utf-8"
        )
        code = probe_exit(probe)
        if code != 1:
            failures.append(f"異体字絵文字 (U+26A0 U+FE0F) を検出できていない (期待 exit=1, 実際 exit={code})")

        # 3. テキスト表示記号は違反にしない (誤検出で lint が骨抜きにされるのを防ぐ)
        (root / "probe.ts").write_text(
            "// 変換 → 表示 ▲ ■ ▾\nexport const arrow = '→';\n", encoding="utf-8"
        )
        code = probe_exit(probe)
        if code != 0:
            failures.append(f"テキスト表示記号を誤検出している (期待 exit=0, 実際 exit={code})")

    if failures:
        for line in failures:
            print(f"VIOLATION: ui-text-emoji-self-test: {line}", file=sys.stderr)
        print(f"FAIL: ui-text-emoji detector 実効性 ({len(failures)} 件)", file=sys.stderr)
        return 1
    print("OK: ui-text-emoji detector 実効性 (3 checks)")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--self-test", action="store_true",
        help="detector が意図的な絵文字を検出できることを確認する (無音の失効検出)",
    )
    parser.add_argument("--repo-root", default=".", help="リポジトリルート (既定: cwd)")
    parser.add_argument(
        "--root", action="append", default=None, metavar="REL",
        help=f"検査対象 root (repo 相対・複数可。既定: {' '.join(DEFAULT_ROOTS)})",
    )
    parser.add_argument("--json", action="store_true", help="JSON で結果を出力する")
    args = parser.parse_args(argv)

    if args.self_test:
        return self_test()

    repo_root = Path(args.repo_root).resolve()
    if not repo_root.is_dir():
        print(f"設定エラー: repo-root が存在しない: {repo_root}", file=sys.stderr)
        return 2

    roots = tuple(args.root) if args.root else DEFAULT_ROOTS
    try:
        files = list_source_files(repo_root, roots)
        violations = evaluate(repo_root, files)
    except (FileNotFoundError, OSError) as exc:
        print(f"設定エラー: {exc}", file=sys.stderr)
        return 2

    if args.json:
        print(json.dumps({
            "roots": list(roots),
            "checked": len(files),
            "violations": violations,
        }, indent=2, ensure_ascii=False))
    else:
        for line in violations:
            print(line, file=sys.stderr)
        if violations:
            print(
                f"FAIL: ui-text-emoji 違反 {len(violations)} 件 (検査 {len(files)} file)",
                file=sys.stderr,
            )
        else:
            print(
                f"OK: ui-text-emoji 適合 (検査 {len(files)} file, "
                f"root {', '.join(roots)})"
            )
    return 1 if violations else 0


if __name__ == "__main__":
    sys.exit(main())
