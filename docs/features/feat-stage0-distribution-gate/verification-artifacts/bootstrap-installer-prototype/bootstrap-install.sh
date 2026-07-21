#!/bin/sh
# Stage 0 technical gate (H7) Bootstrap Installer 試作 — macOS 用 (POSIX sh)
#
# canonical path: bootstrap-installer
# ADR D3 の経路独立性要件により、本 installer は **github 型 (owner/repo 直接指定)** の
# marketplace を add する。D1 (url-marketplace) は remote URL 型なので、両経路は取得・
# 解決機構が異なる。同一 source 型にすると共成立・共倒れとなり A1 の 2 経路が
# 形式的にしか満たされない。
#
# 前提を最小にするため POSIX sh のみに依存する (Node/pnpm の存在を仮定しない)。
# 冪等: 既に登録済みでも exit 0 で終わる。
# 非責務: plugin 本体の同梱・CLI の自動インストール・権限昇格。

set -eu

MARKETPLACE_REPO="${H7_MARKETPLACE_REPO:-daishiman/h7-probe}"
PLUGIN_NAME="${H7_PLUGIN_NAME:-h7-probe}"

log() { printf '[h7-bootstrap] %s\n' "$1"; }

# --- (a) claude CLI の存在確認 -------------------------------------------------
if ! command -v claude >/dev/null 2>&1; then
  log "FAIL: claude CLI が見つかりません。先に Claude Code を導入してください。"
  exit 127
fi
log "claude CLI: $(claude --version 2>&1 | head -1)"
log "source type: github (owner/repo 直接指定) — D1 の remote URL 型とは別種"

# --- (b) marketplace の追加 (github 型) ---------------------------------------
# 冪等性: 既に同名 marketplace が登録済みなら add は失敗し得るため、失敗を許容して
# 登録済みかどうかを list で確認し直す。
if claude plugin marketplace add "$MARKETPLACE_REPO" 2>&1; then
  log "marketplace add: OK ($MARKETPLACE_REPO)"
else
  log "marketplace add: 非ゼロ終了。既存登録の可能性があるため list で確認します"
  if claude plugin marketplace list 2>&1 | grep -q "$MARKETPLACE_REPO"; then
    log "marketplace: 既に登録済み (冪等として扱い継続)"
  else
    log "FAIL: marketplace の登録に失敗し、既存登録も確認できません"
    exit 1
  fi
fi

# --- (c) plugin の install ------------------------------------------------------
if claude plugin install "$PLUGIN_NAME" 2>&1; then
  log "plugin install: OK ($PLUGIN_NAME)"
else
  log "plugin install: 非ゼロ終了。既存インストールの可能性があるため list で確認します"
  if claude plugin list 2>&1 | grep -q "$PLUGIN_NAME"; then
    log "plugin: 既にインストール済み (冪等として扱い継続)"
  else
    log "FAIL: plugin のインストールに失敗し、既存インストールも確認できません"
    exit 1
  fi
fi

# --- (d) 検証可能な終了コードと出力 --------------------------------------------
log "RESULT: ok path=bootstrap-installer source_type=github repo=$MARKETPLACE_REPO plugin=$PLUGIN_NAME"
exit 0
