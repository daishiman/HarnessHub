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

# beads の Dolt 同期は git remote の refs/dolt/* を使うが、既定の fetch refspec は
# +refs/heads/*:refs/remotes/origin/* だけで refs/dolt/* を一切引かない。ローカルに
# refs/dolt/data が 1 本も無い状態の push は「リモートに既にある chunk」を知らず全
# table file を送ろうとするため、addTableFiles / updateManifestAddFiles が肥大して
# HTTP 400 になる (HarnessHub-jab2)。git config と refs は全 worktree 共通なので、
# 新しい clone の hook 設置と同じ「clone ごとに 1 回」の経路でここも揃える。
DOLT_REFSPEC='+refs/dolt/*:refs/dolt/*'
DOLT_DATA_REF='refs/dolt/data'
DOLT_DATA_REFSPEC='+refs/dolt/data:refs/dolt/data'
if git config --get remote.origin.url >/dev/null 2>&1; then
  # refspec を追加するだけでは、今回の clone に baseline ref は生えない。初回だけ
  # remote の存在を確認して exact ref を取得し、以後は通常の fetch に任せる。
  if git show-ref --verify --quiet "$DOLT_DATA_REF"; then
    echo "[install-git-hooks] $DOLT_DATA_REF はローカルに存在します (remote 照会不要)"
  else
    echo "[install-git-hooks] origin の $DOLT_DATA_REF を確認します"
    if DOLT_REMOTE_DATA="$(git ls-remote origin "$DOLT_DATA_REF")"; then
      if [ -z "$DOLT_REMOTE_DATA" ]; then
        echo "[install-git-hooks] origin に $DOLT_DATA_REF が無いため初回取得は省略しました"
      else
        echo "[install-git-hooks] $DOLT_DATA_REF を origin から初回取得します"
        if ! git fetch origin "$DOLT_DATA_REFSPEC"; then
          echo "[install-git-hooks] ERROR: origin から $DOLT_DATA_REF を取得できませんでした" >&2
          exit 1
        fi
        if ! git show-ref --verify --quiet "$DOLT_DATA_REF"; then
          echo "[install-git-hooks] ERROR: fetch 成功後も $DOLT_DATA_REF が存在しません" >&2
          exit 1
        fi
        echo "[install-git-hooks] $DOLT_DATA_REF の初回取得を確認しました"
      fi
    else
      echo "[install-git-hooks] ERROR: origin の $DOLT_DATA_REF を照会できませんでした" >&2
      exit 1
    fi
  fi

  if git config --get-all remote.origin.fetch 2>/dev/null | grep -qxF "$DOLT_REFSPEC"; then
    echo "[install-git-hooks] remote.origin.fetch は refs/dolt/* を既に引いています"
  else
    git config --add remote.origin.fetch "$DOLT_REFSPEC"
    echo "[install-git-hooks] remote.origin.fetch へ $DOLT_REFSPEC を追加しました"
    echo "[install-git-hooks]   (以後の通常 fetch で Dolt baseline を維持するため)"
  fi
else
  echo "[install-git-hooks] remote origin が無いため refs/dolt/* の refspec 追加は省略しました"
fi

echo "[install-git-hooks] core.hooksPath=$HOOKS_DIR 設定完了"
echo "[install-git-hooks] 全 worktree 共通の有効 hooks:"
ls -1 "$HOOKS_DIR" | grep -v -E '^(lib|scripts)$' | sed 's/^/  - /'
echo

# 設置しただけで動いていない状態を作らないよう、その場で配線を検証する。
python3 scripts/validate-git-hooks-wiring.py --check-local-config
