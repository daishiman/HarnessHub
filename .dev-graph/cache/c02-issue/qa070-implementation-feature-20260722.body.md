# 概要

qa-070 (2026-07-22 確定・appr-008) は規約の明文化までを範囲とし、実装は別 feature として 13 フェーズを省略せず起票すると定めた。本 issue はその feature 化の追跡。

## 実装対象

1. 300 行上限 fail-closed CI lint (縮小のみ許す remediation allowlist ratchet 付き)
2. 仕組み側ファイル (plugins/・.claude/skills/ 等) への repo 固有ナレッジ (固有 node id・固有 path・固有 qa 番号) hard-coded 参照の検査
3. extract-blueprint / install-bundle の『仕組みのみ既定 (オン)・ナレッジ同梱は明示 opt-in (オフ既定)』検査

## 対応方針

/dev-graph decompose → plan の正規ルートで feature 化し、exact-13 task で実装する。簡単そうに見えても 13 フェーズを省略しない (qa-070・作者記事の方針)。