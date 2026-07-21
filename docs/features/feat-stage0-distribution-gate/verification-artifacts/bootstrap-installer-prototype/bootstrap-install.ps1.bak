# Stage 0 technical gate (H7) Bootstrap Installer 試作 — Windows 用 (PowerShell)
#
# canonical path: bootstrap-installer
# ADR D3 の経路独立性要件により、本 installer は **github 型 (owner/repo 直接指定)** の
# marketplace を add する。D1 (url-marketplace) は remote URL 型なので、両経路は取得・
# 解決機構が異なる。
#
# bootstrap-install.sh と同一の手順を Windows で再現することが目的。
# 前提を最小にするため OS 標準の PowerShell のみに依存する (Node/pnpm を仮定しない)。
# 冪等: 既に登録済みでも exit 0 で終わる。

$ErrorActionPreference = 'Continue'

$MarketplaceRepo = if ($env:H7_MARKETPLACE_REPO) { $env:H7_MARKETPLACE_REPO } else { 'daishiman/HarnessHub' }
$PluginName      = if ($env:H7_PLUGIN_NAME)      { $env:H7_PLUGIN_NAME }      else { 'h7-probe' }

function Write-Log($msg) { Write-Output "[h7-bootstrap] $msg" }

# --- (a) claude CLI の存在確認 -------------------------------------------------
$claude = Get-Command claude -ErrorAction SilentlyContinue
if (-not $claude) {
    Write-Log 'FAIL: claude CLI が見つかりません。先に Claude Code を導入してください。'
    exit 127
}
Write-Log "claude CLI: $((claude --version 2>&1 | Select-Object -First 1))"
Write-Log 'source type: github (owner/repo 直接指定) — D1 の remote URL 型とは別種'

# --- (b) marketplace の追加 (github 型) ---------------------------------------
claude plugin marketplace add $MarketplaceRepo 2>&1 | ForEach-Object { Write-Output $_ }
if ($LASTEXITCODE -eq 0) {
    Write-Log "marketplace add: OK ($MarketplaceRepo)"
} else {
    Write-Log 'marketplace add: 非ゼロ終了。既存登録の可能性があるため list で確認します'
    $mlist = claude plugin marketplace list 2>&1 | Out-String
    if ($mlist -match [regex]::Escape($MarketplaceRepo)) {
        Write-Log 'marketplace: 既に登録済み (冪等として扱い継続)'
    } else {
        Write-Log 'FAIL: marketplace の登録に失敗し、既存登録も確認できません'
        exit 1
    }
}

# --- (c) plugin の install ------------------------------------------------------
claude plugin install $PluginName 2>&1 | ForEach-Object { Write-Output $_ }
if ($LASTEXITCODE -eq 0) {
    Write-Log "plugin install: OK ($PluginName)"
} else {
    Write-Log 'plugin install: 非ゼロ終了。既存インストールの可能性があるため list で確認します'
    $plist = claude plugin list 2>&1 | Out-String
    if ($plist -match [regex]::Escape($PluginName)) {
        Write-Log 'plugin: 既にインストール済み (冪等として扱い継続)'
    } else {
        Write-Log 'FAIL: plugin のインストールに失敗し、既存インストールも確認できません'
        exit 1
    }
}

# --- (d) 検証可能な終了コードと出力 --------------------------------------------
Write-Log "RESULT: ok path=bootstrap-installer source_type=github repo=$MarketplaceRepo plugin=$PluginName"
exit 0
