#!/usr/bin/env bash
# tracked template (.githooks/) を git common dir 配下の共有 hook bundle へ設置する。
# clone ごとに 1 回実行すれば、CI 等価チェック (pre-push) と repo ガード
# (desync 検査 / cross-worktree ref 遮断) が全 worktree で有効になる。
#
# core.hooksPath はリポジトリに 1 つしか設定できない。beads は .beads/hooks を要求するが、
# 共有 bundle の各 hook から現在の worktree の .beads/hooks/<hook> へ委譲するため、
# hooksPath を共有 bundle へ統一しても beads の hook 連携は失われない。
#
# .githooks の相対指定を直接使わない理由:
# 相対 core.hooksPath は「git コマンドを実行した worktree」の .githooks を参照する。
# 古い branch の worktree には新しい reference-transaction hook が存在せず、そこから
# 他 worktree の main を直接更新できてしまう。git common dir は全 worktree 共通なので、
# ここへ bundle を置き、絶対パスで指定することで branch の新旧に依存させない。
#
# 逆に beads が hooksPath を .beads/hooks へ戻した場合に備え、.beads/hooks 側にも repo
# ガードの呼び出しを結線してある (保険経路)。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMMON_DIR="$(git rev-parse --git-common-dir)"
if [[ "$COMMON_DIR" != /* ]]; then
  COMMON_DIR="$ROOT/$COMMON_DIR"
fi
HOOKS_DIR="$COMMON_DIR/harness-hub-hooks"

PREV="$(git config --get core.hooksPath || true)"
if [ -n "$PREV" ] && [ "$PREV" != "$HOOKS_DIR" ]; then
  echo "[install-git-hooks] core.hooksPath を '$PREV' から共有 bundle へ切り替えます"
  echo "[install-git-hooks]   ('$PREV' 配下の beads hook は共有 bundle から委譲されます)"
fi

mkdir -p "$HOOKS_DIR/lib" "$HOOKS_DIR/scripts"

for hook in \
  post-checkout post-merge pre-commit pre-push prepare-commit-msg reference-transaction
do
  cp -f ".githooks/$hook" "$HOOKS_DIR/$hook"
done

for lib in delegate-beads.sh run-repo-guards.sh
do
  cp -f ".githooks/lib/$lib" "$HOOKS_DIR/lib/$lib"
done

for script in \
  guard-cross-worktree-ref-update.py guard-worktree-desync.py validate-git-hooks-wiring.py
do
  cp -f "scripts/$script" "$HOOKS_DIR/scripts/$script"
done

chmod +x \
  "$HOOKS_DIR"/post-checkout \
  "$HOOKS_DIR"/post-merge \
  "$HOOKS_DIR"/pre-commit \
  "$HOOKS_DIR"/pre-push \
  "$HOOKS_DIR"/prepare-commit-msg \
  "$HOOKS_DIR"/reference-transaction \
  "$HOOKS_DIR"/lib/*.sh \
  "$HOOKS_DIR"/scripts/*.py \
  .githooks/* .githooks/lib/* .beads/hooks/* scripts/run-ci-checks.sh \
  2>/dev/null || true

git config core.hooksPath "$HOOKS_DIR"

echo "[install-git-hooks] core.hooksPath=$HOOKS_DIR 設定完了"
echo "[install-git-hooks] 全 worktree 共通の有効 hooks:"
ls -1 "$HOOKS_DIR" | grep -v -E '^(lib|scripts)$' | sed 's/^/  - /'
echo

# 設置しただけで動いていない状態を作らないよう、その場で配線を検証する。
python3 scripts/validate-git-hooks-wiring.py --check-local-config
