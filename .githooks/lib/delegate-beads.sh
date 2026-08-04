#!/usr/bin/env sh
# .beads/hooks/<hook> へ処理を委譲する。
#
# core.hooksPath はリポジトリに 1 つしか設定できないため、.githooks を選ぶと beads が
# 生成した .beads/hooks が git から呼ばれなくなる。この橋渡しにより、hooksPath を
# .githooks に統一しつつ beads の hook 連携 (課題の自動 export 等) を維持する。
#
# exec で起動するため、引数・stdin・終了コードはそのまま beads hook のものになる。
#
# usage: sh .githooks/lib/delegate-beads.sh <hook-name> [hook-args...]
set -u

hook="${1:-}"
[ -n "$hook" ] || exit 0
[ $# -gt 0 ] && shift

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
[ -n "$ROOT" ] || exit 0

target="$ROOT/.beads/hooks/$hook"

# beads 未導入、または該当 hook を beads が生成していない場合は何もしない。
[ -x "$target" ] || exit 0

exec "$target" "$@"
