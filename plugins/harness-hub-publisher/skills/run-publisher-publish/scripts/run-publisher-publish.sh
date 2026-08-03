#!/usr/bin/env bash
# harness-hub-publisher: publish サブコマンドの薄いラッパー (PT5-B, AD-1)。
# package 収集・manifest 補完・Device Flow 認証・wrangler 実行のいずれも実装しない —
# 全て apps/publisher/src/cli/ (bin/harness-publisher.mjs) 側の実装を呼ぶだけ。
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../../../.." && pwd)"

exec node "$REPO_ROOT/apps/publisher/bin/harness-publisher.mjs" publish "$@"
