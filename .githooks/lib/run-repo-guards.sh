#!/usr/bin/env sh
# repo 固有の git hook ガードを実行する単一の入口 (SSOT)。
#
# git common dir の共有 bundle (主経路。tracked template は .githooks/) と
# .beads/hooks/<hook> (保険経路) の両方から呼ばれる。core.hooksPath が beads 側へ
# 戻されても desync 検査と ref 更新の遮断が効くようにする二重化であり、両方から
# 呼ばれても 1 回しか走らないよう冪等にしてある。
#
# usage: sh .githooks/lib/run-repo-guards.sh <hook-name> [hook-args...]
set -u

hook="${1:-}"
[ -n "$hook" ] || exit 0
[ $# -gt 0 ] && shift

# 二重実行の抑止。主経路が guard を実行してから beads へ委譲すると、委譲先の
# .beads/hooks/<hook> からも同じ guard が呼ばれるため、実行済み hook 名を
# 環境変数に積んで 2 回目は素通りさせる。
case ":${HH_REPO_GUARDS_DONE:-}:" in
  *":$hook:"*) exit 0 ;;
esac

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
[ -n "$ROOT" ] || exit 0

# install-git-hooks.sh はこの lib と guard 本体を git common dir 配下へコピーする。
# source tree (.githooks) から直接実行した場合だけ、repo 側 scripts/ へ fallback する。
HOOKS_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
if [ -f "$HOOKS_DIR/scripts/guard-worktree-desync.py" ]; then
  GUARD_SCRIPTS="$HOOKS_DIR/scripts"
else
  GUARD_SCRIPTS="$ROOT/scripts"
fi

PY="${HH_PYTHON:-python3}"
if ! command -v "$PY" >/dev/null 2>&1; then
  case "$hook" in
    reference-transaction)
      # ref 更新の根幹経路は判定不能時 fail-open。pre-commit が二層目を担う。
      echo "[run-repo-guards] WARN: $PY が見つからないため ref ガードを skip しました" >&2
      exit 0
      ;;
    pre-commit|pre-push)
      echo "[run-repo-guards] BLOCKED: $PY が見つからず $hook ガードを実行できません" >&2
      exit 1
      ;;
    *) exit 0 ;;
  esac
fi

case "$hook" in
  pre-commit)
    # desync 由来の巻き戻しコミットを fail-closed で遮断する最終防衛線。
    if [ ! -f "$GUARD_SCRIPTS/guard-worktree-desync.py" ]; then
      echo "[run-repo-guards] BLOCKED: guard-worktree-desync.py がありません" >&2
      exit 1
    fi
    "$PY" "$GUARD_SCRIPTS/guard-worktree-desync.py" || exit $?
    ;;
  reference-transaction)
    # 他ワークツリーが checkout 中の ref への直接更新を遮断する。
    # stdin (更新内容) はそのまま python へ引き継がれる。
    if [ ! -f "$GUARD_SCRIPTS/guard-cross-worktree-ref-update.py" ]; then
      echo "[run-repo-guards] WARN: ref ガード本体が無いため検査を skip しました" >&2
      exit 0
    fi
    "$PY" "$GUARD_SCRIPTS/guard-cross-worktree-ref-update.py" "$@" || exit $?
    ;;
  pre-push)
    # hook 配線そのものが死んでいないかを push 前に検知する。
    if [ ! -f "$GUARD_SCRIPTS/validate-git-hooks-wiring.py" ]; then
      echo "[run-repo-guards] BLOCKED: validate-git-hooks-wiring.py がありません" >&2
      exit 1
    fi
    "$PY" "$GUARD_SCRIPTS/validate-git-hooks-wiring.py" \
      --repo-root "$ROOT" \
      --installed-hooks-root "$HOOKS_DIR" || exit $?
    ;;
esac

exit 0
